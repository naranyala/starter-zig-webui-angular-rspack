const std = @import("std");
const webui = @import("webui");
const di = @import("di");
const sqlite = @import("sqlite");
const db_handlers = @import("db_handlers");
const errors = @import("errors");

// Use unified error types
pub const AppError = errors.AppError;
pub const UnifiedError = errors.UnifiedError;

// ============================================================================
// Application State (thread-safe global state management)
// ============================================================================

/// Thread-safe application state container
const AppState = struct {
    window_handle: std.atomic.Value(usize),
    should_exit: std.atomic.Value(bool),
    signal_count: std.atomic.Value(u32),
    shutdown_mutex: std.Thread.Mutex,
    is_shutting_down: std.atomic.Value(bool),

    fn init() AppState {
        return AppState{
            .window_handle = std.atomic.Value(usize).init(0),
            .should_exit = std.atomic.Value(bool).init(false),
            .signal_count = std.atomic.Value(u32).init(0),
            .shutdown_mutex = std.Thread.Mutex{},
            .is_shutting_down = std.atomic.Value(bool).init(false),
        };
    }

    fn requestShutdown(self: *AppState) bool {
        // Returns true if this is the first shutdown request
        return !self.is_shutting_down.swap(true, .seq_cst);
    }

    fn isShuttingDown(self: *const AppState) bool {
        return self.is_shutting_down.load(.seq_cst);
    }

    fn setWindow(self: *AppState, window: usize) void {
        self.window_handle.store(window, .seq_cst);
    }

    fn getWindow(self: *const AppState) usize {
        return self.window_handle.load(.seq_cst);
    }

    fn shouldExit(self: *const AppState) bool {
        return self.should_exit.load(.seq_cst);
    }

    fn signalExit(self: *AppState) void {
        self.should_exit.store(true, .seq_cst);
    }
};

var app_state = AppState.init();

// ============================================================================
// Logging Helpers (safe DI access)
// ============================================================================

fn logInfo(message: []const u8) void {
    const app_logger_result = di.tryGetLogger();
    switch (app_logger_result) {
        .ok => |s| s.info(message),
        .err => |_| std.debug.print("[INFO] {s}\n", .{message}),
    }
}

fn logError(message: []const u8) void {
    const app_logger_result = di.tryGetLogger();
    switch (app_logger_result) {
        .ok => |s| s.err(message),
        .err => |_| std.debug.print("[ERROR] {s}\n", .{message}),
    }
}

fn logDebug(message: []const u8) void {
    const app_logger_result = di.tryGetLogger();
    switch (app_logger_result) {
        .ok => |s| s.debug(message),
        .err => |_| {},
    }
}

// ============================================================================
// Signal Handling (async-signal-safe)
// ============================================================================

/// Async-signal-safe signal handler
/// Only performs atomic operations - no allocations or complex logic
fn handleSignal(sig_num: c_int) callconv(.c) void {
    _ = sig_num;

    const count = app_state.signal_count.fetchAdd(1, .seq_cst);

    if (count == 0) {
        // First signal: request graceful shutdown
        app_state.signalExit();
    } else {
        // Second signal: force immediate exit
        // This is safe because webui.exit() is designed to be called from signal handlers
        webui.exit();
    }
}

fn setupSignalHandlers() void {
    const action = std.posix.Sigaction{
        .handler = .{ .handler = handleSignal },
        .mask = std.mem.zeroes(std.posix.sigset_t),
        .flags = 0,
    };

    _ = std.posix.sigaction(std.posix.SIG.INT, &action, null);
    _ = std.posix.sigaction(std.posix.SIG.TERM, &action, null);
}

// ============================================================================
// Graceful Shutdown
// ============================================================================

/// Perform graceful shutdown with proper resource cleanup
fn gracefulShutdown(injector: ?*di.Injector, sqlite_db: ?*sqlite.Database) void {
    // Prevent re-entrancy
    if (!app_state.requestShutdown()) {
        return;
    }

    logInfo("Starting graceful shutdown...");

    // 1. Emit stopping event
    const event_bus_result = di.tryGetEventBus();
    if (event_bus_result.isOk()) {
        const stopping_event = di.Event{
            .name = di.AppEvents.AppStopping,
            .data = null,
            .source = null,
        };
        event_bus_result.ok.emit(&stopping_event);
    }

    // 2. Close window safely
    const window = app_state.getWindow();
    if (window != 0) {
        webui.close(window);
        // Small delay to allow window to close properly
        std.Thread.sleep(50 * std.time.ns_per_ms);
        webui.destroy(window);
    }

    // 3. Cleanup SQLite database
    if (sqlite_db) |db| {
        db.deinit();
    }

    // 4. Shutdown DI system
    if (injector) |inj| {
        inj.destroy();
    }

    // 5. Exit WebUI
    webui.exit();

    logInfo("Graceful shutdown complete");
}

/// Cleanup function for error handling paths
fn cleanupOnError(window: usize) void {
    if (window != 0) {
        webui.close(window);
        webui.destroy(window);
    }
    webui.exit();
    di.shutdown();
}

// ============================================================================
// Frontend Path Validation
// ============================================================================

fn validateFrontendPath(path: []const u8) !void {
    const dir = std.fs.cwd();
    var iter = dir.openDir(path, .{}) catch |err| {
        if (err == error.FileNotFound) {
            return AppError.FrontendNotBuilt;
        }
        if (err == error.NotDir) {
            return AppError.FrontendPathNotFound;
        }
        return AppError.FrontendPathNotFound;
    };
    defer iter.close();

    const index_path = try std.fs.path.join(std.heap.page_allocator, &.{ path, "index.html" });
    defer std.heap.page_allocator.free(index_path);

    _ = std.fs.cwd().statFile(index_path) catch |err| {
        if (err == error.FileNotFound) {
            return AppError.FrontendNotBuilt;
        }
        return AppError.FrontendPathNotFound;
    };
}

fn getFrontendPath(allocator: std.mem.Allocator) ![]const u8 {
    const cwd = std.fs.cwd();
    var cwd_buf: [4096]u8 = undefined;
    const cwd_path = try cwd.realpath(".", &cwd_buf);

    if (std.posix.getenv("FRONTEND_PATH")) |env_path| {
        return try allocator.dupe(u8, env_path);
    }

    return try std.fs.path.join(allocator, &.{ cwd_path, "frontend", "dist", "browser" });
}

// ============================================================================
// Backend Function Bindings
// ============================================================================

fn bindBackendFunctions(window: usize) !void {
    const app_logger_result = di.tryGetLogger();

    // Core functions
    _ = webui.bind(window, "ping", handlePing);
    _ = webui.bind(window, "getData", handleGetData);
    _ = webui.bind(window, "emitEvent", handleEmitEvent);

    // SQLite CRUD functions
    _ = webui.bind(window, "getUsers", db_handlers.handleSqliteGetUsers);
    _ = webui.bind(window, "getUserStats", db_handlers.handleSqliteGetUserStats);
    _ = webui.bind(window, "createUser", db_handlers.handleSqliteCreateUser);
    _ = webui.bind(window, "deleteUser", db_handlers.handleSqliteDeleteUser);
    _ = webui.bind(window, "getProducts", db_handlers.handleSqliteGetProducts);
    _ = webui.bind(window, "getOrders", db_handlers.handleSqliteGetOrders);

    // DuckDB functions - temporarily disabled due to static linking issues
    // _ = webui.bind(window, "duckdbGetUsers", db_handlers.handleDuckdbGetUsers);
    // _ = webui.bind(window, "duckdbCreateUser", db_handlers.handleDuckdbCreateUser);
    // _ = webui.bind(window, "duckdbDeleteUser", db_handlers.handleDuckdbDeleteUser);
    // _ = webui.bind(window, "duckdbExecuteQuery", db_handlers.handleDuckdbExecuteQuery);

    const success_msg = "Backend functions bound: getUsers, getUserStats, createUser, deleteUser, forceDeleteUser, getProducts, getOrders (SQLite)";
    switch (app_logger_result) {
        .ok => |s| s.info(success_msg),
        .err => |_| {},
    }
}

// ============================================================================
// Event Handlers
// ============================================================================

fn handlePing(event: ?*webui.Event) callconv(.c) void {
    if (event) |e| {
        std.debug.print("[Ping] from: {s}\n", .{e.getElementId()});

        const api_result = di.tryGetApi();
        if (api_result.isOk()) {
            api_result.ok.incrementCallCount();
        }
        webui.run(e.getWindow(), "{\"success\":true,\"data\":\"pong\"}");
    }
}

fn handleGetData(event: ?*webui.Event) callconv(.c) void {
    if (event) |e| {
        std.debug.print("[GetData] from: {s}\n", .{e.getElementId()});

        const api_result = di.tryGetApi();
        if (api_result.isOk()) {
            api_result.ok.incrementCallCount();
        }
        webui.run(e.getWindow(), "{\"success\":true,\"data\":{\"message\":\"Hello from Zig\"}}");
    }
}

fn handleEmitEvent(event: ?*webui.Event) callconv(.c) void {
    if (event) |e| {
        std.debug.print("[EmitEvent] from: {s}\n", .{e.getElementId()});

        const api_result = di.tryGetApi();
        if (api_result.isOk()) {
            api_result.ok.incrementCallCount();
        }
        webui.run(e.getWindow(), "{\"success\":true}");
    }
}

// ============================================================================
// Main Entry Point
// ============================================================================

pub fn main() !void {
    // Setup signal handlers FIRST (before any other initialization)
    setupSignalHandlers();

    std.debug.print("Starting Zig WebUI Angular Rspack Server...\n", .{});
    std.debug.print("WebUI Version: {s}\n", .{webui.version});
    std.debug.print("Communication: WebUI WebSocket Bridge (NO HTTP/HTTPS)\n", .{});
    std.debug.print("DI System: Angular-style Dependency Injection with Event Bus\n", .{});
    std.debug.print("Database: SQLite integration enabled\n", .{});
    std.debug.print("\n", .{});

    var window: usize = 0;
    var injector: ?*di.Injector = null;
    var sqlite_db: ?*sqlite.Database = null;

    // Error handler for cleanup
    errdefer {
        if (injector == null or sqlite_db == null) {
            cleanupOnError(window);
        }
    }

    // Initialize SQLite database
    std.debug.print("[Database] Initializing SQLite...\n", .{});
    var db_instance = sqlite.Database.init(std.heap.page_allocator, "app.db") catch |err| {
        std.debug.print("[ERROR] Failed to initialize SQLite: {}\n", .{err});
        return AppError.DiBootstrapFailed;
    };
    errdefer db_instance.deinit();

    try db_instance.initTables();
    try db_instance.seedUsers();
    sqlite.setGlobalDb(&db_instance);
    sqlite_db = &db_instance;
    std.debug.print("[Database] SQLite initialized successfully\n", .{});

    // Bootstrap DI system
    std.debug.print("[DI] Bootstrapping dependency injection...\n", .{});
    var di_instance = di.bootstrap() catch |err| {
        std.debug.print("[ERROR] Failed to bootstrap DI: {}\n", .{err});
        return AppError.DiBootstrapFailed;
    };
    errdefer di_instance.destroy();
    injector = di_instance;

    // Get logger with safe fallback
    const app_logger_result = di.tryGetLogger();
    const logger = switch (app_logger_result) {
        .ok => |l| l,
        .err => |_| di_instance.getLogger(),
    };

    logger.info("Application starting...");
    logger.debug("Loading configuration...");

    // Get and validate frontend path
    const frontend_path = try getFrontendPath(std.heap.page_allocator);
    defer std.heap.page_allocator.free(frontend_path);

    try validateFrontendPath(frontend_path);
    logger.info("Frontend path: ");
    logger.info(frontend_path);

    // Create window
    window = webui.newWindow();
    if (window == 0) {
        logger.err("Window creation returned invalid handle");
        return AppError.WindowCreationFailed;
    }

    // Store window handle in thread-safe state
    app_state.setWindow(window);

    // Configure window
    const window_service = di_instance.getWindow();
    window_service.setWindow(window);

    const size = window_service.getSize();
    if (size[0] == 0 or size[1] == 0) {
        logger.warn("Invalid window size {0, 0}, using default 1280x800");
        webui.setSize(window, 1280, 800);
    } else {
        webui.setSize(window, size[0], size[1]);
    }
    webui.setResizable(window, true);
    webui.maximize(window);
    window_service.setTitle("Zig WebUI Angular App");

    // Bind backend functions BEFORE showing window
    try bindBackendFunctions(window);

    di.emitWindowCreated(window);

    // Try to open browser window
    const browsers = .{ .AnyBrowser, .Chrome, .Chromium, .Firefox, .Edge };
    var browser_opened = false;

    inline for (browsers) |browser| {
        if (webui.isBrowserInstalled(browser)) {
            std.debug.print("[DEBUG] Found browser: {s}, trying to show window...\n", .{@tagName(browser)});
            if (webui.showBrowser(window, frontend_path, browser)) {
                browser_opened = true;
                std.debug.print("[DEBUG] Successfully opened: {s}\n", .{@tagName(browser)});
                break;
            }
        }
    }

    if (!browser_opened) {
        std.debug.print("[DEBUG] No browser available. Running in headless mode.\n", .{});
        std.debug.print("{s}", .{"Press Ctrl+C to stop the server.\n"});

        // Headless mode - wait for shutdown signal
        while (!app_state.shouldExit()) {
            _ = webui.waitAsync();
            std.Thread.sleep(100 * std.time.ns_per_ms);
        }
    } else {
        logger.info("Desktop window launched successfully");
        di.emitAppStarted();
        std.debug.print("\nServer running. Press Ctrl+C to stop.\n", .{});

        // Main event loop with proper shutdown handling
        while (!app_state.shouldExit()) {
            _ = webui.waitAsync();
            std.Thread.sleep(100 * std.time.ns_per_ms);
        }

        logger.info("Application stopped");
        std.debug.print("\nServer stopped. API calls: {d}\n", .{di_instance.getApi().getCallCount()});
    }

    // Perform graceful shutdown
    gracefulShutdown(injector, sqlite_db);
}

test "simple test" {
    var list = std.ArrayList(i32).init(std.testing.allocator);
    defer list.deinit();
    try list.append(42);
    try std.testing.expectEqual(@as(i32, 42), list.pop());
}

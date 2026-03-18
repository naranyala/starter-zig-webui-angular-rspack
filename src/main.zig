const std = @import("std");
const webui = @import("webui");
const di = @import("di.zig");

pub const AppError = error{
    WindowCreationFailed,
    WindowBindingFailed,
    BrowserLaunchFailed,
    FrontendPathNotFound,
    FrontendNotBuilt,
    DiBootstrapFailed,
    Unexpected,
    LoggingFailed,
    ConfigLoadFailed,
    WindowSetupFailed,
};

fn printError(err: AppError) []const u8 {
    return switch (err) {
        error.WindowCreationFailed => "Failed to create window",
        error.WindowBindingFailed => "Failed to bind backend functions",
        error.BrowserLaunchFailed => "Failed to launch browser window",
        error.FrontendPathNotFound => "Frontend path not found",
        error.FrontendNotBuilt => "Frontend not built - run 'npm run build' first",
        error.DiBootstrapFailed => "Failed to bootstrap DI system",
        error.Unexpected => "Unexpected error occurred",
        error.LoggingFailed => "Logging failed",
        error.ConfigLoadFailed => "Configuration load failed",
        error.WindowSetupFailed => "Window setup failed",
    };
}

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

fn logInfo(message: []const u8) void {
    const logger_result = di.tryGetLogger();
    switch (logger_result) {
        .ok => |s| s.info(message),
        .err => |_| std.debug.print("[INFO] {s}\n", .{message}),
    }
}

fn logError(message: []const u8) void {
    const logger_result = di.tryGetLogger();
    switch (logger_result) {
        .ok => |s| s.err(message),
        .err => |_| std.debug.print("[ERROR] {s}\n", .{message}),
    }
}

fn logDebug(message: []const u8) void {
    const logger_result = di.tryGetLogger();
    switch (logger_result) {
        .ok => |s| s.debug(message),
        .err => |_| {},
    }
}

fn cleanup(window: usize) void {
    const event_bus_result = di.tryGetEventBus();
    if (event_bus_result.isOk()) {
        var stopping_event = di.Event{
            .name = di.AppEvents.AppStopping,
            .data = null,
            .source = null,
            .priority = .high,
        };
        event_bus_result.unwrap().emit(&stopping_event);
    }

    if (window != 0) {
        webui.close(window);
        webui.destroy(window);
    }
    webui.exit();
    di.shutdown();
}

var global_window_handle: usize = 0;

var signal_received: std.atomic.Value(bool) = std.atomic.Value(bool).init(false);

fn handleSignal(sig_num: c_int) callconv(.c) void {
    _ = sig_num;
    signal_received.store(true, .seq_cst);

    // Try to close the window if it exists
    if (global_window_handle != 0) {
        webui.close(global_window_handle);
    }
}

fn setupSignalHandlers() void {
    // Setup signal handlers for graceful shutdown
    const action = std.posix.Sigaction{
        .handler = .{ .handler = handleSignal },
        .mask = std.posix.sigemptyset(),
        .flags = 0,
    };

    // Handle SIGINT (Ctrl+C) and SIGTERM (termination signal)
    _ = std.posix.sigaction(std.posix.SIG.INT, &action, null);
    _ = std.posix.sigaction(std.posix.SIG.TERM, &action, null);
}

fn bindBackendFunctions(window: usize) AppError!void {
    const logger_result = di.tryGetLogger();

    const ping_id = webui.bind(window, "ping", handlePing);
    const getdata_id = webui.bind(window, "getData", handleGetData);
    const emit_id = webui.bind(window, "emitEvent", handleEmitEvent);

    if (ping_id == 0 or getdata_id == 0 or emit_id == 0) {
        const msg = "Failed to bind backend function";
        switch (logger_result) {
            .ok => |s| s.err(msg),
            .err => |_| {},
        }
        return AppError.WindowBindingFailed;
    }

    const success_msg = "Backend functions bound: ping, getData, emitEvent";
    switch (logger_result) {
        .ok => |s| s.info(success_msg),
        .err => |_| {},
    }
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

pub fn main() !void {
    setupSignalHandlers();

    std.debug.print("Starting Zig WebUI Angular Rspack Server...\n", .{});
    std.debug.print("WebUI Version: {s}\n", .{webui.version});
    std.debug.print("Communication: WebUI WebSocket Bridge (NO HTTP/HTTPS)\n", .{});
    std.debug.print("DI System: Angular-style Dependency Injection with Event Bus\n", .{});
    std.debug.print("\n", .{});

    var window: usize = 0;
    errdefer cleanup(window);

    std.debug.print("[DI] Bootstrapping dependency injection...\n", .{});

    const injector = di.bootstrap() catch |err| {
        std.debug.print("[ERROR] Failed to bootstrap DI: {}\n", .{err});
        return AppError.DiBootstrapFailed;
    };

    const logger_result = di.tryGetLogger();
    const logger = logger_result.unwrapOr(injector.getLogger());
    logger.info("Application starting...");
    logger.debug("Loading configuration...");

    const cwd = std.fs.cwd();
    var cwd_buf: [4096]u8 = undefined;
    const cwd_path = try cwd.realpath(".", &cwd_buf);
    _ = cwd_path;

    const frontend_path = try getFrontendPath(std.heap.page_allocator);
    defer std.heap.page_allocator.free(frontend_path);

    try validateFrontendPath(frontend_path);

    logger.info("Frontend path: ");
    logger.info(frontend_path);

    window = webui.newWindow();
    if (window == 0) {
        logger.err("Window creation returned invalid handle");
        return AppError.WindowCreationFailed;
    }
    global_window_handle = window;

    const window_service = injector.getWindow();
    window_service.setWindow(window);

    const size = window_service.getSize();
    if (size[0] == 0 or size[1] == 0) {
        logger.warn("Invalid window size {0, 0}, using default 1280x800");
        webui.setSize(window, 1280, 800);
    } else {
        webui.setSize(window, size[0], size[1]);
    }
    webui.setResizable(window, true);
    // Maximize window on startup
    webui.maximize(window);

    window_service.setTitle("Zig WebUI Angular App");

    // Bind backend functions BEFORE showing window
    try bindBackendFunctions(window);

    di.emitWindowCreated(window);

    // Check available browsers
    const browsers = .{ .AnyBrowser, .Chrome, .Chromium, .Firefox, .Edge };
    var browser_opened = false;
    var last_error: []const u8 = "Unknown error";

    inline for (browsers) |browser| {
        if (webui.isBrowserInstalled(browser)) {
            std.debug.print("[DEBUG] Found browser: {s}, trying to show window...\n", .{@tagName(browser)});
            if (webui.showBrowser(window, frontend_path, browser)) {
                browser_opened = true;
                std.debug.print("[DEBUG] Successfully opened: {s}\n", .{@tagName(browser)});
                break;
            }
            last_error = "showBrowser returned false";
        } else {
            last_error = "Browser not installed";
        }
    }

    if (!browser_opened) {
        // Don't return error - just log and continue
        // The app can still run without a visible window
        std.debug.print("[DEBUG] No browser available: {s}\n", .{last_error});

        // Run in server-only mode - wait for interrupt
        std.debug.print("{s}", .{"\nNo browser available. Running in headless mode.\n"});
        std.debug.print("{s}", .{"Press Ctrl+C to stop the server.\n"});

        // Wait for signal/interrupt using async wait
        while (webui.waitAsync()) {
            if (signal_received.load(.seq_cst)) {
                logger.info("Signal received, shutting down...");
                break;
            }
            std.Thread.sleep(100 * std.time.ns_per_ms); // Sleep 100ms to avoid busy waiting
        }
    } else {
        logger.info("Desktop window launched successfully");

        di.emitAppStarted();

        std.debug.print("\nServer running. Press Ctrl+C to stop.\n", .{});

        // Wait for window to close or signal
        while (webui.waitAsync()) {
            if (signal_received.load(.seq_cst)) {
                logger.info("Signal received, shutting down...");
                webui.exit();
                break;
            }
            std.Thread.sleep(100 * std.time.ns_per_ms); // Sleep 100ms to avoid busy waiting
        }

        logger.info("Application stopped");
        std.debug.print("\nServer stopped. API calls: {d}\n", .{injector.getApi().getCallCount()});
    }
}

fn handleCoreApi(event: ?*webui.Event) callconv(.c) void {
    if (event) |e| {
        std.debug.print("[CoreAPI] Event: {s}\n", .{e.getElementId()});
    }
}

fn handlePing(event: ?*webui.Event) callconv(.c) void {
    if (event) |e| {
        std.debug.print("[Ping] from: {s}\n", .{e.getElementId()});

        const api_result = di.tryGetApi();
        if (api_result.isOk()) {
            api_result.unwrap().incrementCallCount();
        }
        webui.run(e.getWindow(), "{\"success\":true,\"data\":\"pong\"}");
    }
}

fn handleGetData(event: ?*webui.Event) callconv(.c) void {
    if (event) |e| {
        std.debug.print("[GetData] from: {s}\n", .{e.getElementId()});

        const api_result = di.tryGetApi();
        if (api_result.isOk()) {
            api_result.unwrap().incrementCallCount();
        }
        webui.run(e.getWindow(), "{\"success\":true,\"data\":{\"message\":\"Hello from Zig\"}}");
    }
}

fn handleEmitEvent(event: ?*webui.Event) callconv(.c) void {
    if (event) |e| {
        std.debug.print("[EmitEvent] from: {s}\n", .{e.getElementId()});

        const api_result = di.tryGetApi();
        if (api_result.isOk()) {
            api_result.unwrap().incrementCallCount();
        }
        webui.run(e.getWindow(), "{\"success\":true}");
    }
}

test "simple test" {
    var list = std.ArrayList(i32){};
    defer list.deinit(std.testing.allocator);
    try list.append(std.testing.allocator, 42);
    try std.testing.expectEqual(@as(i32, 42), list.pop());
}

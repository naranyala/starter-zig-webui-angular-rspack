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

fn cleanup(window: usize) void {
    if (window != 0) {
        webui.close(window);
        webui.destroy(window);
    }
    webui.exit();
    di.shutdown();
}

pub fn main() !void {
    const stdout = std.io.getStdOut().writer();
    const stderr = std.io.getStdErr().writer();

    try stdout.print("Starting Zig WebUI Angular Rspack Server...\n", .{});
    try stdout.print("WebUI Version: {s}\n", .{webui.version});
    try stdout.print("Communication: WebUI WebSocket Bridge (NO HTTP/HTTPS)\n", .{});
    try stdout.print("DI System: Angular-style Dependency Injection\n", .{});
    try stdout.print("\n", .{});

    var window: usize = 0;
    errdefer cleanup(window);

    try stdout.print("[DI] Bootstrapping dependency injection...\n", .{});
    const injector = di.bootstrap() catch |err| {
        try stderr.print("[ERROR] Failed to bootstrap DI: {}\n", .{err});
        return AppError.DiBootstrapFailed;
    };

    const logger = injector.logger;
    const config = injector.config;
    const window_service = injector.window;
    const api_service = injector.api;

    logger.info("Application starting...");
    logger.debug("Loading configuration...");

    const cwd = std.fs.cwd();
    var cwd_buf: [4096]u8 = undefined;
    const cwd_path = try cwd.realpath(".", &cwd_buf);

    const frontend_path = try std.fs.path.join(std.heap.page_allocator, &.{ cwd_path, "frontend", "dist", "browser" });
    defer std.heap.page_allocator.free(frontend_path);

    try validateFrontendPath(frontend_path);

    logger.info("Frontend path: ");
    logger.info(frontend_path);
    _ = config;

    window = webui.newWindow();
    if (window == 0) {
        logger.err("Window creation returned invalid handle");
        return AppError.WindowCreationFailed;
    }
    window_service.setWindow(window);

    const size = window_service.getSize();
    webui.setSize(window, size[0], size[1]);
    webui.setResizable(window, true);

    const bind_ids = .{
        webui.bind(window, "__webui_core_api__", handleCoreApi),
        webui.bind(window, "ping", handlePing),
        webui.bind(window, "getData", handleGetData),
        webui.bind(window, "emitEvent", handleEmitEvent),
    };

    inline for (bind_ids) |id| {
        if (id == 0) {
            logger.err("Failed to bind backend function");
            return AppError.WindowBindingFailed;
        }
    }

    logger.info("Backend functions bound: ping, getData, emitEvent");

    if (!webui.showBrowser(window, frontend_path, .Chromium)) {
        logger.err("Failed to show browser window");
        return AppError.BrowserLaunchFailed;
    }

    logger.info("Desktop window launched successfully");

    try stdout.print("\nServer running. Press Ctrl+C to stop.\n", .{});

    webui.wait();

    logger.info("Application stopped");
    try stdout.print("\nServer stopped. API calls: {d}\n", .{api_service.getCallCount()});
}

fn handleCoreApi(event: ?*webui.Event) callconv(.C) void {
    if (event) |e| {
        std.debug.print("[CoreAPI] Event: {s}\n", .{e.getElementId()});
    }
}

fn handlePing(event: ?*webui.Event) callconv(.C) void {
    if (event) |e| {
        std.debug.print("[Ping] from: {s}\n", .{e.getElementId()});
        const api = di.getApiService() catch return;
        api.incrementCallCount();
        webui.run(e.getWindow(), "{\"success\":true,\"data\":\"pong\"}");
    }
}

fn handleGetData(event: ?*webui.Event) callconv(.C) void {
    if (event) |e| {
        std.debug.print("[GetData] from: {s}\n", .{e.getElementId()});
        const api = di.getApiService() catch return;
        api.incrementCallCount();
        webui.run(e.getWindow(), "{\"success\":true,\"data\":{\"message\":\"Hello from Zig\"}}");
    }
}

fn handleEmitEvent(event: ?*webui.Event) callconv(.C) void {
    if (event) |e| {
        std.debug.print("[EmitEvent] from: {s}\n", .{e.getElementId()});
        const api = di.getApiService() catch return;
        api.incrementCallCount();
        webui.run(e.getWindow(), "{\"success\":true}");
    }
}

test "simple test" {
    var list = std.ArrayList(i32).init(std.testing.allocator);
    defer list.deinit();
    try list.append(42);
    try std.testing.expectEqual(@as(i32, 42), list.pop());
}

const std = @import("std");
const webui = @import("webui");
const di = @import("di.zig");

pub fn main() !void {
    const stdout = std.io.getStdOut().writer();

    try stdout.print("Starting Zig WebUI Angular Rspack Server...\n", .{});
    try stdout.print("WebUI Version: {s}\n", .{webui.version});
    try stdout.print("Communication: WebUI WebSocket Bridge (NO HTTP/HTTPS)\n", .{});
    try stdout.print("DI System: Angular-style Dependency Injection\n", .{});
    try stdout.print("\n", .{});

    // Bootstrap DI system
    try stdout.print("[DI] Bootstrapping dependency injection...\n", .{});
    const injector = di.bootstrap();
    defer injector.destroy();

    const logger = injector.logger;
    const config = injector.config;
    const window_service = injector.window;
    const api_service = injector.api;
    _ = injector.events; // Event service available for future use

    logger.info("Application starting...");
    logger.debug("Loading configuration...");

    // Get the current working directory
    const cwd = std.fs.cwd();
    var cwd_buf: [4096]u8 = undefined;
    const cwd_path = try cwd.realpath(".", &cwd_buf);

    // Build the absolute path to frontend/dist/browser
    const frontend_path = try std.fs.path.join(
        std.heap.page_allocator,
        &.{ cwd_path, "frontend", "dist", "browser" }
    );
    defer std.heap.page_allocator.free(frontend_path);

    logger.info("Frontend path: ");
    logger.info(frontend_path);
    _ = config; // Use config variable

    // Create a new window
    const window = webui.newWindow();
    window_service.setWindow(window);

    // Set window properties
    const size = window_service.getSize();
    webui.setSize(window, size[0], size[1]);
    webui.setResizable(window, true);

    // Bind handlers
    _ = webui.bind(window, "__webui_core_api__", handleCoreApi);
    _ = webui.bind(window, "ping", handlePing);
    _ = webui.bind(window, "getData", handleGetData);
    _ = webui.bind(window, "emitEvent", handleEmitEvent);

    logger.info("Backend functions bound: ping, getData, emitEvent");

    // Show the window
    const shown = webui.showBrowser(window, frontend_path, .Chromium);
    if (!shown) {
        try stdout.print("Warning: Could not show browser window.\n", .{});
    } else {
        logger.info("Desktop window launched successfully");
    }

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
        di.getApiService().incrementCallCount();
        webui.run(e.getWindow(), "{\"success\":true,\"data\":\"pong\"}");
    }
}

fn handleGetData(event: ?*webui.Event) callconv(.C) void {
    if (event) |e| {
        std.debug.print("[GetData] from: {s}\n", .{e.getElementId()});
        di.getApiService().incrementCallCount();
        webui.run(e.getWindow(), "{\"success\":true,\"data\":{\"message\":\"Hello from Zig\"}}");
    }
}

fn handleEmitEvent(event: ?*webui.Event) callconv(.C) void {
    if (event) |e| {
        std.debug.print("[EmitEvent] from: {s}\n", .{e.getElementId()});
        di.getApiService().incrementCallCount();
        webui.run(e.getWindow(), "{\"success\":true}");
    }
}

test "simple test" {
    var list = std.ArrayList(i32).init(std.testing.allocator);
    defer list.deinit();
    try list.append(42);
    try std.testing.expectEqual(@as(i32, 42), list.pop());
}

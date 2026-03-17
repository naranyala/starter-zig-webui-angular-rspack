//! Simple Dependency Injection System for Zig
//! Angular-inspired DI with injectors and services

const std = @import("std");
const webui = @import("webui");

// ============================================================================
// Error Types
// ============================================================================

pub const DIError = error{
    NoProvider,
    InjectorDestroyed,
    OutOfMemory,
    ServiceInitFailed,
    AllocatorRequired,
};

pub const Service = struct {
    name: []const u8,
};

pub const LoggerService = struct {
    prefix: []const u8 = "[App]",

    pub fn create(allocator: std.mem.Allocator) DIError!*LoggerService {
        const self = allocator.create(LoggerService) catch return DIError.OutOfMemory;
        self.* = .{};
        return self;
    }

    pub fn info(self: *LoggerService, message: []const u8) void {
        std.debug.print("{s} [INFO] {s}\n", .{ self.prefix, message });
    }

    pub fn debug(self: *LoggerService, message: []const u8) void {
        std.debug.print("{s} [DEBUG] {s}\n", .{ self.prefix, message });
    }

    pub fn warn(self: *LoggerService, message: []const u8) void {
        std.debug.print("{s} [WARN] {s}\n", .{ self.prefix, message });
    }

    pub fn err(self: *LoggerService, message: []const u8) void {
        std.debug.print("{s} [ERROR] {s}\n", .{ self.prefix, message });
    }

    pub fn deinit(self: *LoggerService, allocator: std.mem.Allocator) void {
        allocator.destroy(self);
    }
};

pub const ConfigService = struct {
    data: std.StringHashMap([]const u8),

    pub fn create(allocator: std.mem.Allocator) DIError!*ConfigService {
        const self = allocator.create(ConfigService) catch return DIError.OutOfMemory;
        self.* = .{ .data = std.StringHashMap([]const u8).init(allocator) };
        self.data.put("app.name", "Zig WebUI App") catch return DIError.OutOfMemory;
        self.data.put("app.version", "1.0.0") catch return DIError.OutOfMemory;
        return self;
    }

    pub fn get(self: *ConfigService, key: []const u8, default: []const u8) []const u8 {
        return self.data.get(key) orelse default;
    }

    pub fn deinit(self: *ConfigService, allocator: std.mem.Allocator) void {
        var it = self.data.keyIterator();
        while (it.next()) |key| {
            allocator.free(key.*);
        }
        self.data.deinit();
        allocator.destroy(self);
    }
};

pub const WindowService = struct {
    window: usize = 0,
    width: u32 = 1280,
    height: u32 = 800,

    pub fn create(allocator: std.mem.Allocator) DIError!*WindowService {
        const self = allocator.create(WindowService) catch return DIError.OutOfMemory;
        self.* = .{};
        return self;
    }

    pub fn setWindow(self: *WindowService, w: usize) void {
        self.window = w;
    }

    pub fn getWindow(self: *WindowService) usize {
        return self.window;
    }

    pub fn getSize(self: *WindowService) struct { u32, u32 } {
        return .{ self.width, self.height };
    }

    pub fn setSize(self: *WindowService, width: u32, height: u32) void {
        self.width = width;
        self.height = height;
    }

    pub fn deinit(self: *WindowService, allocator: std.mem.Allocator) void {
        allocator.destroy(self);
    }
};

pub const EventHandler = *const fn (?*anyopaque) callconv(.C) void;

pub const EventService = struct {
    handlers: std.StringHashMap(EventHandler),

    pub fn create(allocator: std.mem.Allocator) DIError!*EventService {
        const self = allocator.create(EventService) catch return DIError.OutOfMemory;
        self.* = .{ .handlers = std.StringHashMap(EventHandler).init(allocator) };
        return self;
    }

    pub fn bind(self: *EventService, allocator: std.mem.Allocator, element: []const u8, handler: EventHandler) !void {
        const key = try allocator.dupe(u8, element);
        errdefer allocator.free(key);
        try self.handlers.put(key, handler);
    }

    pub fn deinit(self: *EventService, allocator: std.mem.Allocator) void {
        var it = self.handlers.keyIterator();
        while (it.next()) |key| {
            allocator.free(key.*);
        }
        self.handlers.deinit();
        allocator.destroy(self);
    }
};

pub const ApiHandler = *const fn (?*anyopaque) callconv(.C) void;

pub const BackendApiService = struct {
    handlers: std.StringHashMap(ApiHandler),
    call_count: usize = 0,

    pub fn create(allocator: std.mem.Allocator) DIError!*BackendApiService {
        const self = allocator.create(BackendApiService) catch return DIError.OutOfMemory;
        self.* = .{
            .handlers = std.StringHashMap(ApiHandler).init(allocator),
            .call_count = 0,
        };
        return self;
    }

    pub fn registerHandler(self: *BackendApiService, allocator: std.mem.Allocator, name: []const u8, handler: ApiHandler) !void {
        const key = try allocator.dupe(u8, name);
        errdefer allocator.free(key);
        try self.handlers.put(key, handler);
    }

    pub fn incrementCallCount(self: *BackendApiService) void {
        self.call_count += 1;
    }

    pub fn getCallCount(self: *BackendApiService) usize {
        return self.call_count;
    }

    pub fn deinit(self: *BackendApiService, allocator: std.mem.Allocator) void {
        var it = self.handlers.keyIterator();
        while (it.next()) |key| {
            allocator.free(key.*);
        }
        self.handlers.deinit();
        allocator.destroy(self);
    }
};

pub const Injector = struct {
    allocator: std.mem.Allocator,
    logger: *LoggerService,
    config: *ConfigService,
    window: *WindowService,
    events: *EventService,
    api: *BackendApiService,

    pub fn create(allocator: std.mem.Allocator) DIError!*Injector {
        const self = allocator.create(Injector) catch return DIError.OutOfMemory;
        errdefer allocator.destroy(self);

        const logger = try LoggerService.create(allocator);
        errdefer logger.deinit(allocator);

        const config = try ConfigService.create(allocator);
        errdefer config.deinit(allocator);

        const window = try WindowService.create(allocator);
        errdefer window.deinit(allocator);

        const events = try EventService.create(allocator);
        errdefer events.deinit(allocator);

        const api = try BackendApiService.create(allocator);
        errdefer api.deinit(allocator);

        self.* = .{
            .allocator = allocator,
            .logger = logger,
            .config = config,
            .window = window,
            .events = events,
            .api = api,
        };

        return self;
    }

    pub fn destroy(self: *Injector) void {
        const allocator = self.allocator;
        self.api.deinit(allocator);
        self.events.deinit(allocator);
        self.window.deinit(allocator);
        self.config.deinit(allocator);
        self.logger.deinit(allocator);
        allocator.destroy(self);
    }
};

var global_injector: ?*Injector = null;

pub fn getInjector() DIError!*Injector {
    return global_injector orelse DIError.InjectorDestroyed;
}

pub fn bootstrap() DIError!*Injector {
    if (global_injector) |inj| {
        return inj;
    }
    global_injector = try Injector.create(std.heap.page_allocator);
    return global_injector.?;
}

pub fn shutdown() void {
    if (global_injector) |inj| {
        inj.destroy();
        global_injector = null;
    }
}

// ============================================================================
// Convenience functions
// ============================================================================

pub fn getLogger() DIError!*LoggerService {
    return getInjector();
}

pub fn getConfig() DIError!*ConfigService {
    const inj = try getInjector();
    return inj.config;
}

pub fn getWindowService() DIError!*WindowService {
    const inj = try getInjector();
    return inj.window;
}

pub fn getEventService() DIError!*EventService {
    const inj = try getInjector();
    return inj.events;
}

pub fn getApiService() DIError!*BackendApiService {
    const inj = try getInjector();
    return inj.api;
}

// ============================================================================
// Tests
// ============================================================================

const testing = std.testing;

test "DI - Injector creates all services" {
    const inj = try Injector.create(testing.allocator);
    defer inj.destroy();

    try testing.expect(inj.logger != null);
    try testing.expect(inj.config != null);
    try testing.expect(inj.window != null);
    try testing.expect(inj.events != null);
    try testing.expect(inj.api != null);
}

test "DI - LoggerService logs messages" {
    const logger = try LoggerService.create(testing.allocator);
    defer logger.deinit(testing.allocator);
    logger.info("Test message");
    try testing.expectEqualStrings("[App]", logger.prefix);
}

test "DI - ConfigService stores values" {
    const config = try ConfigService.create(testing.allocator);
    defer config.deinit(testing.allocator);
    try config.data.put("test.key", "test_value");
    try testing.expectEqualStrings("test_value", config.get("test.key", "Default"));
}

test "DI - WindowService stores window" {
    const window = try WindowService.create(testing.allocator);
    defer window.deinit(testing.allocator);
    window.setWindow(123);
    try testing.expectEqual(@as(usize, 123), window.window);
}

test "DI - EventService binds handlers" {
    const events = try EventService.create(testing.allocator);
    defer events.deinit(testing.allocator);
    const dummy = struct {
        fn handler(_: ?*anyopaque) callconv(.C) void {}
    }.handler;
    try events.bind(testing.allocator, "test", dummy);
    try testing.expect(events.handlers.count() > 0);
}

test "DI - ApiService tracks calls" {
    const api = try BackendApiService.create(testing.allocator);
    defer api.deinit(testing.allocator);
    try testing.expectEqual(@as(usize, 0), api.call_count);
    api.incrementCallCount();
    try testing.expectEqual(@as(usize, 1), api.call_count);
}

test "DI - Bootstrap initializes global injector" {
    _ = try bootstrap();
    const inj = getInjector();
    try testing.expect(inj != null);
}

test "DI - Convenience functions work" {
    _ = try bootstrap();
    const logger = getLogger();
    const config = getConfig();
    try testing.expect(logger != null);
    try testing.expect(config != null);
}

test "DI - GetInjector returns error when not bootstrapped" {
    shutdown(); // Ensure no global injector
    const result = getInjector();
    try testing.expectError(DIError.InjectorDestroyed, result);
}

test "DI - Injector holds correct allocator" {
    const inj = try Injector.create(testing.allocator);
    defer inj.destroy();
    try testing.expectEqual(testing.allocator, inj.allocator);
}

test "DI - WindowService set and get size" {
    const window = try WindowService.create(testing.allocator);
    defer window.deinit(testing.allocator);

    window.setSize(1920, 1080);
    const size = window.getSize();
    try testing.expectEqual(@as(u32, 1920), size[0]);
    try testing.expectEqual(@as(u32, 1080), size[1]);
}

test "DI - ConfigService default values" {
    const config = try ConfigService.create(testing.allocator);
    defer config.deinit(testing.allocator);

    try testing.expectEqualStrings("Zig WebUI App", config.get("app.name", "Default"));
    try testing.expectEqualStrings("1.0.0", config.get("app.version", "0.0.0"));
}

test "DI - Multiple event bindings" {
    const events = try EventService.create(testing.allocator);
    defer events.deinit(testing.allocator);

    const handler1 = struct {
        fn h(_: ?*anyopaque) callconv(.C) void {}
    }.handler;
    const handler2 = struct {
        fn h(_: ?*anyopaque) callconv(.C) void {}
    }.handler;

    try events.bind(testing.allocator, "event1", handler1);
    try events.bind(testing.allocator, "event2", handler2);

    try testing.expectEqual(@as(usize, 2), events.handlers.count());
}

test "DI - ApiService register and call handlers" {
    const api = try BackendApiService.create(testing.allocator);
    defer api.deinit(testing.allocator);

    const handler = struct {
        fn h(_: ?*anyopaque) callconv(.C) void {}
    }.handler;

    try api.registerHandler(testing.allocator, "testHandler", handler);
    try testing.expect(api.handlers.contains("testHandler"));

    api.incrementCallCount();
    api.incrementCallCount();
    try testing.expectEqual(@as(usize, 2), api.getCallCount());
}

test "DI - Injector destroy cleans up all services" {
    const inj = try Injector.create(testing.allocator);
    // Store pointer to verify structure before destroy
    _ = inj.logger;
    inj.destroy();

    // If we get here without panic, cleanup worked
    try testing.expect(true);
}

test "DI - Bootstrap returns existing injector" {
    const inj1 = try bootstrap();
    const inj2 = try bootstrap();
    try testing.expectEqual(inj1, inj2);
    shutdown(); // Clean up
}

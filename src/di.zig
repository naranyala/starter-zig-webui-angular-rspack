//! Simple Dependency Injection System for Zig
//! Angular-inspired DI with injectors and services

const std = @import("std");
const webui = @import("webui");

// ============================================================================
// Core Types
// ============================================================================

pub const Scope = enum { Singleton, Transient };
pub const DIError = error{ NoProvider, InjectorDestroyed };

/// Service interface
pub const Service = struct {
    name: []const u8,
};

/// Logger Service
pub const LoggerService = struct {
    prefix: []const u8 = "[App]",

    pub fn create() *LoggerService {
        const self = std.heap.page_allocator.create(LoggerService) catch @panic("OOM");
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
};

/// Config Service
pub const ConfigService = struct {
    data: std.StringHashMap([]const u8),

    pub fn create() *ConfigService {
        const self = std.heap.page_allocator.create(ConfigService) catch @panic("OOM");
        self.* = .{ .data = std.StringHashMap([]const u8).init(std.heap.page_allocator) };
        self.data.put("app.name", "Zig WebUI App") catch {};
        self.data.put("app.version", "1.0.0") catch {};
        return self;
    }

    pub fn get(self: *ConfigService, key: []const u8, default: []const u8) []const u8 {
        return self.data.get(key) orelse default;
    }
};

/// Window Service
pub const WindowService = struct {
    window: usize = 0,
    width: u32 = 1280,
    height: u32 = 800,

    pub fn create() *WindowService {
        const self = std.heap.page_allocator.create(WindowService) catch @panic("OOM");
        self.* = .{};
        return self;
    }

    pub fn setWindow(self: *WindowService, w: usize) void {
        self.window = w;
    }

    pub fn getSize(self: *WindowService) struct { u32, u32 } {
        return .{ self.width, self.height };
    }
};

/// Event Handler type
pub const EventHandler = *const fn (?*anyopaque) callconv(.C) void;

/// Event Service
pub const EventService = struct {
    handlers: std.StringHashMap(EventHandler),

    pub fn create() *EventService {
        const self = std.heap.page_allocator.create(EventService) catch @panic("OOM");
        self.* = .{ .handlers = std.StringHashMap(EventHandler).init(std.heap.page_allocator) };
        return self;
    }

    pub fn bind(self: *EventService, element: []const u8, handler: EventHandler) !void {
        const key = try std.heap.page_allocator.dupe(u8, element);
        errdefer std.heap.page_allocator.free(key);
        try self.handlers.put(key, handler);
    }
};

/// API Handler type
pub const ApiHandler = *const fn (?*anyopaque) callconv(.C) void;

/// Backend API Service
pub const BackendApiService = struct {
    handlers: std.StringHashMap(ApiHandler),
    call_count: usize = 0,

    pub fn create() *BackendApiService {
        const self = std.heap.page_allocator.create(BackendApiService) catch @panic("OOM");
        self.* = .{
            .handlers = std.StringHashMap(ApiHandler).init(std.heap.page_allocator),
            .call_count = 0,
        };
        return self;
    }

    pub fn registerHandler(self: *BackendApiService, name: []const u8, handler: ApiHandler) !void {
        const key = try std.heap.page_allocator.dupe(u8, name);
        errdefer std.heap.page_allocator.free(key);
        try self.handlers.put(key, handler);
    }

    pub fn incrementCallCount(self: *BackendApiService) void {
        self.call_count += 1;
    }

    pub fn getCallCount(self: *BackendApiService) usize {
        return self.call_count;
    }
};

// ============================================================================
// Injector (Simple Service Locator)
// ============================================================================

pub const Injector = struct {
    logger: *LoggerService,
    config: *ConfigService,
    window: *WindowService,
    events: *EventService,
    api: *BackendApiService,

    pub fn create() *Injector {
        const self = std.heap.page_allocator.create(Injector) catch @panic("OOM");
        self.* = .{
            .logger = LoggerService.create(),
            .config = ConfigService.create(),
            .window = WindowService.create(),
            .events = EventService.create(),
            .api = BackendApiService.create(),
        };
        return self;
    }

    pub fn destroy(self: *Injector) void {
        std.heap.page_allocator.destroy(self);
    }
};

// ============================================================================
// Global Injector
// ============================================================================

var global_injector: ?*Injector = null;

pub fn getInjector() *Injector {
    return global_injector orelse @panic("Injector not initialized");
}

pub fn bootstrap() *Injector {
    global_injector = Injector.create();
    return global_injector.?;
}

// ============================================================================
// Convenience functions
// ============================================================================

pub fn getLogger() *LoggerService {
    return getInjector().logger;
}

pub fn getConfig() *ConfigService {
    return getInjector().config;
}

pub fn getWindowService() *WindowService {
    return getInjector().window;
}

pub fn getEventService() *EventService {
    return getInjector().events;
}

pub fn getApiService() *BackendApiService {
    return getInjector().api;
}

// ============================================================================
// Tests
// ============================================================================

const testing = std.testing;

test "DI - Injector creates all services" {
    const inj = Injector.create();
    defer inj.destroy();

    try testing.expect(inj.logger != null);
    try testing.expect(inj.config != null);
    try testing.expect(inj.window != null);
    try testing.expect(inj.events != null);
    try testing.expect(inj.api != null);
}

test "DI - LoggerService logs messages" {
    const logger = LoggerService.create();
    logger.info("Test message");
    try testing.expectEqualStrings("[App]", logger.prefix);
}

test "DI - ConfigService stores values" {
    const config = ConfigService.create();
    try testing.expectEqualStrings("Zig WebUI App", config.get("app.name", "Default"));
    try config.data.put("test.key", "test_value");
    try testing.expectEqualStrings("test_value", config.get("test.key", "Default"));
}

test "DI - WindowService stores window" {
    const window = WindowService.create();
    window.setWindow(123);
    try testing.expectEqual(@as(usize, 123), window.window);
}

test "DI - EventService binds handlers" {
    const events = EventService.create();
    const dummy = struct {
        fn handler(_: ?*anyopaque) callconv(.C) void {}
    }.handler;
    try events.bind("test", dummy);
    try testing.expect(events.handlers.count() > 0);
}

test "DI - ApiService tracks calls" {
    const api = BackendApiService.create();
    try testing.expectEqual(@as(usize, 0), api.call_count);
    api.incrementCallCount();
    try testing.expectEqual(@as(usize, 1), api.call_count);
}

test "DI - Bootstrap initializes global injector" {
    _ = bootstrap();
    const inj = getInjector();
    try testing.expect(inj != null);
}

test "DI - Convenience functions work" {
    _ = bootstrap();
    const logger = getLogger();
    const config = getConfig();
    try testing.expect(logger != null);
    try testing.expect(config != null);
}

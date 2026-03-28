//! Dependency Injection and Event Bus System for Zig
//! Simplified service locator with basic event pub/sub

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
    ServiceNotFound,
};

// ============================================================================
// Simple Result Type
// ============================================================================

pub fn Result(comptime T: type) type {
    return union(enum) {
        ok: T,
        err: DIError,

        pub fn from(value: T) @This() {
            return .{ .ok = value };
        }

        pub fn fromError(err: DIError) @This() {
            return .{ .err = err };
        }

        pub fn isOk(self: *const @This()) bool {
            return self.* == .ok;
        }

        pub fn isErr(self: *const @This()) bool {
            return self.* == .err;
        }

        pub fn unwrapOr(self: *const @This(), default: T) T {
            return switch (self.*) {
                .ok => |v| v,
                .err => default,
            };
        }
    };
}

// Convenience type for void results
pub const VoidResult = Result(void);

// ============================================================================
// Event Bus System
// ============================================================================

pub const EventCallback = *const fn (event: *const Event) void;

pub const Event = struct {
    name: []const u8,
    data: ?*anyopaque,
    source: ?*anyopaque,
};

pub const EventSubscription = struct {
    id: usize,
    event_name: []const u8,
    callback: EventCallback,
    once: bool,
};

pub const EventBus = struct {
    allocator: std.mem.Allocator,
    subscriptions: std.ArrayList(EventSubscription),
    next_id: usize = 0,
    mutex: std.Thread.Mutex = .{},

    const Self = @This();

    pub fn init(allocator: std.mem.Allocator) DIError!*Self {
        const self = allocator.create(EventBus) catch return DIError.OutOfMemory;
        self.* = .{
            .allocator = allocator,
            .subscriptions = std.ArrayList(EventSubscription).init(allocator),
        };
        return self;
    }

    pub fn deinit(self: *Self) void {
        for (self.subscriptions.items) |sub| {
            self.allocator.free(sub.event_name);
        }
        self.subscriptions.deinit();
        self.allocator.destroy(self);
    }

    pub fn subscribe(
        self: *Self,
        event_name: []const u8,
        callback: EventCallback,
    ) DIError!usize {
        return self.subscribeOnce(event_name, callback, false);
    }

    pub fn subscribeOnce(
        self: *Self,
        event_name: []const u8,
        callback: EventCallback,
        is_once: bool,
    ) DIError!usize {
        self.mutex.lock();
        defer self.mutex.unlock();

        const id = self.next_id;
        self.next_id += 1;

        const name_copy = try self.allocator.dupe(u8, event_name);
        errdefer self.allocator.free(name_copy);

        try self.subscriptions.append(.{
            .id = id,
            .event_name = name_copy,
            .callback = callback,
            .once = is_once,
        });

        return id;
    }

    pub fn unsubscribe(self: *Self, subscription_id: usize) void {
        self.mutex.lock();
        defer self.mutex.unlock();

        for (self.subscriptions.items, 0..) |sub, i| {
            if (sub.id == subscription_id) {
                self.allocator.free(self.subscriptions.items[i].event_name);
                _ = self.subscriptions.orderedRemove(i);
                return;
            }
        }
    }

    pub fn emit(self: *Self, event: *const Event) void {
        self.mutex.lock();
        defer self.mutex.unlock();

        var to_remove = std.ArrayList(usize).init(self.allocator);
        defer to_remove.deinit();

        // Call matching subscriptions
        for (self.subscriptions.items) |*sub| {
            if (std.mem.eql(u8, sub.event_name, event.name)) {
                sub.callback(event);
                if (sub.once) {
                    to_remove.append(sub.id) catch return;
                }
            }
        }

        // Remove one-time subscriptions
        for (to_remove.items) |id| {
            self.unsubscribe(id);
        }
    }

    pub fn emitSync(self: *Self, event: *const Event) void {
        self.emit(event);
    }

    pub fn once(
        self: *Self,
        event_name: []const u8,
        callback: EventCallback,
    ) DIError!usize {
        return self.subscribeOnce(event_name, callback, true);
    }

    pub fn removeAllForEvent(self: *Self, event_name: []const u8) void {
        self.mutex.lock();
        defer self.mutex.unlock();

        var i: usize = 0;
        while (i < self.subscriptions.items.len) {
            if (std.mem.eql(u8, self.subscriptions.items[i].event_name, event_name)) {
                self.allocator.free(self.subscriptions.items[i].event_name);
                _ = self.subscriptions.orderedRemove(i);
            } else {
                i += 1;
            }
        }
    }

    pub fn subscriptionCount(self: *Self) usize {
        self.mutex.lock();
        defer self.mutex.unlock();
        return self.subscriptions.items.len;
    }
};

// ============================================================================
// Core Services
// ============================================================================

pub const LoggerService = struct {
    prefix: []const u8 = "[App]",
    event_bus: ?*EventBus = null,

    pub fn create(allocator: std.mem.Allocator) DIError!*LoggerService {
        const self = allocator.create(LoggerService) catch return DIError.OutOfMemory;
        self.* = .{};
        return self;
    }

    pub fn createWithEventBus(allocator: std.mem.Allocator, bus: *EventBus) DIError!*LoggerService {
        const self = allocator.create(LoggerService) catch return DIError.OutOfMemory;
        self.* = .{ .event_bus = bus };
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

    pub fn log(self: *LoggerService, level: []const u8, message: []const u8) void {
        std.debug.print("{s} [{s}] {s}\n", .{ self.prefix, level, message });
    }

    pub fn deinit(self: *LoggerService, allocator: std.mem.Allocator) void {
        allocator.destroy(self);
    }
};

pub const ConfigService = struct {
    allocator: std.mem.Allocator,
    data: std.StringHashMap([]const u8),

    pub fn create(allocator: std.mem.Allocator) DIError!*ConfigService {
        const self = allocator.create(ConfigService) catch return DIError.OutOfMemory;
        self.* = .{
            .allocator = allocator,
            .data = std.StringHashMap([]const u8).init(allocator),
        };
        try self.data.put(try allocator.dupe(u8, "app.name"), try allocator.dupe(u8, "Zig WebUI App"));
        try self.data.put(try allocator.dupe(u8, "app.version"), try allocator.dupe(u8, "1.0.0"));
        try self.data.put(try allocator.dupe(u8, "app.environment"), try allocator.dupe(u8, "development"));
        return self;
    }

    pub fn get(self: *ConfigService, key: []const u8, default: []const u8) []const u8 {
        return self.data.get(key) orelse default;
    }

    pub fn set(self: *ConfigService, key: []const u8, value: []const u8) DIError!void {
        const key_copy = try self.allocator.dupe(u8, key);
        const value_copy = try self.allocator.dupe(u8, value);
        try self.data.put(key_copy, value_copy);
    }

    pub fn has(self: *ConfigService, key: []const u8) bool {
        return self.data.contains(key);
    }

    pub fn remove(self: *ConfigService, key: []const u8) void {
        _ = self.data.remove(key);
    }

    pub fn deinit(self: *ConfigService) void {
        var it = self.data.iterator();
        while (it.next()) |entry| {
            self.allocator.free(entry.key_ptr.*);
            self.allocator.free(entry.value_ptr.*);
        }
        self.data.deinit();
        self.allocator.destroy(self);
    }
};

pub const WindowService = struct {
    window: usize = 0,
    width: u32 = 1280,
    height: u32 = 800,
    x: i32 = -1,
    y: i32 = -1,
    resizable: bool = true,
    maximized: bool = false,
    visible: bool = true,
    title: []const u8 = "Zig WebUI App",
    event_bus: ?*EventBus = null,

    pub fn create(allocator: std.mem.Allocator) DIError!*WindowService {
        const self = allocator.create(WindowService) catch return DIError.OutOfMemory;
        self.* = .{};
        return self;
    }

    pub fn createWithEventBus(allocator: std.mem.Allocator, bus: *EventBus) DIError!*WindowService {
        const self = allocator.create(WindowService) catch return DIError.OutOfMemory;
        self.* = .{ .event_bus = bus };
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
        if (self.window != 0) {
            webui.setSize(self.window, width, height);
        }
    }

    pub fn getPosition(self: *WindowService) struct { i32, i32 } {
        return .{ self.x, self.y };
    }

    pub fn setPosition(self: *WindowService, x: i32, y: i32) void {
        self.x = x;
        self.y = y;
        if (self.window != 0) {
            webui.setPosition(self.window, @intCast(x), @intCast(y));
        }
    }

    pub fn setResizable(self: *WindowService, resizable: bool) void {
        self.resizable = resizable;
        if (self.window != 0) {
            webui.setResizable(self.window, resizable);
        }
    }

    pub fn isResizable(self: *WindowService) bool {
        return self.resizable;
    }

    pub fn setMaximized(self: *WindowService, maximized: bool) void {
        self.maximized = maximized;
        if (self.window != 0 and maximized) {
            webui.maximize(self.window);
        }
    }

    pub fn setMinimized(self: *WindowService) void {
        if (self.window != 0) {
            webui.minimize(self.window);
        }
    }

    pub fn setVisible(self: *WindowService, visible: bool) void {
        self.visible = visible;
        if (self.window != 0) {
            if (visible) {
                webui.showWindow(self.window);
            } else {
                webui.hide(self.window);
            }
        }
    }

    pub fn setTitle(self: *WindowService, title: []const u8) void {
        self.title = title;
        if (self.window != 0) {
            var buffer: [256]u8 = undefined;
            const slice = std.fmt.bufPrint(&buffer, "document.title = '{s}'", .{title}) catch return;
            webui.run(self.window, slice);
        }
    }

    pub fn center(self: *WindowService) void {
        if (self.window != 0) {
            webui.setCenter(self.window);
        }
    }

    pub fn close(self: *WindowService) void {
        if (self.window != 0) {
            webui.close(self.window);
        }
    }

    pub fn deinit(self: *WindowService, allocator: std.mem.Allocator) void {
        allocator.destroy(self);
    }
};

pub const WebuiEventHandler = *const fn (event: ?*webui.Event) callconv(.c) void;

pub const EventService = struct {
    allocator: std.mem.Allocator,
    handlers: std.StringHashMap(WebuiEventHandler),

    pub fn create(allocator: std.mem.Allocator) DIError!*EventService {
        const self = allocator.create(EventService) catch return DIError.OutOfMemory;
        self.* = .{
            .allocator = allocator,
            .handlers = std.StringHashMap(WebuiEventHandler).init(allocator),
        };
        return self;
    }

    pub fn bind(self: *EventService, element: []const u8, handler: WebuiEventHandler) DIError!void {
        const key = try self.allocator.dupe(u8, element);
        errdefer self.allocator.free(key);
        try self.handlers.put(key, handler);
    }

    pub fn unbind(self: *EventService, element: []const u8) void {
        _ = self.handlers.remove(element);
    }

    pub fn hasHandler(self: *EventService, element: []const u8) bool {
        return self.handlers.contains(element);
    }

    pub fn deinit(self: *EventService) void {
        var it = self.handlers.keyIterator();
        while (it.next()) |key| {
            self.allocator.free(key.*);
        }
        self.handlers.deinit();
        self.allocator.destroy(self);
    }
};

pub const BackendApiService = struct {
    allocator: std.mem.Allocator,
    handlers: std.StringHashMap(WebuiEventHandler),
    call_count: usize = 0,

    pub fn create(allocator: std.mem.Allocator) DIError!*BackendApiService {
        const self = allocator.create(BackendApiService) catch return DIError.OutOfMemory;
        self.* = .{
            .allocator = allocator,
            .handlers = std.StringHashMap(WebuiEventHandler).init(allocator),
            .call_count = 0,
        };
        return self;
    }

    pub fn registerHandler(self: *BackendApiService, name: []const u8, handler: WebuiEventHandler) DIError!void {
        const key = try self.allocator.dupe(u8, name);
        errdefer self.allocator.free(key);
        try self.handlers.put(key, handler);
    }

    pub fn unregisterHandler(self: *BackendApiService, name: []const u8) void {
        _ = self.handlers.remove(name);
    }

    pub fn hasHandler(self: *BackendApiService, name: []const u8) bool {
        return self.handlers.contains(name);
    }

    pub fn incrementCallCount(self: *BackendApiService) void {
        self.call_count += 1;
    }

    pub fn getCallCount(self: *BackendApiService) usize {
        return self.call_count;
    }

    pub fn resetCallCount(self: *BackendApiService) void {
        self.call_count = 0;
    }

    pub fn deinit(self: *BackendApiService) void {
        var it = self.handlers.keyIterator();
        while (it.next()) |key| {
            self.allocator.free(key.*);
        }
        self.handlers.deinit();
        self.allocator.destroy(self);
    }
};

pub const NotificationService = struct {
    allocator: std.mem.Allocator,
    enabled: bool = true,

    pub fn create(allocator: std.mem.Allocator) DIError!*NotificationService {
        const self = allocator.create(NotificationService) catch return DIError.OutOfMemory;
        self.* = .{
            .allocator = allocator,
            .enabled = true,
        };
        return self;
    }

    pub fn send(self: *NotificationService, app_name: []const u8, title: []const u8, body: []const u8) DIError!void {
        if (!self.enabled) return;
        std.debug.print("[{s}] Notification: {s} - {s}\n", .{ app_name, title, body });
    }

    pub fn sendWithIcon(self: *NotificationService, app_name: []const u8, title: []const u8, body: []const u8, icon: []const u8) DIError!void {
        if (!self.enabled) return;
        std.debug.print("[{s}] Notification with icon({s}): {s} - {s}\n", .{ app_name, icon, title, body });
    }

    pub fn setEnabled(self: *NotificationService, enabled: bool) void {
        self.enabled = enabled;
    }

    pub fn isEnabled(self: *NotificationService) bool {
        return self.enabled;
    }

    pub fn deinit(self: *NotificationService) void {
        self.allocator.destroy(self);
    }
};

pub const ClipboardService = struct {
    allocator: std.mem.Allocator,
    last_text: ?[]const u8 = null,

    pub fn create(allocator: std.mem.Allocator) DIError!*ClipboardService {
        const self = allocator.create(ClipboardService) catch return DIError.OutOfMemory;
        self.* = .{
            .allocator = allocator,
            .last_text = null,
        };
        return self;
    }

    pub fn setText(self: *ClipboardService, text: []const u8) DIError!void {
        if (self.last_text) |old| {
            self.allocator.free(old);
        }
        self.last_text = self.allocator.dupe(u8, text);
    }

    pub fn getText(self: *ClipboardService) DIError![]const u8 {
        if (self.last_text) |text| {
            return text;
        }
        return DIError.ServiceNotFound;
    }

    pub fn hasText(self: *ClipboardService) DIError!bool {
        return self.last_text != null;
    }

    pub fn clear(self: *ClipboardService) DIError!void {
        if (self.last_text) |old| {
            self.allocator.free(old);
            self.last_text = null;
        }
    }

    pub fn deinit(self: *ClipboardService) void {
        if (self.last_text) |text| {
            self.allocator.free(text);
        }
        self.allocator.destroy(self);
    }
};

pub const StorageService = struct {
    allocator: std.mem.Allocator,
    data: std.StringHashMap([]const u8),

    pub fn create(allocator: std.mem.Allocator, app_name: []const u8) DIError!*StorageService {
        _ = app_name;
        const self = allocator.create(StorageService) catch return DIError.OutOfMemory;
        self.* = .{
            .allocator = allocator,
            .data = std.StringHashMap([]const u8).init(allocator),
        };
        return self;
    }

    pub fn getString(self: *StorageService, key: []const u8, default: []const u8) []const u8 {
        if (self.data.get(key)) |val| {
            return val;
        }
        return default;
    }

    pub fn setString(self: *StorageService, key: []const u8, value: []const u8) DIError!void {
        const key_dup = try self.allocator.dupe(u8, key);
        errdefer self.allocator.free(key_dup);
        const val_dup = try self.allocator.dupe(u8, value);
        errdefer self.allocator.free(val_dup);
        try self.data.put(key_dup, val_dup);
    }

    pub fn getInt(self: *StorageService, key: []const u8, default: i64) i64 {
        if (self.data.get(key)) |val| {
            return std.fmt.parseInt(i64, val, 10) catch default;
        }
        return default;
    }

    pub fn setInt(self: *StorageService, key: []const u8, value: i64) DIError!void {
        const str = try std.fmt.allocPrint(self.allocator, "{d}", .{value});
        errdefer self.allocator.free(str);
        const key_dup = try self.allocator.dupe(u8, key);
        errdefer self.allocator.free(key_dup);
        try self.data.put(key_dup, str);
    }

    pub fn getBool(self: *StorageService, key: []const u8, default: bool) bool {
        if (self.data.get(key)) |val| {
            return std.mem.eql(u8, val, "true");
        }
        return default;
    }

    pub fn setBool(self: *StorageService, key: []const u8, value: bool) DIError!void {
        const str: []const u8 = if (value) "true" else "false";
        try self.setString(key, str);
    }

    pub fn has(self: *StorageService, key: []const u8) bool {
        return self.data.contains(key);
    }

    pub fn remove(self: *StorageService, key: []const u8) void {
        _ = self.data.remove(key);
    }

    pub fn save(self: *StorageService) DIError!void {
        // No-op for in-memory storage
        _ = self;
    }

    pub fn deinit(self: *StorageService) void {
        var it = self.data.keyIterator();
        while (it.next()) |k| {
            self.allocator.free(k.*);
        }
        var vit = self.data.valueIterator();
        while (vit.next()) |v| {
            self.allocator.free(v.*);
        }
        self.data.deinit();
        self.allocator.destroy(self);
    }
};

pub const HttpMethod = enum {
    GET,
    POST,
    PUT,
    DELETE,
    PATCH,
};

pub const HttpResponse = struct {
    status_code: u16,
    body: []const u8,
    headers: std.StringHashMap([]const u8),
};

pub const HttpService = struct {
    allocator: std.mem.Allocator,
    default_timeout_ms: u64 = 30000,

    pub fn create(allocator: std.mem.Allocator) DIError!*HttpService {
        const self = allocator.create(HttpService) catch return DIError.OutOfMemory;
        self.* = .{
            .allocator = allocator,
            .default_timeout_ms = 30000,
        };
        return self;
    }

    pub fn setDefaultTimeout(self: *HttpService, timeout_ms: u64) void {
        self.default_timeout_ms = timeout_ms;
    }

    pub fn request(_: *HttpService, method: HttpMethod, url: []const u8, body: ?[]const u8) DIError!HttpResponse {
        _ = method;
        _ = url;
        _ = body;
        return DIError.ServiceNotFound;
    }

    pub fn get(self: *HttpService, url: []const u8) DIError!HttpResponse {
        return self.request(.GET, url, null);
    }

    pub fn post(self: *HttpService, url: []const u8, body: []const u8) DIError!HttpResponse {
        return self.request(.POST, url, body);
    }

    pub fn put(self: *HttpService, url: []const u8, body: []const u8) DIError!HttpResponse {
        return self.request(.PUT, url, body);
    }

    pub fn delete(self: *HttpService, url: []const u8) DIError!HttpResponse {
        return self.request(.DELETE, url, null);
    }

    pub fn deinit(self: *HttpService) void {
        self.allocator.destroy(self);
    }
};

pub const ProcessService = struct {
    allocator: std.mem.Allocator,

    pub fn create(allocator: std.mem.Allocator) DIError!*ProcessService {
        const self = allocator.create(ProcessService) catch return DIError.OutOfMemory;
        self.* = .{ .allocator = allocator };
        return self;
    }

    pub fn spawn(_: *ProcessService, program: []const u8, args: []const []const u8) DIError!std.process.Child {
        _ = program;
        _ = args;
        return error.NotImplemented;
    }

    pub fn run(_: *ProcessService, program: []const u8, args: []const []const u8) DIError!std.process.Child.ExecResult {
        _ = program;
        return std.process.Child.exec(.{
            .allocator = std.heap.page_allocator,
            .argv = args,
        }) catch return DIError.ServiceNotFound;
    }

    pub fn deinit(self: *ProcessService) void {
        self.allocator.destroy(self);
    }
};

// ============================================================================
// Injector
// ============================================================================

pub const Injector = struct {
    allocator: std.mem.Allocator,
    logger: *LoggerService,
    config: *ConfigService,
    window: *WindowService,
    events: *EventService,
    api: *BackendApiService,
    event_bus: *EventBus,
    notification: *NotificationService,
    clipboard: *ClipboardService,
    storage: *StorageService,
    http: *HttpService,
    process: *ProcessService,

    pub fn create(allocator: std.mem.Allocator) DIError!*Injector {
        const self = allocator.create(Injector) catch return DIError.OutOfMemory;
        errdefer allocator.destroy(self);

        const event_bus = try EventBus.init(allocator);
        errdefer event_bus.deinit();

        const logger = try LoggerService.create(allocator);
        errdefer logger.deinit(allocator);

        const config = try ConfigService.create(allocator);
        errdefer config.deinit();

        const window = try WindowService.create(allocator);
        errdefer window.deinit(allocator);

        const events = try EventService.create(allocator);
        errdefer events.deinit();

        const api = try BackendApiService.create(allocator);
        errdefer api.deinit();

        const notification = try NotificationService.create(allocator);
        errdefer notification.deinit();

        const clipboard = try ClipboardService.create(allocator);
        errdefer clipboard.deinit();

        const storage = try StorageService.create(allocator, "ZigWebUIApp");
        errdefer storage.deinit();

        const http = try HttpService.create(allocator);
        errdefer http.deinit();

        const process = try ProcessService.create(allocator);
        errdefer process.deinit();

        self.* = .{
            .allocator = allocator,
            .logger = logger,
            .config = config,
            .window = window,
            .events = events,
            .api = api,
            .event_bus = event_bus,
            .notification = notification,
            .clipboard = clipboard,
            .storage = storage,
            .http = http,
            .process = process,
        };

        return self;
    }

    pub fn destroy(self: *Injector) void {
        const allocator = self.allocator;
        self.process.deinit();
        self.http.deinit();
        self.storage.deinit();
        self.clipboard.deinit();
        self.notification.deinit();
        self.api.deinit();
        self.events.deinit();
        self.window.deinit(allocator);
        self.config.deinit();
        self.logger.deinit(allocator);
        self.event_bus.deinit();
        allocator.destroy(self);
    }

    pub fn getLogger(self: *Injector) *LoggerService {
        return self.logger;
    }

    pub fn getConfig(self: *Injector) *ConfigService {
        return self.config;
    }

    pub fn getWindow(self: *Injector) *WindowService {
        return self.window;
    }

    pub fn getEvents(self: *Injector) *EventService {
        return self.events;
    }

    pub fn getApi(self: *Injector) *BackendApiService {
        return self.api;
    }

    pub fn getEventBus(self: *Injector) *EventBus {
        return self.event_bus;
    }

    pub fn getNotification(self: *Injector) *NotificationService {
        return self.notification;
    }

    pub fn getClipboard(self: *Injector) *ClipboardService {
        return self.clipboard;
    }

    pub fn getStorage(self: *Injector) *StorageService {
        return self.storage;
    }

    pub fn getHttp(self: *Injector) *HttpService {
        return self.http;
    }

    pub fn getProcess(self: *Injector) *ProcessService {
        return self.process;
    }
};

// ============================================================================
// Global Injector
// ============================================================================

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
// Convenience Functions
// ============================================================================

pub fn getLogger() DIError!*LoggerService {
    const inj = try getInjector();
    return inj.logger;
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

pub fn getEventBus() DIError!*EventBus {
    const inj = try getInjector();
    return inj.event_bus;
}

pub fn getNotificationService() DIError!*NotificationService {
    const inj = try getInjector();
    return inj.notification;
}

pub fn getClipboardService() DIError!*ClipboardService {
    const inj = try getInjector();
    return inj.clipboard;
}

pub fn getStorageService() DIError!*StorageService {
    const inj = try getInjector();
    return inj.storage;
}

pub fn getHttpService() DIError!*HttpService {
    const inj = try getInjector();
    return inj.http;
}

pub fn getProcessService() DIError!*ProcessService {
    const inj = try getInjector();
    return inj.process;
}

// ============================================================================
// Result-Based Convenience Functions - Explicit Error Handling
// ============================================================================

pub fn tryGetLogger() Result(*LoggerService) {
    const inj = getInjector() catch |e| return Result(*LoggerService).fromError(e);
    return Result(*LoggerService).from(inj.getLogger());
}

pub fn tryGetConfig() Result(*ConfigService) {
    const inj = getInjector() catch |e| return Result(*ConfigService).fromError(e);
    return Result(*ConfigService).from(inj.getConfig());
}

pub fn tryGetWindow() Result(*WindowService) {
    const inj = getInjector() catch |e| return Result(*WindowService).fromError(e);
    return Result(*WindowService).from(inj.getWindow());
}

pub fn tryGetEvents() Result(*EventService) {
    const inj = getInjector() catch |e| return Result(*EventService).fromError(e);
    return Result(*EventService).from(inj.getEvents());
}

pub fn tryGetApi() Result(*BackendApiService) {
    const inj = getInjector() catch |e| return Result(*BackendApiService).fromError(e);
    return Result(*BackendApiService).from(inj.getApi());
}

pub fn tryGetEventBus() Result(*EventBus) {
    const inj = getInjector() catch |e| return Result(*EventBus).fromError(e);
    return Result(*EventBus).from(inj.getEventBus());
}

pub fn tryGetNotification() Result(*NotificationService) {
    const inj = getInjector() catch |e| return Result(*NotificationService).fromError(e);
    return Result(*NotificationService).from(inj.getNotification());
}

pub fn tryGetClipboard() Result(*ClipboardService) {
    const inj = getInjector() catch |e| return Result(*ClipboardService).fromError(e);
    return Result(*ClipboardService).from(inj.getClipboard());
}

pub fn tryGetStorage() Result(*StorageService) {
    const inj = getInjector() catch |e| return Result(*StorageService).fromError(e);
    return Result(*StorageService).from(inj.getStorage());
}

pub fn tryGetHttp() Result(*HttpService) {
    const inj = getInjector() catch |e| return Result(*HttpService).fromError(e);
    return Result(*HttpService).from(inj.getHttp());
}

pub fn tryGetProcess() Result(*ProcessService) {
    const inj = getInjector() catch |e| return Result(*ProcessService).fromError(e);
    return Result(*ProcessService).from(inj.getProcess());
}

// ============================================================================
// Event Bus Convenience Functions
// ============================================================================
// Event Bus Convenience Functions
// ============================================================================

pub const AppEvents = struct {
    pub const AppStarted = "app:started";
    pub const AppStopping = "app:stopping";
    pub const WindowCreated = "window:created";
    pub const WindowClosed = "window:closed";
    pub const WindowResized = "window:resized";
    pub const ApiCalled = "api:called";
    pub const ApiRegistered = "api:registered";
    pub const ConfigChanged = "config:changed";
    pub const Error = "app:error";
};

pub fn emitAppStarted() void {
    const bus = getEventBus() catch return;
    var event = Event{
        .name = AppEvents.AppStarted,
        .data = null,
        .source = null,
    };
    bus.emit(&event);
}

pub fn emitWindowCreated(window_id: usize) void {
    const bus = getEventBus() catch return;
    var event = Event{
        .name = AppEvents.WindowCreated,
        .data = @ptrFromInt(window_id),
        .source = null,
    };
    bus.emit(&event);
}

pub fn emitApiCalled(function_name: []const u8) void {
    const bus = getEventBus() catch return;
    var event = Event{
        .name = AppEvents.ApiCalled,
        .data = @ptrFromInt(@intFromPtr(function_name.ptr)),
        .source = null,
    };
    bus.emit(&event);
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
    try testing.expect(inj.event_bus != null);
}

test "DI - EventBus subscribe and emit" {
    var bus = try EventBus.init(testing.allocator);
    defer bus.deinit();

    const handler = struct {
        fn handler(e: *const Event) void {
            _ = e;
        }
    }.handler;

    const sub_id = try bus.subscribe("test-event", handler);
    try testing.expect(sub_id > 0);
}

test "DI - EventBus unsubscribe" {
    var bus = try EventBus.init(testing.allocator);
    defer bus.deinit();

    const handler = struct {
        fn handler(_: *const Event) void {}
    }.handler;

    const sub_id = try bus.subscribe("event", handler);
    try testing.expect(sub_id > 0);

    bus.unsubscribe(sub_id);

    try testing.expectEqual(@as(usize, 0), bus.subscriptionCount());
}

test "DI - EventBus once subscription" {
    var bus = try EventBus.init(testing.allocator);
    defer bus.deinit();

    const handler = struct {
        fn handler(_: *const Event) void {}
    }.handler;

    const sub_id = try bus.subscribeOnce("once-event", handler, true);
    try testing.expect(sub_id > 0);

    var event = Event{ .name = "once-event", .data = null, .source = null };
    bus.emit(&event);

    try testing.expectEqual(@as(usize, 0), bus.subscriptionCount());
}

test "DI - LoggerService logs messages" {
    const logger = try LoggerService.create(testing.allocator);
    defer logger.deinit(testing.allocator);
    logger.info("Test message");
    try testing.expectEqualStrings("[App]", logger.prefix);
}

test "DI - ConfigService stores values" {
    const config = try ConfigService.create(testing.allocator);
    defer config.deinit();
    try config.set("test.key", "test_value");
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
    defer events.deinit();
    const dummy = struct {
        fn handler(_: ?*webui.Event) callconv(.c) void {}
    }.handler;
    try events.bind("test", dummy);
    try testing.expect(events.handlers.count() > 0);
}

test "DI - ApiService tracks calls" {
    const api = try BackendApiService.create(testing.allocator);
    defer api.deinit();
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
    const event_bus = getEventBus();
    try testing.expect(logger != null);
    try testing.expect(config != null);
    try testing.expect(event_bus != null);
}

test "DI - GetInjector returns error when not bootstrapped" {
    shutdown();
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
    defer config.deinit();

    try testing.expectEqualStrings("Zig WebUI App", config.get("app.name", "Default"));
    try testing.expectEqualStrings("1.0.0", config.get("app.version", "0.0.0"));
    try testing.expectEqualStrings("development", config.get("app.environment", "production"));
}

test "DI - Multiple event bindings" {
    const events = try EventService.create(testing.allocator);
    defer events.deinit();

    const handler1 = struct {
        fn h(_: ?*webui.Event) callconv(.c) void {}
    }.handler;
    const handler2 = struct {
        fn h(_: ?*webui.Event) callconv(.c) void {}
    }.handler;

    try events.bind("event1", handler1);
    try events.bind("event2", handler2);

    try testing.expectEqual(@as(usize, 2), events.handlers.count());
}

test "DI - ApiService register and call handlers" {
    const api = try BackendApiService.create(testing.allocator);
    defer api.deinit();

    const handler = struct {
        fn h(_: ?*webui.Event) callconv(.c) void {}
    }.handler;

    try api.registerHandler("testHandler", handler);
    try testing.expect(api.handlers.contains("testHandler"));

    api.incrementCallCount();
    api.incrementCallCount();
    try testing.expectEqual(@as(usize, 2), api.getCallCount());
}

test "DI - Injector destroy cleans up all services" {
    const inj = try Injector.create(testing.allocator);
    _ = inj.logger;
    inj.destroy();

    try testing.expect(true);
}

test "DI - Bootstrap returns existing injector" {
    const inj1 = try bootstrap();
    const inj2 = try bootstrap();
    try testing.expectEqual(inj1, inj2);
    shutdown();
}

test "DI - ConfigService has and remove" {
    const config = try ConfigService.create(testing.allocator);
    defer config.deinit();

    try config.set("key", "value");
    try testing.expect(config.has("key"));

    config.remove("key");
    try testing.expect(!config.has("key"));
}

test "DI - WindowService methods" {
    const window = try WindowService.create(testing.allocator);
    defer window.deinit(testing.allocator);

    window.setMaximized(true);
    try testing.expect(window.maximized);

    window.setVisible(false);
    try testing.expect(!window.visible);

    window.setResizable(false);
    try testing.expect(!window.isResizable());
}

test "DI - BackendApiService reset and unregister" {
    const api = try BackendApiService.create(testing.allocator);
    defer api.deinit();

    const handler = struct {
        fn h(_: ?*webui.Event) callconv(.c) void {}
    }.handler;

    try api.registerHandler("handler1", handler);
    try testing.expect(api.hasHandler("handler1"));

    api.unregisterHandler("handler1");
    try testing.expect(!api.hasHandler("handler1"));

    api.incrementCallCount();
    api.incrementCallCount();
    try testing.expectEqual(@as(usize, 2), api.getCallCount());

    api.resetCallCount();
    try testing.expectEqual(@as(usize, 0), api.getCallCount());
}

test "DI - EventBus remove all for event" {
    var bus = try EventBus.init(testing.allocator);
    defer bus.deinit();

    const handler = struct {
        fn handler(_: *const Event) void {}
    }.handler;

    _ = try bus.subscribe("multi-event", handler);
    _ = try bus.subscribe("multi-event", handler);
    _ = try bus.subscribe("multi-event", handler);

    try testing.expectEqual(@as(usize, 3), bus.subscriptionCount());

    bus.removeAllForEvent("multi-event");

    try testing.expectEqual(@as(usize, 0), bus.subscriptionCount());
}

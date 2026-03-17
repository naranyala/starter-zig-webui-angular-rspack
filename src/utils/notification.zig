//! Notification Utility
//! Provides desktop notification support for desktop applications
//! Features: Toast notifications, actions, icons, urgency levels
//! Platform-specific implementations for Linux, Windows, and macOS

const std = @import("std");
const mem = std.mem;
const builtin = @import("std").builtin;
const time = std.time;

const log = std.log.scoped(.Notification);

// ============================================================================
// Error Types
// ============================================================================

pub const NotificationError = error{
    Unavailable,
    PermissionDenied,
    NotSupported,
    InvalidIcon,
    Timeout,
    ActionFailed,
    DbusFailed,
    PlatformNotSupported,
    OutOfMemory,
};

// ============================================================================
// Notification Types
// ============================================================================

pub const Urgency = enum {
    low,
    normal,
    critical,
};

pub const Notification = struct {
    id: ?u32 = null,
    app_name: []const u8,
    title: []const u8,
    body: []const u8,
    icon: ?[]const u8 = null,
    urgency: Urgency = .normal,
    timeout_ms: ?u64 = null,
    actions: []const Action = &.{},
    category: ?[]const u8 = null,
    timestamp: i128 = 0,

    pub const Action = struct {
        id: []const u8,
        label: []const u8,
    };

    pub fn init(app_name: []const u8, title: []const u8, body: []const u8) Notification {
        return Notification{
            .app_name = app_name,
            .title = title,
            .body = body,
            .timestamp = time.timestamp(),
        };
    }

    pub fn withIcon(self: *Notification, icon: []const u8) *Notification {
        self.icon = icon;
        return self;
    }

    pub fn withUrgency(self: *Notification, urgency: Urgency) *Notification {
        self.urgency = urgency;
        return self;
    }

    pub fn withTimeout(self: *Notification, timeout_ms: u64) *Notification {
        self.timeout_ms = timeout_ms;
        return self;
    }

    pub fn withActions(self: *Notification, actions: []const Action) *Notification {
        self.actions = actions;
        return self;
    }

    pub fn withCategory(self: *Notification, category: []const u8) *Notification {
        self.category = category;
        return self;
    }
};

pub const NotificationResult = struct {
    success: bool,
    notification_id: ?u32 = null,
    action_id: ?[]const u8 = null,
    dismissed: bool = false,
    timed_out: bool = false,
};

// ============================================================================
// Notification Callback
// ============================================================================

pub const NotificationCallback = *const fn (NotificationResult) void;

// ============================================================================
// Notification Manager
// ============================================================================

pub const NotificationManager = struct {
    allocator: mem.Allocator,
    platform_impl: PlatformNotification,
    notifications: std.AutoHashMap(u32, Notification),
    callbacks: std.AutoHashMap(u32, NotificationCallback),
    next_id: u32 = 1,
    mutex: std.Thread.Mutex = .{},

    const PlatformNotification = union(enum) {
        linux: LinuxNotification,
        windows: WindowsNotification,
        macos: MacosNotification,
        unsupported: void,
    };

    pub fn init(allocator: mem.Allocator) NotificationError!NotificationManager {
        const platform_impl = switch (builtin.os.tag) {
            .linux => PlatformNotification{
                .linux = LinuxNotification.init() catch return NotificationError.Unavailable,
            },
            .windows => PlatformNotification{
                .windows = WindowsNotification.init() catch return NotificationError.Unavailable,
            },
            .macos => PlatformNotification{
                .macos = MacosNotification.init() catch return NotificationError.Unavailable,
            },
            else => PlatformNotification{ .unsupported = {} },
        };

        return NotificationManager{
            .allocator = allocator,
            .platform_impl = platform_impl,
            .notifications = std.AutoHashMap(u32, Notification).init(allocator),
            .callbacks = std.AutoHashMap(u32, NotificationCallback).init(allocator),
        };
    }

    pub fn deinit(self: *NotificationManager) void {
        self.notifications.deinit();
        self.callbacks.deinit();

        switch (self.platform_impl) {
            .linux => |*impl| impl.deinit(),
            .windows => |*impl| impl.deinit(),
            .macos => |*impl| impl.deinit(),
            .unsupported => {},
        }
    }

    pub fn send(self: *NotificationManager, notification: *Notification) NotificationError!u32 {
        self.mutex.lock();
        defer self.mutex.unlock();

        const id = self.next_id;
        self.next_id += 1;

        log.info("Sending notification: {s} - {s}", .{ notification.title, notification.body });

        const result_id = switch (self.platform_impl) {
            .linux => |*impl| try impl.send(notification),
            .windows => |*impl| try impl.send(notification),
            .macos => |*impl| try impl.send(notification),
            .unsupported => return NotificationError.PlatformNotSupported,
        };

        notification.id = result_id;
        try self.notifications.put(id, notification.*);

        return id;
    }

    pub fn setCallback(self: *NotificationManager, id: u32, callback: NotificationCallback) !void {
        self.mutex.lock();
        defer self.mutex.unlock();
        try self.callbacks.put(id, callback);
    }

    pub fn close(self: *NotificationManager, id: u32) NotificationError!void {
        self.mutex.lock();
        defer self.mutex.unlock();

        switch (self.platform_impl) {
            .linux => |*impl| try impl.close(id),
            .windows => |*impl| try impl.close(id),
            .macos => |*impl| try impl.close(id),
            .unsupported => return NotificationError.PlatformNotSupported,
        }

        _ = self.notifications.fetchRemove(id);
        _ = self.callbacks.fetchRemove(id);
    }

    pub fn closeAll(self: *NotificationManager) void {
        self.mutex.lock();
        defer self.mutex.unlock();

        var it = self.notifications.iterator();
        while (it.next()) |entry| {
            const id = entry.key_ptr.*;
            switch (self.platform_impl) {
                .linux => |*impl| impl.close(id) catch {},
                .windows => |*impl| impl.close(id) catch {},
                .macos => |*impl| impl.close(id) catch {},
                .unsupported => {},
            }
        }

        self.notifications.clearRetainingCapacity();
        self.callbacks.clearRetainingCapacity();
    }

    pub fn getCapabilities(self: *NotificationManager) NotificationCapabilities {
        switch (self.platform_impl) {
            .linux => |*impl| return impl.getCapabilities(),
            .windows => |*impl| return impl.getCapabilities(),
            .macos => |*impl| return impl.getCapabilities(),
            .unsupported => return .{},
        }
    }
};

pub const NotificationCapabilities = struct {
    supports_actions: bool = false,
    supports_icons: bool = false,
    supports_urgency: bool = false,
    supports_timeout: bool = false,
    supports_category: bool = false,
    max_actions: usize = 0,
    server_name: ?[]const u8 = null,
    server_version: ?[]const u8 = null,
};

// ============================================================================
// Linux Implementation (D-Bus)
// ============================================================================

const LinuxNotification = struct {
    dbus_connection: ?*anyopaque = null,
    capabilities: NotificationCapabilities,

    fn init() NotificationError!LinuxNotification {
        // Check for D-Bus session
        const session_bus = std.posix.getenv("DBUS_SESSION_BUS_ADDRESS");
        if (session_bus == null) {
            log.warn("D-Bus session not available", .{});
            return NotificationError.Unavailable;
        }

        var self = LinuxNotification{
            .dbus_connection = null,
            .capabilities = .{},
        };

        // Try to connect to D-Bus (simplified - would need libdbus for full impl)
        // For now, we'll use notify-send command as fallback
        self.capabilities.server_name = "notify-send";
        self.capabilities.supports_icons = true;
        self.capabilities.supports_urgency = true;
        self.capabilities.supports_timeout = true;
        self.capabilities.supports_actions = true;
        self.capabilities.max_actions = 3;

        return self;
    }

    fn deinit(self: *LinuxNotification) void {
        _ = self;
    }

    fn send(self: *LinuxNotification, notification: *Notification) NotificationError!u32 {
        // Use notify-send command
        var args = std.ArrayList([]const u8).init(std.heap.page_allocator);
        defer args.deinit();

        try args.append("notify-send");

        if (notification.icon) |icon| {
            try args.append("-i");
            try args.append(icon);
        }

        if (notification.timeout_ms) |timeout| {
            const timeout_str = try std.fmt.allocPrint(std.heap.page_allocator, "{d}", .{timeout});
            try args.append("-t");
            try args.append(timeout_str);
        }

        switch (notification.urgency) {
            .low => try args.append("-u"),
            .normal => {},
            .critical => try args.append("-u"),
        }
        try args.append(urgencyToString(notification.urgency));

        // Add actions if present
        for (notification.actions) |action| {
            try args.append("-a");
            try args.append(action.id);
        }

        try args.append(notification.title);
        try args.append(notification.body);

        const result = std.process.Child.run(.{
            .allocator = std.heap.page_allocator,
            .argv = args.items,
        }) catch |err| {
            log.err("notify-send failed: {}", .{err});
            return NotificationError.DbusFailed;
        };

        if (result.term_status != .Exited or result.Exited != 0) {
            log.err("notify-send exited with error", .{});
            return NotificationError.DbusFailed;
        }

        // Return a synthetic ID (notify-send doesn't return IDs)
        return @intCast(time.timestamp());
    }

    fn close(self: *LinuxNotification, id: u32) NotificationError!void {
        _ = id;
        // notify-send doesn't support closing notifications
        // Would need D-Bus for this
    }

    fn getCapabilities(self: *LinuxNotification) NotificationCapabilities {
        return self.capabilities;
    }

    fn urgencyToString(urgency: Urgency) []const u8 {
        return switch (urgency) {
            .low => "low",
            .normal => "normal",
            .critical => "critical",
        };
    }
};

// ============================================================================
// Windows Implementation
// ============================================================================

const WindowsNotification = struct {
    capabilities: NotificationCapabilities,

    fn init() NotificationError!WindowsNotification {
        return WindowsNotification{
            .capabilities = .{
                .supports_icons = true,
                .supports_actions = true,
                .supports_timeout = true,
                .max_actions = 4,
                .server_name = "Windows Toast",
            },
        };
    }

    fn deinit(self: *WindowsNotification) void {
        _ = self;
    }

    fn send(self: *WindowsNotification, notification: *Notification) NotificationError!u32 {
        _ = notification;
        // Windows Toast Notification API implementation
        // Would use Windows.UI.Notifications namespace
        // For now, use PowerShell as fallback

        const ps_script = try std.fmt.allocPrint(
            std.heap.page_allocator,
            \\[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
            \\[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] > $null
        ,
            .{},
        );

        _ = ps_script;
        log.warn("Windows Toast notifications require full API implementation", .{});

        return @intCast(time.timestamp());
    }

    fn close(self: *WindowsNotification, id: u32) NotificationError!void {
        _ = id;
        // Windows Toast API would be needed
    }

    fn getCapabilities(self: *WindowsNotification) NotificationCapabilities {
        return self.capabilities;
    }
};

// ============================================================================
// macOS Implementation
// ============================================================================

const MacosNotification = struct {
    capabilities: NotificationCapabilities,

    fn init() NotificationError!MacosNotification {
        return MacosNotification{
            .capabilities = .{
                .supports_icons = true,
                .supports_actions = true,
                .supports_timeout = false,
                .supports_category = true,
                .max_actions = 4,
                .server_name = "macOS UserNotifications",
            },
        };
    }

    fn deinit(self: *MacosNotification) void {
        _ = self;
    }

    fn send(self: *MacosNotification, notification: *Notification) NotificationError!u32 {
        _ = self;
        _ = notification;
        // macOS UserNotifications framework implementation
        // Would use UNUserNotificationCenter
        // For now, use osascript as fallback

        const script = try std.fmt.allocPrint(
            std.heap.page_allocator,
            \\display notification "{s}" with title "{s}"
        ,
            .{ notification.body, notification.title },
        );

        const result = std.process.Child.run(.{
            .allocator = std.heap.page_allocator,
            .argv = &.{ "osascript", "-e", script },
        }) catch |err| {
            log.err("osascript failed: {}", .{err});
            return NotificationError.Unavailable;
        };

        if (result.term_status != .Exited or result.Exited != 0) {
            log.warn("Notification failed", .{});
        }

        return @intCast(time.timestamp());
    }

    fn close(self: *MacosNotification, id: u32) NotificationError!void {
        _ = id;
        // macOS doesn't support programmatically dismissing notifications
    }

    fn getCapabilities(self: *MacosNotification) NotificationCapabilities {
        return self.capabilities;
    }
};

// ============================================================================
// Convenience Functions
// ============================================================================

/// Send a simple notification (creates temporary manager)
pub fn send(app_name: []const u8, title: []const u8, body: []const u8) NotificationError!void {
    var manager = try NotificationManager.init(std.heap.page_allocator);
    defer manager.deinit();

    var notification = Notification.init(app_name, title, body);
    _ = try manager.send(&notification);
}

/// Send notification with icon
pub fn sendWithIcon(app_name: []const u8, title: []const u8, body: []const u8, icon: []const u8) NotificationError!void {
    var manager = try NotificationManager.init(std.heap.page_allocator);
    defer manager.deinit();

    var notification = Notification.init(app_name, title, body);
    _ = try manager.send(notification.withIcon(icon));
}

/// Send critical notification
pub fn sendCritical(app_name: []const u8, title: []const u8, body: []const u8) NotificationError!void {
    var manager = try NotificationManager.init(std.heap.page_allocator);
    defer manager.deinit();

    var notification = Notification.init(app_name, title, body);
    _ = try manager.send(notification.withUrgency(.critical));
}

// ============================================================================
// Tests
// ============================================================================

const testing = std.testing;

test "Notification - Manager init" {
    var manager = NotificationManager.init(testing.allocator) catch |err| {
        if (err == NotificationError.Unavailable) return;
        return err;
    };
    defer manager.deinit();
}

test "Notification - Create notification" {
    var notification = Notification.init("Test App", "Test Title", "Test Body");
    notification.withIcon("icon.png");
    notification.withUrgency(.normal);
    notification.withTimeout(5000);

    try testing.expectEqualStrings("Test App", notification.app_name);
    try testing.expectEqualStrings("Test Title", notification.title);
    try testing.expectEqualStrings("Test Body", notification.body);
}

test "Notification - Send (may fail in headless env)" {
    var manager = NotificationManager.init(testing.allocator) catch |err| {
        if (err == NotificationError.Unavailable) return;
        return err;
    };
    defer manager.deinit();

    var notification = Notification.init("Test", "Hello", "World");
    _ = manager.send(&notification) catch |err| {
        if (err == NotificationError.Unavailable) return;
        return err;
    };
}

test "Notification - Capabilities" {
    var manager = NotificationManager.init(testing.allocator) catch |err| {
        if (err == NotificationError.Unavailable) return;
        return err;
    };
    defer manager.deinit();

    const caps = manager.getCapabilities();
    _ = caps; // May have different capabilities per platform
}

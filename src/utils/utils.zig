//! Desktop Application Utilities
//! Common utilities for desktop application development
//!
//! Available utilities:
//! - fs: File system operations (read, write, watch, etc.)
//! - process: Process management (spawn, monitor, kill)
//! - clipboard: Clipboard operations (copy, paste)
//! - notification: Desktop notifications
//! - system: System information (OS, hardware, network, battery)
//! - settings: Persistent configuration storage
//! - task_queue: Background job processing

const std = @import("std");

// Import all utilities
pub const fs = @import("fs.zig");
pub const process = @import("process.zig");
pub const clipboard = @import("clipboard.zig");
pub const notification = @import("notification.zig");
pub const system = @import("system.zig");
pub const settings = @import("settings.zig");
pub const task_queue = @import("task_queue.zig");

// Re-export commonly used types for convenience
pub const FileInfo = fs.FileInfo;
pub const Process = process.Process;
pub const ProcessManager = process.ProcessManager;
pub const Clipboard = clipboard.Clipboard;
pub const Notification = notification.Notification;
pub const NotificationManager = notification.NotificationManager;
pub const OsInfo = system.OsInfo;
pub const CpuInfo = system.CpuInfo;
pub const MemoryInfo = system.MemoryInfo;
pub const DiskInfo = system.DiskInfo;
pub const SettingsManager = settings.SettingsManager;
pub const TaskQueue = task_queue.TaskQueue;
pub const Task = task_queue.Task;

// ============================================================================
// Utility Manager
// Provides a unified interface to access all utilities
// ============================================================================

pub const UtilityManager = struct {
    allocator: std.mem.Allocator,
    _clipboard: ?clipboard.Clipboard = null,
    _notifications: ?notification.NotificationManager = null,
    _settings: ?settings.SettingsManager = null,
    _task_queue: ?task_queue.TaskQueue = null,
    _process_manager: ?process.ProcessManager = null,

    const Self = @This();

    pub fn init(allocator: std.mem.Allocator) Self {
        return Self{
            .allocator = allocator,
        };
    }

    pub fn deinit(self: *Self) void {
        if (self._clipboard) |*c| c.deinit();
        if (self._notifications) |*n| n.deinit();
        if (self._settings) |*s| s.deinit();
        if (self._task_queue) |*t| t.deinit();
        if (self._process_manager) |*p| p.deinit();
    }

    // Clipboard access
    pub fn clipboard(self: *Self) !*clipboard.Clipboard {
        if (self._clipboard == null) {
            self._clipboard = try clipboard.Clipboard.init(self.allocator);
        }
        return &self._clipboard.?;
    }

    // Notification access
    pub fn notifications(self: *Self) !*notification.NotificationManager {
        if (self._notifications == null) {
            self._notifications = try notification.NotificationManager.init(self.allocator);
        }
        return &self._notifications.?;
    }

    // Settings access
    pub fn settings(self: *Self, app_name: []const u8) !*settings.SettingsManager {
        if (self._settings == null) {
            self._settings = try settings.SettingsManager.init(self.allocator, app_name);
        }
        return &self._settings.?;
    }

    // Task queue access
    pub fn taskQueue(self: *Self, config: task_queue.TaskQueueConfig) !*task_queue.TaskQueue {
        if (self._task_queue == null) {
            var queue = task_queue.TaskQueue.init(self.allocator, config);
            try queue.start();
            self._task_queue = queue;
        }
        return &self._task_queue.?;
    }

    // Process manager access
    pub fn processManager(self: *Self) !*process.ProcessManager {
        if (self._process_manager == null) {
            self._process_manager = process.ProcessManager.init(self.allocator);
        }
        return &self._process_manager.?;
    }

    // Quick access to system info
    pub fn getOsInfo(self: *Self) !system.OsInfo {
        return system.getOsInfo(self.allocator);
    }

    pub fn getCpuInfo(self: *Self) !system.CpuInfo {
        return system.getCpuInfo(self.allocator);
    }

    pub fn getMemoryInfo(self: *Self) !system.MemoryInfo {
        return system.getMemoryInfo();
    }

    pub fn getDiskInfo(self: *Self, path: []const u8) !system.DiskInfo {
        return system.getDiskInfo(self.allocator, path);
    }
};

// ============================================================================
// Convenience Functions
// ============================================================================

/// Copy text to clipboard
pub fn copyToClipboard(text: []const u8) !void {
    try clipboard.copyText(text);
}

/// Paste text from clipboard
pub fn pasteFromClipboard(allocator: std.mem.Allocator) ![]const u8 {
    return try clipboard.pasteText(allocator);
}

/// Send a desktop notification
pub fn sendNotification(app_name: []const u8, title: []const u8, body: []const u8) !void {
    try notification.send(app_name, title, body);
}

/// Get system memory info
pub fn getMemory() !system.MemoryInfo {
    return system.getMemoryInfo();
}

/// Get disk info for a path
pub fn getDisk(allocator: std.mem.Allocator, path: []const u8) !system.DiskInfo {
    return system.getDiskInfo(allocator, path);
}

/// Read a file
pub fn readFile(allocator: std.mem.Allocator, path: []const u8) ![]const u8 {
    return fs.readFile(allocator, path);
}

/// Write a file
pub fn writeFile(path: []const u8, content: []const u8) !void {
    try fs.writeFile(path, content);
}

/// Check if file exists
pub fn fileExists(path: []const u8) bool {
    return fs.fileExists(path);
}

/// Run a command and get output
pub fn runCommand(allocator: std.mem.Allocator, argv: []const []const u8) !struct { []const u8, []const u8 } {
    return try process.runWithOutput(allocator, argv);
}

// ============================================================================
// Tests
// ============================================================================

const testing = std.testing;

test "Utils - UtilityManager init" {
    var manager = UtilityManager.init(testing.allocator);
    defer manager.deinit();
}

test "Utils - UtilityManager clipboard" {
    var manager = UtilityManager.init(testing.allocator);
    defer manager.deinit();

    _ = manager.clipboard() catch |err| {
        if (err == clipboard.ClipboardError.Unavailable) return;
        return err;
    };
}

test "Utils - UtilityManager notifications" {
    var manager = UtilityManager.init(testing.allocator);
    defer manager.deinit();

    _ = manager.notifications() catch |err| {
        if (err == notification.NotificationError.Unavailable) return;
        return err;
    };
}

test "Utils - UtilityManager settings" {
    var manager = UtilityManager.init(testing.allocator);
    defer manager.deinit();

    const settings = try manager.settings("TestApp");
    try settings.setString("key", "value");
    try testing.expectEqualStrings("value", settings.getString("key", "default"));
}

test "Utils - UtilityManager task queue" {
    var manager = UtilityManager.init(testing.allocator);
    defer manager.deinit();

    const queue = try manager.taskQueue(.{ .max_workers = 2 });
    defer queue.deinit();
}

test "Utils - UtilityManager process manager" {
    var manager = UtilityManager.init(testing.allocator);
    defer manager.deinit();

    _ = try manager.processManager();
}

test "Utils - UtilityManager system info" {
    var manager = UtilityManager.init(testing.allocator);
    defer manager.deinit();

    const os_info = try manager.getOsInfo();
    defer os_info.deinit(manager.allocator);
    try testing.expect(os_info.os_type != .unknown);

    const cpu_info = try manager.getCpuInfo();
    defer cpu_info.deinit(manager.allocator);
    try testing.expect(cpu_info.cores > 0);

    const mem_info = try manager.getMemoryInfo();
    try testing.expect(mem_info.total_bytes > 0);
}

test "Utils - Convenience functions" {
    // File operations
    try writeFile("test_utils.txt", "Hello");
    defer fs.deleteFile("test_utils.txt") catch {};
    try testing.expect(fileExists("test_utils.txt"));

    const content = try readFile(testing.allocator, "test_utils.txt");
    defer testing.allocator.free(content);
    try testing.expectEqualStrings("Hello", content);
}

test "Utils - Copy to clipboard (may fail in headless env)" {
    copyToClipboard("Test") catch |err| {
        if (err == clipboard.ClipboardError.Unavailable) return;
        return err;
    };
}

test "Utils - Send notification (may fail in headless env)" {
    sendNotification("Test", "Hello", "World") catch |err| {
        if (err == notification.NotificationError.Unavailable) return;
        return err;
    };
}

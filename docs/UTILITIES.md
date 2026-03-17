# Desktop Application Utilities

A comprehensive collection of utilities for common desktop application tasks in the Zig backend.

## Overview

The utilities module provides ready-to-use functionality for:

- **File System** - File operations, directory management, file watching
- **Process Management** - Spawn, monitor, and control child processes
- **Clipboard** - Copy/paste text and other content types
- **Notifications** - Desktop notifications across platforms
- **System Info** - OS, hardware, memory, disk, network, and battery information
- **Settings** - Persistent configuration storage with validation
- **Task Queue** - Background job processing with priorities and retry

## Quick Start

```zig
const utils = @import("utils");

// Use utilities directly
try utils.writeFile("test.txt", "Hello, World!");
const content = try utils.readFile(allocator, "test.txt");

// Or use the UtilityManager for stateful operations
var manager = utils.UtilityManager.init(allocator);
defer manager.deinit();

// Access clipboard
try manager.clipboard().setText("Copied text");

// Send notification
try manager.notifications().send(&.{
    .app_name = "My App",
    .title = "Hello",
    .body = "World",
});

// Load settings
const settings = try manager.settings("MyApp");
try settings.setString("theme", "dark");
```

## Module Details

### 1. File System (`utils.fs`)

File and directory operations with watching capabilities.

```zig
const fs = utils.fs;

// Read/Write files
const content = try fs.readFile(allocator, "config.json");
try fs.writeFile("output.txt", "Hello");

// JSON files
const data = try fs.readJsonFile(allocator, "config.json", ConfigType);
try fs.writeJsonFile("config.json", config_data);

// Directory operations
try fs.createDir("my_folder/subfolder");
const files = try fs.listDir(allocator, ".");

// File information
const exists = fs.fileExists("file.txt");
const size = try fs.getFileSize("file.txt");

// Path utilities
const joined = try fs.joinPath(allocator, &.{ "home", "user", "file.txt" });
const parent = try fs.getParentDir(allocator, "/home/user/file.txt");
const ext = fs.getExtension("file.txt"); // ".txt"

// File watcher
var watcher = fs.FileWatcher.init(allocator, .{});
defer watcher.deinit();

try watcher.watch("/path/to/watch");
watcher.setCallback(onFileChange);
try watcher.start();
```

**Key Types:**
- `FileInfo` - File metadata
- `FileWatcher` - Directory/file monitoring
- `FileWatchEvent` - Watch events (created, modified, deleted)

**Error Handling:**
```zig
pub const FsError = error{
    FileNotFound,
    PermissionDenied,
    IsDir,
    NotDir,
    PathAlreadyExists,
    // ...
};
```

---

### 2. Process Management (`utils.process`)

Spawn and manage child processes.

```zig
const process = utils.process;

// Run command and get output
const result = try process.run(allocator, &.{ "/bin/ls", "-la" }, .{});
defer result.deinit(allocator);

if (result.success()) {
    std.debug.print("Output: {s}\n", .{result.stdout orelse ""});
}

// Simple output capture
const stdout, const stderr = try process.runWithOutput(allocator, &.{ "echo", "hello" });

// Process manager for long-running processes
var manager = process.ProcessManager.init(allocator);
defer manager.deinit();

// Spawn a process
const proc = try manager.spawn(&.{ "python", "script.py" }, .{
    .stdout_behavior = .pipe,
    .stderr_behavior = .pipe,
});

// Monitor process
if (proc.isRunning()) {
    std.debug.print("Process running with PID: {d}\n", .{proc.getPid()});
}

// Kill process
try manager.kill(proc.getPid());

// Kill all managed processes
manager.killAll();
```

**Key Types:**
- `Process` - Single process handle
- `ProcessManager` - Manages multiple processes
- `ProcessConfig` - Process configuration
- `ProcessResult` - Execution result

**Process Configuration:**
```zig
const config = process.ProcessConfig{
    .cwd = "/working/directory",
    .env = &.{ "PATH=/usr/bin", "HOME=/home/user" },
    .stdin_behavior = .pipe,    // .inherit, .pipe, .ignore, .null
    .stdout_behavior = .pipe,
    .stderr_behavior = .pipe,
    .max_output_size = 1024 * 1024, // 1MB
};
```

---

### 3. Clipboard (`utils.clipboard`)

Cross-platform clipboard operations.

```zig
const clipboard = utils.clipboard;

// Simple copy/paste
try clipboard.copyText("Text to copy");
const text = try clipboard.pasteText(allocator);
defer allocator.free(text);

// Full clipboard manager
var cb = try clipboard.Clipboard.init(allocator);
defer cb.deinit();

// Set text
try cb.setText("Hello, Clipboard!");

// Get text
if (try cb.hasText()) {
    const text = try cb.getText();
    defer allocator.free(text);
    std.debug.print("Clipboard: {s}\n", .{text});
}

// HTML content (platform-dependent)
const html = clipboard.HtmlContent{
    .html = "<html><body><b>Bold</b></body></html>",
    .fragment = "<b>Bold</b>",
};
try cb.setHtml(html);
```

**Key Types:**
- `Clipboard` - Main clipboard interface
- `ContentType` - text, html, rtf, image, files
- `ClipboardContent` - Union of content types
- `HtmlContent` - HTML with fragment

**Platform Support:**
- **Linux**: Uses xclip/xsel (X11/Wayland)
- **macOS**: Uses pbpaste/pbcopy
- **Windows**: Windows Clipboard API

---

### 4. Notifications (`utils.notification`)

Desktop notifications with actions and urgency levels.

```zig
const notification = utils.notification;

// Simple notification
try notification.send("My App", "Title", "Body text");

// With icon
try notification.sendWithIcon("My App", "Title", "Body", "icon.png");

// Critical notification
try notification.sendCritical("My App", "Alert!", "Something important");

// Full notification manager
var manager = try notification.NotificationManager.init(allocator);
defer manager.deinit();

// Create notification
var notif = notification.Notification.init("My App", "Download Complete", "File ready");
notif.withIcon("download.png")
    .withUrgency(.normal)
    .withTimeout(5000);

// Add actions
const actions = &.{
    .{ .id = "open", .label = "Open" },
    .{ .id = "dismiss", .label = "Dismiss" },
};
notif.withActions(actions);

// Send and get ID
const id = try manager.send(&notif);

// Set callback for action handling
try manager.setCallback(id, onNotificationAction);

// Close notification
try manager.close(id);
```

**Key Types:**
- `Notification` - Notification definition
- `NotificationManager` - Manages notifications
- `Urgency` - low, normal, critical
- `NotificationResult` - Action/dismissal result

**Urgency Levels:**
```zig
pub const Urgency = enum {
    low,      // Minimal attention
    normal,   // Standard notification
    critical, // Requires immediate attention
};
```

---

### 5. System Info (`utils.system`)

System information across platforms.

```zig
const system = utils.system;

// OS Information
var os_info = try system.getOsInfo(allocator);
defer os_info.deinit(allocator);

std.debug.print("OS: {s} {s}\n", .{ os_info.name, os_info.version });
std.debug.print("Arch: {s}\n", .{os_info.arch});
std.debug.print("Hostname: {s}\n", .{os_info.hostname});

// CPU Information
var cpu_info = try system.getCpuInfo(allocator);
defer cpu_info.deinit(allocator);

std.debug.print("CPU: {s} ({d} cores, {d} threads)\n", .{
    cpu_info.model, cpu_info.cores, cpu_info.threads,
});

// Memory Information
const mem_info = try system.getMemoryInfo();
std.debug.print("Memory: {d}MB / {d}MB ({d:.1}% used)\n", .{
    mem_info.used_bytes / 1024 / 1024,
    mem_info.total_bytes / 1024 / 1024,
    mem_info.percent_used,
});

// Disk Information
var disk_info = try system.getDiskInfo(allocator, "/");
defer disk_info.deinit(allocator);

std.debug.print("Disk: {d}GB free of {d}GB\n", .{
    disk_info.free_bytes / 1024 / 1024 / 1024,
    disk_info.total_bytes / 1024 / 1024 / 1024,
});

// Battery Information
if (try system.getBatteryInfo()) |battery| {
    std.debug.print("Battery: {d:.1}% ({s})\n", .{
        battery.percent,
        @tagName(battery.status),
    });
}

// System uptime
const uptime = system.getUptimeSeconds();
std.debug.print("Uptime: {d} hours\n", .{uptime / 3600});
```

**Key Types:**
- `OsInfo` - Operating system details
- `CpuInfo` - CPU information
- `MemoryInfo` - RAM usage
- `DiskInfo` - Disk space
- `BatteryInfo` - Battery status
- `NetworkInterface` - Network details

---

### 6. Settings (`utils.settings`)

Persistent configuration with validation.

```zig
const settings = utils.settings;

// Create settings manager
var manager = try settings.SettingsManager.init(allocator, "MyApp");
defer manager.deinit();

// Load existing settings
try manager.load();

// Basic operations
try manager.setString("theme", "dark");
try manager.setInt("volume", 80);
try manager.setFloat("brightness", 0.75);
try manager.setBool("notifications", true);

// Get values with defaults
const theme = manager.getString("theme", "light");
const volume = manager.getInt("volume", 50);
const brightness = manager.getFloat("brightness", 0.5);
const notifications = manager.getBool("notifications", false);

// Check and remove
if (manager.has("old_key")) {
    manager.remove("old_key");
}

// Save to disk
try manager.save();

// Export/Import
try manager.exportToJson("backup.json");
try manager.importFromJson("backup.json");

// Schema validation
const schema = settings.SettingsSchema{
    .version = 1,
    .fields = &.{
        .{
            .name = "volume",
            .field_type = .int,
            .required = true,
            .min = 0,
            .max = 100,
        },
        .{
            .name = "theme",
            .field_type = .string,
            .required = false,
            .default = .{ .string = "light" },
        },
    },
};
manager.setSchema(schema);
```

**Key Types:**
- `SettingsManager` - Main settings interface
- `SettingsSchema` - Validation schema
- `SchemaField` - Field definition
- `SettingValue` - Union of value types

**Settings File Location:**
- **Linux**: `~/.config/<app_name>/settings.json`
- **macOS**: `~/.config/<app_name>/settings.json`
- **Windows**: `%APPDATA%\<app_name>\settings.json`

---

### 7. Task Queue (`utils.task_queue`)

Background job processing with priorities.

```zig
const task_queue = utils.task_queue;

// Create and start queue
var queue = task_queue.TaskQueue.init(allocator, .{
    .max_workers = 4,
    .max_queue_size = 100,
});
defer queue.deinit();

try queue.start();
defer queue.stop();

// Define task executor
fn myTaskExecutor(task: *task_queue.Task, ctx: ?*anyopaque) task_queue.TaskError!?[]const u8 {
    _ = ctx;
    
    // Check for cancellation
    if (task.isCancelled()) {
        return task_queue.TaskError.TaskCancelled;
    }
    
    // Update progress
    task.setProgress(0.5);
    
    // Do work...
    
    task.setProgress(1.0);
    return "Result data";
}

// Submit task
const task = try queue.submit("My Task", myTaskExecutor, null);

// Submit with priority
const urgent_task = try queue.submitWithPriority(
    "Urgent Task",
    myTaskExecutor,
    null,
    .urgent, // .low, .normal, .high, .urgent
);

// Monitor progress
const status = queue.getTaskStatus(task.id);
const progress = queue.getTaskProgress(task.id);

// Wait for completion
const result = try queue.waitForTask(task.id, 5000); // 5 second timeout

if (result) |r| {
    switch (r.status) {
        .completed => std.debug.print("Done: {s}\n", .{r.result orelse ""}),
        .failed => std.debug.print("Failed: {s}\n", .{r.error_msg orelse ""}),
        .cancelled => std.debug.print("Cancelled\n", .{}),
        else => {},
    }
}

// Cancel task
const cancelled = queue.cancelTask(task.id);

// Get statistics
const stats = queue.getStats();
std.debug.print("Submitted: {d}, Completed: {d}, Failed: {d}\n", .{
    stats.total_submitted,
    stats.total_completed,
    stats.total_failed,
});
```

**Key Types:**
- `TaskQueue` - Main queue manager
- `Task` - Task definition
- `TaskPriority` - low, normal, high, urgent
- `TaskStatus` - pending, running, completed, failed, cancelled

**Task Features:**
- Priority-based scheduling
- Progress tracking (0.0 - 1.0)
- Cancellation support
- Retry on failure
- Timeout support
- Completion callbacks

---

## UtilityManager

Unified access to all utilities:

```zig
var manager = utils.UtilityManager.init(allocator);
defer manager.deinit();

// Lazy initialization - created on first access
const cb = try manager.clipboard();
const notif = try manager.notifications();
const settings = try manager.settings("MyApp");
const queue = try manager.taskQueue(.{ .max_workers = 4 });
const proc_mgr = try manager.processManager();

// System info shortcuts
const os_info = try manager.getOsInfo();
const cpu_info = try manager.getCpuInfo();
const mem_info = try manager.getMemoryInfo();
const disk_info = try manager.getDiskInfo("/");
```

---

## Convenience Functions

Quick access without managers:

```zig
// Clipboard
try utils.copyToClipboard("text");
const text = try utils.pasteFromClipboard(allocator);

// Notifications
try utils.sendNotification("App", "Title", "Body");

// System Info
const mem = try utils.getMemory();
const disk = try utils.getDisk(allocator, "/");

// File operations
try utils.writeFile("file.txt", "content");
const content = try utils.readFile(allocator, "file.txt");
const exists = utils.fileExists("file.txt");

// Process
const out, const err = try utils.runCommand(allocator, &.{ "ls", "-la" });
```

---

## Error Handling

Each module has its own error set:

```zig
// Common pattern
doSomething() catch |err| {
    switch (err) {
        error.FileNotFound => { /* handle */ },
        error.PermissionDenied => { /* handle */ },
        error.Unavailable => { /* feature not available on this platform */ },
        else => { /* generic error */ },
    }
};
```

**Module Error Sets:**
- `fs.FsError` - File system errors
- `process.ProcessError` - Process errors
- `clipboard.ClipboardError` - Clipboard errors
- `notification.NotificationError` - Notification errors
- `system.SystemInfoError` - System info errors
- `settings.SettingsError` - Settings errors
- `task_queue.TaskError` - Task queue errors

---

## Platform Support

| Feature | Linux | macOS | Windows |
|---------|-------|-------|---------|
| File System | ✅ | ✅ | ✅ |
| Process | ✅ | ✅ | ✅ |
| Clipboard | ✅ (xclip/xsel) | ✅ (pbcopy) | ⚠️ (API stub) |
| Notifications | ✅ (notify-send) | ✅ (osascript) | ⚠️ (PowerShell) |
| System Info | ✅ | ✅ | ⚠️ (partial) |
| Settings | ✅ | ✅ | ✅ |
| Task Queue | ✅ | ✅ | ✅ |

✅ = Full support
⚠️ = Partial/limited support

---

## Best Practices

1. **Resource Management**: Always call `deinit()` on allocated resources
2. **Error Handling**: Check for `Unavailable` errors on platform-specific features
3. **Settings**: Call `save()` before application exit
4. **Task Queue**: Stop queue before destroying to avoid hanging
5. **File Watchers**: Use in separate threads to avoid blocking
6. **Process Manager**: Always clean up with `killAll()` on exit

---

## Examples

See the test cases in each module for complete working examples:
- `src/utils/fs.zig` - File system tests
- `src/utils/process.zig` - Process management tests
- `src/utils/clipboard.zig` - Clipboard tests
- `src/utils/notification.zig` - Notification tests
- `src/utils/system.zig` - System info tests
- `src/utils/settings.zig` - Settings tests
- `src/utils/task_queue.zig` - Task queue tests
- `src/utils/utils.zig` - Integration tests

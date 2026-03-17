# Desktop Application Utilities

This document describes the utility modules for the Zig backend.

## Overview

The utilities module provides:

| Module | File | Purpose |
|--------|------|---------|
| File System | `utils/fs.zig` | File operations, directory management |
| Process | `utils/process.zig` | Spawn and control processes |
| Clipboard | `utils/clipboard.zig` | Copy/paste operations |
| Notification | `utils/notification.zig` | Desktop notifications |
| Settings | `utils/settings.zig` | Persistent configuration |
| System | `utils/system.zig` | OS, CPU, memory, disk info |
| Task Queue | `utils/task_queue.zig` | Background job processing |

## 1. File System (`utils/fs.zig`)

### Basic Operations

```zig
const fs = @import("utils/fs.zig");

// Read file
const content = try fs.readFile(allocator, "file.txt");

// Write file
try fs.writeFile("output.txt", "Hello");

// Check exists
const exists = fs.fileExists("file.txt");

// Get size
const size = try fs.getFileSize("file.txt");
```

### Directory Operations

```zig
// Create directory
try fs.createDir("folder/subfolder");

// List directory
const files = try fs.listDir(allocator, ".");

// Delete
try fs.deleteFile("file.txt");
try fs.deleteDir("folder");
```

### Path Utilities

```zig
const path = try fs.joinPath(allocator, &.{ "home", "user", "file.txt" });
const parent = try fs.getParentDir(allocator, "/home/user/file.txt");
const ext = fs.getExtension("file.txt"); // ".txt"
```

### Error Types

```zig
pub const FsError = error{
    FileNotFound,
    PermissionDenied,
    IsDir,
    NotDir,
    PathAlreadyExists,
    ReadFailed,
    WriteFailed,
    // ...
};
```

---

## 2. Process Management (`utils/process.zig`)

### Run Command

```zig
const process = @import("utils/process.zig");

const result = try process.run(allocator, &.{ "/bin/ls", "-la" }, .{});
defer result.deinit(allocator);

if (result.success()) {
    std.debug.print("Output: {s}\n", .{result.stdout});
}
```

### Process Manager

```zig
var manager = process.ProcessManager.init(allocator);
defer manager.deinit();

const proc = try manager.spawn(&.{ "python", "script.py" }, .{
    .stdout_behavior = .pipe,
    .stderr_behavior = .pipe,
});

if (proc.isRunning()) {
    try manager.kill(proc.getPid());
}
```

### Configuration

```zig
const config = process.ProcessConfig{
    .cwd = "/working/dir",
    .stdin_behavior = .inherit,
    .stdout_behavior = .pipe,
    .stderr_behavior = .pipe,
};
```

---

## 3. Clipboard (`utils/clipboard.zig`)

### Simple Operations

```zig
const clipboard = @import("utils/clipboard.zig");

// Copy text
var cb = try clipboard.Clipboard.init(allocator);
defer cb.deinit();

try cb.setText("Hello, Clipboard!");
const text = try cb.getText();
const has_text = try cb.hasText();
```

---

## 4. Notifications (`utils/notification.zig`)

### Send Notification

```zig
const notification = @import("utils/notification.zig");

var manager = try notification.NotificationManager.init(allocator);
defer manager.deinit();

var notif = notification.Notification.init("MyApp", "Title", "Body");
notif.withUrgency(.normal);

const id = try manager.send(&notif);
```

---

## 5. Settings (`utils/settings.zig`)

### Persistent Configuration

```zig
const settings = @import("utils/settings.zig");

var manager = try settings.SettingsManager.init(allocator, "MyApp");
defer manager.deinit();

try manager.setString("theme", "dark");
try manager.setInt("volume", 80);

const theme = manager.getString("theme", "light");
const volume = manager.getInt("volume", 50);

try manager.save();
```

---

## 6. System Info (`utils/system.zig`)

### Get System Information

```zig
const system = @import("utils/system.zig");

// OS Info
const os_info = try system.getOsInfo(allocator);

// CPU Info
const cpu_info = try system.getCpuInfo(allocator);

// Memory
const mem_info = try system.getMemoryInfo();

// Disk
const disk_info = try system.getDiskInfo(allocator, "/");
```

---

## 7. Task Queue (`utils/task_queue.zig`)

### Background Jobs

```zig
const task_queue = @import("utils/task_queue.zig");

var queue = task_queue.TaskQueue.init(allocator, .{
    .max_workers = 4,
});
defer queue.deinit();

try queue.start();

// Submit task
const task = try queue.submit("myTask", executor, null);

// Wait for result
const result = try queue.waitForTask(task.id, 5000);
```

---

## Platform Support

| Feature | Linux | macOS | Windows |
|---------|-------|-------|---------|
| File System | ✅ | ✅ | ✅ |
| Process | ✅ | ✅ | ✅ |
| Clipboard | ✅ | ✅ | ⚠️ |
| Notifications | ✅ | ✅ | ⚠️ |
| Settings | ✅ | ✅ | ✅ |

✅ = Full support  
⚠️ = Partial/limited

## Error Handling Pattern

```zig
const result = someOperation();
switch (result) {
    .ok => |value| { /* use value */ },
    .err => |err| {
        switch (err) {
            error.FileNotFound => { /* handle */ },
            error.PermissionDenied => { /* handle */ },
            else => { /* handle */ },
        }
    },
}
```

## Best Practices

1. Always call `deinit()` on managers
2. Check for `Unavailable` errors on platform-specific features
3. Use defer for cleanup
4. Handle errors explicitly

## Related Documentation

- [Backend Architecture](02-backend-architecture.md)
- [Dependency Injection](05-dependency-injection.md)

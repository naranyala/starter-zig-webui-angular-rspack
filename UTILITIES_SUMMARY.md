# Desktop Utilities Summary

A comprehensive suite of utilities for common desktop application tasks in the Zig backend.

## Created Utilities

### 1. **File System** (`src/utils/fs.zig`)
- Read/write files (text and JSON)
- Directory operations (create, delete, list)
- File watching with callbacks
- Path utilities (join, split, extension)
- Temporary file handling

### 2. **Process Management** (`src/utils/process.zig`)
- Spawn and monitor child processes
- Process manager for multiple processes
- Stdout/stderr capture
- Process kill and cleanup
- Command existence checking

### 3. **Clipboard** (`src/utils/clipboard.zig`)
- Cross-platform text copy/paste
- HTML content support
- Platform-specific implementations (Linux xclip/xsel, macOS pbcopy, Windows API)

### 4. **Notifications** (`src/utils/notification.zig`)
- Desktop notifications
- Urgency levels (low, normal, critical)
- Action buttons
- Timeout support
- Platform support (notify-send, osascript, Windows Toast)

### 5. **System Info** (`src/utils/system.zig`)
- OS information (name, version, arch, hostname)
- CPU details (model, cores, frequency)
- Memory usage
- Disk space
- Battery status
- Network interfaces
- System uptime

### 6. **Settings** (`src/utils/settings.zig`)
- JSON-based persistent storage
- Schema validation
- Type-safe getters/setters
- Export/import functionality
- Auto-save on change

### 7. **Task Queue** (`src/utils/task_queue.zig`)
- Background job processing
- Priority-based scheduling
- Progress tracking
- Task cancellation
- Retry on failure
- Completion callbacks
- Multi-threaded workers

### 8. **Utility Manager** (`src/utils/utils.zig`)
- Unified interface to all utilities
- Lazy initialization
- Convenience functions

## Usage Example

```zig
const utils = @import("utils");

// Quick operations
try utils.writeFile("test.txt", "Hello");
const content = try utils.readFile(allocator, "test.txt");

// Utility Manager for stateful operations
var manager = utils.UtilityManager.init(allocator);
defer manager.deinit();

// Clipboard
try manager.clipboard().setText("Copied!");

// Notifications
try manager.notifications().send(&.{
    .app_name = "My App",
    .title = "Hello",
    .body = "World",
});

// Settings
const settings = try manager.settings("MyApp");
try settings.setString("theme", "dark");

// Task Queue
const queue = try manager.taskQueue(.{ .max_workers = 4 });
```

## Files Created

```
src/utils/
├── utils.zig          # Main module + UtilityManager
├── fs.zig             # File system utilities
├── process.zig        # Process management
├── clipboard.zig      # Clipboard operations
├── notification.zig   # Desktop notifications
├── system.zig         # System information
├── settings.zig       # Settings/preferences
└── task_queue.zig     # Background task processing

docs/
└── UTILITIES.md       # Comprehensive documentation
```

## Build & Test

```bash
# Build
zig build

# Run tests
zig build test
```

## Documentation

See [docs/UTILITIES.md](docs/UTILITIES.md) for complete documentation with examples.

## Platform Support

| Utility | Linux | macOS | Windows |
|---------|-------|-------|---------|
| File System | ✅ | ✅ | ✅ |
| Process | ✅ | ✅ | ✅ |
| Clipboard | ✅ | ✅ | ⚠️ |
| Notifications | ✅ | ✅ | ⚠️ |
| System Info | ✅ | ✅ | ⚠️ |
| Settings | ✅ | ✅ | ✅ |
| Task Queue | ✅ | ✅ | ✅ |

✅ = Full support | ⚠️ = Partial support

## Key Features

- **Cross-platform**: Works on Linux, macOS, and Windows
- **Type-safe**: Zig's strong typing prevents errors
- **Well-tested**: Each module includes comprehensive tests
- **Documented**: Full API documentation with examples
- **Modular**: Use individual utilities or the unified manager
- **Efficient**: Minimal dependencies, optimized for performance

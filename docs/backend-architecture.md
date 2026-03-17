# Backend Architecture

This document describes the Zig backend application structure and architecture.

## Overview

The backend is built with:

- **Language**: Zig 0.14.1
- **Window Library**: WebUI 2.5.0
- **Build System**: Zig build system
- **Communication**: WebUI WebSocket bridge

## Project Structure

```
src/
├── main.zig                    # Application entry point
├── di.zig                      # Dependency injection system
└── communication/              # Communication protocols
    └── websocket_server.zig    # Pure WebSocket server
```

## Application Entry Point

The main application entry point is in `src/main.zig`.

```zig
const std = @import("std");
const webui = @import("webui");
const di = @import("di.zig");

pub fn main() !void {
    const stdout = std.io.getStdOut().writer();
    
    // Print startup info
    try stdout.print("Starting Zig WebUI Angular Rspack Server...\n", .{});
    
    // Bootstrap dependency injection
    const injector = di.bootstrap();
    defer injector.destroy();
    
    // Get services
    const logger = injector.logger;
    const window_service = injector.window;
    
    // Create window
    const window = webui.newWindow();
    window_service.setWindow(window);
    
    // Set window properties
    webui.setSize(window, 1280, 800);
    webui.setResizable(window, true);
    
    // Bind backend functions
    _ = webui.bind(window, "ping", handlePing);
    _ = webui.bind(window, "getData", handleGetData);
    
    // Show window
    const shown = webui.showBrowser(window, frontend_path, .Chromium);
    
    // Wait for window close
    webui.wait();
}
```

## Dependency Injection

The backend uses a simple dependency injection system.

### Bootstrap

```zig
const injector = di.bootstrap();
defer injector.destroy();
```

### Available Services

| Service | Purpose |
|---------|---------|
| logger | Application logging |
| config | Configuration management |
| window | Window management |
| events | Event handler registration |
| api | API call tracking |

### Usage Example

```zig
const logger = injector.logger;
logger.info("Application starting...");

const config = injector.config;
const app_name = config.get("app.name", "Default");
```

See [Dependency Injection](dependency-injection.md) for details.

## WebUI Integration

### Window Creation

```zig
const window = webui.newWindow();
```

### Window Properties

```zig
// Set size
webui.setSize(window, 1280, 800);

// Set resizable
webui.setResizable(window, true);

// Set position
webui.setPosition(window, 100, 100);

// Set title (via HTML)
webui.run(window, "document.title = 'My App'");
```

### Function Binding

Bind Zig functions to be callable from frontend:

```zig
_ = webui.bind(window, "functionName", handlerFunction);

fn handlerFunction(event: ?*webui.Event) callconv(.C) void {
    if (event) |e| {
        // Get element ID
        const element_id = e.getElementId();
        
        // Get window reference
        const win = e.getWindow();
        
        // Send response
        webui.run(win, "{\"success\":true}");
    }
}
```

### Sending Data to Frontend

```zig
// JSON response
webui.run(window, "{\"success\":true,\"data\":{\"key\":\"value\"}}");

// Execute JavaScript
webui.run(window, "console.log('Hello from Zig')");

// Update DOM
webui.run(window, "document.getElementById('status').innerText = 'Ready'");
```

## Event Handling

### Event Structure

```zig
pub const Event = struct {
    ptr: [*c]c.webui_event_t,
    
    pub fn getWindow(self: *const Event) usize;
    pub fn getEventType(self: *const Event) EventType;
    pub fn getElementId(self: *const Event) []const u8;
    pub fn getBindId(self: *const Event) usize;
    pub fn getClientId(self: *const Event) usize;
};
```

### Event Types

| Type | Value | Description |
|------|-------|-------------|
| Disconnected | 0 | Client disconnected |
| Connected | 1 | Client connected |
| MouseClick | 2 | Element clicked |
| Navigation | 3 | Navigation event |
| Callback | 4 | Function callback |

### Handler Pattern

```zig
fn handleClick(event: ?*webui.Event) callconv(.C) void {
    if (event) |e| {
        const element = e.getElementId();
        const window_id = e.getWindow();
        
        std.debug.print("Clicked: {s}\n", .{element});
        
        // Send response
        webui.run(window_id, "{\"success\":true}");
    }
}
```

## File Serving

### Set Root Folder

```zig
const success = webui.setRootFolder(window, frontend_path);
if (!success) {
    std.debug.print("Failed to set root folder\n", .{});
}
```

### Serve Files

WebUI automatically serves files from the root folder:

```
Request: /index.html
Serves:  frontend/dist/browser/index.html

Request: /main.abc123.js
Serves:  frontend/dist/browser/main.abc123.js
```

## Communication Patterns

### Request/Response

```zig
// Backend handler
fn handleGetData(event: ?*webui.Event) callconv(.C) void {
    if (event) |e| {
        const response = 
            \\{"success":true,"data":{"items":[1,2,3]}}
        ;
        webui.run(e.getWindow(), response);
    }
}
```

### Event Broadcasting

```zig
// Send event to all connected clients
webui.broadcast(window, event_name, data);
```

### JavaScript Execution

```zig
// Execute JavaScript in browser
webui.run(window, "alert('Hello from Zig')");
```

## Error Handling

### Error Types

```zig
const DIError = error{
    NoProvider,
    InjectorDestroyed,
};

const AppError = error{
    WindowCreationFailed,
    BrowserNotFound,
    FileNotFound,
};
```

### Error Handling Pattern

```zig
pub fn main() !void {
    // Return errors up the call stack
    const injector = di.bootstrap() catch |err| {
        std.debug.print("DI failed: {}\n", .{err});
        return err;
    };
    defer injector.destroy();
    
    // Handle specific errors
    webui.showBrowser(window, path, .Chromium) catch |err| {
        std.debug.print("Browser failed: {}\n", .{err});
        // Fallback handling
    };
}
```

## Logging

### Using LoggerService

```zig
const logger = injector.logger;

logger.info("Information message");
logger.debug("Debug message");
logger.warn("Warning message");
logger.err("Error message");
```

### Direct Debug Printing

```zig
std.debug.print("Value: {d}\n", .{value});
std.debug.print("String: {s}\n", .{string});
std.debug.print("Error: {}\n", .{error});
```

## Memory Management

### Allocation

```zig
const allocator = std.heap.page_allocator;

// Allocate memory
const buffer = try allocator.alloc(u8, size);
defer allocator.free(buffer);

// Create instance
const instance = try allocator.create(MyStruct);
defer allocator.destroy(instance);
```

### String Handling

```zig
// Duplicate string
const dup = try allocator.dupe(u8, original);
defer allocator.free(dup);

// Join paths
const path = try std.fs.path.join(allocator, &.{ part1, part2 });
defer allocator.free(path);
```

## Testing

### Unit Tests

```zig
test "LoggerService logs messages" {
    const logger = LoggerService.create();
    logger.info("Test message");
    try testing.expectEqualStrings("[App]", logger.prefix);
}

test "ConfigService stores values" {
    const config = ConfigService.create();
    try config.set("key", "value");
    try testing.expectEqualStrings("value", config.get("key", "default"));
}
```

### Running Tests

```bash
# Run all tests
zig build test

# Run specific test
zig test src/di.zig
```

## Build Configuration

### build.zig

```zig
const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});
    
    // WebUI library
    const webui_lib = b.addStaticLibrary(.{
        .name = "webui",
        .target = target,
        .optimize = optimize,
    });
    
    // Add WebUI sources
    webui_lib.addCSourceFile(.{
        .file = b.path("thirdparty/webui/src/webui.c"),
        .flags = &.{
            "-DNO_CACHING",
            "-DUSE_WEBSOCKET",
        },
    });
    
    // Main executable
    const exe = b.addExecutable(.{
        .name = "zig_webui_angular_rspack",
        .root_module = exe_mod,
    });
    
    exe.linkLibrary(webui_lib);
    b.installArtifact(exe);
}
```

### Compiler Flags

| Flag | Purpose |
|------|---------|
| -DNO_CACHING | Disable WebUI caching |
| -DUSE_WEBSOCKET | Enable WebSocket support |
| -DNO_SSL | Disable SSL (localhost only) |
| -DWEBUI_LOG | Enable debug logging |

## Performance Considerations

1. **Minimize Allocations**: Reuse buffers when possible
2. **String Views**: Use slices instead of duplicating strings
3. **Async Operations**: Use non-blocking operations for I/O
4. **Connection Pooling**: Reuse connections for multiple requests

## Security Considerations

1. **Localhost Only**: Bind to 127.0.0.1 only
2. **Input Validation**: Validate all frontend input
3. **Path Traversal**: Sanitize file paths
4. **Token Validation**: Verify WebUI connection tokens

## Related Documentation

- [Communication](communication.md)
- [Dependency Injection](dependency-injection.md)
- [Build System](build-system.md)
- [Frontend Architecture](frontend-architecture.md)

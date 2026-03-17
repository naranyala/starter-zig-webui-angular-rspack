# Backend Architecture

This document describes the Zig backend application structure.

## Overview

- **Language**: Zig 0.14.1
- **Window Library**: WebUI 2.5.0
- **Build System**: Zig build system

## Project Structure

```
src/
├── main.zig                    # Application entry point
├── di.zig                      # Dependency injection + EventBus
├── root.zig                    # Root package
├── communication/
│   └── websocket_server.zig    # Pure WebSocket server
└── utils/
    ├── fs.zig                  # File system operations
    ├── process.zig             # Process management
    ├── clipboard.zig           # Clipboard operations
    ├── notification.zig         # Desktop notifications
    ├── settings.zig            # Persistent settings
    ├── task_queue.zig          # Background tasks
    ├── system.zig              # System information
    └── utils.zig               # Utility helpers
```

## Entry Point

`src/main.zig`:

```zig
const std = @import("std");
const webui = @import("webui");
const di = @import("di.zig");

pub fn main() !void {
    // Bootstrap DI
    const injector = try di.bootstrap();
    defer injector.destroy();

    // Get services
    const logger = injector.getLogger();
    const window_service = injector.getWindow();

    // Create window
    const window = webui.newWindow();
    window_service.setWindow(window);

    // Bind functions (WebUI Bridge)
    _ = webui.bind(window, "ping", handlePing);

    // Show window
    _ = webui.showBrowser(window, frontend_path, .Chromium);

    webui.wait();
}
```

## Communication

The backend supports **3 communication approaches**:

### 1. WebUI Bridge (Primary)

Direct function binding - NO HTTP/HTTPS:

```zig
// Bind function
_ = webui.bind(window, "add", handleAdd);

// Handler
fn handleAdd(event: ?*webui.Event) callconv(.C) void {
    if (event) |e| {
        webui.run(e.getWindow(), "{\"success\":true,\"result\":3}");
    }
}
```

### 2. Pure WebSocket Server

For complex communication patterns:

```zig
// src/communication/websocket_server.zig
var server = try ws.WebSocketServer.init(allocator, .{
    .host = "127.0.0.1",
    .port = 8765,
});
try server.start();
```

### 3. Event Bus (Internal)

Application-wide pub/sub:

```zig
const bus = injector.getEventBus();
const sub_id = try bus.subscribe("app:started", handler);

var event = di.Event{
    .name = "app:started",
    .data = null,
    .source = null,
    .priority = .normal,
};
bus.emit(&event);
```

See [01-communication.md](../01-communication.md) for details.

## Dependency Injection

### Bootstrap

```zig
const injector = try di.bootstrap();
defer injector.destroy();
```

### Available Services

| Service | Methods |
|---------|---------|
| LoggerService | `info()`, `debug()`, `warn()`, `err()` |
| ConfigService | `get()`, `set()`, `has()`, `remove()` |
| WindowService | `setWindow()`, `getSize()`, `setTitle()`, etc. |
| EventService | `bind()`, `unbind()`, `hasHandler()` |
| BackendApiService | `registerHandler()`, `getCallCount()` |
| NotificationService | `send()`, `sendWithIcon()`, `setEnabled()` |
| ClipboardService | `setText()`, `getText()`, `hasText()`, `clear()` |
| StorageService | `getString()`, `setString()`, `getInt()`, `setInt()`, etc. |
| HttpService | `get()`, `post()`, `put()`, `delete()` |
| ProcessService | `spawn()`, `run()` |
| EventBus | `subscribe()`, `emit()`, `unsubscribe()` |

### Result Types (Errors as Values)

```zig
// Using tryGetXxx() functions
const result = di.tryGetLogger();
if (result.isOk()) {
    result.unwrap().info("Success");
} else {
    const err = result.unwrapErr();
}
```

## WebUI Integration

### Window Creation

```zig
const window = webui.newWindow();
```

### Window Properties

```zig
webui.setSize(window, 1280, 800);
webui.setResizable(window, true);
webui.setPosition(window, 100, 100);
```

### Function Binding

```zig
_ = webui.bind(window, "functionName", handler);

fn handler(event: ?*webui.Event) callconv(.C) void {
    if (event) |e| {
        webui.run(e.getWindow(), "{\"success\":true}");
    }
}
```

### Sending Data

```zig
webui.run(window, "{\"success\":true,\"data\":{}}");
webui.run(window, "console.log('Hello from Zig')");
```

## Event Bus

Pub/sub messaging system:

```zig
const event_bus = injector.getEventBus();

// Subscribe
const sub_id = try event_bus.subscribe("event:name", callback);

// Emit
var event = di.Event{
    .name = "event:name",
    .data = null,
    .source = null,
    .priority = .normal,
};
event_bus.emit(&event);

// Unsubscribe
event_bus.unsubscribe(sub_id);
```

### Predefined Events

```zig
di.AppEvents.AppStarted
di.AppEvents.AppStopping
di.AppEvents.WindowCreated
di.AppEvents.WindowClosed
di.AppEvents.ApiCalled
```

## Error Handling

### Error Types

```zig
pub const DIError = error{
    NoProvider,
    InjectorDestroyed,
    OutOfMemory,
    ServiceInitFailed,
    ServiceNotFound,
    EventNotFound,
};
```

### Error Handling Pattern

```zig
const result = di.tryGetLogger();
if (result.isErr()) {
    // Handle error
}
```

## Logging

```zig
const logger = injector.getLogger();
logger.info("Application started");
logger.debug("Debug info");
logger.warn("Warning");
logger.err("Error");
```

## Testing

```bash
zig build test
zig test src/di.zig
```

## Related Documentation

- [Communication](01-communication.md)
- [Dependency Injection](05-dependency-injection.md)
- [Build System](04-build-system.md)

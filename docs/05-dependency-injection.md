# Dependency Injection

This document describes the Zig backend dependency injection system.

## Overview

The DI system provides:
- Centralized service management
- Singleton service instances
- Type-safe service access
- Result types for error handling ("errors as values")

## Architecture

```
+---------------------+
|   Injector          |
|   (Service Locator) |
+---------------------+
         |
    +----+----+
    |         |
    v         v
+-------+ +-------+
|Logger | |Config |
+-------+ +-------+
```

## Core Services (11 Total)

| # | Service | Purpose |
|---|---------|---------|
| 1 | LoggerService | Application logging |
| 2 | ConfigService | Key-value configuration |
| 3 | WindowService | Window management |
| 4 | EventService | Event handler registration |
| 5 | BackendApiService | API call tracking |
| 6 | NotificationService | Desktop notifications |
| 7 | ClipboardService | Clipboard operations |
| 8 | StorageService | In-memory key-value storage |
| 9 | HttpService | HTTP client (stub) |
| 10 | ProcessService | Process management (stub) |
| 11 | EventBus | Pub/sub messaging |

## Usage

### Bootstrap

```zig
const di = @import("di.zig");

pub fn main() !void {
    const injector = try di.bootstrap();
    defer injector.destroy();
    
    // Access services
    const logger = injector.getLogger();
    const config = injector.getConfig();
    const window = injector.getWindow();
    
    logger.info("Application started");
}
```

### Direct Access

```zig
// Via injector
const logger = injector.getLogger();

// Via convenience functions
const logger2 = try di.getLogger();
```

### Result Types (Errors as Values)

```zig
// Using tryGetXxx() functions - returns Result type
const result = di.tryGetLogger();

if (result.isOk()) {
    const logger = result.unwrap();
    logger.info("Success");
} else {
    const err = result.unwrapErr();
    std.debug.print("Error: {}\n", .{err});
}

// With switch
switch (di.tryGetApi()) {
    .ok => |api| api.incrementCallCount(),
    .err => |_| std.debug.print("No API service\n", .{}),
}

// With default value
const safe_logger = di.tryGetLogger().unwrapOr(default_logger);
```

## Result Type API

```zig
pub fn Result(comptime T: type) type {
    return union(enum) {
        ok: T,
        err: DIError,
    };
}
```

Methods:
- `isOk()` / `isErr()` - Check state
- `unwrap()` - Get value or panic
- `unwrapOr(default: T)` - Get value or default
- `unwrapErr()` - Get error
- `map(U, f: fn(T) U)` - Transform value
- `mapErr(f: fn(DIError) DIError)` - Transform error
- `match(ok: fn(T) void, err: fn(DIError) void)` - Pattern match

## Service Details

### LoggerService

```zig
logger.info("Message");
logger.debug("Debug");
logger.warn("Warning");
logger.err("Error");
```

### ConfigService

```zig
const value = config.get("key", "default");
try config.set("key", "value");
```

### WindowService

```zig
window.setWindow(handle);
window.setSize(1280, 800);
window.setTitle("My App");
window.center();
window.close();
```

### StorageService

```zig
storage.setString("name", "John");
storage.setInt("age", 30);
storage.setBool("active", true);

const name = storage.getString("name", "Unknown");
const age = storage.getInt("age", 0);
```

### EventBus

```zig
const bus = injector.getEventBus();

// Subscribe
const sub_id = try bus.subscribe("event:name", callback);

// Emit
var event = di.Event{
    .name = "event:name",
    .data: null,
    .source = null,
    .priority = .normal,
};
bus.emit(&event);

// Unsubscribe
bus.unsubscribe(sub_id);
```

## Predefined Events

```zig
di.AppEvents.AppStarted
di.AppEvents.AppStopping
di.AppEvents.WindowCreated
di.AppEvents.WindowClosed
di.AppEvents.WindowResized
di.AppEvents.ApiCalled
di.AppEvents.ConfigChanged
```

## Event Priority

```zig
pub const EventPriority = enum(u8) {
    low = 0,
    normal = 1,
    high = 2,
};
```

## Error Types

```zig
pub const DIError = error{
    NoProvider,
    InjectorDestroyed,
    OutOfMemory,
    ServiceInitFailed,
    AllocatorRequired,
    ServiceNotFound,
    EventNotFound,
    EventBusError,
};
```

## Best Practices

1. Use Result types for explicit error handling
2. Always call `deinit()` on injector
3. Prefer `unwrapOr()` for fallback values
4. Use EventBus for decoupled communication

## Testing

```bash
zig build test
zig test src/di.zig
```

## Related Documentation

- [Backend Architecture](02-backend-architecture.md)
- [Communication](01-communication.md)

# Dependency Injection

This document describes the dependency injection system used in the Zig backend.

## Overview

The backend includes an Angular-inspired dependency injection (DI) system that provides:

- Centralized service management
- Singleton service instances
- Type-safe service access
- Easy testing and mocking

## Architecture

```
+---------------------+
|   Injector          |
|   (Service Locator) |
+---------------------+
         |
    +----+----+
    |    |    |
    v    v    v
+-------+ +-------+ +-------+
|Logger | |Config | |Window |
|Service| |Service| |Service|
+-------+ +-------+ +-------+
```

## Core Concepts

### Injector

The injector is a central registry that holds all service instances. It is created once at application startup.

### Services

Services are singleton objects that provide specific functionality:

- LoggerService: Application logging
- ConfigService: Configuration management
- WindowService: Window management
- EventService: Event handler registration
- BackendApiService: API call tracking

## Usage

### Bootstrap

```zig
const di = @import("di.zig");

pub fn main() !void {
    // Create injector with all services
    const injector = di.bootstrap();
    defer injector.destroy();
    
    // Access services
    const logger = injector.logger;
    const config = injector.config;
    const window_service = injector.window;
    const api_service = injector.api;
    
    // Use services
    logger.info("Application starting...");
}
```

### Accessing Services

```zig
// Direct access via injector
const logger = injector.logger;

// Or via convenience functions
const logger2 = di.getLogger();
const config = di.getConfig();
```

## Services

### LoggerService

Provides application logging functionality.

```zig
const logger = injector.logger;

logger.info("Information message");
logger.debug("Debug message");
logger.warn("Warning message");
logger.err("Error message");
```

**Output:**
```
[App] [INFO] Information message
[App] [DEBUG] Debug message
[App] [WARN] Warning message
[App] [ERROR] Error message
```

### ConfigService

Stores and retrieves application configuration.

```zig
const config = injector.config;

// Get value with default
const app_name = config.get("app.name", "Default App");

// Set value
try config.set("app.env", "production");
```

**Default Configuration:**
- app.name: "Zig WebUI App"
- app.version: "1.0.0"

### WindowService

Manages the WebUI window.

```zig
const window_service = injector.window;

// Set window reference
window_service.setWindow(window);

// Get window size
const size = window_service.getSize();
// Returns: struct { u32, u32 }
```

### EventService

Registers event handlers for WebUI events.

```zig
const event_service = injector.events;

// Bind event handler
try event_service.bind("click", handleClick);
```

### BackendApiService

Tracks API calls from the frontend.

```zig
const api_service = injector.api;

// Register handler
try api_service.registerHandler("getData", handleGetData);

// Get call count
const count = api_service.getCallCount();
```

## Creating Custom Services

### Service Structure

```zig
pub const MyService = struct {
    // Service state
    data: std.StringHashMap([]const u8),
    
    // Create function
    pub fn create() *MyService {
        const self = std.heap.page_allocator.create(MyService) catch @panic("OOM");
        self.* = .{
            .data = std.StringHashMap([]const u8).init(std.heap.page_allocator),
        };
        return self;
    }
    
    // Service methods
    pub fn getData(self: *MyService, key: []const u8) ?[]const u8 {
        return self.data.get(key);
    }
};
```

### Registering Custom Services

Add to the Injector struct in `di.zig`:

```zig
pub const Injector = struct {
    logger: *LoggerService,
    config: *ConfigService,
    window: *WindowService,
    events: *EventService,
    api: *BackendApiService,
    my_service: *MyService,  // Add custom service
    
    pub fn create() *Injector {
        const self = std.heap.page_allocator.create(Injector) catch @panic("OOM");
        self.* = .{
            .logger = LoggerService.create(),
            .config = ConfigService.create(),
            .window = WindowService.create(),
            .events = EventService.create(),
            .api = BackendApiService.create(),
            .my_service = MyService.create(),  // Initialize custom service
        };
        return self;
    }
};
```

## Testing

### Unit Testing Services

```zig
test "LoggerService logs messages" {
    const logger = LoggerService.create();
    logger.info("Test message");
    try testing.expectEqualStrings("[App]", logger.prefix);
}

test "ConfigService stores values" {
    const config = ConfigService.create();
    try config.set("test.key", "test_value");
    try testing.expectEqualStrings("test_value", config.get("test.key", "default"));
}
```

### Mocking Services

```zig
// Create mock service
const MockLogger = struct {
    messages: std.ArrayList([]const u8),
    
    pub fn info(self: *MockLogger, message: []const u8) void {
        self.messages.append(message) catch {};
    }
};

// Use in tests
var mock_logger = MockLogger{ .messages = std.ArrayList([]const u8).init(allocator) };
```

## Best Practices

1. **Single Responsibility**: Each service should have one clear purpose
2. **Stateless When Possible**: Services should not maintain complex state
3. **Thread Safety**: Use mutexes for shared state in multi-threaded scenarios
4. **Error Handling**: Return errors instead of panicking
5. **Documentation**: Document service methods and expected behavior

## Comparison with Angular DI

| Feature | Angular DI | Zig DI |
|---------|-----------|--------|
| Decorators | @Injectable() | Direct struct |
| Providers | Provider array | Direct creation |
| Hierarchical | Yes | No (single injector) |
| Lazy Loading | Yes | No (eager initialization) |
| Type Tokens | InjectionToken | Direct type access |
| Reflection | Required | Compile-time |

## Performance

| Operation | Time |
|-----------|------|
| Service creation | <1ms |
| Service lookup | O(1) |
| Memory overhead | Minimal |

## Related Documentation

- [Communication](communication.md)
- [Backend Architecture](backend-architecture.md)
- [Build System](build-system.md)

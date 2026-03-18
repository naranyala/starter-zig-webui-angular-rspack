# Zig WebUI Angular Rspack

A modern desktop application framework combining Zig backend with Angular frontend, using WebUI for native window integration and WebSocket-based communication (no HTTP/HTTPS).

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Dependency Injection System](#dependency-injection-system)
  - [Core Concepts](#core-concepts)
  - [Services](#services)
  - [Result Type](#result-type)
  - [Usage Examples](#usage-examples)
- [Event Bus](#event-bus)
- [Utilities](#utilities)
- [Quick Start](#quick-start)
- [Build and Run](#build-and-run)
- [Project Structure](#project-structure)
- [Communication](#communication)
- [Development](#development)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Overview

This project demonstrates a complete desktop application stack using:

- **Backend**: Zig with WebUI library for native window management
- **Frontend**: Angular 21 with Rspack bundler
- **Communication**: WebUI WebSocket bridge (no HTTP/HTTPS)
- **Desktop Window**: Native Chromium-based window via WebUI

The application runs as a true desktop app with a native window, not a web server. The backend and frontend communicate through WebUI's built-in WebSocket bridge, providing a secure and efficient communication channel without the overhead of HTTP.

## Features

- Native desktop window (Chromium-based via WebUI)
- Angular frontend with modern tooling (Rspack, Bun)
- Zig backend with comprehensive dependency injection system
- WebSocket-based backend-frontend communication (no HTTP/HTTPS)
- Type-safe function binding between backend and frontend
- Event-driven architecture with EventBus
- "Errors as values" pattern with Result types
- Hot reload support for development
- Optimized production builds
- Comprehensive utility modules for desktop features
- Extensive test coverage

## Architecture

```
+----------------------------------------------------------+
|                  Desktop Application                      |
|  +------------------+        +--------------------------+ |
|  |   Frontend       |        |   Backend                 | |
|  |   (Angular)      |        |   (Zig + WebUI)          | |
|  |                  |        |                          | |
|  |  - Components    |        |  - Window Management     | |
|  |  - Services      |        |  - Function Bindings     | |
|  |  - WebSocket     |<------>|  - DI Container          | |
|  |    Client        |  WS    |  - Event Bus             | |
|  +------------------+        +--------------------------+ |
+----------------------------------------------------------+
          |                                      |
          +--------------------------------------+
                     WebUI Bridge
               (WebSocket-based RPC)
```

### Component Layers

1. **Desktop Layer**: Native window management via WebUI
2. **Backend Layer**: Zig application with DI system
3. **Communication Layer**: WebSocket bridge (WebUI native)
4. **Frontend Layer**: Angular application with services

---

## Dependency Injection System

The backend includes an Angular-inspired dependency injection system with 11 core services, an EventBus for pub/sub messaging, and comprehensive error handling via Result types.

### Core Concepts

#### 1. Injector

The Injector is the central container that manages all services:

```zig
const di = @import("di.zig");

pub fn main() !void {
    // Bootstrap DI system
    const injector = di.bootstrap() catch return;
    defer injector.destroy();

    // Access services directly
    const logger = injector.getLogger();
    const config = injector.getConfig();
    const window = injector.getWindow();
}
```

#### 2. Service Lifetime

All services are **singletons** - created once and shared throughout the application lifetime.

#### 3. Result Type - "Errors as Values"

The DI system uses explicit Result types for error handling (no exceptions):

```zig
// Using Result types
const result = di.tryGetLogger();
if (result.isOk()) {
    const logger = result.unwrap();
    logger.info("Success!");
} else {
    const err = result.unwrapErr();
    std.debug.print("Error: {}\n", .{err});
}

// Or with switch
switch (di.tryGetLogger()) {
    .ok => |s| s.info("Found"),
    .err => |e| std.debug.print("Error: {}\n", .{e}),
}

// With default value
const logger = di.tryGetLogger().unwrapOr(default_logger);
```

---

### Services

The DI system provides 11 built-in services:

#### 1. LoggerService

Application logging with multiple log levels.

| Method | Description |
|--------|-------------|
| `info(message: []const u8)` | Log info message |
| `debug(message: []const u8)` | Log debug message |
| `warn(message: []const u8)` | Log warning message |
| `err(message: []const u8)` | Log error message |
| `log(level: []const u8, message: []const u8)` | Log with custom level |

**Usage:**
```zig
const logger = injector.getLogger();
logger.info("Application started");
logger.debug("Config loaded: {}", .{config_value});
logger.err("Something went wrong");
```

---

#### 2. ConfigService

Key-value configuration management.

| Method | Description |
|--------|-------------|
| `get(key: []const u8, default: []const u8) []const u8` | Get string value |
| `set(key: []const u8, value: []const u8) !void` | Set string value |
| `has(key: []const u8) bool` | Check if key exists |
| `remove(key: []const u8) void` | Remove a key |

**Usage:**
```zig
const config = injector.getConfig();
const app_name = config.get("app.name", "Default");
try config.set("app.version", "1.0.0");
```

---

#### 3. WindowService

Native window management via WebUI.

| Method | Description |
|--------|-------------|
| `setWindow(w: usize) void` | Set window handle |
| `getWindow() usize` | Get window handle |
| `getSize() struct { u32, u32 }` | Get window size |
| `setSize(width: u32, height: u32) void` | Set window size |
| `getPosition() struct { i32, i32 }` | Get window position |
| `setPosition(x: i32, y: i32) void` | Set window position |
| `setResizable(resizable: bool) void` | Set resizable |
| `isResizable() bool` | Check if resizable |
| `setMaximized(maximized: bool) void` | Set maximized state |
| `setMinimized() void` | Minimize window |
| `setVisible(visible: bool) void` | Set visibility |
| `setTitle(title: []const u8) void` | Set window title |
| `center() void` | Center window |
| `close() void` | Close window |

**Usage:**
```zig
const window = injector.getWindow();
window.setTitle("My App");
window.setSize(1280, 800);
window.center();
```

---

#### 4. EventService

Event handler registration for WebUI events.

| Method | Description |
|--------|-------------|
| `bind(element: []const u8, handler: WebuiEventHandler) !void` | Bind handler to element |
| `unbind(element: []const u8) void` | Unbind handler |
| `hasHandler(element: []const u8) bool` | Check if handler exists |

**Usage:**
```zig
const events = injector.getEvents();
try events.bind("myButton", myHandler);
```

---

#### 5. BackendApiService

API call tracking and handler registration.

| Method | Description |
|--------|-------------|
| `registerHandler(name: []const u8, handler: WebuiEventHandler) !void` | Register API handler |
| `unregisterHandler(name: []const u8) void` | Unregister handler |
| `hasHandler(name: []const u8) bool` | Check if handler exists |
| `incrementCallCount() void` | Increment API call counter |
| `getCallCount() usize` | Get total call count |
| `resetCallCount() void` | Reset counter to zero |

**Usage:**
```zig
const api = injector.getApi();
api.incrementCallCount();
const count = api.getCallCount();
```

---

#### 6. NotificationService

Desktop notification support (simplified implementation).

| Method | Description |
|--------|-------------|
| `send(app_name: []const u8, title: []const u8, body: []const u8) !void` | Send notification |
| `sendWithIcon(...) !void` | Send notification with icon |
| `setEnabled(enabled: bool) void` | Enable/disable notifications |
| `isEnabled() bool` | Check if enabled |

**Usage:**
```zig
const notification = injector.getNotification();
try notification.send("MyApp", "Hello", "World");
notification.setEnabled(true);
```

---

#### 7. ClipboardService

In-memory clipboard operations.

| Method | Description |
|--------|-------------|
| `setText(text: []const u8) !void` | Set clipboard text |
| `getText() ![]const u8` | Get clipboard text |
| `hasText() !bool` | Check if text exists |
| `clear() !void` | Clear clipboard |

**Usage:**
```zig
const clipboard = injector.getClipboard();
try clipboard.setText("Hello, World!");
const text = try clipboard.getText();
```

---

#### 8. StorageService

In-memory key-value storage with typed values.

| Method | Description |
|--------|-------------|
| `getString(key: []const u8, default: []const u8) []const u8` | Get string |
| `setString(key: []const u8, value: []const u8) !void` | Set string |
| `getInt(key: []const u8, default: i64) i64` | Get integer |
| `setInt(key: []const u8, value: i64) !void` | Set integer |
| `getBool(key: []const u8, default: bool) bool` | Get boolean |
| `setBool(key: []const u8, value: bool) !void` | Set boolean |
| `has(key: []const u8) bool` | Check if key exists |
| `remove(key: []const u8) void` | Remove key |
| `save() !void` | Save (no-op for in-memory) |

**Usage:**
```zig
const storage = injector.getStorage();
try storage.setString("username", "john");
try storage.setInt("age", 30);
try storage.setBool("active", true);

const name = storage.getString("username", "unknown");
const age = storage.getInt("age", 0);
const active = storage.getBool("active", false);
```

---

#### 9. HttpService

HTTP client service (stub implementation).

| Method | Description |
|--------|-------------|
| `setDefaultTimeout(timeout_ms: u64) void` | Set default timeout |
| `request(method: HttpMethod, url: []const u8, body: ?[]const u8) !HttpResponse` | Make HTTP request |
| `get(url: []const u8) !HttpResponse` | GET request |
| `post(url: []const u8, body: []const u8) !HttpResponse` | POST request |
| `put(url: []const u8, body: []const u8) !HttpResponse` | PUT request |
| `delete(url: []const u8) !HttpResponse` | DELETE request |

**Usage:**
```zig
const http = injector.getHttp();
http.setDefaultTimeout(30000);
const response = try http.get("https://api.example.com/data");
```

---

#### 10. ProcessService

Process management service (stub implementation).

| Method | Description |
|--------|-------------|
| `spawn(program: []const u8, args: []const []const u8) !std.process.Child` | Spawn process |
| `run(program: []const u8, args: []const []const u8) !std.process.Child.ExecResult` | Run and wait |

**Usage:**
```zig
const process = injector.getProcess();
const result = try process.run("ls", &.{"-la"});
```

---

#### 11. EventBus

Pub/sub event system for application-wide messaging.

| Method | Description |
|--------|-------------|
| `subscribe(event_name: []const u8, callback: EventCallback) !usize` | Subscribe to event |
| `subscribeWithOptions(...) !usize` | Subscribe with options |
| `unsubscribe(subscription_id: usize) void` | Unsubscribe |
| `emit(event: *const Event) void` | Emit event |
| `emitSync(event: *const Event) void` | Emit synchronously |
| `once(event_name: []const u8, callback: EventCallback) !usize` | One-time subscription |
| `removeAllForEvent(event_name: []const u8) void` | Remove all subscriptions |
| `subscriptionCount() usize` | Get subscription count |

---

### Result Type

The `Result(T)` type provides explicit error handling without exceptions:

```zig
pub fn Result(comptime T: type) type {
    return union(enum) {
        ok: T,
        err: DIError,
    };
}
```

**Methods:**

| Method | Description |
|--------|-------------|
| `isOk() bool` | Check if success |
| `isErr() bool` | Check if error |
| `unwrap() T` | Get value or panic |
| `unwrapOr(default: T) T` | Get value or default |
| `unwrapErr() DIError` | Get error |
| `map(U, f: fn(T) U) Result(U)` | Transform value |
| `mapErr(f: fn(DIError) DIError) @This()` | Transform error |
| `flatMap(f: fn(T) Result(T)) Result(T)` | Chain operations |
| `match(ok: fn(T) void, err: fn(DIError) void) void` | Pattern match |

**Usage Examples:**

```zig
// Basic usage
const result = di.tryGetLogger();
if (result.isOk()) {
    result.unwrap().info("Success");
}

// With default
const logger = di.tryGetLogger().unwrapOr(fallback_logger);

// With switch
switch (di.tryGetApi()) {
    .ok => |api| api.incrementCallCount(),
    .err => |_| std.debug.print("No API service\n", .{}),
}

// Chaining
const value = di.tryGetLogger()
    .map(LoggerService, |l| l)
    .unwrapOr(default_logger);
```

---

### Usage Examples

#### Basic Service Access

```zig
const di = @import("di.zig");

pub fn main() !void {
    const injector = try di.bootstrap();
    defer injector.destroy();

    // Get individual services
    const logger = injector.getLogger();
    const config = injector.getConfig();
    const window = injector.getWindow();
    const api = injector.getApi();

    // Use services
    logger.info("Starting application...");
    const port = config.get("server.port", "8080");
    window.setTitle("My Desktop App");
}
```

#### Using Result Types (Errors as Values)

```zig
pub fn main() !void {
    _ = try di.bootstrap();

    // Option 1: Direct service access (throws on error)
    const logger = try di.getLogger();

    // Option 2: Result type (explicit error handling)
    const logger_result = di.tryGetLogger();
    if (logger_result.isOk()) {
        logger_result.unwrap().info("Application started");
    } else {
        std.debug.print("Failed to get logger: {}\n", .{logger_result.unwrapErr()});
    }

    // Option 3: With default
    const safe_logger = di.tryGetLogger().unwrapOr(fallback_logger);

    di.shutdown();
}
```

#### Registering Event Handlers

```zig
pub fn main() !void {
    const injector = try di.bootstrap();
    defer injector.destroy();

    const events = injector.getEvents();

    // Bind WebUI event handler
    try events.bind("myButton", myEventHandler);
}

fn myEventHandler(event: ?*webui.Event) callconv(.C) void {
    if (event) |e| {
        std.debug.print("Button clicked: {s}\n", .{e.getElementId()});
    }
}
```

---

## Event Bus

The EventBus provides publish/subscribe messaging:

### Predefined Events

```zig
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
```

### Usage

```zig
const event_bus = injector.getEventBus();

// Subscribe to events
const sub_id = try event_bus.subscribe(
    AppEvents.AppStarted,
    handleAppStarted,
);

// Emit events
var event = di.Event{
    .name = AppEvents.AppStarted,
    .data = null,
    .source = null,
    .priority = .normal,
};
event_bus.emit(&event);

// Unsubscribe
event_bus.unsubscribe(sub_id);

// One-time subscription
_ = try event_bus.once(AppEvents.AppStarted, handleAppStarted);
```

### Event Priority

Events can have priority levels:

```zig
pub const EventPriority = enum(u8) {
    low = 0,
    normal = 1,
    high = 2,
};
```

---

## Utilities

The backend includes comprehensive utility modules:

- **File System** (`src/utils/fs.zig`): Read/write files, directory operations, file watching
- **Process Management** (`src/utils/process.zig`): Spawn and control child processes
- **Clipboard** (`src/utils/clipboard.zig`): Cross-platform copy/paste operations
- **Notifications** (`src/utils/notification.zig`): Desktop notification support
- **Settings** (`src/utils/settings.zig`): Persistent configuration with validation
- **Task Queue** (`src/utils/task_queue.zig`): Background job processing with priorities
- **System Info** (`src/utils/system.zig`): OS, CPU, memory, disk, battery information

For detailed utilities documentation, see [docs/UTILITIES.md](docs/UTILITIES.md).

---

## Quick Start

### Prerequisites

- Zig 0.14.1 or later
- Bun 1.3.10 or later
- Chromium browser (for desktop window)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd starter-zig-webui-angular-rspack

# Install frontend dependencies
cd frontend
bun install

# Return to project root
cd ..
```

### Build and Run

#### Quick Start (using run.sh script)

```bash
# Release build and run
./run.sh

# Debug mode
./run.sh dev

# Custom build configuration
FRONTEND_BUILD=true ZIG_BUILD=true RUN_APP=true ./run.sh
```

#### Manual Build

```bash
# 1. Build frontend
cd frontend
bun run build
cd ..

# 2. Build Zig backend
zig build -Doptimize=ReleaseSafe

# 3. Run the application
./zig-out/bin/zig_webui_angular_rspack
```

#### Build Configuration

Environment variables for `run.sh`:

| Variable | Default | Description |
|----------|---------|-------------|
| `BUILD_TYPE` | `release` | `debug` or `release` |
| `FRONTEND_BUILD` | `true` | Build frontend before Zig |
| `ZIG_BUILD` | `true` | Build Zig backend |
| `RUN_APP` | `true` | Run application after build |
| `CLEAN` | `false` | Clean before build |
| `WATCH` | `false` | Watch mode for development |

Example:
```bash
# Build only frontend
FRONTEND_BUILD=true ZIG_BUILD=false RUN_APP=false ./run.sh

# Build with debug symbols
BUILD_TYPE=debug ./run.sh dev
```

#### Zig Build Options

```bash
# Release with safety checks
zig build -Doptimize=ReleaseSafe

# Release optimized
zig build -Doptimize=ReleaseFast

# Debug with optimizations
zig build -Doptimize=Debug

# Custom target (e.g., Windows)
zig build -Dtarget=x86_64-windows
```

### Development

#### Frontend Development

```bash
cd frontend

# Start dev server (hot reload)
bun run dev

# Build with watch mode
bun run watch

# Run tests
bun test

# Lint and format
bun run lint
bun run format
```

#### Backend Development

```bash
# Debug build
zig build -Doptimize=Debug

# Run tests
zig build test

# Run specific test
zig test src/di.zig

# Run with custom arguments
./zig-out/bin/zig_webui_angular_rspack --verbose
```

#### Full Development Workflow

```bash
# Terminal 1: Frontend dev server
cd frontend && bun run dev

# Terminal 2: Zig build watch (if supported)
# Terminal 3: Run the app
zig build -Doptimize=Debug && ./zig-out/bin/zig_webui_angular_rspack
```

#### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `FRONTEND_PATH` | Custom frontend files path | `/path/to/dist/browser` |
| `RUST_LOG` | Logging level (if using Rust deps) | `debug` |
| `WEBUI_DEBUG` | WebUI debug mode | `1` |

Example:
```bash
FRONTEND_PATH=./custom/path ./zig-out/bin/zig_webui_angular_rspack
```

---

## Project Structure

```
starter-zig-webui-angular-rspack/
├── src/                      # Zig backend
│   ├── main.zig            # Application entry point
│   ├── di.zig             # Dependency injection system
│   ├── root.zig           # Root package
│   ├── communication/     # WebSocket communication
│   └── utils/             # Utility modules
│       ├── fs.zig         # File system operations
│       ├── process.zig    # Process management
│       ├── clipboard.zig  # Clipboard operations
│       ├── notification.zig
│       ├── settings.zig   # Persistent settings
│       ├── task_queue.zig # Background tasks
│       └── system.zig     # System information
├── frontend/               # Angular frontend
│   ├── src/
│   │   ├── core/          # Services, models
│   │   └── views/         # Angular components
│   └── package.json
├── docs/                  # Documentation
├── build.zig             # Zig build script
└── README.md
```

---

## Communication

This project supports **3 communication approaches** between backend and frontend:

### 1. WebUI Bridge (Primary - Recommended)

Direct function binding via WebUI's native WebSocket bridge. **No HTTP/HTTPS used.**

| Feature | Description |
|---------|-------------|
| Protocol | WebSocket (ws://) via WebUI |
| Latency | ~1-3ms |
| Use Case | Standard RPC calls |

**Backend (Zig):**
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

**Frontend (TypeScript):**
```typescript
const result = await window.add(1, 2);
```

**Service:** `WebuiBridgeService` (`frontend/src/core/webui-bridge.service.ts`)

---

### 2. Pure WebSocket (Alternative)

Custom WebSocket server for complex communication patterns.

| Feature | Description |
|---------|-------------|
| Protocol | WebSocket (ws://) |
| Port | 8765 (default) |
| Latency | ~1-3ms |
| Use Case | Real-time streaming, pub/sub |

**Backend:** `src/communication/websocket_server.zig`

**Frontend:** `WebSocketService` (`frontend/src/core/websocket.service.ts`)

```typescript
const ws = new WebSocketService();
ws.connect('ws://localhost:8765');

// Request/Response
const result = await ws.request('getData', { id: 123 });

// Subscribe to events
ws.subscribe('updates');
ws.onEvent('updates', (data) => console.log(data));
```

---

### 3. Event Bus (Internal)

Application-wide pub/sub messaging within the backend.

**Backend:** `EventBus` in `src/di.zig`

```zig
const bus = injector.getEventBus();

// Subscribe
const sub_id = try bus.subscribe("app:started", handler);

// Emit
var event = di.Event{
    .name = "app:started",
    .data = null,
    .source = null,
    .priority = .normal,
};
bus.emit(&event);
```

---

### Message Formats

**WebUI Bridge Response:**
```json
{
  "success": true,
  "data": { "key": "value" }
}
```

**WebSocket Message:**
```json
{
  "type": "request",
  "id": 1,
  "method": "getData",
  "params": {}
}
```

---

### Choosing a Communication Approach

| Scenario | Recommended Approach |
|----------|---------------------|
| Standard function calls | WebUI Bridge |
| Real-time streaming | Pure WebSocket |
| Multiple concurrent connections | Pure WebSocket |
| Pub/Sub patterns | Pure WebSocket |
| Internal backend messaging | Event Bus |

For detailed documentation, see [docs/01-communication.md](docs/01-communication.md).

---

## Development

### Frontend Development

```bash
cd frontend

# Start development server
bun run dev

# Build with watch mode
bun run watch

# Run tests
bun test

# Lint code
bun run lint
```

### Backend Development

```bash
# Build in debug mode
zig build -Doptimize=Debug

# Run tests
zig build test

# Build with release optimizations
zig build -Doptimize=ReleaseSafe
```

---

## Testing

```bash
# Run all tests
zig build test

# Run specific test file
zig test src/di.zig
```

---

## Troubleshooting

### Build Errors

If you encounter build errors, try:

```bash
# Clean and rebuild
rm -rf zig-out .zig-cache
zig build
```

### Frontend Not Loading

Ensure the frontend is built:

```bash
cd frontend
bun run build
```

### Window Not Appearing

Check that Chromium is installed and accessible.

### Frontend Path Issues

If the application fails to find the frontend files:

```bash
# Set custom frontend path
export FRONTEND_PATH=/path/to/frontend/dist/browser
./zig-out/bin/zig_webui_angular_rspack
```

The application looks for frontend files in:
1. `$FRONTEND_PATH` environment variable
2. `./frontend/dist/browser` (default)

### Browser Detection Issues

If no browser is detected, the app runs in headless mode. To force a specific browser:

```bash
# WebUI supports: AnyBrowser, Chrome, Chromium, Firefox, Edge
# Check browser installation:
which chromium-browser
which google-chrome
```

### Zig Build Issues

If Zig compilation fails:

```bash
# Check Zig version (requires 0.14.1+)
zig version

# Update Zig if needed
# See: https://ziglang.org/download/

# Clean cache and rebuild
rm -rf .zig-cache zig-out
zig build -Doptimize=ReleaseSafe
```

### Frontend Build Issues

If frontend build fails:

```bash
cd frontend
# Install dependencies
bun install

# Clean and rebuild
rm -rf dist node_modules/.cache
bun run build

# Check for TypeScript errors
bun run check
```

### Common Error Messages

1. **"Frontend not built - run 'npm run build' first"**
   - Solution: Build the frontend with `cd frontend && bun run build`

2. **"Failed to create window"**
   - Solution: Ensure WebUI dependencies are installed (Chromium/Chrome browser)

3. **"DI Bootstrap Failed"**
   - Solution: Check memory allocation and Zig version compatibility

4. **"Backend function not bound"**
   - Solution: Ensure backend functions are registered before window shows

### Debug Mode

Run in debug mode for detailed logging:

```bash
# Build in debug mode
zig build -Doptimize=Debug

# Run with verbose output
./zig-out/bin/zig_webui_angular_rspack
```

### Logs and Diagnostics

Check application logs for errors:
- Console output (stdout/stderr)
- Browser DevTools (F12 in the desktop window)
- Frontend console for JavaScript errors

---

## Security Considerations

This application runs as a native desktop window with direct backend-frontend communication. Consider the following security aspects:

### Communication Security
- **WebSocket Bridge**: Communication happens via WebUI's native WebSocket bridge (no HTTP/HTTPS)
- **No Network Exposure**: The application doesn't expose HTTP endpoints to the network
- **Local Communication Only**: Backend-frontend communication is local to the desktop app

### Best Practices
1. **Input Validation**: Always validate data received from the frontend
2. **Error Handling**: Use Result types for explicit error handling
3. **Memory Management**: Be careful with memory allocation in Zig backend
4. **Desktop Permissions**: The app has full desktop access - ensure trusted code only

### Security Features
- **Type Safety**: Zig provides compile-time type checking
- **No Exceptions**: Error handling via Result types prevents unexpected crashes
- **Event-Driven Architecture**: Isolated service communication via EventBus

---

## License

MIT License - see LICENSE file for details.

---

## Future Improvements

This section outlines potential enhancements to extend the framework's capabilities.

### 1. Backend Service Implementations

The following services are currently stubs and need real implementations:

| Service | Status | Description | Priority |
|---------|--------|-------------|----------|
| **HttpService** | Stub | Implement HTTP client using Zig's http module | High |
| **ProcessService** | Stub | Add process spawning and management | Medium |
| **NotificationService** | Stub | Desktop notifications via native APIs | Medium |
| **StorageService** | In-Memory | Add file-based persistent storage | High |
| **LoggerService** | Console | Add file-based logging with rotation | High |

### 2. Database Integration

**SQLite Support** - The frontend already has a SQLite CRUD demo component:

```zig
// Add SQLite to Zig backend
// Using z-sqlite or direct libsqlite3 binding

pub const DatabaseService = struct {
    // Connection management
    // Query execution
    // Transaction support
    // Migration system
};
```

### 3. Frontend Optimizations

| Improvement | Benefit | Effort |
|-------------|---------|--------|
| **Lazy Loading** | Reduce initial bundle size | Medium |
| **Component Lazy Loading** | Load routes on demand | Low |
| **CSS Optimization** | Purge unused styles, reduce 12KB CSS | Low |
| **PWA Support** | Offline capability, installable | Medium |
| **Service Worker** | Caching, offline support | Medium |

### 4. Build & Deployment

| Feature | Description |
|---------|-------------|
| **Docker Support** | Containerized build and run |
| **CI/CD Pipeline** | GitHub Actions for automated testing |
| **Cross-Platform Builds** | Windows, macOS, Linux executables |
| **Auto-Update** | Self-update mechanism |
| **Code Signing** | Windows/macOS code signing |

### 5. Advanced Features

| Feature | Description |
|---------|-------------|
| **Hot Module Replacement** | Live frontend updates without restart |
| **Electron Alternative** | Use WebUI for lighter footprint |
| **System Tray** | Background running with tray icon |
| **Native Menus** | Application menu bar |
| **Global Shortcuts** | Keyboard shortcuts |
| **File Associations** | Register file types |
| **Multi-Window** | Multiple windows support |

### 6. Error Handling & Monitoring

| Feature | Description |
|---------|-------------|
| **Error Reporting** | Frontend error capture and reporting |
| **Analytics** | Usage tracking (opt-in) |
| **Crash Reports** | Automatic crash reporting |
| **Logging** | File-based structured logging |

### 7. Suggested Project Structure Additions

```
src/
├── db/                    # Database layer
│   ├── sqlite.zig       # SQLite wrapper
│   └── migrations/      # Schema migrations
├── logging/              # Logging system
│   └── file_logger.zig  # File-based logger
├── network/              # Network utilities
│   └── http_client.zig  # Full HTTP client
├── platform/             # Platform-specific code
│   ├── tray.zig         # System tray
│   ├── menu.zig         # Native menus
│   └── shortcuts.zig     # Global shortcuts
└── config/               # Configuration
    └── loader.zig       # Config file loading
```

### 8. Quick Wins

1. **Remove unused imports** in app.component.ts (AuthComponent, SqliteCrudComponent)
2. **Add production logging** - Console → File
3. **Implement config file** - Load settings from JSON/TOML
4. **Add .gitignore** for build artifacts
5. **Increase test coverage** - Add more unit/integration tests

### 9. Performance Benchmarks

Target metrics for production:

| Metric | Current | Target |
|--------|---------|--------|
| Initial Bundle | 659KB | < 300KB |
| Time to Interactive | ~3s | < 1s |
| Backend Startup | ~500ms | < 200ms |
| Memory Usage | TBD | < 100MB |

### 10. Example: Implementing File-Based Storage

```zig
// src/utils/storage_file.zig

const Self = @This();
allocator: std.mem.Allocator;
file_path: []const u8,

pub fn init(allocator: std.mem.Allocator, path: []const u8) !*Self {
    const self = try allocator.create(Self);
    self.* = .{
        .allocator = allocator,
        .file_path = try allocator.dupe(u8, path),
    };
    try self.load();
    return self;
}

pub fn save(self: *Self) !void {
    const file = try std.fs.cwd().createFile(self.file_path, .{});
    defer file.close();
    // Serialize and write data
}
```

### 11. Code Quality & Stability Improvements

Based on the recent code audit, the following high-priority stability issues need attention:

| Issue | Priority | Status | Description |
|-------|----------|--------|-------------|
| **EventBus Memory Leak** | High | Open | Event subscriptions may not be properly cleaned up. Implement reference counting or improved cleanup logic. |
| **Unsafe Unwrap Usage** | High | Open | `main.zig` lines 150, 177 use `unwrap()` without proper error handling. Should use `unwrapOr()` or explicit error handling. |
| **Signal Handlers** | High | Partial | Signal handling stub exists but isn't fully implemented. Need proper signal handling for graceful shutdown. |

**Quick Fixes:**
1. Replace `logger_result.unwrapOr(injector.getLogger())` with explicit error handling
2. Implement `setupSignalHandlers()` with proper signal interception (SIGINT, SIGTERM)
3. Review EventBus subscription cleanup in `di.zig:239-254`

---

## Known Issues

### High Priority (Open)

1. **EventBus Memory Leak Potential** (`src/di.zig`)
   - Event subscriptions may not be properly cleaned up
   - Affects: EventBus subscriptions with duplicated strings

2. **Unsafe Unwrap Usage** (`src/main.zig:150, 177`)
   - Potential panic on unwrap if service initialization fails
   - Affects: Logger service initialization and window size retrieval

3. **Signal Handlers Not Fully Implemented** (`src/main.zig:103-107`)
   - Stub function exists but doesn't handle signals
   - Affects: Graceful shutdown handling

### Medium Priority (Open)

4. **Stub Services**
   - `HttpService`, `ProcessService`, `NotificationService` need real implementations
   - Currently only console logging or stub returns

5. **Unused Variables** (`src/main.zig:183, 249`)
   - `injector.getConfig()` and `injector.getEventBus()` calls with no usage

6. **Result Type Error Reporting**
   - Better error messages needed for Result type failures

### Tracking

Full issue details and status available in:
- `audit/open/OPEN_AUDIT.md` - Open issues
- `audit/closed/SUMMARY.md` - Fixed issues

---

## Contributing

Contributions are welcome! Please see CONTRIBUTING.md for guidelines.

### Contributing Guidelines

1. **Code Quality**: Follow Zig best practices and the existing code style
2. **Testing**: Add tests for new features (see `src/di.zig` for examples)
3. **Documentation**: Update README.md and inline documentation
4. **Audit Compliance**: Address open audit issues when possible
5. **Pull Requests**: Reference relevant issue numbers in PR descriptions

### Areas for Contribution

- **Service Implementations**: Implement real HTTP, Process, and Notification services
- **EventBus Improvements**: Fix memory leak and improve cleanup logic
- **Frontend Features**: Add PWA support, lazy loading, service worker
- **Build System**: Docker support, CI/CD pipeline, cross-platform builds
- **Error Handling**: Improve error reporting and crash handling

## Support

- Report bugs via GitHub Issues
- Join discussions in GitHub Discussions
- Check audit reports in `audit/` directory for known issues

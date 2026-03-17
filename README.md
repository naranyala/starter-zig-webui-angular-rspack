# Zig WebUI Angular Rspack

A modern desktop application framework combining Zig backend with Angular frontend, using WebUI for native window integration and WebSocket-based communication (no HTTP/HTTPS).

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Build and Run](#build-and-run)
- [Project Structure](#project-structure)
- [Communication](#communication)
- [Dependency Injection](#dependency-injection)
- [Utilities](#utilities)
- [Development](#development)
- [Testing](#testing)
- [Documentation](#documentation)
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
- Event-driven architecture
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
|  |  - WebSocket     |<------>|  - DI Container         | |
|  |    Client        |  WS    |  - Event Handlers       | |
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

```bash
# Release build and run
./run.sh

# Debug build and run
./run.sh dev

# Build only (don't run)
./run.sh --no-run

# Clean build
./run.sh --clean
```

## Build and Run

### Commands

| Command | Description |
|---------|-------------|
| `./run.sh` | Build and launch in release mode |
| `./run.sh dev` | Build and launch in debug mode |
| `./run.sh --clean` | Clean build artifacts before building |
| `./run.sh --no-run` | Build only, don't launch application |
| `./run.sh --help` | Show all available options |

### Build Output

- **Frontend**: `frontend/dist/browser/`
- **Backend**: `zig-out/bin/zig_webui_angular_rspack`

### Build Modes

| Mode | Command | Optimizations | Source Maps |
|------|---------|---------------|-------------|
| Release | `./run.sh` | Full | No |
| Debug | `./run.sh dev` | None | Yes |

## Project Structure

```
starter-zig-webui-angular-rspack/
├── frontend/                    # Angular frontend application
│   ├── src/                    # Source files
│   │   ├── core/               # Core services
│   │   │   ├── api.service.ts  # Backend communication
│   │   │   ├── webui-bridge.service.ts
│   │   │   ├── websocket.service.ts
│   │   │   └── logger.service.ts
│   │   ├── views/              # Components/views
│   │   │   ├── app.component.ts
│   │   │   ├── home/
│   │   │   ├── sqlite/
│   │   │   └── devtools/
│   │   ├── models/             # Data models
│   │   ├── types/              # Type definitions
│   │   └── integration/        # Integration tests
│   ├── angular.json            # Angular configuration
│   ├── rspack.config.js        # Rspack bundler config
│   ├── package.json             # Node dependencies
│   └── tsconfig.json           # TypeScript configuration
│
├── src/                        # Zig backend source
│   ├── main.zig                # Application entry point
│   ├── di.zig                  # Dependency injection system
│   ├── root.zig                # Library root
│   ├── utils/                  # Utility modules
│   │   ├── utils.zig           # Main utilities export
│   │   ├── fs.zig              # File system operations
│   │   ├── process.zig         # Process management
│   │   ├── clipboard.zig       # Clipboard operations
│   │   ├── notification.zig    # Desktop notifications
│   │   ├── system.zig          # System information
│   │   ├── settings.zig        # Persistent settings
│   │   └── task_queue.zig      # Background task queue
│   └── communication/          # Communication protocols
│       └── websocket_server.zig # Pure WebSocket server
│
├── thirdparty/                 # Third-party libraries
│   └── webui/                  # WebUI library
│       ├── src/
│       │   ├── webui.c         # WebUI core
│       │   ├── webui.zig       # Zig bindings
│       │   └── civetweb/       # HTTP/WebSocket server
│       └── include/            # Header files
│
├── docs/                       # Documentation
├── build.zig                   # Zig build configuration
├── build.zig.zon               # Zig package configuration
├── run.sh                      # Build and run script
└── README.md                   # This file
```

## Communication

The application uses WebUI's native WebSocket bridge for all backend-frontend communication. No HTTP/HTTPS is used.

### Backend Function Binding

```zig
// Backend: Bind function
_ = webui.bind(window, "getData", handleGetData);

fn handleGetData(event: ?*webui.Event) callconv(.C) void {
    if (event) |e| {
        const response = "{\"success\":true,\"data\":{\"key\":\"value\"}}";
        webui.run(e.getWindow(), response);
    }
}
```

### Frontend Function Call

```typescript
// Frontend: Call backend function
const result = await window.getData();
console.log(result);
```

### Communication Patterns

1. **Request/Response**: Direct function calls with return values
2. **Events**: Backend can push events to frontend
3. **Broadcast**: Send data to all connected clients

For detailed communication documentation, see [docs/communication.md](docs/communication.md).

## Dependency Injection

The backend includes an Angular-inspired dependency injection system.

### Services

- **LoggerService**: Application logging
- **ConfigService**: Configuration management
- **WindowService**: Window management
- **EventService**: Event handler registration
- **BackendApiService**: API call tracking

### Usage

```zig
const di = @import("di.zig");

pub fn main() !void {
    // Bootstrap DI
    const injector = di.bootstrap();
    defer injector.destroy();
    
    // Access services
    const logger = injector.logger;
    const config = injector.config;
    
    logger.info("Application starting...");
}
```

For detailed DI documentation, see [docs/dependency-injection.md](docs/dependency-injection.md).

## Utilities

The backend includes comprehensive utility modules for desktop application development:

- **File System**: Read/write files, directory operations, file watching
- **Process Management**: Spawn and control child processes
- **Clipboard**: Cross-platform copy/paste operations
- **Notifications**: Desktop notification support
- **System Info**: OS, CPU, memory, disk, battery information
- **Settings**: Persistent configuration with validation
- **Task Queue**: Background job processing with priorities

For detailed utilities documentation, see [docs/UTILITIES.md](docs/UTILITIES.md).

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

# Build and run
zig build run

# Run with debug output
zig build -Doptimize=Debug run
```

### Debugging

1. Enable debug logging in build.zig
2. Use browser DevTools for frontend debugging
3. Check terminal output for backend logs
4. Use `zig build -Doptimize=Debug` for debug symbols

## Testing

### Backend Tests

```bash
# Run all tests
zig build test

# Run specific test file
zig test src/di.zig

# Run tests with verbose output
zig build test --summary all
```

### Frontend Tests

```bash
cd frontend

# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run tests with coverage
bun test --coverage
```

### Test Structure

- **Unit Tests**: Test individual functions and components
- **Integration Tests**: Test service interactions
- **E2E Tests**: Test full application flows

## Documentation

| Document | Description |
|----------|-------------|
| [docs/README.md](docs/README.md) | Documentation index |
| [docs/communication.md](docs/communication.md) | Backend-frontend communication protocols |
| [docs/dependency-injection.md](docs/dependency-injection.md) | DI system usage and architecture |
| [docs/build-system.md](docs/build-system.md) | Build pipeline and configuration |
| [docs/frontend-architecture.md](docs/frontend-architecture.md) | Angular application structure |
| [docs/backend-architecture.md](docs/backend-architecture.md) | Zig backend structure |
| [docs/UTILITIES.md](docs/UTILITIES.md) | Desktop utility modules |

## Troubleshooting

### Frontend Build Fails

1. Clear node modules and reinstall:
   ```bash
   rm -rf frontend/node_modules
   cd frontend && bun install
   ```

2. Clear Rspack cache:
   ```bash
   rm -rf frontend/.rspack_cache
   ```

### Backend Build Fails

1. Clear Zig cache:
   ```bash
   rm -rf .zig-cache
   ```

2. Check Zig version:
   ```bash
   zig version
   ```

3. Verify WebUI sources exist:
   ```bash
   ls thirdparty/webui/src
   ```

### Application Won't Launch

1. Check frontend build output exists:
   ```bash
   ls frontend/dist/browser/index.html
   ```

2. Verify backend executable was created:
   ```bash
   ls zig-out/bin/zig_webui_angular_rspack
   ```

3. Check for browser installation:
   ```bash
   chromium --version
   ```

4. Review terminal output for errors

### Common Issues

- **Port already in use**: Kill existing processes using the port
- **Frontend not found**: Run `bun run build:rspack` in frontend directory
- **WebUI window not appearing**: Check browser installation and display settings

## License

MIT License

## Acknowledgments

- [WebUI](https://webui.me) - Native window library
- [Angular](https://angular.dev) - Frontend framework
- [Rspack](https://rspack.dev) - Fast bundler
- [Zig](https://ziglang.org) - Systems programming language
- [CivetWeb](https://github.com/civetweb/civetweb) - Embedded HTTP/WebSocket server

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
- [Development](#development)
- [Documentation](#documentation)

## Overview

This project demonstrates a complete desktop application stack using:

- **Backend**: Zig with WebUI library for native window management
- **Frontend**: Angular 21 with Rspack bundler
- **Communication**: WebUI WebSocket bridge (no HTTP/HTTPS)
- **Desktop Window**: Native Chromium-based window via WebUI

The application runs as a true desktop app with a native window, not a web server.

## Features

- Native desktop window (Chromium-based via WebUI)
- Angular frontend with modern tooling (Rspack, Bun)
- Zig backend with dependency injection system
- WebSocket-based backend-frontend communication (no HTTP/HTTPS)
- Type-safe function binding between backend and frontend
- Event-driven architecture
- Hot reload support for development
- Optimized production builds

## Architecture

```
+----------------------------------------------------------+
|                  Desktop Application                      |
|  +------------------+        +--------------------------+ |
|  |   Frontend       |        |   Backend                | |
|  |   (Angular)      |        |   (Zig + WebUI)          | |
|  |                  |        |                          | |
|  |  - Components    |        |  - Window Management     | |
|  |  - Services      |        |  - Function Bindings     | |
|  |  - WebSocket     |<------>|  - DI Container          | |
|  |    Client        |  WS    |  - Event Handlers        | |
|  +------------------+        +--------------------------+ |
+----------------------------------------------------------+
         |                                      |
         +--------------------------------------+
                    WebUI Bridge
              (WebSocket-based RPC)
```

## Quick Start

### Prerequisites

- Zig 0.14.1 or later
- Bun 1.3.10 or later
- Chromium browser (for desktop window)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd zig-webui-angular-rspack

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
zig-webui-angular-rspack/
├── frontend/                    # Angular frontend application
│   ├── src/                     # Source files
│   │   ├── core/                # Core services
│   │   ├── views/               # Components/views
│   │   ├── models/              # Data models
│   │   └── types/               # Type definitions
│   ├── angular.json             # Angular configuration
│   ├── rspack.config.js         # Rspack bundler config
│   └── package.json             # Node dependencies
│
├── src/                         # Zig backend source
│   ├── main.zig                 # Application entry point
│   ├── di.zig                   # Dependency injection system
│   └── communication/           # Communication protocols
│
├── thirdparty/                  # Third-party libraries
│   └── webui/                   # WebUI library
│
├── build.zig                    # Zig build configuration
├── run.sh                       # Build and run script
└── docs/                        # Documentation
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
```

### Debugging

1. Enable debug logging in build.zig
2. Use browser DevTools for frontend debugging
3. Check terminal output for backend logs

## Documentation

| Document | Description |
|----------|-------------|
| [docs/communication.md](docs/communication.md) | Backend-frontend communication protocols |
| [docs/dependency-injection.md](docs/dependency-injection.md) | DI system usage and architecture |
| [docs/build-system.md](docs/build-system.md) | Build pipeline and configuration |
| [docs/frontend-architecture.md](docs/frontend-architecture.md) | Angular application structure |
| [docs/backend-architecture.md](docs/backend-architecture.md) | Zig backend structure |

## License

MIT License

## Acknowledgments

- [WebUI](https://webui.me) - Native window library
- [Angular](https://angular.dev) - Frontend framework
- [Rspack](https://rspack.dev) - Fast bundler
- [Zig](https://ziglang.org) - Systems programming language

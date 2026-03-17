# Project Documentation

Welcome to the Zig WebUI Angular Rspack documentation.

## Table of Contents

1. [Overview](00-overview.md) - Project overview and quick start
2. [Communication](01-communication.md) - All communication approaches
3. [Backend Architecture](02-backend-architecture.md) - Zig backend structure
4. [Frontend Architecture](03-frontend-architecture.md) - Angular application structure
5. [Build System](04-build-system.md) - Build and deployment
6. [Dependency Injection](05-dependency-injection.md) - DI system usage
7. [Utilities](06-utilities.md) - Desktop utility modules

## Communication Approaches

This project supports **3 communication approaches**:

| # | Approach | Protocol | Use Case |
|---|----------|----------|----------|
| 1 | WebUI Bridge | WebSocket (via WebUI) | Standard RPC calls |
| 2 | Pure WebSocket | WebSocket (ws://) | Real-time, pub/sub |
| 3 | Event Bus | Internal | Backend internal messaging |

### Quick Comparison

| Feature | WebUI Bridge | Pure WebSocket | Event Bus |
|---------|--------------|----------------|-----------|
| **Frontend↔Backend** | ✅ | ✅ | ❌ |
| **Latency** | ~1-3ms | ~1-3ms | <1ms |
| **Pub/Sub** | Via events | Native | Native |
| **Complexity** | Low | Medium | Low |

### Which to Use?

- **WebUI Bridge**: Standard function calls between frontend and backend
- **Pure WebSocket**: Real-time features, multiple connections, streaming
- **Event Bus**: Internal backend event handling

See [01-communication.md](01-communication.md) for detailed documentation.

## Quick Links

- [Main README](../README.md) - Project overview
- [Quick Start Guide](../QUICKSTART.md) - Quick reference

## Project Structure

```
starter-zig-webui-angular-rspack/
├── src/                         # Zig backend
│   ├── main.zig                # Application entry point
│   ├── di.zig                  # Dependency injection + EventBus
│   ├── communication/          # Communication protocols
│   │   └── websocket_server.zig # Pure WebSocket server
│   └── utils/                  # Utility modules
├── frontend/                   # Angular frontend
│   ├── src/
│   │   ├── core/             # Services
│   │   │   ├── webui-bridge.service.ts    # WebUI Bridge
│   │   │   ├── websocket.service.ts        # Pure WebSocket
│   │   │   ├── api.service.ts             # API layer
│   │   │   └── ...
│   │   └── views/            # Components
├── docs/                       # Documentation
├── build.zig                   # Zig build script
├── run.sh                      # Build runner script
└── README.md                   # Main documentation
```

## Getting Started

### Prerequisites

- Zig 0.14.1 or later
- Bun 1.3.10 or later
- Chromium browser

### Build and Run

```bash
# Build and run
./run.sh

# Development mode
./run.sh dev

# Manual build
cd frontend && bun run build
zig build -Doptimize=ReleaseSafe
./zig-out/bin/zig_webui_angular_rspack
```

## Key Features

- **Dependency Injection**: 11 services + EventBus
- **3 Communication Approaches**: WebUI Bridge, Pure WebSocket, Event Bus
- **Result Types**: "Errors as values" pattern
- **Desktop Utilities**: File system, clipboard, notifications, process, settings

## Development Commands

```bash
# Backend
zig build -Doptimize=Debug    # Debug build
zig build test                 # Run tests

# Frontend
cd frontend
bun install                   # Install deps
bun run dev                   # Dev server
bun run build:rspack          # Production build
```

## Additional Resources

- [Communication Approaches](../COMMUNICATION_APPROACHES.md)
- [Communication Summary](../COMMUNICATION_SUMMARY.md)
- [WebSocket Communication](../WEBSOCKET_COMMUNICATION.md)

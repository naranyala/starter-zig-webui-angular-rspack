# Documentation Index

Welcome to the Zig WebUI Angular Rspack documentation.

## Getting Started

- [README](../README.md) - Project overview and quick start
- [Build System](build-system.md) - How to build and run the application
- [Quick Start Guide](../QUICKSTART.md) - Quick reference for common tasks

## Architecture

- [Frontend Architecture](frontend-architecture.md) - Angular application structure
- [Backend Architecture](backend-architecture.md) - Zig backend structure
- [Communication](communication.md) - Backend-frontend communication
- [Dependency Injection](dependency-injection.md) - DI system usage

## Development

- [Build Commands](build-system.md#build-commands) - Available build commands
- [Development Mode](build-system.md#build-modes) - Debug vs release builds
- [Testing](build-system.md#testing) - How to run tests
- [Troubleshooting](build-system.md#troubleshooting) - Common issues and solutions

## API Reference

### Frontend Services

- [ApiService](frontend-architecture.md#apiservice) - Backend communication
- [WebuiBridgeService](frontend-architecture.md#webuibridgeservice) - WebUI wrapper
- [WebSocketService](frontend-architecture.md#websocketservice) - WebSocket client

### Backend Services

- [LoggerService](dependency-injection.md#loggerservice) - Logging
- [ConfigService](dependency-injection.md#configservice) - Configuration
- [WindowService](dependency-injection.md#windowservice) - Window management
- [EventService](dependency-injection.md#eventservice) - Event handling
- [BackendApiService](dependency-injection.md#backendapiservice) - API tracking

## Communication Protocols

- [WebUI Bridge](communication.md#webui-bridge) - Primary communication method
- [Pure WebSocket](communication.md#pure-websocket) - Alternative for real-time
- [Message Format](communication.md#message-format) - JSON message structure
- [Error Handling](communication.md#error-handling) - Error response format

## Build and Deployment

- [Build Pipeline](build-system.md#build-pipeline) - Complete build process
- [Build Modes](build-system.md#build-modes-comparison) - Debug vs Release
- [Build Artifacts](build-system.md#build-artifacts) - Output files
- [Clean Build](build-system.md#clean-build) - How to perform clean builds

## Project Structure

```
zig-webui-angular-rspack/
├── frontend/              # Angular frontend
│   ├── src/
│   │   ├── core/         # Core services
│   │   ├── views/        # Components
│   │   └── models/       # Data models
│   └── dist/             # Build output
│
├── src/                   # Zig backend
│   ├── main.zig          # Entry point
│   ├── di.zig            # Dependency injection
│   └── communication/    # Communication protocols
│
├── thirdparty/            # Third-party libraries
│   └── webui/            # WebUI library
│
├── docs/                  # Documentation
├── build.zig              # Zig build config
├── run.sh                 # Build script
└── README.md              # Project overview
```

## Quick Reference

### Build Commands

```bash
./run.sh              # Build and run (release)
./run.sh dev          # Build and run (debug)
./run.sh --no-run     # Build only
./run.sh --clean      # Clean build
```

### Frontend Commands

```bash
cd frontend
bun install           # Install dependencies
bun run dev           # Start dev server
bun run build:rspack  # Build for production
bun test              # Run tests
```

### Backend Commands

```bash
zig build             # Build release
zig build -Doptimize=Debug  # Build debug
zig build test        # Run tests
zig build run         # Build and run
```

## Additional Resources

- [Communication Approaches](../COMMUNICATION_APPROACHES.md) - Detailed protocol comparison
- [Communication Summary](../COMMUNICATION_SUMMARY.md) - Quick reference
- [WebSocket Communication](../WEBSOCKET_COMMUNICATION.md) - WebSocket architecture

## Support

For issues and questions:

1. Check the [Troubleshooting](build-system.md#troubleshooting) section
2. Review the [Communication](communication.md) documentation
3. Examine the source code in `src/` and `frontend/src/`

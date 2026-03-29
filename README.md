# Zig WebUI Angular Rspack

A modern desktop application framework combining Zig backend with Angular frontend, communicating via WebSocket bridge.

## Project Overview

This project provides a complete desktop application stack with:

- **Backend**: Zig with WebUI library for native window management
- **Frontend**: Angular 21 with Rspack bundler
- **Communication**: Pure WebSocket (no HTTP/HTTPS) via WebUI bridge
- **Database**: SQLite and DuckDB integration
- **Desktop**: Native Chromium-based window

## Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Backend | Zig | 0.14.1+ |
| Frontend | Angular + Rspack | Angular 21 |
| Window | WebUI (Chromium) | 2.5.0-beta.4 |
| Package Manager | Bun | 1.3.10+ |
| Database | SQLite, DuckDB | Latest |
| Communication | WebSocket | Native |

## Quick Start

### Prerequisites

- Zig 0.14.1 or higher
- Bun 1.3.10 or higher
- Chromium browser

### Installation

```bash
# Clone repository
git clone <repository-url>
cd starter-zig-webui-angular-rspack

# Install frontend dependencies
cd frontend
bun install
cd ..

# Build and run
./run-fast.sh dev
```

### Build Commands

| Command | Description | Time |
|---------|-------------|------|
| `./run-fast.sh dev` | Full debug build | ~25s |
| `./run-fast.sh backend-only` | Backend only (fastest) | ~5s |
| `./run-fast.sh watch` | Watch mode with auto-rebuild | Auto |
| `./run-fast.sh --clean dev` | Clean build | ~30s |

## Project Structure

```
starter-zig-webui-angular-rspack/
├── src/                          # Zig Backend
│   ├── main.zig                  # Entry point, DI bootstrap
│   ├── di.zig                    # Dependency injection system
│   ├── errors.zig                # Unified error types
│   ├── logger.zig                # Logging module
│   ├── db/                       # Database layer
│   │   └── sqlite.zig            # SQLite bindings
│   ├── handlers/                 # WebUI request handlers
│   │   └── db_handlers.zig       # CRUD operations
│   └── utils/                    # Utility modules
│
├── frontend/                     # Angular Frontend
│   ├── src/
│   │   ├── core/                 # Services (13 total)
│   │   │   ├── api.service.ts    # API abstraction
│   │   │   ├── logger.service.ts # Logging service
│   │   │   └── webui/            # WebUI bridge
│   │   ├── views/                # Components
│   │   │   ├── dashboard/        # Main dashboard
│   │   │   ├── docs/             # Documentation viewer
│   │   │   └── demo/             # Demo components
│   │   └── app.routes.ts         # Application routes
│   ├── package.json
│   └── rspack.config.js
│
├── thirdparty/                   # Third-party libraries
│   ├── webui/                    # WebUI library
│   └── sqlite3/                  # SQLite amalgamation
│
├── docs/                         # Documentation
│   ├── 01-communication.md       # Communication architecture
│   ├── 02-backend-architecture.md
│   └── 03-frontend-architecture.md
│
├── build.zig                     # Zig build configuration
├── run-fast.sh                   # Fast development script
└── README.md
```

## Architecture

### Communication Flow

```
Frontend                    Backend
    │                          │
    │  window.ping()          │
    │─────────────────────────►│ webui.bind("ping", handler)
    │                          │    │
    │                          │    └─► webui.run(window, "pong")
    │◄─────────────────────────│
    │  "pong"                 │
```

### Component Diagram

```
+------------------------------------------------------------------+
|                     Desktop Application                           |
|                                                                   |
|  +---------------------+         +-----------------------------+  |
|  |    Frontend         |         |      Backend                |  |
|  |    (Angular)        |         |      (Zig + WebUI)          |  |
|  |                     |         |                             |  |
|  |  WebUIBridgeService |<------->|  webui.bind()               |  |
|  |  ApiService         |  WebSocket |  webui.run()             |  |
|  |  LoggerService      |         |  DI Container               |  |
|  +---------------------+         +-----------------------------+  |
|                              |                                    |
|                     WebUI Bridge                                  |
|                   (Native WebSocket)                              |
+-------------------------------------------------------------------+
```

## Key Features

### Backend

- **Dependency Injection**: Angular-inspired DI system with 11 services
- **Event Bus**: Pub/sub event system for decoupled communication
- **SQLite Integration**: Full CRUD operations with input validation
- **DuckDB Integration**: Analytics-ready column-oriented database
- **Graceful Shutdown**: Proper resource cleanup on exit
- **Thread Safety**: Atomic operations and mutex protection
- **Input Validation**: Comprehensive validation for all user inputs

### Frontend

- **Modern Angular**: Angular 21 with signal-based reactivity
- **Rspack Bundler**: Fast builds with esbuild
- **Documentation System**: In-app documentation viewer
- **CRUD Demos**: Complete SQLite and DuckDB demo applications
- **Service Layer**: 13 core services for common operations
- **Routing**: Full router integration with lazy loading support

### Development Experience

- **Fast Builds**: Parallel frontend/backend compilation
- **Watch Mode**: Auto-rebuild on file changes
- **Backend-Only Mode**: Skip Angular for 5-second iterations
- **Build Caching**: Incremental builds based on file hashes
- **Hot Module Replacement**: Instant frontend updates

## Recent Improvements

### Critical Fixes (Latest Release)

1. **Signal Handler Safety**: Thread-safe signal handling with atomic operations
2. **Memory Leak Prevention**: EventBus subscription cleanup
3. **Input Validation**: SQL injection prevention and data validation
4. **Graceful Shutdown**: Ordered resource cleanup sequence
5. **Error Handling**: Safe Result types instead of unsafe unwrap()
6. **Module System**: Fixed shared module imports in build system

### Developer Experience

1. **Fast Build Script**: `run-fast.sh` with parallel and incremental builds
2. **Backend-Only Mode**: 5-second iteration time for backend work
3. **Watch Mode**: Auto-rebuild on file changes
4. **Documentation System**: In-app documentation viewer
5. **CRUD Demos**: Production-ready SQLite and DuckDB demos

## Testing

### Backend Tests

```bash
# Run all tests
zig build test

# Run specific test
zig build test -- --test-filter "test name"
```

### Frontend Tests

```bash
# Unit tests
cd frontend && bun test

# With coverage
cd frontend && bun test --coverage

# E2E tests
cd frontend && bun test:e2e
```

## Documentation

### In-Application Documentation

Access documentation directly in the application:

1. Open the application
2. Click "All Docs" in the navigation
3. Browse documentation groups:
   - Getting Started
   - Critical Fixes
   - Developer Experience
   - Backend Guide
   - Frontend Guide
   - Build System
   - API Reference
   - Changelog

### Documentation Files

| File | Description |
|------|-------------|
| `CHANGELOG.md` | Complete change history with explanations |
| `CRITICAL_FIXES_SUMMARY.md` | All critical fixes applied |
| `DX_SUMMARY.md` | Developer experience improvements |
| `DX_IMPROVEMENTS.md` | Complete DX improvement plan |
| `DEV_QUICKSTART.md` | Daily development commands |
| `frontend/DOCUMENTATION_SYSTEM.md` | In-app docs guide |
| `frontend/CRUD_DEMOS.md` | CRUD demos documentation |

## Configuration

### Build Configuration

Edit `build.zig` for backend build options:

```zig
// Debug build
zig build -Doptimize=Debug

// Release build
zig build -Doptimize=ReleaseFast
```

### Frontend Configuration

Edit `frontend/rspack.config.js` for frontend build options:

```javascript
// Development mode
export BUILD_TYPE=debug

// Production mode
export BUILD_TYPE=release
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BUILD_TYPE` | debug or release | release |
| `FRONTEND_PATH` | Custom frontend path | auto |
| `PARALLEL` | Enable parallel builds | true |
| `WATCH` | Enable watch mode | false |

## Troubleshooting

### Common Issues

**Frontend not built**
```bash
./run-fast.sh frontend-only
```

**Binary not found**
```bash
./run-fast.sh --clean backend-only
```

**Zig cache corrupted**
```bash
rm -rf .zig-cache && zig build
```

**Node modules broken**
```bash
cd frontend && rm -rf node_modules && bun install
```

### Build Issues

**Module import errors**
```bash
# Clean and rebuild
./run-fast.sh --clean dev
```

**TypeScript errors**
```bash
cd frontend
rm -rf .angular
bun run build
```

## Performance

### Build Times

| Build Type | Time | Use Case |
|------------|------|----------|
| Backend only | 5s | Backend logic changes |
| Full parallel | 25s | Full stack changes |
| Watch mode | <1s | Active development |
| Clean build | 30s | Fresh build |

### Runtime Performance

| Metric | Target | Actual |
|--------|--------|--------|
| Initial load | <3s | ~2s |
| Bundle size | <600KB | ~1MB |
| Memory usage | <100MB | TBD |
| API latency | <10ms | ~3ms |

## Security

### Implemented Security Measures

- Input validation on all database operations
- SQL injection prevention via parameterized queries
- Thread-safe signal handling
- Memory leak prevention
- Safe error handling (no panics)
- Graceful shutdown with resource cleanup

### Security Considerations

- No authentication layer (add for production)
- No rate limiting (add for production)
- TLS disabled (enable with `-DSSL` flag)
- Input sanitization for XSS (add for production)

## Contributing

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make changes
4. Run tests
5. Submit pull request

### Code Style

**Backend (Zig)**
- Use snake_case for functions and variables
- Use PascalCase for types
- Add error handling for all fallible operations
- Document public APIs

**Frontend (TypeScript)**
- Use camelCase for functions and variables
- Use PascalCase for components and classes
- Use signals for reactive state
- Add type annotations

## License

MIT License

## Acknowledgments

- [Zig Programming Language](https://ziglang.org/)
- [WebUI Library](https://github.com/webui-dev/webui)
- [Angular Framework](https://angular.dev/)
- [Rspack Bundler](https://rspack.dev/)
- [SQLite Database](https://sqlite.org/)
- [DuckDB Database](https://duckdb.org/)

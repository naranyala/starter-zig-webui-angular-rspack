# Build System

This document describes the build pipeline and configuration.

## Overview

The build system handles:
1. Frontend compilation (Angular with Rspack)
2. Backend compilation (Zig)
3. Application packaging

## Build Pipeline

```
+------------------+     +------------------+     +------------------+
|   Frontend       |     |   Backend        |     |   Application    |
|   Build          |     |   Build          |     |   Launch         |
|                  |     |                  |     |                  |
|  bun install     |---->|  zig build       |---->|  Run executable  |
|  rspack build    |     |  link webui      |     |  Open window     |
+------------------+     +------------------+     +------------------+
```

## Build Script

`run.sh` - Main build script:

```bash
# Build and run (release)
./run.sh

# Debug mode
./run.sh dev

# Build only
./run.sh --no-run

# Clean build
./run.sh --clean
```

## Options

| Option | Description |
|--------|-------------|
| (none) | Release build and run |
| dev | Debug build and run |
| --clean | Clean before build |
| --no-frontend | Skip frontend |
| --no-zig | Skip Zig build |
| --no-run | Build only |

## Frontend Build

```bash
cd frontend

# Install dependencies
bun install

# Production build
bun run build:rspack

# Development
bun run dev

# Watch mode
bun run watch
```

Output: `frontend/dist/browser/`

## Backend Build

```bash
# Release build
zig build -Doptimize=ReleaseSafe

# Debug build
zig build -Doptimize=Debug

# Run tests
zig build test

# Build and run
zig build run
```

Output: `zig-out/bin/zig_webui_angular_rspack`

## Build Modes

| Aspect | Debug | Release |
|--------|-------|---------|
| Optimization | None | Full |
| Source Maps | Yes | No |
| Binary Size | Larger | Smaller |

## Artifacts

### Frontend
```
frontend/dist/browser/
├── index.html
├── main.[hash].js
├── angular.[hash].js
└── *.css
```

### Backend
```
zig-out/bin/
└── zig_webui_angular_rspack
```

## Clean Build

```bash
./run.sh --clean

# Or manually
rm -rf zig-out .zig-cache
rm -rf frontend/dist
```

## Troubleshooting

### Frontend Build Fails

```bash
rm -rf frontend/node_modules
cd frontend && bun install
rm -rf frontend/.rspack_cache
```

### Backend Build Fails

```bash
rm -rf .zig-cache
zig version  # Verify Zig 0.14.1
```

### Application Won't Launch

1. Check frontend built: `ls frontend/dist/browser/index.html`
2. Verify backend executable: `ls zig-out/bin/`
3. Check browser: `chromium --version`

## Related Documentation

- [Communication](01-communication.md)
- [Frontend Architecture](03-frontend-architecture.md)
- [Backend Architecture](02-backend-architecture.md)

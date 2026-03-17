# Build System

This document describes the build pipeline and configuration for the project.

## Overview

The build system handles:

1. Frontend compilation (Angular with Rspack)
2. Backend compilation (Zig)
3. Application packaging
4. Development and production modes

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

The main build script is `run.sh`.

### Usage

```bash
# Build and run (release mode)
./run.sh

# Build and run (debug mode)
./run.sh dev

# Build only
./run.sh --no-run

# Clean build
./run.sh --clean

# Show help
./run.sh --help
```

### Options

| Option | Description |
|--------|-------------|
| (none) | Build and run in release mode |
| dev | Build and run in debug mode |
| --clean | Clean build artifacts before building |
| --debug | Build in debug mode |
| --no-frontend | Skip frontend build |
| --no-zig | Skip Zig build |
| --no-run | Build only, don't launch |
| --help | Show help message |

### Environment Variables

| Variable | Values | Description |
|----------|--------|-------------|
| BUILD_TYPE | debug, release | Set build type |
| FRONTEND_BUILD | true, false | Enable frontend build |
| ZIG_BUILD | true, false | Enable Zig build |
| RUN_APP | true, false | Run application after build |
| CLEAN | true, false | Clean before build |

## Frontend Build

### Configuration

- **Bundler**: Rspack
- **Package Manager**: Bun
- **Framework**: Angular 21

### Build Commands

```bash
cd frontend

# Install dependencies
bun install --frozen-lockfile

# Development build
bun run build:rspack

# Watch mode
bun run watch

# Development server
bun run dev
```

### Output

- **Directory**: `frontend/dist/browser/`
- **Files**: JavaScript bundles, CSS, HTML, assets

### Build Modes

| Mode | Command | Output | Source Maps |
|------|---------|--------|-------------|
| Release | `bun run build:rspack` | Optimized bundles | No |
| Debug | `BUILD_TYPE=debug bun run build:rspack` | Unoptimized | Yes |

### Rspack Configuration

Key settings in `frontend/rspack.config.js`:

```javascript
{
  entry: './src/main.ts',
  output: {
    path: './dist/browser',
    filename: '[name].[contenthash].js',
  },
  optimization: {
    minimize: true,
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        angular: {
          test: /@angular/,
          name: 'angular',
        },
      },
    },
  },
}
```

## Backend Build

### Configuration

- **Language**: Zig 0.14.1
- **Build Tool**: Zig build system
- **Library**: WebUI (static linking)

### Build Commands

```bash
# Release build
zig build -Doptimize=ReleaseFast

# Debug build
zig build -Doptimize=Debug

# Run tests
zig build test

# Build and run
zig build run
```

### Output

- **Executable**: `zig-out/bin/zig_webui_angular_rspack`
- **Format**: Native binary

### Build Configuration

Key settings in `build.zig`:

```zig
pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});
    
    // WebUI static library
    const webui_lib = b.addStaticLibrary(.{
        .name = "webui",
        .target = target,
        .optimize = optimize,
    });
    
    // Main executable
    const exe = b.addExecutable(.{
        .name = "zig_webui_angular_rspack",
        .root_module = exe_mod,
    });
    
    exe.linkLibrary(webui_lib);
    b.installArtifact(exe);
}
```

### Compiler Flags

| Flag | Description |
|------|-------------|
| -DNO_CACHING | Disable WebUI caching |
| -DNO_CGI | Disable CGI support |
| -DUSE_WEBSOCKET | Enable WebSocket support |
| -DNO_SSL | Disable SSL (localhost only) |

## Build Modes Comparison

| Aspect | Debug | Release |
|--------|-------|---------|
| Optimization | None | Full (ReleaseFast) |
| Source Maps | Yes | No |
| Build Time | Fast | Slower |
| Binary Size | Larger | Smaller |
| Runtime Speed | Slower | Faster |
| Use Case | Development | Production |

## Build Artifacts

### Frontend

```
frontend/dist/browser/
├── index.html
├── main.[hash].js
├── angular-[hash].js
├── vendor.[hash].js
├── zone.[hash].js
├── runtime.[hash].js
├── *.css
└── assets/
```

### Backend

```
zig-out/bin/
└── zig_webui_angular_rspack
```

### Cache Directories

```
.zig-cache/          # Zig build cache
frontend/.rspack_cache/  # Rspack build cache
```

## Clean Build

To perform a clean build:

```bash
# Using script
./run.sh --clean

# Manual clean
rm -rf zig-out .zig-cache
rm -rf frontend/dist frontend/.rspack_cache
./run.sh
```

## Troubleshooting

### Frontend Build Fails

1. Clear node modules: `rm -rf frontend/node_modules`
2. Reinstall: `cd frontend && bun install`
3. Clear cache: `rm -rf frontend/.rspack_cache`

### Backend Build Fails

1. Clear Zig cache: `rm -rf .zig-cache`
2. Check Zig version: `zig version`
3. Verify WebUI sources: `ls thirdparty/webui/src`

### Application Won't Launch

1. Check frontend build output exists
2. Verify backend executable was created
3. Check for browser installation: `chromium --version`
4. Review terminal output for errors

## Performance Tips

1. **Use Release Mode**: For production, always use release builds
2. **Enable Caching**: Keep build caches for faster rebuilds
3. **Incremental Builds**: Use watch mode for development
4. **Parallel Builds**: Frontend and backend can build in parallel

## Continuous Integration

Example CI configuration:

```yaml
name: Build

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Zig
        uses: goto-bus-stop/setup-zig@v2
        with:
          version: 0.14.1
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
      
      - name: Build
        run: ./run.sh --no-run
      
      - name: Test
        run: zig build test
```

## Related Documentation

- [Communication](communication.md)
- [Dependency Injection](dependency-injection.md)
- [Frontend Architecture](frontend-architecture.md)
- [Backend Architecture](backend-architecture.md)

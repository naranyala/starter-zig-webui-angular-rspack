# Quick Start Guide

## Build and Run

### Release Mode (Optimized)
```bash
./run.sh
```

### Debug/Development Mode
```bash
./run.sh dev
```

## What This Does

1. **Builds Frontend** - Compiles Angular app with Rspack
2. **Builds Backend** - Compiles Zig executable with WebUI
3. **Launches Desktop App** - Opens native desktop window

## Commands

| Command | Description |
|---------|-------------|
| `./run.sh` | Build and run (release mode) |
| `./run.sh dev` | Build and run (debug mode) |
| `./run.sh --clean` | Clean build and run |
| `./run.sh --no-run` | Build only, don't launch |
| `./run.sh --help` | Show all options |

## Output

- **Frontend**: `frontend/dist/browser/`
- **Backend**: `zig-out/bin/zig_webui_angular_rspack`

## Architecture

```
┌─────────────────────────────────────┐
│     Desktop Window (Chromium)       │
│  ┌───────────────────────────────┐  │
│  │    Angular Frontend           │  │
│  │    - Components               │  │
│  │    - Services                 │  │
│  └──────────────┬────────────────┘  │
│                 │ WebSocket         │
│                 │ (WebUI Bridge)    │
└─────────────────┼───────────────────┘
                  │
┌─────────────────┼───────────────────┐
│                 ▼                   │
│  ┌───────────────────────────────┐  │
│  │      Zig Backend              │  │
│  │  - WebUI Core                 │  │
│  │  - Function Bindings          │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

## Communication

- **NO HTTP/HTTPS** - All communication via WebUI WebSocket bridge
- **Direct function binding** - Frontend calls backend functions directly
- **Event-driven** - Backend can push events to frontend

## Requirements

- **Zig** v0.14.1+
- **Bun** v1.3.10+
- **Chromium** browser (for desktop window)

## Troubleshooting

### Browser window doesn't open
- Ensure you have a display server running (X11/Wayland)
- Check that Chromium is installed: `chromium --version`

### Build fails
- Clean and rebuild: `./run.sh --clean`
- Check dependencies: `zig version` and `bun --version`

### Connection errors
- The app uses localhost WebSocket - ensure no firewall blocking
- Check backend logs in terminal for errors

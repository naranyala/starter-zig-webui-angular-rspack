# Zig WebUI Angular Rspack

A modern desktop application framework combining:
- **Backend**: Zig with WebUI library for native window management
- **Frontend**: Angular 21 with Rspack bundler
- **Communication**: WebSocket-based (NO HTTP/HTTPS) via WebUI bridge
- **Desktop**: Native Chromium-based window

---

## Table of Contents

- [Project Overview](#project-overview)
- [Project Structure](#project-structure)
- [Backend Architecture](#backend-architecture)
- [Frontend Architecture](#frontend-architecture)
- [Communication Architecture](#communication-architecture)
- [Critics & Suggestions](#critics--suggestions)
- [Quick Start](#quick-start)
- [License](#license)

---

## Project Overview

This project demonstrates a complete desktop application stack using:

```
┌─────────────────────────────────────────────────────────────┐
│                    Desktop Application                        │
│                                                              │
│  ┌─────────────────────┐      ┌─────────────────────────┐ │
│  │     Frontend        │      │       Backend            │ │
│  │     (Angular)       │      │       (Zig + WebUI)     │ │
│  │                     │      │                         │ │
│  │  WebuiBridgeService│◄────►│  webui.bind()          │ │
│  │  WebSocketService   │      │  webui.run()           │ │
│  │  API Service       │  WS  │  DI Container          │ │
│  └─────────────────────┘      └─────────────────────────┘ │
│                              │                              │
│                     WebUI Bridge                           │
│                   (Native WebSocket)                        │
└─────────────────────────────────────────────────────────────┘
```

**Key Technologies:**
| Component | Technology | Version |
|-----------|------------|---------|
| Backend | Zig | 0.14.1+ |
| Frontend | Angular + Rspack | Angular 21 |
| Window | WebUI (Chromium) | 2.5.0-beta.4 |
| Package Manager | Bun | 1.3.10+ |
| Communication | WebSocket | Native |

---

## Project Structure

```
starter-zig-webui-angular-rspack/
├── src/                          # Zig Backend
│   ├── main.zig                 # Entry point, DI bootstrap, event loop
│   ├── di.zig                    # Dependency injection system (~1500 lines)
│   ├── root.zig                  # Package root convention
│   │
│   ├── communication/            # Communication layer
│   │   └── websocket_server.zig  # Pure WebSocket server (alternative)
│   │
│   └── utils/                   # Utility modules
│       ├── fs.zig              # File system operations
│       ├── process.zig         # Process management
│       ├── clipboard.zig       # Clipboard operations
│       ├── notification.zig    # Desktop notifications
│       ├── settings.zig        # Persistent configuration
│       ├── task_queue.zig      # Background job processing
│       └── system.zig          # System information
│
├── frontend/                    # Angular Frontend
│   ├── src/
│   │   ├── main.ts            # Bootstrap, event bus setup
│   │   ├── index.html         # Entry HTML
│   │   │
│   │   ├── core/              # Services (13 total)
│   │   │   ├── webui-bridge.service.ts    # Primary communication
│   │   │   ├── websocket.service.ts        # Alternative WebSocket
│   │   │   ├── api.service.ts             # Type-safe API wrapper
│   │   │   ├── communication.service.ts   # Multi-channel abstraction
│   │   │   ├── logger.service.ts          # Signal-based logging
│   │   │   ├── notification.service.ts    # Toast notifications
│   │   │   ├── storage.service.ts         # localStorage wrapper
│   │   │   ├── clipboard.service.ts      # Clipboard operations
│   │   │   ├── theme.service.ts          # Dark/light mode
│   │   │   ├── loading.service.ts         # Loading states
│   │   │   ├── network-monitor.service.ts # Online/offline
│   │   │   ├── winbox.service.ts          # Modal windows
│   │   │   └── devtools.service.ts       # Backend DevTools
│   │   │
│   │   ├── views/              # Components
│   │   │   ├── app.component.ts          # Main 3-column layout
│   │   │   ├── home/                      # Home page
│   │   │   ├── auth/                      # Authentication
│   │   │   ├── devtools/                  # Debug panel
│   │   │   └── sqlite/                    # Database CRUD
│   │   │
│   │   ├── models/              # TypeScript interfaces
│   │   ├── types/               # Type definitions
│   │   ├── environments/        # Environment config
│   │   └── assets/              # Static assets
│   │
│   ├── package.json
│   ├── angular.json
│   └── rspack.config.mjs
│
├── thirdparty/                  # Third-party libraries
│   ├── webui/                  # WebUI library
│   │   ├── include/webui.h      # C API (1483 lines)
│   │   ├── src/webui.c          # Core implementation
│   │   ├── src/civetweb/        # Embedded HTTP/WebSocket server
│   │   └── src/webui.zig        # Zig bindings
│   │
│   └── webview/                 # Native webview (per-platform)
│
├── docs/                        # Documentation
│   ├── 01-communication.md      # Communication architecture
│   ├── 02-backend-architecture.md
│   └── 03-frontend-architecture.md
│
├── build.zig                    # Zig build configuration
├── build.sh                     # Build helper
├── run.sh                       # Quick start script
└── README.md
```

---

## Backend Architecture

### Entry Point Flow (`main.zig`)

```zig
pub fn main() !void {
    // 1. Setup signal handlers (SIGINT, SIGTERM)
    try setupSignalHandlers();

    // 2. Bootstrap DI system
    const injector = try di.bootstrap();
    defer injector.destroy();

    // 3. Validate frontend path
    try validateFrontendPath();

    // 4. Create WebUI window
    const window = webui.newWindow();

    // 5. Bind backend functions
    _ = webui.bind(window, "ping", handlePing);
    _ = webui.bind(window, "getData", handleGetData);
    _ = webui.bind(window, "emitEvent", handleEmitEvent);

    // 6. Show window
    _ = webui.showBrowser(window, html_content, .Chrome);

    // 7. Event loop (non-blocking)
    while (!should_exit) {
        webui.waitAsync();
    }

    // 8. Cleanup
    injector.shutdown();
}
```

### Dependency Injection System (`di.zig`)

The DI system provides 11 services with Angular-inspired patterns:

| Service | Purpose | Implementation |
|---------|---------|----------------|
| LoggerService | Logging | Console + memory buffer |
| ConfigService | Key-value config | In-memory |
| WindowService | Window management | WebUI wrapper |
| EventService | Event handlers | WebUI event binding |
| BackendApiService | API tracking | Call counter |
| NotificationService | Desktop notifications | Stub |
| ClipboardService | Clipboard | Stub |
| StorageService | Key-value storage | In-memory |
| HttpService | HTTP client | **REMOVED** (not used) |
| ProcessService | Process management | Stub |
| EventBus | Pub/sub | Priority queues |

**Key Patterns:**

```zig
// Bootstrap
const injector = try di.bootstrap();
defer injector.destroy();

// Service access
const logger = injector.getLogger();
logger.info("Started");

// Result types (errors as values)
const result = di.tryGetLogger();
if (result.isOk()) {
    result.unwrap().info("Success");
} else {
    std.debug.print("Error: {}\n", .{result.unwrapErr()});
}
```

### Communication Flow

```
Frontend                    Backend
    │                          │
    │  window.ping()          │
    │─────────────────────────►│ webui.bind("ping", handler)
    │                          │    │
    │                          │    └─► webui.return_string(event, "pong")
    │◄─────────────────────────│
    │  {success: true,         │
    │   data: "pong"}          │
```

---

## Frontend Architecture

### Application Bootstrap (`main.ts`)

```typescript
// Global event bus setup
const globalEventBus = new Subject<GlobalEvent>();

// Bootstrap Angular with providers
bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection(),
    { provide: EVENT_BUS, useValue: globalEventBus },
  ]
});
```

### Service Layer

**Primary Communication Service:**

```typescript
// WebuiBridgeService - Main communication
@Injectable({ providedIn: 'root' })
export class WebuiBridgeService {
  // Call backend function
  async call<T>(functionName: string, args: unknown[]): Promise<T>;

  // Subscribe to events
  onEvent(event: string, handler: (data: unknown) => void): () => void;

  // Connection state
  readonly isConnected: Signal<boolean>;
  readonly stats$: Signal<WebUIStats>;
}
```

**Usage in Components:**

```typescript
@Component({...})
export class AppComponent {
  private readonly webui = inject(WebuiBridgeService);

  async ngOnInit() {
    // Call backend
    const result = await this.webui.call<number>('ping');

    // Subscribe to events
    this.webui.onEvent('data-update', (data) => {
      console.log('Update:', data);
    });
  }
}
```

### Component Structure

**Main Layout (3-column):**

```
┌────────────────────────────────────────────────────┐
│  ┌─────────┐  │  ┌─────────────┐  ┌────────────┐ │
│  │  Menu   │  │  │  Detail     │  │  Content   │ │
│  │         │  │  │  Panel      │  │            │ │
│  │ ▸ Apps  │  │  │  (view      │  │  (apps,    │ │
│  │ ▸ System│  │  │   tabs)      │  │   system   │ │
│  │         │  │  │             │  │   info)    │ │
│  └─────────┘  │  └─────────────┘  └────────────┘ │
│     200px     │     splitter         flex: 1      │
└────────────────────────────────────────────────────┘
```

---

## Communication Architecture

### Comparison

| Approach | Protocol | Latency | Use Case | Status |
|----------|----------|---------|----------|--------|
| **WebUI Bridge** | WebSocket | ~1-3ms | RPC calls | ✅ Primary |
| **Pure WebSocket** | WebSocket (port 8765) | ~1-3ms | Pub/sub, streaming | ✅ Available |
| **EventBus** | Internal | <1ms | Backend internal | ✅ Available |

### WebUI Bridge (Primary)

```
Frontend                           Backend
   │                                  │
   │ window.add(1, 2)               │
   │────────────────────────────────►│ webui.bind("add", handler)
   │                                 │    │
   │                                 │    └─► webui.return_int(event, 3)
   │◄────────────────────────────────│
   │  3                              │
```

**Frontend:**
```typescript
const sum = await window.add(1, 2);
```

**Backend (Zig):**
```zig
_ = webui.bind(window, "add", handleAdd);

fn handleAdd(event: ?*webui.Event) callconv(.C) void {
    webui.return_int(event, 42);
}
```

### Pure WebSocket (Alternative)

For real-time pub/sub and streaming:

```typescript
// Frontend
const ws = new WebSocketService();
ws.connect('ws://localhost:8765');

ws.subscribe('updates');
ws.onEvent('updates', (data) => console.log(data));
```

```zig
// Backend (separate server)
var server = try WebSocketServer.init(allocator, .{ .port = 8765 });
try server.start();
```

---

## Critics & Suggestions

### ✅ Strengths

1. **Clean Architecture** - Good separation between backend, frontend, and communication
2. **WebSocket-only** - No HTTP overhead, efficient IPC
3. **Dependency Injection** - Angular-inspired DI in Zig backend
4. **Result Types** - Explicit error handling without exceptions
5. **Signal-based Frontend** - Modern Angular 21 patterns
6. **WebUI Integration** - Lightweight alternative to Electron

### ⚠️ Issues to Address

#### High Priority

| Issue | Location | Problem | Suggestion |
|-------|----------|---------|-----------|
| **Unused HttpService** | `frontend/src/core/` | Dead code | Already removed ✅ |
| **Memory Leak Risk** | `di.zig` EventBus | Subscription cleanup | Add reference counting |
| **Unsafe unwrap()** | `main.zig:150,177` | Potential panic | Use `unwrapOr()` |
| **Signal Handlers** | `main.zig` | Stub implementation | Implement SIGINT/SIGTERM |

#### Medium Priority

| Issue | Location | Problem | Suggestion |
|-------|----------|---------|-----------|
| **Stub Services** | `di.zig` | HttpService, ProcessService, NotificationService not implemented | Implement or remove |
| **Unused Imports** | `app.component.ts` | AuthComponent, SqliteCrudComponent imported but unused | Remove imports |
| **Bundle Size** | `dist/` | 1.17MB exceeds 600KB budget | Lazy loading, tree-shaking |
| **Test Coverage** | `frontend/src/core/` | Many tests require browser environment | Use Jest or Vitest |

### 📋 Suggestions for Improvement

#### 1. Service Implementations

```zig
// Implement these stub services in src/utils/

// notification.zig - Real desktop notifications
pub fn send(self: *Self, title: []const u8, body: []const u8) !void {
    // Use platform-specific notification APIs
    // Linux: libnotify
    // macOS: UserNotifications framework
    // Windows: ToastNotificationManager
}

// process.zig - Real process management
pub fn spawn(self: *Self, program: []const u8, args: []const []const u8) !Process {
    // Use std.process.spawn
}

// storage.zig - File-based persistence
pub fn save(self: *Self) !void {
    // Serialize to JSON file
}
```

#### 2. Bundle Optimization

```typescript
// Lazy load routes in app.routes.ts
export const routes: Routes = [
  { path: '', loadComponent: () => import('./views/home/home.component') },
  { path: 'auth', loadComponent: () => import('./views/auth/auth.component') },
  { path: 'sqlite', loadComponent: () => import('./views/sqlite/sqlite.component') },
];

// Or use loadChildren for feature modules
```

#### 3. Error Handling Improvement

```zig
// Current (unsafe)
const logger = try injector.getLogger();

// Better (explicit)
const logger_result = injector.tryGetLogger();
switch (logger_result) {
    .ok => |l| l.info("Started"),
    .err => |e| {
        std.debug.print("Logger failed: {}\n", .{e});
        return error.LoggerInitFailed;
    },
}
```

#### 4. Signal Handling

```zig
fn setupSignalHandlers() !void {
    const sigint = try std.posix.signal(.INT, handleSignal);
    const sigterm = try std.posix.signal(.TERM, handleSignal);
}

fn handleSignal(sig: c_int) callconv(.C) void {
    should_exit = true;
}
```

#### 5. Performance Targets

| Metric | Current | Target | Action |
|--------|---------|--------|--------|
| Bundle Size | 1.17 MB | < 300 KB | Lazy loading |
| Initial Load | ~3s | < 1s | Code splitting |
| Backend Startup | ~500ms | < 200ms | Async init |
| Memory Usage | TBD | < 100 MB | Profiling |

#### 6. Testing Strategy

```typescript
// Current: Bun tests (require browser for Angular services)
// Better: Jest with jsdom

// Example: unit.test.ts
import { describe, expect, it } from 'vitest';

describe('WebuiBridgeService', () => {
  it('should call backend function', async () => {
    // Mock window object
    // Test call semantics
  });
});
```

#### 7. Suggested Project Structure Updates

```
src/
├── db/                    # Database layer (ADD)
│   ├── sqlite.zig        # SQLite wrapper
│   └── migrations/       # Schema migrations
│
├── logging/              # Logging system (ADD)
│   └── file_logger.zig  # File-based logger
│
├── platform/              # Platform-specific (ADD)
│   ├── tray.zig         # System tray
│   ├── menu.zig         # Native menus
│   └── shortcuts.zig    # Global shortcuts
│
├── config/               # Configuration (ADD)
│   └── loader.zig       # JSON/TOML loading
```

---

## Quick Start

```bash
# Install dependencies
cd frontend && bun install && cd ..

# Build and run
./run.sh

# Or manually:
cd frontend && bun run build && cd ..
zig build -Doptimize=ReleaseSafe
./zig-out/bin/zig_webui_angular_rspack
```

---

## License

MIT License

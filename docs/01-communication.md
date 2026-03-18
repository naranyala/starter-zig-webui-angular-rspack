# Communication

This document describes the communication approaches between backend and frontend.

## Overview

The project uses **2 communication approaches** (NO HTTP/HTTPS):

| # | Approach | Protocol | Use Case |
|---|----------|----------|----------|
| 1 | WebUI Bridge | WebSocket (via WebUI) | Standard RPC calls |
| 2 | Pure WebSocket | WebSocket (ws://) | Real-time, pub/sub |

---

## 1. WebUI Bridge (Primary)

**Recommended** for standard backend-frontend communication. Uses WebUI's native WebSocket bridge - no HTTP/HTTPS.

### Architecture

```
+------------------+                    +------------------+
|   Frontend       |                    |   Backend        |
|   (Angular)      |                    |   (Zig)          |
|                  |                    |                  |
|  window.func()  |------------------->|  webui.bind()   |
|                  |    WebSocket       |                  |
|  receives data   |<------------------|  webui.run()    |
+------------------+                    +------------------+
```

### Features

- **Protocol**: WebSocket via WebUI (ws://)
- **Latency**: ~1-3ms
- **No HTTP/HTTPS**: Direct WebSocket communication
- **Function Binding**: Direct function calls between frontend and backend
- **Event Support**: Backend can push events to frontend

### Backend (Zig)

```zig
const webui = @import("webui");

// Bind function to frontend
_ = webui.bind(window, "add", handleAdd);
_ = webui.bind(window, "getUser", handleGetUser);
_ = webui.bind(window, "calculate", handleCalculate);

// Handler functions
fn handleAdd(event: ?*webui.Event) callconv(.C) void {
    if (event) |e| {
        // Send response back to frontend
        webui.run(e.getWindow(), "{\"success\":true,\"result\":3}");
    }
}

fn handleGetUser(event: ?*webui.Event) callconv(.C) void {
    if (event) |e| {
        const response = 
            \\{"success":true,"data":{"id":1,"name":"John"}}
        ;
        webui.run(e.getWindow(), response);
    }
}

fn handleCalculate(event: ?*webui.Event) callconv(.C) void {
    if (event) |e| {
        // Execute logic...
        webui.run(e.getWindow(), "{\"success\":true,\"result\":42}");
    }
}
```

### Frontend (TypeScript)

```typescript
import { WebuiBridgeService } from './core/webui-bridge.service';

@Component({...})
export class MyComponent {
  private readonly webui = inject(WebuiBridgeService);

  async callBackend() {
    // Call backend function directly
    const result = await this.webui.call<number>('add', [1, 2]);
    console.log('Result:', result); // 3
  }
}

// Or using window directly
const sum = await window.add(1, 2);
const user = await window.getUser();
```

### Service: WebuiBridgeService

**File:** `frontend/src/core/webui-bridge.service.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class WebuiBridgeService {
  // Call backend function
  async call<T>(functionName: string, args: unknown[]): Promise<T>;
  
  // Subscribe to backend events
  onEvent(event: string, handler: (data: unknown) => void): () => void;
  
  // Emit event to backend
  emit(event: string, data: unknown): Promise<void>;
  
  // Connection state
  readonly isConnected: Signal<boolean>;
  readonly stats$: Signal<WebUIStats>;
}
```

### Message Format

**Request:** Via function call `window.functionName(args)`

**Response:**
```json
{
  "success": true,
  "data": { "key": "value" }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error description"
}
```

---

## 2. Pure WebSocket (Alternative)

For complex communication patterns: real-time streaming, pub/sub, multiple connections.

### Architecture

```
+------------------+                    +------------------+
|   Frontend       |                    |   Backend        |
|   (Angular)      |                    |   (Zig)          |
|                  |                    |                  |
|  ws.request()   |------------------->|  WebSocket      |
|                  |   WebSocket        |  Server         |
|  ws.subscribe() |<-------------------|  Pub/Sub        |
+------------------+                    +------------------+
```

### Features

- **Protocol**: WebSocket (ws://)
- **Port**: 8765 (configurable)
- **Pattern**: Request/Response + Pub/Sub
- **Reconnection**: Auto-reconnect with backoff
- **Heartbeat**: Keep-alive ping/pong

### Backend (Zig)

**File:** `src/communication/websocket_server.zig`

```zig
const ws = @import("communication/websocket_server.zig");

pub fn main() !void {
    var server = try ws.WebSocketServer.init(allocator, .{
        .host = "127.0.0.1",
        .port = 8765,
        .max_clients = 10,
    });
    defer server.deinit();

    try server.start();
}
```

### Message Types

```zig
pub const MessageType = enum {
    request,      // Client wants response
    response,     // Server response
    event,        // Pub/Sub event
    subscribe,    // Subscribe to topic
    unsubscribe,  // Unsubscribe from topic
    ping,         // Keep-alive
    pong,         // Keep-alive response
};
```

### Frontend (TypeScript)

**File:** `frontend/src/core/websocket.service.ts`

```typescript
import { WebSocketService } from './core/websocket.service';

@Component({...})
export class MyComponent {
  private readonly ws = inject(WebSocketService);

  ngOnInit() {
    // Connect to WebSocket server
    this.ws.connect({ url: 'ws://localhost:8765' });

    // Request/Response
    const user = await this.ws.request<User>('getUser', { id: 1 });

    // Subscribe to events
    this.ws.subscribe('notifications');
    this.ws.onEvent('notifications', (data) => {
      console.log('Notification:', data);
    });

    // Emit event
    this.ws.emit('chat-message', { text: 'Hello!' });
  }
}
```

### Service: WebSocketService

```typescript
@Injectable({ providedIn: 'root' })
export class WebSocketService {
  // Connect to server
  connect(config?: WebSocketConfig): void;
  
  // Disconnect
  disconnect(): void;
  
  // Request/Response
  request<T>(method: string, params?: unknown, timeoutMs?: number): Promise<T>;
  
  // Subscribe to topic
  subscribe(topic: string): void;
  
  // Unsubscribe from topic
  unsubscribe(topic: string): void;
  
  // Event handler
  onEvent(topic: string, callback: EventCallback): () => void;
  
  // Emit event
  emit(event: string, data: unknown): void;
  
  // Connection state
  readonly isConnected: Signal<boolean>;
  readonly stats: Signal<{ messagesSent, messagesReceived, errors }>;
}
```

### Message Format

```json
{
  "type": "request",
  "id": 1,
  "method": "getData",
  "params": { "key": "value" }
}
```

```json
{
  "type": "response",
  "id": 1,
  "data": { "result": "..." }
}
```

```json
{
  "type": "event",
  "event": "notifications",
  "data": { "message": "..." }
}
```

---

## 3. Event Bus (Internal)

For application-wide pub/sub messaging within the backend.

### Features

- **Scope**: Backend internal only
- **Pattern**: Pub/Sub
- **Priority**: Event priority levels (low, normal, high)
- **Synchronous**: Events processed immediately

### Backend (Zig)

**File:** `src/di.zig`

```zig
const event_bus = injector.getEventBus();

// Subscribe to event
const sub_id = try event_bus.subscribe(
    "app:started",
    handleAppStarted,
);

// Emit event
var event = di.Event{
    .name = "app:started",
    .data = @ptrFromInt(@intFromPtr(data)),
    .source = null,
    .priority = .normal,
};
event_bus.emit(&event);

// Unsubscribe
event_bus.unsubscribe(sub_id);
```

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

---

## Comparison

| Feature | WebUI Bridge | Pure WebSocket | Event Bus |
|---------|--------------|----------------|-----------|
| **Protocol** | WebSocket (via WebUI) | WebSocket | Internal |
| **Use Case** | RPC calls | Real-time, pub/sub | Internal messaging |
| **Complexity** | Low | Medium | Low |
| **Latency** | ~1-3ms | ~1-3ms | <1ms |
| **Multi-client** | Limited | Full | N/A |
| **Pub/Sub** | Via events | Native | Native |
| **Frontend** | Required | Optional | N/A |

---

## Choosing Approach

| Scenario | Recommended |
|----------|-------------|
| Standard function calls | WebUI Bridge |
| Real-time data streaming | Pure WebSocket |
| Multiple concurrent clients | Pure WebSocket |
| Pub/Sub patterns | Pure WebSocket |
| Backend internal events | Event Bus |
| Simple RPC | WebUI Bridge |

---

## Security

All approaches share security best practices:

1. **Localhost Only**: Default binding to 127.0.0.1
2. **Token Validation**: Each connection has unique token
3. **Function Binding**: Only explicitly bound functions callable
4. **Input Validation**: Always validate frontend input

---

## Related Documentation

- [Backend Architecture](02-backend-architecture.md)
- [Frontend Architecture](03-frontend-architecture.md)
- [Dependency Injection](05-dependency-injection.md)

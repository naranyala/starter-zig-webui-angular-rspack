# Backend-Frontend Communication Approaches (Non-HTTP/HTTPS)

This document explores various communication protocols and patterns for backend-frontend communication that do NOT use HTTP/HTTPS.

## Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                  Communication Approaches                        │
├──────────────────────────────────────────────────────────────────┤
│  1. WebUI Bridge (WebSocket-based RPC)                          │
│  2. Pure WebSocket (Binary/Text Messages)                       │
│  3. Unix Domain Sockets (Linux/Mac only)                        │
│  4. Shared Memory (IPC)                                         │
│  5. Message Queue (ZeroMQ, Nanomsg)                             │
│  6. Custom TCP/UDP Protocol                                     │
│  7. Named Pipes (Windows) / FIFO (Unix)                         │
└──────────────────────────────────────────────────────────────────┘
```

---

## 1. WebUI Bridge (WebSocket-based RPC) ⭐ RECOMMENDED

**Protocol:** WebSocket (ws://)  
**Data Format:** JSON or Binary  
**Pattern:** Remote Procedure Call (RPC)

### Architecture
```
Frontend (Angular)          Backend (Zig)
     │                           │
     │  window.ping()            │
     ├──────────────────────────>│  webui.bind("ping", handler)
     │                           │
     │  {success, data}          │
     │<──────────────────────────┤  webui.run(window, response)
     │                           │
```

### Pros
- ✅ Built into WebUI library
- ✅ Automatic type conversion
- ✅ Event-driven architecture
- ✅ Bi-directional communication
- ✅ Low latency (1-5ms)
- ✅ No HTTP overhead

### Cons
- ❌ Tied to WebUI library
- ❌ Limited to localhost
- ❌ Requires WebUI JavaScript bridge

### Implementation

**Frontend (TypeScript):**
```typescript
// Call backend function
const result = await window.ping();

// Listen for backend events
window.addEventListener('backend-event', (e: CustomEvent) => {
  console.log('Event:', e.detail);
});
```

**Backend (Zig):**
```zig
const webui = @import("webui");

// Bind function
_ = webui.bind(window, "ping", handlePing);

// Handler
fn handlePing(event: ?*webui.Event) callconv(.C) void {
    if (event) |e| {
        // Send response
        webui.run(e.getWindow(), "{\"success\":true,\"data\":\"pong\"}");
    }
}
```

### Best For
- Desktop applications with WebUI
- Simple RPC-style communication
- Event-driven architectures

---

## 2. Pure WebSocket (Custom Protocol)

**Protocol:** WebSocket (ws://)  
**Data Format:** JSON, MessagePack, Protocol Buffers, or Custom Binary  
**Pattern:** Publish/Subscribe or Request/Response

### Architecture
```
Frontend (Angular)          Backend (Zig)
     │                           │
     │  WebSocket.connect()      │
     ├──────────────────────────>│  ws.accept()
     │                           │
     │  {"type":"request",       │
     │   "id":1,                 │
     │   "method":"getData"}     │
     ├──────────────────────────>│
     │                           │
     │  {"type":"response",      │
     │   "id":1,                 │
     │   "data":{...}}           │
     │<──────────────────────────┤
     │                           │
```

### Pros
- ✅ Standard protocol
- ✅ Full control over message format
- ✅ Works with any backend
- ✅ Bi-directional
- ✅ Low latency

### Cons
- ❌ Need to implement own protocol
- ❌ More code to maintain
- ❌ Need to handle reconnection

### Implementation

**Frontend (TypeScript):**
```typescript
// WebSocket service
class WebSocketService {
  private ws: WebSocket;
  private messageHandlers = new Map<number, (data: any) => void>();
  private messageId = 0;

  connect(url: string) {
    this.ws = new WebSocket(url);
    this.ws.onmessage = (event) => this.handleMessage(event);
  }

  async request<T>(method: string, params?: any): Promise<T> {
    const id = ++this.messageId;
    return new Promise((resolve) => {
      this.messageHandlers.set(id, resolve);
      this.ws.send(JSON.stringify({
        type: 'request',
        id,
        method,
        params,
      }));
    });
  }

  private handleMessage(event: MessageEvent) {
    const msg = JSON.parse(event.data);
    if (msg.type === 'response' && this.messageHandlers.has(msg.id)) {
      const handler = this.messageHandlers.get(msg.id)!;
      this.messageHandlers.delete(msg.id);
      handler(msg.data);
    }
  }
}
```

**Backend (Zig):**
```zig
const std = @import("std");
const net = std.net;

const Message = struct {
    type: []const u8,
    id: u32,
    method: ?[]const u8 = null,
    params: ?[]const u8 = null,
    data: ?[]const u8 = null,
};

fn handleClient(stream: net.Stream) !void {
    var reader = stream.reader();
    var writer = stream.writer();
    var buffer: [4096]u8 = undefined;
    
    while (true) {
        const n = try reader.read(&buffer);
        if (n == 0) break;
        
        const msg = try std.json.parseFromSlice(Message, buffer[0..n], .{});
        
        if (std.mem.eql(u8, msg.type, "request")) {
            // Process request
            const response = try processRequest(msg.method.?, msg.params.?);
            
            // Send response
            try writer.print("{\"type\":\"response\",\"id\":{d},\"data\":{s}}\n", 
                .{ msg.id, response });
        }
    }
}
```

### Best For
- Real-time applications
- Custom protocol requirements
- Cross-platform compatibility

---

## 3. Unix Domain Sockets

**Protocol:** Unix Domain Socket (file-based)  
**Data Format:** Any (JSON, Binary, etc.)  
**Pattern:** Stream or Datagram

### Architecture
```
Frontend (Angular via Node.js)    Backend (Zig)
     │                                 │
     │  connect('/tmp/app.sock')       │
     ├────────────────────────────────>│  bind('/tmp/app.sock')
     │                                 │
     │  Send/Receive data              │
     │<───────────────────────────────>│
     │                                 │
```

### Pros
- ✅ Very fast (no network stack)
- ✅ File-based permissions
- ✅ Lower latency than TCP
- ✅ Secure (file permissions)

### Cons
- ❌ Unix/Linux/Mac only
- ❌ Requires Node.js native module for Angular
- ❌ Not suitable for remote connections

### Implementation

**Backend (Zig):**
```zig
const std = @import("std");
const posix = std.posix;

fn startUnixSocket() !void {
    const sock_path = "/tmp/zig_webui_app.sock";
    
    // Create socket
    const sock = try posix.socket(posix.AF.LOCAL, posix.SOCK.STREAM, 0);
    defer posix.close(sock);
    
    // Bind
    var addr = posix.sockaddr.un{
        .family = posix.AF.LOCAL,
        .path = undefined,
    };
    std.mem.copy(u8, &addr.path, sock_path);
    
    try posix.bind(sock, @ptrCast(&addr), @sizeOf(@TypeOf(addr)));
    try posix.listen(sock, 1);
    
    // Accept connections
    while (true) {
        const client = try posix.accept(sock, null, null, 0);
        // Handle client...
    }
}
```

**Frontend (Node.js native module):**
```typescript
import * as net from 'net';

class UnixSocketService {
  private client: net.Socket;
  
  connect(path: string) {
    this.client = net.createConnection(path);
    this.client.on('data', (data) => {
      console.log('Received:', data.toString());
    });
  }
  
  send(data: Buffer) {
    this.client.write(data);
  }
}
```

### Best For
- Local-only applications
- High-performance IPC
- Unix/Linux/Mac desktop apps

---

## 4. Shared Memory (IPC)

**Protocol:** Memory-mapped files  
**Data Format:** Binary structures  
**Pattern:** Shared state

### Architecture
```
┌─────────────────────────────────────────────────┐
│            Shared Memory Region                 │
│  ┌─────────────┬─────────────┬───────────────┐  │
│  │   Header    │   Queue     │   Data Pool   │  │
│  │  (status)   │  (messages) │  (payloads)   │  │
│  └─────────────┴─────────────┴───────────────┘  │
└─────────────────────────────────────────────────┘
         ▲                           ▲
         │                           │
    Frontend                    Backend
  (via Node.js)                 (Zig)
```

### Pros
- ✅ Fastest IPC (memory speed)
- ✅ Zero-copy data transfer
- ✅ No serialization overhead

### Cons
- ❌ Complex synchronization
- ❌ Platform-specific
- ❌ Requires careful memory management
- ❌ Security concerns

### Best For
- Ultra-low latency requirements
- Large data transfers
- Same-machine only

---

## 5. Message Queue (ZeroMQ/Nanomsg)

**Protocol:** ZeroMQ/Nanomsg  
**Data Format:** Any (JSON, Binary, Protobuf)  
**Pattern:** Pub/Sub, Request/Reply, Push/Pull

### Architecture
```
Frontend (Angular)          Backend (Zig)
     │                           │
     │  zmq.socket(REQ)          │  zmq.socket(REP)
     ├──────────────────────────>│
     │  {"method":"getData"}     │
     │                           │
     │  {"data":{...}}           │
     │<──────────────────────────┤
     │                           │
```

### Pros
- ✅ High performance
- ✅ Multiple patterns (REQ/REP, PUB/SUB, etc.)
- ✅ Built-in queuing
- ✅ Cross-platform

### Cons
- ❌ External dependency (libzmq)
- ❌ Learning curve
- ❌ Overkill for simple apps

### Implementation

**Backend (Zig with libzmq):**
```zig
const zmq = @cImport({
    @cInclude("zmq.h");
});

fn startZmqServer() !void {
    const context = zmq.zmq_ctx_new();
    const responder = zmq.zmq_socket(context, zmq.ZMQ_REP);
    
    zmq.zmq_bind(responder, "ipc:///tmp/zig_app.ipc");
    
    var buffer: [256]u8 = undefined;
    while (true) {
        const n = zmq.zmq_recv(responder, &buffer, buffer.len, 0);
        // Process request
        zmq.zmq_send(responder, "response", 8, 0);
    }
}
```

### Best For
- Distributed systems
- Complex messaging patterns
- High-throughput applications

---

## 6. Custom TCP/UDP Protocol

**Protocol:** Raw TCP or UDP  
**Data Format:** Custom binary protocol  
**Pattern:** Custom

### Architecture
```
┌────────────────────────────────────────────────────┐
│              Custom Binary Protocol                │
├──────┬──────┬──────────┬──────────┬───────────────┤
│ Magic│ Ver  │  Type    │  Length  │    Payload    │
│ 0xAB │ 0x01 │ 0x01 REQ │  0x0010  │  {...json...} │
├──────┴──────┴──────────┴──────────┴───────────────┤
│              4    1      1         2        n      │
└────────────────────────────────────────────────────┘
```

### Pros
- ✅ Complete control
- ✅ Optimized for specific use case
- ✅ Minimal overhead
- ✅ Can be very efficient

### Cons
- ❌ Most complex to implement
- ❌ Need to handle all edge cases
- ❌ Debugging is harder
- ❌ No standard tooling

### Best For
- Performance-critical applications
- Custom hardware integration
- Proprietary protocols

---

## 7. Named Pipes (Windows) / FIFO (Unix)

**Protocol:** Named Pipes / FIFO  
**Data Format:** Any (typically text or binary)  
**Pattern:** Stream

### Architecture
```
Frontend (Angular via Node.js)    Backend (Zig)
     │                                 │
     │  \\\\.\\pipe\\zig_app           │  \\.\pipe\zig_app (Win)
     ├────────────────────────────────>│  /tmp/zig_app (Unix)
     │                                 │
     │  Read/Write                     │
     │<───────────────────────────────>│
     │                                 │
```

### Pros
- ✅ OS-level support
- ✅ Secure (ACL on Windows)
- ✅ Simple API

### Cons
- ❌ Platform differences
- ❌ Limited features
- ❌ Not suitable for complex protocols

### Best For
- Simple IPC
- Windows desktop applications
- Legacy system integration

---

## Comparison Table

| Approach | Latency | Complexity | Cross-Platform | Best Use Case |
|----------|---------|------------|----------------|---------------|
| WebUI Bridge | ⭐⭐⭐⭐ | ⭐ | ⭐⭐⭐ | Desktop apps with WebUI |
| Pure WebSocket | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | Real-time apps |
| Unix Domain Socket | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐ | Unix-only IPC |
| Shared Memory | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐ | Ultra-low latency |
| ZeroMQ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | Distributed systems |
| Custom TCP/UDP | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Custom protocols |
| Named Pipes | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ | Windows desktop |

---

## Recommendation for Zig WebUI Angular App

### Primary: WebUI Bridge ⭐⭐⭐⭐⭐

Use WebUI's built-in WebSocket bridge for most communication:

```zig
// Backend
_ = webui.bind(window, "getData", handleGetData);

fn handleGetData(event: ?*webui.Event) callconv(.C) void {
    if (event) |e| {
        webui.run(e.getWindow(), "{\"success\":true,\"data\":{...}}");
    }
}
```

```typescript
// Frontend
const data = await window.getData();
```

### Secondary: Pure WebSocket ⭐⭐⭐⭐

For more complex communication patterns, add a pure WebSocket channel:

```zig
// Start WebSocket server on separate port
const ws_port = 8765;
try startWebSocketServer(ws_port);
```

```typescript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:8765');
```

### Why This Combination?

1. **WebUI Bridge** for simple RPC calls and events
2. **Pure WebSocket** for streaming, real-time updates, or large data transfers
3. **Both avoid HTTP/HTTPS** - using native WebSocket protocol
4. **Flexible** - can choose the right tool for each use case

---

## Implementation Examples

See the following files for complete implementations:

- `src/communication/webui_bridge.zig` - WebUI Bridge implementation
- `src/communication/websocket_server.zig` - Pure WebSocket server
- `frontend/src/core/communication.service.ts` - Frontend communication layer
- `frontend/src/core/websocket.service.ts` - WebSocket client service

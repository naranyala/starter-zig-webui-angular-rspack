# Communication

This document describes the backend-frontend communication mechanisms used in the application.

## Overview

The application uses WebUI's native WebSocket bridge for all backend-frontend communication. No HTTP or HTTPS protocols are used.

## Architecture

```
+------------------+                    +------------------+
|   Frontend       |                    |   Backend        |
|   (Angular)      |                    |   (Zig)          |
|                  |                    |                  |
|  window.func()   |------------------->|  webui.bind()    |
|                  |    WebSocket       |                  |
|  receives data   |<-------------------|  webui.run()     |
+------------------+                    +------------------+
```

## Communication Patterns

### Request/Response

The most common pattern for calling backend functions from the frontend.

**Backend (Zig):**

```zig
const webui = @import("webui");

// Bind the function
_ = webui.bind(window, "getData", handleGetData);

// Handler function
fn handleGetData(event: ?*webui.Event) callconv(.C) void {
    if (event) |e| {
        // Prepare response
        const response = 
            \\{"success":true,"data":{"id":1,"name":"Example"}}
        ;
        
        // Send response to frontend
        webui.run(e.getWindow(), response);
    }
}
```

**Frontend (TypeScript):**

```typescript
// Call backend function
async function loadData() {
  const result = await window.getData();
  console.log('Data:', result);
}
```

### Event Subscription

Backend can push events to the frontend.

**Backend (Zig):**

```zig
// Send event to frontend
webui.run(window, 
    \\{"event":"data-update","data":{"key":"value"}}
);
```

**Frontend (TypeScript):**

```typescript
// Listen for backend events
window.addEventListener('backend-event', (event: CustomEvent) => {
  console.log('Event received:', event.detail);
});
```

### Broadcast

Send data to all connected clients.

**Backend (Zig):**

```zig
// Broadcast to all windows
webui.broadcast(event_name, data);
```

## Message Format

### Request Message

```json
{
  "type": "request",
  "id": 1,
  "method": "getData",
  "params": {}
}
```

### Response Message

```json
{
  "type": "response",
  "id": 1,
  "success": true,
  "data": {}
}
```

### Event Message

```json
{
  "type": "event",
  "event": "update",
  "data": {}
}
```

## Protocol Details

### WebSocket Connection

- Protocol: WebSocket (ws://)
- Port: Dynamic (assigned by WebUI)
- Binary Type: ArrayBuffer
- Header Size: 8 bytes
- Max Message Size: 64KB per chunk

### Message Flow

1. Frontend calls `window.functionName()`
2. WebUI bridge converts to binary packet
3. Packet sent via WebSocket to backend
4. Backend receives event via bound handler
5. Backend processes and sends response via `webui.run()`
6. Response travels back via WebSocket
7. Frontend receives response as CustomEvent
8. Promise resolves with data

## Performance

| Operation | Latency |
|-----------|---------|
| Small message (<1KB) | 1-3ms |
| Medium message (10KB) | 3-10ms |
| Large message (100KB) | 20-50ms |
| Connection setup | 5-15ms |

## Error Handling

### Backend Errors

```zig
fn handleRequest(event: ?*webui.Event) callconv(.C) void {
    if (event) |e| {
        // Error response
        webui.run(e.getWindow(), 
            \\{"success":false,"error":"Description of error"}
        );
    }
}
```

### Frontend Errors

```typescript
try {
  const result = await window.getData();
} catch (error) {
  console.error('Backend call failed:', error);
}
```

## Security Considerations

1. **Localhost Only**: WebUI binds to localhost by default
2. **Token Validation**: Each connection has a unique token
3. **Function Binding**: Only explicitly bound functions are callable
4. **No CORS**: Not needed for localhost communication

## Best Practices

1. **Validate Input**: Always validate parameters from frontend
2. **Error Messages**: Return descriptive error messages
3. **Timeout Handling**: Set appropriate timeouts for long operations
4. **Logging**: Log all backend function calls for debugging
5. **Type Safety**: Use TypeScript types for backend responses

## Alternative: Pure WebSocket

For more complex communication patterns, a pure WebSocket server can be added.

See `src/communication/websocket_server.zig` for implementation.

### Use Cases for Pure WebSocket

- Real-time data streaming
- Publish/Subscribe patterns
- Large file transfers
- Binary data communication

## Related Documentation

- [Dependency Injection](dependency-injection.md)
- [Backend Architecture](backend-architecture.md)
- [Frontend Architecture](frontend-architecture.md)

# Communication

This document describes the backend-frontend communication mechanisms used in the application.

## Overview

The application uses WebUI's native WebSocket bridge for all backend-frontend communication. No HTTP or HTTPS protocols are used. This provides a secure, efficient, and low-latency communication channel between the Zig backend and Angular frontend.

## Why WebSocket Bridge?

The WebUI bridge offers several advantages over HTTP:

1. **Lower Latency**: No HTTP overhead for each request
2. **Bidirectional Communication**: Server can push events to client
3. **Single Connection**: Reuses WebSocket connection for all communication
4. **No CORS**: Not needed for localhost communication
5. **Simpler Protocol**: JSON-based messages without HTTP headers
6. **Type Safety**: Direct function binding between backend and frontend

## Architecture

```
+------------------+                    +------------------+
|   Frontend       |                    |   Backend        |
|   (Angular)      |                    |   (Zig)          |
|                  |                    |                  |
|  window.func()  |------------------->|  webui.bind()    |
|                  |    WebSocket       |                  |
|  receives data   |<-------------------|  webui.run()     |
+------------------+                    +------------------+

Connection Flow:
1. Backend starts WebUI server (CivetWeb)
2. Frontend loads via WebUI window
3. WebUI bridge injects JavaScript
4. Frontend calls window.functionName()
5. WebSocket message sent to backend
6. Backend handler executes
7. Response sent back via webui.run()
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

### Internal Protocol

WebUI uses a custom binary protocol:

```
Byte 0:   Signature (0xDD)
Bytes 1-4: Token (connection identifier)
Bytes 5-6: Bind ID
Byte 7:    Command type
Bytes 8+:  Data (JSON payload)
```

## Performance

| Operation | Latency |
|-----------|---------|
| Small message (<1KB) | 1-3ms |
| Medium message (10KB) | 3-10ms |
| Large message (100KB) | 20-50ms |
| Connection setup | 5-15ms |

### Optimization Tips

1. **Batch Operations**: Combine multiple operations into single calls
2. **Binary Data**: Use raw WebSocket for large binary data
3. **Connection Pooling**: WebUI handles this automatically
4. **Minimize JSON**: Keep message payloads small

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

### Error Response Format

```json
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE"
}
```

## Security Considerations

1. **Localhost Only**: WebUI binds to localhost by default
2. **Token Validation**: Each connection has a unique token
3. **Function Binding**: Only explicitly bound functions are callable
4. **No CORS**: Not needed for localhost communication
5. **No SSL**: Communication stays local (configure TLS for production)

### Security Best Practices

- Always validate input from the frontend
- Use parameterized queries for database operations
- Implement rate limiting for sensitive functions
- Log security-relevant events
- Sanitize all user-provided data

## Best Practices

1. **Validate Input**: Always validate parameters from frontend
2. **Error Messages**: Return descriptive error messages
3. **Timeout Handling**: Set appropriate timeouts for long operations
4. **Logging**: Log all backend function calls for debugging
5. **Type Safety**: Use TypeScript types for backend responses
6. **Error Boundaries**: Handle errors gracefully in frontend
7. **Retry Logic**: Implement retry for transient failures

## Alternative: Pure WebSocket

For more complex communication patterns, a pure WebSocket server can be added.

See `src/communication/websocket_server.zig` for implementation.

### Use Cases for Pure WebSocket

- Real-time data streaming
- Publish/Subscribe patterns
- Large file transfers
- Binary data communication
- Multiple client connections
- Custom protocols

### When to Use Pure WebSocket vs WebUI Bridge

| Feature | WebUI Bridge | Pure WebSocket |
|---------|--------------|----------------|
| Ease of Use | High | Medium |
| Function Binding | Automatic | Manual |
| Binary Data | Limited | Full Support |
| Pub/Sub | Via Events | Native |
| Multi-client | Limited | Full Support |
| Custom Protocol | No | Yes |

## Testing Communication

### Backend Test

```zig
test "Communication - Bind function" {
    const window = webui.newWindow();
    const id = webui.bind(window, "test", testHandler);
    try testing.expect(id > 0);
}
```

### Frontend Test

```typescript
describe('ApiService', () => {
  it('should call backend function', async () => {
    const result = await window.testFunction();
    expect(result.success).toBe(true);
  });
});
```

## Related Documentation

- [Dependency Injection](dependency-injection.md)
- [Backend Architecture](backend-architecture.md)
- [Frontend Architecture](frontend-architecture.md)
- [Build System](build-system.md)

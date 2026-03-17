# WebUI WebSocket Bridge Communication

## Overview

This application uses **WebUI's native WebSocket bridge** for all backend-frontend communication. **NO HTTP/HTTPS** is used for API calls.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (Angular)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Components  │→ │ ApiService   │→ │ WebuiBridgeService   │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                │                 │
│                                                ▼                 │
│                                      ┌──────────────────┐       │
│                                      │  WebSocket (WS)  │       │
│                                      │  Binary Packets  │       │
│                                      └──────────────────┘       │
└─────────────────────────────────────────────────────────────────┘
                                                │
                                                │ WebSocket
                                                │
                                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Backend (Zig + WebUI)                       │
│  ┌──────────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Function Bind   │← │ WebUI Core   │← │  WebSocket (WS)  │  │
│  │  - ping          │  │              │  │                  │  │
│  │  - getData       │  │              │  │                  │  │
│  │  - emitEvent     │  │              │  │                  │  │
│  └──────────────────┘  └──────────────┘  └──────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Communication Flow

### 1. Frontend to Backend (Function Call)

```typescript
// Frontend: Call backend function
const result = await apiService.callOrThrow<DataType>('getData', [arg1, arg2]);
```

**What happens:**
1. `ApiService` delegates to `WebuiBridgeService`
2. `WebuiBridgeService` calls the bound function on `window` object
3. WebUI bridge converts call to binary packet
4. Packet sent via WebSocket to backend
5. Backend receives event via bound handler
6. Backend processes and sends response via `webui.run()`
7. Response travels back via WebSocket
8. Frontend receives response as CustomEvent
9. Promise resolves with data

### 2. Backend to Frontend (Event Emission)

```zig
// Backend: Send data to frontend
webui.run(window, "{\"event\":\"data-update\",\"data\":{...}}");
```

**What happens:**
1. Backend calls `webui.run()` with JavaScript code
2. WebUI sends JavaScript via WebSocket
3. Frontend WebUI bridge executes JavaScript
4. CustomEvent dispatched on window
5. Angular services listen and react

## Key Files

### Frontend

| File | Purpose |
|------|---------|
| `src/core/webui-bridge.service.ts` | Core WebSocket bridge wrapper |
| `src/core/api.service.ts` | API service using WebUI bridge |
| `src/core/communication.service.ts` | Multi-channel communication |

### Backend

| File | Purpose |
|------|---------|
| `src/main.zig` | Main application + function bindings |

## Usage Examples

### Frontend: Calling Backend Functions

```typescript
import { ApiService } from './core/api.service';

@Component({...})
export class MyComponent {
  constructor(private api: ApiService) {}

  async loadData() {
    // Simple call
    const data = await this.api.callOrThrow<DataType>('getData', [param1, param2]);
    
    // Call with error handling
    const response = await this.api.call<DataType>('getData', [param1]);
    if (response.success) {
      console.log('Data:', response.data);
    } else {
      console.error('Error:', response.error);
    }
  }

  // Subscribe to backend events
  ngOnInit() {
    this.api.onEvent<DataUpdate>('data-update', (data) => {
      console.log('Backend pushed update:', data);
    });
  }
}
```

### Backend: Binding Functions

```zig
const std = @import("std");
const webui = @import("webui");

pub fn main() !void {
    const window = webui.newWindow();
    
    // Bind function - frontend can call this
    _ = webui.bind(window, "getData", handleGetData);
    _ = webui.bind(window, "ping", handlePing);
    
    // Show the window
    webui.showBrowser(window, frontend_path, .Chromium);
    
    // Wait for events
    webui.wait();
}

// Handler function
fn handleGetData(event: ?*webui.Event) callconv(.C) void {
    if (event) |e| {
        // Process request
        const response = 
            \\{"success":true,"data":{"key":"value"}}
        ;
        
        // Send response to frontend
        webui.run(e.getWindow(), response);
    }
}
```

## WebSocket Protocol

WebUI uses a custom binary protocol over WebSocket:

```
┌────────────┬─────────────┬─────────┬─────────┬──────────────────┐
│ Signature  │    Token    │   ID    │   CMD   │      Data        │
│  (1 byte)  │  (4 bytes)  │(2 bytes)│(1 byte) │  (variable)      │
└────────────┴─────────────┴─────────┴─────────┴──────────────────┘
```

### Commands

| CMD | Value | Description |
|-----|-------|-------------|
| `CMD_JS` | 254 | Execute JavaScript |
| `CMD_CALL_FUNC` | 249 | Call backend function |
| `CMD_CLICK` | 252 | Element click event |
| `CMD_NAVIGATION` | 251 | Navigation event |

## Benefits of WebSocket Bridge

1. **No HTTP Overhead**: Direct binary communication
2. **Lower Latency**: Persistent connection, no handshake
3. **Bi-directional**: Backend can push to frontend anytime
4. **Type-safe**: Function bindings with defined signatures
5. **Event-driven**: Natural fit for reactive applications

## Connection Monitoring

The `WebuiBridgeService` monitors connection status:

```typescript
// Check connection
if (webuiBridge.isConnected()) {
  // Connected
} else {
  // Disconnected
}

// Subscribe to connection changes
webuiBridge.onEvent('connected', () => {
  console.log('Backend connected!');
});
```

## Security Considerations

1. **Local Only**: By default, WebUI only accepts localhost connections
2. **Token Validation**: Each connection has a unique token
3. **Function Binding**: Only explicitly bound functions are callable
4. **No CORS**: Not needed for localhost WebSocket

## Debugging

### Frontend Console

```javascript
// Check WebUI bridge
console.log(window.webui);

// Check bound functions
console.log(Object.keys(window).filter(k => typeof window[k] === 'function'));
```

### Backend Logs

The backend logs all function calls:

```
[Ping] Received ping from: ping
[GetData] Request from: getData
```

## Troubleshooting

### "Backend function not bound" Error

**Cause**: Function not bound in backend

**Fix**:
```zig
webui.bind(window, "myFunction", handleMyFunction);
```

### Connection Lost

**Cause**: Backend crashed or WebSocket closed

**Fix**: 
1. Check backend logs
2. Verify frontend path is correct
3. Ensure no port conflicts

### Timeout Errors

**Cause**: Backend function not responding

**Fix**:
1. Ensure backend handler calls `webui.run()` with response
2. Check for blocking operations in handler
3. Increase timeout if needed

## Migration from HTTP

If migrating from HTTP/HTTPS:

1. Replace `HttpClient` calls with `ApiService.call()`
2. Bind backend functions for each API endpoint
3. Update error handling for WebSocket-specific errors
4. Add connection monitoring for better UX

## Performance

Typical latencies:
- Function call round-trip: 1-5ms
- Event emission: <1ms
- Large data transfer: depends on size

WebSocket maintains a persistent connection, eliminating:
- TCP handshake overhead
- HTTP header overhead
- Connection setup latency

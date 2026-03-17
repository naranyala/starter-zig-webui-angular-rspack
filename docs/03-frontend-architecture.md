# Frontend Architecture

This document describes the Angular frontend application structure.

## Overview

- **Framework**: Angular 21
- **Bundler**: Rspack
- **Package Manager**: Bun

## Project Structure

```
frontend/
├── src/
│   ├── main.ts                 # Application bootstrap
│   ├── index.html              # Main HTML template
│   ├── styles.css              # Global styles
│   │
│   ├── core/                   # Core services
│   │   ├── api.service.ts      # API layer
│   │   ├── webui-bridge.service.ts   # WebUI Bridge communication
│   │   ├── websocket.service.ts       # Pure WebSocket communication
│   │   ├── logger.service.ts
│   │   ├── notification.service.ts
│   │   ├── theme.service.ts
│   │   ├── loading.service.ts
│   │   ├── clipboard.service.ts
│   │   ├── storage.service.ts
│   │   ├── network-monitor.service.ts
│   │   ├── devtools.service.ts
│   │   └── index.ts
│   │
│   ├── views/                  # Components
│   │   ├── app.component.ts    # Root component
│   │   ├── home/
│   │   ├── auth/
│   │   ├── sqlite/
│   │   └── devtools/
│   │
│   ├── models/                 # Data models
│   │   ├── index.ts
│   │   ├── window.model.ts
│   │   ├── log.model.ts
│   │   └── card.model.ts
│   │
│   ├── types/                 # Type definitions
│   │   ├── index.ts
│   │   ├── error.types.ts
│   │   └── winbox.d.ts
│   │
│   └── integration/            # Integration tests
│
├── angular.json
├── rspack.config.js
├── package.json
└── tsconfig.json
```

## Communication Services

The frontend has **2 main communication services**:

### 1. WebuiBridgeService

For standard backend communication via WebUI Bridge.

**File:** `src/core/webui-bridge.service.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class WebuiBridgeService {
  // Call backend function (via WebUI WebSocket)
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

**Usage:**

```typescript
const result = await this.webui.call<number>('add', [1, 2]);
this.webui.onEvent('update', (data) => console.log(data));
```

### 2. WebSocketService

For pure WebSocket communication (real-time, pub/sub).

**File:** `src/core/websocket.service.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class WebSocketService {
  // Connect to WebSocket server
  connect(config?: WebSocketConfig): void;
  
  // Request/Response
  request<T>(method: string, params?: unknown): Promise<T>;
  
  // Subscribe to events
  subscribe(topic: string): void;
  onEvent(topic: string, callback: EventCallback): () => void;
  
  // Emit events
  emit(event: string, data: unknown): void;
  
  // Connection state
  readonly isConnected: Signal<boolean>;
}
```

**Usage:**

```typescript
this.ws.connect({ url: 'ws://localhost:8765' });
const user = await this.ws.request<User>('getUser', { id: 1 });
this.ws.onEvent('notifications', (data) => console.log(data));
```

### 3. ApiService (Convenience Layer)

Wraps communication services for easier use.

**File:** `src/core/api.service.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class ApiService {
  // Call backend via WebUI Bridge
  async call<T>(functionName: string, args: unknown[]): Promise<ApiResponse<T>>;
  
  // Call and throw on error
  async callOrThrow<T>(functionName: string, args: unknown[]): Promise<T>;
  
  // Subscribe to events
  onEvent<T>(event: string, handler: (data: T) => void): () => void;
  
  // State signals
  readonly isLoading: Signal<boolean>;
  readonly error$: Signal<string | null>;
  readonly callCount$: Signal<number>;
}
```

## Choosing Communication Service

| Scenario | Service |
|----------|---------|
| Standard function calls | `WebuiBridgeService` |
| Real-time streaming | `WebSocketService` |
| Pub/Sub patterns | `WebSocketService` |
| Simple API calls | `ApiService` |

See [01-communication.md](../01-communication.md) for details.

## Component Structure

```typescript
@Component({
  selector: 'app-example',
  templateUrl: './example.component.html',
  standalone: true,
})
export class ExampleComponent {
  private readonly api = inject(ApiService);
  
  readonly data = signal<Data | null>(null);
  readonly loading = signal(false);
  
  async loadData() {
    this.loading.set(true);
    try {
      const result = await this.api.callOrThrow<Data>('getData');
      this.data.set(result);
    } finally {
      this.loading.set(false);
    }
  }
}
```

## State Management

Using Angular signals:

```typescript
const count = signal(0);
count.set(1);
count.update(c => c + 1);
console.log(count());

const double = computed(() => count() * 2);
```

## Build Commands

```bash
cd frontend

bun install           # Install dependencies
bun run dev           # Start dev server
bun run watch         # Watch mode
bun run build:rspack  # Production build
bun test             # Run tests
bun run lint         # Lint code
```

## Related Documentation

- [Communication](01-communication.md)
- [Backend Architecture](02-backend-architecture.md)

# Frontend Documentation

Documentation for the Angular frontend application.

## Documents

| Document | Description |
|----------|-------------|
| [DI_EVALUATION.md](DI_EVALUATION.md) | Dependency Injection system evaluation |

## Quick Links

- [Main Documentation](../docs/00-README.md) - Complete project documentation
- [Dependency Injection Guide](../docs/02-DEPENDENCY_INJECTION.md) - DI for both backend and frontend
- [Services Guide](../docs/05-SERVICES_GUIDE.md) - Frontend services usage

## Frontend Structure

```
frontend/src/
├── core/                       # Core services
│   ├── storage.service.ts      # Storage abstraction
│   ├── http.service.ts         # HTTP client
│   ├── notification.service.ts # Toast notifications
│   ├── loading.service.ts      # Loading management
│   ├── theme.service.ts        # Theme switching
│   ├── clipboard.service.ts    # Clipboard operations
│   ├── retry.service.ts        # Retry logic
│   ├── network-monitor.service.ts
│   ├── app-services.facade.ts  # Service facade
│   └── index.ts                # Exports
├── viewmodels/                 # State management
│   ├── logger.viewmodel.ts
│   ├── event-bus.viewmodel.ts
│   ├── api-client.viewmodel.ts
│   └── window-state.viewmodel.ts
├── models/                     # Data models
├── types/                      # TypeScript types
└── views/                      # Components
```

## Core Services

All services are provided via Angular DI:

```typescript
@Injectable({ providedIn: 'root' })
export class StorageService {
  // Automatically available for injection
}
```

### Using Services

**Via Facade (Recommended):**
```typescript
constructor(private services: AppServices) {}

this.services.storage.set('key', 'value');
this.services.notifications.success('Done!');
```

**Direct Injection:**
```typescript
constructor(
  private storage: StorageService,
  private notifications: NotificationService
) {}
```

## State Management

Uses Angular Signals for reactive state:

```typescript
// ViewModel with signals
readonly data = signal<Data[]>([]);
readonly isLoading = signal(false);
readonly error = signal<ErrorValue | null>(null);

// Computed values
readonly isEmpty = computed(() => this.data().length === 0);
```

## Event Bus

Pub/sub for cross-component communication:

```typescript
// Publish
this.eventBus.publish('user:logged_in', { userId: '123' });

// Subscribe
this.eventBus.subscribe('user:logged_in', (payload) => {
  console.log('User logged in:', payload);
});
```

## Error Handling

Uses Result types:

```typescript
async loadData(): Promise<Result<Data>> {
  try {
    const response = await this.http.get('/api/data');
    return ok(response.data);
  } catch (error) {
    return err({ code: 'NETWORK_ERROR', message: 'Failed to load' });
  }
}
```

## Testing

```bash
cd frontend
bun test
```

See [Testing Guide](../docs/07-TESTING.md) for details.

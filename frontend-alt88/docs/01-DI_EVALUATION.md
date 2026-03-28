# Frontend Dependency Injection Evaluation

## Overview

The Angular frontend uses Angular's built-in dependency injection system with `@Injectable({ providedIn: 'root' })` for automatic service registration.

## Current Architecture

### Core Services

| Service | File | DI Pattern |
|---------|------|------------|
| `StorageService` | `storage.service.ts` | `providedIn: 'root'` |
| `HttpService` | `http.service.ts` | `providedIn: 'root'` |
| `NotificationService` | `notification.service.ts` | `providedIn: 'root'` |
| `LoadingService` | `loading.service.ts` | `providedIn: 'root'` |
| `ThemeService` | `theme.service.ts` | `providedIn: 'root'` |
| `ClipboardService` | `clipboard.service.ts` | `providedIn: 'root'` |
| `RetryService` | `retry.service.ts` | `providedIn: 'root'` |
| `NetworkMonitorService` | `network-monitor.service.ts` | `providedIn: 'root'` |
| `ErrorRecoveryService` | `error-recovery.service.ts` | `providedIn: 'root'` |
| `ErrorTelemetryService` | `error-telemetry.service.ts` | `providedIn: 'root'` |
| `GlobalErrorService` | `global-error.service.ts` | `providedIn: 'root'` |
| `WinBoxService` | `winbox.service.ts` | `providedIn: 'root'` |

### ViewModels (Manual DI)

| ViewModel | Pattern |
|-----------|---------|
| `LoggerViewModel` | Exported functions |
| `EventBusViewModel` | Window-level global |
| `ApiClientViewModel` | Manual singleton |
| `WindowStateViewModel` | Direct instantiation |

## Service Registration

### Automatic (Angular DI)

```typescript
@Injectable({ providedIn: 'root' })
export class StorageService {
  constructor() {}
}

// Usage - automatically injected
constructor(private storage: StorageService) {}
```

### Manual (ViewModels)

```typescript
// Logger - exported functions
export function getLogger(scope?: string): Logger {
  return rootLogger.child(scope);
}

// EventBus - window global
const debugWindow = window as unknown as {
  __FRONTEND_EVENT_BUS__?: EventBusViewModel;
};
const eventBus = debugWindow.__FRONTEND_EVENT_BUS__ ?? new EventBusViewModel();
```

## Service Facade

`AppServices` provides unified access:

```typescript
@Injectable({ providedIn: 'root' })
export class AppServices {
  constructor(
    public readonly http: HttpService,
    public readonly storage: StorageService,
    public readonly notifications: NotificationService,
    public readonly loading: LoadingService,
    public readonly theme: ThemeService,
    public readonly clipboard: ClipboardService,
    public readonly retry: RetryService,
    public readonly network: NetworkMonitorService,
  ) {
    this.logger = getLogger('app.services');
    this.eventBus = this.getEventBus();
  }
}
```

## Strengths

1. **Angular DI Integration** - Services use `providedIn: 'root'`
2. **Tree-Shakable** - Unused services are removed from bundle
3. **Singleton Pattern** - All services are singletons
4. **Type Safety** - Full TypeScript typing
5. **Signal-Based** - Modern Angular reactivity

## Weaknesses

1. **Inconsistent Patterns** - Mix of Angular DI and manual DI
2. **No Service Interfaces** - Hard to mock for testing
3. **Window Globals** - EventBus uses window-level globals
4. **Limited Lifecycle** - No explicit dispose pattern

## Recommendations

### 1. Standardize on Angular DI

Convert ViewModels to services:

```typescript
// Before
export function getLogger(scope?: string): Logger { ... }

// After
@Injectable({ providedIn: 'root' })
export class LoggerService {
  getLogger(scope?: string): Logger { ... }
}
```

### 2. Add Service Interfaces

```typescript
export interface IStorage {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
}

@Injectable({ providedIn: 'root' })
export class StorageService implements IStorage {
  // Implementation
}
```

### 3. Implement OnDestroy

```typescript
@Injectable({ providedIn: 'root' })
export class NetworkMonitorService implements OnDestroy {
  private readonly destroy$ = new Subject<void>();
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    clearInterval(this.checkInterval);
  }
}
```

## Testing

Services are testable with TestBed:

```typescript
describe('StorageService', () => {
  let service: StorageService;
  
  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StorageService);
  });
  
  it('should store and retrieve', () => {
    service.set('key', 'value');
    expect(service.get('key')).toBe('value');
  });
});
```

## Conclusion

The frontend DI system is functional but has inconsistencies. Standardizing on Angular DI patterns and adding interfaces would improve testability and maintainability.

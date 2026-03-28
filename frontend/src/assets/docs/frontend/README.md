# Frontend Documentation

The frontend is built with Angular v21, TypeScript, and Rspack bundler.

## Architecture Overview

```
frontend/src/
├── main.ts                 # Bootstrap
├── index.html              # Entry HTML
├── styles.css              # Global styles
├── views/                  # View components
│   ├── app.component       # Root component
│   ├── home/               # Home view
│   ├── auth/               # Auth view
│   ├── sqlite/             # Database view
│   └── devtools/           # DevTools view
├── core/                   # Core services (16 total)
├── models/                 # Data models
└── types/                  # TypeScript types
```

## Service Layers

### Communication & API

- **ApiService** - Backend API calls with signals
- **CommunicationService** - WebUI bridge communication
- **HttpService** - HTTP client wrapper

### Storage & State

- **StorageService** - localStorage + memory with TTL
- **CacheService** - LRU cache with eviction
- **QueryService** - React Query-like data fetching

### UI & UX

- **ThemeService** - Dark/light theme
- **NotificationService** - Toast notifications
- **LoadingService** - Loading indicators
- **ClipboardService** - Clipboard operations
- **WinBoxService** - Window management

### Utilities

- **LoggerService** - Client-side logging
- **NetworkMonitorService** - Online/offline detection
- **DevToolsService** - Development utilities
- **GlobalErrorService** - Global error handling
- **TaskService** - Debounce, throttle, retry

## Angular Signals

All services use Angular signals for reactive state management:

```typescript
@Injectable({ providedIn: 'root' })
export class ExampleService {
  // Private writable signals
  private readonly loading = signal(false);
  private readonly data = signal<T | null>(null);

  // Public readonly signals
  readonly isLoading = this.loading.asReadonly();
  readonly data$ = this.data.asReadonly();

  // Computed signals
  readonly hasData = computed(() => this.data() !== null);
}
```

## Service Documentation

Detailed documentation for key services:

| Service | Documentation |
|---------|---------------|
| ApiService | [api.md](services/api.md) |
| CacheService | [cache.md](services/cache.md) |
| QueryService | [query.md](services/query.md) |
| TaskService | [task.md](services/task.md) |

## Component Structure

Components are organized by feature:

```typescript
@Component({
  selector: 'app-feature',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './feature.component.html',
  styleUrls: ['./feature.component.css']
})
export class FeatureComponent {
  // Use signals for state
  private readonly data = signal<T | null>(null);
  
  // Inject services
  private readonly api = inject(ApiService);
  
  // Computed values
  readonly displayData = computed(() => this.data());
}
```

## Build Commands

```bash
# Development server
npm run start

# Production build
npm run build

# Watch mode
npm run watch
```

## Related Documentation

- [frontend/README.md](../../frontend/README.md) - Frontend-specific documentation
- [frontend/docs/](../../frontend/docs/) - Additional frontend docs
- [../README.md](../README.md) - Project overview

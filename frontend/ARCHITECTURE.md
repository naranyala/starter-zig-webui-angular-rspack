# Architecture Documentation

## Overview

This document describes the refined architecture of the Zig WebUI Angular Rspack application, designed for long-term maintainability, scalability, and developer experience.

---

## Architecture Principles

### 1. Separation of Concerns

Each layer has a single, well-defined responsibility:

- **Presentation Layer**: UI components, views, user interaction
- **Business Logic Layer**: Domain models, business rules, validation
- **Data Access Layer**: Repository pattern, database operations
- **Communication Layer**: API calls, WebUI bridge, HTTP

### 2. Loose Coupling

Components communicate through well-defined interfaces:

- Dependency Injection for service provision
- Event emitters for component communication
- Signals for reactive state management
- Type-safe API contracts

### 3. High Cohesion

Related functionality is grouped together:

- Feature modules contain all related components, services, and models
- Shared modules contain reusable cross-feature functionality
- Core modules contain singleton services and utilities

### 4. Type Safety

Full type safety from backend to frontend:

- Shared TypeScript types in `types/`
- Domain models with business logic in `models/`
- Compile-time validation of API contracts

---

## Directory Structure

### Frontend

```
frontend/src/
├── app/                          # Root application module
│   ├── app.component.ts          # Root component
│   └── app.routes.ts             # Route configuration
│
├── constants/                    # Application constants
│   ├── index.ts                  # Barrel export
│   └── app.constants.ts          # All configuration constants
│
├── core/                         # Core services (singleton)
│   ├── services/
│   │   ├── api/                  # API communication services
│   │   ├── logger/               # Logging services
│   │   ├── notification/         # Notification services
│   │   └── ...                   # Other core services
│   ├── guards/                   # Route guards
│   ├── interceptors/             # HTTP interceptors
│   └── utils/                    # Core utilities
│
├── features/                     # Feature modules (lazy-loaded)
│   ├── dashboard/                # Dashboard feature
│   │   ├── dashboard.component.ts
│   │   ├── dashboard.routes.ts
│   │   ├── services/
│   │   └── models/
│   ├── database/                 # Database features
│   │   ├── sqlite/
│   │   └── duckdb/
│   ├── migration/                # Migration feature
│   └── sync/                     # Sync feature
│
├── models/                       # Domain models
│   ├── index.ts                  # Barrel export
│   ├── domain.models.ts          # Business domain models
│   └── *.model.ts                # Legacy models
│
├── shared/                       # Shared components/directives/pipes
│   ├── components/
│   │   ├── index.ts              # Barrel export
│   │   ├── common/               # Common UI components
│   │   │   ├── loading-spinner.component.ts
│   │   │   ├── error-display.component.ts
│   │   │   ├── empty-state.component.ts
│   │   │   └── confirm-dialog.component.ts
│   │   ├── forms/                # Form components
│   │   │   ├── form-input.component.ts
│   │   │   └── form-select.component.ts
│   │   ├── data/                 # Data display components
│   │   └── layout/               # Layout components
│   ├── directives/               # Custom directives
│   └── pipes/                    # Custom pipes
│
├── types/                        # TypeScript types
│   ├── index.ts                  # Barrel export
│   └── api.types.ts              # API-related types
│
├── utils/                        # Utility functions
│   ├── index.ts                  # Barrel export
│   ├── validation.utils.ts       # Validation functions
│   └── format.utils.ts           # Formatting functions
│
├── views/                        # Legacy views (to be migrated)
│   ├── demo/                     # Demo components
│   ├── dashboard/                # Dashboard components
│   └── ...
│
└── assets/                       # Static assets
    ├── docs/                     # Documentation files
    ├── images/                   # Images
    └── styles/                   # Global styles
```

### Backend

```
src/
├── main.zig                      # Application entry point
├── errors.zig                    # Error type definitions
├── logger.zig                    # Logging module
├── di.zig                        # Dependency injection
│
├── db/                           # Database layer
│   ├── sqlite.zig                # SQLite implementation
│   └── duckdb.zig                # DuckDB implementation
│
├── handlers/                     # WebUI handlers
│   └── db_handlers.zig           # Database handlers
│
├── communication/                # Communication layer
│   └── webui_bridge.zig          # WebUI communication
│
└── utils/                        # Utility functions
    └── utils.zig                 # General utilities
```

---

## Key Components

### Shared Components

Reusable UI components used across the application:

#### Common Components

| Component | Selector | Description |
|-----------|----------|-------------|
| LoadingSpinner | `app-loading-spinner` | Loading indicator |
| ErrorDisplay | `app-error-display` | Error message display |
| EmptyState | `app-empty-state` | Empty state display |
| ConfirmDialog | `app-confirm-dialog` | Confirmation dialog |

#### Form Components

| Component | Selector | Description |
|-----------|----------|-------------|
| FormInput | `app-form-input` | Input field with validation |
| FormSelect | `app-form-select` | Select dropdown with validation |

### Usage Examples

```typescript
// Loading spinner
<app-loading-spinner 
  size="40px" 
  color="primary" 
  [centered]="true"
  label="Loading...">
</app-loading-spinner>

// Error display
<app-error-display 
  [error]="errorMessage"
  title="Operation Failed"
  [showRetry]="true"
  (retry)="retryOperation()">
</app-error-display>

// Empty state
<app-empty-state 
  icon="📭"
  title="No Data"
  message="There are no items to display"
  actionLabel="Create Item"
  (action)="createItem()">
</app-empty-state>

// Form input
<app-form-input 
  label="Email"
  type="email"
  [required]="true"
  [error]="emailError"
  [(ngModel)]="formData.email">
</app-form-input>
```

---

## Type System

### API Types

Defined in `types/api.types.ts`:

```typescript
// Response types
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Domain types
interface User {
  id: number;
  name: string;
  email: string;
  age: number;
  status: UserStatus;
}

// Migration types
interface MigrationResult {
  success: boolean;
  totalRecords: number;
  migratedRecords: number;
  durationMs: number;
}
```

### Domain Models

Business logic encapsulated in domain models:

```typescript
export class UserDomain implements User {
  // Properties
  id: number;
  name: string;
  email: string;
  // ...

  // Business logic methods
  isActive(): boolean {
    return this.status === 'active';
  }

  validate(): { valid: boolean; errors: string[] } {
    // Validation logic
  }
}
```

---

## State Management

### Signals

Angular signals for reactive state:

```typescript
// Service state
readonly loading = signal(false);
readonly data = signal<User[]>([]);
readonly error = signal<string | null>(null);

// Computed values
readonly isLoading = this.loading.asReadonly();
readonly hasData = computed(() => this.data().length > 0);
```

### Service Pattern

```typescript
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly api = inject(ApiService);
  
  readonly users = signal<User[]>([]);
  readonly loading = signal(false);

  async loadUsers(): Promise<void> {
    this.loading.set(true);
    try {
      const data = await this.api.callOrThrow<User[]>('getUsers');
      this.users.set(data);
    } finally {
      this.loading.set(false);
    }
  }
}
```

---

## Validation

### Utility Functions

```typescript
import { Validators } from './utils/validation.utils';

// Simple validation
const valid = Validators.isValidEmail('test@example.com');

// Composite validation
const result = Validators.validate(value, [
  { validator: Validators.isNotEmpty, message: 'Required' },
  { validator: v => Validators.minLength(v, 2), message: 'Too short' },
]);

// User data validation
const errors = Validators.validateUserData(userData);
```

### Form Validation

```typescript
<app-form-input 
  label="Email"
  type="email"
  [required]="true"
  [error]="emailError"
  [(ngModel)]="formData.email">
</app-form-input>
```

---

## Formatting

### Utility Functions

```typescript
import { Formatters } from './utils/format.utils';

// Number formatting
const formatted = Formatters.formatNumber(1234.56, { decimals: 2 });

// Currency
const price = Formatters.formatUSD(99.99);

// Date
const date = Formatters.formatDate(new Date(), { format: 'long' });

// Duration
const duration = Formatters.formatExecutionTime(1234); // "1.23s"
```

---

## Constants

### Configuration

```typescript
import { APP_CONFIG } from './constants';

// Access configuration
const timeout = APP_CONFIG.api.defaultTimeoutMs;
const pageSize = APP_CONFIG.pagination.defaultPageSize;
const validation = APP_CONFIG.validation.user.name;
```

---

## Best Practices

### Component Design

1. **Single Responsibility**: Each component does one thing well
2. **Input/Output**: Use `@Input()` and `@Output()` for communication
3. **Standalone**: Use standalone components for simplicity
4. **OnPush**: Use change detection strategy for performance

### Service Design

1. **ProvidedIn Root**: Singleton services use `providedIn: 'root'`
2. **Inject Function**: Use `inject()` for dependencies
3. **Signals**: Use signals for reactive state
4. **Error Handling**: Always handle errors gracefully

### Type Safety

1. **Strict Types**: Enable strict TypeScript options
2. **No Any**: Avoid `any` type, use proper types
3. **Interface First**: Define interfaces before implementation
4. **Barrel Exports**: Use index.ts for clean imports

### Code Organization

1. **Feature Modules**: Group related functionality
2. **Shared Module**: Extract reusable components
3. **Barrel Exports**: Simplify imports with index.ts
4. **Clear Naming**: Use descriptive names for files and symbols

---

## Migration Guide

### From Legacy Structure

1. **Types**: Move types to `types/` directory
2. **Models**: Create domain models in `models/`
3. **Components**: Extract shared components to `shared/`
4. **Services**: Move core services to `core/`
5. **Features**: Create feature modules in `features/`

### Backward Compatibility

- Legacy views remain in `views/`
- Gradual migration recommended
- No breaking changes to existing functionality

---

## Testing

### Unit Tests

```typescript
describe('UserService', () => {
  it('should load users', async () => {
    const service = new UserService();
    await service.loadUsers();
    expect(service.users().length).toBeGreaterThan(0);
  });
});
```

### Component Tests

```typescript
describe('LoadingSpinnerComponent', () => {
  it('should display spinner', async () => {
    const fixture = TestBed.createComponent(LoadingSpinnerComponent);
    expect(fixture.nativeElement.querySelector('.spinner')).toBeTruthy();
  });
});
```

---

## Performance

### Optimization Strategies

1. **Lazy Loading**: Load features on demand
2. **OnPush Change Detection**: Reduce change detection cycles
3. **TrackBy**: Use trackBy in ngFor
4. **Signals**: Use signals for fine-grained reactivity
5. **Memoization**: Use computed signals for derived values

---

## Security

### Best Practices

1. **Input Validation**: Validate all user inputs
2. **XSS Prevention**: Use Angular's built-in sanitization
3. **CSRF Protection**: Implement CSRF tokens
4. **Authentication**: Add authentication middleware
5. **Authorization**: Implement role-based access control

---

## Future Enhancements

### Planned Improvements

1. **State Management**: Add NgRx or Akita for complex state
2. **Testing**: Increase test coverage to 80%+
3. **Documentation**: Add JSDoc comments
4. **Performance**: Implement virtual scrolling for large lists
5. **Accessibility**: Add ARIA labels and keyboard navigation

---

## Support

For questions or issues:

1. Check existing documentation
2. Review code examples
3. Contact development team
4. Create GitHub issue

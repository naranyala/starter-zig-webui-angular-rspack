# Angular Modernization Plan

**Project:** vlang-webui-angular-rspack (Angular Frontend)
**Angular Version:** 21.1.5 (Latest)
**Date:** 2026-03-14
**Status:** Launch **Bleeding-Edge Angular Implementation**

---

## Current State Analysis

### [DONE] Already Using Modern Features

| Feature | Status | Usage |
|---------|--------|-------|
| Standalone Components | [DONE] Yes | All components |
| Signals (basic) | [DONE] Yes | `signal()`, `computed()` |
| `inject()` DI | [DONE] Yes | Component injection |
| New Control Flow | [DONE] Yes | `@if`, `@else` |
| Typed Forms | [WARNING] Partial | Some forms |

### [WARNING] Opportunities for Modernization

| Feature | Current | Target | Priority |
|---------|---------|--------|----------|
| Signal-based Services | Partial | Full | P0 |
| Signal-based Forms | No | Yes | P0 |
| Angular Resource API | No | Yes | P0 |
| Zoneless Change Detection | No | Yes | P1 |
| Output Signals | No | Yes | P1 |
| Signal Queries | No | Yes | P1 |
| RxJS Interop | Partial | Full | P2 |
| Deferred Loading | No | Yes | P2 |

---

## Modernization Roadmap

### Phase 1: Signal-First Architecture (P0)

#### 1.1 Service Signal Migration

**Current:**
```typescript
@Injectable({ providedIn: 'root' })
export class ApiService {
  async call<T>(fn: string, args: unknown[]): Promise<T> {
    // Promise-based
  }
}
```

**Modern:**
```typescript
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly loading = signal(false);
  private readonly error = signal<ErrorValue | null>(null);
  
  readonly isLoading = this.loading.asReadonly();
  readonly error$ = this.error.asReadonly();
  
  async call<T>(fn: string, args: unknown[]): Promise<T> {
    this.loading.set(true);
    this.error.set(null);
    try {
      // ... implementation
    } catch (err) {
      this.error.set(err as ErrorValue);
      throw err;
    } finally {
      this.loading.set(false);
    }
  }
}
```

#### 1.2 Signal-Based Forms

**Current:**
```typescript
loginUsername = '';
loginPassword = '';

handleLogin() {
  if (!this.loginUsername || !this.loginPassword) {
    // validation
  }
}
```

**Modern:**
```typescript
readonly loginForm = signal({
  username: '',
  password: '',
});

readonly isFormValid = computed(() => {
  const form = this.loginForm();
  return form.username.length > 0 && form.password.length > 0;
});

readonly formErrors = computed(() => {
  const form = this.loginForm();
  const errors: string[] = [];
  if (!form.username) errors.push('Username required');
  if (!form.password) errors.push('Password required');
  return errors;
});
```

### Phase 2: Angular Resource API (P0)

#### 2.1 Resource for Async Operations

```typescript
import { resource } from '@angular/core';

export class SqliteComponent {
  private readonly api = inject(ApiService);
  
  readonly usersResource = resource({
    request: () => ({ trigger: this.refreshTrigger() }),
    loader: ({ request }) => 
      this.api.callOrThrow<User[]>('getUsers'),
  });
  
  readonly users = computed(() => this.usersResource.value() ?? []);
  readonly isLoading = computed(() => this.usersResource.isLoading());
  readonly error = computed(() => this.usersResource.error());
}
```

### Phase 3: Output Signals & Event Handling (P1)

#### 3.1 Output Signals Instead of EventEmitter

**Current:**
```typescript
@Output() userCreated = new EventEmitter<User>();

onUserCreated(user: User) {
  this.userCreated.emit(user);
}
```

**Modern:**
```typescript
readonly userCreated = output<User>();

onUserCreated(user: User) {
  this.userCreated.emit(user);
}
```

### Phase 4: Zoneless Change Detection (P1)

#### 4.1 Zoneless Bootstrap

```typescript
// main.ts
import { bootstrapApplication, ZonelessChangeDetectionProvider } from '@angular/platform-browser';

bootstrapApplication(AppComponent, {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
  ],
});
```

### Phase 5: Advanced Signal Patterns (P2)

#### 5.1 Signal-Based State Management

```typescript
@Injectable({ providedIn: 'root' })
export class AppState {
  private readonly state = signal<AppStateModel>({
    user: null,
    theme: 'light',
    notifications: [],
  });
  
  readonly user = computed(() => this.state().user);
  readonly theme = computed(() => this.state().theme);
  readonly notifications = computed(() => this.state().notifications);
  
  updateUser(user: User) {
    this.state.update(s => ({ ...s, user }));
  }
}
```

#### 5.2 Signal Queries

```typescript
export class ParentComponent {
  @ViewChild('child') childSignal = signal<ElementRef | null>(null);
  
  ngAfterViewInit() {
    effect(() => {
      const child = this.childSignal();
      if (child) {
        // React to child changes
      }
    });
  }
}
```

---

## Implementation Checklist

### Services

- [ ] `api.service.ts` - Add loading/error signals
- [ ] `storage.service.ts` - Add signal-based state
- [ ] `notification.service.ts` - [DONE] Already signal-based
- [ ] `logger.service.ts` - Add signal-based log buffer
- [ ] `loading.service.ts` - Enhance with signals
- [ ] `theme.service.ts` - Add signal-based theme state
- [ ] `clipboard.service.ts` - Add signal-based state
- [ ] `network-monitor.service.ts` - Add signal-based status
- [ ] `winbox.service.ts` - Add signal-based window state

### Components

- [ ] `app.component.ts` - [DONE] Already signal-based
- [ ] `auth.component.ts` - Migrate to signal forms
- [ ] `sqlite.component.ts` - Add Resource API
- [ ] Add output signals
- [ ] Add signal queries

### Templates

- [ ] Convert `*ngIf` to `@if`
- [ ] Convert `*ngFor` to `@for`
- [ ] Convert `*ngSwitch` to `@switch`
- [ ] Add `@defer` for lazy loading
- [ ] Add `@let` for local variables

### Configuration

- [ ] Enable zoneless change detection
- [ ] Enable zone coalescing
- [ ] Configure signal queries
- [ ] Setup RxJS interop

---

## Code Examples

### Signal-Based Service Pattern

```typescript
@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly api = inject(ApiService);
  private readonly users = signal<User[]>([]);
  private readonly loading = signal(false);
  private readonly error = signal<ErrorValue | null>(null);
  
  // Public readonly signals
  readonly allUsers = this.users.asReadonly();
  readonly isLoading = this.loading.asReadonly();
  readonly error$ = this.error.asReadonly();
  
  // Computed signals
  readonly userCount = computed(() => this.users().length);
  readonly hasUsers = computed(() => this.users().length > 0);
  
  async loadUsers() {
    this.loading.set(true);
    this.error.set(null);
    try {
      const users = await this.api.callOrThrow<User[]>('getUsers');
      this.users.set(users);
    } catch (err) {
      this.error.set(err as ErrorValue);
    } finally {
      this.loading.set(false);
    }
  }
  
  addUser(user: User) {
    this.users.update(users => [...users, user]);
  }
  
  removeUser(id: number) {
    this.users.update(users => users.filter(u => u.id !== id));
  }
}
```

### Resource API Pattern

```typescript
@Component({
  selector: 'app-user-list',
  template: `
    @if (usersResource.isLoading()) {
      <p>Loading...</p>
    } @else if (usersResource.error()) {
      <p>Error: {{ usersResource.error()?.message }}</p>
    } @else {
      @for (user of users(); track user.id) {
        <div>{{ user.name }}</div>
      }
    }
  `,
})
export class UserListComponent {
  private readonly userService = inject(UserService);
  
  readonly usersResource = resource({
    request: () => ({}),
    loader: () => this.userService.loadUsers(),
  });
  
  readonly users = computed(() => this.userService.allUsers());
}
```

### Signal Forms Pattern

```typescript
@Component({
  selector: 'app-login',
  template: `
    <form (ngSubmit)="handleSubmit()">
      <input 
        [value]="form().username"
        (input)="updateField('username', $any($event).target.value)"
        required />
      
      @if (errors().includes('Username required')) {
        <span class="error">Username required</span>
      }
      
      <button [disabled]="!isValid()">Login</button>
    </form>
  `,
})
export class LoginComponent {
  readonly form = signal({ username: '', password: '' });
  
  readonly isValid = computed(() => {
    const f = this.form();
    return f.username.length > 0 && f.password.length > 0;
  });
  
  readonly errors = computed(() => {
    const f = this.form();
    const errors: string[] = [];
    if (!f.username) errors.push('Username required');
    if (!f.password) errors.push('Password required');
    return errors;
  });
  
  updateField(field: keyof typeof this.form, value: string) {
    this.form.update(f => ({ ...f, [field]: value }));
  }
}
```

---

## Performance Benefits

| Feature | Benefit |
|---------|---------|
| Signals | Fine-grained reactivity, no zone.js overhead |
| Zoneless | 40-60% faster change detection |
| Resource API | Automatic loading/error states, caching |
| Output Signals | Type-safe events, better DX |
| Signal Queries | Reactive view queries |

---

## Migration Strategy

### Week 1: Foundation
- [ ] Setup signal-based services
- [ ] Migrate notification service (already done)
- [ ] Migrate storage service

### Week 2: Forms & Resources
- [ ] Implement signal forms
- [ ] Add Resource API to SQLite component
- [ ] Add Resource API to Auth component

### Week 3: Advanced Patterns
- [ ] Output signals
- [ ] Signal queries
- [ ] Zoneless change detection

### Week 4: Polish
- [ ] Template modernization
- [ ] Performance testing
- [ ] Documentation

---

## Testing Strategy

```typescript
// Signal testing
it('should update loading state', () => {
  service.loadData();
  expect(service.isLoading()).toBe(true);
});

// Computed testing
it('should compute user count', () => {
  service.addUser(user1);
  service.addUser(user2);
  expect(service.userCount()).toBe(2);
});

// Effect testing
it('should react to changes', () => {
  let effectCount = 0;
  effect(() => {
    service.loading();
    effectCount++;
  });
  service.loading.set(true);
  expect(effectCount).toBe(2);
});
```

---

## References

- [Angular Signals Guide](https://angular.dev/guide/signals)
- [Angular Resource API](https://angular.dev/api/core/resource)
- [Zoneless Change Detection](https://angular.dev/guide/zone)
- [Output Signals](https://angular.dev/api/core/output)
- [Angular v21 Release Notes](https://blog.angular.dev/angular-v21)

---

*Last Updated: 2026-03-14*
*Target Completion: 2026-04-14*

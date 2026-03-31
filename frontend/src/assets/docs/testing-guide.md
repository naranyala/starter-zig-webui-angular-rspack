# Testing Guide

🧪 Unit tests, integration tests, and testing best practices

## Overview

This guide covers testing strategies for the Zig WebUI Angular application.

## Testing Pyramid

```
           /\
          /  \
         / E2E \        Few tests, full stack
        /------\
       /        \
      /Integration\    Some tests, component interaction
     /------------\
    /              \
   /    Unit Tests   \  Many tests, isolated components
  /------------------\
```

## Backend Testing (Zig)

### Unit Tests

```zig
const testing = std.testing;

// Test input validation
test "isValidEmail - valid emails" {
    try testing.expect(isValidEmail("test@example.com"));
    try testing.expect(isValidEmail("user.name+tag@domain.co.uk"));
}

test "isValidEmail - invalid emails" {
    try testing.expect(!isValidEmail(""));
    try testing.expect(!isValidEmail("invalid"));
    try testing.expect(!isValidEmail("@example.com"));
    try testing.expect(!isValidEmail("test@"));
}

// Test SQL injection prevention
test "SQL injection prevention - valid SELECT" {
    try testing.expect(isValidSelectQuery("SELECT * FROM users"));
    try testing.expect(isValidSelectQuery("SELECT id, name FROM users WHERE id = 1"));
}

test "SQL injection prevention - blocked queries" {
    try testing.expect(!isValidSelectQuery("DROP TABLE users"));
    try testing.expect(!isValidSelectQuery("DELETE FROM users"));
    try testing.expect(!isValidSelectQuery("SELECT * FROM users; DROP TABLE users;"));
}

// Test memory safety
test "sanitizeInput - no memory leaks" {
    const allocator = testing.allocator;
    
    const sanitized = try sanitizeInput(allocator, "Hello <World>");
    defer allocator.free(sanitized);
    
    try testing.expect(!std.mem.containsAtLeast(u8, sanitized, 1, "<"));
}

// Test rate limiter
test "Rate limiter blocks after limit" {
    var limiter = RateLimiter.init(testing.allocator, 3, 60);
    defer limiter.deinit();
    
    try testing.expect(try limiter.isAllowed("user1"));
    try testing.expect(try limiter.isAllowed("user1"));
    try testing.expect(try limiter.isAllowed("user1"));
    try testing.expect(!try limiter.isAllowed("user1")); // Blocked
}
```

### Integration Tests

```zig
test "Full user creation flow" {
    const allocator = testing.allocator;
    
    // Setup database
    var db = try Database.init(allocator, ":memory:");
    defer db.deinit();
    try db.initTables();
    
    // Create user service
    var user_repo = UserRepository.init(&db, allocator);
    var user_service = UserService.init(user_repo, allocator);
    
    // Create user
    const result = try user_service.createUser(.{
        .name = "Test User",
        .email = "test@example.com",
        .age = 25,
        .status = "active",
    });
    
    try testing.expect(result.success);
    try testing.expect(result.ok.id > 0);
    
    // Verify user exists
    const user_result = try user_service.getUserById(result.ok.id);
    try testing.expect(user_result.success);
    try testing.expect(user_result.ok != null);
    try testing.expectEqualStrings("test@example.com", user_result.ok.?.email);
}

test "Delete validation with dependencies" {
    const allocator = testing.allocator;
    
    // Setup
    var db = try Database.init(allocator, ":memory:");
    defer db.deinit();
    try db.initTables();
    
    var user_repo = UserRepository.init(&db, allocator);
    var user_service = UserService.init(user_repo, allocator);
    var validator = DeleteValidator.init(allocator, &db, null);
    
    // Create user
    const user_result = try user_service.createUser(.{
        .name = "Test User",
        .email = "test@example.com",
        .age = 25,
    });
    const user_id = user_result.ok.id;
    
    // Create order (dependency)
    // ... create order code ...
    
    // Try to delete user
    const delete_result = try user_service.deleteUser(user_id, false);
    try testing.expect(!delete_result.ok.success);
    try testing.expect(delete_result.ok.requires_force);
    try testing.expectEqual(@as(u32, 1), delete_result.ok.dependency_count);
}
```

### Running Tests

```bash
# Run all tests
zig build test

# Run specific test
zig build test -- --test-filter "SQL injection"

# Run with coverage (requires zcov)
zig build test -Dcoverage
```

## Frontend Testing (Angular)

### Component Tests

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SqliteDemoComponent } from './sqlite-demo.component';

describe('SqliteDemoComponent', () => {
  let component: SqliteDemoComponent;
  let fixture: ComponentFixture<SqliteDemoComponent>;
  let apiService: jasmine.SpyObj<ApiService>;
  let notificationService: jasmine.SpyObj<NotificationService>;

  beforeEach(async () => {
    const apiSpy = jasmine.createSpyObj('ApiService', ['call', 'callOrThrow']);
    const notificationSpy = jasmine.createSpyObj('NotificationService', ['success', 'error']);

    await TestBed.configureTestingModule({
      imports: [SqliteDemoComponent],
      providers: [
        { provide: ApiService, useValue: apiSpy },
        { provide: NotificationService, useValue: notificationSpy },
        { provide: LoggerService, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SqliteDemoComponent);
    component = fixture.componentInstance;
    apiService = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
    notificationService = TestBed.inject(NotificationService) as jasmine.SpyObj<NotificationService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load users on init', async () => {
    const mockUsers = [
      { id: 1, name: 'John', email: 'john@example.com', age: 30, status: 'active' },
    ];
    apiService.callOrThrow.and.resolveTo(mockUsers);

    component.ngOnInit();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.users().length).toBe(1);
    expect(component.users()[0].name).toBe('John');
  });

  it('should handle load users error', async () => {
    apiService.callOrThrow.and.rejectWith({ error: 'Database unavailable' });

    component.ngOnInit();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(notificationService.error).toHaveBeenCalled();
    expect(component.error()).toBe('Database unavailable');
  });

  it('should validate form before create', async () => {
    component.formData.set({ name: '', email: '', age: '', status: 'active' });
    fixture.detectChanges();

    component.createUser();
    fixture.detectChanges();

    expect(component.formErrors().name).toBeDefined();
    expect(notificationService.error).not.toHaveBeenCalled();
  });

  it('should create user with valid data', async () => {
    const validData = {
      name: 'John Doe',
      email: 'john@example.com',
      age: '30',
      status: 'active',
    };
    component.formData.set(validData);
    apiService.callOrThrow.and.resolveTo({ success: true, data: { id: 1 } });

    await component.createUser();

    expect(apiService.callOrThrow).toHaveBeenCalledWith('createUser', [
      { name: 'John Doe', email: 'john@example.com', age: 30, status: 'active' },
    ]);
    expect(notificationService.success).toHaveBeenCalledWith('User created successfully');
  });

  it('should show delete confirmation', () => {
    component.confirmDelete(1);

    expect(component.showDeleteConfirm()).toBe(true);
    expect(component.userToDelete).toBe(1);
  });
});
```

### Service Tests

```typescript
import { TestBed } from '@angular/core/testing';
import { ApiService } from './api.service';

describe('ApiService', () => {
  let service: ApiService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ApiService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should validate function names', () => {
    expect(() => {
      (service as any).validateFunctionName('maliciousFunction');
    }).toThrowError('Function not allowed');
  });

  it('should allow whitelisted functions', () => {
    expect(() => {
      (service as any).validateFunctionName('getUsers');
    }).not.toThrow();
  });

  it('should sanitize error messages', () => {
    const malicious = 'Error: <script>alert("XSS")</script>';
    const sanitized = (service as any).sanitizeErrorMessage(malicious);
    
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('alert');
  });

  it('should track loading state', async () => {
    expect(service.isLoading()).toBe(false);
    
    // Start a call
    const callPromise = service.call('ping', []);
    
    expect(service.isLoading()).toBe(true);
    
    await callPromise;
    
    expect(service.isLoading()).toBe(false);
  });
});
```

### Security Tests

```typescript
describe('Security Tests', () => {
  it('should prevent SQL injection via query', async () => {
    const component = TestBed.createComponent(SqliteDemoComponent);
    const apiService = TestBed.inject(ApiService);
    
    apiService.call.and.returnValue(Promise.resolve({
      success: false,
      error: 'Only SELECT queries are allowed',
    }));

    await component.executeQuery('DROP TABLE users; --');
    
    expect(apiService.call).toHaveBeenCalledWith('sqliteExecuteQuery', [
      'DROP TABLE users; --'
    ]);
  });

  it('should sanitize user input', () => {
    const xssInput = '<script>alert("XSS")</script>';
    const sanitized = Validators.sanitizeInput(xssInput);
    
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('alert');
  });

  it('should block unauthorized function calls', async () => {
    const service = TestBed.inject(ApiService);
    
    await expectAsync(
      service.call('maliciousFunction', [])
    ).toBeRejectedWithError('Function not allowed');
  });
});
```

### E2E Tests (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test.describe('SQLite Demo', () => {
  test('should load users', async ({ page }) => {
    await page.goto('/');
    
    // Click on SQLite CRUD demo
    await page.click('text=🗄️ SQLite CRUD');
    
    // Wait for users to load
    await expect(page.locator('table')).toBeVisible();
  });

  test('should create user', async ({ page }) => {
    await page.goto('/');
    await page.click('text=🗄️ SQLite CRUD');
    await page.click('text=➕ Create User');
    
    // Fill form
    await page.fill('input[placeholder="Enter full name"]', 'Test User');
    await page.fill('input[placeholder="user@example.com"]', 'test@example.com');
    await page.fill('input[placeholder="Enter age"]', '25');
    
    // Submit
    await page.click('text=✅ Create User');
    
    // Verify success
    await expect(page.locator('text=User created successfully')).toBeVisible();
  });

  test('should validate form', async ({ page }) => {
    await page.goto('/');
    await page.click('text=🗄️ SQLite CRUD');
    await page.click('text=➕ Create User');
    
    // Submit empty form
    await page.click('text=✅ Create User');
    
    // Verify validation errors
    await expect(page.locator('text=Invalid name format')).toBeVisible();
    await expect(page.locator('text=Invalid email format')).toBeVisible();
  });

  test('should delete user', async ({ page }) => {
    await page.goto('/');
    await page.click('text=🗄️ SQLite CRUD');
    
    // Click delete
    await page.click('button[title="Delete"]');
    
    // Confirm deletion
    await page.click('text=Delete');
    
    // Verify success
    await expect(page.locator('text=User deleted successfully')).toBeVisible();
  });
});
```

## Test Coverage

### Coverage Goals

| Component | Target | Current |
|-----------|--------|---------|
| Security utilities | 90% | ✅ Included |
| Input validation | 90% | ✅ Included |
| API service | 80% | ⏳ Pending |
| Demo components | 70% | ⏳ Pending |
| Handlers (Zig) | 80% | ✅ Included |

### Running Coverage

```bash
# Frontend coverage
cd frontend && bun run test --coverage

# Backend coverage
zig build test -Dcoverage

# View coverage report
open coverage/index.html
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Zig
        uses: goto-bus-stop/setup-zig@v2
        with:
          version: 0.14.1
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
      
      - name: Install dependencies
        run: cd frontend && bun install
      
      - name: Run backend tests
        run: zig build test
      
      - name: Run frontend tests
        run: cd frontend && bun run test
      
      - name: Run E2E tests
        run: cd frontend && bun run e2e
```

## Next Steps

- 🔒 Review [Security Checklist](/docs/production/security-checklist)
- ⚠️ Read [Error Handling](/docs/production/error-handling) guide
- 🔍 See [Troubleshooting](/docs/production/troubleshooting) for common issues

---

**Last Updated**: 2026-03-31  
**Read Time**: 15 min

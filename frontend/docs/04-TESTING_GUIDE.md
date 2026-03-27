# Frontend Testing Guide

This guide covers testing strategies and patterns for the Angular frontend.

## Table of Contents

- [Overview](#overview)
- [Unit Testing](#unit-testing)
- [Integration Testing](#integration-testing)
- [E2E Testing](#e2e-testing)
- [Testing Utilities](#testing-utilities)
- [Best Practices](#best-practices)

---

## Overview

The application uses three testing levels:

1. **Unit Tests** - Individual components and services
2. **Integration Tests** - Service interactions
3. **E2E Tests** - Full user flows with Playwright

---

## Unit Testing

### Service Testing

```typescript
import { TestBed } from '@angular/core/testing';
import { UserService } from './user.service';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

describe('UserService', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [UserService]
    });

    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();  // Ensure no outstanding requests
  });

  it('should fetch users', () => {
    const mockUsers = [
      { id: 1, username: 'user1' },
      { id: 2, username: 'user2' }
    ];

    service.getAll().subscribe(users => {
      expect(users.length).toBe(2);
      expect(users[0].username).toBe('user1');
    });

    const req = httpMock.expectOne('/api/users');
    expect(req.request.method).toBe('GET');
    req.flush({ success: true, data: mockUsers });
  });

  it('should handle error', () => {
    service.getAll().subscribe({
      error: (error) => {
        expect(error.status).toBe(500);
      }
    });

    const req = httpMock.expectOne('/api/users');
    req.flush('Server error', { status: 500, statusText: 'Server Error' });
  });
});
```

### Component Testing

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserListComponent } from './user-list.component';
import { UserService } from '../services/user.service';
import { of, throwError } from 'rxjs';

describe('UserListComponent', () => {
  let component: UserListComponent;
  let fixture: ComponentFixture<UserListComponent>;
  let userServiceSpy: jasmine.SpyObj<UserService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('UserService', ['getAll']);

    TestBed.configureTestingModule({
      declarations: [UserListComponent],
      providers: [{ provide: UserService, useValue: spy }]
    });

    fixture = TestBed.createComponent(UserListComponent);
    component = fixture.componentInstance;
    userServiceSpy = TestBed.inject(UserService) as jasmine.SpyObj<UserService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load users on init', () => {
    const mockUsers = [{ id: 1, username: 'user1' }];
    userServiceSpy.getAll.and.returnValue(of(mockUsers));

    fixture.detectChanges();  // Triggers ngOnInit

    expect(userServiceSpy.getAll).toHaveBeenCalled();
    expect(component.users.length).toBe(1);
  });

  it('should handle loading error', () => {
    userServiceSpy.getAll.and.returnValue(throwError(() => new Error('Failed')));

    fixture.detectChanges();

    expect(component.error).toBe('Failed to load users');
  });

  it('should delete user', () => {
    userServiceSpy.delete.and.returnValue(of(undefined));
    component.users = [{ id: 1, username: 'user1' }];

    component.deleteUser(1);

    expect(userServiceSpy.delete).toHaveBeenCalledWith(1);
    expect(component.users.length).toBe(0);
  });
});
```

### Pipe Testing

```typescript
import { DateFormatPipe } from './date-format.pipe';
import { DateTimeService } from '../services/date-time.service';

describe('DateFormatPipe', () => {
  let pipe: DateFormatPipe;
  let dateTimeServiceSpy: jasmine.SpyObj<DateTimeService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('DateTimeService', ['format']);
    pipe = new DateFormatPipe(spy);
    dateTimeServiceSpy = spy;
  });

  it('should format date', () => {
    const date = new Date('2024-01-15');
    dateTimeServiceSpy.format.and.returnValue('Jan 15, 2024');

    const result = pipe.transform(date);

    expect(dateTimeServiceSpy.format).toHaveBeenCalledWith(date);
    expect(result).toBe('Jan 15, 2024');
  });
});
```

---

## Integration Testing

### Service Integration

```typescript
import { TestBed } from '@angular/core/testing';
import { UserService } from './user.service';
import { TypeConverterService } from './type-converter.service';
import { ObjectMapperService } from './object-mapper.service';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

describe('UserService Integration', () => {
  let service: UserService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        UserService,
        TypeConverterService,
        ObjectMapperService
      ]
    });

    service = TestBed.inject(UserService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  it('should transform and map user data', () => {
    const mockResponse = {
      success: true,
      data: {
        id: "1",  // String that should be converted to number
        username: "testuser",
        createdAt: "2024-01-15T10:30:00Z"
      }
    };

    service.getUser(1).subscribe(user => {
      expect(user.id).toBe(1);  // Should be number
      expect(user.username).toBe("testuser");
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    const req = httpMock.expectOne('/api/users/1');
    req.flush(mockResponse);
  });
});
```

### Component Integration

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserFormComponent } from './user-form.component';
import { UserService } from '../services/user.service';
import { ValidationService } from '../services/validation.service';
import { ReactiveFormsModule } from '@angular/forms';

describe('UserFormComponent Integration', () => {
  let component: UserFormComponent;
  let fixture: ComponentFixture<UserFormComponent>;
  let userServiceSpy: jasmine.SpyObj<UserService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('UserService', ['create']);

    TestBed.configureTestingModule({
      declarations: [UserFormComponent],
      imports: [ReactiveFormsModule],
      providers: [
        ValidationService,
        { provide: UserService, useValue: spy }
      ]
    });

    fixture = TestBed.createComponent(UserFormComponent);
    component = fixture.componentInstance;
    userServiceSpy = TestBed.inject(UserService) as jasmine.SpyObj<UserService>;
  });

  it('should validate and submit form', () => {
    userServiceSpy.create.and.returnValue(of({ id: 1, username: 'newuser' }));

    component.form.setValue({
      username: 'newuser',
      email: 'new@example.com'
    });

    component.onSubmit();

    expect(userServiceSpy.create).toHaveBeenCalledWith({
      username: 'newuser',
      email: 'new@example.com'
    });
  });

  it('should show validation errors', () => {
    component.form.setValue({
      username: '',  // Invalid - required
      email: 'invalid'  // Invalid - not email
    });

    component.onSubmit();

    expect(component.form.controls['username'].errors).toBeTruthy();
    expect(component.form.controls['email'].errors).toBeTruthy();
  });
});
```

---

## E2E Testing

### Playwright Setup

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:4200',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  webServer: {
    command: 'bun run start',
    port: 4200,
    timeout: 120000
  }
});
```

### E2E Test Example

```typescript
// e2e/user-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('User Management', () => {
  test('should create and display user', async ({ page }) => {
    // Navigate to users page
    await page.goto('/users');

    // Click create button
    await page.click('[data-testid="create-user-btn"]');

    // Fill form
    await page.fill('[data-testid="username-input"]', 'testuser');
    await page.fill('[data-testid="email-input"]', 'test@example.com');

    // Submit
    await page.click('[data-testid="submit-btn"]');

    // Verify success message
    await expect(page.locator('[data-testid="success-message"]'))
      .toBeVisible();

    // Verify user in list
    await expect(page.locator('[data-testid="user-list"]'))
      .toContainText('testuser');
  });

  test('should show validation errors', async ({ page }) => {
    await page.goto('/users/create');

    // Submit empty form
    await page.click('[data-testid="submit-btn"]');

    // Verify validation errors
    await expect(page.locator('[data-testid="username-error"]'))
      .toBeVisible();
    await expect(page.locator('[data-testid="email-error"]'))
      .toBeVisible();
  });

  test('should delete user', async ({ page }) => {
    await page.goto('/users');

    // Get initial count
    const initialCount = await page.locator('[data-testid="user-item"]').count();

    // Delete first user
    await page.click('[data-testid="delete-user-btn"].first()');

    // Confirm deletion
    await page.click('[data-testid="confirm-delete-btn"]');

    // Verify count decreased
    const finalCount = await page.locator('[data-testid="user-item"]').count();
    expect(finalCount).toBe(initialCount - 1);
  });
});
```

### API Mocking

```typescript
// e2e/user-flow.spec.ts
import { test, expect } from '@playwright/test';

test('should handle API error', async ({ page }) => {
  // Mock API error
  await page.route('**/api/users', route => 
    route.fulfill({
      status: 500,
      body: JSON.stringify({
        success: false,
        error: 'Server error'
      })
    })
  );

  await page.goto('/users/create');

  // Fill and submit
  await page.fill('[data-testid="username-input"]', 'testuser');
  await page.click('[data-testid="submit-btn"]');

  // Verify error message
  await expect(page.locator('[data-testid="error-message"]'))
    .toBeVisible();
});
```

---

## Testing Utilities

### Mock Factories

```typescript
// testing/user.mock.ts
export function createUserMock(overrides?: Partial<User>): User {
  return {
    id: 1,
    username: 'testuser',
    email: 'test@example.com',
    createdAt: new Date(),
    ...overrides
  };
}

export function createApiResponseMock<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    timestamp: Date.now()
  };
}
```

### Test Helpers

```typescript
// testing/test-helpers.ts
export function activateRouteMock(params: any) {
  return {
    snapshot: {
      params,
      paramMap: new Map(Object.entries(params))
    },
    params: of(params)
  };
}

export function flushMicrotasks() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

export async function waitForAsyncOperation() {
  await flushMicrotasks();
}
```

### Custom Matchers

```typescript
// testing/custom-matchers.ts
expect.extend({
  toBeValidDate(received) {
    const pass = received instanceof Date && !isNaN(received.getTime());
    return {
      pass,
      message: () => 
        `expected ${received} ${pass ? 'not ' : ''}to be a valid date`
    };
  }
});
```

---

## Best Practices

### 1. Test One Thing Per Test

```typescript
// Good
it('should load users', () => { ... });
it('should handle loading error', () => { ... });
it('should delete user', () => { ... });

// Avoid
it('should load, display, and delete users', () => { ... });
```

### 2. Use Descriptive Test Names

```typescript
// Good
it('should return error when API returns 500', () => { ... });

// Avoid
it('should handle error', () => { ... });
```

### 3. Arrange-Act-Assert Pattern

```typescript
it('should create user', () => {
  // Arrange
  const mockUser = createUserMock();
  userServiceSpy.create.and.returnValue(of(mockUser));

  // Act
  component.onSubmit();

  // Assert
  expect(userServiceSpy.create).toHaveBeenCalled();
  expect(component.success).toBe(true);
});
```

### 4. Mock External Dependencies

```typescript
// Good - Mock HTTP
const httpSpy = jasmine.createSpyObj('HttpClient', ['get', 'post']);

// Good - Mock Router
const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

// Avoid - Real HTTP calls in unit tests
```

### 5. Clean Up After Tests

```typescript
afterEach(() => {
  httpMock.verify();  // Verify no outstanding requests
});

ngOnDestroy() {
  this.subscriptions.unsubscribe();  // Clean up subscriptions
}
```

### 6. Test Edge Cases

```typescript
it('should handle empty response', () => { ... });
it('should handle null values', () => { ... });
it('should handle network error', () => { ... });
it('should handle timeout', () => { ... });
```

### 7. Use Data Test IDs

```html
<!-- Good -->
<button data-testid="submit-btn">Submit</button>
<input data-testid="username-input" />

<!-- Avoid -->
<button class="btn btn-primary">Submit</button>
<input #usernameInput />
```

---

## Running Tests

```bash
# Unit tests
bun run test

# Unit tests with coverage
bun run test:coverage

# Integration tests
bun run test:integration

# E2E tests
bun run e2e

# E2E tests with UI
bun run e2e:ui
```

---

## Related Documentation

- [Data Transform Services](02-DATA_TRANSFORM_SERVICES.md)
- [API Patterns](03-API_PATTERNS.md)
- [Backend Testing](../../docs/TESTING.md)

# Testing Infrastructure

This document describes the testing setup for the C + Angular WebUI project.

## Frontend Testing

### Test Framework

The frontend uses **Bun Test** for unit testing and **Playwright** for E2E testing.

### Running Tests

```bash
# Unit tests
bun test

# Unit tests with coverage
bun test --coverage

# E2E tests
bunx playwright test

# E2E tests with UI
bunx playwright test --ui
```

### Test File Conventions

- Unit tests: `*.test.ts` next to the source file
- Integration tests: `src/integration/*.test.ts`
- E2E tests: `e2e/*.spec.ts`

### Unit Test Example

```typescript
import { describe, it, expect, beforeEach } from 'bun:test';
import { CacheService } from './cache.service';

describe('CacheService', () => {
  let service: CacheService;

  beforeEach(() => {
    service = new CacheService();
  });

  it('should be created', () => {
    expect(service).toBeDefined();
  });

  it('should set and get value', () => {
    service.set('key', 'value');
    expect(service.get('key')).toBe('value');
  });

  it('should return null for missing key', () => {
    expect(service.get('nonexistent')).toBeNull();
  });

  it('should expire value after TTL', async () => {
    service.set('key', 'value', { ttl: 100 });
    expect(service.get('key')).toBe('value');
    
    await Bun.sleep(150);
    expect(service.get('key')).toBeNull();
  });
});
```

### Component Test Example

```typescript
import { describe, it, expect } from 'bun:test';
import { TestBed } from '@angular/core/testing';
import { HomeComponent } from './home.component';

describe('HomeComponent', () => {
  it('should create', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Angular Rsbuild Demo');
  });
});
```

### Service Test Example

```typescript
import { describe, it, expect, beforeEach } from 'bun:test';
import { ApiService } from './api.service';
import { CommunicationService } from './communication.service';

describe('ApiService', () => {
  let apiService: ApiService;
  let mockCommunicationService: Partial<CommunicationService>;

  beforeEach(() => {
    mockCommunicationService = {
      call: jest.fn().mockResolvedValue({ success: true }),
    };

    apiService = new ApiService(mockCommunicationService as CommunicationService);
  });

  it('should call backend with correct parameters', async () => {
    await apiService.call('test_method', ['arg1', 'arg2']);
    
    expect(mockCommunicationService.call).toHaveBeenCalledWith(
      'test_method',
      ['arg1', 'arg2']
    );
  });
});
```

## E2E Testing with Playwright

### Setup

```bash
# Install Playwright
bunx playwright install

# Install browsers
bunx playwright install chromium
```

### E2E Test Example

```typescript
import { test, expect } from '@playwright/test';

test.describe('Application', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('http://localhost:4200');
    
    await expect(page).toHaveTitle(/Angular/);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should navigate between views', async ({ page }) => {
    await page.goto('http://localhost:4200');
    
    // Click on navigation link
    await page.click('text=Home');
    await expect(page).toHaveURL('/');
    
    await page.click('text=Auth');
    await expect(page).toHaveURL('/auth');
  });

  test('should handle authentication flow', async ({ page }) => {
    await page.goto('http://localhost:4200/auth');
    
    // Fill login form
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'Admin123!');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForURL('/home');
    
    // Verify logged in state
    await expect(page.locator('.user-menu')).toBeVisible();
  });
});
```

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:4200',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
});
```

## Backend Testing

### Test Framework

The backend uses a simple test harness with the `nob.h` build system.

### Running Backend Tests

```bash
# Run all tests
./run.sh test

# Run specific test
./run.sh test --filter logger
```

### Backend Test Example

```c
/* tests/test_logger_service.c */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "di/di.h"
#include "services/logger_service.h"

static int tests_run = 0;
static int tests_passed = 0;

#define TEST(name) static int name(void)
#define RUN_TEST(name) do { \
    tests_run++; \
    if (name() == 0) { \
        tests_passed++; \
        printf("✓ %s\n", #name); \
    } else { \
        printf("✗ %s\n", #name); \
    } \
} while(0)

#define ASSERT(cond) do { if (!(cond)) return 1; } while(0)

TEST(test_logger_creation) {
    LoggerService* logger = logger_service_inject();
    ASSERT(logger != NULL);
    ASSERT(strcmp(logger->base.type_name, "LoggerService") == 0);
    return 0;
}

TEST(test_logger_log_info) {
    LoggerService* logger = logger_service_inject();
    logger_set_debug(logger, true);
    
    /* Should not crash */
    logger_log(logger, "INFO", "Test message");
    
    return 0;
}

TEST(test_logger_set_debug) {
    LoggerService* logger = logger_service_inject();
    
    logger_set_debug(logger, true);
    ASSERT(logger->debug_enabled == true);
    
    logger_set_debug(logger, false);
    ASSERT(logger->debug_enabled == false);
    
    return 0;
}

int main(void) {
    /* Initialize DI */
    if (app_module_init() != 0) {
        fprintf(stderr, "Failed to initialize app module\n");
        return 1;
    }
    
    printf("Running logger service tests...\n\n");
    
    RUN_TEST(test_logger_creation);
    RUN_TEST(test_logger_log_info);
    RUN_TEST(test_logger_set_debug);
    
    printf("\n%d/%d tests passed\n", tests_passed, tests_run);
    
    app_module_destroy();
    return tests_passed == tests_run ? 0 : 1;
}
```

## Test Coverage

### Frontend Coverage

```bash
# Generate coverage report
bun test --coverage

# View coverage report
open coverage/index.html
```

### Backend Coverage

For backend coverage, use `gcov`:

```bash
# Compile with coverage flags
gcc --coverage -o build/test_main tests/test_main.c ...

# Run tests
./build/test_main

# Generate coverage report
gcov -o build/ src/services/*.c

# View coverage
lcov --capture --directory . --output-file coverage.info
genhtml coverage.info --output-directory coverage
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
      - uses: actions/checkout@v4
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      
      - name: Install dependencies
        run: cd frontend && bun install
      
      - name: Run frontend tests
        run: cd frontend && bun test
      
      - name: Install Playwright
        run: cd frontend && bunx playwright install --with-deps
      
      - name: Run E2E tests
        run: cd frontend && bunx playwright test
      
      - name: Build backend
        run: ./run.sh build
      
      - name: Run backend tests
        run: ./run.sh test
```

## Test Data

### Fixtures

Create test fixtures in `tests/fixtures/`:

```typescript
// tests/fixtures/users.ts
export const testUsers = {
  admin: {
    username: 'admin',
    email: 'admin@example.com',
    password: 'Admin123!',
    role: 'admin',
  },
  user: {
    username: 'testuser',
    email: 'user@example.com',
    password: 'User123!',
    role: 'user',
  },
};
```

### Mock Data

```typescript
// tests/mocks/api.mock.ts
export const createMockApi = () => ({
  call: jest.fn().mockResolvedValue({ success: true, data: null }),
  callOrThrow: jest.fn().mockResolvedValue({ success: true, data: null }),
});
```

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Descriptive Names**: Use clear test names that describe the behavior
3. **Arrange-Act-Assert**: Structure tests with clear sections
4. **Test Edge Cases**: Test boundary conditions and error cases
5. **Keep Tests Fast**: Avoid slow operations in unit tests
6. **Use Fixtures**: Reuse test data setup
7. **Mock External Dependencies**: Isolate the unit under test

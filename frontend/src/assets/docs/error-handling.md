# Error Handling Guide

⚠️ Graceful error management and recovery strategies

## Overview

This guide covers error handling best practices for the Zig WebUI Angular application.

## Error Types

### Backend (Zig)

```zig
// Unified error types
pub const UnifiedError = error{
    // App errors
    WindowCreationFailed,
    WindowBindingFailed,
    BrowserLaunchFailed,
    DiBootstrapFailed,
    
    // DI errors
    NoProvider,
    InjectorDestroyed,
    ServiceNotFound,
    
    // DB errors
    OpenFailed,
    PrepareFailed,
    StepFailed,
    QueryFailed,
    ConstraintViolation,
    NotFound,
    
    // IO errors
    FileNotFound,
    PermissionDenied,
    OutOfMemory,
    
    // Network errors
    ConnectionRefused,
    Timeout,
    HostUnreachable,
};

// Result type for error handling
pub fn Result(comptime T: type) type {
    return union(enum) {
        ok: T,
        err: UnifiedError,
    };
}
```

### Frontend (TypeScript)

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: number;
}

interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}
```

## Error Handling Patterns

### Backend Patterns

#### 1. Result Type Pattern

```zig
pub fn getUserById(db: *Database, id: i64) Result(?User) {
    const user = try db.findUser(id) catch |err| {
        return Result(?User).fromError(fromDbError(err));
    };
    
    if (user) |u| {
        return Result(?User).from(u);
    } else {
        return Result(?User).from(null);
    }
}

// Usage
const result = getUserById(db, 1);
switch (result) {
    .ok => |user| {
        if (user) |u| {
            // User found
        } else {
            // User not found
        }
    },
    .err => |err| {
        // Handle error
        logError(err);
    },
}
```

#### 2. Error Context Pattern

```zig
pub const ErrorWithContext = struct {
    error: UnifiedError,
    message: []const u8,
    context: ?[]const u8,
    timestamp: i64,
};

pub fn handleError(err: UnifiedError, comptime context: []const u8) ErrorWithContext {
    return ErrorWithContext{
        .error = err,
        .message = errorMessage(err),
        .context = context,
        .timestamp = std.time.timestamp(),
    };
}
```

#### 3. Graceful Degradation

```zig
pub fn handleSqliteGetUsers(event: ?*webui.Event) callconv(.c) void {
    const e = event orelse return;
    const window = e.getWindow();
    if (window == 0) return;

    const db = sqlite.getGlobalDb() orelse {
        // Graceful fallback
        webui.run(window, "{\"success\":false,\"error\":\"Database not available\",\"code\":503}");
        return;
    };

    const users = db.getAllUsers() catch |err| {
        // Log internally, return generic error
        logError(err);
        webui.run(window, "{\"success\":false,\"error\":\"Failed to retrieve users\",\"code\":500}");
        return;
    };

    // Success response
    const json = std.json.stringifyAlloc(db.allocator, .{
        .success = true,
        .data = users,
    }, .{}) catch {
        webui.run(window, "{\"success\":false,\"error\":\"Response creation failed\",\"code\":500}");
        return;
    };
    defer db.allocator.free(json);

    webui.run(window, json);
}
```

### Frontend Patterns

#### 1. Try-Catch with User Feedback

```typescript
async loadUsers(): Promise<void> {
  this.loading.set(true);
  this.error.set(null);
  
  try {
    const users = await this.api.callOrThrow<User[]>('getUsers', []);
    this.users.set(users);
  } catch (error: any) {
    const message = error?.error || 'Failed to load users';
    this.error.set(message);
    this.notification.error(message);
    this.logger.error('Load users failed', error);
  } finally {
    this.loading.set(false);
  }
}
```

#### 2. Error Boundary Component

```typescript
@Component({
  selector: 'app-error-boundary',
  template: `
    @if (hasError()) {
      <app-error-display
        [error]="errorMessage()"
        [showRetry]="true"
        (retry)="retry()">
      </app-error-display>
    } @else {
      <ng-content></ng-content>
    }
  `
})
export class ErrorBoundaryComponent {
  readonly hasError = signal(false);
  readonly errorMessage = signal('');
  
  retry(): void {
    this.hasError.set(false);
    // Retry logic
  }
}
```

#### 3. Global Error Handler

```typescript
@Injectable({ providedIn: 'root' })
export class GlobalErrorHandler implements ErrorHandler {
  private readonly logger = inject(LoggerService);
  private readonly notification = inject(NotificationService);

  handleError(error: any): void {
    // Log internally
    this.logger.error('Global error', error);
    
    // Show user-friendly message
    const message = this.extractUserMessage(error);
    this.notification.error(message);
    
    // Track for monitoring
    this.trackError(error);
  }
  
  private extractUserMessage(error: any): string {
    if (error?.status === 401) return 'Please log in to continue';
    if (error?.status === 403) return 'You do not have permission';
    if (error?.status === 404) return 'Resource not found';
    if (error?.status === 429) return 'Too many requests, please wait';
    if (error?.status >= 500) return 'Server error, please try again';
    return 'An unexpected error occurred';
  }
}
```

## Error Codes

### HTTP-Style Codes

| Code | Meaning | When to Use |
|------|---------|-------------|
| 200 | OK | Success |
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Not authenticated |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Constraint violation |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Error | Server error |
| 503 | Unavailable | Service unavailable |

### Application-Specific Codes

| Code | Meaning | When to Use |
|------|---------|-------------|
| 1001 | Validation Error | Input validation failed |
| 1002 | SQL Error | Database operation failed |
| 1003 | Injection Attempt | SQL injection detected |
| 2001 | Dependency Error | Dependent records exist |
| 2002 | Delete Validation | Delete validation failed |

## Error Messages

### User-Friendly Messages

| Technical Error | User Message |
|-----------------|--------------|
| `DbError.OpenFailed` | "Database unavailable, please refresh" |
| `UnifiedError.OutOfMemory` | "System low on memory, please close other tabs" |
| `ConstraintViolation` (email) | "Email already exists" |
| `NotFound` (user) | "User not found" |
| `QueryFailed` | "Query failed, please check syntax" |

### Error Message Guidelines

1. **Be Clear**: Explain what went wrong
2. **Be Helpful**: Suggest how to fix it
3. **Be Concise**: Keep it brief
4. **Be Friendly**: Use polite language
5. **Be Secure**: Don't expose internals

```typescript
// Good: Clear and helpful
"Email already exists. Please use a different email or log in."

// Bad: Exposes internals
"ConstraintViolation: UNIQUE constraint failed: users.email"
```

## Logging Strategy

### Log Levels

```zig
// Debug: Detailed technical info
logger.debug("Query executed in {d}ms", .{elapsed});

// Info: Normal operations
logger.info("User {d} created successfully", .{user_id});

// Warn: Potential issues
logger.warn("Slow query detected: {d}ms", .{elapsed});

// Error: Actual errors
logger.err("Failed to create user: {}", .{err});
```

### Log Structure

```json
{
  "timestamp": "2026-03-31T10:00:00Z",
  "level": "error",
  "message": "Failed to create user",
  "error": "ConstraintViolation",
  "context": {
    "user_id": 123,
    "email": "test@example.com"
  },
  "stack": "..."
}
```

## Recovery Strategies

### Retry Logic

```typescript
async withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on client errors
      if (error?.status >= 400 && error?.status < 500) {
        throw error;
      }
      
      // Wait before retry (exponential backoff)
      await sleep(delayMs * Math.pow(2, i));
    }
  }
  
  throw lastError;
}
```

### Fallback Values

```typescript
async loadUserData(): Promise<UserData> {
  try {
    return await this.api.callOrThrow('getUserData', []);
  } catch {
    // Return cached/default data
    return this.storage.get('cachedUserData') || this.getDefaultUserData();
  }
}
```

### Circuit Breaker

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > 30000) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker open');
      }
    }
    
    try {
      const result = await operation();
      this.failures = 0;
      this.state = 'closed';
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();
      if (this.failures >= 5) {
        this.state = 'open';
      }
      throw error;
    }
  }
}
```

## Testing Error Handling

### Backend Tests

```zig
test "handle error when database not available" {
    const db: ?*Database = null;
    
    const result = handleSqliteGetUsers(null, db);
    
    try testing.expectEqual(false, result.success);
    try testing.expectEqualStrings("Database not initialized", result.error);
}

test "handle SQL injection attempt" {
    const query = "DROP TABLE users; --";
    
    try testing.expect(!isValidSelectQuery(query));
}
```

### Frontend Tests

```typescript
it('should handle database error gracefully', async () => {
  apiService.call.and.returnValue(throwError({ error: 'Database not available' }));
  
  component.loadUsers();
  
  expect(component.error()).toBe('Database unavailable, please refresh');
  expect(notificationService.error).toHaveBeenCalled();
});

it('should retry on server error', async () => {
  apiService.call.and.returnValue(
    throwError({ status: 500 }),
    throwError({ status: 500 }),
    of({ success: true, data: [] })
  );
  
  await component.loadUsersWithRetry();
  
  expect(apiService.call).toHaveBeenCalledTimes(3);
});
```

## Next Steps

- 🔒 Review [Security Checklist](/docs/production/security-checklist)
- 🧪 Read [Testing Guide](/docs/production/testing-guide)
- 🔍 See [Troubleshooting](/docs/production/troubleshooting) for common issues

---

**Last Updated**: 2026-03-31  
**Read Time**: 15 min

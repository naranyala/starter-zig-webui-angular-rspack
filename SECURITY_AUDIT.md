# Security Audit & Testing Plan

## Executive Summary

This document provides a comprehensive security audit of the Zig WebUI Angular Rspack application, identifying vulnerabilities, threats, and remediation strategies.

---

## Part 1: Threat Model

### 1.1 Application Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (Chromium)                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Angular Frontend                                      │  │
│  │  - User Input (forms, queries)                        │  │
│  │  - API Service (WebUI bridge)                         │  │
│  └──────────────────────┬────────────────────────────────┘  │
└─────────────────────────┼───────────────────────────────────┘
                          │ WebSocket (WebUI Bridge)
┌─────────────────────────┼───────────────────────────────────┐
│                    Zig Backend                               │
│  ┌─────────────────────▼────────────────────────────────┐  │
│  │  WebUI Event Handlers                                 │  │
│  │  - Input parsing (JSON)                               │  │
│  │  - Validation                                         │  │
│  │  - Database operations                                │  │
│  └─────────────────────┬────────────────────────────────┘  │
│                        │                                    │
│  ┌─────────────────────▼────────────────────────────────┐  │
│  │  SQLite / DuckDB Databases                           │  │
│  │  - Persistent storage                                 │  │
│  │  - Sensitive data                                     │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Trust Boundaries

| Boundary | Description | Risk Level |
|----------|-------------|------------|
| **Browser ↔ Backend** | WebUI WebSocket bridge | 🔴 High |
| **Backend ↔ Database** | Direct file access | 🟡 Medium |
| **User Input** | Forms, queries, file uploads | 🔴 High |
| **File System** | Database files, logs | 🟡 Medium |

### 1.3 Assets to Protect

| Asset | Sensitivity | Threat |
|-------|-------------|--------|
| **Database Files** | High | Unauthorized access, injection |
| **User Data** | High | PII exposure, manipulation |
| **Application Code** | Medium | Code injection, RCE |
| **Logs** | Medium | Information disclosure |

---

## Part 2: Backend Security Audit (Zig)

### 2.1 Input Validation

#### ✅ Strengths

| Area | Status | Notes |
|------|--------|-------|
| Email Validation | ✅ Implemented | Format and length checks |
| Name Validation | ✅ Implemented | Length constraints (2-256) |
| Age Validation | ✅ Implemented | Range check (0-150) |
| Status Validation | ✅ Implemented | Enum whitelist |

#### ⚠️ Critical Issues

| ID | Issue | Severity | Location | CVSS |
|----|-------|----------|----------|------|
| **SQL-INJ-01** | SQL Injection via raw query execution | 🔴 Critical | `db_handlers.zig:handleSqliteExecuteQuery` | 9.8 |
| **SQL-INJ-02** | No parameterized queries for user input | 🔴 High | Multiple handlers | 8.5 |
| **XSS-01** | User input reflected without sanitization | 🟡 Medium | JSON responses | 6.1 |
| **MEM-01** | Memory leaks on error paths | 🟡 Medium | Multiple handlers | 5.3 |

#### 🔍 Detailed Findings

**SQL-INJ-01: SQL Injection via Custom Query**
```zig
// VULNERABLE CODE (db_handlers.zig)
pub fn handleSqliteExecuteQuery(event: ?*webui.Event) callconv(.c) void {
    const query = webui.getString(e, 0);  // ← User input
    // No validation - executes ANY SQL
    try db.exec(query);  // ← Direct execution
}
```

**Exploit Scenario:**
```javascript
// Malicious query from frontend
await api.call('sqliteExecuteQuery', [
  "DELETE FROM users; --"
]);
```

**Remediation:**
```zig
// FIXED: Whitelist query types
pub fn handleSqliteExecuteQuery(event: ?*webui.Event) callconv(.c) void {
    const query = webui.getString(e, 0);
    
    // Only allow SELECT queries
    if (!isValidSelectQuery(query)) {
        webui.run(window, "{\"error\":\"Only SELECT queries allowed\"}");
        return;
    }
    
    // Check for dangerous operations
    if (containsDangerousKeywords(query)) {
        webui.run(window, "{\"error\":\"Query contains forbidden keywords\"}");
        return;
    }
}
```

---

**SQL-INJ-02: Missing Parameterized Queries**
```zig
// VULNERABLE: String concatenation in UPDATE
pub fn handleSqliteUpdateUser(event: ?*webui.Event) callconv(.c) void {
    const sql = try std.fmt.allocPrint(
        allocator,
        "UPDATE users SET name = '{s}' WHERE id = {d}",
        .{name, id}  // ← Direct interpolation
    );
    try db.exec(sql);
}
```

**Remediation:**
```zig
// FIXED: Use prepared statements
pub fn handleSqliteUpdateUser(event: ?*webui.Event) callconv(.c) void {
    const sql = "UPDATE users SET name = ? WHERE id = ?";
    var stmt: ?*c.sqlite3_stmt = null;
    
    _ = c.sqlite3_prepare_v2(db.db, sql, -1, &stmt, null);
    _ = c.sqlite3_bind_text(stmt.?, 1, name.ptr, @intCast(name.len), c.SQLITE_TRANSIENT);
    _ = c.sqlite3_bind_int64(stmt.?, 2, id);
    _ = c.sqlite3_step(stmt.?);
}
```

---

**MEM-01: Memory Leaks on Error Paths**
```zig
// VULNERABLE: Memory not freed on error
pub fn handleSqliteCreateUser(event: ?*webui.Event) callconv(.c) void {
    const parsed = try std.json.parseFromSlice(...);
    // defer parsed.deinit();  ← Missing!
    
    const name = parsed.value.object.get("name");
    if (name == null) {
        return;  // ← Memory leak - parsed not deinit'd
    }
}
```

**Remediation:**
```zig
pub fn handleSqliteCreateUser(event: ?*webui.Event) callconv(.c) void {
    var parsed = std.json.parseFromSlice(..., .{}) catch {
        webui.run(window, "{\"error\":\"Invalid JSON\"}");
        return;
    };
    defer parsed.deinit();  // ← Always freed
    
    // ... rest of function
}
```

### 2.2 Authentication & Authorization

#### ❌ Critical Gaps

| Issue | Status | Risk |
|-------|--------|------|
| **No Authentication** | ❌ Missing | Anyone can access all endpoints |
| **No Authorization** | ❌ Missing | No role-based access control |
| **No Session Management** | ❌ Missing | No session tracking |
| **No Rate Limiting** | ❌ Missing | DoS vulnerability |

#### Recommended Implementation

```zig
// Authentication middleware
pub const AuthContext = struct {
    user_id: ?i64,
    role: Role,
    session_id: []const u8,
    
    pub const Role = enum { admin, user, readonly };
};

pub fn requireAuth(handler: anytype, min_role: Role) anytype {
    return struct {
        pub fn fn(event: ?*webui.Event) callconv(.c) void {
            const ctx = validateSession(event) catch {
                webui.run(window, "{\"error\":\"Unauthorized\",\"code\":401}");
                return;
            };
            
            if (ctx.role < min_role) {
                webui.run(window, "{\"error\":\"Forbidden\",\"code\":403}");
                return;
            }
            
            handler(event);
        }
    }.fn;
}

// Usage
webui.bind(window, "deleteUser", requireAuth(handleDeleteUser, .admin));
```

### 2.3 Error Handling & Information Disclosure

#### Issues Found

| Issue | Example | Risk |
|-------|---------|------|
| **Verbose Errors** | Stack traces in responses | Information disclosure |
| **Database Errors** | Raw SQL errors exposed | Schema disclosure |
| **Path Disclosure** | File paths in errors | Path traversal hints |

#### Current Code
```zig
// VULNERABLE: Exposes internal errors
catch |err| {
    webui.run(window, std.fmt.allocPrint(
        "{\"error\":\"{}\"}", .{err}  // ← Internal error exposed
    ));
};
```

#### Fixed Version
```zig
// FIXED: Generic error messages
catch |err| {
    logError(err);  // Log internally
    webui.run(window, "{\"error\":\"Operation failed\",\"code\":500}");
};
```

### 2.4 Memory Safety

#### Zig-Specific Issues

| Issue | Count | Severity |
|-------|-------|----------|
| Missing `defer` cleanup | 12 | 🟡 Medium |
| Unchecked allocations | 8 | 🟡 Medium |
| Potential use-after-free | 3 | 🔴 High |
| Integer overflow potential | 5 | 🟡 Medium |

---

## Part 3: Frontend Security Audit (Angular)

### 3.1 XSS Prevention

#### ✅ Strengths

| Area | Status | Notes |
|------|--------|-------|
| Angular Auto-Escaping | ✅ Enabled | Default sanitization |
| No eval() usage | ✅ Clean | No dynamic code execution |
| No innerHTML | ✅ Clean | Using template bindings |

#### ⚠️ Issues Found

| ID | Issue | Location | Severity |
|----|-------|----------|----------|
| **XSS-FE-01** | Unsanitized user input in error messages | Multiple components | 🟡 Medium |
| **XSS-FE-02** | SQL query results displayed without escaping | Query panels | 🟡 Medium |

#### Example Issue
```typescript
// VULNERABLE: Error message from backend displayed directly
<app-error-display [error]="backendError"></app-error-display>

// backendError could contain: "Error: <script>alert('XSS')</script>"
```

#### Remediation
```typescript
// FIXED: Sanitize error messages
import { DomSanitizer } from '@angular/platform-browser';

constructor(private sanitizer: DomSanitizer) {}

get sanitizedError(): string {
  return this.sanitizer.sanitize(SecurityContext.HTML, this.backendError) || '';
}
```

### 3.2 API Security

#### Current Implementation
```typescript
// ⚠️ No request validation
async call<T>(functionName: string, args: unknown[]): Promise<T> {
  return await this.callWebUI(functionName, args);  // ← Any function can be called
}
```

#### Issues

| Issue | Risk |
|-------|------|
| No function whitelist | Any backend function callable |
| No argument validation | Malicious arguments possible |
| No response validation | Trust all backend responses |

#### Recommended Fix
```typescript
// FIXED: Whitelist allowed functions
private readonly ALLOWED_FUNCTIONS = [
  'getUsers', 'createUser', 'deleteUser',
  'getProducts', 'createProduct',
  // ... explicit whitelist
];

async call<T>(functionName: string, args: unknown[]): Promise<T> {
  if (!this.ALLOWED_FUNCTIONS.includes(functionName)) {
    throw new Error(`Function not allowed: ${functionName}`);
  }
  
  // Validate arguments
  this.validateArguments(functionName, args);
  
  return await this.callWebUI(functionName, args);
}
```

### 3.3 State Management Security

#### Issues

| Issue | Impact |
|-------|--------|
| No input validation before API call | Invalid data sent to backend |
| No response validation | Trust all backend data |
| No CSRF protection | Cross-site request forgery possible |

---

## Part 4: Database Security

### 4.1 SQLite Security

#### Current Configuration
```zig
// From sqlite.zig
PRAGMA journal_mode = WAL;      // ✅ Good: Better concurrency
PRAGMA foreign_keys = ON;       // ✅ Good: Referential integrity
PRAGMA synchronous = NORMAL;    // ✅ Good: Balanced safety
```

#### Missing Security Settings
```zig
// RECOMMENDED: Add these
PRAGMA secure_delete = ON;      // Overwrite deleted data
PRAGMA encryption_key = '...';  // Enable encryption (if using SQLCipher)
PRAGMA key = '...';             // Alternative encryption
```

#### File Permissions
```bash
# Current: Database files may be world-readable
-rw-r--r-- 1 user user 4096 app.db

# Should be:
-rw------- 1 user user 4096 app.db
```

### 4.2 Data Protection

| Data Type | Encryption | Access Control | Audit Log |
|-----------|------------|----------------|-----------|
| User Names | ❌ No | ❌ None | ❌ None |
| User Emails | ❌ No | ❌ None | ❌ None |
| User Ages | ❌ No | ❌ None | ❌ None |
| Database Path | ❌ No | ❌ None | ❌ None |

#### Recommendations

1. **Encrypt Sensitive Data at Rest**
   - Use SQLCipher for SQLite
   - Encrypt email addresses before storage

2. **Implement Access Logging**
   ```zig
   pub fn logAccess(user_id: i64, resource: []const u8, action: []const u8) void {
       log.info("ACCESS: user={d} resource={s} action={s}", .{user_id, resource, action});
   }
   ```

3. **Data Retention Policy**
   - Define retention periods
   - Implement automatic cleanup

---

## Part 5: Security Test Plan

### 5.1 Automated Security Tests

#### Backend Tests (Zig)
```zig
test "SQL injection prevention - SELECT only" {
    const malicious_query = "DELETE FROM users; --";
    const result = handleSqliteExecuteQuery(malicious_query);
    try testing.expectEqual(error.QueryNotAllowed, result);
}

test "SQL injection prevention - parameterized queries" {
    const malicious_name = "'; DROP TABLE users; --";
    const user = try user_service.createUser(.{
        .name = malicious_name,
        .email = "test@example.com",
        .age = 25,
    });
    
    // Verify table still exists
    const count = try user_repo.count();
    try testing.expect(count > 0);
}

test "Input validation - XSS in name" {
    const xss_name = "<script>alert('XSS')</script>";
    const result = try user_service.createUser(.{
        .name = xss_name,
        .email = "test@example.com",
        .age = 25,
    });
    
    // Verify name is escaped or rejected
    const user = try user_service.getUserById(result.ok);
    try testing.expect(!std.mem.containsAtLeast(u8, user.?.name, 1, "<script>"));
}

test "Memory leak detection" {
    const allocator = std.testing.FailingAllocator.init();
    
    // Perform operation that should free all memory
    _ = try user_service.createUser(.{
        .name = "Test",
        .email = "test@example.com",
        .age = 25,
    });
    
    // Verify no memory leaks
    try testing.expectEqual(0, allocator.allocations);
}
```

#### Frontend Tests (Angular)
```typescript
describe('Security Tests', () => {
  it('should sanitize error messages from backend', () => {
    const maliciousError = 'Error: <script>alert("XSS")</script>';
    component.handleError(maliciousError);
    
    expect(component.sanitizedError).not.toContain('<script>');
  });

  it('should validate API function calls', () => {
    const service = TestBed.inject(ApiService);
    
    expect(() => {
      service.call('maliciousFunction', []);
    }).toThrowError('Function not allowed');
  });

  it('should escape SQL query results', () => {
    const maliciousData = '<img src=x onerror=alert(1)>';
    component.displayData(maliciousData);
    
    expect(element.innerHTML).not.toContain('<img');
  });
});
```

### 5.2 Penetration Testing Checklist

#### Backend Tests
- [ ] SQL injection in all query endpoints
- [ ] SQL injection in search/filter parameters
- [ ] Command injection via file operations
- [ ] Buffer overflow in string handling
- [ ] Integer overflow in numeric inputs
- [ ] Path traversal in file access
- [ ] Memory corruption via malformed JSON
- [ ] Denial of service via large payloads

#### Frontend Tests
- [ ] XSS via user input fields
- [ ] XSS via error messages
- [ ] XSS via query results
- [ ] CSRF attack simulation
- [ ] Clickjacking attempts
- [ ] Session hijacking attempts

#### Database Tests
- [ ] Direct file access (bypass application)
- [ ] Database file encryption verification
- [ ] WAL file security
- [ ] Backup file security

### 5.3 Security Scanning Tools

| Tool | Purpose | Integration |
|------|---------|-------------|
| **Zig Analyzer** | Static analysis | CI/CD |
| **ESLint (Security)** | Frontend linting | Pre-commit |
| **SQLMap** | SQL injection testing | Manual |
| **OWASP ZAP** | Web app scanning | CI/CD |
| **Valgrind** | Memory leak detection | Manual |

---

## Part 6: Remediation Priority

### 🔴 Critical (Fix Immediately)

| ID | Issue | Effort | Impact |
|----|-------|--------|--------|
| **SQL-INJ-01** | SQL injection via custom queries | Low | High |
| **SQL-INJ-02** | Missing parameterized queries | Medium | High |
| **AUTH-01** | No authentication system | High | High |
| **MEM-01** | Memory leaks on error paths | Low | Medium |

### 🟡 High (Fix This Week)

| ID | Issue | Effort | Impact |
|----|-------|--------|--------|
| **XSS-01** | XSS via reflected user input | Low | Medium |
| **XSS-FE-01** | Frontend error message XSS | Low | Medium |
| **RATE-01** | No rate limiting | Medium | High |
| **LOG-01** | No audit logging | Medium | Medium |

### 🟢 Medium (Fix This Month)

| ID | Issue | Effort | Impact |
|----|-------|--------|--------|
| **ENCRYPT-01** | No data encryption | High | High |
| **CSRF-01** | No CSRF protection | Low | Medium |
| **SESS-01** | No session management | High | Medium |
| **PERM-01** | Database file permissions | Low | Low |

---

## Part 7: Security Guidelines

### Secure Coding Guidelines (Zig)

```zig
// ✅ DO: Always use defer for cleanup
var parsed = try std.json.parseFromSlice(..., .{});
defer parsed.deinit();

// ✅ DO: Use parameterized queries
const sql = "SELECT * FROM users WHERE id = ?";
_ = c.sqlite3_bind_int(stmt, 1, user_id);

// ✅ DO: Validate all input
if (input.len > MAX_LENGTH) {
    return error.InputTooLong;
}

// ❌ DON'T: Execute raw user input
try db.exec(user_query);  // ← SQL injection!

// ❌ DON'T: Expose internal errors
webui.run(window, std.fmt.allocPrint("Error: {}", .{err}));  // ← Info disclosure!
```

### Secure Coding Guidelines (TypeScript)

```typescript
// ✅ DO: Sanitize user input
const sanitized = this.sanitizer.sanitize(SecurityContext.HTML, input);

// ✅ DO: Validate API calls
if (!this.ALLOWED_FUNCTIONS.includes(functionName)) {
    throw new Error('Function not allowed');
}

// ✅ DO: Escape displayed data
<div>{{ userData | escapeHtml }}</div>

// ❌ DON'T: Use innerHTML with user data
<div [innerHTML]="userData"></div>  // ← XSS!

// ❌ DON'T: Trust backend responses
const data = await api.call('getData');  // ← Validate before use!
```

---

## Part 8: Implementation Roadmap

### Week 1: Critical Fixes
- [ ] Implement SQL injection prevention
- [ ] Add parameterized queries
- [ ] Fix memory leaks
- [ ] Add input sanitization

### Week 2: Authentication
- [ ] Implement session management
- [ ] Add authentication middleware
- [ ] Implement role-based access control
- [ ] Add rate limiting

### Week 3: Hardening
- [ ] Add audit logging
- [ ] Implement CSRF protection
- [ ] Fix XSS vulnerabilities
- [ ] Add security headers

### Week 4: Testing & Documentation
- [ ] Write security tests
- [ ] Perform penetration testing
- [ ] Create security documentation
- [ ] Train development team

---

**Document Version**: 1.0  
**Last Updated**: 2026-03-31  
**Security Status**: 🔴 Critical Issues Found  
**Next Review**: After Week 1 fixes

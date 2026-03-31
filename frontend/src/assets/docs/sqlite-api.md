# SQLite API Reference

🔌 WebUI event handlers and backend functions

## Overview

This document describes the backend API functions available for SQLite operations.

## Available Functions

### getUsers

Get all users from SQLite.

**Binding:**
```zig
webui.bind(window, "getUsers", handleSqliteGetUsers);
```

**Frontend Usage:**
```typescript
const users = await this.api.callOrThrow<User[]>('getUsers', []);
```

**Response:**
```json
{
  "success": true,
  "data": [
    { 
      "id": 1, 
      "name": "John", 
      "email": "john@example.com", 
      "age": 30, 
      "status": "active",
      "created_at": "2026-03-31T10:00:00Z"
    }
  ]
}
```

---

### getUserStats

Get user statistics from SQLite.

**Binding:**
```zig
webui.bind(window, "getUserStats", handleSqliteGetUserStats);
```

**Frontend Usage:**
```typescript
const stats = await this.api.callOrThrow('getUserStats', []);
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 100,
    "activeUsers": 75,
    "inactiveUsers": 15,
    "pendingUsers": 8,
    "suspendedUsers": 2,
    "avgAge": 32
  }
}
```

---

### createUser

Create a new user in SQLite.

**Binding:**
```zig
webui.bind(window, "createUser", handleSqliteCreateUser);
```

**Frontend Usage:**
```typescript
await this.api.callOrThrow('createUser', [{
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
  status: 'active'
}]);
```

**Validation:**
- name: 2-256 characters, alphanumeric + spaces
- email: Valid email format, max 320 chars
- age: 0-150
- status: active, inactive, pending, or suspended

**Security:**
- Input sanitization (XSS prevention)
- SQL injection prevention (prepared statements)
- Memory-safe allocation

**Response:**
```json
{
  "success": true,
  "data": { "id": 1 }
}
```

---

### deleteUser

Delete a user from SQLite.

**Binding:**
```zig
webui.bind(window, "deleteUser", handleSqliteDeleteUser);
```

**Frontend Usage:**
```typescript
// Regular delete (checks dependencies)
await this.api.callOrThrow('deleteUser', [{ id: 1 }]);

// Force delete (removes dependencies)
await this.api.callOrThrow('forceDeleteUser', [userId.toString()]);
```

**Delete Validation:**
- Checks for dependent orders
- Returns error if dependencies exist
- Use `forceDeleteUser` to remove with dependencies

**Response (Success):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**Response (Has Dependencies):**
```json
{
  "success": false,
  "error": "User has 3 order(s). Delete orders first or use force delete.",
  "dependency_type": "orders",
  "dependency_count": 3,
  "requires_force": true
}
```

---

### forceDeleteUser

Force delete a user and all dependent records.

**Binding:**
```zig
webui.bind(window, "forceDeleteUser", handleSqliteForceDeleteUser);
```

**Frontend Usage:**
```typescript
await this.api.callOrThrow('forceDeleteUser', [userId.toString()]);
```

**Warning:** This removes the user AND all related orders. Use with caution!

**Response:**
```json
{
  "success": true,
  "message": "User and dependent records deleted",
  "deleted_from_table": "users"
}
```

---

### sqliteExecuteQuery

Execute a custom SQL query (SELECT only).

**Binding:**
```zig
webui.bind(window, "sqliteExecuteQuery", handleSqliteExecuteQuery);
```

**Frontend Usage:**
```typescript
const results = await this.api.callOrThrow<Record<string, unknown>[]>('sqliteExecuteQuery', [
  'SELECT name, email FROM users WHERE status = ? ORDER BY name LIMIT 10'
]);
```

**Security:**
- Only SELECT queries allowed
- Query length limited to 4096 characters
- Dangerous keywords blocked (DROP, DELETE, INSERT, UPDATE, etc.)
- SQL injection prevention
- Multiple statement prevention

**Blocked Keywords:**
- DROP, DELETE, TRUNCATE, ALTER, CREATE
- INSERT, UPDATE, REPLACE
- EXEC, EXECUTE, GRANT, REVOKE
- SQL comments (--, /* */)
- Semicolons (multiple statements)

**Response:**
```json
{
  "success": true,
  "data": [
    { "name": "John", "email": "john@example.com" },
    { "name": "Jane", "email": "jane@example.com" }
  ]
}
```

---

## Error Handling

All functions return a standardized response format:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: number;
}
```

### Common Errors

| Error | Code | Cause | Solution |
|-------|------|-------|----------|
| "Database not initialized" | 500 | SQLite failed to start | Check application logs |
| "Name is required" | 400 | Missing name field | Provide name |
| "Invalid name format" | 400 | Name validation failed | Use 2-256 alphanumeric chars |
| "Invalid email format" | 400 | Email validation failed | Use valid email format |
| "Age must be between 0 and 150" | 400 | Age validation failed | Provide valid age |
| "Invalid status value" | 400 | Status not in whitelist | Use active/inactive/pending/suspended |
| "User has dependent records" | 409 | Foreign key constraint | Use forceDeleteUser or delete orders first |
| "Only SELECT queries are allowed" | 403 | Non-SELECT query attempted | Use SELECT only |
| "Query too long" | 413 | Query exceeds 4096 chars | Shorten query |

---

## Rate Limiting

API calls are rate-limited to prevent abuse:

- **Limit**: 100 requests per minute
- **Scope**: Per user/session
- **Response**: HTTP 429 when exceeded
- **Headers**: `X-RateLimit-Remaining: <count>`

---

## Security Features

### Input Validation

All user input is validated:
- Length limits enforced
- Format validation (email)
- Range validation (age)
- Whitelist validation (status)

### SQL Injection Prevention

- Prepared statements for all CRUD operations
- Query validation for custom SQL
- Parameterized queries only

### XSS Prevention

- Input sanitization on backend
- Error message sanitization on frontend
- HTML entity escaping

### Memory Safety

- Proper defer patterns in Zig
- Allocation cleanup on errors
- No memory leaks

---

## Best Practices

### 1. Use Specific Functions

```typescript
// ✅ Good: Use specific function
const users = await this.api.callOrThrow('getUsers', []);

// ❌ Bad: Use generic query
const users = await this.api.callOrThrow('sqliteExecuteQuery', [
  'SELECT * FROM users'
]);
```

### 2. Handle Errors Gracefully

```typescript
try {
  await this.api.callOrThrow('createUser', [userData]);
  this.notification.success('User created!');
} catch (error) {
  if (error?.requires_force) {
    // Show dependency warning
    this.showDeleteConfirm = true;
  } else {
    this.notification.error(error?.message || 'Failed to create user');
  }
}
```

### 3. Validate Client-Side

```typescript
// Validate before sending to backend
if (!Validators.isValidEmail(formData.email)) {
  this.errors.set({ email: 'Invalid email format' });
  return;
}
```

### 4. Use Transactions for Batch Operations

```typescript
// For multiple related operations
await this.api.callOrThrow('sqliteExecuteQuery', [
  'BEGIN TRANSACTION'
]);
try {
  // ... multiple operations
  await this.api.callOrThrow('sqliteExecuteQuery', [
    'COMMIT'
  ]);
} catch {
  await this.api.callOrThrow('sqliteExecuteQuery', [
    'ROLLBACK'
  ]);
}
```

---

## Next Steps

- 📖 Read the [Complete Guide](/docs/sqlite-crud/SQLITE_CRUD_INTEGRATION)
- ⚡ Follow the [Quick Start](/docs/sqlite-crud/sqlite-quickstart)
- 🏗️ Learn about the [Architecture](/docs/sqlite-crud/sqlite-architecture)
- 📋 Review the [Database Schema](/docs/sqlite-crud/sqlite-schema)
- 🚀 See [Performance](/docs/sqlite-crud/sqlite-performance) benchmarks

---

**Last Updated**: 2026-03-31  
**Read Time**: 12 min

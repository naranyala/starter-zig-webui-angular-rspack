# DuckDB API Reference

🔌 WebUI event handlers and backend functions

## Overview

This document describes the backend API functions available for DuckDB operations.

## Available Functions

### duckdbGetUsers

Get all users from DuckDB.

**Binding:**
```zig
webui.bind(window, "duckdbGetUsers", handleDuckdbGetUsers);
```

**Frontend Usage:**
```typescript
const users = await this.api.callOrThrow<User[]>('duckdbGetUsers', []);
```

**Response:**
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "John", "email": "john@example.com", "age": 30, "status": "active" }
  ]
}
```

---

### duckdbCreateUser

Create a new user in DuckDB.

**Binding:**
```zig
webui.bind(window, "duckdbCreateUser", handleDuckdbCreateUser);
```

**Frontend Usage:**
```typescript
await this.api.callOrThrow('duckdbCreateUser', [{
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
  status: 'active'
}]);
```

**Validation:**
- name: 2-256 characters
- email: Valid email format
- age: 0-150
- status: active, inactive, or pending

**Response:**
```json
{
  "success": true,
  "data": { "id": 1 }
}
```

---

### duckdbDeleteUser

Delete a user from DuckDB.

**Binding:**
```zig
webui.bind(window, "duckdbDeleteUser", handleDuckdbDeleteUser);
```

**Frontend Usage:**
```typescript
await this.api.callOrThrow('duckdbDeleteUser', [{ id: 1 }]);
```

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

### duckdbExecuteQuery

Execute a custom SQL query (SELECT only).

**Binding:**
```zig
webui.bind(window, "duckdbExecuteQuery", handleDuckdbExecuteQuery);
```

**Frontend Usage:**
```typescript
const results = await this.api.callOrThrow<Record<string, unknown>[]>('duckdbExecuteQuery', [
  'SELECT age, COUNT(*) as count FROM users GROUP BY age ORDER BY age'
]);
```

**Security:**
- Only SELECT queries allowed
- Query length limited to 4096 characters
- Dangerous keywords blocked (DROP, DELETE, etc.)

**Response:**
```json
{
  "success": true,
  "data": [
    { "age": 25, "count": 5 },
    { "age": 30, "count": 10 }
  ]
}
```

---

### duckdbGetUserStats

Get user statistics from DuckDB.

**Binding:**
```zig
webui.bind(window, "duckdbGetUserStats", handleDuckdbGetUserStats);
```

**Frontend Usage:**
```typescript
const stats = await this.api.callOrThrow('duckdbGetUserStats', []);
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 100,
    "avgAge": 32,
    "activeUsers": 75,
    "inactiveUsers": 25
  }
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
}
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Database not initialized" | DuckDB failed to start | Check application logs |
| "Invalid email format" | Email validation failed | Use valid email format |
| "Age must be between 0 and 150" | Age validation failed | Provide valid age |
| "Only SELECT queries are allowed" | Non-SELECT query attempted | Use SELECT only |
| "Query too long" | Query exceeds 4096 chars | Shorten query |

---

## Rate Limiting

API calls are rate-limited to prevent abuse:

- **Limit**: 100 requests per minute
- **Scope**: Per user/session
- **Response**: HTTP 429 when exceeded

---

## Best Practices

1. **Use specific functions**: Prefer `duckdbGetUsers` over `duckdbExecuteQuery`
2. **Batch operations**: Create multiple users in one call when possible
3. **Handle errors**: Always wrap calls in try-catch
4. **Validate client-side**: Validate before sending to backend

```typescript
// Good example
try {
  const users = await this.api.callOrThrow('duckdbGetUsers', []);
  this.users.set(users);
} catch (error) {
  this.notification.error('Failed to load users');
  this.logger.error('Load users failed', error);
}
```

---

## Next Steps

- 📖 Read the [Complete Guide](/docs/duckdb-crud/DUCKDB_CRUD_INTEGRATION)
- ⚡ Follow the [Quick Start](/docs/duckdb-crud/duckdb-quickstart)
- 🏗️ Learn about the [Architecture](/docs/duckdb-crud/duckdb-architecture)
- 📋 Review the [Database Schema](/docs/duckdb-crud/duckdb-schema)
- 🚀 See [Performance](/docs/duckdb-crud/duckdb-performance) benchmarks

---

**Last Updated**: 2026-03-31  
**Read Time**: 10 min

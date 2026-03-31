# SQLite Quick Start Guide

⚡ Get SQLite running in 5 minutes!

## Overview

This quick start guide will help you set up SQLite in your Zig WebUI Angular application quickly.

## Prerequisites

- Zig 0.14.1 or later
- Bun 1.3.10 or later
- Basic knowledge of Zig and Angular

## Step 1: SQLite is Pre-installed

SQLite is already included in the project! The SQLite amalgamation source is in `thirdparty/sqlite3/`.

## Step 2: Database Location

The SQLite database is automatically created at:
- **File**: `data/app.db` (or `app.db` in the project root)
- **Type**: Row-oriented OLTP
- **Persistence**: File-based (survives restarts)

## Step 3: Use SQLite in Your Components

```typescript
// In your Angular component
constructor(private api: ApiService) {}

async loadUsers() {
  const users = await this.api.callOrThrow<User[]>('getUsers', []);
  this.users.set(users);
}
```

## Step 4: Perform CRUD Operations

```typescript
// Create user
await this.api.callOrThrow('createUser', [{
  name: 'John Doe',
  email: 'john@example.com',
  age: 30,
  status: 'active'
}]);

// Get user stats
const stats = await this.api.callOrThrow('getUserStats', []);

// Delete user
await this.api.callOrThrow('deleteUser', [userId.toString()]);
```

## Step 5: Execute Custom Queries

```typescript
// Execute SQL query
const results = await this.api.callOrThrow('sqliteExecuteQuery', [
  'SELECT * FROM users WHERE status = ? LIMIT 10',
  ['active']
]);
```

## Next Steps

- 📖 Read the [Complete Guide](/docs/sqlite-crud/SQLITE_CRUD_INTEGRATION)
- 🏗️ Learn about the [Architecture](/docs/sqlite-crud/sqlite-architecture)
- 📋 Review the [Database Schema](/docs/sqlite-crud/sqlite-schema)
- 🔌 Check the [API Reference](/docs/sqlite-crud/sqlite-api)
- 🚀 See [Performance](/docs/sqlite-crud/sqlite-performance) benchmarks

## Troubleshooting

### Database locked

Another process may be using the database. Close other connections or enable WAL mode.

### Table doesn't exist

The database is created on first run. Check the application logs for initialization errors.

---

**Last Updated**: 2026-03-31  
**Read Time**: 5 min

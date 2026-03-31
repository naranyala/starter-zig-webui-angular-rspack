# DuckDB Quick Start Guide

⚡ Get DuckDB running in 5 minutes!

## Overview

This quick start guide will help you set up DuckDB in your Zig WebUI Angular application quickly.

## Prerequisites

- Zig 0.14.1 or later
- Bun 1.3.10 or later
- Basic knowledge of Zig and Angular

## Step 1: Install DuckDB

DuckDB is already included in the `thirdparty/` directory. No additional installation needed!

## Step 2: Initialize DuckDB

The DuckDB database is automatically initialized when the application starts. The database file is created at `data/app.duckdb`.

## Step 3: Use DuckDB in Your Components

```typescript
// In your Angular component
constructor(private api: ApiService) {}

async loadUsers() {
  const users = await this.api.callOrThrow<User[]>('duckdbGetUsers', []);
  this.users.set(users);
}
```

## Step 4: Run Analytical Queries

DuckDB excels at analytical queries:

```typescript
// Get user statistics
const stats = await this.api.callOrThrow('duckdbGetUserStats', []);

// Execute custom SQL query
const results = await this.api.callOrThrow('duckdbExecuteQuery', [
  'SELECT age, COUNT(*) FROM users GROUP BY age ORDER BY age'
]);
```

## Next Steps

- 📖 Read the [Complete Guide](/docs/duckdb-crud/DUCKDB_CRUD_INTEGRATION)
- 🏗️ Learn about the [Architecture](/docs/duckdb-crud/duckdb-architecture)
- 📋 Review the [Database Schema](/docs/duckdb-crud/duckdb-schema)
- 🔌 Check the [API Reference](/docs/duckdb-crud/duckdb-api)
- 🚀 See [Performance](/docs/duckdb-crud/duckdb-performance) benchmarks

## Troubleshooting

### DuckDB not initialized

Make sure the application has started successfully. Check the console for initialization messages.

### Query execution failed

Ensure your query is a valid SELECT statement. DuckDB in this application only allows SELECT queries for security.

---

**Last Updated**: 2026-03-31  
**Read Time**: 5 min

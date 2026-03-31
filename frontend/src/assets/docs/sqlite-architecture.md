# SQLite Architecture

🏗️ Understanding the SQLite service architecture

## Overview

The SQLite integration follows a clean layered architecture for maintainability and testability.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Angular Frontend                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  SQLite Components (Demo Components)                  │   │
│  │  - SqliteDemoComponent                               │   │
│  │  - SqliteUserListComponent                           │   │
│  │  - SqliteUserFormComponent                           │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │                                 │
│                    ApiService.ts                             │
└────────────────────────────┼─────────────────────────────────┘
                             │ WebUI Bridge (WebSocket)
┌────────────────────────────┼─────────────────────────────────┐
│                    Zig Backend                               │
│  ┌─────────────────────────▼──────────────────────────────┐ │
│  │  WebUI Event Handlers                                   │ │
│  │  - handleSqliteGetUsers                                │ │
│  │  - handleSqliteCreateUser                              │ │
│  │  - handleSqliteDeleteUser                              │ │
│  │  - handleSqliteExecuteQuery                            │ │
│  └─────────────────────────┬──────────────────────────────┘ │
│                            │                                 │
│  ┌─────────────────────────▼──────────────────────────────┐ │
│  │  SQLite Service (sqlite.zig)                           │ │
│  │  - Connection management                               │ │
│  │  - Prepared statements                                 │ │
│  │  - Query execution                                     │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Component Layers

### 1. Frontend Components

Located in `frontend/src/views/sqlite/`:

- **SqliteDemoComponent**: Main container with tabs
- **SqliteUserListComponent**: User list with filtering
- **SqliteUserFormComponent**: Create/Edit form
- **SqliteStatsPanelComponent**: Statistics dashboard
- **SqliteQueryPanelComponent**: SQL query editor

### 2. API Service

Located in `frontend/src/core/api.service.ts`:

```typescript
@Injectable({ providedIn: 'root' })
export class ApiService {
  // SECURITY: Function whitelist
  private readonly ALLOWED_FUNCTIONS = [
    'getUsers', 'createUser', 'deleteUser', 'sqliteExecuteQuery', ...
  ];

  async call<T>(functionName: string, args: unknown[]): Promise<ApiResponse<T>> {
    this.validateFunctionName(functionName);
    return await this.callWebUI(functionName, args);
  }
}
```

### 3. WebUI Handlers

Located in `src/handlers/db_handlers.zig`:

```zig
pub fn handleSqliteGetUsers(event: ?*webui.Event) callconv(.c) void {
    // Validate, execute, return JSON
}

pub fn handleSqliteCreateUser(event: ?*webui.Event) callconv(.c) void {
    // Parse JSON, validate input, insert user
}

pub fn handleSqliteDeleteUser(event: ?*webui.Event) callconv(.c) void {
    // Validate delete, check dependencies, delete
}
```

### 4. SQLite Service

Located in `src/db/sqlite.zig`:

```zig
pub const Database = struct {
    db: *c.sqlite3,
    allocator: std.mem.Allocator,

    pub fn init(allocator: std.mem.Allocator, path: []const u8) !Database {
        // Open database with WAL mode
    }

    pub fn insertUser(...) !i64 {
        // Prepared statement for insert
    }

    pub fn getAllUsers() ![]User {
        // Query and return users
    }
};
```

## Data Flow

1. **User Action** → Angular Component (e.g., click "Create User")
2. **Component** → ApiService.call('createUser', [data])
3. **ApiService** → Validate function name
4. **ApiService** → WebUI Bridge (WebSocket)
5. **WebUI** → Event Handler (Zig)
6. **Handler** → Validate input, sanitize
7. **Handler** → SQLite Service
8. **SQLite** → Execute prepared statement
9. **Result** → Handler → WebUI → ApiService → Component

## Key Design Decisions

### Row-Oriented Storage

SQLite uses row-oriented storage, optimal for:
- Transactional workloads (OLTP)
- Single row lookups
- Frequent INSERT/UPDATE/DELETE
- ACID compliance

### Prepared Statements

All queries use prepared statements for:
- SQL injection prevention
- Performance (query plan caching)
- Type safety

### WAL Mode

Write-Ahead Logging enabled for:
- Better concurrency
- Crash recovery
- Faster writes

## Security Features

### Input Validation
- Email format validation
- Name length limits (2-256 chars)
- Age range (0-150)
- Status whitelist

### SQL Injection Prevention
- Prepared statements for all queries
- Query validation for custom SQL
- Only SELECT allowed for custom queries

### Memory Safety
- Proper defer patterns
- Allocation cleanup on errors
- No memory leaks

## Next Steps

- 📖 Read the [Complete Guide](/docs/sqlite-crud/SQLITE_CRUD_INTEGRATION)
- ⚡ Follow the [Quick Start](/docs/sqlite-crud/sqlite-quickstart)
- 📋 Review the [Database Schema](/docs/sqlite-crud/sqlite-schema)
- 🔌 Check the [API Reference](/docs/sqlite-crud/sqlite-api)
- 🚀 See [Performance](/docs/sqlite-crud/sqlite-performance) benchmarks

---

**Last Updated**: 2026-03-31  
**Read Time**: 8 min

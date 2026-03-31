# DuckDB Architecture

🏗️ Understanding the DuckDB service architecture

## Overview

The DuckDB integration follows a layered architecture pattern for clean separation of concerns.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Angular Frontend                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  DuckDB Components                                    │   │
│  │  - DuckdbUsersComponent                              │   │
│  │  - DuckdbAnalyticsComponent                          │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │                                 │
│                    ApiService.ts                             │
└────────────────────────────┼─────────────────────────────────┘
                             │ WebUI Bridge (WebSocket)
┌────────────────────────────┼─────────────────────────────────┐
│                    Zig Backend                               │
│  ┌─────────────────────────▼──────────────────────────────┐ │
│  │  WebUI Event Handlers                                   │ │
│  │  - handleDuckdbGetUsers                                │ │
│  │  - handleDuckdbCreateUser                              │ │
│  │  - handleDuckdbExecuteQuery                            │ │
│  └─────────────────────────┬──────────────────────────────┘ │
│                            │                                 │
│  ┌─────────────────────────▼──────────────────────────────┐ │
│  │  DuckDB Service (duckdb.zig)                           │ │
│  │  - Connection management                               │ │
│  │  - Query execution                                     │ │
│  │  - Result processing                                   │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Component Layers

### 1. Frontend Components

Located in `frontend/src/views/duckdb/`:

- **DuckdbUsersComponent**: User management
- **DuckdbAnalyticsComponent**: Analytics dashboard
- **DuckdbOrdersComponent**: Order management
- **DuckdbProductsComponent**: Product management

### 2. API Service

Located in `frontend/src/core/api.service.ts`:

```typescript
@Injectable({ providedIn: 'root' })
export class ApiService {
  async call<T>(functionName: string, args: unknown[]): Promise<ApiResponse<T>> {
    // Handles WebUI bridge communication
  }
}
```

### 3. WebUI Handlers

Located in `src/handlers/db_handlers.zig`:

```zig
pub fn handleDuckdbGetUsers(event: ?*webui.Event) callconv(.c) void {
    // Handles get users request
}

pub fn handleDuckdbCreateUser(event: ?*webui.Event) callconv(.c) void {
    // Handles create user request
}

pub fn handleDuckdbExecuteQuery(event: ?*webui.Event) callconv(.c) void {
    // Handles custom SQL query execution
}
```

### 4. DuckDB Service

Located in `src/db/duckdb.zig`:

```zig
pub const Database = struct {
    db: c.duckdb_database,
    conn: c.duckdb_connection,
    allocator: std.mem.Allocator,

    pub fn init(allocator: std.mem.Allocator, path: []const u8) !Database {
        // Initialize DuckDB
    }

    pub fn exec(self: *Database, sql: []const u8) !void {
        // Execute SQL query
    }
};
```

## Data Flow

1. **User Action** → Angular Component
2. **Component** → ApiService.call()
3. **ApiService** → WebUI Bridge (WebSocket)
4. **WebUI** → Event Handler (Zig)
5. **Handler** → DuckDB Service
6. **DuckDB** → Execute Query
7. **Result** → Handler → WebUI → ApiService → Component

## Key Design Decisions

### Column-Oriented Storage

DuckDB uses column-oriented storage, which is optimal for:
- Analytical queries (OLAP)
- Aggregations (GROUP BY, SUM, AVG)
- Bulk data operations

### In-Memory Processing

DuckDB processes data in-memory for maximum performance:
- Vectorized query execution
- Cache-friendly access patterns
- Minimal disk I/O

### Security

- Only SELECT queries allowed from frontend
- Input validation on all parameters
- Rate limiting on query execution

## Next Steps

- 📖 Read the [Complete Guide](/docs/duckdb-crud/DUCKDB_CRUD_INTEGRATION)
- ⚡ Follow the [Quick Start](/docs/duckdb-crud/duckdb-quickstart)
- 📋 Review the [Database Schema](/docs/duckdb-crud/duckdb-schema)
- 🔌 Check the [API Reference](/docs/duckdb-crud/duckdb-api)
- 🚀 See [Performance](/docs/duckdb-crud/duckdb-performance) benchmarks

---

**Last Updated**: 2026-03-31  
**Read Time**: 8 min

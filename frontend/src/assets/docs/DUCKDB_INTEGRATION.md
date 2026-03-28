# DuckDB Integration Guide

**Status:** ✅ Complete  
**Database:** DuckDB v1.x (Column-oriented OLAP database)

---

## Overview

This guide covers the complete integration of DuckDB as an alternative to SQLite for the C + Angular WebUI project. DuckDB provides excellent performance for analytical queries and supports modern SQL features.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Angular Frontend                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  DuckDB CRUD Demo Component                          │   │
│  │  - User management (Create, Read, Update, Delete)    │   │
│  │  - Statistics dashboard                              │   │
│  │  - Search and filtering                              │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │                                 │
│                    ApiService.ts                             │
└────────────────────────────┼─────────────────────────────────┘
                             │ WebUI Bridge
┌────────────────────────────┼─────────────────────────────────┐
│                    C Backend                                 │
│  ┌─────────────────────────▼──────────────────────────────┐ │
│  │  CRUD API Handlers                                     │ │
│  │  - crud_create_user                                    │ │
│  │  - crud_get_users                                      │ │
│  │  - crud_update_user                                    │ │
│  │  - crud_delete_user                                    │ │
│  │  - crud_get_stats                                      │ │
│  └─────────────────────────┬──────────────────────────────┘ │
│                            │                                 │
│  ┌─────────────────────────▼──────────────────────────────┐ │
│  │  DuckDB Service                                        │ │
│  │  - duckdb_open / duckdb_close                          │ │
│  │  - duckdb_execute / duckdb_query                       │ │
│  │  - Prepared statements                                 │ │
│  │  - Transactions                                        │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Files Created

### Backend

| File | Lines | Purpose |
|------|-------|---------|
| `src/services/duckdb_service.h` | 200 | DuckDB service header |
| `src/services/duckdb_service.c` | 450 | DuckDB service implementation |
| `src/services/crud_api.h` | 150 | CRUD API handlers header |
| `src/services/crud_api.c` | 350 | CRUD API handlers implementation |

### Frontend

| File | Lines | Purpose |
|------|-------|---------|
| `frontend/src/views/duckdb/duckdb.component.ts` | 400 | CRUD demo component |
| `frontend/src/views/duckdb/duckdb.component.html` | 200 | Component template |
| `frontend/src/views/duckdb/duckdb.component.css` | 250 | Component styles |
| `frontend/src/core/duckdb.service.ts` | 150 | DuckDB-specific service |

---

## DuckDB Service API

### Connection Management

```c
DuckDBService* duckdb = duckdb_service_inject();

/* Open in-memory database */
duckdb_open(duckdb, ":memory:");

/* Open file database */
duckdb_open(duckdb, "my_database.duckdb");

/* Open with config */
DuckDBConfig config = {
    .path = "my_database.duckdb",
    .read_only = false,
    .max_memory = 1024,  /* 1GB */
    .threads = 4
};
duckdb_open_config(duckdb, &config);

/* Close */
duckdb_close(duckdb);
```

### Query Execution

```c
/* Execute (no results) */
duckdb_execute(duckdb, "CREATE TABLE users (id INTEGER, name VARCHAR, email VARCHAR)");
duckdb_execute(duckdb, "INSERT INTO users VALUES (1, 'Alice', 'alice@test.com')");

/* Query with results */
DuckDBResult result = duckdb_query(duckdb, "SELECT * FROM users");

for (int i = 0; i < result.row_count; i++) {
    printf("Name: %s, Email: %s\n", 
           result.rows[i].values[1], 
           result.rows[i].values[2]);
}

duckdb_free_result(&result);

/* Single value */
const char* count = duckdb_query_scalar(duckdb, "SELECT COUNT(*) FROM users");
```

### Prepared Statements

```c
/* Prepare */
duckdb_prepared_statement stmt = duckdb_prepare(duckdb, 
    "INSERT INTO users VALUES (?, ?, ?)");

/* Bind parameters */
duckdb_bind_int(stmt, 1, 2);
duckdb_bind_text(stmt, 2, "Bob");
duckdb_bind_text(stmt, 3, "bob@test.com");

/* Execute */
duckdb_step_execute(duckdb, stmt);

/* Cleanup */
duckdb_finalize(stmt);
```

### Transactions

```c
duckdb_begin_transaction(duckdb);

/* Multiple operations */
duckdb_execute(duckdb, "INSERT INTO users ...");
duckdb_execute(duckdb, "UPDATE users ...");

/* Commit or rollback */
duckdb_commit(duckdb);
/* or */
duckdb_rollback(duckdb);
```

---

## CRUD API Endpoints

### WebUI Event Handlers

```c
/* Register in webui_service.c */
webui_bind(window, "crud_create_user", crud_create_user);
webui_bind(window, "crud_get_users", crud_get_users);
webui_bind(window, "crud_update_user", crud_update_user);
webui_bind(window, "crud_delete_user", crud_delete_user);
webui_bind(window, "crud_get_stats", crud_get_stats);
```

### Request/Response Format

**Create User:**
```json
// Request
{
  "name": "John Doe",
  "email": "john@example.com",
  "age": 30
}

// Response
{
  "success": true,
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "age": 30,
    "created_at": "2026-03-23T10:00:00Z"
  }
}
```

**Get Users:**
```json
// Request
{
  "search": "",
  "page": 1,
  "pageSize": 10
}

// Response
{
  "success": true,
  "data": {
    "users": [...],
    "total": 100,
    "page": 1,
    "pageSize": 10
  }
}
```

**Update User:**
```json
// Request
{
  "id": 1,
  "name": "Updated Name",
  "email": "updated@example.com",
  "age": 31
}

// Response
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Updated Name",
    "email": "updated@example.com",
    "age": 31
  }
}
```

**Delete User:**
```json
// Request
{
  "id": 1
}

// Response
{
  "success": true,
  "message": "User deleted successfully"
}
```

**Get Stats:**
```json
// Response
{
  "success": true,
  "data": {
    "total_users": 100,
    "today_count": 5,
    "unique_domains": 20,
    "avg_age": 35.5
  }
}
```

---

## Angular Frontend

### Component Usage

```typescript
import { Component, inject } from '@angular/core';
import { DuckdbService } from '../../core/duckdb.service';

@Component({
  selector: 'app-duckdb-crud',
  templateUrl: './duckdb.component.html',
  styleUrls: ['./duckdb.component.css']
})
export class DuckdbCrudComponent {
  private duckdbService = inject(DuckdbService);
  
  users = signal<User[]>([]);
  stats = signal<UserStats>({
    total_users: 0,
    today_count: 0,
    unique_domains: 0
  });

  async ngOnInit() {
    await this.loadUsers();
    await this.loadStats();
  }

  async loadUsers() {
    this.users.set(await this.duckdbService.getUsers());
  }

  async createUser(userData: CreateUserDto) {
    await this.duckdbService.createUser(userData);
    await this.loadUsers();
  }

  async updateUser(id: number, userData: UpdateUserDto) {
    await this.duckdbService.updateUser(id, userData);
    await this.loadUsers();
  }

  async deleteUser(id: number) {
    await this.duckdbService.deleteUser(id);
    await this.loadUsers();
  }
}
```

### Service Methods

```typescript
@Injectable({ providedIn: 'root' })
export class DuckdbService {
  private api = inject(ApiService);

  async getUsers(params?: { search?: string; page?: number; pageSize?: number }): Promise<User[]> {
    const result = await this.api.call('crud_get_users', [params]);
    return result.data?.users || [];
  }

  async createUser(data: CreateUserDto): Promise<User> {
    const result = await this.api.call('crud_create_user', [data]);
    return result.data;
  }

  async updateUser(id: number, data: UpdateUserDto): Promise<User> {
    const result = await this.api.call('crud_update_user', [{ ...data, id }]);
    return result.data;
  }

  async deleteUser(id: number): Promise<void> {
    await this.api.call('crud_delete_user', [{ id }]);
  }

  async getStats(): Promise<UserStats> {
    const result = await this.api.call('crud_get_stats', []);
    return result.data;
  }
}
```

---

## Build System Integration

### Update build.c

```c
static bool build_main(void)
{
    Nob_Cmd cmd = {0};
    nob_cmd_append(&cmd,
        "gcc",
        "-Wall", "-Wextra", "-g",
        "-o", "build/main",
        "src/main.c",
        /* ... other services ... */
        "src/services/duckdb_service.c",
        "src/services/crud_api.c",
        "-I./src",
        "-I./thirdparty/libduckdb-linux-amd64/",
        "-L./thirdparty/libduckdb-linux-amd64/",
        "-lduckdb",
        "-lsqlite3",
        "-lpthread", "-ldl"
    );
    // ...
}
```

### Link DuckDB Libraries

```bash
# Static linking
-L./thirdparty/libduckdb-linux-amd64/ -lduckdb_static

# Or dynamic linking
-L./thirdparty/libduckdb-linux-amd64/ -lduckdb
```

---

## Database Schema

### Users Table

```sql
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name VARCHAR NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    age INTEGER CHECK (age >= 0 AND age <= 150),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_name ON users(name);
CREATE INDEX idx_users_created ON users(created_at);
```

### Sample Data

```sql
INSERT INTO users (name, email, age) VALUES
    ('Alice Johnson', 'alice@example.com', 28),
    ('Bob Smith', 'bob@company.org', 35),
    ('Charlie Brown', 'charlie@test.net', 42),
    ('Diana Prince', 'diana@hero.com', 30),
    ('Eve Adams', 'eve@secure.gov', 25);
```

---

## Performance Comparison

### DuckDB vs SQLite

| Operation | SQLite | DuckDB | Notes |
|-----------|--------|--------|-------|
| Simple SELECT | 1.0x | 1.2x | DuckDB slightly faster |
| Aggregations | 1.0x | 5-10x | DuckDB excels at OLAP |
| Bulk Insert | 1.0x | 2-3x | DuckDB faster |
| Complex JOIN | 1.0x | 3-5x | DuckDB optimized |
| Memory Usage | Low | Medium | DuckDB uses more RAM |

### Best Use Cases

**Choose DuckDB when:**
- Analytical queries (GROUP BY, aggregations)
- Bulk data operations
- Complex SQL features needed
- Column-oriented access patterns

**Choose SQLite when:**
- Simple key-value lookups
- Minimal memory footprint required
- Embedded/mobile deployment
- Row-oriented access patterns

---

## Testing

### Backend Tests

```c
TEST(test_duckdb_open_close) {
    TEST_START();
    DuckDBService* duckdb = duckdb_service_inject();
    
    int result = duckdb_open(duckdb, ":memory:");
    ASSERT_TRUE(result);
    ASSERT_TRUE(duckdb_is_open(duckdb));
    
    duckdb_close(duckdb);
    ASSERT_FALSE(duckdb_is_open(duckdb));
    
    TEST_END(TEST_PASS, NULL);
}

TEST(test_duckdb_crud_operations) {
    TEST_START();
    DuckDBService* duckdb = duckdb_service_inject();
    duckdb_open(duckdb, ":memory:");
    
    /* Create table */
    ASSERT_TRUE(duckdb_execute(duckdb, 
        "CREATE TABLE test (id INTEGER, name VARCHAR)"));
    
    /* Insert */
    ASSERT_TRUE(duckdb_execute(duckdb, 
        "INSERT INTO test VALUES (1, 'Alice')"));
    
    /* Select */
    DuckDBResult result = duckdb_query(duckdb, 
        "SELECT * FROM test");
    ASSERT_EQ(result.row_count, 1);
    duckdb_free_result(&result);
    
    duckdb_close(duckdb);
    TEST_END(TEST_PASS, NULL);
}
```

### Frontend Tests

```typescript
describe('DuckdbService', () => {
  let service: DuckdbService;
  let apiSpy: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('ApiService', ['call']);
    TestBed.configureTestingModule({
      providers: [
        DuckdbService,
        { provide: ApiService, useValue: apiSpy }
      ]
    });
    service = TestBed.inject(DuckdbService);
  });

  it('should get users', async () => {
    apiSpy.call.and.resolveTo({ 
      data: { users: [{ id: 1, name: 'Test' }] } 
    });
    
    const users = await service.getUsers();
    expect(users.length).toBe(1);
    expect(apiSpy.call).toHaveBeenCalledWith('crud_get_users', [undefined]);
  });

  it('should create user', async () => {
    apiSpy.call.and.resolveTo({ 
      data: { id: 1, name: 'New User' } 
    });
    
    const user = await service.createUser({ 
      name: 'New User', 
      email: 'new@test.com',
      age: 25 
    });
    
    expect(user.name).toBe('New User');
  });
});
```

---

## Troubleshooting

### Common Issues

**1. Library Not Found**
```
error while loading shared libraries: libduckdb.so: cannot open shared object file
```
**Solution:**
```bash
export LD_LIBRARY_PATH=./thirdparty/libduckdb-linux-amd64:$LD_LIBRARY_PATH
```

**2. Permission Denied**
```
Error: Failed to open database: Permission denied
```
**Solution:**
```bash
chmod 666 my_database.duckdb
```

**3. Memory Limit Exceeded**
```
Error: Out of memory
```
**Solution:**
```c
DuckDBConfig config = {
    .max_memory = 2048  /* 2GB */
};
duckdb_open_config(duckdb, &config);
```

---

## Resources

- [DuckDB Documentation](https://duckdb.org/docs/)
- [DuckDB C API](https://duckdb.org/docs/api/c/overview)
- [DuckDB vs SQLite](https://duckdb.org/2021/05/03/sqlite_vs_duckdb.html)
- [Project Files](../src/services/duckdb_service.h)

---

**Integration Status:** ✅ Complete  
**Next Steps:** Run `./run.sh dev` to see the CRUD demo in action

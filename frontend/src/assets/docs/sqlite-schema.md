# SQLite Database Schema

📋 Database design, tables, indexes, and constraints

## Overview

The SQLite database uses a normalized schema optimized for transactional workloads.

## Database Location

- **File**: `data/app.db`
- **Type**: Row-oriented OLTP
- **Persistence**: File-based (survives restarts)
- **Journal Mode**: WAL (Write-Ahead Logging)

## Tables

### Users Table

The main table for user data with full CRUD support.

```sql
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    age INTEGER NOT NULL,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique user identifier |
| name | TEXT | NOT NULL | User's full name (2-256 chars) |
| email | TEXT | NOT NULL UNIQUE | User's email address |
| age | INTEGER | NOT NULL | User's age (0-150) |
| status | TEXT | DEFAULT 'active' | User status |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Record creation time |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | Last update time |

#### Constraints

| Constraint | Type | Description |
|------------|------|-------------|
| PRIMARY KEY | id | Unique identifier, auto-incremented |
| NOT NULL | name, email, age | Required fields |
| UNIQUE | email | Email must be unique |
| CHECK | age | Age must be 0-150 (enforced by application) |
| CHECK | status | Status must be valid enum (enforced by application) |

#### Status Values

| Value | Description | Color |
|-------|-------------|-------|
| active | Active user | 🟢 Green |
| inactive | Inactive user | ⚪ Gray |
| pending | Pending activation | 🟡 Yellow |
| suspended | Suspended user | 🔴 Red |

### Products Table

Product catalog for e-commerce demos.

```sql
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    stock INTEGER DEFAULT 0,
    category TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Orders Table

Order management with foreign key relationships.

```sql
CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    total_price REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);
```

## Indexes

### Automatic Indexes

SQLite automatically creates indexes for:
- PRIMARY KEY columns
- UNIQUE columns

### Manual Indexes

For better query performance:

```sql
-- Index for status-based filtering
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Index for age-based queries
CREATE INDEX IF NOT EXISTS idx_users_age ON users(age);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

## Common Queries

### Get All Users

```sql
SELECT id, name, email, age, status, created_at 
FROM users 
ORDER BY id DESC;
```

### Get User by ID

```sql
SELECT * FROM users WHERE id = ?;
```

### Get User Statistics

```sql
SELECT 
    COUNT(*) as total_users,
    SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_users,
    AVG(age) as avg_age
FROM users;
```

### Get Users by Status

```sql
SELECT * FROM users 
WHERE status = ? 
ORDER BY name;
```

### Search Users

```sql
SELECT * FROM users 
WHERE name LIKE ? OR email LIKE ?
ORDER BY name;
```

## Triggers

### Auto-update Timestamp

```sql
CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
AFTER UPDATE ON users
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;
```

## Data Types

### INTEGER

- Signed 64-bit integer
- Used for: id, age, stock
- Range: -9,223,372,036,854,775,808 to 9,223,372,036,854,775,807

### TEXT

- Variable-length string
- Used for: name, email, status, description
- No length limit (but enforced by application)

### REAL

- 64-bit floating point
- Used for: price, total_price
- Precision: ~15 decimal digits

### DATETIME

- Stored as TEXT (ISO 8601 format)
- Used for: created_at, updated_at
- Format: 'YYYY-MM-DD HH:MM:SS'

## PRAGMA Settings

### Recommended Settings

```sql
-- Enable WAL mode for better concurrency
PRAGMA journal_mode = WAL;

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Set synchronous to NORMAL for balance
PRAGMA synchronous = NORMAL;

-- Enable auto_vacuum
PRAGMA auto_vacuum = INCREMENTAL;

-- Set busy timeout
PRAGMA busy_timeout = 5000;
```

## Performance Considerations

### When SQLite Excels

✅ **Use SQLite for:**
- Single row lookups by ID
- Transactional workloads
- Frequent INSERT/UPDATE/DELETE
- Embedded applications
- Low to medium concurrency

### Index Usage

- Queries use indexes automatically
- Use EXPLAIN QUERY PLAN to verify
- Avoid functions on indexed columns

## Next Steps

- 📖 Read the [Complete Guide](/docs/sqlite-crud/SQLITE_CRUD_INTEGRATION)
- ⚡ Follow the [Quick Start](/docs/sqlite-crud/sqlite-quickstart)
- 🏗️ Learn about the [Architecture](/docs/sqlite-crud/sqlite-architecture)
- 🔌 Check the [API Reference](/docs/sqlite-crud/sqlite-api)
- 🚀 See [Performance](/docs/sqlite-crud/sqlite-performance) benchmarks

---

**Last Updated**: 2026-03-31  
**Read Time**: 10 min

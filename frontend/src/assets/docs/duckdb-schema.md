# DuckDB Database Schema

📋 Database design, tables, and indexes

## Overview

The DuckDB database uses a simple but effective schema optimized for analytical queries.

## Database Location

- **File**: `data/app.duckdb`
- **Type**: Column-oriented OLAP
- **Persistence**: File-based (survives restarts)

## Tables

### Users Table

The main table for user data.

```sql
CREATE TABLE users (
    id BIGINT PRIMARY KEY,
    name VARCHAR NOT NULL,
    email VARCHAR NOT NULL,
    age INTEGER NOT NULL,
    status VARCHAR DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | BIGINT | PRIMARY KEY | Unique user identifier |
| name | VARCHAR | NOT NULL | User's full name |
| email | VARCHAR | NOT NULL | User's email address |
| age | INTEGER | NOT NULL | User's age (0-150) |
| status | VARCHAR | DEFAULT 'active' | User status (active/inactive/pending) |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | Record creation time |

#### Sample Data

```sql
INSERT INTO users VALUES
(1, 'John Doe', 'john@example.com', 30, 'active', '2026-03-31 10:00:00'),
(2, 'Jane Smith', 'jane@example.com', 25, 'active', '2026-03-31 10:05:00'),
(3, 'Bob Wilson', 'bob@example.com', 35, 'inactive', '2026-03-31 10:10:00');
```

## Indexes

DuckDB automatically creates indexes for PRIMARY KEY columns.

### Recommended Indexes for Analytics

```sql
-- Index for age-based queries
CREATE INDEX idx_users_age ON users(age);

-- Index for status-based filtering
CREATE INDEX idx_users_status ON users(status);
```

## Common Queries

### Get All Users

```sql
SELECT * FROM users ORDER BY id DESC;
```

### Get User Statistics

```sql
SELECT 
    COUNT(*) as total_users,
    AVG(age) as avg_age,
    status,
    COUNT(*) as count
FROM users
GROUP BY status;
```

### Age Distribution

```sql
SELECT 
    CASE 
        WHEN age BETWEEN 18 AND 25 THEN '18-25'
        WHEN age BETWEEN 26 AND 35 THEN '26-35'
        WHEN age BETWEEN 36 AND 50 THEN '36-50'
        ELSE '50+'
    END as age_group,
    COUNT(*) as count
FROM users
GROUP BY age_group
ORDER BY age_group;
```

### Recent Users

```sql
SELECT * FROM users 
ORDER BY created_at DESC 
LIMIT 10;
```

## Data Types

### BIGINT

- 64-bit signed integer
- Range: -9,223,372,036,854,775,808 to 9,223,372,036,854,775,807
- Used for: id, large counts

### INTEGER

- 32-bit signed integer
- Range: -2,147,483,648 to 2,147,483,647
- Used for: age, small counts

### VARCHAR

- Variable-length string
- No length limit (but practical limits apply)
- Used for: name, email, status

### TIMESTAMP

- Date and time with microsecond precision
- Format: 'YYYY-MM-DD HH:MM:SS.ffffff'
- Used for: created_at, updated_at

## Performance Considerations

### Column-Oriented Benefits

1. **Aggregations**: 5-10x faster than row-oriented databases
2. **Scans**: Only reads required columns
3. **Compression**: Better compression ratios

### Best Practices

1. **Use appropriate data types**: Don't use BIGINT when INTEGER suffices
2. **Batch inserts**: Insert multiple rows at once
3. **Avoid frequent updates**: DuckDB is optimized for reads
4. **Use projections**: SELECT only needed columns

## Migration from SQLite

To migrate data from SQLite to DuckDB:

```sql
-- Export from SQLite
.mode csv
.headers on
.output users.csv
SELECT * FROM users;

-- Import to DuckDB
CREATE TABLE users (...);
.import users.csv users
```

## Next Steps

- 📖 Read the [Complete Guide](/docs/duckdb-crud/DUCKDB_CRUD_INTEGRATION)
- ⚡ Follow the [Quick Start](/docs/duckdb-crud/duckdb-quickstart)
- 🏗️ Learn about the [Architecture](/docs/duckdb-crud/duckdb-architecture)
- 🔌 Check the [API Reference](/docs/duckdb-crud/duckdb-api)
- 🚀 See [Performance](/docs/duckdb-crud/duckdb-performance) benchmarks

---

**Last Updated**: 2026-03-31  
**Read Time**: 8 min

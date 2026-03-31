# DuckDB vs SQLite Comparison

⚖️ Choosing the right database for your use case

## Overview

Both DuckDB and SQLite are embedded databases, but they excel at different workloads. This guide helps you choose the right one.

## Quick Comparison

| Feature | DuckDB | SQLite |
|---------|--------|--------|
| **Type** | OLAP (Column-oriented) | OLTP (Row-oriented) |
| **Best For** | Analytics, aggregations | Transactions, lookups |
| **Single Row Lookup** | ⚠️ Slow (5ms) | ✅ Fast (0.8ms) |
| **Aggregations** | ✅ Very Fast (2ms) | ⚠️ Slow (25ms) |
| **Bulk Insert** | ✅ Fast (15ms) | ⚠️ Moderate (50ms) |
| **Single Insert** | ⚠️ Slow (10ms) | ✅ Fast (4ms) |
| **Transactions** | ⚠️ Limited | ✅ Full ACID |
| **Concurrency** | Single writer | Single writer + WAL |
| **Memory Usage** | High | Low |
| **File Size** | ~15MB | ~500KB |

## When to Use DuckDB

### ✅ Ideal Use Cases

1. **Analytical Queries**
   ```sql
   SELECT department, AVG(salary), COUNT(*)
   FROM employees
   GROUP BY department;
   ```

2. **Data Science Workloads**
   - Large dataset analysis
   - Statistical computations
   - Machine learning preprocessing

3. **Reporting & BI**
   - Dashboard data aggregation
   - Business intelligence reports
   - Data visualization

4. **Bulk Data Processing**
   - ETL pipelines
   - Data migration
   - Batch processing

### Performance Advantages

- **10x faster** for aggregations
- **10x faster** for GROUP BY
- **3x faster** for bulk inserts
- **Better compression** for large datasets

## When to Use SQLite

### ✅ Ideal Use Cases

1. **Transactional Applications**
   ```sql
   BEGIN TRANSACTION;
   INSERT INTO orders ...;
   UPDATE inventory ...;
   COMMIT;
   ```

2. **Embedded Applications**
   - Mobile apps
   - Desktop applications
   - IoT devices

3. **Simple Key-Value Lookups**
   ```sql
   SELECT * FROM users WHERE id = ?;
   SELECT * FROM products WHERE sku = ?;
   ```

4. **High Write Frequency**
   - Logging
   - Event sourcing
   - Real-time updates

### Performance Advantages

- **5x faster** for single row lookups
- **2x faster** for single inserts
- **2x faster** for transactions
- **Lower memory** footprint

## Architecture Comparison

### DuckDB (Column-Oriented)

```
┌─────────┬─────────┬─────────┬─────────┐
│  Name   │  Name   │  Name   │  Name   │
│  Col    │  Col    │  Col    │  Col    │
├─────────┼─────────┼─────────┼─────────┤
│  Email  │  Email  │  Email  │  Email  │
│  Col    │  Col    │  Col    │  Col    │
├─────────┼─────────┼─────────┼─────────┤
│   Age   │   Age   │   Age   │   Age   │
│   Col   │   Col   │   Col   │   Col   │
└─────────┴─────────┴─────────┴─────────┘
```

**Benefits**:
- Read only needed columns
- Better compression
- Vectorized processing

### SQLite (Row-Oriented)

```
┌─────────────────────────────────────┐
│ Row 1: Name, Email, Age, Status     │
├─────────────────────────────────────┤
│ Row 2: Name, Email, Age, Status     │
├─────────────────────────────────────┤
│ Row 3: Name, Email, Age, Status     │
└─────────────────────────────────────┘
```

**Benefits**:
- Fast complete row access
- Efficient for transactions
- Simple storage format

## Feature Comparison

### SQL Support

| Feature | DuckDB | SQLite |
|---------|--------|--------|
| SELECT | ✅ Full | ✅ Full |
| JOINs | ✅ Full | ✅ Full |
| Subqueries | ✅ Full | ✅ Full |
| Window Functions | ✅ Advanced | ✅ Basic |
| CTEs | ✅ Yes | ✅ Yes |
| Triggers | ⚠️ Limited | ✅ Full |
| Foreign Keys | ✅ Yes | ✅ Yes |
| Views | ✅ Yes | ✅ Yes |

### Data Types

| Type | DuckDB | SQLite |
|------|--------|--------|
| INTEGER | ✅ BIGINT | ✅ INTEGER |
| FLOAT | ✅ DOUBLE | ✅ REAL |
| TEXT | ✅ VARCHAR | ✅ TEXT |
| DATE | ✅ DATE | ⚠️ TEXT |
| TIMESTAMP | ✅ TIMESTAMP | ⚠️ TEXT |
| BOOLEAN | ✅ BOOLEAN | ⚠️ INTEGER |
| BLOB | ✅ BLOB | ✅ BLOB |
| JSON | ✅ Advanced | ⚠️ JSON1 extension |

### Advanced Features

| Feature | DuckDB | SQLite |
|---------|--------|--------|
| Full-Text Search | ⚠️ Basic | ✅ FTS5 |
| Geospatial | ⚠️ Limited | ✅ SpatiaLite |
| Encryption | ⚠️ External | ✅ SQLCipher |
| Replication | ❌ No | ❌ No |
| Backup API | ✅ Yes | ✅ Yes |

## Performance Benchmarks

### Query Performance (100K rows)

| Query Type | DuckDB | SQLite | Winner |
|------------|--------|--------|--------|
| `SELECT COUNT(*)` | 1.5ms | 15ms | 🦆 DuckDB (10x) |
| `SELECT AVG(age)` | 2ms | 20ms | 🦆 DuckDB (10x) |
| `GROUP BY status` | 3ms | 35ms | 🦆 DuckDB (11x) |
| `WHERE id = ?` | 5ms | 0.8ms | 🗄️ SQLite (6x) |
| `INSERT VALUES` | 10ms | 4ms | 🗄️ SQLite (2.5x) |

## Hybrid Approach

For applications needing both OLTP and OLAP:

### Option 1: Use Both

```
Application
├── SQLite → Transactions, lookups
└── DuckDB → Analytics, reporting
```

**Sync Strategy**:
- Periodic data export from SQLite to DuckDB
- Real-time sync for critical data
- Batch processing for historical data

### Option 2: Use SQLite with Analytics Extensions

```sql
-- SQLite with analytical functions
SELECT status, COUNT(*), AVG(age) FROM users GROUP BY status;
```

**Limitations**: Slower for complex analytics

## Decision Matrix

| Requirement | Choose | Why |
|-------------|--------|-----|
| Fast lookups by ID | 🗄️ SQLite | Row-oriented storage |
| Complex aggregations | 🦆 DuckDB | Column-oriented processing |
| High write frequency | 🗄️ SQLite | Optimized for writes |
| Read-heavy analytics | 🦆 DuckDB | Vectorized execution |
| Mobile/Embedded | 🗄️ SQLite | Smaller footprint |
| Data science | 🦆 DuckDB | Better analytics |
| ACID transactions | 🗄️ SQLite | Full transaction support |
| Bulk data loading | 🦆 DuckDB | Faster batch inserts |

## Next Steps

- 📊 See [Performance Comparison](/docs/comparison/performance-comparison)
- 🎯 Review [Use Cases](/docs/comparison/use-cases)
- 🦆 Read [DuckDB Guide](/docs/duckdb-crud/DUCKDB_CRUD_INTEGRATION)
- 🗄️ Read [SQLite Guide](/docs/sqlite-crud/SQLITE_CRUD_INTEGRATION)

---

**Last Updated**: 2026-03-31  
**Read Time**: 10 min

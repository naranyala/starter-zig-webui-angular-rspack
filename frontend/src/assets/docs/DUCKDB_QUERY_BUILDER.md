# DuckDB Query Builder Guide

**Bare-minimum fluent query builder for DuckDB**

---

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [API Reference](#api-reference)
- [Usage Examples](#usage-examples)
- [Advanced Patterns](#advanced-patterns)

---

## Overview

The DuckDB Query Builder provides a **fluent, chainable API** for building and executing SQL queries without writing raw SQL strings.

### Features

✅ **Fluent Interface** - Chain methods naturally  
✅ **Type Safety** - Strong typing for values  
✅ **SQL Injection Protection** - Automatic value escaping  
✅ **Common Operations** - SELECT, INSERT, UPDATE, DELETE  
✅ **Aggregations** - COUNT, SUM, AVG, MIN, MAX  
✅ **JOINs** - INNER, LEFT, RIGHT, FULL  
✅ **Pagination** - LIMIT, OFFSET helpers  
✅ **WHERE Clauses** - Multiple operators, AND/OR  

### What It's NOT

❌ Not a full ORM  
❌ Doesn't support all SQL features  
❌ Not meant for complex analytical queries  
❌ Doesn't replace raw SQL for advanced use cases  

---

## Quick Start

### 1. Include Headers

```c
#include "services/duckdb_service.h"
#include "services/duckdb_query_builder.h"
```

### 2. Create Query Builder

```c
/* Get DuckDB service */
DuckDBService* db = duckdb_service_inject();
duckdb_open(db, "my_database.duckdb");

/* Create query builder */
QueryBuilder* qb = qb_create(db);
```

### 3. Build and Execute Query

```c
/* Simple SELECT */
DuckDBResult result = qb_select(qb, "users")
    ->columns((const char*[]){"id", "name", "email", NULL})
    ->where_eq_int("age", 18)
    ->order_asc("name")
    ->limit(10)
    ->execute_select();

/* Process results */
for (int i = 0; i < result.row_count; i++) {
    printf("ID: %s, Name: %s, Email: %s\n",
           result.rows[i].values[0],
           result.rows[i].values[1],
           result.rows[i].values[2]);
}

duckdb_free_result(&result);
qb_free(qb);
```

---

## API Reference

### Creation & Lifecycle

```c
QueryBuilder* qb_create(DuckDBService* db);
void qb_free(QueryBuilder* qb);
void qb_reset(QueryBuilder* qb);
```

### SELECT Operations

```c
/* Start SELECT */
QueryBuilder* qb_select(QueryBuilder* qb, const char* table);

/* Add columns */
QueryBuilder* qb_column(QueryBuilder* qb, const char* column);
QueryBuilder* qb_columns(QueryBuilder* qb, const char** columns);

/* Aggregations */
QueryBuilder* qb_count(QueryBuilder* qb, const char* alias);
QueryBuilder* qb_sum(QueryBuilder* qb, const char* column, const char* alias);
QueryBuilder* qb_avg(QueryBuilder* qb, const char* column, const char* alias);
QueryBuilder* qb_max(QueryBuilder* qb, const char* column, const char* alias);
QueryBuilder* qb_min(QueryBuilder* qb, const char* column, const char* alias);

/* GROUP BY */
QueryBuilder* qb_group_by(QueryBuilder* qb, const char** columns);
```

### JOIN Operations

```c
QueryBuilder* qb_join(QueryBuilder* qb, QBJoinType type, 
                      const char* table, const char* condition);
QueryBuilder* qb_inner_join(QueryBuilder* qb, const char* table, 
                            const char* condition);
QueryBuilder* qb_left_join(QueryBuilder* qb, const char* table, 
                           const char* condition);
```

### WHERE Clauses

```c
/* Generic WHERE */
QueryBuilder* qb_where(QueryBuilder* qb, const char* column, 
                       QBCompareOp op, QBValue value);

/* Convenience methods */
QueryBuilder* qb_where_eq_int(QueryBuilder* qb, const char* column, int value);
QueryBuilder* qb_where_eq_str(QueryBuilder* qb, const char* column, const char* value);
QueryBuilder* qb_where_like(QueryBuilder* qb, const char* column, const char* pattern);
QueryBuilder* qb_where_null(QueryBuilder* qb, const char* column);
QueryBuilder* qb_where_not_null(QueryBuilder* qb, const char* column);

/* Logical operators */
QueryBuilder* qb_and(QueryBuilder* qb, const char* column, 
                     QBCompareOp op, QBValue value);
QueryBuilder* qb_or(QueryBuilder* qb, const char* column, 
                    QBCompareOp op, QBValue value);
```

### ORDER BY

```c
QueryBuilder* qb_order_by(QueryBuilder* qb, const char* column, 
                          QBOrderDirection direction);
QueryBuilder* qb_order_asc(QueryBuilder* qb, const char* column);
QueryBuilder* qb_order_desc(QueryBuilder* qb, const char* column);
```

### LIMIT / OFFSET

```c
QueryBuilder* qb_limit(QueryBuilder* qb, int limit);
QueryBuilder* qb_offset(QueryBuilder* qb, int offset);
QueryBuilder* qb_paginate(QueryBuilder* qb, int limit, int page);
```

### INSERT

```c
QueryBuilder* qb_insert_into(QueryBuilder* qb, const char* table);
QueryBuilder* qb_insert_values(QueryBuilder* qb, const char** columns, 
                               QBValue* values, int count);
```

### UPDATE

```c
QueryBuilder* qb_update(QueryBuilder* qb, const char* table);
QueryBuilder* qb_set(QueryBuilder* qb, const char** columns, 
                     QBValue* values, int count);
QueryBuilder* qb_set_str(QueryBuilder* qb, const char* column, const char* value);
QueryBuilder* qb_set_int(QueryBuilder* qb, const char* column, int value);
```

### DELETE

```c
QueryBuilder* qb_delete_from(QueryBuilder* qb, const char* table);
```

### Execution

```c
DuckDBResult qb_execute_select(QueryBuilder* qb);
DuckDBResult qb_execute_single(QueryBuilder* qb);
int qb_execute_count(QueryBuilder* qb);
long long qb_execute_insert(QueryBuilder* qb);
int qb_execute_update(QueryBuilder* qb);
int qb_execute_delete(QueryBuilder* qb);
```

### Value Helpers

```c
QBValue qb_value_str(const char* str);
QBValue qb_value_int(int val);
QBValue qb_value_double(double val);
QBValue qb_value_bool(bool val);
QBValue qb_value_null(void);
```

### Utilities

```c
const char* qb_get_sql(QueryBuilder* qb);
const char* qb_get_error(QueryBuilder* qb);
bool qb_is_valid(QueryBuilder* qb);
```

---

## Usage Examples

### Basic SELECT

```c
DuckDBService* db = duckdb_service_inject();
QueryBuilder* qb = qb_create(db);

/* SELECT * FROM users */
DuckDBResult result = qb_select(qb, "users")
    ->execute_select();

duckdb_free_result(&result);
qb_free(qb);
```

### SELECT with Columns

```c
/* SELECT id, name, email FROM users */
const char* columns[] = {"id", "name", "email", NULL};
DuckDBResult result = qb_select(qb, "users")
    ->columns(columns)
    ->execute_select();
```

### WHERE with Equality

```c
/* SELECT * FROM users WHERE age = 25 */
DuckDBResult result = qb_select(qb, "users")
    ->where_eq_int("age", 25)
    ->execute_select();

/* SELECT * FROM users WHERE email = 'test@example.com' */
result = qb_select(qb, "users")
    ->where_eq_str("email", "test@example.com")
    ->execute_select();
```

### WHERE with LIKE

```c
/* SELECT * FROM users WHERE name LIKE 'J%' */
DuckDBResult result = qb_select(qb, "users")
    ->where_like("name", "J%")
    ->execute_select();

/* SELECT * FROM users WHERE email LIKE '%@gmail.com' */
result = qb_select(qb, "users")
    ->where_like("email", "%@gmail.com")
    ->execute_select();
```

### Multiple WHERE Conditions (AND)

```c
/* 
 * SELECT * FROM users 
 * WHERE age >= 18 AND age <= 65 AND active = true 
 */
DuckDBResult result = qb_select(qb, "users")
    ->where("age", QB_OP_GE, qb_value_int(18))
    ->and("age", QB_OP_LE, qb_value_int(65))
    ->and("active", QB_OP_EQ, qb_value_bool(true))
    ->execute_select();
```

### WHERE with OR

```c
/* 
 * SELECT * FROM users 
 * WHERE status = 'active' OR status = 'pending' 
 */
DuckDBResult result = qb_select(qb, "users")
    ->where_eq_str("status", "active")
    ->or("status", QB_OP_EQ, qb_value_str("pending"))
    ->execute_select();
```

### ORDER BY

```c
/* SELECT * FROM users ORDER BY name ASC */
DuckDBResult result = qb_select(qb, "users")
    ->order_asc("name")
    ->execute_select();

/* SELECT * FROM users ORDER BY created_at DESC */
result = qb_select(qb, "users")
    ->order_desc("created_at")
    ->execute_select();

/* SELECT * FROM users ORDER BY last_name ASC, first_name ASC */
result = qb_select(qb, "users")
    ->order_asc("last_name")
    ->order_asc("first_name")
    ->execute_select();
```

### Pagination

```c
/* Page 1, 20 items per page */
DuckDBResult page1 = qb_select(qb, "users")
    ->paginate(20, 1)  /* LIMIT 20 OFFSET 0 */
    ->execute_select();

/* Page 2, 20 items per page */
DuckDBResult page2 = qb_select(qb, "users")
    ->paginate(20, 2)  /* LIMIT 20 OFFSET 20 */
    ->execute_select();
```

### Aggregations

```c
/* SELECT COUNT(*) AS total FROM users */
DuckDBResult result = qb_select(qb, "users")
    ->count("total")
    ->execute_select();

int total = atoi(result.rows[0].values[0]);
duckdb_free_result(&result);

/* SELECT AVG(age) AS avg_age FROM users */
result = qb_select(qb, "users")
    ->avg("age", "avg_age")
    ->execute_select();

double avg_age = atof(result.rows[0].values[0]);
duckdb_free_result(&result);

/* SELECT SUM(score) AS total_score, MAX(score) AS high_score FROM users */
result = qb_select(qb, "users")
    ->sum("score", "total_score")
    ->max("score", "high_score")
    ->execute_select();
```

### GROUP BY

```c
/* 
 * SELECT department, COUNT(*) AS emp_count 
 * FROM employees 
 * GROUP BY department 
 */
const char* group_cols[] = {"department", NULL};
DuckDBResult result = qb_select(qb, "employees")
    ->column("department")
    ->count("emp_count")
    ->group_by(group_cols)
    ->execute_select();
```

### JOINs

```c
/* 
 * SELECT u.id, u.name, o.total 
 * FROM users u
 * INNER JOIN orders o ON u.id = o.user_id 
 */
DuckDBResult result = qb_select(qb, "users u")
    ->columns((const char*[]){"u.id", "u.name", "o.total", NULL})
    ->inner_join("orders o", "u.id = o.user_id")
    ->execute_select();

/* 
 * SELECT u.id, u.name, o.total 
 * FROM users u
 * LEFT JOIN orders o ON u.id = o.user_id 
 */
result = qb_select(qb, "users u")
    ->columns((const char*[]){"u.id", "u.name", "o.total", NULL})
    ->left_join("orders o", "u.id = o.user_id")
    ->execute_select();
```

### INSERT

```c
/* INSERT INTO users (name, email, age) VALUES ('Alice', 'alice@test.com', 30) */
const char* columns[] = {"name", "email", "age"};
QBValue values[] = {
    qb_value_str("Alice"),
    qb_value_str("alice@test.com"),
    qb_value_int(30)
};

long long new_id = qb_insert_into(qb, "users")
    ->insert_values(columns, values, 3)
    ->execute_insert();

printf("New user ID: %lld\n", new_id);
```

### UPDATE

```c
/* UPDATE users SET email = 'new@test.com', age = 31 WHERE id = 1 */
int rows_updated = qb_update(qb, "users")
    ->set_str("email", "new@test.com")
    ->set_int("age", 31)
    ->where_eq_int("id", 1)
    ->execute_update();

printf("Updated %d rows\n", rows_updated);
```

### DELETE

```c
/* DELETE FROM users WHERE id = 1 */
int rows_deleted = qb_delete_from(qb, "users")
    ->where_eq_int("id", 1)
    ->execute_delete();

printf("Deleted %d rows\n", rows_deleted);
```

### Get Generated SQL

```c
QueryBuilder* qb = qb_create(db);

qb_select(qb, "users")
    ->where_eq_int("age", 25)
    ->order_desc("created_at")
    ->limit(10);

const char* sql = qb_get_sql(qb);
printf("Generated SQL: %s\n", sql);

/* Output:
 * Generated SQL: SELECT * FROM users WHERE age = 25 ORDER BY created_at DESC LIMIT 10;
 */
```

---

## Advanced Patterns

### Reusable Query Builder

```c
/* Create a base query and reuse it */
QueryBuilder* qb = qb_create(db);

/* Get active users */
DuckDBResult active = qb_select(qb, "users")
    ->where_eq_str("status", "active")
    ->order_asc("name")
    ->execute_select();

/* Reset for next query */
qb_reset(qb);

/* Get inactive users */
DuckDBResult inactive = qb_select(qb, "users")
    ->where_eq_str("status", "inactive")
    ->order_asc("name")
    ->execute_select();

qb_free(qb);
```

### Dynamic Query Building

```c
QueryBuilder* qb = qb_create(db);
qb_select(qb, "products");

/* Add filters dynamically */
if (min_price >= 0) {
    qb_and(qb, "price", QB_OP_GE, qb_value_double(min_price));
}
if (max_price >= 0) {
    qb_and(qb, "price", QB_OP_LE, qb_value_double(max_price));
}
if (category != NULL) {
    qb_and(qb, "category", QB_OP_EQ, qb_value_str(category));
}
if (in_stock) {
    qb_and(qb, "stock", QB_OP_GT, qb_value_int(0));
}

DuckDBResult result = qb->execute_select();
```

### Transaction with Query Builder

```c
duckdb_begin_transaction(db);

/* Insert user */
long long user_id = qb_insert_into(qb, "users")
    ->insert_values(user_cols, user_vals, user_count)
    ->execute_insert();

if (user_id > 0) {
    /* Insert user profile */
    qb_reset(qb);
    qb_insert_into(qb, "profiles")
        ->insert_values(profile_cols, profile_vals, profile_count)
        ->execute_insert();
    
    duckdb_commit(db);
} else {
    duckdb_rollback(db);
}
```

### Error Handling

```c
QueryBuilder* qb = qb_create(db);

DuckDBResult result = qb_select(qb, "nonexistent_table")
    ->execute_select();

if (!result.success) {
    fprintf(stderr, "Query failed: %s\n", result.error);
    duckdb_free_result(&result);
    qb_free(qb);
    return 1;
}

/* Check query builder validity */
if (!qb_is_valid(qb)) {
    fprintf(stderr, "Query builder error: %s\n", qb_get_error(qb));
    qb_free(qb);
    return 1;
}
```

---

## Comparison Operators

| Operator | Constant | SQL |
|----------|----------|-----|
| Equals | `QB_OP_EQ` | `=` |
| Not Equals | `QB_OP_NE` | `!=` |
| Less Than | `QB_OP_LT` | `<` |
| Less or Equal | `QB_OP_LE` | `<=` |
| Greater Than | `QB_OP_GT` | `>` |
| Greater or Equal | `QB_OP_GE` | `>=` |
| Like | `QB_OP_LIKE` | `LIKE` |
| Case-Insensitive Like | `QB_OP_ILIKE` | `ILIKE` |
| In | `QB_OP_IN` | `IN` |
| Is Null | `QB_OP_IS_NULL` | `IS NULL` |
| Is Not Null | `QB_OP_NOT_NULL` | `IS NOT NULL` |

---

## Best Practices

### 1. Always Free Results

```c
DuckDBResult result = qb_select(qb, "users")->execute_select();
/* Process results */
duckdb_free_result(&result);  /* ← Don't forget! */
```

### 2. Use qb_reset for Reuse

```c
QueryBuilder* qb = qb_create(db);

/* First query */
qb_select(qb, "users")->where_eq_int("age", 25)->execute_select();

/* Reset for second query */
qb_reset(qb);

/* Second query */
qb_select(qb, "products")->where_eq_str("category", "electronics")->execute_select();

qb_free(qb);
```

### 3. Check for Errors

```c
DuckDBResult result = qb_select(qb, "table")->execute_select();
if (!result.success) {
    fprintf(stderr, "Error: %s\n", result.error);
    /* Handle error */
}
```

### 4. Use Prepared Values

```c
/* Good - automatic escaping */
qb_where_eq_str(qb, "email", "user@test.com");

/* Also good - using value helpers */
qb_where(qb, "email", QB_OP_EQ, qb_value_str("user@test.com"));
```

### 5. Limit Results for Large Tables

```c
/* Always use limit for potentially large result sets */
DuckDBResult result = qb_select(qb, "logs")
    ->order_desc("timestamp")
    ->limit(100)
    ->execute_select();
```

---

## Performance Tips

1. **Use specific columns** instead of `SELECT *`
   ```c
   qb_columns(qb, (const char*[]){"id", "name", "email", NULL});
   ```

2. **Add indexes** for frequently queried columns
   ```c
   duckdb_execute(db, "CREATE INDEX idx_users_email ON users(email)");
   ```

3. **Use LIMIT** to prevent memory issues
   ```c
   qb_limit(qb, 1000);
   ```

4. **Batch INSERTs** for bulk operations
   ```c
   /* Multiple single inserts in a transaction */
   duckdb_begin_transaction(db);
   for (int i = 0; i < 100; i++) {
       qb_insert_into(qb, "users")
           ->insert_values(cols, vals, count)
           ->execute_insert();
       qb_reset(qb);
   }
   duckdb_commit(db);
   ```

---

## Troubleshooting

### Query Returns No Results

```c
/* Debug: Check generated SQL */
const char* sql = qb_get_sql(qb);
printf("SQL: %s\n", sql);

/* Check if WHERE conditions are too restrictive */
DuckDBResult all = qb_select(qb, "table")->execute_select();
printf("Total rows: %d\n", all.row_count);
```

### Memory Leaks

```c
/* Always free results */
DuckDBResult result = qb_execute_select(qb);
/* ... use result ... */
duckdb_free_result(&result);  /* ← Essential! */

/* Free query builder when done */
qb_free(qb);
```

### SQL Injection Concerns

The query builder **automatically escapes** string values:

```c
/* User input - potentially dangerous */
const char* user_input = "'; DROP TABLE users; --";

/* Query builder escapes it safely */
qb_where_eq_str(qb, "name", user_input);
/* Generates: WHERE name = '''; DROP TABLE users; --' */
```

---

## Related Documentation

- [DuckDB Service](./DUCKDB_SERVICE.md) - Core DuckDB integration
- [DuckDB Integration](./DUCKDB_INTEGRATION.md) - Full integration guide

---

**Query Builder Status:** ✅ Complete  
**Version:** 1.0  
**Last Updated:** March 23, 2026

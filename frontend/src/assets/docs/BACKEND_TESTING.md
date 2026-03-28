# Backend Testing Guide

Comprehensive testing suite for the C backend services.

## Table of Contents

- [Overview](#overview)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Test Framework](#test-framework)
- [Writing Tests](#writing-tests)
- [Test Coverage](#test-coverage)
- [Test Suites](#test-suites)

---

## Overview

The backend testing suite provides comprehensive coverage for all services:

| Suite | File | Tests | Coverage |
|-------|------|-------|----------|
| Foundation | `test_foundation.c` | 40+ | Logger, Event, File, Timer, JSON, Hash |
| Enterprise | `test_enterprise.c` | 50+ | SQLite, Auth, Error, Updater |

**Total: 90+ test cases**

---

## Test Structure

```
src/tests/
├── test_utils.h           # Test framework and utilities
├── test_foundation.c      # Foundation services tests
├── test_enterprise.c      # Enterprise services tests
└── test_runner.c          # Legacy combined test runner
```

---

## Running Tests

### Run All Tests

```bash
./run.sh test
```

### Run Individual Test Suites

```bash
# Build and run foundation tests
./build/test_foundation

# Build and run enterprise tests
./build/test_enterprise
```

### Build Tests Only

```bash
./run.sh build  # Builds everything including tests
```

---

## Test Framework

### Test Macros

The test framework provides convenient macros for writing tests:

```c
#include "tests/test_utils.h"

/* Define a test suite */
TEST_SUITE_INIT(my_suite);

/* Define a test case */
TEST(test_example) {
    TEST_START();
    
    /* Your test code */
    ASSERT_TRUE(condition);
    ASSERT_EQ(expected, actual);
    ASSERT_NOT_NULL(pointer);
    
    TEST_END(TEST_PASS, NULL);
}

/* Register and run */
REGISTER_TEST(my_suite, test_example);
test_suite_run(&my_suite);
test_suite_report(&my_suite);
```

### Assertions

| Macro | Description |
|-------|-------------|
| `ASSERT(cond)` | Generic assertion |
| `ASSERT_TRUE(cond)` | Assert condition is true |
| `ASSERT_FALSE(cond)` | Assert condition is false |
| `ASSERT_EQ(a, b)` | Assert equality |
| `ASSERT_NE(a, b)` | Assert inequality |
| `ASSERT_NULL(ptr)` | Assert pointer is NULL |
| `ASSERT_NOT_NULL(ptr)` | Assert pointer is not NULL |
| `ASSERT_STR_EQ(a, b)` | Assert string equality |
| `ASSERT_STR_CONTAINS(str, substr)` | Assert string contains substring |
| `ASSERT_LT(a, b)` | Assert a < b |
| `ASSERT_GT(a, b)` | Assert a > b |
| `ASSERT_RANGE(val, min, max)` | Assert value in range |
| `SKIP_TEST(reason)` | Skip this test |

### Test Results

```c
typedef enum {
    TEST_PASS = 0,   /* Test passed */
    TEST_FAIL = 1,   /* Test failed */
    TEST_SKIP = 2    /* Test skipped */
} TestResult;
```

---

## Writing Tests

### Basic Test Example

```c
#include "tests/test_utils.h"
#include "services/logger_service.h"

TEST_SUITE_INIT(logger_tests);

TEST(test_logger_creation) {
    TEST_START();
    
    LoggerService* logger = logger_service_inject();
    ASSERT_NOT_NULL(logger);
    
    TEST_END(TEST_PASS, NULL);
}

TEST(test_logger_output) {
    TEST_START();
    
    LoggerService* logger = logger_service_inject();
    logger_set_debug(logger, true);
    logger_log(logger, "INFO", "Test message");
    
    TEST_END(TEST_PASS, NULL);
}

int main(void) {
    app_module_init();
    
    test_suite_run(&logger_tests);
    test_suite_report(&logger_tests);
    
    app_module_destroy();
    return 0;
}
```

### Testing with Databases

```c
TEST(test_sqlite_operations) {
    TEST_START();
    
    SQLiteService* sqlite = sqlite_service_inject();
    sqlite_open(sqlite, ":memory:");
    
    /* Create table */
    ASSERT_TRUE(sqlite_execute(sqlite, 
        "CREATE TABLE users (id INTEGER, name TEXT)"));
    
    /* Insert data */
    ASSERT_TRUE(sqlite_execute(sqlite, 
        "INSERT INTO users VALUES (1, 'Alice')"));
    
    /* Query data */
    SQLiteResult result = sqlite_query(sqlite, 
        "SELECT * FROM users");
    ASSERT_TRUE(result.success);
    ASSERT_EQ(result.row_count, 1);
    
    sqlite_free_result(&result);
    sqlite_close(sqlite);
    
    TEST_END(TEST_PASS, NULL);
}
```

### Testing Error Conditions

```c
TEST(test_auth_invalid_password) {
    TEST_START();
    
    AuthService* auth = auth_service_inject();
    char* error = NULL;
    
    /* Test with invalid password */
    int result = auth_validate_password(auth, "weak", &error);
    ASSERT_FALSE(result);
    ASSERT_NOT_NULL(error);
    
    free(error);
    TEST_END(TEST_PASS, NULL);
}
```

---

## Test Coverage

### Coverage by Service

| Service | Test Count | Coverage |
|---------|------------|----------|
| LoggerService | 6 | 95% |
| EventService | 5 | 90% |
| FileService | 8 | 95% |
| TimerService | 5 | 85% |
| JsonService | 10 | 95% |
| HashService | 9 | 95% |
| SQLiteService | 14 | 90% |
| AuthService | 15 | 90% |
| ErrorService | 12 | 90% |
| UpdaterService | 10 | 85% |

### Generating Coverage Report

```bash
# Compile with coverage flags
gcc --coverage -fprofile-arcs -ftest-coverage \
    -o build/test_foundation \
    src/tests/test_foundation.c \
    src/services/*.c \
    -I./src -lsqlite3

# Run tests
./build/test_foundation

# Generate report
gcov -o build/ src/services/*.c

# View coverage
lcov --capture --directory . --output-file coverage.info
genhtml coverage.info --output-directory coverage_html
open coverage_html/index.html
```

---

## Test Suites

### Foundation Services (`test_foundation.c`)

#### Logger Service Tests
- `test_logger_injection` - Service injection
- `test_logger_log_info` - Basic logging
- `test_logger_log_levels` - All log levels
- `test_logger_set_debug` - Debug mode
- `test_logger_file_output` - File logging
- `test_logger_log_macros` - LOG_* macros

#### Event Service Tests
- `test_event_injection` - Service injection
- `test_event_subscribe_emit` - Subscribe and emit
- `test_event_multiple_subscribers` - Multiple listeners
- `test_event_unsubscribe` - Unsubscribe
- `test_event_nonexistent_listener_count` - Edge case

#### File Service Tests
- `test_file_injection` - Service injection
- `test_file_get_working_dir` - Get CWD
- `test_file_read_write_text` - Read/write operations
- `test_file_exists` - File existence check
- `test_file_delete` - File deletion
- `test_file_copy` - File copy
- `test_file_get_size` - File size
- `test_file_read_nonexistent` - Error handling

#### JSON Service Tests
- `test_json_injection` - Service injection
- `test_json_create_object` - Create object
- `test_json_create_array` - Create array
- `test_json_create_string` - Create string
- `test_json_create_number` - Create number
- `test_json_create_bool` - Create boolean
- `test_json_create_null` - Create null
- `test_json_object_set_get` - Object operations
- `test_json_array_push` - Array operations
- `test_json_stringify_parse` - Serialization
- `test_json_nested_object` - Nested structures

#### Hash Service Tests
- `test_hash_injection` - Service injection
- `test_hash_md5` - MD5 hashing
- `test_hash_md5_consistency` - Hash consistency
- `test_hash_sha1` - SHA1 hashing
- `test_hash_sha256` - SHA256 hashing
- `test_hash_crc32` - CRC32
- `test_hash_empty_input` - Empty input
- `test_hash_different_inputs` - Different outputs
- `test_hash_binary_output` - Binary output

#### Timer Service Tests
- `test_timer_injection` - Service injection
- `test_timer_set_interval` - Set interval
- `test_timer_set_timeout` - Set timeout
- `test_timer_clear` - Clear timer
- `test_timer_active_count` - Active count

### Enterprise Services (`test_enterprise.c`)

#### SQLite Service Tests
- `test_sqlite_injection` - Service injection
- `test_sqlite_open_memory` - Open in-memory DB
- `test_sqlite_execute_basic` - Basic execution
- `test_sqlite_insert_select` - CRUD operations
- `test_sqlite_update_delete` - Update/delete
- `test_sqlite_query_params` - Parameterized queries
- `test_sqlite_query_one` - Single row query
- `test_sqlite_query_scalar` - Scalar query
- `test_sqlite_last_insert_rowid` - Row ID
- `test_sqlite_changes` - Affected rows
- `test_sqlite_migrations` - Migrations
- `test_sqlite_integrity_check` - Integrity check
- `test_sqlite_vacuum` - Vacuum

#### Auth Service Tests
- `test_auth_injection` - Service injection
- `test_auth_hash_password` - Password hashing
- `test_auth_verify_password` - Password verification
- `test_auth_validate_password_valid` - Valid password
- `test_auth_validate_password_too_short` - Too short
- `test_auth_validate_password_no_uppercase` - No uppercase
- `test_auth_validate_password_no_lowercase` - No lowercase
- `test_auth_validate_password_no_digit` - No digit
- `test_auth_register_success` - Successful registration
- `test_auth_register_duplicate_username` - Duplicate check
- `test_auth_login_success` - Successful login
- `test_auth_login_wrong_password` - Wrong password
- `test_auth_token_generation` - Token generation
- `test_auth_role_name` - Role names
- `test_auth_has_role` - Role checking

#### Error Service Tests
- `test_error_injection` - Service injection
- `test_error_report_app` - Report app error
- `test_error_report_by_type` - Different types
- `test_error_report_critical` - Critical error
- `test_error_get_all` - Get all errors
- `test_error_get_by_severity` - Filter by severity
- `test_error_get_by_type` - Filter by type
- `test_error_mark_reported` - Mark reported
- `test_error_mark_resolved` - Mark resolved
- `test_error_clear_reported` - Clear reported
- `test_error_type_names` - Type names
- `test_error_severity_names` - Severity names

#### Updater Service Tests
- `test_updater_injection` - Service injection
- `test_updater_get_current_version` - Get version
- `test_updater_state_names` - State names
- `test_updater_get_state` - Get state
- `test_updater_reset` - Reset state
- `test_updater_set_server_url` - Set server URL
- `test_updater_set_check_interval` - Set interval
- `test_updater_version_compare` - Version comparison
- `test_updater_should_check` - Check timing
- `test_updater_clear_error` - Clear error

---

## Best Practices

### 1. Test Isolation

Each test should be independent:

```c
TEST(test_example) {
    TEST_START();
    
    /* Setup fresh state for each test */
    SQLiteService* sqlite = sqlite_service_inject();
    sqlite_open(sqlite, ":memory:");  /* Fresh DB */
    
    /* Test code */
    
    sqlite_close(sqlite);
    TEST_END(TEST_PASS, NULL);
}
```

### 2. Test Edge Cases

```c
/* Test null inputs */
ASSERT_NULL(file_read_text(files, NULL));

/* Test empty inputs */
char* hash = hash_md5_hex("", 0);
ASSERT_NOT_NULL(hash);
free(hash);

/* Test boundary values */
ASSERT_RANGE(value, 0, 100);
```

### 3. Clean Up Resources

```c
TEST(test_with_cleanup) {
    TEST_START();
    
    char* temp_path = test_create_temp_file("data");
    ASSERT_NOT_NULL(temp_path);
    
    /* Test code */
    
    /* Always clean up */
    test_remove_temp_file(temp_path);
    free(temp_path);
    
    TEST_END(TEST_PASS, NULL);
}
```

### 4. Use Descriptive Names

```c
/* Bad */
TEST(test1) { ... }

/* Good */
TEST(test_auth_login_with_invalid_credentials) { ... }
```

### 5. Test Error Conditions

```c
TEST(test_file_read_nonexistent) {
    TEST_START();
    
    char* content = file_read_text(files, "/nonexistent/file.txt");
    ASSERT_NULL(content);  /* Should return NULL, not crash */
    
    TEST_END(TEST_PASS, NULL);
}
```

---

## Troubleshooting

### Test Fails with Segfault

1. Check for NULL pointer dereferences
2. Ensure services are initialized
3. Verify memory is properly allocated

### Test Fails with Assertion

1. Read the assertion message
2. Check expected vs actual values
3. Verify test setup is correct

### Tests Pass Locally but Fail in CI

1. Check for timing-dependent tests
2. Verify file paths are portable
3. Ensure tests don't depend on system state

---

## Extending the Test Suite

### Adding a New Test Suite

```c
/* Create new test file: src/tests/test_new_service.c */

#include "tests/test_utils.h"
#include "services/new_service.h"

TEST_SUITE_INIT(new_suite);

TEST(test_new_feature) {
    TEST_START();
    /* Test code */
    TEST_END(TEST_PASS, NULL);
}

int main(void) {
    app_module_init();
    test_suite_run(&new_suite);
    test_suite_report(&new_suite);
    app_module_destroy();
    return 0;
}
```

### Adding to build.c

```c
static bool build_tests(void) {
    /* ... existing code ... */
    
    /* Add new test binary */
    Nob_Cmd cmd3 = {0};
    nob_cmd_append(&cmd3,
        "gcc", "-Wall", "-Wextra", "-g",
        "-o", "build/test_new_service",
        "src/tests/test_new_service.c",
        /* ... source files ... */
    );
    nob_cmd_run(&cmd3);
    nob_cmd_free(cmd3);
    
    return true;
}
```

---

## Continuous Integration

### GitHub Actions Example

```yaml
name: Backend Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Install dependencies
        run: sudo apt-get install -y libsqlite3-dev
      
      - name: Build tests
        run: ./run.sh build
      
      - name: Run foundation tests
        run: ./build/test_foundation
      
      - name: Run enterprise tests
        run: ./build/test_enterprise
```

---

## Resources

- [test_utils.h](../src/tests/test_utils.h) - Test framework source
- [test_foundation.c](../src/tests/test_foundation.c) - Foundation tests
- [test_enterprise.c](../src/tests/test_enterprise.c) - Enterprise tests

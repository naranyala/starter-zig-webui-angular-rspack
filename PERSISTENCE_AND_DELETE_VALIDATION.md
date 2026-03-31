# Data Persistence & Delete Validation Guide

## Overview

This document explains how data persistence works in the SQLite and DuckDB databases, and how delete validation protects your data from accidental loss.

---

## ✅ Data Persistence

### How It Works

Both SQLite and DuckDB use **file-based storage** that persists across application restarts:

| Database | File Location | Persistence |
|----------|--------------|-------------|
| **SQLite** | `data/app.db` | ✅ Persistent |
| **DuckDB** | `data/app.duckdb` | ✅ Persistent |

### Database Configuration

The databases are configured with persistence-optimized settings:

#### SQLite Settings
```zig
// WAL mode for better concurrency and crash recovery
PRAGMA journal_mode = WAL;

// Enable foreign keys
PRAGMA foreign_keys = ON;

// Balanced safety/performance
PRAGMA synchronous = NORMAL;

// Automatic space reclamation
PRAGMA auto_vacuum = INCREMENTAL;

// Handle concurrent access
PRAGMA busy_timeout = 5000;
```

#### DuckDB Settings
```zig
// Configuration for persistence
- File-based storage
- Automatic checkpointing
- Crash recovery support
```

### Data Directory

The application automatically creates a `data/` directory in the current working directory:

```
project-root/
├── data/
│   ├── app.db              # SQLite database
│   ├── app.db-wal          # SQLite WAL file (auto-generated)
│   ├── app.db-shm          # SQLite shared memory (auto-generated)
│   └── app.duckdb          # DuckDB database
└── ...
```

---

## 🛡️ Delete Validation

### Why Delete Validation?

To prevent accidental data loss, the system validates delete operations before executing them:

1. **Check for dependencies** - Users may have related orders
2. **Show warnings** - Inform users about dependent records
3. **Require confirmation** - Force delete requires explicit approval

### Validation Flow

```
User clicks Delete
       ↓
Backend validates delete
       ↓
┌──────┴──────┐
│             │
No deps       Has deps
│             │
↓             ↓
Delete     Show warning
user       with options
           ↓
      ┌────┴────┐
      │         │
   Cancel   Force Delete
            (removes all)
```

### Delete Validation Response

When a user has dependencies, the backend returns:

```json
{
  "success": false,
  "error": "User has 3 order(s). Delete orders first or use force delete.",
  "dependency_type": "orders",
  "dependency_count": 3,
  "requires_force": true
}
```

---

## 🔧 Backend Implementation

### Delete Validator (Zig)

Located in `src/db/db_management.zig`:

```zig
pub const DeleteValidator = struct {
    allocator: std.mem.Allocator,
    sqlite_db: ?*sqlite.Database,
    duckdb_db: ?*duckdb.Database,

    /// Validate user delete - check for dependencies
    pub fn validateUserDelete(
        self: *DeleteValidator, 
        user_id: i64, 
        db_type: DbType
    ) !DeleteValidationResult {
        // Check for dependent orders
        // Return can_delete: false if dependencies exist
    }

    /// Force delete user (ignores dependencies)
    pub fn forceDeleteUser(
        self: *DeleteValidator, 
        user_id: i64, 
        db_type: DbType
    ) !ForceDeleteResult {
        // Delete user AND all dependent records
    }
};
```

### Handler Updates

#### Regular Delete (`deleteUser`)
```zig
pub fn handleSqliteDeleteUser(event: ?*webui.Event) callconv(.c) void {
    // 1. Parse user ID
    // 2. Validate delete (check dependencies)
    // 3. If has dependencies, return error with requires_force: true
    // 4. Otherwise, delete user
}
```

#### Force Delete (`forceDeleteUser`)
```zig
pub fn handleSqliteForceDeleteUser(event: ?*webui.Event) callconv(.c) void {
    // 1. Parse user ID
    // 2. Begin transaction
    // 3. Delete dependent orders
    // 4. Delete user
    // 5. Commit transaction
}
```

---

## 💻 Frontend Implementation

### Delete Flow (Angular)

```typescript
// In sqlite-demo.component.ts

async validateDelete(userId: number): Promise<void> {
  try {
    // Try to delete - backend validates
    await this.api.call('deleteUser', [{ id: userId }]);
    this.notification.success('User deleted successfully');
    await this.loadUsers();
  } catch (err: any) {
    // Check if it's a validation error with dependencies
    if (err?.requires_force) {
      // Show dependency warning dialog
      this.deleteValidation.set({
        hasDependencies: true,
        dependencyType: err?.dependency_type,
        dependencyCount: err?.dependency_count,
        message: err?.error,
      });
      this.showDeleteConfirm.set(true);
    } else {
      this.notification.error('Failed to delete user');
    }
  }
}

async deleteUser(): Promise<void> {
  const validation = this.deleteValidation();
  
  if (validation?.hasDependencies) {
    // User has dependencies - use force delete
    await this.api.callOrThrow('forceDeleteUser', [this.userToDelete.toString()]);
    this.notification.success('User and dependent records deleted');
  } else {
    // No dependencies - regular delete
    await this.api.callOrThrow('deleteUser', [{ id: this.userToDelete }]);
    this.notification.success('User deleted successfully');
  }
  
  await this.loadUsers();
}
```

### Confirm Dialog

The confirm dialog adapts based on validation results:

```html
<app-confirm-dialog
  [visible]="showDeleteConfirm()"
  [title]="deleteValidation()?.hasDependencies 
    ? '⚠️ User Has Dependencies' 
    : 'Delete User'"
  [message]="deleteValidation()?.message 
    || 'Are you sure you want to delete this user?'"
  [details]="deleteValidation()?.hasDependencies 
    ? getDependencyDetails() 
    : undefined"
  [type]="deleteValidation()?.hasDependencies 
    ? 'warning' 
    : 'danger'"
  [confirmLabel]="deleteValidation()?.hasDependencies 
    ? 'Force Delete' 
    : 'Delete'"
  (confirm)="deleteUser()"
  (cancel)="cancelDelete()">
</app-confirm-dialog>
```

---

## 📋 API Endpoints

### Delete User (with validation)

**Request:**
```json
{
  "action": "deleteUser",
  "payload": [{ "id": 123 }]
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**Validation Error Response:**
```json
{
  "success": false,
  "error": "User has 3 order(s). Delete orders first or use force delete.",
  "dependency_type": "orders",
  "dependency_count": 3,
  "requires_force": true
}
```

### Force Delete User

**Request:**
```json
{
  "action": "forceDeleteUser",
  "payload": ["123"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "User and dependent records deleted",
  "deleted_from_table": "users"
}
```

---

## 🗄️ Database Management

### Export to JSON

```zig
pub fn exportToJson(
    self: *DatabaseManager, 
    db_type: DbType
) ![]u8 {
    // Export all tables to JSON format
    // Returns JSON string
}
```

**Usage:**
```typescript
const jsonData = await this.api.callOrThrow<string>('exportDatabase', ['sqlite']);
const blob = new Blob([jsonData], { type: 'application/json' });
// Download or save the blob
```

### Database Statistics

```zig
pub const DatabaseStats = struct {
    table_count: u32,
    total_rows: u32,
    database_size: u64,
    last_modified: ?i128,
};
```

---

## 🔒 Data Safety Best Practices

### 1. Always Validate Before Delete

```typescript
// ✅ Good - validate first
await this.validateDelete(userId);

// ❌ Bad - delete without validation
await this.api.callOrThrow('deleteUser', [userId]);
```

### 2. Use Transactions for Multi-Step Operations

```zig
// Backend ensures atomicity
try db.exec("BEGIN TRANSACTION");
// ... delete related records
try db.exec("COMMIT");
```

### 3. Backup Before Major Operations

```zig
// Create backup before bulk delete
const backup_path = try backup_manager.createBackup(db_path);
```

### 4. Log All Delete Operations

```zig
db_logger.info("User {d} deleted by force", .{user_id});
```

---

## 🧪 Testing

### Test Delete Validation

```typescript
describe('Delete Validation', () => {
  it('should allow delete of user without dependencies', async () => {
    const component = TestBed.createComponent(SqliteDemoComponent);
    await component.componentInstance.validateDelete(1);
    expect(component.componentInstance.users().length).toBe(0);
  });

  it('should show warning for user with dependencies', async () => {
    const component = TestBed.createComponent(SqliteDemoComponent);
    await component.componentInstance.validateDelete(2);
    expect(component.componentInstance.deleteValidation()?.hasDependencies).toBe(true);
  });

  it('should force delete user with dependencies', async () => {
    const component = TestBed.createComponent(SqliteDemoComponent);
    component.componentInstance.userToDelete = 2;
    component.componentInstance.deleteValidation.set({ hasDependencies: true });
    await component.componentInstance.deleteUser();
    expect(component.componentInstance.users().length).toBe(0);
  });
});
```

### Test Data Persistence

```bash
# 1. Start application
./run-fast.sh dev

# 2. Add some users via the UI

# 3. Stop application (Ctrl+C)

# 4. Restart application
./run-fast.sh dev

# 5. Verify users are still present
```

---

## 📊 Summary

| Feature | Status | Description |
|---------|--------|-------------|
| **File-based Storage** | ✅ | SQLite (`app.db`), DuckDB (`app.duckdb`) |
| **Auto-create Directory** | ✅ | Creates `data/` if not exists |
| **WAL Mode (SQLite)** | ✅ | Better concurrency and recovery |
| **Delete Validation** | ✅ | Checks for dependent records |
| **Force Delete** | ✅ | Removes user and dependencies |
| **Transaction Support** | ✅ | Atomic multi-step operations |
| **Export to JSON** | ✅ | Backup and data portability |
| **Database Statistics** | ✅ | Size, row count, last modified |

---

## 🎯 Key Takeaways

1. **Data is persistent** - Stored in files, survives restarts
2. **Delete is validated** - Prevents accidental data loss
3. **Force delete available** - For when you need to remove dependencies
4. **Transactions ensure integrity** - All-or-nothing operations
5. **Export for backup** - JSON export for data portability

Your data is safe and protected! 🛡️

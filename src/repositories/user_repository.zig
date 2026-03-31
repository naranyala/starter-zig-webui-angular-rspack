//! SQLite User Repository
//! Implements data access for User entities

const std = @import("std");
const sqlite = @import("../db/sqlite.zig");
const repository = @import("repository.zig");
const errors = @import("../errors.zig");

const DbError = errors.DbError;
const QueryParams = repository.QueryParams;

/// User entity
pub const User = struct {
    id: i64,
    name: []const u8,
    email: []const u8,
    age: u32,
    status: []const u8,
    created_at: []const u8,
    updated_at: ?[]const u8 = null,

    /// Data for creating a new user
    pub const CreateData = struct {
        name: []const u8,
        email: []const u8,
        age: u32,
        status: []const u8 = "active",
    };

    /// Data for updating a user
    pub const UpdateData = struct {
        id: i64,
        name: ?[]const u8 = null,
        email: ?[]const u8 = null,
        age: ?u32 = null,
        status: ?[]const u8 = null,
    };

    pub fn deinit(self: *User, allocator: std.mem.Allocator) void {
        allocator.free(self.name);
        allocator.free(self.email);
        allocator.free(self.status);
        allocator.free(self.created_at);
        if (self.updated_at) |updated| {
            allocator.free(updated);
        }
    }
};

/// SQLite User Repository
pub const UserRepository = struct {
    db: *sqlite.Database,
    allocator: std.mem.Allocator,

    pub fn init(db: *sqlite.Database, allocator: std.mem.Allocator) UserRepository {
        return UserRepository{
            .db = db,
            .allocator = allocator,
        };
    }

    /// Create a new user
    pub fn create(self: *UserRepository, data: User.CreateData) errors.Result(i64) {
        const sql = "INSERT INTO users (name, email, age, status) VALUES (?, ?, ?, ?)";
        const sql_c = self.allocator.dupeZ(u8, sql) catch {
            return errors.Result(i64).fromError(errors.UnifiedError.OutOfMemory);
        };
        defer self.allocator.free(sql_c);

        var stmt: ?*c.sqlite3_stmt = null;
        if (c.sqlite3_prepare_v2(self.db.db, sql_c.ptr, -1, &stmt, null) != c.SQLITE_OK) {
            return errors.Result(i64).fromError(errors.UnifiedError.PrepareFailed);
        }
        defer _ = c.sqlite3_finalize(stmt);

        _ = c.sqlite3_bind_text(stmt.?, 1, data.name.ptr, @intCast(data.name.len), c.SQLITE_TRANSIENT);
        _ = c.sqlite3_bind_text(stmt.?, 2, data.email.ptr, @intCast(data.email.len), c.SQLITE_TRANSIENT);
        _ = c.sqlite3_bind_int(stmt.?, 3, @intCast(data.age));
        _ = c.sqlite3_bind_text(stmt.?, 4, data.status.ptr, @intCast(data.status.len), c.SQLITE_TRANSIENT);

        if (c.sqlite3_step(stmt.?) != c.SQLITE_DONE) {
            return errors.Result(i64).fromError(errors.UnifiedError.StepFailed);
        }

        const id = c.sqlite3_last_insert_rowid(self.db);
        return errors.Result(i64).from(id);
    }

    /// Find user by ID
    pub fn findById(self: *UserRepository, id: i64) errors.Result(?User) {
        const sql = "SELECT id, name, email, age, status, created_at, updated_at FROM users WHERE id = ?";
        const sql_c = self.allocator.dupeZ(u8, sql) catch {
            return errors.Result(?User).fromError(errors.UnifiedError.OutOfMemory);
        };
        defer self.allocator.free(sql_c);

        var stmt: ?*c.sqlite3_stmt = null;
        if (c.sqlite3_prepare_v2(self.db.db, sql_c.ptr, -1, &stmt, null) != c.SQLITE_OK) {
            return errors.Result(?User).fromError(errors.UnifiedError.PrepareFailed);
        }
        defer _ = c.sqlite3_finalize(stmt);

        _ = c.sqlite3_bind_int64(stmt.?, 1, id);

        if (c.sqlite3_step(stmt.?) != c.SQLITE_ROW) {
            return errors.Result(?User).from(null);
        }

        const user = self.rowToUser(stmt.?) catch {
            return errors.Result(?User).fromError(errors.UnifiedError.QueryFailed);
        };
        return errors.Result(?User).from(user);
    }

    /// Find all users with optional query params
    pub fn findAll(self: *UserRepository, query: ?QueryParams) errors.Result([]User) {
        var sql_buf = std.ArrayList(u8).init(self.allocator);
        defer sql_buf.deinit();

        sql_buf.appendSlice("SELECT id, name, email, age, status, created_at, updated_at FROM users") catch {
            return errors.Result([]User).fromError(errors.UnifiedError.OutOfMemory);
        };

        if (query) |q| {
            if (q.where_clause) |where| {
                sql_buf.appendSlice(" WHERE ") catch return errors.Result([]User).fromError(errors.UnifiedError.OutOfMemory);
                sql_buf.appendSlice(where) catch return errors.Result([]User).fromError(errors.UnifiedError.OutOfMemory);
            }

            if (q.order_by) |order| {
                sql_buf.appendSlice(" ORDER BY ") catch return errors.Result([]User).fromError(errors.UnifiedError.OutOfMemory);
                sql_buf.appendSlice(order) catch return errors.Result([]User).fromError(errors.UnifiedError.OutOfMemory);
                if (q.order_dir == .desc) {
                    sql_buf.appendSlice(" DESC") catch return errors.Result([]User).fromError(errors.UnifiedError.OutOfMemory);
                }
            }

            if (q.limit) |limit| {
                sql_buf.appendSlice(" LIMIT ") catch return errors.Result([]User).fromError(errors.UnifiedError.OutOfMemory);
                std.fmt.formatInt(limit, 10, .lower, 0, sql_buf.writer()) catch {
                    return errors.Result([]User).fromError(errors.UnifiedError.OutOfMemory);
                };
            }
        } else {
            // Default: order by id desc
            sql_buf.appendSlice(" ORDER BY id DESC") catch return errors.Result([]User).fromError(errors.UnifiedError.OutOfMemory);
        }

        const sql = sql_buf.items;
        const sql_c = self.allocator.dupeZ(u8, sql) catch {
            return errors.Result([]User).fromError(errors.UnifiedError.OutOfMemory);
        };
        defer self.allocator.free(sql_c);

        var stmt: ?*c.sqlite3_stmt = null;
        if (c.sqlite3_prepare_v2(self.db.db, sql_c.ptr, -1, &stmt, null) != c.SQLITE_OK) {
            return errors.Result([]User).fromError(errors.UnifiedError.PrepareFailed);
        }
        defer _ = c.sqlite3_finalize(stmt);

        var users = std.ArrayList(User).init(self.allocator);
        errdefer {
            for (users.items) |*user| {
                user.deinit(self.allocator);
            }
            users.deinit();
        }

        while (c.sqlite3_step(stmt.?) == c.SQLITE_ROW) {
            const user = self.rowToUser(stmt.?) catch {
                return errors.Result([]User).fromError(errors.UnifiedError.QueryFailed);
            };
            users.append(user) catch {
                user.deinit(self.allocator);
                return errors.Result([]User).fromError(errors.UnifiedError.OutOfMemory);
            };
        }

        return errors.Result([]User).from(try users.toOwnedSlice());
    }

    /// Update a user
    pub fn update(self: *UserRepository, data: User.UpdateData) errors.Result(void) {
        var sql_buf = std.ArrayList(u8).init(self.allocator);
        defer sql_buf.deinit();

        sql_buf.appendSlice("UPDATE users SET ") catch {
            return errors.Result(void).fromError(errors.UnifiedError.OutOfMemory);
        };

        var first = true;
        if (data.name) |name| {
            if (!first) sql_buf.appendSlice(", ") catch return errors.Result(void).fromError(errors.UnifiedError.OutOfMemory);
            std.fmt.format(sql_buf.writer(), "name = '{s}'", .{name}) catch {
                return errors.Result(void).fromError(errors.UnifiedError.OutOfMemory);
            };
            first = false;
        }
        if (data.email) |email| {
            if (!first) sql_buf.appendSlice(", ") catch return errors.Result(void).fromError(errors.UnifiedError.OutOfMemory);
            std.fmt.format(sql_buf.writer(), "email = '{s}'", .{email}) catch {
                return errors.Result(void).fromError(errors.UnifiedError.OutOfMemory);
            };
            first = false;
        }
        if (data.age) |age| {
            if (!first) sql_buf.appendSlice(", ") catch return errors.Result(void).fromError(errors.UnifiedError.OutOfMemory);
            std.fmt.format(sql_buf.writer(), "age = {d}", .{age}) catch {
                return errors.Result(void).fromError(errors.UnifiedError.OutOfMemory);
            };
            first = false;
        }
        if (data.status) |status| {
            if (!first) sql_buf.appendSlice(", ") catch return errors.Result(void).fromError(errors.UnifiedError.OutOfMemory);
            std.fmt.format(sql_buf.writer(), "status = '{s}'", .{status}) catch {
                return errors.Result(void).fromError(errors.UnifiedError.OutOfMemory);
            };
        }

        std.fmt.format(sql_buf.writer(), ", updated_at = CURRENT_TIMESTAMP WHERE id = {d}", .{data.id}) catch {
            return errors.Result(void).fromError(errors.UnifiedError.OutOfMemory);
        };

        const sql = sql_buf.items;
        try self.db.exec(sql);
        return errors.Result(void).from({});
    }

    /// Delete a user by ID
    pub fn delete(self: *UserRepository, id: i64) errors.Result(void) {
        const sql = "DELETE FROM users WHERE id = ?";
        const sql_c = self.allocator.dupeZ(u8, sql) catch {
            return errors.Result(void).fromError(errors.UnifiedError.OutOfMemory);
        };
        defer self.allocator.free(sql_c);

        var stmt: ?*c.sqlite3_stmt = null;
        if (c.sqlite3_prepare_v2(self.db.db, sql_c.ptr, -1, &stmt, null) != c.SQLITE_OK) {
            return errors.Result(void).fromError(errors.UnifiedError.PrepareFailed);
        }
        defer _ = c.sqlite3_finalize(stmt);

        _ = c.sqlite3_bind_int64(stmt.?, 1, id);

        if (c.sqlite3_step(stmt.?) != c.SQLITE_DONE) {
            return errors.Result(void).fromError(errors.UnifiedError.StepFailed);
        }

        return errors.Result(void).from({});
    }

    /// Count total users
    pub fn count(self: *UserRepository) errors.Result(u32) {
        const sql = "SELECT COUNT(*) FROM users";
        const sql_c = self.allocator.dupeZ(u8, sql) catch {
            return errors.Result(u32).fromError(errors.UnifiedError.OutOfMemory);
        };
        defer self.allocator.free(sql_c);

        var stmt: ?*c.sqlite3_stmt = null;
        if (c.sqlite3_prepare_v2(self.db.db, sql_c.ptr, -1, &stmt, null) != c.SQLITE_OK) {
            return errors.Result(u32).fromError(errors.UnifiedError.PrepareFailed);
        }
        defer _ = c.sqlite3_finalize(stmt);

        if (c.sqlite3_step(stmt.?) != c.SQLITE_ROW) {
            return errors.Result(u32).fromError(errors.UnifiedError.QueryFailed);
        }

        const count = @intCast(c.sqlite3_column_int(stmt.?, 0));
        return errors.Result(u32).from(count);
    }

    /// Check if user exists
    pub fn exists(self: *UserRepository, id: i64) errors.Result(bool) {
        const sql = "SELECT 1 FROM users WHERE id = ? LIMIT 1";
        const sql_c = self.allocator.dupeZ(u8, sql) catch {
            return errors.Result(bool).fromError(errors.UnifiedError.OutOfMemory);
        };
        defer self.allocator.free(sql_c);

        var stmt: ?*c.sqlite3_stmt = null;
        if (c.sqlite3_prepare_v2(self.db.db, sql_c.ptr, -1, &stmt, null) != c.SQLITE_OK) {
            return errors.Result(bool).fromError(errors.UnifiedError.PrepareFailed);
        }
        defer _ = c.sqlite3_finalize(stmt);

        _ = c.sqlite3_bind_int64(stmt.?, 1, id);

        if (c.sqlite3_step(stmt.?) != c.SQLITE_ROW) {
            return errors.Result(bool).from(false);
        }

        return errors.Result(bool).from(true);
    }

    /// Helper: Convert SQLite row to User
    fn rowToUser(self: *UserRepository, stmt: *c.sqlite3_stmt) !User {
        const name_ptr = c.sqlite3_column_text(stmt, 1);
        const email_ptr = c.sqlite3_column_text(stmt, 2);
        const status_ptr = c.sqlite3_column_text(stmt, 4);
        const created_at_ptr = c.sqlite3_column_text(stmt, 5);
        const updated_at_ptr = c.sqlite3_column_text(stmt, 6);

        return User{
            .id = c.sqlite3_column_int64(stmt, 0),
            .name = try self.allocator.dupe(u8, std.mem.sliceTo(name_ptr, 0)),
            .email = try self.allocator.dupe(u8, std.mem.sliceTo(email_ptr, 0)),
            .age = @intCast(c.sqlite3_column_int(stmt, 3)),
            .status = try self.allocator.dupe(u8, std.mem.sliceTo(status_ptr, 0)),
            .created_at = try self.allocator.dupe(u8, std.mem.sliceTo(created_at_ptr, 0)),
            .updated_at = if (updated_at_ptr != null)
                try self.allocator.dupe(u8, std.mem.sliceTo(updated_at_ptr, 0))
            else
                null,
        };
    }
};

const c = @cImport({
    @cInclude("sqlite3.h");
});

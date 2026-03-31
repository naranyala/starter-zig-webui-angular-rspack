//! DuckDB Zig Bindings and Database Service
//! Provides analytical query capabilities for the Angular frontend

const std = @import("std");
const c = @cImport({
    @cInclude("duckdb.h");
});

pub const DbError = error{
    OpenFailed,
    ConnectFailed,
    PrepareFailed,
    ExecuteFailed,
    ResultFetchFailed,
    OutOfMemory,
    QueryFailed,
    InvalidResult,
};

pub const Database = struct {
    db: c.duckdb_database,
    conn: c.duckdb_connection,
    allocator: std.mem.Allocator,

    pub fn init(allocator: std.mem.Allocator, path: []const u8) DbError!Database {
        var db: c.duckdb_database = undefined;

        const path_c = try allocator.dupeZ(u8, path);
        defer allocator.free(path_c);

        var config: c.duckdb_config = null;
        if (c.duckdb_create_config(&config) == c.DuckDBError) {
            return DbError.OpenFailed;
        }
        defer c.duckdb_destroy_config(&config);

        // Set options for better performance
        _ = c.duckdb_set_config(config, "duckdb_api", "zig_webui");

        var out_error: [*c]u8 = null;
        if (c.duckdb_open_ext(path_c.ptr, &db, config, &out_error) == c.DuckDBError) {
            if (out_error != null) {
                std.debug.print("DuckDB open error: {s}\n", .{out_error});
            }
            return DbError.OpenFailed;
        }

        var conn: c.duckdb_connection = undefined;
        if (c.duckdb_connect(db, &conn) == c.DuckDBError) {
            c.duckdb_close(&db);
            return DbError.ConnectFailed;
        }

        return Database{
            .db = db,
            .conn = conn,
            .allocator = allocator,
        };
    }

    pub fn deinit(self: *Database) void {
        c.duckdb_disconnect(&self.conn);
        c.duckdb_close(&self.db);
    }

    pub fn exec(self: *Database, sql: []const u8) DbError!void {
        const sql_c = try self.allocator.dupeZ(u8, sql);
        defer self.allocator.free(sql_c);

        var result: c.duckdb_result = undefined;
        if (c.duckdb_query(self.conn, sql_c.ptr, &result) == c.DuckDBError) {
            const error_msg = c.duckdb_result_error(&result);
            if (error_msg != null) {
                std.debug.print("DuckDB error: {s}\n", .{error_msg});
            }
            c.duckdb_destroy_result(&result);
            return DbError.QueryFailed;
        }
        c.duckdb_destroy_result(&result);
    }

    pub fn initTables(self: *Database) DbError!void {
        // Create users table
        try self.exec(
            \\CREATE TABLE IF NOT EXISTS users (
            \\    id BIGINT PRIMARY KEY,
            \\    name VARCHAR NOT NULL,
            \\    email VARCHAR NOT NULL,
            \\    age INTEGER NOT NULL,
            \\    status VARCHAR DEFAULT 'active',
            \\    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            \\);
        );

        // Create products table
        try self.exec(
            \\CREATE TABLE IF NOT EXISTS products (
            \\    id BIGINT PRIMARY KEY,
            \\    name VARCHAR NOT NULL,
            \\    description TEXT,
            \\    price DECIMAL(10,2) NOT NULL,
            \\    stock INTEGER DEFAULT 0,
            \\    category VARCHAR,
            \\    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            \\);
        );

        // Create orders table
        try self.exec(
            \\CREATE TABLE IF NOT EXISTS orders (
            \\    id BIGINT PRIMARY KEY,
            \\    user_id BIGINT NOT NULL,
            \\    product_id BIGINT NOT NULL,
            \\    quantity INTEGER NOT NULL,
            \\    total_price DECIMAL(10,2) NOT NULL,
            \\    status VARCHAR DEFAULT 'pending',
            \\    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            \\);
        );
    }

    pub fn insertUser(self: *Database, name: []const u8, email: []const u8, age: u32, status: []const u8) DbError!i64 {
        // Get next ID
        const max_id_sql = "SELECT COALESCE(MAX(id), 0) + 1 FROM users";
        const max_id_sql_c = try self.allocator.dupeZ(u8, max_id_sql);
        defer self.allocator.free(max_id_sql_c);

        var result: c.duckdb_result = undefined;
        if (c.duckdb_query(self.conn, max_id_sql_c.ptr, &result) == c.DuckDBError) {
            return DbError.QueryFailed;
        }

        const next_id = c.duckdb_value_int64(&result, 0, 0);
        c.duckdb_destroy_result(&result);

        // Insert user using prepared statement
        const insert_sql = "INSERT INTO users (id, name, email, age, status) VALUES (?, ?, ?, ?)";
        const insert_sql_c = try self.allocator.dupeZ(u8, insert_sql);
        defer self.allocator.free(insert_sql_c);

        var stmt: c.duckdb_prepared_statement = undefined;
        if (c.duckdb_prepare(self.conn, insert_sql_c.ptr, &stmt) == c.DuckDBError) {
            return DbError.PrepareFailed;
        }
        defer c.duckdb_destroy_prepare(&stmt);

        _ = c.duckdb_bind_int64(stmt, 1, next_id);

        const name_c = try self.allocator.dupeZ(u8, name);
        defer self.allocator.free(name_c);
        _ = c.duckdb_bind_varchar(stmt, 2, name_c.ptr);

        const email_c = try self.allocator.dupeZ(u8, email);
        defer self.allocator.free(email_c);
        _ = c.duckdb_bind_varchar(stmt, 3, email_c.ptr);

        _ = c.duckdb_bind_int32(stmt, 4, @intCast(age));

        const status_c = try self.allocator.dupeZ(u8, status);
        defer self.allocator.free(status_c);
        _ = c.duckdb_bind_varchar(stmt, 5, status_c.ptr);

        if (c.duckdb_execute_prepared(stmt, &result) == c.DuckDBError) {
            return DbError.ExecuteFailed;
        }
        c.duckdb_destroy_result(&result);

        return next_id;
    }

    pub fn getAllUsers(self: *Database) DbError![]User {
        const sql = "SELECT id, name, email, age, status, created_at FROM users ORDER BY id DESC";
        const sql_c = try self.allocator.dupeZ(u8, sql);
        defer self.allocator.free(sql_c);

        var result: c.duckdb_result = undefined;
        if (c.duckdb_query(self.conn, sql_c.ptr, &result) == c.DuckDBError) {
            return DbError.QueryFailed;
        }
        defer c.duckdb_destroy_result(&result);

        const row_count = c.duckdb_row_count(&result);
        var users = std.ArrayList(User).initCapacity(self.allocator, 0) catch unreachable;
        errdefer users.deinit(self.allocator);

        var i: c.idx_t = 0;
        while (i < row_count) : (i += 1) {
            const id = c.duckdb_value_int64(&result, 0, i);

            const name_ptr = c.duckdb_value_varchar(&result, 1, i);
            defer c.duckdb_free(name_ptr);
            const name = try self.allocator.dupe(u8, std.mem.sliceTo(name_ptr, 0));

            const email_ptr = c.duckdb_value_varchar(&result, 2, i);
            defer c.duckdb_free(email_ptr);
            const email = try self.allocator.dupe(u8, std.mem.sliceTo(email_ptr, 0));

            const age = @as(u32, @intCast(c.duckdb_value_int32(&result, 3, i)));

            const status_ptr = c.duckdb_value_varchar(&result, 4, i);
            defer c.duckdb_free(status_ptr);
            const status = try self.allocator.dupe(u8, std.mem.sliceTo(status_ptr, 0));

            const created_at_ptr = c.duckdb_value_varchar(&result, 5, i);
            defer c.duckdb_free(created_at_ptr);
            const created_at = try self.allocator.dupe(u8, std.mem.sliceTo(created_at_ptr, 0));

            try users.append(self.allocator, User{
                .id = id,
                .name = name,
                .email = email,
                .age = age,
                .status = status,
                .created_at = created_at,
            });
        }

        return users.toOwnedSlice(self.allocator);
    }

    pub fn getUserStats(self: *Database) DbError!UserStats {
        var stats = UserStats{
            .total_users = 0,
            .today_count = 0,
            .unique_domains = 0,
        };

        // Total users
        {
            const sql = "SELECT COUNT(*) FROM users";
            const sql_c = try self.allocator.dupeZ(u8, sql);
            defer self.allocator.free(sql_c);

            var result: c.duckdb_result = undefined;
            if (c.duckdb_query(self.conn, sql_c.ptr, &result) == c.DuckDBError) {
                return DbError.QueryFailed;
            }
            stats.total_users = @intCast(c.duckdb_value_int64(&result, 0, 0));
            c.duckdb_destroy_result(&result);
        }

        // Today's count
        {
            const sql = "SELECT COUNT(*) FROM users WHERE DATE(created_at) = CURRENT_DATE";
            const sql_c = try self.allocator.dupeZ(u8, sql);
            defer self.allocator.free(sql_c);

            var result: c.duckdb_result = undefined;
            if (c.duckdb_query(self.conn, sql_c.ptr, &result) == c.DuckDBError) {
                return DbError.QueryFailed;
            }
            stats.today_count = @intCast(c.duckdb_value_int64(&result, 0, 0));
            c.duckdb_destroy_result(&result);
        }

        // Unique email domains
        {
            const sql = "SELECT COUNT(DISTINCT SPLIT_PART(email, '@', 2)) FROM users";
            const sql_c = try self.allocator.dupeZ(u8, sql);
            defer self.allocator.free(sql_c);

            var result: c.duckdb_result = undefined;
            if (c.duckdb_query(self.conn, sql_c.ptr, &result) == c.DuckDBError) {
                return DbError.QueryFailed;
            }
            stats.unique_domains = @intCast(c.duckdb_value_int64(&result, 0, 0));
            c.duckdb_destroy_result(&result);
        }

        return stats;
    }

    pub fn deleteUser(self: *Database, id: i64) DbError!void {
        const sql = "DELETE FROM users WHERE id = ?";
        const sql_c = try self.allocator.dupeZ(u8, sql);
        defer self.allocator.free(sql_c);

        var stmt: c.duckdb_prepared_statement = undefined;
        if (c.duckdb_prepare(self.conn, sql_c.ptr, &stmt) == c.DuckDBError) {
            return DbError.PrepareFailed;
        }
        defer c.duckdb_destroy_prepare(&stmt);

        _ = c.duckdb_bind_int64(stmt, 1, id);

        var result: c.duckdb_result = undefined;
        if (c.duckdb_execute_prepared(stmt, &result) == c.DuckDBError) {
            return DbError.ExecuteFailed;
        }
        c.duckdb_destroy_result(&result);
    }

    pub fn executeQuery(self: *Database, sql: []const u8) DbError![][]const u8 {
        const sql_c = try self.allocator.dupeZ(u8, sql);
        defer self.allocator.free(sql_c);

        var result: c.duckdb_result = undefined;
        if (c.duckdb_query(self.conn, sql_c.ptr, &result) == c.DuckDBError) {
            return DbError.QueryFailed;
        }
        defer c.duckdb_destroy_result(&result);

        const row_count = c.duckdb_row_count(&result);
        const col_count = c.duckdb_column_count(&result);

        var rows = std.ArrayList([]const u8).initCapacity(self.allocator, 0) catch unreachable;
        errdefer {
            for (rows.items) |row| {
                self.allocator.free(row);
            }
            rows.deinit(self.allocator);
        }

        var i: c.idx_t = 0;
        while (i < row_count) : (i += 1) {
            // Build a JSON array string for this row
            var row_json = std.ArrayList(u8).initCapacity(self.allocator, 0) catch unreachable;
            errdefer row_json.deinit(self.allocator);

            try row_json.append(self.allocator, '[');
            var j: c.idx_t = 0;
            while (j < col_count) : (j += 1) {
                if (j > 0) try row_json.append(self.allocator, ',');
                const val_ptr = c.duckdb_value_varchar(&result, j, i);
                if (val_ptr != null) {
                    try row_json.append(self.allocator, '"');
                    try row_json.appendSlice(self.allocator, std.mem.sliceTo(val_ptr, 0));
                    try row_json.append(self.allocator, '"');
                    c.duckdb_free(val_ptr);
                } else {
                    try row_json.appendSlice(self.allocator, "null");
                }
            }
            try row_json.append(self.allocator, ']');
            try rows.append(self.allocator, try row_json.toOwnedSlice(self.allocator));
        }

        return rows.toOwnedSlice(self.allocator);
    }

    pub fn seedUsers(self: *Database) DbError!void {
        // Check if users already exist
        const sql = "SELECT COUNT(*) FROM users";
        const sql_c = try self.allocator.dupeZ(u8, sql);
        defer self.allocator.free(sql_c);

        var result: c.duckdb_result = undefined;
        if (c.duckdb_query(self.conn, sql_c.ptr, &result) == c.DuckDBError) {
            return DbError.QueryFailed;
        }

        const count = c.duckdb_value_int64(&result, 0, 0);
        c.duckdb_destroy_result(&result);

        if (count > 0) return; // Already has data

        // Seed sample users
        const users = [_]struct {
            name: []const u8,
            email: []const u8,
            age: u32,
        }{
            .{ .name = "Alice Johnson", .email = "alice@example.com", .age = 28 },
            .{ .name = "Bob Smith", .email = "bob@gmail.com", .age = 35 },
            .{ .name = "Charlie Brown", .email = "charlie@yahoo.com", .age = 42 },
            .{ .name = "Diana Ross", .email = "diana@outlook.com", .age = 31 },
            .{ .name = "Edward Norton", .email = "edward@example.com", .age = 45 },
            .{ .name = "Fiona Apple", .email = "fiona@icloud.com", .age = 29 },
            .{ .name = "George Lucas", .email = "george@film.com", .age = 55 },
            .{ .name = "Hannah Montana", .email = "hannah@music.com", .age = 22 },
        };

        for (users) |user| {
            _ = try self.insertUser(user.name, user.email, user.age, "active");
        }
    }
};

pub const User = struct {
    id: i64,
    name: []const u8,
    email: []const u8,
    age: u32,
    status: []const u8,
    created_at: []const u8,

    pub fn toJson(self: *const User, allocator: std.mem.Allocator) ![]u8 {
        return std.json.stringifyAlloc(allocator, .{
            .id = self.id,
            .name = self.name,
            .email = self.email,
            .age = self.age,
            .status = self.status,
            .created_at = self.created_at,
        }, .{});
    }

    pub fn deinit(self: *User, allocator: std.mem.Allocator) void {
        allocator.free(self.name);
        allocator.free(self.email);
        allocator.free(self.status);
        allocator.free(self.created_at);
    }
};

pub const UserStats = struct {
    total_users: u32,
    today_count: u32,
    unique_domains: u32,

    pub fn toJson(self: *const UserStats, allocator: std.mem.Allocator) ![]u8 {
        return std.json.stringifyAlloc(allocator, .{
            .total_users = self.total_users,
            .today_count = self.today_count,
            .unique_domains = self.unique_domains,
        }, .{});
    }
};

// Global database instance for easy access
var global_db_ptr: ?*Database = null;

pub fn getGlobalDb() ?*Database {
    return global_db_ptr;
}

pub fn setGlobalDb(db: *Database) void {
    global_db_ptr = db;
}

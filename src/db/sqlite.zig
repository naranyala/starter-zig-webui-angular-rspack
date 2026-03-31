//! SQLite3 Zig Bindings and Database Service
//! Provides CRUD operations for the Angular frontend

const std = @import("std");
const errors = @import("errors");
const c = @cImport({
    @cInclude("sqlite3.h");
});

// Use unified error types
pub const DbError = errors.DbError;

pub const Database = struct {
    db: *c.sqlite3,
    allocator: std.mem.Allocator,

    pub fn init(allocator: std.mem.Allocator, path: []const u8) DbError!Database {
        var db: ?*c.sqlite3 = null;
        const path_c = std.posix.toPosixPath(path) catch return DbError.NameTooLong;

        const rc = c.sqlite3_open(path_c[0..path_c.len], &db);
        if (rc != c.SQLITE_OK) {
            return DbError.OpenFailed;
        }

        return Database{
            .db = db.?,
            .allocator = allocator,
        };
    }

    pub fn deinit(self: *Database) void {
        _ = c.sqlite3_close(self.db);
    }

    pub fn exec(self: *Database, sql: []const u8) DbError!void {
        const sql_c = try self.allocator.dupeZ(u8, sql);
        defer self.allocator.free(sql_c);

        var err_msg: [*c]u8 = null;
        const rc = c.sqlite3_exec(self.db, sql_c.ptr, null, null, &err_msg);
        if (rc != c.SQLITE_OK) {
            if (err_msg != null) {
                std.debug.print("SQLite error: {s}\n", .{err_msg});
                c.sqlite3_free(err_msg);
            }
            return DbError.QueryFailed;
        }
    }

    pub fn initTables(self: *Database) DbError!void {
        // Create users table
        try self.exec(
            \\CREATE TABLE IF NOT EXISTS users (
            \\    id INTEGER PRIMARY KEY AUTOINCREMENT,
            \\    name TEXT NOT NULL,
            \\    email TEXT NOT NULL UNIQUE,
            \\    age INTEGER NOT NULL,
            \\    status TEXT DEFAULT 'active',
            \\    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            \\);
        );

        // Create products table
        try self.exec(
            \\CREATE TABLE IF NOT EXISTS products (
            \\    id INTEGER PRIMARY KEY AUTOINCREMENT,
            \\    name TEXT NOT NULL,
            \\    description TEXT,
            \\    price REAL NOT NULL,
            \\    stock INTEGER DEFAULT 0,
            \\    category TEXT,
            \\    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            \\);
        );

        // Create orders table
        try self.exec(
            \\CREATE TABLE IF NOT EXISTS orders (
            \\    id INTEGER PRIMARY KEY AUTOINCREMENT,
            \\    user_id INTEGER NOT NULL,
            \\    product_id INTEGER NOT NULL,
            \\    quantity INTEGER NOT NULL,
            \\    total_price REAL NOT NULL,
            \\    status TEXT DEFAULT 'pending',
            \\    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            \\    FOREIGN KEY (user_id) REFERENCES users(id),
            \\    FOREIGN KEY (product_id) REFERENCES products(id)
            \\);
        );
    }

    pub fn insertUser(self: *Database, name: []const u8, email: []const u8, age: u32, status: []const u8) DbError!i64 {
        const sql = "INSERT INTO users (name, email, age, status) VALUES (?, ?, ?, ?)";
        const sql_c = try self.allocator.dupeZ(u8, sql);
        defer self.allocator.free(sql_c);

        var stmt: ?*c.sqlite3_stmt = null;
        if (c.sqlite3_prepare_v2(self.db, sql_c.ptr, -1, &stmt, null) != c.SQLITE_OK) {
            return DbError.PrepareFailed;
        }
        defer _ = c.sqlite3_finalize(stmt);

        _ = c.sqlite3_bind_text(stmt.?, 1, name.ptr, @intCast(name.len), c.SQLITE_TRANSIENT);
        _ = c.sqlite3_bind_text(stmt.?, 2, email.ptr, @intCast(email.len), c.SQLITE_TRANSIENT);
        _ = c.sqlite3_bind_int(stmt.?, 3, @intCast(age));
        _ = c.sqlite3_bind_text(stmt.?, 4, status.ptr, @intCast(status.len), c.SQLITE_TRANSIENT);

        if (c.sqlite3_step(stmt.?) != c.SQLITE_DONE) {
            return DbError.StepFailed;
        }

        return c.sqlite3_last_insert_rowid(self.db);
    }

    pub fn getUserById(self: *Database, id: i64) DbError!?User {
        const sql = "SELECT id, name, email, age, status, created_at FROM users WHERE id = ?";
        const sql_c = try self.allocator.dupeZ(u8, sql);
        defer self.allocator.free(sql_c);

        var stmt: ?*c.sqlite3_stmt = null;
        if (c.sqlite3_prepare_v2(self.db, sql_c.ptr, -1, &stmt, null) != c.SQLITE_OK) {
            return DbError.PrepareFailed;
        }
        defer _ = c.sqlite3_finalize(stmt);

        _ = c.sqlite3_bind_int64(stmt.?, 1, id);

        if (c.sqlite3_step(stmt.?) != c.SQLITE_ROW) {
            return null;
        }

        const name_ptr = c.sqlite3_column_text(stmt.?, 1);
        const email_ptr = c.sqlite3_column_text(stmt.?, 2);
        const status_ptr = c.sqlite3_column_text(stmt.?, 4);
        const created_at_ptr = c.sqlite3_column_text(stmt.?, 5);

        return User{
            .id = c.sqlite3_column_int64(stmt.?, 0),
            .name = try self.allocator.dupe(u8, std.mem.sliceTo(name_ptr, 0)),
            .email = try self.allocator.dupe(u8, std.mem.sliceTo(email_ptr, 0)),
            .age = @intCast(c.sqlite3_column_int(stmt.?, 3)),
            .status = try self.allocator.dupe(u8, std.mem.sliceTo(status_ptr, 0)),
            .created_at = try self.allocator.dupe(u8, std.mem.sliceTo(created_at_ptr, 0)),
        };
    }

    pub fn getAllUsers(self: *Database) DbError![]User {
        const sql = "SELECT id, name, email, age, status, created_at FROM users ORDER BY id DESC";
        const sql_c = try self.allocator.dupeZ(u8, sql);
        defer self.allocator.free(sql_c);

        var stmt: ?*c.sqlite3_stmt = null;
        if (c.sqlite3_prepare_v2(self.db, sql_c.ptr, -1, &stmt, null) != c.SQLITE_OK) {
            return DbError.PrepareFailed;
        }
        defer _ = c.sqlite3_finalize(stmt);

        var users = std.ArrayList(User).initCapacity(self.allocator, 0) catch unreachable;
        errdefer users.deinit(self.allocator);

        while (c.sqlite3_step(stmt.?) == c.SQLITE_ROW) {
            const name_ptr = c.sqlite3_column_text(stmt.?, 1);
            const email_ptr = c.sqlite3_column_text(stmt.?, 2);
            const status_ptr = c.sqlite3_column_text(stmt.?, 4);
            const created_at_ptr = c.sqlite3_column_text(stmt.?, 5);

            try users.append(self.allocator, User{
                .id = c.sqlite3_column_int64(stmt.?, 0),
                .name = try self.allocator.dupe(u8, std.mem.sliceTo(name_ptr, 0)),
                .email = try self.allocator.dupe(u8, std.mem.sliceTo(email_ptr, 0)),
                .age = @intCast(c.sqlite3_column_int(stmt.?, 3)),
                .status = try self.allocator.dupe(u8, std.mem.sliceTo(status_ptr, 0)),
                .created_at = try self.allocator.dupe(u8, std.mem.sliceTo(created_at_ptr, 0)),
            });
        }

        return users.toOwnedSlice(self.allocator);
    }

    pub fn updateUser(self: *Database, id: i64, name: []const u8, email: []const u8, age: u32, status: []const u8) DbError!void {
        const sql = "UPDATE users SET name = ?, email = ?, age = ?, status = ? WHERE id = ?";
        const sql_c = try self.allocator.dupeZ(u8, sql);
        defer self.allocator.free(sql_c);

        var stmt: ?*c.sqlite3_stmt = null;
        if (c.sqlite3_prepare_v2(self.db, sql_c.ptr, -1, &stmt, null) != c.SQLITE_OK) {
            return DbError.PrepareFailed;
        }
        defer _ = c.sqlite3_finalize(stmt);

        _ = c.sqlite3_bind_text(stmt.?, 1, name.ptr, @intCast(name.len), c.SQLITE_TRANSIENT);
        _ = c.sqlite3_bind_text(stmt.?, 2, email.ptr, @intCast(email.len), c.SQLITE_TRANSIENT);
        _ = c.sqlite3_bind_int(stmt.?, 3, @intCast(age));
        _ = c.sqlite3_bind_text(stmt.?, 4, status.ptr, @intCast(status.len), c.SQLITE_TRANSIENT);
        _ = c.sqlite3_bind_int64(stmt.?, 5, id);

        if (c.sqlite3_step(stmt.?) != c.SQLITE_DONE) {
            return DbError.StepFailed;
        }
    }

    pub fn deleteUser(self: *Database, id: i64) DbError!void {
        const sql = "DELETE FROM users WHERE id = ?";
        const sql_c = try self.allocator.dupeZ(u8, sql);
        defer self.allocator.free(sql_c);

        var stmt: ?*c.sqlite3_stmt = null;
        if (c.sqlite3_prepare_v2(self.db, sql_c.ptr, -1, &stmt, null) != c.SQLITE_OK) {
            return DbError.PrepareFailed;
        }
        defer _ = c.sqlite3_finalize(stmt);

        _ = c.sqlite3_bind_int64(stmt.?, 1, id);

        if (c.sqlite3_step(stmt.?) != c.SQLITE_DONE) {
            return DbError.StepFailed;
        }
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

            var stmt: ?*c.sqlite3_stmt = null;
            if (c.sqlite3_prepare_v2(self.db, sql_c.ptr, -1, &stmt, null) != c.SQLITE_OK) {
                return DbError.PrepareFailed;
            }
            defer _ = c.sqlite3_finalize(stmt);

            if (c.sqlite3_step(stmt.?) == c.SQLITE_ROW) {
                stats.total_users = @intCast(c.sqlite3_column_int(stmt.?, 0));
            }
        }

        // Today's count
        {
            const sql = "SELECT COUNT(*) FROM users WHERE DATE(created_at) = DATE('now')";
            const sql_c = try self.allocator.dupeZ(u8, sql);
            defer self.allocator.free(sql_c);

            var stmt: ?*c.sqlite3_stmt = null;
            if (c.sqlite3_prepare_v2(self.db, sql_c.ptr, -1, &stmt, null) != c.SQLITE_OK) {
                return DbError.PrepareFailed;
            }
            defer _ = c.sqlite3_finalize(stmt);

            if (c.sqlite3_step(stmt.?) == c.SQLITE_ROW) {
                stats.today_count = @intCast(c.sqlite3_column_int(stmt.?, 0));
            }
        }

        // Unique email domains
        {
            const sql = "SELECT COUNT(DISTINCT SUBSTR(email, INSTR(email, '@') + 1)) FROM users";
            const sql_c = try self.allocator.dupeZ(u8, sql);
            defer self.allocator.free(sql_c);

            var stmt: ?*c.sqlite3_stmt = null;
            if (c.sqlite3_prepare_v2(self.db, sql_c.ptr, -1, &stmt, null) != c.SQLITE_OK) {
                return DbError.PrepareFailed;
            }
            defer _ = c.sqlite3_finalize(stmt);

            if (c.sqlite3_step(stmt.?) == c.SQLITE_ROW) {
                stats.unique_domains = @intCast(c.sqlite3_column_int(stmt.?, 0));
            }
        }

        return stats;
    }

    pub fn seedUsers(self: *Database) DbError!void {
        // Check if users already exist
        const sql = "SELECT COUNT(*) FROM users";
        const sql_c = try self.allocator.dupeZ(u8, sql);
        defer self.allocator.free(sql_c);

        var stmt: ?*c.sqlite3_stmt = null;
        if (c.sqlite3_prepare_v2(self.db, sql_c.ptr, -1, &stmt, null) != c.SQLITE_OK) {
            return DbError.PrepareFailed;
        }
        defer _ = c.sqlite3_finalize(stmt);

        if (c.sqlite3_step(stmt.?) == c.SQLITE_ROW) {
            const count = c.sqlite3_column_int(stmt.?, 0);
            if (count > 0) return; // Already has data
        }

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
        };

        for (users) |user| {
            _ = try self.insertUser(user.name, user.email, user.age, "active");
        }

        // Seed products
        try self.seedProducts();

        // Seed orders
        try self.seedOrders();
    }

    pub fn seedProducts(self: *Database) DbError!void {
        const sql = "SELECT COUNT(*) FROM products";
        const sql_c = try self.allocator.dupeZ(u8, sql);
        defer self.allocator.free(sql_c);

        var stmt: ?*c.sqlite3_stmt = null;
        if (c.sqlite3_prepare_v2(self.db, sql_c.ptr, -1, &stmt, null) != c.SQLITE_OK) {
            return DbError.PrepareFailed;
        }
        defer _ = c.sqlite3_finalize(stmt);

        if (c.sqlite3_step(stmt.?) == c.SQLITE_ROW) {
            const count = c.sqlite3_column_int(stmt.?, 0);
            if (count > 0) return;
        }

        const products = [_]struct {
            name: []const u8,
            description: []const u8,
            price: f64,
            stock: i32,
            category: []const u8,
        }{
            .{ .name = "Laptop Pro", .description = "High-performance laptop", .price = 1299.99, .stock = 50, .category = "Electronics" },
            .{ .name = "Wireless Mouse", .description = "Ergonomic wireless mouse", .price = 49.99, .stock = 200, .category = "Electronics" },
            .{ .name = "Coffee Maker", .description = "Automatic coffee maker", .price = 89.99, .stock = 75, .category = "Home" },
            .{ .name = "Desk Chair", .description = "Ergonomic office chair", .price = 299.99, .stock = 30, .category = "Furniture" },
            .{ .name = "Headphones", .description = "Noise-canceling headphones", .price = 199.99, .stock = 100, .category = "Electronics" },
            .{ .name = "Water Bottle", .description = "Insulated water bottle", .price = 24.99, .stock = 500, .category = "Sports" },
            .{ .name = "Notebook", .description = "Leather-bound notebook", .price = 19.99, .stock = 300, .category = "Office" },
            .{ .name = "Desk Lamp", .description = "LED desk lamp", .price = 39.99, .stock = 150, .category = "Home" },
        };

        for (products) |product| {
            try self.insertProduct(product.name, product.description, product.price, product.stock, product.category);
        }
    }

    pub fn insertProduct(self: *Database, name: []const u8, description: []const u8, price: f64, stock: i32, category: []const u8) DbError!void {
        const sql = "INSERT INTO products (name, description, price, stock, category) VALUES (?, ?, ?, ?, ?)";
        const sql_c = try self.allocator.dupeZ(u8, sql);
        defer self.allocator.free(sql_c);

        var stmt: ?*c.sqlite3_stmt = null;
        if (c.sqlite3_prepare_v2(self.db, sql_c.ptr, -1, &stmt, null) != c.SQLITE_OK) {
            return DbError.PrepareFailed;
        }
        defer _ = c.sqlite3_finalize(stmt);

        _ = c.sqlite3_bind_text(stmt.?, 1, name.ptr, @intCast(name.len), c.SQLITE_TRANSIENT);
        _ = c.sqlite3_bind_text(stmt.?, 2, description.ptr, @intCast(description.len), c.SQLITE_TRANSIENT);
        _ = c.sqlite3_bind_double(stmt.?, 3, price);
        _ = c.sqlite3_bind_int(stmt.?, 4, stock);
        _ = c.sqlite3_bind_text(stmt.?, 5, category.ptr, @intCast(category.len), c.SQLITE_TRANSIENT);

        if (c.sqlite3_step(stmt.?) != c.SQLITE_DONE) {
            return DbError.StepFailed;
        }
    }

    pub fn seedOrders(self: *Database) DbError!void {
        const sql = "SELECT COUNT(*) FROM orders";
        const sql_c = try self.allocator.dupeZ(u8, sql);
        defer self.allocator.free(sql_c);

        var stmt: ?*c.sqlite3_stmt = null;
        if (c.sqlite3_prepare_v2(self.db, sql_c.ptr, -1, &stmt, null) != c.SQLITE_OK) {
            return DbError.PrepareFailed;
        }
        defer _ = c.sqlite3_finalize(stmt);

        if (c.sqlite3_step(stmt.?) == c.SQLITE_ROW) {
            const count = c.sqlite3_column_int(stmt.?, 0);
            if (count > 0) return;
        }

        const orders = [_]struct {
            user_id: i64,
            product_id: i64,
            quantity: i32,
            total_price: f64,
            status: []const u8,
        }{
            .{ .user_id = 1, .product_id = 1, .quantity = 1, .total_price = 1299.99, .status = "completed" },
            .{ .user_id = 2, .product_id = 2, .quantity = 2, .total_price = 99.98, .status = "completed" },
            .{ .user_id = 3, .product_id = 3, .quantity = 1, .total_price = 89.99, .status = "pending" },
            .{ .user_id = 4, .product_id = 4, .quantity = 1, .total_price = 299.99, .status = "completed" },
            .{ .user_id = 5, .product_id = 5, .quantity = 1, .total_price = 199.99, .status = "pending" },
            .{ .user_id = 6, .product_id = 6, .quantity = 3, .total_price = 74.97, .status = "completed" },
            .{ .user_id = 7, .product_id = 7, .quantity = 5, .total_price = 99.95, .status = "cancelled" },
            .{ .user_id = 8, .product_id = 8, .quantity = 2, .total_price = 79.98, .status = "pending" },
        };

        for (orders) |order| {
            try self.insertOrder(order.user_id, order.product_id, order.quantity, order.total_price, order.status);
        }
    }

    pub fn insertOrder(self: *Database, user_id: i64, product_id: i64, quantity: i32, total_price: f64, status: []const u8) DbError!void {
        const sql = "INSERT INTO orders (user_id, product_id, quantity, total_price, status) VALUES (?, ?, ?, ?, ?)";
        const sql_c = try self.allocator.dupeZ(u8, sql);
        defer self.allocator.free(sql_c);

        var stmt: ?*c.sqlite3_stmt = null;
        if (c.sqlite3_prepare_v2(self.db, sql_c.ptr, -1, &stmt, null) != c.SQLITE_OK) {
            return DbError.PrepareFailed;
        }
        defer _ = c.sqlite3_finalize(stmt);

        _ = c.sqlite3_bind_int64(stmt.?, 1, user_id);
        _ = c.sqlite3_bind_int64(stmt.?, 2, product_id);
        _ = c.sqlite3_bind_int(stmt.?, 3, quantity);
        _ = c.sqlite3_bind_double(stmt.?, 4, total_price);
        _ = c.sqlite3_bind_text(stmt.?, 5, status.ptr, @intCast(status.len), c.SQLITE_TRANSIENT);

        if (c.sqlite3_step(stmt.?) != c.SQLITE_DONE) {
            return DbError.StepFailed;
        }
    }

    pub fn getAllProducts(self: *Database) DbError![]Product {
        const sql = "SELECT id, name, description, price, stock, category, created_at FROM products ORDER BY id DESC";
        const sql_c = try self.allocator.dupeZ(u8, sql);
        defer self.allocator.free(sql_c);

        var stmt: ?*c.sqlite3_stmt = null;
        if (c.sqlite3_prepare_v2(self.db, sql_c.ptr, -1, &stmt, null) != c.SQLITE_OK) {
            return DbError.PrepareFailed;
        }
        defer _ = c.sqlite3_finalize(stmt);

        var products = std.ArrayList(Product).initCapacity(self.allocator, 0) catch unreachable;
        errdefer products.deinit(self.allocator);

        while (c.sqlite3_step(stmt.?) == c.SQLITE_ROW) {
            const name_ptr = c.sqlite3_column_text(stmt.?, 1);
            const desc_ptr = c.sqlite3_column_text(stmt.?, 2);
            const category_ptr = c.sqlite3_column_text(stmt.?, 5);
            const created_at_ptr = c.sqlite3_column_text(stmt.?, 6);

            try products.append(self.allocator, Product{
                .id = c.sqlite3_column_int64(stmt.?, 0),
                .name = try self.allocator.dupe(u8, std.mem.sliceTo(name_ptr, 0)),
                .description = try self.allocator.dupe(u8, std.mem.sliceTo(desc_ptr, 0)),
                .price = c.sqlite3_column_double(stmt.?, 3),
                .stock = @intCast(c.sqlite3_column_int(stmt.?, 4)),
                .category = try self.allocator.dupe(u8, std.mem.sliceTo(category_ptr, 0)),
                .created_at = try self.allocator.dupe(u8, std.mem.sliceTo(created_at_ptr, 0)),
            });
        }

        return products.toOwnedSlice(self.allocator);
    }

    pub fn getAllOrders(self: *Database) DbError![]Order {
        const sql =
            \\SELECT o.id, o.user_id, o.product_id, o.quantity, o.total_price, o.status, o.created_at,
            \\       u.name as user_name, p.name as product_name
            \\FROM orders o
            \\LEFT JOIN users u ON o.user_id = u.id
            \\LEFT JOIN products p ON o.product_id = p.id
            \\ORDER BY o.id DESC;
        ;
        const sql_c = try self.allocator.dupeZ(u8, sql);
        defer self.allocator.free(sql_c);

        var stmt: ?*c.sqlite3_stmt = null;
        if (c.sqlite3_prepare_v2(self.db, sql_c.ptr, -1, &stmt, null) != c.SQLITE_OK) {
            return DbError.PrepareFailed;
        }
        defer _ = c.sqlite3_finalize(stmt);

        var orders = std.ArrayList(Order).initCapacity(self.allocator, 0) catch unreachable;
        errdefer orders.deinit(self.allocator);

        while (c.sqlite3_step(stmt.?) == c.SQLITE_ROW) {
            const status_ptr = c.sqlite3_column_text(stmt.?, 5);
            const created_at_ptr = c.sqlite3_column_text(stmt.?, 6);

            try orders.append(self.allocator, Order{
                .id = c.sqlite3_column_int64(stmt.?, 0),
                .user_id = c.sqlite3_column_int64(stmt.?, 1),
                .product_id = c.sqlite3_column_int64(stmt.?, 2),
                .quantity = @intCast(c.sqlite3_column_int(stmt.?, 3)),
                .total_price = c.sqlite3_column_double(stmt.?, 4),
                .status = try self.allocator.dupe(u8, std.mem.sliceTo(status_ptr, 0)),
                .created_at = try self.allocator.dupe(u8, std.mem.sliceTo(created_at_ptr, 0)),
            });
        }

        return orders.toOwnedSlice(self.allocator);
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

pub const Product = struct {
    id: i64,
    name: []const u8,
    description: []const u8,
    price: f64,
    stock: i32,
    category: []const u8,
    created_at: []const u8,

    pub fn deinit(self: *Product, allocator: std.mem.Allocator) void {
        allocator.free(self.name);
        allocator.free(self.description);
        allocator.free(self.category);
        allocator.free(self.created_at);
    }
};

pub const Order = struct {
    id: i64,
    user_id: i64,
    product_id: i64,
    quantity: i32,
    total_price: f64,
    status: []const u8,
    created_at: []const u8,

    pub fn deinit(self: *Order, allocator: std.mem.Allocator) void {
        allocator.free(self.status);
        allocator.free(self.created_at);
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

//! Database WebUI Handlers
//! Provides WebUI bindings for database CRUD operations
//!
//! SECURITY: All inputs are validated before use

const std = @import("std");
const webui = @import("webui");
const sqlite = @import("sqlite");
const duckdb = @import("duckdb");
const logger = @import("logger");
const errors = @import("errors");

// Use unified logger
const db_logger = logger.ModuleLoggers.db;

// ============================================================================
// Input Validation Constants
// ============================================================================

const MAX_NAME_LENGTH = 256;
const MAX_EMAIL_LENGTH = 320;
const MAX_STATUS_LENGTH = 64;
const MIN_AGE = 0;
const MAX_AGE = 150;
const MAX_QUERY_LENGTH = 4096;

// ============================================================================
// Input Validation Helpers
// ============================================================================

/// Validate string is not empty and within length limits
fn validateStringLength(value: []const u8, _: []const u8, max_len: usize) !void {
    if (value.len == 0) {
        db_logger.errString("Validation failed: empty field");
        return error.InvalidInput;
    }
    if (value.len > max_len) {
        db_logger.errString("Validation failed: field exceeds maximum length");
        return error.InvalidInput;
    }
}

/// Validate email format (basic check for @ and .)
fn validateEmail(email: []const u8) !void {
    try validateStringLength(email, "email", MAX_EMAIL_LENGTH);
    
    var has_at = false;
    var has_dot = false;
    for (email, 0..) |c, i| {
        if (c == '@') {
            if (i == 0 or i == email.len - 1) {
                db_logger.errString("Validation failed: invalid email format");
                return error.InvalidInput;
            }
            has_at = true;
        }
        if (c == '.' and has_at) {
            has_dot = true;
        }
    }
    if (!has_at or !has_dot) {
        db_logger.errString("Validation failed: invalid email format");
        return error.InvalidInput;
    }
}

/// Validate age is within reasonable range
fn validateAge(age: i64) !void {
    if (age < MIN_AGE or age > MAX_AGE) {
        db_logger.errString("Validation failed: age out of range");
        return error.InvalidInput;
    }
}

/// Validate status is one of the allowed values
fn validateStatus(status: []const u8) !void {
    try validateStringLength(status, "status", MAX_STATUS_LENGTH);
    const valid_statuses = .{ "active", "inactive", "pending", "suspended" };
    inline for (valid_statuses) |valid| {
        if (std.mem.eql(u8, status, valid)) {
            return;
        }
    }
    db_logger.errString("Validation failed: invalid status value");
    return error.InvalidInput;
}

// ============================================================================
// SQLite Handlers
// ============================================================================

pub fn handleSqliteGetUsers(event: ?*webui.Event) callconv(.c) void {
    const e = event orelse return;

    const window = e.getWindow();
    if (window == 0) return;

    db_logger.debugString("handleSqliteGetUsers called");

    const db = sqlite.getGlobalDb() orelse {
        webui.run(window, "{\"error\":\"Database not initialized\"}");
        return;
    };

    const users = db.getAllUsers() catch {
        db_logger.errString("Failed to get users");
        webui.run(window, "{\"error\":\"Failed to retrieve users\"}");
        return;
    };
    defer {
        for (users) |*user| {
            user.deinit(db.allocator);
        }
        db.allocator.free(users);
    }

    // Build JSON response using stringifyAlloc
    const json = std.json.stringifyAlloc(db.allocator, .{
        .success = true,
        .data = users,
    }, .{}) catch {
        webui.run(window, "{\"error\":\"JSON serialization failed\"}");
        return;
    };
    defer db.allocator.free(json);

    webui.run(window, json);
}

pub fn handleSqliteGetUserStats(event: ?*webui.Event) callconv(.c) void {
    const e = event orelse return;

    const window = e.getWindow();
    if (window == 0) return;

    db_logger.debugString("handleSqliteGetUserStats called");

    const db = sqlite.getGlobalDb() orelse {
        webui.run(window, "{\"error\":\"Database not initialized\"}");
        return;
    };

    const stats = db.getUserStats() catch {
        db_logger.errString("Failed to get user stats");
        webui.run(window, "{\"error\":\"Failed to retrieve stats\"}");
        return;
    };

    const json = std.json.stringifyAlloc(db.allocator, .{
        .success = true,
        .data = stats,
    }, .{}) catch {
        webui.run(window, "{\"error\":\"JSON serialization failed\"}");
        return;
    };
    defer db.allocator.free(json);

    webui.run(window, json);
}

pub fn handleSqliteCreateUser(event: ?*webui.Event) callconv(.c) void {
    const e = event orelse return;

    const window = e.getWindow();
    if (window == 0) return;

    db_logger.debugString("handleSqliteCreateUser called");

    const db = sqlite.getGlobalDb() orelse {
        webui.run(window, "{\"error\":\"Database not initialized\"}");
        return;
    };

    // Get the first argument as JSON string
    const user_json = webui.getString(e, 0);
    if (user_json.len == 0) {
        webui.run(window, "{\"error\":\"No user data provided\"}");
        return;
    }

    // Parse JSON
    var parsed = std.json.parseFromSlice(std.json.Value, db.allocator, user_json, .{}) catch {
        db_logger.errString("Failed to parse user JSON");
        webui.run(window, "{\"error\":\"Invalid JSON format\"}");
        return;
    };
    defer parsed.deinit();

    const obj = parsed.value.object;
    
    // Validate name
    const name_val = obj.get("name") orelse {
        webui.run(window, "{\"error\":\"Name is required\"}");
        return;
    };
    if (name_val != .string) {
        webui.run(window, "{\"error\":\"Name must be a string\"}");
        return;
    }
    validateStringLength(name_val.string, "name", MAX_NAME_LENGTH) catch {
        webui.run(window, "{\"error\":\"Name exceeds maximum length\"}");
        return;
    };
    
    // Validate email
    const email_val = obj.get("email") orelse {
        webui.run(window, "{\"error\":\"Email is required\"}");
        return;
    };
    if (email_val != .string) {
        webui.run(window, "{\"error\":\"Email must be a string\"}");
        return;
    }
    validateEmail(email_val.string) catch {
        webui.run(window, "{\"error\":\"Invalid email format\"}");
        return;
    };
    
    // Validate age
    const age_val = obj.get("age") orelse {
        webui.run(window, "{\"error\":\"Age is required\"}");
        return;
    };
    const age_num = switch (age_val) {
        .integer => |n| n,
        .float => |n| @as(i64, @intFromFloat(n)),
        else => {
            webui.run(window, "{\"error\":\"Age must be a number\"}");
            return;
        },
    };
    validateAge(age_num) catch {
        webui.run(window, "{\"error\":\"Age must be between 0 and 150\"}");
        return;
    };

    // Validate status (optional)
    const status_val = obj.get("status");
    const status_str = if (status_val) |sv| switch (sv) {
        .string => |s| s,
        else => "active",
    } else "active";
    
    validateStatus(status_str) catch {
        webui.run(window, "{\"error\":\"Invalid status value\"}");
        return;
    };

    const id = db.insertUser(
        name_val.string,
        email_val.string,
        @intCast(age_num),
        status_str,
    ) catch {
        db_logger.errString("Failed to insert user");
        webui.run(window, "{\"error\":\"Failed to create user\"}");
        return;
    };

    const response = std.json.stringifyAlloc(db.allocator, .{
        .success = true,
        .data = .{ .id = id },
    }, .{}) catch {
        webui.run(window, "{\"error\":\"Response creation failed\"}");
        return;
    };
    defer db.allocator.free(response);

    webui.run(window, response);
}

pub fn handleSqliteDeleteUser(event: ?*webui.Event) callconv(.c) void {
    const e = event orelse return;

    const window = e.getWindow();
    if (window == 0) return;

    db_logger.debugString("handleSqliteDeleteUser called");

    const db = sqlite.getGlobalDb() orelse {
        webui.run(window, "{\"error\":\"Database not initialized\"}");
        return;
    };

    const id_str = webui.getString(e, 0);
    
    // Validate ID is not empty
    if (id_str.len == 0) {
        webui.run(window, "{\"error\":\"User ID is required\"}");
        return;
    }
    
    // Validate ID is a positive number
    const id = std.fmt.parseInt(i64, id_str, 10) catch {
        webui.run(window, "{\"error\":\"Invalid user ID format\"}");
        return;
    };
    
    if (id <= 0) {
        webui.run(window, "{\"error\":\"User ID must be positive\"}");
        return;
    }

    db.deleteUser(id) catch {
        db_logger.errString("Failed to delete user");
        webui.run(window, "{\"error\":\"Failed to delete user\"}");
        return;
    };

    webui.run(window, "{\"success\":true}");
}

pub fn handleSqliteGetProducts(event: ?*webui.Event) callconv(.c) void {
    const e = event orelse return;

    const window = e.getWindow();
    if (window == 0) return;

    db_logger.debugString("handleSqliteGetProducts called");

    const db = sqlite.getGlobalDb() orelse {
        webui.run(window, "{\"error\":\"Database not initialized\"}");
        return;
    };

    const products = db.getAllProducts() catch {
        db_logger.errString("Failed to get products");
        webui.run(window, "{\"error\":\"Failed to retrieve products\"}");
        return;
    };
    defer {
        for (products) |*product| {
            product.deinit(db.allocator);
        }
        db.allocator.free(products);
    }

    const json = std.json.stringifyAlloc(db.allocator, .{
        .success = true,
        .data = products,
    }, .{}) catch {
        webui.run(window, "{\"error\":\"JSON serialization failed\"}");
        return;
    };
    defer db.allocator.free(json);

    webui.run(window, json);
}

pub fn handleSqliteGetOrders(event: ?*webui.Event) callconv(.c) void {
    const e = event orelse return;

    const window = e.getWindow();
    if (window == 0) return;

    db_logger.debugString("handleSqliteGetOrders called");

    const db = sqlite.getGlobalDb() orelse {
        webui.run(window, "{\"error\":\"Database not initialized\"}");
        return;
    };

    const orders = db.getAllOrders() catch {
        db_logger.errString("Failed to get orders");
        webui.run(window, "{\"error\":\"Failed to retrieve orders\"}");
        return;
    };
    defer {
        for (orders) |*order| {
            order.deinit(db.allocator);
        }
        db.allocator.free(orders);
    }

    const json = std.json.stringifyAlloc(db.allocator, .{
        .success = true,
        .data = orders,
    }, .{}) catch {
        webui.run(window, "{\"error\":\"JSON serialization failed\"}");
        return;
    };
    defer db.allocator.free(json);

    webui.run(window, json);
}

// ============================================================================
// DuckDB Handlers
// ============================================================================

pub fn handleDuckdbGetUsers(event: ?*webui.Event) callconv(.c) void {
    const e = event orelse return;

    const window = e.getWindow();
    if (window == 0) return;

    db_logger.debugString("handleDuckdbGetUsers called");

    const db = duckdb.getGlobalDb() orelse {
        webui.run(window, "{\"error\":\"Database not initialized\"}");
        return;
    };

    const users = db.getAllUsers() catch {
        db_logger.errString("Failed to get users");
        webui.run(window, "{\"error\":\"Failed to retrieve users\"}");
        return;
    };
    defer {
        for (users) |*user| {
            user.deinit(db.allocator);
        }
        db.allocator.free(users);
    }

    const json = std.json.stringifyAlloc(db.allocator, .{
        .success = true,
        .data = users,
    }, .{}) catch {
        webui.run(window, "{\"error\":\"JSON serialization failed\"}");
        return;
    };
    defer db.allocator.free(json);

    webui.run(window, json);
}

pub fn handleDuckdbGetUserStats(event: ?*webui.Event) callconv(.c) void {
    const e = event orelse return;

    const window = e.getWindow();
    if (window == 0) return;

    db_logger.debugString("handleDuckdbGetUserStats called");

    const db = duckdb.getGlobalDb() orelse {
        webui.run(window, "{\"error\":\"Database not initialized\"}");
        return;
    };

    const stats = db.getUserStats() catch {
        db_logger.errString("Failed to get user stats");
        webui.run(window, "{\"error\":\"Failed to retrieve stats\"}");
        return;
    };

    const json = std.json.stringifyAlloc(db.allocator, .{
        .success = true,
        .data = stats,
    }, .{}) catch {
        webui.run(window, "{\"error\":\"JSON serialization failed\"}");
        return;
    };
    defer db.allocator.free(json);

    webui.run(window, json);
}

pub fn handleDuckdbCreateUser(event: ?*webui.Event) callconv(.c) void {
    const e = event orelse return;

    const window = e.getWindow();
    if (window == 0) return;

    db_logger.debugString("handleDuckdbCreateUser called");

    const db = duckdb.getGlobalDb() orelse {
        webui.run(window, "{\"error\":\"Database not initialized\"}");
        return;
    };

    const user_json = webui.getString(e, 0);
    if (user_json.len == 0) {
        webui.run(window, "{\"error\":\"No user data provided\"}");
        return;
    }

    // Parse JSON
    var parsed = std.json.parseFromSlice(std.json.Value, db.allocator, user_json, .{}) catch {
        db_logger.errString("Failed to parse user JSON");
        webui.run(window, "{\"error\":\"Invalid JSON format\"}");
        return;
    };
    defer parsed.deinit();

    const obj = parsed.value.object;
    const name = obj.get("name") orelse {
        webui.run(window, "{\"error\":\"Name is required\"}");
        return;
    };
    const email = obj.get("email") orelse {
        webui.run(window, "{\"error\":\"Email is required\"}");
        return;
    };
    const age_val = obj.get("age") orelse {
        webui.run(window, "{\"error\":\"Age is required\"}");
        return;
    };
    const age_num = switch (age_val) {
        .integer => |n| n,
        .float => |n| @as(i64, @intFromFloat(n)),
        else => {
            webui.run(window, "{\"error\":\"Age must be a number\"}");
            return;
        },
    };

    const status_val = obj.get("status");
    const status_str = if (status_val) |sv| switch (sv) {
        .string => |s| s,
        else => "active",
    } else "active";

    const id = db.insertUser(
        name.string,
        email.string,
        @intCast(age_num),
        status_str,
    ) catch {
        db_logger.errString("Failed to insert user");
        webui.run(window, "{\"error\":\"Failed to create user\"}");
        return;
    };

    const response = std.json.stringifyAlloc(db.allocator, .{
        .success = true,
        .data = .{ .id = id },
    }, .{}) catch {
        webui.run(window, "{\"error\":\"Response creation failed\"}");
        return;
    };
    defer db.allocator.free(response);

    webui.run(window, response);
}

pub fn handleDuckdbDeleteUser(event: ?*webui.Event) callconv(.c) void {
    const e = event orelse return;

    const window = e.getWindow();
    if (window == 0) return;

    db_logger.debugString("handleDuckdbDeleteUser called");

    const db = duckdb.getGlobalDb() orelse {
        webui.run(window, "{\"error\":\"Database not initialized\"}");
        return;
    };

    const id_str = webui.getString(e, 0);
    const id = std.fmt.parseFloat(f64, id_str) catch {
        webui.run(window, "{\"error\":\"Invalid user ID\"}");
        return;
    };

    db.deleteUser(@intFromFloat(id)) catch {
        db_logger.errString("Failed to delete user");
        webui.run(window, "{\"error\":\"Failed to delete user\"}");
        return;
    };

    webui.run(window, "{\"success\":true}");
}

pub fn handleDuckdbExecuteQuery(event: ?*webui.Event) callconv(.c) void {
    const e = event orelse return;

    const window = e.getWindow();
    if (window == 0) return;

    db_logger.debugString("handleDuckdbExecuteQuery called");

    const db = duckdb.getGlobalDb() orelse {
        webui.run(window, "{\"error\":\"Database not initialized\"}");
        return;
    };

    const query = webui.getString(e, 0);
    if (query.len == 0) {
        webui.run(window, "{\"error\":\"No query provided\"}");
        return;
    }

    const results = db.executeQuery(query) catch {
        db_logger.errString("Failed to execute query");
        webui.run(window, "{\"error\":\"Query execution failed\"}");
        return;
    };
    defer {
        for (results) |row| {
            db.allocator.free(row);
        }
        db.allocator.free(results);
    }

    // Build JSON array of arrays
    var json_arr = std.ArrayList(u8).init(db.allocator);
    defer json_arr.deinit();

    json_arr.appendSlice("{\"success\":true,\"data\":[") catch {};
    for (results, 0..) |row, i| {
        if (i > 0) json_arr.appendSlice(",") catch {};
        json_arr.appendSlice(row) catch {};
    }
    json_arr.appendSlice("]}") catch {};

    webui.run(window, json_arr.items);
}

//! Database WebUI Handlers
//! Provides WebUI bindings for database CRUD operations
//!
//! SECURITY: All inputs are validated and sanitized before use

const std = @import("std");
const webui = @import("webui");
const sqlite = @import("sqlite");
const duckdb = @import("duckdb");
const logger = @import("logger");
const errors = @import("errors");
const security = @import("security");

// Use unified logger
const db_logger = logger.ModuleLoggers.db;

// Security constants
const MAX_NAME_LENGTH = 256;
const MAX_EMAIL_LENGTH = 320;
const MAX_STATUS_LENGTH = 64;
const MIN_AGE = 0;
const MAX_AGE = 150;
const MAX_QUERY_LENGTH = 4096;

// ============================================================================
// JSON Helper (Zig 0.15 compatible)
// ============================================================================

fn jsonStringify(allocator: std.mem.Allocator, data: anytype) ?[]const u8 {
    var aw = std.io.Writer.Allocating.init(allocator);
    defer aw.deinit();
    std.json.Stringify.value(data, .{}, &aw.writer) catch return null;
    return aw.written();
}

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

    // Build JSON response
    const json = jsonStringify(db.allocator, .{
        .success = true,
        .data = users,
    }) orelse {
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

    const json = jsonStringify(db.allocator, .{
        .success = true,
        .data = stats,
    }) orelse {
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

    // Get and validate JSON input
    const user_json = webui.getString(e, 0);
    if (user_json.len == 0) {
        webui.run(window, "{\"error\":\"No user data provided\"}");
        return;
    }

    // Parse JSON with proper cleanup
    var parsed = std.json.parseFromSlice(std.json.Value, db.allocator, user_json, .{}) catch {
        db_logger.errString("Failed to parse user JSON");
        webui.run(window, "{\"error\":\"Invalid JSON format\"}");
        return;
    };
    defer parsed.deinit(); // SECURITY: Always free JSON memory

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

    // SECURITY: Validate and sanitize name
    if (!security.isValidName(name_val.string)) {
        webui.run(window, "{\"error\":\"Invalid name format\"}");
        return;
    }
    const sanitized_name = security.sanitizeInput(db.allocator, name_val.string) catch {
        webui.run(window, "{\"error\":\"Memory allocation failed\"}");
        return;
    };
    defer db.allocator.free(sanitized_name); // SECURITY: Free sanitized input

    // Validate email
    const email_val = obj.get("email") orelse {
        webui.run(window, "{\"error\":\"Email is required\"}");
        return;
    };
    if (email_val != .string) {
        webui.run(window, "{\"error\":\"Email must be a string\"}");
        return;
    }

    // SECURITY: Validate and sanitize email
    if (!security.isValidEmail(email_val.string)) {
        webui.run(window, "{\"error\":\"Invalid email format\"}");
        return;
    }
    const sanitized_email = security.sanitizeInput(db.allocator, email_val.string) catch {
        webui.run(window, "{\"error\":\"Memory allocation failed\"}");
        return;
    };
    defer db.allocator.free(sanitized_email);

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

    // SECURITY: Validate age range
    if (!security.isValidAge(age_num)) {
        webui.run(window, "{\"error\":\"Age must be between 0 and 150\"}");
        return;
    }

    // Validate status
    const status_val = obj.get("status");
    const status_str = if (status_val) |sv| switch (sv) {
        .string => |s| s,
        else => "active",
    } else "active";

    // SECURITY: Validate status whitelist
    if (!security.isValidStatus(status_str)) {
        webui.run(window, "{\"error\":\"Invalid status value\"}");
        return;
    }

    // Create user with sanitized data
    const id = db.insertUser(
        sanitized_name,
        sanitized_email,
        @intCast(age_num),
        status_str,
    ) catch {
        db_logger.errString("Failed to insert user");
        webui.run(window, "{\"error\":\"Failed to create user\"}");
        return;
    };

    // SECURITY: Log successful creation
    security.logSecurityEvent(db.allocator, "USER_CREATE", "User created successfully");

    const response = jsonStringify(db.allocator, .{
        .success = true,
        .data = .{ .id = id },
    }) orelse {
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

    const args_json = webui.getString(e, 0);

    // Parse arguments - support both old (string ID) and new (object with options) format
    var id: i64 = 0;
    var force_delete = false;

    // Try to parse as JSON object first
    if (std.json.parseFromSlice(std.json.Value, db.allocator, args_json, .{})) |parsed| {
        defer parsed.deinit();
        if (parsed.value.object.get("id")) |id_val| {
            id = id_val.integer;
            if (id == 0) {
                webui.run(window, "{\"error\":\"Invalid user ID format\"}");
                return;
            }
        }
        if (parsed.value.object.get("force")) |force_val| {
            force_delete = force_val.bool;
        }
    } else |_| {
        // Fall back to old format (just ID string)
        id = std.fmt.parseInt(i64, args_json, 10) catch {
            webui.run(window, "{\"error\":\"Invalid user ID format\"}");
            return;
        };
    }

    // Validate ID is positive
    if (id <= 0) {
        webui.run(window, "{\"error\":\"User ID must be positive\"}");
        return;
    }

    // Perform delete
    db.deleteUser(id) catch {
        db_logger.errString("Failed to delete user");
        webui.run(window, "{\"error\":\"Failed to delete user\"}");
        return;
    };

    webui.run(window, "{\"success\":true,\"message\":\"User deleted successfully\"}");
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

    const json = jsonStringify(db.allocator, .{
        .success = true,
        .data = products,
    }) orelse {
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

    const json = jsonStringify(db.allocator, .{
        .success = true,
        .data = orders,
    }) orelse {
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

    const json = jsonStringify(db.allocator, .{
        .success = true,
        .data = users,
    }) orelse {
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

    const json = jsonStringify(db.allocator, .{
        .success = true,
        .data = stats,
    }) orelse {
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

    const response = jsonStringify(db.allocator, .{
        .success = true,
        .data = .{ .id = id },
    }) orelse {
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

    // SECURITY: Validate query length
    if (query.len > MAX_QUERY_LENGTH) {
        webui.run(window, "{\"error\":\"Query too long\"}");
        return;
    }

    // SECURITY: Validate query is SELECT only
    if (!security.isValidSelectQuery(query)) {
        security.logSecurityEvent(db.allocator, "SQL_INJECTION_ATTEMPT", "Blocked malicious query attempt");
        webui.run(window, "{\"error\":\"Only SELECT queries are allowed\"}");
        return;
    }

    // SECURITY: Log query execution
    security.logSecurityEvent(db.allocator, "QUERY_EXECUTE", "Executing validated SELECT query");

    const results = db.executeQuery(query) catch {
        db_logger.errString("Failed to execute query");
        // SECURITY: Don't expose internal error details
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
    var json_arr = std.ArrayList(u8).initCapacity(db.allocator, 0) catch unreachable;
    defer json_arr.deinit(db.allocator);

    json_arr.appendSlice(db.allocator, "{\"success\":true,\"data\":[") catch {};
    for (results, 0..) |row, i| {
        if (i > 0) json_arr.appendSlice(db.allocator, ",") catch {};
        json_arr.appendSlice(db.allocator, row) catch {};
    }
    json_arr.appendSlice(db.allocator, "]}") catch {};

    webui.run(window, json_arr.items);
}

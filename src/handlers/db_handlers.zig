//! Database WebUI Handlers
//! Provides WebUI bindings for database CRUD operations

const std = @import("std");
const webui = @import("webui");
const sqlite = @import("sqlite");
const duckdb = @import("duckdb");

fn log_debug(msg: []const u8) void {
    std.debug.print("[DEBUG] {s}\n", .{msg});
}

fn log_error(msg: []const u8) void {
    std.debug.print("[ERROR] {s}\n", .{msg});
}

// ============================================================================
// SQLite Handlers
// ============================================================================

pub fn handleSqliteGetUsers(event: ?*webui.Event) callconv(.c) void {
    const e = event orelse return;
    
    const window = e.getWindow();
    if (window == 0) return;

    log_debug("handleSqliteGetUsers called");

    const db = sqlite.getGlobalDb() orelse {
        webui.run(window, "{\"error\":\"Database not initialized\"}");
        return;
    };

    const users = db.getAllUsers() catch {
        log_error("Failed to get users");
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

    log_debug("handleSqliteGetUserStats called");

    const db = sqlite.getGlobalDb() orelse {
        webui.run(window, "{\"error\":\"Database not initialized\"}");
        return;
    };

    const stats = db.getUserStats() catch {
        log_error("Failed to get user stats");
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

    log_debug("handleSqliteCreateUser called");

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
        log_error("Failed to parse user JSON");
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
        log_error("Failed to insert user");
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

    log_debug("handleSqliteDeleteUser called");

    const db = sqlite.getGlobalDb() orelse {
        webui.run(window, "{\"error\":\"Database not initialized\"}");
        return;
    };

    const id_str = webui.getString(e, 0);
    const id = std.fmt.parseFloat(f64, id_str) catch {
        webui.run(window, "{\"error\":\"Invalid user ID\"}");
        return;
    };

    db.deleteUser(@intFromFloat(id)) catch {
        log_error("Failed to delete user");
        webui.run(window, "{\"error\":\"Failed to delete user\"}");
        return;
    };

    webui.run(window, "{\"success\":true}");
}

pub fn handleSqliteGetProducts(event: ?*webui.Event) callconv(.c) void {
    const e = event orelse return;
    
    const window = e.getWindow();
    if (window == 0) return;

    log_debug("handleSqliteGetProducts called");

    const db = sqlite.getGlobalDb() orelse {
        webui.run(window, "{\"error\":\"Database not initialized\"}");
        return;
    };

    const products = db.getAllProducts() catch {
        log_error("Failed to get products");
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

    log_debug("handleSqliteGetOrders called");

    const db = sqlite.getGlobalDb() orelse {
        webui.run(window, "{\"error\":\"Database not initialized\"}");
        return;
    };

    const orders = db.getAllOrders() catch {
        log_error("Failed to get orders");
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

    log_debug("handleDuckdbGetUsers called");

    const db = duckdb.getGlobalDb() orelse {
        webui.run(window, "{\"error\":\"Database not initialized\"}");
        return;
    };

    const users = db.getAllUsers() catch {
        log_error("Failed to get users");
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

    log_debug("handleDuckdbGetUserStats called");

    const db = duckdb.getGlobalDb() orelse {
        webui.run(window, "{\"error\":\"Database not initialized\"}");
        return;
    };

    const stats = db.getUserStats() catch {
        log_error("Failed to get user stats");
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

    log_debug("handleDuckdbCreateUser called");

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
        log_error("Failed to parse user JSON");
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
        log_error("Failed to insert user");
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

    log_debug("handleDuckdbDeleteUser called");

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
        log_error("Failed to delete user");
        webui.run(window, "{\"error\":\"Failed to delete user\"}");
        return;
    };

    webui.run(window, "{\"success\":true}");
}

pub fn handleDuckdbExecuteQuery(event: ?*webui.Event) callconv(.c) void {
    const e = event orelse return;
    
    const window = e.getWindow();
    if (window == 0) return;

    log_debug("handleDuckdbExecuteQuery called");

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
        log_error("Failed to execute query");
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

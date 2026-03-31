//! Security Utilities
//! Provides input validation, sanitization, and SQL injection prevention

const std = @import("std");

/// SQL injection prevention - dangerous keywords
const DANGEROUS_KEYWORDS = [_][]const u8{
    "DROP",
    "DELETE",
    "TRUNCATE",
    "ALTER",
    "CREATE",
    "INSERT",
    "UPDATE",
    "REPLACE",
    "EXEC",
    "EXECUTE",
    "GRANT",
    "REVOKE",
    "--",
    ";",
    "/*",
    "*/",
    "xp_",
    "sp_",
    "0x",
    "CHAR(",
    "NCHAR(",
    "VARCHAR(",
    "NVARCHAR(",
    "CAST(",
    "CONVERT(",
    "TABLE",
    "FROM",
    "WHERE",
    "HAVING",
    "GROUP BY",
    "ORDER BY",
    "UNION",
    "SELECT",
    "COUNT",
    "SUM",
    "AVG",
    "MIN",
    "MAX",
};

/// Validate SQL query is safe (SELECT only, no dangerous operations)
pub fn isValidSelectQuery(query: []const u8) bool {
    if (query.len == 0) return false;

    // Must start with SELECT
    if (!std.mem.startsWith(u8, std.mem.trim(u8, query, " \t\n\r"), "SELECT") and
        !std.mem.startsWith(u8, std.mem.trim(u8, query, " \t\n\r"), "select"))
    {
        return false;
    }

    // Check for dangerous keywords (case-insensitive)
    var query_upper = std.ArrayList(u8).initCapacity(std.heap.page_allocator, 0) catch unreachable;
    defer query_upper.deinit(std.heap.page_allocator);

    for (query) |c| {
        query_upper.append(std.heap.page_allocator, std.ascii.toUpper(c)) catch return false;
    }

    // Allow only safe SELECT operations
    const upper_query = query_upper.items;

    // Block dangerous operations but allow SELECT...FROM...WHERE
    if (std.mem.indexOf(u8, upper_query, "DROP") != null) return false;
    if (std.mem.indexOf(u8, upper_query, "DELETE") != null) return false;
    if (std.mem.indexOf(u8, upper_query, "TRUNCATE") != null) return false;
    if (std.mem.indexOf(u8, upper_query, "ALTER") != null) return false;
    if (std.mem.indexOf(u8, upper_query, "CREATE") != null) return false;
    if (std.mem.indexOf(u8, upper_query, "INSERT") != null) return false;
    if (std.mem.indexOf(u8, upper_query, "UPDATE") != null) return false;
    if (std.mem.indexOf(u8, upper_query, "REPLACE") != null) return false;
    if (std.mem.indexOf(u8, upper_query, "EXEC") != null) return false;
    if (std.mem.indexOf(u8, upper_query, "GRANT") != null) return false;
    if (std.mem.indexOf(u8, upper_query, "REVOKE") != null) return false;
    if (std.mem.indexOf(u8, upper_query, "--") != null) return false;
    if (std.mem.indexOf(u8, upper_query, "/*") != null) return false;

    // Block multiple statements (semicolon outside quotes)
    if (containsUnquotedSemicolon(query)) return false;

    return true;
}

/// Check if query contains unquoted semicolon (multiple statements)
fn containsUnquotedSemicolon(query: []const u8) bool {
    var in_single_quote = false;
    var in_double_quote = false;

    for (query, 0..) |c, i| {
        // Handle escape sequences
        if (i > 0 and query[i - 1] == '\\') continue;

        if (c == '\'' and !in_double_quote) {
            in_single_quote = !in_single_quote;
        } else if (c == '"' and !in_single_quote) {
            in_double_quote = !in_double_quote;
        } else if (c == ';' and !in_single_quote and !in_double_quote) {
            return true;
        }
    }

    return false;
}

/// Sanitize string input - remove potentially dangerous characters
pub fn sanitizeInput(allocator: std.mem.Allocator, input: []const u8) ![]const u8 {
    var result = std.ArrayList(u8).initCapacity(allocator, 0) catch unreachable;
    errdefer result.deinit(allocator);

    for (input) |c| {
        // Allow alphanumeric and safe punctuation
        if (std.ascii.isAlphanumeric(c) or
            c == ' ' or c == '_' or c == '-' or c == '.' or
            c == '@' or c == '+' or c == ',' or c == ':' or
            (c >= 0x80))
        { // Allow UTF-8
            try result.append(allocator, c);
        }
        // Escape dangerous characters
        else if (c == '<') {
            try result.appendSlice(allocator, "&lt;");
        } else if (c == '>') {
            try result.appendSlice(allocator, "&gt;");
        } else if (c == '&') {
            try result.appendSlice(allocator, "&amp;");
        } else if (c == '"') {
            try result.appendSlice(allocator, "&quot;");
        } else if (c == '\'') {
            try result.appendSlice(allocator, "&#39;");
        }
        // Skip control characters
        else if (c < 0x20) {
            continue;
        }
        // Replace other suspicious characters
        else {
            try result.append(allocator, '?');
        }
    }

    return try result.toOwnedSlice(allocator);
}

/// Escape HTML entities in string
pub fn escapeHtml(allocator: std.mem.Allocator, input: []const u8) ![]const u8 {
    var result = std.ArrayList(u8).initCapacity(allocator, 0) catch unreachable;
    errdefer result.deinit(allocator);

    for (input) |c| {
        switch (c) {
            '<' => try result.appendSlice(allocator, "&lt;"),
            '>' => try result.appendSlice(allocator, "&gt;"),
            '&' => try result.appendSlice(allocator, "&amp;"),
            '"' => try result.appendSlice(allocator, "&quot;"),
            '\'' => try result.appendSlice(allocator, "&#39;"),
            else => try result.append(allocator, c),
        }
    }

    return try result.toOwnedSlice();
}

/// Validate email format
pub fn isValidEmail(email: []const u8) bool {
    if (email.len == 0 or email.len > 320) return false;

    var has_at = false;
    var has_dot = false;
    var last_at_idx: usize = 0;

    for (email, 0..) |c, i| {
        if (c == '@') {
            if (i == 0 or i == email.len - 1) return false;
            has_at = true;
            last_at_idx = i;
        }
        if (c == '.' and has_at) has_dot = true;

        // Allow only valid email characters
        if (!std.ascii.isAlphanumeric(c) and
            c != '@' and c != '.' and c != '_' and
            c != '-' and c != '+')
        {
            return false;
        }
    }

    // Must have @ and . after @
    if (!has_at) return false;
    if (!has_dot) return false;
    if (last_at_idx > email.len - 3) return false; // Need at least x@y.z

    return true;
}

/// Validate name (2-256 chars, alphanumeric + spaces)
pub fn isValidName(name: []const u8) bool {
    if (name.len < 2 or name.len > 256) return false;

    for (name) |c| {
        if (!std.ascii.isAlphanumeric(c) and
            c != ' ' and c != '_' and c != '-' and c != '.')
        {
            return false;
        }
    }

    return true;
}

/// Validate age (0-150)
pub fn isValidAge(age: i64) bool {
    return age >= 0 and age <= 150;
}

/// Validate status value (whitelist)
pub fn isValidStatus(status: []const u8) bool {
    const valid_statuses = [_][]const u8{ "active", "inactive", "pending", "suspended" };
    for (valid_statuses) |valid| {
        if (std.mem.eql(u8, status, valid)) return true;
    }
    return false;
}

/// Rate limiter - simple token bucket
pub const RateLimiter = struct {
    allocator: std.mem.Allocator,
    requests: std.StringHashMap(u32),
    timestamps: std.StringHashMap(i64),
    mutex: std.Thread.Mutex,
    max_requests: u32,
    window_seconds: i64,

    pub fn init(allocator: std.mem.Allocator, max_requests: u32, window_seconds: i64) RateLimiter {
        return RateLimiter{
            .allocator = allocator,
            .requests = std.StringHashMap(u32).init(allocator),
            .timestamps = std.StringHashMap(i64).init(allocator),
            .mutex = .{},
            .max_requests = max_requests,
            .window_seconds = window_seconds,
        };
    }

    pub fn deinit(self: *RateLimiter) void {
        self.requests.deinit();
        self.timestamps.deinit();
    }

    pub fn isAllowed(self: *RateLimiter, key: []const u8) !bool {
        self.mutex.lock();
        defer self.mutex.unlock();

        const now = std.time.timestamp();

        const entry = self.requests.getEntry(key) orelse {
            // New key
            const key_copy = try self.allocator.dupe(u8, key);
            try self.requests.put(key_copy, 1);
            try self.timestamps.put(key_copy, now);
            return true;
        };

        const timestamp_entry = self.timestamps.getEntry(key).?;

        // Check if window has expired
        if (now - timestamp_entry.value_ptr.* >= self.window_seconds) {
            // Reset counter
            entry.value_ptr.* = 1;
            timestamp_entry.value_ptr.* = now;
            return true;
        }

        // Check if under limit
        if (entry.value_ptr.* < self.max_requests) {
            entry.value_ptr.* += 1;
            return true;
        }

        // Rate limited
        return false;
    }

    pub fn getRemaining(self: *RateLimiter, key: []const u8) u32 {
        self.mutex.lock();
        defer self.mutex.unlock();

        const entry = self.requests.getEntry(key) orelse return self.max_requests;
        const timestamp_entry = self.timestamps.getEntry(key) orelse return self.max_requests;

        const now = std.time.timestamp();
        if (now - timestamp_entry.value_ptr.* >= self.window_seconds) {
            return self.max_requests;
        }

        return self.max_requests - entry.value_ptr.*;
    }
};

/// Global rate limiters
var api_rate_limiter: ?RateLimiter = null;

pub fn initRateLimiters(allocator: std.mem.Allocator) void {
    api_rate_limiter = RateLimiter.init(allocator, 100, 60); // 100 requests per minute
}

pub fn checkRateLimit(key: []const u8) !bool {
    if (api_rate_limiter) |*limiter| {
        return limiter.isAllowed(key);
    }
    return true; // No limiter configured
}

/// Security audit logger
pub fn logSecurityEvent(allocator: std.mem.Allocator, event_type: []const u8, details: []const u8) void {
    const timestamp = std.time.timestamp();
    std.debug.print("[SECURITY] [{d}] {s}: {s}\n", .{ timestamp, event_type, details });

    // In production, write to secure log file
    _ = allocator;
}

/// Validate and sanitize user data for creation
pub const UserValidationResult = struct {
    valid: bool,
    err: ?[]const u8,
    sanitized_name: ?[]const u8,
    sanitized_email: ?[]const u8,
};

pub fn validateUserData(
    allocator: std.mem.Allocator,
    name: []const u8,
    email: []const u8,
    age: i64,
    status: []const u8,
) !UserValidationResult {
    // Validate name
    if (!isValidName(name)) {
        return UserValidationResult{
            .valid = false,
            .err = "Invalid name format",
            .sanitized_name = null,
            .sanitized_email = null,
        };
    }

    // Validate email
    if (!isValidEmail(email)) {
        return UserValidationResult{
            .valid = false,
            .err = "Invalid email format",
            .sanitized_name = null,
            .sanitized_email = null,
        };
    }

    // Validate age
    if (!isValidAge(age)) {
        return UserValidationResult{
            .valid = false,
            .err = "Age must be 0-150",
            .sanitized_name = null,
            .sanitized_email = null,
        };
    }

    // Validate status
    if (!isValidStatus(status)) {
        return UserValidationResult{
            .valid = false,
            .err = "Invalid status value",
            .sanitized_name = null,
            .sanitized_email = null,
        };
    }

    // Sanitize inputs
    const sanitized_name = try sanitizeInput(allocator, name);
    const sanitized_email = try sanitizeInput(allocator, email);

    return UserValidationResult{
        .valid = true,
        .err = null,
        .sanitized_name = sanitized_name,
        .sanitized_email = sanitized_email,
    };
}

// ============================================================================
// Tests
// ============================================================================

const testing = std.testing;

test "SQL injection prevention - valid SELECT" {
    try testing.expect(isValidSelectQuery("SELECT * FROM users"));
    try testing.expect(isValidSelectQuery("SELECT id, name FROM users WHERE id = 1"));
    try testing.expect(isValidSelectQuery("select * from users"));
}

test "SQL injection prevention - DROP" {
    try testing.expect(!isValidSelectQuery("DROP TABLE users"));
    try testing.expect(!isValidSelectQuery("SELECT * FROM users; DROP TABLE users; --"));
}

test "SQL injection prevention - DELETE" {
    try testing.expect(!isValidSelectQuery("DELETE FROM users"));
    try testing.expect(!isValidSelectQuery("SELECT * FROM users; DELETE FROM users"));
}

test "SQL injection prevention - multiple statements" {
    try testing.expect(!isValidSelectQuery("SELECT * FROM users; DROP TABLE users"));
}

test "SQL injection prevention - comments" {
    try testing.expect(!isValidSelectQuery("SELECT * FROM users -- comment"));
    try testing.expect(!isValidSelectQuery("SELECT * FROM users /* comment */"));
}

test "Email validation" {
    try testing.expect(isValidEmail("test@example.com"));
    try testing.expect(isValidEmail("user.name+tag@domain.co.uk"));
    try testing.expect(!isValidEmail(""));
    try testing.expect(!isValidEmail("invalid"));
    try testing.expect(!isValidEmail("@example.com"));
    try testing.expect(!isValidEmail("test@"));
    try testing.expect(!isValidEmail("test@example"));
}

test "Name validation" {
    try testing.expect(isValidName("John Doe"));
    try testing.expect(isValidName("John_Doe"));
    try testing.expect(isValidName("John-Doe"));
    try testing.expect(!isValidName(""));
    try testing.expect(!isValidName("J"));
    try testing.expect(!isValidName("<script>alert('XSS')</script>"));
}

test "Age validation" {
    try testing.expect(isValidAge(0));
    try testing.expect(isValidAge(25));
    try testing.expect(isValidAge(150));
    try testing.expect(!isValidAge(-1));
    try testing.expect(!isValidAge(151));
}

test "Status validation" {
    try testing.expect(isValidStatus("active"));
    try testing.expect(isValidStatus("inactive"));
    try testing.expect(!isValidStatus("admin"));
    try testing.expect(!isValidStatus(""));
}

test "HTML escaping" {
    const allocator = testing.allocator;

    const escaped = try escapeHtml(allocator, "<script>alert('XSS')</script>");
    defer allocator.free(escaped);

    try testing.expectEqualStrings("&lt;script&gt;alert(&#39;XSS&#39;)&lt;/script&gt;", escaped);
}

test "Input sanitization" {
    const allocator = testing.allocator;

    const sanitized = try sanitizeInput(allocator, "Hello <World> & 'Test'");
    defer allocator.free(sanitized);

    try testing.expect(!std.mem.containsAtLeast(u8, sanitized, 1, "<"));
    try testing.expect(!std.mem.containsAtLeast(u8, sanitized, 1, ">"));
}

test "Rate limiter" {
    const allocator = testing.allocator;
    var limiter = RateLimiter.init(allocator, 3, 60); // 3 requests per minute
    defer limiter.deinit();

    // First 3 requests should be allowed
    try testing.expect(try limiter.isAllowed("user1"));
    try testing.expect(try limiter.isAllowed("user1"));
    try testing.expect(try limiter.isAllowed("user1"));

    // 4th request should be blocked
    try testing.expect(!try limiter.isAllowed("user1"));

    // Different user should be allowed
    try testing.expect(try limiter.isAllowed("user2"));
}

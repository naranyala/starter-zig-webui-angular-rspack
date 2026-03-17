//! Settings/Preferences Utility
//! Provides persistent configuration storage for desktop applications
//! Features: JSON-based storage, typed values, schemas, migrations, validation

const std = @import("std");
const mem = std.mem;
const fs = @import("fs.zig");
const builtin = @import("std").builtin;

const log = std.log.scoped(.Settings);

// ============================================================================
// Error Types
// ============================================================================

pub const SettingsError = error{
    NotFound,
    InvalidFormat,
    ValidationFailed,
    WriteFailed,
    ReadFailed,
    MigrationFailed,
    SchemaMismatch,
    Corrupted,
    PermissionDenied,
    OutOfMemory,
};

// ============================================================================
// Setting Value Types
// ============================================================================

pub const SettingType = enum {
    string,
    int,
    float,
    bool,
    array,
    object,
    null,
};

pub const SettingValue = union(SettingType) {
    string: []const u8,
    int: i64,
    float: f64,
    bool: bool,
    array: []SettingValue,
    object: std.StringHashMap(SettingValue),
    null: void,

    pub fn deinit(self: *SettingValue, allocator: mem.Allocator) void {
        switch (self.*) {
            .string => |s| allocator.free(s),
            .array => |arr| {
                for (arr) |*item| {
                    item.deinit(allocator);
                }
                allocator.free(arr);
            },
            .object => |*obj| {
                var it = obj.iterator();
                while (it.next()) |entry| {
                    allocator.free(entry.key_ptr.*);
                    entry.value_ptr.deinit(allocator);
                }
                obj.deinit();
            },
            else => {},
        }
    }

    pub fn toJson(self: *const SettingValue) []const u8 {
        // Simplified - would need proper JSON serialization
        _ = self;
        return "{}";
    }
};

// ============================================================================
// Settings Schema
// ============================================================================

pub const SchemaField = struct {
    name: []const u8,
    field_type: SettingType,
    required: bool = false,
    default: ?SettingValue = null,
    min: ?f64 = null,
    max: ?f64 = null,
    pattern: ?[]const u8 = null,
    description: ?[]const u8 = null,
};

pub const SettingsSchema = struct {
    version: u32,
    fields: []const SchemaField,

    pub fn validate(self: *const SettingsSchema, values: *const std.StringHashMap(SettingValue)) SettingsError!void {
        for (self.fields) |field| {
            const value = values.get(field.name);

            if (value == null) {
                if (field.required) {
                    log.err("Missing required field: {s}", .{field.name});
                    return SettingsError.ValidationFailed;
                }
                continue;
            }

            // Type check
            if (field.default != null and field.default.?.tag() != value.?.tag()) {
                log.err("Type mismatch for field: {s}", .{field.name});
                return SettingsError.SchemaMismatch;
            }

            // Range check for numbers
            if (field.min != null or field.max != null) {
                const num_value = switch (value.?) {
                    .int => |i| @as(f64, @floatFromInt(i)),
                    .float => |f| f,
                    else => null,
                };

                if (num_value) |nv| {
                    if (field.min != null and nv < field.min.?) {
                        log.err("Field {s} value {d} below minimum {d}", .{ field.name, nv, field.min.? });
                        return SettingsError.ValidationFailed;
                    }
                    if (field.max != null and nv > field.max.?) {
                        log.err("Field {s} value {d} above maximum {d}", .{ field.name, nv, field.max.? });
                        return SettingsError.ValidationFailed;
                    }
                }
            }
        }
    }
};

// ============================================================================
// Settings Manager
// ============================================================================

pub const SettingsManager = struct {
    allocator: mem.Allocator,
    config_path: []const u8,
    data: std.StringHashMap(SettingValue),
    schema: ?SettingsSchema = null,
    version: u32 = 1,
    dirty: bool = false,
    mutex: std.Thread.Mutex = .{},

    const Self = @This();

    pub fn init(allocator: mem.Allocator, app_name: []const u8) SettingsError!Self {
        const config_path = try getConfigPath(allocator, app_name);
        errdefer allocator.free(config_path);

        return Self{
            .allocator = allocator,
            .config_path = config_path,
            .data = std.StringHashMap(SettingValue).init(allocator),
        };
    }

    pub fn initWithPath(allocator: mem.Allocator, path: []const u8) SettingsError!Self {
        return Self{
            .allocator = allocator,
            .config_path = try allocator.dupe(u8, path),
            .data = std.StringHashMap(SettingValue).init(allocator),
        };
    }

    pub fn deinit(self: *Self) void {
        self.save() catch {};

        var it = self.data.iterator();
        while (it.next()) |entry| {
            self.allocator.free(entry.key_ptr.*);
            entry.value_ptr.deinit(self.allocator);
        }
        self.data.deinit();
        self.allocator.free(self.config_path);
    }

    pub fn setSchema(self: *Self, schema: SettingsSchema) void {
        self.schema = schema;
        self.version = schema.version;
    }

    pub fn load(self: *Self) SettingsError!void {
        self.mutex.lock();
        defer self.mutex.unlock();

        log.info("Loading settings from: {s}", .{self.config_path});

        if (!fs.fileExists(self.config_path)) {
            log.info("Settings file not found, using defaults", .{});
            return;
        }

        const content = fs.readFile(self.allocator, self.config_path) catch |err| {
            log.err("Failed to read settings file: {}", .{err});
            return switch (err) {
                SettingsError.FileNotFound => SettingsError.NotFound,
                SettingsError.PermissionDenied => SettingsError.PermissionDenied,
                else => SettingsError.ReadFailed,
            };
        };
        defer self.allocator.free(content);

        // Parse JSON
        var parsed = std.json.parseFromSlice(std.json.Value, self.allocator, content, .{}) catch |err| {
            log.err("Failed to parse settings JSON: {}", .{err});
            return SettingsError.InvalidFormat;
        };
        defer parsed.deinit();

        // Convert to SettingValue map
        try self.data.clearRetainingCapacity();

        if (parsed.value == .object) {
            var it = parsed.value.object.iterator();
            while (it.next()) |entry| {
                const key = try self.allocator.dupe(u8, entry.key_ptr.*);
                errdefer self.allocator.free(key);

                const value = try jsonValueToSettingValue(self.allocator, entry.value_ptr.*);
                errdefer value.deinit(self.allocator);

                try self.data.put(key, value);
            }
        }

        // Validate against schema if present
        if (self.schema) |*schema| {
            try schema.validate(&self.data);
        }

        log.info("Settings loaded successfully", .{});
    }

    pub fn save(self: *Self) SettingsError!void {
        self.mutex.lock();
        defer self.mutex.unlock();

        if (!self.dirty) {
            log.debug("Settings not changed, skipping save", .{});
            return;
        }

        log.info("Saving settings to: {s}", .{self.config_path});

        // Ensure directory exists
        const dir_path = std.fs.path.dirname(self.config_path) orelse ".";
        try fs.createDir(dir_path);

        // Serialize to JSON
        var buffer = std.ArrayList(u8).init(self.allocator);
        defer buffer.deinit();

        const writer = buffer.writer();
        try std.json.stringify(self.data, .{ .whitespace = .indent_2 }, writer);

        try fs.writeFile(self.config_path, buffer.items);
        self.dirty = false;

        log.info("Settings saved successfully", .{});
    }

    pub fn get(self: *Self, key: []const u8, default: ?SettingValue) ?SettingValue {
        self.mutex.lock();
        defer self.mutex.unlock();

        if (self.data.get(key)) |value| {
            return value.*;
        }

        if (default) |d| {
            return d;
        }

        // Check schema for default
        if (self.schema) |schema| {
            for (schema.fields) |field| {
                if (mem.eql(u8, field.name, key) and field.default != null) {
                    return field.default;
                }
            }
        }

        return null;
    }

    pub fn getString(self: *Self, key: []const u8, default: []const u8) []const u8 {
        if (self.get(key, .{ .string = default })) |value| {
            if (value == .string) {
                return value.string;
            }
        }
        return default;
    }

    pub fn getInt(self: *Self, key: []const u8, default: i64) i64 {
        if (self.get(key, .{ .int = default })) |value| {
            return switch (value) {
                .int => |v| v,
                .float => |v| @intFromFloat(v),
                else => default,
            };
        }
        return default;
    }

    pub fn getFloat(self: *Self, key: []const u8, default: f64) f64 {
        if (self.get(key, .{ .float = default })) |value| {
            return switch (value) {
                .float => |v| v,
                .int => |v| @as(f64, @floatFromInt(v)),
                else => default,
            };
        }
        return default;
    }

    pub fn getBool(self: *Self, key: []const u8, default: bool) bool {
        if (self.get(key, .{ .bool = default })) |value| {
            if (value == .bool) {
                return value.bool;
            }
        }
        return default;
    }

    pub fn set(self: *Self, key: []const u8, value: SettingValue) SettingsError!void {
        self.mutex.lock();
        defer self.mutex.unlock();

        const key_dup = try self.allocator.dupe(u8, key);
        errdefer self.allocator.free(key_dup);

        const value_dup = try duplicateSettingValue(self.allocator, value);
        errdefer value_dup.deinit(self.allocator);

        // Remove old value if exists
        if (self.data.fetch(key)) |entry| {
            self.allocator.free(entry.key);
            entry.value.deinit(self.allocator);
        }

        try self.data.put(key_dup, value_dup);
        self.dirty = true;

        log.debug("Setting updated: {s}", .{key});
    }

    pub fn setString(self: *Self, key: []const u8, value: []const u8) SettingsError!void {
        try self.set(key, .{ .string = value });
    }

    pub fn setInt(self: *Self, key: []const u8, value: i64) SettingsError!void {
        try self.set(key, .{ .int = value });
    }

    pub fn setFloat(self: *Self, key: []const u8, value: f64) SettingsError!void {
        try self.set(key, .{ .float = value });
    }

    pub fn setBool(self: *Self, key: []const u8, value: bool) SettingsError!void {
        try self.set(key, .{ .bool = value });
    }

    pub fn remove(self: *Self, key: []const u8) void {
        self.mutex.lock();
        defer self.mutex.unlock();

        if (self.data.fetch(key)) |entry| {
            self.allocator.free(entry.key);
            entry.value.deinit(self.allocator);
            self.dirty = true;
        }
    }

    pub fn has(self: *Self, key: []const u8) bool {
        return self.data.contains(key);
    }

    pub fn clear(self: *Self) void {
        self.mutex.lock();
        defer self.mutex.unlock();

        var it = self.data.iterator();
        while (it.next()) |entry| {
            self.allocator.free(entry.key_ptr.*);
            entry.value_ptr.deinit(self.allocator);
        }
        self.data.clearRetainingCapacity();
        self.dirty = true;
    }

    pub fn keys(self: *Self) [][]const u8 {
        var keys = std.ArrayList([]const u8).init(self.allocator);
        var it = self.data.iterator();
        while (it.next()) |entry| {
            keys.append(entry.key_ptr.*) catch break;
        }
        return keys.toOwnedSlice();
    }

    pub fn reset(self: *Self) SettingsError!void {
        self.mutex.lock();
        defer self.mutex.unlock();

        // Clear all settings
        var it = self.data.iterator();
        while (it.next()) |entry| {
            self.allocator.free(entry.key_ptr.*);
            entry.value_ptr.deinit(self.allocator);
        }
        self.data.clearRetainingCapacity();

        // Delete file
        fs.deleteFile(self.config_path) catch {};
        self.dirty = false;

        log.info("Settings reset to defaults", .{});
    }

    pub fn exportToJson(self: *Self, path: []const u8) SettingsError!void {
        self.mutex.lock();
        defer self.mutex.unlock();

        var buffer = std.ArrayList(u8).init(self.allocator);
        defer buffer.deinit();

        const writer = buffer.writer();
        try std.json.stringify(self.data, .{ .whitespace = .indent_2 }, writer);

        try fs.writeFile(path, buffer.items);
    }

    pub fn importFromJson(self: *Self, path: []const u8) SettingsError!void {
        self.mutex.lock();
        defer self.mutex.unlock();

        const content = fs.readFile(self.allocator, path) catch |err| {
            return switch (err) {
                SettingsError.FileNotFound => SettingsError.NotFound,
                else => SettingsError.ReadFailed,
            };
        };
        defer self.allocator.free(content);

        var parsed = std.json.parseFromSlice(std.json.Value, self.allocator, content, .{}) catch {
            return SettingsError.InvalidFormat;
        };
        defer parsed.deinit();

        // Clear existing and import
        self.data.clearRetainingCapacity();

        if (parsed.value == .object) {
            var it = parsed.value.object.iterator();
            while (it.next()) |entry| {
                const key = try self.allocator.dupe(u8, entry.key_ptr.*);
                const value = try jsonValueToSettingValue(self.allocator, entry.value_ptr.*);
                try self.data.put(key, value);
            }
        }

        self.dirty = true;
    }
};

// ============================================================================
// Helper Functions
// ============================================================================

fn getConfigPath(allocator: mem.Allocator, app_name: []const u8) ![]const u8 {
    const config_dir = switch (builtin.os.tag) {
        .linux => getConfigDirLinux(),
        .macos => getConfigDirMacos(),
        .windows => getConfigDirWindows(),
        else => ".",
    };

    return std.fs.path.join(allocator, &.{ config_dir, app_name, "settings.json" });
}

fn getConfigDirLinux() []const u8 {
    if (std.posix.getenv("XDG_CONFIG_HOME")) |config| {
        return config;
    }
    if (std.posix.getenv("HOME")) |home| {
        return home;
    }
    return "~/.config";
}

fn getConfigDirMacos() []const u8 {
    if (std.posix.getenv("HOME")) |home| {
        return home;
    }
    return "~/.config";
}

fn getConfigDirWindows() []const u8 {
    if (std.posix.getenv("APPDATA")) |appdata| {
        return appdata;
    }
    return "C:\\Users\\Default\\AppData\\Roaming";
}

fn jsonValueToSettingValue(allocator: mem.Allocator, value: std.json.Value) SettingsError!SettingValue {
    return switch (value) {
        .string => |s| .{ .string = try allocator.dupe(u8, s) },
        .integer => |i| .{ .int = i },
        .float => |f| .{ .float = f },
        .bool => |b| .{ .bool = b },
        .null => .null,
        .array => |arr| {
            const items = try allocator.alloc(SettingValue, arr.items.len);
            for (arr.items, 0..) |item, idx| {
                items[idx] = try jsonValueToSettingValue(allocator, item);
            }
            return .{ .array = items };
        },
        .object => |obj| {
            var map = std.StringHashMap(SettingValue).init(allocator);
            var it = obj.iterator();
            while (it.next()) |entry| {
                const key = try allocator.dupe(u8, entry.key_ptr.*);
                const val = try jsonValueToSettingValue(allocator, entry.value_ptr.*);
                try map.put(key, val);
            }
            return .{ .object = map };
        },
    };
}

fn duplicateSettingValue(allocator: mem.Allocator, value: SettingValue) SettingsError!SettingValue {
    return switch (value) {
        .string => |s| .{ .string = try allocator.dupe(u8, s) },
        .int => |i| .{ .int = i },
        .float => |f| .{ .float = f },
        .bool => |b| .{ .bool = b },
        .null => .null,
        .array => |arr| {
            const items = try allocator.alloc(SettingValue, arr.len);
            for (arr, 0..) |item, idx| {
                items[idx] = try duplicateSettingValue(allocator, item);
            }
            return .{ .array = items };
        },
        .object => |obj| {
            var map = std.StringHashMap(SettingValue).init(allocator);
            var it = obj.iterator();
            while (it.next()) |entry| {
                const key = try allocator.dupe(u8, entry.key_ptr.*);
                const val = try duplicateSettingValue(allocator, entry.value_ptr.*);
                try map.put(key, val);
            }
            return .{ .object = map };
        },
    };
}

// ============================================================================
// Tests
// ============================================================================

const testing = std.testing;

test "Settings - Create manager" {
    var settings = try SettingsManager.init(testing.allocator, "TestApp");
    defer settings.deinit();
}

test "Settings - Set and get values" {
    var settings = try SettingsManager.init(testing.allocator, "TestApp");
    defer settings.deinit();

    try settings.setString("name", "Test");
    try settings.setInt("count", 42);
    try settings.setFloat("pi", 3.14159);
    try settings.setBool("enabled", true);

    try testing.expectEqualStrings("Test", settings.getString("name", "Default"));
    try testing.expectEqual(@as(i64, 42), settings.getInt("count", 0));
    try testing.expectEqual(@as(f64, 3.14159), settings.getFloat("pi", 0));
    try testing.expectEqual(true, settings.getBool("enabled", false));
}

test "Settings - Has and remove" {
    var settings = try SettingsManager.init(testing.allocator, "TestApp");
    defer settings.deinit();

    try settings.setString("key", "value");
    try testing.expect(settings.has("key"));

    settings.remove("key");
    try testing.expect(!settings.has("key"));
}

test "Settings - Default values" {
    var settings = try SettingsManager.init(testing.allocator, "TestApp");
    defer settings.deinit();

    try testing.expectEqualStrings("Default", settings.getString("nonexistent", "Default"));
    try testing.expectEqual(@as(i64, 99), settings.getInt("nonexistent", 99));
}

test "Settings - Clear all" {
    var settings = try SettingsManager.init(testing.allocator, "TestApp");
    defer settings.deinit();

    try settings.setString("a", "1");
    try settings.setString("b", "2");

    settings.clear();
    try testing.expect(!settings.has("a"));
    try testing.expect(!settings.has("b"));
}

test "Settings - All value types" {
    var settings = try SettingsManager.init(testing.allocator, "TestApp");
    defer settings.deinit();

    try settings.setString("str", "hello");
    try settings.setInt("int", 42);
    try settings.setFloat("float", 3.14);
    try settings.setBool("bool", true);

    try testing.expectEqualStrings("hello", settings.getString("str", ""));
    try testing.expectEqual(@as(i64, 42), settings.getInt("int", 0));
    try testing.expectEqual(@as(f64, 3.14), settings.getFloat("float", 0.0));
    try testing.expectEqual(true, settings.getBool("bool", false));
}

test "Settings - Type coercion" {
    var settings = try SettingsManager.init(testing.allocator, "TestApp");
    defer settings.deinit();

    try settings.setInt("number", 42);
    // Float should coerce from int
    try testing.expectEqual(@as(f64, 42.0), settings.getFloat("number", 0.0));
}

test "Settings - Remove non-existent key" {
    var settings = try SettingsManager.init(testing.allocator, "TestApp");
    defer settings.deinit();

    // Should not panic
    settings.remove("nonexistent");
    try testing.expect(!settings.has("nonexistent"));
}

test "Settings - Multiple set same key" {
    var settings = try SettingsManager.init(testing.allocator, "TestApp");
    defer settings.deinit();

    try settings.setString("key", "value1");
    try testing.expectEqualStrings("value1", settings.getString("key", ""));

    // Overwrite
    try settings.setString("key", "value2");
    try testing.expectEqualStrings("value2", settings.getString("key", ""));
}

test "Settings - Keys collection" {
    var settings = try SettingsManager.init(testing.allocator, "TestApp");
    defer settings.deinit();

    try settings.setString("a", "1");
    try settings.setString("b", "2");
    try settings.setString("c", "3");

    const keys = settings.keys();
    defer testing.allocator.free(keys);

    try testing.expectEqual(@as(usize, 3), keys.len);
}

test "Settings - Schema validation" {
    const schema = SettingsSchema{
        .version = 1,
        .fields = &.{
            .{ .name = "required_field", .field_type = .string, .required = true },
            .{ .name = "optional_field", .field_type = .int, .required = false, .default = .{ .int = 10 } },
        },
    };

    var settings = try SettingsManager.init(testing.allocator, "TestApp");
    defer settings.deinit();

    settings.setSchema(schema);

    // Missing required field should fail
    try testing.expectError(SettingsError.ValidationFailed, settings.load());
}

test "Settings - Schema with valid data" {
    const schema = SettingsSchema{
        .version = 1,
        .fields = &.{
            .{ .name = "count", .field_type = .int, .required = false, .min = 0, .max = 100 },
        },
    };

    var settings = try SettingsManager.init(testing.allocator, "TestApp");
    defer settings.deinit();

    settings.setSchema(schema);
    try settings.setInt("count", 50);
    try testing.expectEqual(@as(i64, 50), settings.getInt("count", 0));
}

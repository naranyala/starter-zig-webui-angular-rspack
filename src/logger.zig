//! Unified Logging Module for Zig WebUI Application
//! Provides consistent logging patterns across all modules

const std = @import("std");
const errors = @import("errors");

// ============================================================================
// Log Levels
// ============================================================================

pub const LogLevel = enum {
    debug,
    info,
    warn,
    err,

    pub fn toString(level: LogLevel) []const u8 {
        return switch (level) {
            .debug => "DEBUG",
            .info => "INFO",
            .warn => "WARN",
            .err => "ERROR",
        };
    }

    pub fn toColorCode(level: LogLevel) []const u8 {
        return switch (level) {
            .debug => "\x1b[90m", // Gray
            .info => "\x1b[32m", // Green
            .warn => "\x1b[33m", // Yellow
            .err => "\x1b[31m", // Red
        };
    }
};

// ============================================================================
// Logger Interface
// ============================================================================

pub const Logger = struct {
    prefix: []const u8 = "[App]",
    min_level: LogLevel = .debug,
    use_colors: bool = true,

    const Self = @This();

    pub fn init(prefix: []const u8) Self {
        return Self{
            .prefix = prefix,
        };
    }

    pub fn withPrefix(self: Self, prefix: []const u8) Self {
        return Self{
            .prefix = prefix,
            .min_level = self.min_level,
            .use_colors = self.use_colors,
            .output_stream = self.output_stream,
        };
    }

    pub fn withLevel(self: Self, level: LogLevel) Self {
        return Self{
            .prefix = self.prefix,
            .min_level = level,
            .use_colors = self.use_colors,
            .output_stream = self.output_stream,
        };
    }

    pub fn setLevel(self: *Self, level: LogLevel) void {
        self.min_level = level;
    }

    pub fn setColorsEnabled(self: *Self, enabled: bool) void {
        self.use_colors = enabled;
    }

    // Core logging method
    pub fn log(self: Self, level: LogLevel, comptime fmt: []const u8, args: anytype) void {
        if (@intFromEnum(level) < @intFromEnum(self.min_level)) {
            return;
        }

        var buffer: [1024]u8 = undefined;
        const timestamp = std.time.timestamp();

        // Format timestamp
        const time_str = std.fmt.bufPrint(buffer[0..], "[{}]", .{timestamp}) catch "[?]";

        if (self.use_colors) {
            const color = level.toColorCode();
            const reset = "\x1b[0m";
            std.debug.print("{s}{s} {s}[{s}] {s}: ", .{
                color,
                time_str,
                self.prefix,
                level.toString(),
                reset,
            });
        } else {
            std.debug.print("{s} {s}[{s}]: ", .{
                time_str,
                self.prefix,
                level.toString(),
            });
        }

        std.debug.print(fmt ++ "\n", args);
    }

    // Convenience methods
    pub fn debug(self: Self, comptime fmt: []const u8, args: anytype) void {
        self.log(.debug, fmt, args);
    }

    pub fn info(self: Self, comptime fmt: []const u8, args: anytype) void {
        self.log(.info, fmt, args);
    }

    pub fn warn(self: Self, comptime fmt: []const u8, args: anytype) void {
        self.log(.warn, fmt, args);
    }

    pub fn err(self: Self, comptime fmt: []const u8, args: anytype) void {
        self.log(.err, fmt, args);
    }

    // String-based logging (for dynamic messages)
    pub fn logString(self: Self, level: LogLevel, message: []const u8) void {
        if (@intFromEnum(level) < @intFromEnum(self.min_level)) {
            return;
        }

        var buffer: [1024]u8 = undefined;
        const timestamp = std.time.timestamp();

        const time_str = std.fmt.bufPrint(buffer[0..], "[{}]", .{timestamp}) catch "[?]";

        if (self.use_colors) {
            const color = level.toColorCode();
            const reset = "\x1b[0m";
            std.debug.print("{s}{s} {s}[{s}] {s}{s}\n", .{
                color,
                time_str,
                self.prefix,
                level.toString(),
                reset,
                message,
            });
        } else {
            std.debug.print("{s} {s}[{s}]: {s}\n", .{
                time_str,
                self.prefix,
                level.toString(),
                message,
            });
        }
    }

    pub fn debugString(self: Self, message: []const u8) void {
        self.logString(.debug, message);
    }

    pub fn infoString(self: Self, message: []const u8) void {
        self.logString(.info, message);
    }

    pub fn warnString(self: Self, message: []const u8) void {
        self.logString(.warn, message);
    }

    pub fn errString(self: Self, message: []const u8) void {
        self.logString(.err, message);
    }

    // Error logging with UnifiedError
    pub fn logError(self: Self, unified_err: errors.UnifiedError) void {
        self.errString(errors.errorMessage(unified_err));
    }
};

// ============================================================================
// Global Logger Instance
// ============================================================================

var global_logger: ?Logger = null;

pub fn initGlobalLogger(prefix: []const u8) void {
    global_logger = Logger.init(prefix);
}

pub fn getGlobalLogger() Logger {
    return global_logger orelse Logger.init("[App]");
}

pub fn setGlobalLogLevel(level: LogLevel) void {
    if (global_logger) |*logger| {
        logger.setLevel(level);
    }
}

// ============================================================================
// Convenience Functions
// ============================================================================

pub fn logDebug(comptime fmt: []const u8, args: anytype) void {
    getGlobalLogger().debug(fmt, args);
}

pub fn logInfo(comptime fmt: []const u8, args: anytype) void {
    getGlobalLogger().info(fmt, args);
}

pub fn logWarn(comptime fmt: []const u8, args: anytype) void {
    getGlobalLogger().warn(fmt, args);
}

pub fn logErr(comptime fmt: []const u8, args: anytype) void {
    getGlobalLogger().err(fmt, args);
}

pub fn logError(err: errors.UnifiedError) void {
    getGlobalLogger().logError(err);
}

// ============================================================================
// Module-Specific Loggers
// ============================================================================

pub const ModuleLoggers = struct {
    pub const db = Logger.init("[Database]");
    pub const di = Logger.init("[DI]");
    pub const webui = Logger.init("[WebUI]");
    pub const http = Logger.init("[HTTP]");
    pub const process = Logger.init("[Process]");
    pub const utils = Logger.init("[Utils]");
    pub const main = Logger.init("[Main]");
};

// ============================================================================
// Tests
// ============================================================================

const testing = std.testing;

test "Logger initialization" {
    const logger = Logger.init("[Test]");
    try testing.expectEqualStrings("[Test]", logger.prefix);
}

test "Logger level filtering" {
    var logger = Logger.init("[Test]");
    logger.setLevel(.warn);

    // These should not output (debug level filtered)
    logger.debug("This should not appear", .{});
    logger.info("This should not appear", .{});

    // These should output
    logger.warn("This should appear", .{});
    logger.err("This should appear", .{});
}

test "Logger without colors" {
    var logger = Logger.init("[Test]");
    logger.setColorsEnabled(false);
    logger.info("No colors message", .{});
}

test "Module loggers" {
    const db_logger = ModuleLoggers.db;
    try testing.expectEqualStrings("[Database]", db_logger.prefix);

    const di_logger = ModuleLoggers.di;
    try testing.expectEqualStrings("[DI]", di_logger.prefix);
}

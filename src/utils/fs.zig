//! File System Utility
//! Provides common file operations for desktop applications
//! Features: Read/Write, Directory operations, File watching, Path utilities

const std = @import("std");
const fs = std.fs;
const mem = std.mem;
const time = std.time;

const log = std.log.scoped(.FileSystem);

// ============================================================================
// Error Types
// ============================================================================

pub const FsError = error{
    FileNotFound,
    PermissionDenied,
    IsDir,
    NotDir,
    PathAlreadyExists,
    PathNotFound,
    InvalidPath,
    ReadFailed,
    WriteFailed,
    CopyFailed,
    DeleteFailed,
    WatchFailed,
    InvalidEncoding,
    OutOfMemory,
};

// ============================================================================
// File Info Structure
// ============================================================================

pub const FileInfo = struct {
    name: []const u8,
    path: []const u8,
    size: u64,
    is_file: bool,
    is_dir: bool,
    created_at: i128,
    modified_at: i128,
    accessed_at: i128,

    pub fn deinit(self: *FileInfo, allocator: mem.Allocator) void {
        allocator.free(self.name);
        allocator.free(self.path);
    }
};

// ============================================================================
// File Operations
// ============================================================================

/// Read entire file as string
pub fn readFile(allocator: mem.Allocator, path: []const u8) FsError![]u8 {
    log.debug("Reading file: {s}", .{path});

    var file = fs.cwd().openFile(path, .{}) catch |err| {
        log.err("Failed to open file: {s}, error: {}", .{ path, err });
        return switch (err) {
            error.FileNotFound => FsError.FileNotFound,
            error.AccessDenied => FsError.PermissionDenied,
            error.IsDir => FsError.IsDir,
            else => FsError.ReadFailed,
        };
    };
    defer file.close();

    const stat = file.stat() catch return FsError.ReadFailed;
    const content = try allocator.alloc(u8, stat.size);
    errdefer allocator.free(content);

    const bytes_read = file.readAll(content) catch {
        log.err("Failed to read file: {s}", .{path});
        return FsError.ReadFailed;
    };

    log.debug("Read {d} bytes from: {s}", .{ bytes_read, path });
    return content[0..bytes_read];
}

/// Read entire file as JSON and parse
pub fn readJsonFile(allocator: mem.Allocator, path: []const u8, comptime T: type) FsError!T {
    const content = try readFile(allocator, path);
    defer allocator.free(content);

    return std.json.parseFromSlice(T, allocator, content, .{}) catch |err| {
        log.err("Failed to parse JSON from file: {s}, error: {}", .{ path, err });
        return FsError.InvalidEncoding;
    };
}

/// Write string to file (creates or overwrites)
pub fn writeFile(path: []const u8, content: []const u8) FsError!void {
    log.debug("Writing file: {s} ({d} bytes)", .{ path, content.len });

    var file = fs.cwd().createFile(path, .{}) catch |err| {
        log.err("Failed to create file: {s}, error: {}", .{ path, err });
        return switch (err) {
            error.AccessDenied => FsError.PermissionDenied,
            else => FsError.WriteFailed,
        };
    };
    defer file.close();

    file.writeAll(content) catch {
        log.err("Failed to write to file: {s}", .{path});
        return FsError.WriteFailed;
    };

    log.debug("Successfully wrote to: {s}", .{path});
}

/// Write JSON to file (pretty printed)
pub fn writeJsonFile(path: []const u8, data: anytype) FsError!void {
    var buffer = std.ArrayList(u8).init(std.heap.page_allocator);
    defer buffer.deinit();

    const writer = buffer.writer();
    std.json.stringify(data, .{ .whitespace = .indent_2 }, writer) catch {
        return FsError.InvalidEncoding;
    };

    try writeFile(path, buffer.items);
}

/// Append content to file
pub fn appendFile(path: []const u8, content: []const u8) FsError!void {
    log.debug("Appending to file: {s}", .{path});

    var file = fs.cwd().openFile(path, .{ .mode = .write_only }) catch |err| {
        if (err == error.FileNotFound) {
            return writeFile(path, content);
        }
        return switch (err) {
            error.AccessDenied => FsError.PermissionDenied,
            else => FsError.WriteFailed,
        };
    };
    defer file.close();

    try file.seekTo(file.getEndPos() catch return FsError.WriteFailed);
    file.writeAll(content) catch return FsError.WriteFailed;
}

/// Check if file exists
pub fn fileExists(path: []const u8) bool {
    const stat = fs.cwd().statFile(path);
    return stat != null;
}

/// Get file size
pub fn getFileSize(path: []const u8) FsError!u64 {
    const stat = fs.cwd().statFile(path) catch |err| {
        return switch (err) {
            error.FileNotFound => FsError.FileNotFound,
            error.AccessDenied => FsError.PermissionDenied,
            else => FsError.ReadFailed,
        };
    };
    return stat.size;
}

/// Delete file
pub fn deleteFile(path: []const u8) FsError!void {
    log.debug("Deleting file: {s}", .{path});
    fs.cwd().deleteFile(path) catch |err| {
        log.err("Failed to delete file: {s}, error: {}", .{ path, err });
        return switch (err) {
            error.FileNotFound => FsError.FileNotFound,
            error.AccessDenied => FsError.PermissionDenied,
            error.IsDir => FsError.IsDir,
            else => FsError.DeleteFailed,
        };
    };
}

/// Copy file
pub fn copyFile(src_path: []const u8, dest_path: []const u8) FsError!void {
    log.debug("Copying file: {s} -> {s}", .{ src_path, dest_path });

    const src_file = fs.cwd().openFile(src_path, .{}) catch |err| {
        return switch (err) {
            error.FileNotFound => FsError.FileNotFound,
            error.AccessDenied => FsError.PermissionDenied,
            error.IsDir => FsError.IsDir,
            else => FsError.CopyFailed,
        };
    };
    defer src_file.close();

    const dest_file = fs.cwd().createFile(dest_path, .{}) catch |err| {
        return switch (err) {
            error.AccessDenied => FsError.PermissionDenied,
            error.PathAlreadyExists => FsError.PathAlreadyExists,
            else => FsError.CopyFailed,
        };
    };
    defer dest_file.close();

    const stat = src_file.stat() catch return FsError.CopyFailed;
    std.mem.copyForwards(u8, dest_file.writer().context, src_file.reader().readAllAlloc(std.heap.page_allocator, stat.size) catch return FsError.CopyFailed);
}

/// Move/rename file
pub fn moveFile(src_path: []const u8, dest_path: []const u8) FsError!void {
    log.debug("Moving file: {s} -> {s}", .{ src_path, dest_path });
    try copyFile(src_path, dest_path);
    try deleteFile(src_path);
}

// ============================================================================
// Directory Operations
// ============================================================================

/// Create directory (and parents if needed)
pub fn createDir(path: []const u8) FsError!void {
    log.debug("Creating directory: {s}", .{path});

    fs.cwd().makeDir(path) catch |err| {
        if (err == error.PathAlreadyExists) {
            log.debug("Directory already exists: {s}", .{path});
            return;
        }
        if (err == error.PathNotFound) {
            // Create parent directories
            const parent = std.fs.path.dirname(path) orelse return;
            if (parent.len > 0) {
                try createDir(parent);
                return createDir(path);
            }
        }
        log.err("Failed to create directory: {s}, error: {}", .{ path, err });
        return switch (err) {
            error.AccessDenied => FsError.PermissionDenied,
            error.PathAlreadyExists => FsError.PathAlreadyExists,
            else => FsError.WriteFailed,
        };
    };
}

/// Delete directory (must be empty)
pub fn deleteDir(path: []const u8) FsError!void {
    log.debug("Deleting directory: {s}", .{path});
    fs.cwd().deleteDir(path) catch |err| {
        log.err("Failed to delete directory: {s}, error: {}", .{ path, err });
        return switch (err) {
            error.FileNotFound => FsError.FileNotFound,
            error.AccessDenied => FsError.PermissionDenied,
            error.PathNotEmpty => error.PathNotEmpty,
            else => FsError.DeleteFailed,
        };
    };
}

/// Delete directory recursively
pub fn deleteDirRecursive(path: []const u8) FsError!void {
    log.debug("Deleting directory recursively: {s}", .{path});

    var iter = fs.cwd().openDir(path, .{ .iterate = true }) catch |err| {
        return switch (err) {
            error.FileNotFound => FsError.FileNotFound,
            error.AccessDenied => FsError.PermissionDenied,
            else => FsError.DeleteFailed,
        };
    };
    defer iter.close();

    var buf: [4096]u8 = undefined;
    while (iter.readDirName(&buf)) |entry| {
        const sub_path = try std.fs.path.join(std.heap.page_allocator, &.{ path, entry });
        defer std.heap.page_allocator.free(sub_path);

        const stat = fs.cwd().statFile(sub_path) catch continue;
        if (stat.kind == .directory) {
            try deleteDirRecursive(sub_path);
        } else {
            try deleteFile(sub_path);
        }
    }

    try deleteDir(path);
}

/// Check if directory exists
pub fn dirExists(path: []const u8) bool {
    const stat = fs.cwd().statFile(path) catch return false;
    return stat.kind == .directory;
}

/// List directory contents
pub fn listDir(allocator: mem.Allocator, path: []const u8) FsError![]FileInfo {
    log.debug("Listing directory: {s}", .{path});

    var dir = fs.cwd().openDir(path, .{ .iterate = true }) catch |err| {
        return switch (err) {
            error.FileNotFound => FsError.FileNotFound,
            error.AccessDenied => FsError.PermissionDenied,
            error.NotDir => FsError.NotDir,
            else => FsError.ReadFailed,
        };
    };
    defer dir.close();

    var files = std.ArrayList(FileInfo).init(allocator);
    errdefer {
        for (files.items) |*file| {
            file.deinit(allocator);
        }
        files.deinit();
    }

    var buf: [4096]u8 = undefined;
    while (dir.readDirName(&buf)) |entry| {
        const full_path = try std.fs.path.join(allocator, &.{ path, entry });

        const stat = fs.cwd().statFile(full_path) catch continue;

        try files.append(.{
            .name = try allocator.dupe(u8, entry),
            .path = try allocator.dupe(u8, full_path),
            .size = stat.size,
            .is_file = stat.kind == .file,
            .is_dir = stat.kind == .directory,
            .created_at = stat.created_at,
            .modified_at = stat.mtime,
            .accessed_at = stat.atime,
        });
    }

    return files.toOwnedSlice();
}

/// Get current working directory
pub fn getCwd(allocator: mem.Allocator) FsError![]u8 {
    var buf: [4096]u8 = undefined;
    const path = fs.cwd().realpath(".", &buf) catch return FsError.InvalidPath;
    return allocator.dupe(u8, path);
}

/// Join path components
pub fn joinPath(allocator: mem.Allocator, paths: [][]const u8) FsError![]u8 {
    return std.fs.path.join(allocator, paths) catch return FsError.InvalidPath;
}

/// Get parent directory
pub fn getParentDir(allocator: mem.Allocator, path: []const u8) FsError![]u8 {
    const parent = std.fs.path.dirname(path) orelse return FsError.InvalidPath;
    return allocator.dupe(u8, parent);
}

/// Get file extension
pub fn getExtension(path: []const u8) ?[]const u8 {
    return std.fs.path.extension(path);
}

/// Get file name without extension
pub fn getFileNameWithoutExt(path: []const u8) []const u8 {
    const name = std.fs.path.basename(path);
    const ext = getExtension(name);
    if (ext) |e| {
        return name[0 .. name.len - e.len];
    }
    return name;
}

/// Get file name with extension
pub fn getFileName(path: []const u8) []const u8 {
    return std.fs.path.basename(path);
}

// ============================================================================
// File Watcher
// ============================================================================

pub const FileWatchEvent = struct {
    path: []const u8,
    event_type: WatchEventType,
    timestamp: i128,
};

pub const WatchEventType = enum {
    created,
    modified,
    deleted,
    renamed,
};

pub const FileWatcherConfig = struct {
    watch_subdirs: bool = true,
    debounce_ms: u64 = 100,
    buffer_size: usize = 4096,
};

pub const FileWatcher = struct {
    allocator: mem.Allocator,
    config: FileWatcherConfig,
    watched_paths: std.StringHashMap(void),
    event_queue: std.ArrayList(FileWatchEvent),
    running: bool = false,
    mutex: std.Thread.Mutex = .{},
    callback: ?*const fn (FileWatchEvent) void = null,

    const Self = @This();

    pub fn init(allocator: mem.Allocator, config: FileWatcherConfig) Self {
        return .{
            .allocator = allocator,
            .config = config,
            .watched_paths = std.StringHashMap(void).init(allocator),
            .event_queue = std.ArrayList(FileWatchEvent).init(allocator),
        };
    }

    pub fn deinit(self: *Self) void {
        self.stop();
        self.watched_paths.deinit();
        self.event_queue.deinit();
    }

    pub fn watch(self: *Self, path: []const u8) FsError!void {
        log.debug("Watching path: {s}", .{path});

        if (!dirExists(path) and !fileExists(path)) {
            return FsError.FileNotFound;
        }

        const key = try self.allocator.dupe(u8, path);
        errdefer self.allocator.free(key);
        try self.watched_paths.put(key, {});
    }

    pub fn unwatch(self: *Self, path: []const u8) void {
        _ = self.watched_paths.remove(path);
    }

    pub fn setCallback(self: *Self, comptime callback: *const fn (FileWatchEvent) void) void {
        self.callback = callback;
    }

    pub fn start(self: *Self) !void {
        self.running = true;
        log.info("File watcher started", .{});

        while (self.running) {
            try self.checkChanges();
            std.time.sleep(std.time.ns_per_ms * 100);
        }
    }

    pub fn stop(self: *Self) void {
        self.running = false;
        log.info("File watcher stopped", .{});
    }

    fn checkChanges(self: *Self) !void {
        // Simple polling-based implementation
        // For production, use platform-specific APIs (inotify, FSEvents, etc.)
        var it = self.watched_paths.iterator();
        while (it.next()) |entry| {
            const path = entry.key_ptr.*;
            const exists = fileExists(path) or dirExists(path);
            if (exists) {
                // Check modification time
                const stat = fs.cwd().statFile(path) catch continue;
                const now = time.timestamp();
                if (now - stat.mtime < 1) {
                    try self.emitEvent(path, .modified);
                }
            } else {
                try self.emitEvent(path, .deleted);
            }
        }
    }

    fn emitEvent(self: *Self, path: []const u8, event_type: WatchEventType) !void {
        const event = FileWatchEvent{
            .path = try self.allocator.dupe(u8, path),
            .event_type = event_type,
            .timestamp = time.timestamp(),
        };

        self.mutex.lock();
        defer self.mutex.unlock();

        try self.event_queue.append(event);

        if (self.callback) |cb| {
            cb(event);
        }
    }

    pub fn pollEvents(self: *Self) []FileWatchEvent {
        self.mutex.lock();
        defer self.mutex.unlock();
        return self.event_queue.items;
    }

    pub fn clearEvents(self: *Self) void {
        self.mutex.lock();
        defer self.mutex.unlock();
        self.event_queue.clearRetainingCapacity();
    }
};

// ============================================================================
// Temporary File Utilities
// ============================================================================

/// Create a temporary file
pub fn createTempFile(allocator: mem.Allocator, prefix: ?[]const u8) FsError!struct { []const u8, fs.File } {
    const tmp_dir = getTempDir();
    const actual_prefix = prefix orelse "tmp";

    var random = std.crypto.random;
    var suffix_buf: [16]u8 = undefined;
    random.bytes(&suffix_buf);

    const suffix = try std.fmt.allocPrint(allocator, "{x}", .{suffix_buf});
    defer allocator.free(suffix);

    const filename = try std.fs.path.join(allocator, &.{ tmp_dir, actual_prefix, "_", suffix });

    const file = fs.cwd().createFile(filename, .{}) catch return FsError.WriteFailed;
    return .{ filename, file };
}

/// Get system temp directory
pub fn getTempDir() []const u8 {
    if (std.posix.getenv("TMPDIR")) |tmpdir| {
        return tmpdir;
    }
    if (std.posix.getenv("TEMP")) |temp| {
        return temp;
    }
    if (std.posix.getenv("TMP")) |tmp| {
        return tmp;
    }
    return "/tmp";
}

// ============================================================================
// Tests
// ============================================================================

const testing = std.testing;

test "FileSystem - Write and read file" {
    const test_content = "Hello, World!";
    const test_path = "test_file.txt";

    try writeFile(test_path, test_content);
    defer deleteFile(test_path) catch {};

    const content = try readFile(testing.allocator, test_path);
    defer testing.allocator.free(content);

    try testing.expectEqualStrings(test_content, content);
}

test "FileSystem - File exists" {
    const test_path = "test_exists.txt";
    try writeFile(test_path, "test");
    defer deleteFile(test_path) catch {};

    try testing.expect(fileExists(test_path));
    try testing.expect(!fileExists("nonexistent_file_xyz.txt"));
}

test "FileSystem - Create and delete directory" {
    const test_dir = "test_dir";
    try createDir(test_dir);
    defer deleteDir(test_dir) catch {};

    try testing.expect(dirExists(test_dir));
}

test "FileSystem - Get file size" {
    const test_path = "test_size.txt";
    const content = "12345";
    try writeFile(test_path, content);
    defer deleteFile(test_path) catch {};

    const size = try getFileSize(test_path);
    try testing.expectEqual(@as(u64, content.len), size);
}

test "FileSystem - Path utilities" {
    const path = "/home/user/file.txt";

    try testing.expectEqualStrings(".txt", getExtension(path));
    try testing.expectEqualStrings("file", getFileNameWithoutExt(path));
    try testing.expectEqualStrings("file.txt", getFileName(path));
}

test "FileSystem - JSON read/write" {
    const test_path = "test.json";
    const data = .{ .name = "Test", .value = 42 };

    try writeJsonFile(test_path, data);
    defer deleteFile(test_path) catch {};

    const parsed = try readJsonFile(testing.allocator, test_path, @TypeOf(data));
    defer parsed.deinit();

    try testing.expectEqualStrings("Test", parsed.name);
    try testing.expectEqual(@as(i32, 42), parsed.value);
}

test "FileSystem - FileWatcher init" {
    var watcher = FileWatcher.init(testing.allocator, .{});
    defer watcher.deinit();
}

test "FileSystem - Append to file" {
    const test_path = "test_append.txt";
    try writeFile(test_path, "Hello");
    defer deleteFile(test_path) catch {};

    try appendFile(test_path, " World");
    const content = try readFile(testing.allocator, test_path);
    defer testing.allocator.free(content);

    try testing.expectEqualStrings("Hello World", content);
}

test "FileSystem - File not found error" {
    const result = readFile(testing.allocator, "nonexistent_file_xyz.txt");
    try testing.expectError(FsError.FileNotFound, result);
}

test "FileSystem - Get parent directory" {
    const parent = try getParentDir(testing.allocator, "/home/user/file.txt");
    defer testing.allocator.free(parent);
    try testing.expectEqualStrings("/home/user", parent);
}

test "FileSystem - Get filename" {
    try testing.expectEqualStrings("file.txt", getFileName("/path/to/file.txt"));
    try testing.expectEqualStrings("file.txt", getFileName("file.txt"));
}

test "FileSystem - Get filename without extension" {
    try testing.expectEqualStrings("file", getFileNameWithoutExt("/path/to/file.txt"));
    try testing.expectEqualStrings("file", getFileNameWithoutExt("file.txt"));
    try testing.expectEqualStrings("archive", getFileNameWithoutExt("archive.tar.gz"));
}

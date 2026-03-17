//! Process Utility
//! Provides process management for desktop applications
//! Features: Spawn, monitor, kill, and manage child processes

const std = @import("std");
const fs = std.fs;
const mem = std.mem;
const time = std.time;
const posix = std.posix;

const log = std.log.scoped(.Process);

// ============================================================================
// Error Types
// ============================================================================

pub const ProcessError = error{
    SpawnFailed,
    NotFound,
    PermissionDenied,
    AlreadyRunning,
    NotRunning,
    Timeout,
    Killed,
    Crash,
    PipeFailed,
    InvalidArgs,
    OutOfMemory,
};

// ============================================================================
// Process Configuration
// ============================================================================

pub const ProcessConfig = struct {
    cwd: ?[]const u8 = null,
    env: ?[]const []const u8 = null,
    stdin_behavior: StdioBehavior = .inherit,
    stdout_behavior: StdioBehavior = .pipe,
    stderr_behavior: StdioBehavior = .pipe,
    max_output_size: usize = 1024 * 1024, // 1MB default

    pub const StdioBehavior = enum {
        inherit,
        pipe,
        ignore,
        null,
    };
};

// ============================================================================
// Process Result
// ============================================================================

pub const ProcessResult = struct {
    term_status: TermStatus,
    stdout: ?[]const u8,
    stderr: ?[]const u8,

    pub const TermStatus = union(enum) {
        Exited: u8,
        Stopped: u8,
        Signal: u8,
        Unknown,
    };

    pub fn success(self: *const ProcessResult) bool {
        return switch (self.term_status) {
            .Exited => |code| code == 0,
            else => false,
        };
    }

    pub fn exitCode(self: *const ProcessResult) ?u8 {
        return switch (self.term_status) {
            .Exited => |code| code,
            else => null,
        };
    }

    pub fn deinit(self: *ProcessResult, allocator: mem.Allocator) void {
        if (self.stdout) |stdout| {
            allocator.free(stdout);
        }
        if (self.stderr) |stderr| {
            allocator.free(stderr);
        }
    }
};

// ============================================================================
// Process Handle
// ============================================================================

pub const Process = struct {
    pid: posix.pid_t,
    config: ProcessConfig,
    stdin_file: ?fs.File = null,
    stdout_file: ?fs.File = null,
    stderr_file: ?fs.File = null,
    running: bool = true,
    allocator: mem.Allocator,

    const Self = @This();

    pub fn spawn(allocator: mem.Allocator, argv: []const []const u8, config: ProcessConfig) ProcessError!Self {
        log.debug("Spawning process: {s}", .{argv[0]});

        if (argv.len == 0) {
            return ProcessError.InvalidArgs;
        }

        // Convert args to null-terminated strings
        var args = try std.ArrayList([*:0]u8).initCapacity(allocator, argv.len);
        defer args.deinit();

        for (argv) |arg| {
            const c_str = try allocator.dupeZ(u8, arg);
            errdefer allocator.free(c_str);
            args.appendAssumeCapacity(c_str);
        }
        args.appendAssumeCapacity("\x00");

        // Setup stdin
        const stdin = switch (config.stdin_behavior) {
            .pipe => .{ .Pipe = {} },
            .ignore => .{ .Ignore = {} },
            .null => .{ .Close = {} },
            .inherit => .{ .Inherit = {} },
        };

        // Setup stdout
        const stdout = switch (config.stdout_behavior) {
            .pipe => .{ .Pipe = {} },
            .ignore => .{ .Ignore = {} },
            .null => .{ .Close = {} },
            .inherit => .{ .Inherit = {} },
        };

        // Setup stderr
        const stderr = switch (config.stderr_behavior) {
            .pipe => .{ .Pipe = {} },
            .ignore => .{ .Ignore = {} },
            .null => .{ .Close = {} },
            .inherit => .{ .Inherit = {} },
        };

        // Spawn the process
        const result = posix.spawn(.{
            .argv = args.items,
            .cwd = config.cwd,
            .env = config.env,
            .stdin = stdin,
            .stdout = stdout,
            .stderr = stderr,
        }) catch |err| {
            log.err("Failed to spawn process: {s}, error: {}", .{ argv[0], err });
            return switch (err) {
                error.FileNotFound => ProcessError.NotFound,
                error.AccessDenied => ProcessError.PermissionDenied,
                else => ProcessError.SpawnFailed,
            };
        };

        // Free the duplicated strings
        for (args.items) |c_str| {
            if (c_str[0] != 0) {
                allocator.free(mem.span(c_str));
            }
        }

        log.info("Process spawned with PID: {d}", .{result.pid});

        return Self{
            .pid = result.pid,
            .config = config,
            .allocator = allocator,
        };
    }

    pub fn wait(self: *Self) ProcessError!ProcessResult.TermStatus {
        log.debug("Waiting for process {d} to complete", .{self.pid});

        const result = posix.waitpid(self.pid);
        self.running = false;

        return switch (result.status) {
            .Exited => |code| {
                log.debug("Process {d} exited with code: {d}", .{ self.pid, code });
                return .{ .Exited = @intCast(code) };
            },
            .Stopped => |code| {
                log.debug("Process {d} stopped with code: {d}", .{ self.pid, code });
                return .{ .Stopped = @intCast(code) };
            },
            .Signal => |code| {
                log.debug("Process {d} killed by signal: {d}", .{ self.pid, code });
                return .{ .Signal = @intCast(code) };
            },
            else => {
                log.warn("Process {d} terminated with unknown status", .{self.pid});
                return .Unknown;
            },
        };
    }

    pub fn waitWithTimeout(self: *Self, timeout_ms: u64) ProcessError!ProcessResult.TermStatus {
        const start = time.milliTimestamp();

        while (self.running) {
            const elapsed = time.milliTimestamp() - start;
            if (elapsed >= timeout_ms) {
                log.warn("Process {d} timed out after {d}ms", .{ self.pid, timeout_ms });
                return ProcessError.Timeout;
            }

            // Non-blocking wait
            const result = posix.waitpid(self.pid);
            if (result.status != .Running) {
                self.running = false;
                return switch (result.status) {
                    .Exited => |code| .{ .Exited = @intCast(code) },
                    .Stopped => |code| .{ .Stopped = @intCast(code) },
                    .Signal => |code| .{ .Signal = @intCast(code) },
                    else => .Unknown,
                };
            }

            std.time.sleep(std.time.ns_per_ms * 100);
        }

        return self.wait();
    }

    pub fn kill(self: *Self) ProcessError!void {
        log.info("Killing process {d}", .{self.pid});

        posix.kill(self.pid, .TERM) catch |err| {
            log.err("Failed to kill process {d}: {}", .{ self.pid, err });
            return ProcessError.Killed;
        };

        self.running = false;
    }

    pub fn isRunning(self: *Self) bool {
        if (!self.running) return false;

        // Check if process exists
        posix.kill(self.pid, .ZERO) catch return false;
        return true;
    }

    pub fn getPid(self: *const Self) posix.pid_t {
        return self.pid;
    }

    pub fn writeStdin(self: *Self, data: []const u8) ProcessError!void {
        if (self.stdin_file) |*file| {
            file.writeAll(data) catch |err| {
                log.err("Failed to write to process stdin: {}", .{err});
                return ProcessError.PipeFailed;
            };
        }
    }

    pub fn readStdout(self: *Self, buffer: []u8) ProcessError!usize {
        if (self.stdout_file) |*file| {
            return file.read(buffer) catch |err| {
                log.err("Failed to read from process stdout: {}", .{err});
                return ProcessError.PipeFailed;
            };
        }
        return 0;
    }

    pub fn readStderr(self: *Self, buffer: []u8) ProcessError!usize {
        if (self.stderr_file) |*file| {
            return file.read(buffer) catch |err| {
                log.err("Failed to read from process stderr: {}", .{err});
                return ProcessError.PipeFailed;
            };
        }
        return 0;
    }
};

// ============================================================================
// Process Manager
// ============================================================================

pub const ProcessManager = struct {
    allocator: mem.Allocator,
    processes: std.AutoHashMap(posix.pid_t, Process),
    mutex: std.Thread.Mutex = .{},

    const Self = @This();

    pub fn init(allocator: mem.Allocator) Self {
        return .{
            .allocator = allocator,
            .processes = std.AutoHashMap(posix.pid_t, Process).init(allocator),
        };
    }

    pub fn deinit(self: *Self) void {
        self.killAll();
        self.processes.deinit();
    }

    pub fn spawn(self: *Self, argv: []const []const u8, config: ProcessConfig) ProcessError!Process {
        const process = try Process.spawn(self.allocator, argv, config);

        self.mutex.lock();
        defer self.mutex.unlock();

        try self.processes.put(process.pid, process);
        log.info("Process {d} registered with manager", .{process.pid});

        return process;
    }

    pub fn remove(self: *Self, pid: posix.pid_t) void {
        self.mutex.lock();
        defer self.mutex.unlock();

        _ = self.processes.fetchRemove(pid);
        log.info("Process {d} removed from manager", .{pid});
    }

    pub fn get(self: *Self, pid: posix.pid_t) ?*Process {
        return self.processes.getPtr(pid);
    }

    pub fn kill(self: *Self, pid: posix.pid_t) ProcessError!void {
        self.mutex.lock();
        defer self.mutex.unlock();

        if (self.processes.getPtr(pid)) |process| {
            try process.kill();
            _ = self.processes.fetchRemove(pid);
        } else {
            return ProcessError.NotRunning;
        }
    }

    pub fn killAll(self: *Self) void {
        self.mutex.lock();
        defer self.mutex.unlock();

        var it = self.processes.iterator();
        while (it.next()) |entry| {
            entry.value_ptr.kill() catch {};
        }
        self.processes.clearRetainingCapacity();

        log.info("All processes killed", .{});
    }

    pub fn waitForAll(self: *Self) void {
        self.mutex.lock();
        const processes = self.processes.values();
        self.mutex.unlock();

        for (processes) |process| {
            _ = process.wait() catch {};
        }
    }

    pub fn count(self: *Self) usize {
        return self.processes.count();
    }
};

// ============================================================================
// Convenience Functions
// ============================================================================

/// Run a command and wait for result
pub fn run(allocator: mem.Allocator, argv: []const []const u8, config: ProcessConfig) ProcessError!ProcessResult {
    log.debug("Running command: {s}", .{argv[0]});

    var process = try Process.spawn(allocator, argv, config);
    defer {
        // Cleanup stdout/stderr if piped
        if (process.stdout_file) |*f| f.close();
        if (process.stderr_file) |*f| f.close();
    }

    const term_status = process.wait() catch |err| {
        log.err("Process wait failed: {}", .{err});
        return ProcessError.Crash;
    };

    // Read stdout if piped
    var stdout_buf: ?[]u8 = null;
    if (config.stdout_behavior == .pipe and process.stdout_file) |*file| {
        stdout_buf = try allocator.alloc(u8, config.max_output_size);
        const n = file.read(stdout_buf.?) catch 0;
        stdout_buf = stdout_buf.?[0..n];
    }

    // Read stderr if piped
    var stderr_buf: ?[]u8 = null;
    if (config.stderr_behavior == .pipe and process.stderr_file) |*file| {
        stderr_buf = try allocator.alloc(u8, config.max_output_size);
        const n = file.read(stderr_buf.?) catch 0;
        stderr_buf = stderr_buf.?[0..n];
    }

    return .{
        .term_status = term_status,
        .stdout = stdout_buf,
        .stderr = stderr_buf,
    };
}

/// Run a command and return output as string
pub fn runWithOutput(allocator: mem.Allocator, argv: []const []const u8) ProcessError!struct { []const u8, []const u8 } {
    const result = try run(allocator, argv, .{});
    return .{
        result.stdout orelse "",
        result.stderr orelse "",
    };
}

/// Check if a command exists in PATH
pub fn commandExists(command: []const u8) bool {
    // Try to find the command
    var buf: [4096]u8 = undefined;
    const path = fs.cwd().realpath(command, &buf) catch return false;
    const stat = fs.cwd().statFile(path) catch return false;
    return stat.kind == .file;
}

/// Find executable in PATH
pub fn findExecutable(allocator: mem.Allocator, name: []const u8) ?[]const u8 {
    const path_env = posix.getenv("PATH") orelse return null;

    var it = mem.tokenizeScalar(u8, path_env, ':');
    while (it.next()) |dir| {
        const full_path = std.fs.path.join(allocator, &.{ dir, name }) catch continue;

        const stat = fs.cwd().statFile(full_path) catch {
            allocator.free(full_path);
            continue;
        };

        if (stat.kind == .file) {
            return full_path;
        }
        allocator.free(full_path);
    }

    return null;
}

// ============================================================================
// Tests
// ============================================================================

const testing = std.testing;

test "Process - Command exists" {
    // Test with a common command
    const exists = commandExists("/bin/sh");
    try testing.expect(exists);
}

test "Process - Find executable" {
    const path = findExecutable(testing.allocator, "sh");
    if (path) |p| {
        defer testing.allocator.free(p);
        try testing.expect(p.len > 0);
    }
}

test "Process - ProcessManager init" {
    var manager = ProcessManager.init(testing.allocator);
    defer manager.deinit();
}

test "Process - Run simple command" {
    // This test may fail on systems without /bin/echo
    const result = run(testing.allocator, &.{ "/bin/echo", "hello" }, .{
        .stdout_behavior = .pipe,
        .stderr_behavior = .ignore,
    }) catch |err| {
        // Skip test if command not found
        if (err == ProcessError.NotFound) return;
        return err;
    };
    defer result.deinit(testing.allocator);

    try testing.expect(result.success());
}

test "Process - Process spawn and kill" {
    var manager = ProcessManager.init(testing.allocator);
    defer manager.deinit();

    // Spawn a long-running process
    const process = manager.spawn(&.{ "/bin/sleep", "60" }, .{
        .stdout_behavior = .ignore,
        .stderr_behavior = .ignore,
    }) catch |err| {
        // Skip test if command not found
        if (err == ProcessError.NotFound) return;
        return err;
    };

    try testing.expect(process.isRunning());
    try manager.kill(process.pid);
    try testing.expect(!process.isRunning());
}

test "Process - Process result success check" {
    const result = run(testing.allocator, &.{ "/bin/echo", "test" }, .{
        .stdout_behavior = .pipe,
        .stderr_behavior = .ignore,
    }) catch |err| {
        if (err == ProcessError.NotFound) return;
        return err;
    };
    defer result.deinit(testing.allocator);

    try testing.expect(result.success());
    try testing.expectEqual(@as(u8, 0), result.exitCode());
}

test "Process - Process result failure check" {
    const result = run(testing.allocator, &.{"/bin/false"}, .{}) catch |err| {
        if (err == ProcessError.NotFound) return;
        return err;
    };
    defer result.deinit(testing.allocator);

    try testing.expect(!result.success());
}

test "Process - Process with custom working directory" {
    var manager = ProcessManager.init(testing.allocator);
    defer manager.deinit();

    const process = manager.spawn(&.{"/bin/pwd"}, .{
        .cwd = "/tmp",
        .stdout_behavior = .pipe,
        .stderr_behavior = .ignore,
    }) catch |err| {
        if (err == ProcessError.NotFound) return;
        return err;
    };
    defer {
        _ = process.wait() catch {};
    }

    try testing.expect(process.isRunning());
}

test "Process - ProcessManager tracks processes" {
    var manager = ProcessManager.init(testing.allocator);
    defer manager.deinit();

    try testing.expectEqual(@as(usize, 0), manager.count());

    _ = manager.spawn(&.{"/bin/true"}, .{}) catch |err| {
        if (err == ProcessError.NotFound) return;
        return err;
    };

    try testing.expectEqual(@as(usize, 1), manager.count());
}

test "Process - ProcessManager get process" {
    var manager = ProcessManager.init(testing.allocator);
    defer manager.deinit();

    const proc = manager.spawn(&.{ "/bin/sleep", "60" }, .{
        .stdout_behavior = .ignore,
        .stderr_behavior = .ignore,
    }) catch |err| {
        if (err == ProcessError.NotFound) return;
        return err;
    };

    const retrieved = manager.get(proc.pid);
    try testing.expect(retrieved != null);
    try testing.expectEqual(proc.pid, retrieved.?.pid);
}

test "Process - ProcessManager remove process" {
    var manager = ProcessManager.init(testing.allocator);
    defer manager.deinit();

    const proc = manager.spawn(&.{ "/bin/sleep", "60" }, .{
        .stdout_behavior = .ignore,
        .stderr_behavior = .ignore,
    }) catch |err| {
        if (err == ProcessError.NotFound) return;
        return err;
    };

    manager.remove(proc.pid);
    try testing.expectEqual(@as(usize, 0), manager.count());
}

test "Process - Invalid command returns error" {
    const result = run(testing.allocator, &.{"/bin/nonexistent_command_xyz"}, .{});
    try testing.expectError(ProcessError.NotFound, result);
}

test "Process - Command with arguments" {
    const result = run(testing.allocator, &.{ "/bin/sh", "-c", "echo hello world" }, .{
        .stdout_behavior = .pipe,
        .stderr_behavior = .ignore,
    }) catch |err| {
        if (err == ProcessError.NotFound) return;
        return err;
    };
    defer result.deinit(testing.allocator);

    try testing.expect(result.success());
}

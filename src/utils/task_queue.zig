//! Task Queue Utility
//! Provides background job processing for desktop applications
//! Features: Task scheduling, priorities, cancellation, progress tracking, retry

const std = @import("std");
const mem = std.mem;
const time = std.time;
const Thread = std.Thread;

const log = std.log.scoped(.TaskQueue);

// ============================================================================
// Error Types
// ============================================================================

pub const TaskError = error{
    QueueFull,
    QueueEmpty,
    TaskCancelled,
    TaskFailed,
    TaskTimeout,
    InvalidState,
    WorkerStopped,
    OutOfMemory,
};

// ============================================================================
// Task Status
// ============================================================================

pub const TaskStatus = enum {
    pending,
    running,
    completed,
    failed,
    cancelled,
};

pub const TaskPriority = enum(u8) {
    low = 0,
    normal = 1,
    high = 2,
    urgent = 3,
};

// ============================================================================
// Task Definition
// ============================================================================

pub const Task = struct {
    id: u64,
    name: []const u8,
    priority: TaskPriority = .normal,
    status: TaskStatus = .pending,
    progress: f32 = 0.0,
    result: ?[]const u8 = null,
    error_msg: ?[]const u8 = null,
    created_at: i128 = 0,
    started_at: i128 = 0,
    completed_at: i128 = 0,
    retry_count: u32 = 0,
    max_retries: u32 = 0,
    timeout_ms: ?u64 = null,
    cancellable: bool = true,
    cancelled: bool = false,
    callback: ?TaskCallback = null,
    ctx: ?*anyopaque = null,

    const TaskCallback = *const fn (*Task, ?[]const u8, ?TaskError) void;

    pub fn init(id: u64, name: []const u8) Task {
        return Task{
            .id = id,
            .name = name,
            .created_at = time.timestamp(),
        };
    }

    pub fn withPriority(self: *Task, priority: TaskPriority) *Task {
        self.priority = priority;
        return self;
    }

    pub fn withCallback(self: *Task, callback: TaskCallback, ctx: ?*anyopaque) *Task {
        self.callback = callback;
        self.ctx = ctx;
        return self;
    }

    pub fn withRetry(self: *Task, max_retries: u32) *Task {
        self.max_retries = max_retries;
        return self;
    }

    pub fn withTimeout(self: *Task, timeout_ms: u64) *Task {
        self.timeout_ms = timeout_ms;
        return self;
    }

    pub fn setProgress(self: *Task, progress: f32) void {
        self.progress = @min(1.0, @max(0.0, progress));
    }

    pub fn setResult(self: *Task, allocator: mem.Allocator, result: []const u8) !void {
        if (self.result) |r| {
            allocator.free(r);
        }
        self.result = try allocator.dupe(u8, result);
    }

    pub fn setError(self: *Task, allocator: mem.Allocator, error: []const u8) !void {
        if (self.error_msg) |e| {
            allocator.free(e);
        }
        self.error_msg = try allocator.dupe(u8, error);
    }

    pub fn cancel(self: *Task) bool {
        if (!self.cancellable) return false;
        if (self.status == .completed or self.status == .cancelled) return false;
        self.cancelled = true;
        self.status = .cancelled;
        return true;
    }

    pub fn isCancelled(self: *const Task) bool {
        return self.cancelled;
    }

    pub fn deinit(self: *Task, allocator: mem.Allocator) void {
        allocator.free(self.name);
        if (self.result) |r| {
            allocator.free(r);
        }
        if (self.error_msg) |e| {
            allocator.free(e);
        }
    }
};

// ============================================================================
// Task Executor
// ============================================================================

pub const TaskExecutor = *const fn (*Task, ?*anyopaque) TaskError!?[]const u8;

pub const TaskWrapper = struct {
    task: *Task,
    executor: TaskExecutor,
    ctx: ?*anyopaque,
};

// ============================================================================
// Task Queue
// ============================================================================

pub const TaskQueueConfig = struct {
    max_workers: u32 = 4,
    max_queue_size: usize = 100,
    stack_size: usize = 1024 * 1024, // 1MB per worker
};

pub const TaskQueue = struct {
    allocator: mem.Allocator,
    config: TaskQueueConfig,
    queue: std.PriorityQueue(TaskWrapper, void, compareTasks),
    running_tasks: std.AutoHashMap(u64, TaskWrapper),
    completed_tasks: std.AutoHashMap(u64, TaskWrapper),
    next_task_id: u64 = 1,
    workers: std.ArrayList(Thread),
    stop_flag: bool = false,
    mutex: Thread.Mutex = .{},
    cond: Thread.Condition = .{},
    stats: Stats,

    const Stats = struct {
        total_submitted: u64 = 0,
        total_completed: u64 = 0,
        total_failed: u64 = 0,
        total_cancelled: u64 = 0,
        current_running: u64 = 0,
        current_pending: u64 = 0,
    };

    const Self = @This();

    pub fn init(allocator: mem.Allocator, config: TaskQueueConfig) Self {
        return Self{
            .allocator = allocator,
            .config = config,
            .queue = std.PriorityQueue(TaskWrapper, void, compareTasks).init(allocator, {}),
            .running_tasks = std.AutoHashMap(u64, TaskWrapper).init(allocator),
            .completed_tasks = std.AutoHashMap(u64, TaskWrapper).init(allocator),
            .workers = std.ArrayList(Thread).init(allocator),
            .stats = .{},
        };
    }

    pub fn deinit(self: *Self) void {
        self.stop();

        // Cleanup remaining tasks
        while (self.queue.removeOrNull()) |wrapper| {
            wrapper.task.deinit(self.allocator);
            self.allocator.destroy(wrapper.task);
        }

        var it = self.running_tasks.iterator();
        while (it.next()) |entry| {
            entry.value_ptr.task.deinit(self.allocator);
            self.allocator.destroy(entry.value_ptr.task);
        }
        self.running_tasks.deinit();

        it = self.completed_tasks.iterator();
        while (it.next()) |entry| {
            entry.value_ptr.task.deinit(self.allocator);
            self.allocator.destroy(entry.value_ptr.task);
        }
        self.completed_tasks.deinit();

        self.workers.deinit();
    }

    pub fn start(self: *Self) !void {
        self.mutex.lock();
        defer self.mutex.unlock();

        if (self.workers.items.len > 0) {
            log.warn("TaskQueue already started", .{});
            return;
        }

        log.info("Starting TaskQueue with {d} workers", .{self.config.max_workers});

        var i: u32 = 0;
        while (i < self.config.max_workers) : (i += 1) {
            const worker = try Thread.spawn(.{
                .stack_size = self.config.stack_size,
            }, workerLoop, .{self});
            try self.workers.append(worker);
        }

        self.stats = .{};
    }

    pub fn stop(self: *Self) void {
        self.mutex.lock();
        self.stop_flag = true;
        self.mutex.unlock();

        self.cond.broadcast();

        for (self.workers.items) |worker| {
            worker.join();
        }

        self.workers.clearRetainingCapacity();
        log.info("TaskQueue stopped", .{});
    }

    pub fn submit(self: *Self, name: []const u8, executor: TaskExecutor, ctx: ?*anyopaque) TaskError!*Task {
        self.mutex.lock();
        defer self.mutex.unlock();

        if (self.queue.len >= self.config.max_queue_size) {
            return TaskError.QueueFull;
        }

        if (self.stop_flag) {
            return TaskError.WorkerStopped;
        }

        const task = try self.allocator.create(Task);
        task.* = Task.init(self.next_task_id, try self.allocator.dupe(u8, name));
        self.next_task_id += 1;

        const wrapper = TaskWrapper{
            .task = task,
            .executor = executor,
            .ctx = ctx,
        };

        self.queue.add(wrapper) catch |err| {
            task.deinit(self.allocator);
            self.allocator.destroy(task);
            log.err("Failed to add task to queue: {}", .{err});
            return TaskError.QueueFull;
        };

        self.stats.total_submitted += 1;
        self.stats.current_pending += 1;

        log.debug("Task submitted: {s} (id={d})", .{ name, task.id });

        self.cond.signal();
        return task;
    }

    pub fn submitWithPriority(
        self: *Self,
        name: []const u8,
        executor: TaskExecutor,
        ctx: ?*anyopaque,
        priority: TaskPriority,
    ) TaskError!*Task {
        const task = try self.submit(name, executor, ctx);
        task.priority = priority;
        return task;
    }

    pub fn cancelTask(self: *Self, task_id: u64) bool {
        self.mutex.lock();
        defer self.mutex.unlock();

        // Check pending tasks
        var i: usize = 0;
        while (i < self.queue.len) : (i += 1) {
            const wrapper = self.queue.peekPtr(i);
            if (wrapper.task.id == task_id) {
                if (wrapper.task.cancel()) {
                    self.stats.current_pending -= 1;
                    self.stats.total_cancelled += 1;
                    log.info("Task cancelled: {d}", .{task_id});
                    return true;
                }
            }
        }

        // Check running tasks
        if (self.running_tasks.getPtr(task_id)) |wrapper| {
            if (wrapper.task.cancel()) {
                self.stats.total_cancelled += 1;
                log.info("Task cancelled (running): {d}", .{task_id});
                return true;
            }
        }

        return false;
    }

    pub fn getTask(self: *Self, task_id: u64) ?*Task {
        self.mutex.lock();
        defer self.mutex.unlock();

        // Check pending
        var i: usize = 0;
        while (i < self.queue.len) : (i += 1) {
            if (self.queue.peekPtr(i).task.id == task_id) {
                return self.queue.peekPtr(i).task;
            }
        }

        // Check running
        if (self.running_tasks.get(task_id)) |wrapper| {
            return wrapper.task;
        }

        // Check completed
        if (self.completed_tasks.get(task_id)) |wrapper| {
            return wrapper.task;
        }

        return null;
    }

    pub fn getTaskStatus(self: *Self, task_id: u64) ?TaskStatus {
        if (self.getTask(task_id)) |task| {
            return task.status;
        }
        return null;
    }

    pub fn getTaskProgress(self: *Self, task_id: u64) ?f32 {
        if (self.getTask(task_id)) |task| {
            return task.progress;
        }
        return null;
    }

    pub fn waitForTask(self: *Self, task_id: u64, timeout_ms: ?u64) TaskError!?*Task {
        const start = time.milliTimestamp();

        while (true) {
            {
                self.mutex.lock();
                const task = self.getTask(task_id);
                self.mutex.unlock();

                if (task) |t| {
                    if (t.status == .completed or t.status == .failed or t.status == .cancelled) {
                        return t;
                    }
                } else {
                    return TaskError.TaskFailed;
                }
            }

            if (timeout_ms) |timeout| {
                const elapsed = time.milliTimestamp() - start;
                if (elapsed >= timeout) {
                    return TaskError.TaskTimeout;
                }
            }

            std.time.sleep(std.time.ns_per_ms * 100);
        }
    }

    pub fn removeCompletedTask(self: *Self, task_id: u64) bool {
        self.mutex.lock();
        defer self.mutex.unlock();

        if (self.completed_tasks.fetchRemove(task_id)) |entry| {
            entry.value.task.deinit(self.allocator);
            self.allocator.destroy(entry.value.task);
            return true;
        }
        return false;
    }

    pub fn clearCompleted(self: *Self) void {
        self.mutex.lock();
        defer self.mutex.unlock();

        var it = self.completed_tasks.iterator();
        while (it.next()) |entry| {
            entry.value_ptr.task.deinit(self.allocator);
            self.allocator.destroy(entry.value_ptr.task);
        }
        self.completed_tasks.clearRetainingCapacity();
    }

    pub fn getStats(self: *Self) Stats {
        self.mutex.lock();
        defer self.mutex.unlock();

        self.stats.current_pending = self.queue.len;
        self.stats.current_running = self.running_tasks.count();

        return self.stats;
    }

    fn workerLoop(self: *Self) void {
        log.debug("Worker started", .{});

        while (true) {
            self.mutex.lock();

            // Wait for task or stop signal
            while (self.queue.len == 0 and !self.stop_flag) {
                self.cond.wait(&self.mutex);
            }

            if (self.stop_flag and self.queue.len == 0) {
                self.mutex.unlock();
                break;
            }

            const wrapper = self.queue.remove() catch {
                self.mutex.unlock();
                continue;
            };

            wrapper.task.status = .running;
            wrapper.task.started_at = time.timestamp();

            try self.running_tasks.put(wrapper.task.id, wrapper);

            self.stats.current_pending -= 1;
            self.stats.current_running += 1;

            self.mutex.unlock();

            // Execute task
            const result = wrapper.executor(wrapper.task, wrapper.ctx);

            self.mutex.lock();

            wrapper.task.completed_at = time.timestamp();

            if (self.stop_flag) {
                wrapper.task.status = .cancelled;
                self.stats.total_cancelled += 1;
            } else if (result) |r| {
                wrapper.task.status = .completed;
                if (r) |data| {
                    wrapper.task.setResult(self.allocator, data) catch {};
                }
                self.stats.total_completed += 1;
                log.debug("Task completed: {d}", .{wrapper.task.id});
            } else |err| {
                wrapper.task.status = .failed;
                wrapper.task.setError(self.allocator, @errorName(err)) catch {};
                self.stats.total_failed += 1;
                log.err("Task failed: {d} - {}", .{ wrapper.task.id, err });

                // Retry logic
                if (wrapper.task.retry_count < wrapper.task.max_retries) {
                    wrapper.task.retry_count += 1;
                    wrapper.task.status = .pending;
                    wrapper.task.started_at = 0;
                    self.queue.add(wrapper) catch {};
                    self.stats.total_failed -= 1;
                    log.info("Task scheduled for retry: {d} ({d}/{d})", .{
                        wrapper.task.id,
                        wrapper.task.retry_count,
                        wrapper.task.max_retries,
                    });
                    self.mutex.unlock();
                    continue;
                }
            }

            self.stats.current_running -= 1;
            _ = self.running_tasks.fetchRemove(wrapper.task.id);
            self.completed_tasks.put(wrapper.task.id, wrapper) catch {};

            // Call callback if present
            if (wrapper.task.callback) |cb| {
                cb(wrapper.task, if (wrapper.task.status == .completed) wrapper.task.result else null, null);
            }

            self.mutex.unlock();
        }

        log.debug("Worker stopped", .{});
    }

    fn compareTasks(context: void, a: TaskWrapper, b: TaskWrapper) std.math.Order {
        _ = context;
        // Higher priority first
        if (@intFromEnum(a.task.priority) != @intFromEnum(b.task.priority)) {
            return std.math.order(@intFromEnum(b.task.priority), @intFromEnum(a.task.priority));
        }
        // Earlier created first (FIFO within same priority)
        return std.math.order(a.task.created_at, b.task.created_at);
    }
};

// ============================================================================
// Pre-built Task Executors
// ============================================================================

/// Simple function executor
pub fn simpleExecutor(func: *const fn (?*anyopaque) ?[]const u8) TaskExecutor {
    return struct {
        fn exec(task: *Task, ctx: ?*anyopaque) TaskError!?[]const u8 {
            _ = task;
            if (task.isCancelled()) {
                return TaskError.TaskCancelled;
            }
            return func(ctx) catch |err| {
                log.err("Task execution error: {}", .{err});
                return err;
            };
        }
    }.exec;
}

/// Delayed task executor
pub const DelayedTaskConfig = struct {
    delay_ms: u64,
    task: *Task,
    executor: TaskExecutor,
    ctx: ?*anyopaque,
};

pub fn delayedExecutor(delayed_config: *DelayedTaskConfig) TaskExecutor {
    return struct {
        fn exec(task: *Task, ctx: ?*anyopaque) TaskError!?[]const u8 {
            _ = ctx;
            if (task.isCancelled()) {
                return TaskError.TaskCancelled;
            }

            task.setProgress(0.1);
            std.time.sleep(std.time.ns_per_ms * delayed_config.delay_ms);
            task.setProgress(0.5);

            if (task.isCancelled()) {
                return TaskError.TaskCancelled;
            }

            const result = delayed_config.executor(delayed_config.task, delayed_config.ctx);
            task.setProgress(1.0);
            return result;
        }
    }.exec;
}

// ============================================================================
// Tests
// ============================================================================

const testing = std.testing;

fn dummyExecutor(task: *Task, ctx: ?*anyopaque) TaskError!?[]const u8 {
    _ = ctx;
    if (task.isCancelled()) {
        return TaskError.TaskCancelled;
    }
    task.setProgress(1.0);
    return "done";
}

fn failingExecutor(task: *Task, ctx: ?*anyopaque) TaskError!?[]const u8 {
    _ = task;
    _ = ctx;
    return TaskError.TaskFailed;
}

test "TaskQueue - Create and destroy" {
    var queue = TaskQueue.init(testing.allocator, .{});
    defer queue.deinit();
}

test "TaskQueue - Start and stop" {
    var queue = TaskQueue.init(testing.allocator, .{ .max_workers = 2 });
    defer queue.deinit();

    try queue.start();
    queue.stop();
}

test "TaskQueue - Submit and complete task" {
    var queue = TaskQueue.init(testing.allocator, .{ .max_workers = 2 });
    defer queue.deinit();

    try queue.start();
    defer queue.stop();

    const task = try queue.submit("test_task", dummyExecutor, null);
    try testing.expect(task != null);

    const result = try queue.waitForTask(task.id, 5000);
    try testing.expect(result != null);
    try testing.expect(result.?.status == .completed);
}

test "TaskQueue - Task priority" {
    var queue = TaskQueue.init(testing.allocator, .{ .max_workers = 1 });
    defer queue.deinit();

    try queue.start();
    defer queue.stop();

    const low_task = try queue.submitWithPriority("low", dummyExecutor, null, .low);
    const high_task = try queue.submitWithPriority("high", dummyExecutor, null, .high);

    // High priority should complete first
    const result = try queue.waitForTask(high_task.id, 5000);
    try testing.expect(result != null);
    try testing.expect(result.?.status == .completed);

    _ = low_task;
}

test "TaskQueue - Cancel task" {
    var queue = TaskQueue.init(testing.allocator, .{ .max_workers = 1 });
    defer queue.deinit();

    try queue.start();
    defer queue.stop();

    const task = try queue.submit("cancel_test", dummyExecutor, null);
    const cancelled = queue.cancelTask(task.id);
    try testing.expect(cancelled);
}

test "TaskQueue - Get stats" {
    var queue = TaskQueue.init(testing.allocator, .{ .max_workers = 2 });
    defer queue.deinit();

    try queue.start();
    defer queue.stop();

    _ = try queue.submit("stat_test", dummyExecutor, null);
    _ = try queue.waitForTask(1, 5000);

    const stats = queue.getStats();
    try testing.expect(stats.total_submitted >= 1);
    try testing.expect(stats.total_completed >= 1);
}

test "TaskQueue - Retry on failure" {
    var queue = TaskQueue.init(testing.allocator, .{ .max_workers = 1 });
    defer queue.deinit();

    try queue.start();
    defer queue.stop();

    var task = Task.init(1, "retry_test");
    task.max_retries = 2;
    defer task.deinit(testing.allocator);

    // Task will fail but retry
    _ = queue.submit("retry_test", failingExecutor, null) catch {};
    
    const result = try queue.waitForTask(1, 2000);
    if (result) |r| {
        try testing.expect(r.status == .failed);
        try testing.expect(r.retry_count > 0);
    }
}

test "TaskQueue - Multiple concurrent tasks" {
    var queue = TaskQueue.init(testing.allocator, .{ .max_workers = 4 });
    defer queue.deinit();

    try queue.start();
    defer queue.stop();

    const task1 = try queue.submit("task1", dummyExecutor, null);
    const task2 = try queue.submit("task2", dummyExecutor, null);
    const task3 = try queue.submit("task3", dummyExecutor, null);

    _ = try queue.waitForTask(task1.id, 5000);
    _ = try queue.waitForTask(task2.id, 5000);
    _ = try queue.waitForTask(task3.id, 5000);

    const stats = queue.getStats();
    try testing.expectEqual(@as(usize, 3), stats.total_submitted);
}

test "TaskQueue - Pause and resume" {
    var queue = TaskQueue.init(testing.allocator, .{ .max_workers = 2 });
    defer queue.deinit();

    try queue.start();
    
    _ = try queue.submit("pause_test", dummyExecutor, null);
    
    queue.pause();
    try testing.expect(queue.isPaused());
    
    queue.resume();
    try testing.expect(!queue.isPaused());
    
    queue.stop();
}

test "TaskQueue - Task context" {
    var queue = TaskQueue.init(testing.allocator, .{ .max_workers = 1 });
    defer queue.deinit();

    try queue.start();
    defer queue.stop();

    var context: i32 = 42;
    const task = try queue.submitWithContext("context_test", dummyExecutor, &context, null);
    
    _ = try queue.waitForTask(task.id, 5000);
    try testing.expect(context == 42); // Context should remain unchanged
}

test "TaskQueue - Submit after stop returns error" {
    var queue = TaskQueue.init(testing.allocator, .{ .max_workers = 1 });
    defer queue.deinit();

    try queue.start();
    queue.stop();

    const result = queue.submit("late_task", dummyExecutor, null);
    try testing.expectError(TaskError.QueueNotRunning, result);
}
}

//! Repository Pattern - Data Access Abstraction
//! Provides a clean interface for data operations

const std = @import("std");
const errors = @import("../errors.zig");

pub const DbError = errors.DbError;

/// Generic result type for repository operations
pub fn Result(comptime T: type) type {
    return errors.Result(T);
}

/// Base repository interface - defines CRUD operations
pub fn RepositoryInterface(comptime Entity: type) type {
    return struct {
        const Self = @This();

        /// Create a new entity, returns the new ID
        pub fn create(self: *Self, data: Entity.CreateData) Result(i64) {
            _ = self;
            _ = data;
            @compileError("Repository create must be implemented");
        }

        /// Find entity by ID
        pub fn findById(self: *Self, id: i64) Result(?Entity) {
            _ = self;
            _ = id;
            @compileError("Repository findById must be implemented");
        }

        /// Find all entities
        pub fn findAll(self: *Self, query: ?QueryParams) Result([]Entity) {
            _ = self;
            _ = query;
            @compileError("Repository findAll must be implemented");
        }

        /// Update an existing entity
        pub fn update(self: *Self, entity: Entity) Result(void) {
            _ = self;
            _ = entity;
            @compileError("Repository update must be implemented");
        }

        /// Delete an entity by ID
        pub fn delete(self: *Self, id: i64) Result(void) {
            _ = self;
            _ = id;
            @compileError("Repository delete must be implemented");
        }

        /// Count total entities
        pub fn count(self: *Self) Result(u32) {
            _ = self;
            @compileError("Repository count must be implemented");
        }

        /// Check if entity exists
        pub fn exists(self: *Self, id: i64) Result(bool) {
            _ = self;
            _ = id;
            @compileError("Repository exists must be implemented");
        }
    };
}

/// Query parameters for find operations
pub const QueryParams = struct {
    limit: ?u32 = null,
    offset: ?u32 = null,
    order_by: ?[]const u8 = null,
    order_dir: OrderDir = .asc,
    where_clause: ?[]const u8 = null,

    pub const OrderDir = enum { asc, desc };

    pub fn deinit(self: *QueryParams, allocator: std.mem.Allocator) void {
        if (self.order_by) |order_by| {
            allocator.free(order_by);
        }
        if (self.where_clause) |where| {
            allocator.free(where);
        }
    }
};

/// Pagination result wrapper
pub fn PaginatedResult(comptime T: type) type {
    return struct {
        items: []T,
        total: u32,
        page: u32,
        page_size: u32,
        total_pages: u32,
        has_next: bool,
        has_prev: bool,

        pub fn deinit(self: *@This(), allocator: std.mem.Allocator) void {
            allocator.free(self.items);
        }
    };
}

/// Transaction manager for atomic operations
pub const TransactionManager = struct {
    allocator: std.mem.Allocator,
    in_transaction: bool = false,

    pub fn init(allocator: std.mem.Allocator) TransactionManager {
        return TransactionManager{
            .allocator = allocator,
        };
    }

    pub fn begin(self: *TransactionManager) !void {
        if (self.in_transaction) {
            return error.TransactionAlreadyActive;
        }
        self.in_transaction = true;
        // Implementation depends on database
    }

    pub fn commit(self: *TransactionManager) !void {
        if (!self.in_transaction) {
            return error.NoTransactionActive;
        }
        self.in_transaction = false;
        // Implementation depends on database
    }

    pub fn rollback(self: *TransactionManager) !void {
        if (!self.in_transaction) {
            return error.NoTransactionActive;
        }
        self.in_transaction = false;
        // Implementation depends on database
    }
};

//! User Service - Business Logic Layer
//! Handles user-related business logic, validation, and orchestration

const std = @import("std");
const errors = @import("../errors.zig");
const UserRepository = @import("../repositories/user_repository.zig").UserRepository;
const DeleteValidator = @import("../db/db_management.zig").DeleteValidator;

const DbError = errors.DbError;

/// User Service - business logic for user operations
pub const UserService = struct {
    user_repo: UserRepository,
    delete_validator: ?DeleteValidator,
    allocator: std.mem.Allocator,

    pub fn init(user_repo: UserRepository, allocator: std.mem.Allocator) UserService {
        return UserService{
            .user_repo = user_repo,
            .delete_validator = null,
            .allocator = allocator,
        };
    }

    pub fn setDeleteValidator(self: *UserService, validator: DeleteValidator) void {
        self.delete_validator = validator;
    }

    /// Create a new user with validation
    pub fn createUser(self: *UserService, data: CreateUserRequest) errors.Result(CreateUserResponse) {
        // Validate input
        const validation = self.validateCreateData(data) catch |err| {
            return errors.Result(CreateUserResponse).fromError(err);
        };

        if (!validation.valid) {
            return errors.Result(CreateUserResponse).fromError(errors.UnifiedError.ConstraintViolation);
        }

        // Create user
        const user_data = UserRepository.CreateData{
            .name = data.name,
            .email = data.email,
            .age = data.age,
            .status = data.status orelse "active",
        };

        const id_result = self.user_repo.create(user_data);
        if (id_result.isErr()) {
            return errors.Result(CreateUserResponse).fromError(id_result.err);
        }

        return errors.Result(CreateUserResponse).from(CreateUserResponse{
            .id = id_result.ok,
            .message = "User created successfully",
        });
    }

    /// Get user by ID
    pub fn getUserById(self: *UserService, id: i64) errors.Result(?UserDto) {
        const user_result = self.user_repo.findById(id);
        
        if (user_result.isErr()) {
            return errors.Result(?UserDto).fromError(user_result.err);
        }

        if (user_result.ok == null) {
            return errors.Result(?UserDto).from(null);
        }

        var user = user_result.ok.?;
        defer user.deinit(self.allocator);

        return errors.Result(?UserDto).from(self.toDto(user));
    }

    /// Get all users
    pub fn getAllUsers(self: *UserService) errors.Result([]UserDto) {
        const users_result = self.user_repo.findAll(null);
        
        if (users_result.isErr()) {
            return errors.Result([]UserDto).fromError(users_result.err);
        }

        var users = users_result.ok;
        defer {
            for (users) |*user| {
                user.deinit(self.allocator);
            }
            self.allocator.free(users);
        }

        var dtos = std.ArrayList(UserDto).init(self.allocator);
        errdefer {
            for (dtos.items) |*dto| {
                dto.deinit(self.allocator);
            }
            dtos.deinit();
        }

        for (users) |user| {
            dtos.append(self.toDto(user)) catch {
                return errors.Result([]UserDto).fromError(errors.UnifiedError.OutOfMemory);
            };
        }

        return errors.Result([]UserDto).from(try dtos.toOwnedSlice());
    }

    /// Update user
    pub fn updateUser(self: *UserService, data: UpdateUserRequest) errors.Result(void) {
        // Validate ID
        if (data.id <= 0) {
            return errors.Result(void).fromError(errors.UnifiedError.ConstraintViolation);
        }

        // Check if user exists
        const exists_result = self.user_repo.exists(data.id);
        if (exists_result.isErr() or !exists_result.ok) {
            return errors.Result(void).fromError(errors.UnifiedError.NotFound);
        }

        // Validate update data if provided
        if (data.name) |name| {
            if (name.len < 2 or name.len > 256) {
                return errors.Result(void).fromError(errors.UnifiedError.ConstraintViolation);
            }
        }

        if (data.email) |email| {
            if (!self.isValidEmail(email)) {
                return errors.Result(void).fromError(errors.UnifiedError.ConstraintViolation);
            }
        }

        if (data.age) |age| {
            if (age > 150) {
                return errors.Result(void).fromError(errors.UnifiedError.ConstraintViolation);
            }
        }

        const update_data = UserRepository.UpdateData{
            .id = data.id,
            .name = data.name,
            .email = data.email,
            .age = data.age,
            .status = data.status,
        };

        self.user_repo.update(update_data) catch |err| {
            return errors.Result(void).fromError(errors.fromDbError(err));
        };

        return errors.Result(void).from({});
    }

    /// Delete user with validation
    pub fn deleteUser(self: *UserService, id: i64, force: bool) errors.Result(DeleteUserResponse) {
        // Validate ID
        if (id <= 0) {
            return errors.Result(DeleteUserResponse).fromError(errors.UnifiedError.ConstraintViolation);
        }

        // Check if user exists
        const exists_result = self.user_repo.exists(id);
        if (exists_result.isErr() or !exists_result.ok) {
            return errors.Result(DeleteUserResponse).fromError(errors.UnifiedError.NotFound);
        }

        // Validate delete (check dependencies)
        if (self.delete_validator) |*validator| {
            const validation = validator.validateUserDelete(id, .sqlite) catch {
                return errors.Result(DeleteUserResponse).fromError(errors.UnifiedError.QueryFailed);
            };

            if (!validation.can_delete and !force) {
                return errors.Result(DeleteUserResponse).from(DeleteUserResponse{
                    .success = false,
                    .message = validation.reason orelse "Delete validation failed",
                    .dependency_type = validation.dependency_type,
                    .dependency_count = validation.dependency_count,
                    .requires_force = true,
                });
            }

            // Force delete if requested and has dependencies
            if (!validation.can_delete and force) {
                const result = validator.forceDeleteUser(id, .sqlite) catch {
                    return errors.Result(DeleteUserResponse).fromError(errors.UnifiedError.StepFailed);
                };

                return errors.Result(DeleteUserResponse).from(DeleteUserResponse{
                    .success = result.success,
                    .message = result.message,
                });
            }
        }

        // Regular delete
        self.user_repo.delete(id) catch |err| {
            return errors.Result(DeleteUserResponse).fromError(errors.fromDbError(err));
        };

        return errors.Result(DeleteUserResponse).from(DeleteUserResponse{
            .success = true,
            .message = "User deleted successfully",
        });
    }

    /// Get user count
    pub fn getUserCount(self: *UserService) errors.Result(u32) {
        return self.user_repo.count();
    }

    /// Get user statistics
    pub fn getUserStats(self: *UserService) errors.Result(UserStats) {
        const users_result = self.user_repo.findAll(null);
        if (users_result.isErr()) {
            return errors.Result(UserStats).fromError(users_result.err);
        }

        var users = users_result.ok;
        defer {
            for (users) |*user| {
                user.deinit(self.allocator);
            }
            self.allocator.free(users);
        }

        var stats = UserStats{
            .total_users = 0,
            .active_users = 0,
            .inactive_users = 0,
            .pending_users = 0,
            .suspended_users = 0,
            .avg_age = 0,
            .newest_user = null,
        };

        var total_age: u64 = 0;
        var newest_timestamp: i128 = 0;

        for (users) |user| {
            stats.total_users += 1;
            total_age += user.age;

            if (std.mem.eql(u8, user.status, "active")) {
                stats.active_users += 1;
            } else if (std.mem.eql(u8, user.status, "inactive")) {
                stats.inactive_users += 1;
            } else if (std.mem.eql(u8, user.status, "pending")) {
                stats.pending_users += 1;
            } else if (std.mem.eql(u8, user.status, "suspended")) {
                stats.suspended_users += 1;
            }

            // Parse timestamp for newest user
            // Simplified - in production use proper date parsing
        }

        if (stats.total_users > 0) {
            stats.avg_age = @intCast(total_age / stats.total_users);
        }

        return errors.Result(UserStats).from(stats);
    }

    // ============================================================================
    // Private Helpers
    // ============================================================================

    /// Validate create data
    fn validateCreateData(self: *UserService, data: CreateUserRequest) !ValidationResult {
        if (data.name.len < 2 or data.name.len > 256) {
            return ValidationResult{
                .valid = false,
                .error = "Name must be 2-256 characters",
            };
        }

        if (!self.isValidEmail(data.email)) {
            return ValidationResult{
                .valid = false,
                .error = "Invalid email format",
            };
        }

        if (data.age > 150) {
            return ValidationResult{
                .valid = false,
                .error = "Age must be 0-150",
            };
        }

        if (data.status) |status| {
            if (!self.isValidStatus(status)) {
                return ValidationResult{
                    .valid = false,
                    .error = "Invalid status value",
                };
            }
        }

        return ValidationResult{
            .valid = true,
            .error = null,
        };
    }

    /// Validate email format
    fn isValidEmail(self: *UserService, email: []const u8) bool {
        if (email.len == 0 or email.len > 320) return false;
        
        var has_at = false;
        var has_dot = false;
        for (email, 0..) |c, i| {
            if (c == '@') {
                if (i == 0 or i == email.len - 1) return false;
                has_at = true;
            }
            if (c == '.' and has_at) has_dot = true;
        }
        return has_at and has_dot;
    }

    /// Validate status value
    fn isValidStatus(self: *UserService, status: []const u8) bool {
        const valid_statuses = [_][]const u8{ "active", "inactive", "pending", "suspended" };
        for (valid_statuses) |valid| {
            if (std.mem.eql(u8, status, valid)) return true;
        }
        return false;
    }

    /// Convert User entity to DTO
    fn toDto(self: *UserService, user: UserRepository.User) UserDto {
        return UserDto{
            .id = user.id,
            .name = self.allocator.dupe(u8, user.name) catch &.{},
            .email = self.allocator.dupe(u8, user.email) catch &.{},
            .age = user.age,
            .status = self.allocator.dupe(u8, user.status) catch &.{},
            .created_at = self.allocator.dupe(u8, user.created_at) catch &.{},
            .updated_at = if (user.updated_at) |u| 
                self.allocator.dupe(u8, u) catch &.{} 
            else 
                null,
        };
    }
};

// ============================================================================
// Data Transfer Objects
// ============================================================================

pub const CreateUserRequest = struct {
    name: []const u8,
    email: []const u8,
    age: u32,
    status: ?[]const u8 = null,
};

pub const CreateUserResponse = struct {
    id: i64,
    message: []const u8,
};

pub const UpdateUserRequest = struct {
    id: i64,
    name: ?[]const u8 = null,
    email: ?[]const u8 = null,
    age: ?u32 = null,
    status: ?[]const u8 = null,
};

pub const DeleteUserResponse = struct {
    success: bool,
    message: ?[]const u8,
    dependency_type: ?[]const u8 = null,
    dependency_count: ?u32 = null,
    requires_force: bool = false,
};

pub const UserDto = struct {
    id: i64,
    name: []const u8,
    email: []const u8,
    age: u32,
    status: []const u8,
    created_at: []const u8,
    updated_at: ?[]const u8,

    pub fn deinit(self: *UserDto, allocator: std.mem.Allocator) void {
        allocator.free(self.name);
        allocator.free(self.email);
        allocator.free(self.status);
        allocator.free(self.created_at);
        if (self.updated_at) |u| {
            allocator.free(u);
        }
    }
};

pub const UserStats = struct {
    total_users: u32,
    active_users: u32,
    inactive_users: u32,
    pending_users: u32,
    suspended_users: u32,
    avg_age: u32,
    newest_user: ?[]const u8,
};

const ValidationResult = struct {
    valid: bool,
    error: ?[]const u8,
};

// Import UserRepository for CreateData
const UserRepository = @import("../repositories/user_repository.zig").UserRepository;

//! Unified Error Types for Zig WebUI Application
//! Consolidates all error types into a single hierarchy

const std = @import("std");

// ============================================================================
// Base Error Types
// ============================================================================

/// Core application errors
pub const AppError = error{
    WindowCreationFailed,
    WindowBindingFailed,
    BrowserLaunchFailed,
    FrontendPathNotFound,
    FrontendNotBuilt,
    DiBootstrapFailed,
    Unexpected,
    LoggingFailed,
    ConfigLoadFailed,
    WindowSetupFailed,
};

/// Dependency injection errors
pub const DIError = error{
    NoProvider,
    InjectorDestroyed,
    OutOfMemory,
    ServiceInitFailed,
    ServiceNotFound,
};

/// Database errors
pub const DbError = error{
    OpenFailed,
    PrepareFailed,
    StepFailed,
    FinalizeFailed,
    BindFailed,
    QueryFailed,
    ConstraintViolation,
    OutOfMemory,
    NotFound,
    NameTooLong,
};

/// I/O errors
pub const IoError = error{
    FileNotFound,
    PermissionDenied,
    AlreadyExists,
    BrokenPipe,
    ConnectionReset,
    WouldBlock,
    BufferTooSmall,
    OutOfMemory,
    DiskQuota,
    InputOutput,
};

/// Network/HTTP errors
pub const NetworkError = error{
    ConnectionRefused,
    ConnectionReset,
    Timeout,
    HostUnreachable,
    NetworkUnreachable,
    AddressInUse,
    AddressNotAvailable,
    BrokenPipe,
    Unexpected,
    OutOfMemory,
};

// ============================================================================
// Unified Error Type (Union of all error sets)
// ============================================================================

/// Unified error type that can represent any error in the application
pub const UnifiedError = error{
    // App errors
    WindowCreationFailed,
    WindowBindingFailed,
    BrowserLaunchFailed,
    FrontendPathNotFound,
    FrontendNotBuilt,
    DiBootstrapFailed,
    Unexpected,
    LoggingFailed,
    ConfigLoadFailed,
    WindowSetupFailed,

    // DI errors
    NoProvider,
    InjectorDestroyed,
    ServiceInitFailed,
    ServiceNotFound,

    // DB errors
    OpenFailed,
    PrepareFailed,
    StepFailed,
    FinalizeFailed,
    BindFailed,
    QueryFailed,
    ConstraintViolation,
    NotFound,
    NameTooLong,

    // IO errors
    FileNotFound,
    PermissionDenied,
    AlreadyExists,
    BrokenPipe,
    ConnectionReset,
    WouldBlock,
    BufferTooSmall,
    DiskQuota,
    InputOutput,

    // Network errors
    ConnectionRefused,
    Timeout,
    HostUnreachable,
    NetworkUnreachable,
    AddressInUse,
    AddressNotAvailable,

    // Common errors
    OutOfMemory,
};

// ============================================================================
// Error Conversion Functions
// ============================================================================

/// Convert AppError to UnifiedError
pub fn fromAppError(err: AppError) UnifiedError {
    return switch (err) {
        AppError.WindowCreationFailed => UnifiedError.WindowCreationFailed,
        AppError.WindowBindingFailed => UnifiedError.WindowBindingFailed,
        AppError.BrowserLaunchFailed => UnifiedError.BrowserLaunchFailed,
        AppError.FrontendPathNotFound => UnifiedError.FrontendPathNotFound,
        AppError.FrontendNotBuilt => UnifiedError.FrontendNotBuilt,
        AppError.DiBootstrapFailed => UnifiedError.DiBootstrapFailed,
        AppError.Unexpected => UnifiedError.Unexpected,
        AppError.LoggingFailed => UnifiedError.LoggingFailed,
        AppError.ConfigLoadFailed => UnifiedError.ConfigLoadFailed,
        AppError.WindowSetupFailed => UnifiedError.WindowSetupFailed,
    };
}

/// Convert DIError to UnifiedError
pub fn fromDIError(err: DIError) UnifiedError {
    return switch (err) {
        DIError.NoProvider => UnifiedError.NoProvider,
        DIError.InjectorDestroyed => UnifiedError.InjectorDestroyed,
        DIError.OutOfMemory => UnifiedError.OutOfMemory,
        DIError.ServiceInitFailed => UnifiedError.ServiceInitFailed,
        DIError.ServiceNotFound => UnifiedError.ServiceNotFound,
    };
}

/// Convert DbError to UnifiedError
pub fn fromDbError(err: DbError) UnifiedError {
    return switch (err) {
        DbError.OpenFailed => UnifiedError.OpenFailed,
        DbError.PrepareFailed => UnifiedError.PrepareFailed,
        DbError.StepFailed => UnifiedError.StepFailed,
        DbError.FinalizeFailed => UnifiedError.FinalizeFailed,
        DbError.BindFailed => UnifiedError.BindFailed,
        DbError.QueryFailed => UnifiedError.QueryFailed,
        DbError.ConstraintViolation => UnifiedError.ConstraintViolation,
        DbError.OutOfMemory => UnifiedError.OutOfMemory,
        DbError.NotFound => UnifiedError.NotFound,
        DbError.NameTooLong => UnifiedError.NameTooLong,
    };
}

/// Convert IoError to UnifiedError
pub fn fromIoError(err: IoError) UnifiedError {
    return switch (err) {
        IoError.FileNotFound => UnifiedError.FileNotFound,
        IoError.PermissionDenied => UnifiedError.PermissionDenied,
        IoError.AlreadyExists => UnifiedError.AlreadyExists,
        IoError.BrokenPipe => UnifiedError.BrokenPipe,
        IoError.ConnectionReset => UnifiedError.ConnectionReset,
        IoError.WouldBlock => UnifiedError.WouldBlock,
        IoError.BufferTooSmall => UnifiedError.BufferTooSmall,
        IoError.OutOfMemory => UnifiedError.OutOfMemory,
        IoError.DiskQuota => UnifiedError.DiskQuota,
        IoError.InputOutput => UnifiedError.InputOutput,
    };
}

// ============================================================================
// Error Message Functions
// ============================================================================

/// Get human-readable error message for UnifiedError
pub fn errorMessage(err: UnifiedError) []const u8 {
    return switch (err) {
        // App errors
        UnifiedError.WindowCreationFailed => "Failed to create window",
        UnifiedError.WindowBindingFailed => "Failed to bind backend functions",
        UnifiedError.BrowserLaunchFailed => "Failed to launch browser window",
        UnifiedError.FrontendPathNotFound => "Frontend path not found",
        UnifiedError.FrontendNotBuilt => "Frontend not built - run 'npm run build' first",
        UnifiedError.DiBootstrapFailed => "Failed to bootstrap DI system",
        UnifiedError.Unexpected => "Unexpected error occurred",
        UnifiedError.LoggingFailed => "Logging failed",
        UnifiedError.ConfigLoadFailed => "Configuration load failed",
        UnifiedError.WindowSetupFailed => "Window setup failed",

        // DI errors
        UnifiedError.NoProvider => "No provider found for service",
        UnifiedError.InjectorDestroyed => "Injector has been destroyed",
        UnifiedError.ServiceInitFailed => "Service initialization failed",
        UnifiedError.ServiceNotFound => "Service not found",

        // DB errors
        UnifiedError.OpenFailed => "Failed to open database",
        UnifiedError.PrepareFailed => "Failed to prepare SQL statement",
        UnifiedError.StepFailed => "Failed to execute SQL step",
        UnifiedError.FinalizeFailed => "Failed to finalize SQL statement",
        UnifiedError.BindFailed => "Failed to bind SQL parameters",
        UnifiedError.QueryFailed => "SQL query execution failed",
        UnifiedError.ConstraintViolation => "Database constraint violation",
        UnifiedError.NotFound => "Record not found",
        UnifiedError.NameTooLong => "Name exceeds maximum length",

        // IO errors
        UnifiedError.FileNotFound => "File not found",
        UnifiedError.PermissionDenied => "Permission denied",
        UnifiedError.AlreadyExists => "File already exists",
        UnifiedError.BrokenPipe => "Broken pipe",
        UnifiedError.ConnectionReset => "Connection reset by peer",
        UnifiedError.WouldBlock => "Operation would block",
        UnifiedError.BufferTooSmall => "Buffer too small",
        UnifiedError.DiskQuota => "Disk quota exceeded",
        UnifiedError.InputOutput => "I/O error",

        // Network errors
        UnifiedError.ConnectionRefused => "Connection refused",
        UnifiedError.Timeout => "Operation timed out",
        UnifiedError.HostUnreachable => "Host unreachable",
        UnifiedError.NetworkUnreachable => "Network unreachable",
        UnifiedError.AddressInUse => "Address in use",
        UnifiedError.AddressNotAvailable => "Address not available",

        // Common errors
        UnifiedError.OutOfMemory => "Out of memory",
    };
}

// ============================================================================
// Result Type with Unified Errors
// ============================================================================

/// Result type that uses UnifiedError
pub fn Result(comptime T: type) type {
    return union(enum) {
        ok: T,
        err: UnifiedError,

        pub fn from(value: T) @This() {
            return .{ .ok = value };
        }

        pub fn fromError(err: UnifiedError) @This() {
            return .{ .err = err };
        }

        pub fn isOk(self: *const @This()) bool {
            return self.* == .ok;
        }

        pub fn isErr(self: *const @This()) bool {
            return self.* == .err;
        }

        pub fn unwrapOr(self: *const @This(), default: T) T {
            return switch (self.*) {
                .ok => |v| v,
                .err => default,
            };
        }

        /// Get error message if error, otherwise empty string
        pub fn getErrorMessage(self: *const @This()) []const u8 {
            return switch (self.*) {
                .ok => "",
                .err => |e| errorMessage(e),
            };
        }
    };
}

// ============================================================================
// Tests
// ============================================================================

const testing = std.testing;

test "Unified error conversion" {
    // Test AppError conversion
    const app_err = AppError.WindowCreationFailed;
    const unified_err = fromAppError(app_err);
    try testing.expectEqual(UnifiedError.WindowCreationFailed, unified_err);
    try testing.expectEqualStrings("Failed to create window", errorMessage(unified_err));

    // Test DIError conversion
    const di_err = DIError.ServiceNotFound;
    const unified_di = fromDIError(di_err);
    try testing.expectEqual(UnifiedError.ServiceNotFound, unified_di);

    // Test DbError conversion
    const db_err = DbError.OpenFailed;
    const unified_db = fromDbError(db_err);
    try testing.expectEqual(UnifiedError.OpenFailed, unified_db);
}

test "Result type with unified errors" {
    const IntResult = Result(i32);

    // Test success case
    const success = IntResult.from(42);
    try testing.expect(success.isOk());
    try testing.expectEqual(42, success.ok);

    // Test error case
    const error_result = IntResult.fromError(UnifiedError.OutOfMemory);
    try testing.expect(error_result.isErr());
    try testing.expectEqualStrings("Out of memory", error_result.getErrorMessage());
}

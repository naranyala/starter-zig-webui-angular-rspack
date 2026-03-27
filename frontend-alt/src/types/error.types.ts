// frontend/src/types/error.types.ts
// "Errors as Values" pattern for TypeScript frontend
// Structured error types that mirror the Rust backend error model

/**
 * Error codes matching the Rust backend ErrorCode enum
 * These codes enable programmatic error handling across the frontend-backend boundary
 */
export enum ErrorCode {
  // Database errors (1000-1999)
  DbConnectionFailed = 'DB_CONNECTION_FAILED',
  DbQueryFailed = 'DB_QUERY_FAILED',
  DbConstraintViolation = 'DB_CONSTRAINT_VIOLATION',
  DbNotFound = 'DB_NOT_FOUND',
  DbAlreadyExists = 'DB_ALREADY_EXISTS',

  // Configuration errors (2000-2999)
  ConfigNotFound = 'CONFIG_NOT_FOUND',
  ConfigInvalid = 'CONFIG_INVALID',
  ConfigMissingField = 'CONFIG_MISSING_FIELD',

  // Serialization errors (3000-3999)
  SerializationFailed = 'SERIALIZATION_FAILED',
  DeserializationFailed = 'DESERIALIZATION_FAILED',
  InvalidFormat = 'INVALID_FORMAT',

  // Validation errors (4000-4999)
  ValidationFailed = 'VALIDATION_FAILED',
  MissingRequiredField = 'MISSING_REQUIRED_FIELD',
  InvalidFieldValue = 'INVALID_FIELD_VALUE',

  // Not found errors (5000-5999)
  ResourceNotFound = 'RESOURCE_NOT_FOUND',
  UserNotFound = 'USER_NOT_FOUND',
  EntityNotFound = 'ENTITY_NOT_FOUND',

  // System errors (6000-6999)
  LockPoisoned = 'LOCK_POISONED',
  InternalError = 'INTERNAL_ERROR',

  // Plugin errors (7000-7999)
  Plugin = 'PLUGIN',

  // Custom/unknown
  Unknown = 'UNKNOWN',
}

/**
 * Structured error value matching Rust ErrorValue
 * This is the base error type that flows through the application
 */
export interface ErrorValue {
  /** Machine-readable error code */
  code: ErrorCode;
  /** Human-readable message */
  message: string;
  /** Optional detailed technical information */
  details?: string;
  /** Optional field that caused the error (for validation errors) */
  field?: string;
  /** Optional underlying cause (for error chains) */
  cause?: string;
  /** Optional context key-value pairs */
  context?: Record<string, string>;
}

/**
 * API response envelope for backend errors
 * Matches the Rust to_response() output
 */
export interface ErrorResponse {
  success: false;
  data: null;
  error: ErrorValue;
}

/**
 * API response envelope for success
 */
export interface SuccessResponse<T> {
  success: true;
  data: T;
  error: null;
}

/**
 * Discriminated union for API responses
 * Use type guards to narrow the type
 */
export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

/**
 * Type guard to check if a response is an error
 */
export function isError<T>(response: ApiResponse<T>): response is ErrorResponse {
  return response.success === false;
}

/**
 * Type guard to check if a response is successful
 */
export function isSuccess<T>(response: ApiResponse<T>): response is SuccessResponse<T> {
  return response.success === true;
}

/**
 * Result type for operations that can fail
 * This is the functional programming approach to error handling
 */
export type Result<T, E = ErrorValue> = { ok: true; value: T } | { ok: false; error: E };

/**
 * Helper to create a successful Result
 */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/**
 * Helper to create a failed Result
 */
export function err<T, E = ErrorValue>(error: E): Result<T, E> {
  return { ok: false, error };
}

/**
 * Type guard to check if a Result is successful
 */
export function isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
  return result.ok === true;
}

/**
 * Type guard to check if a Result is failed
 */
export function isErr<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
  return result.ok === false;
}

/**
 * Convert an API response to a Result type
 */
export function toResult<T>(response: ApiResponse<T>): Result<T, ErrorValue> {
  if (isSuccess(response)) {
    return ok(response.data);
  }
  return { ok: false, error: response.error };
}

/**
 * Map a Result's success value
 */
export function mapResult<T, U>(result: Result<T>, fn: (value: T) => U): Result<U> {
  if (isOk(result)) {
    return ok(fn(result.value));
  }
  return result as Result<U>;
}

/**
 * Map a Result's error value
 */
export function mapError<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
  if (isErr(result)) {
    return err(fn(result.error));
  }
  return result as Result<T, F>;
}

/**
 * Chain Result operations (flat map)
 */
export function andThen<T, U>(result: Result<T>, fn: (value: T) => Result<U>): Result<U> {
  if (isOk(result)) {
    return fn(result.value);
  }
  return result as Result<U>;
}

/**
 * Get the value or a default
 */
export function unwrapOr<T>(result: Result<T>, defaultValue: T): T {
  return isOk(result) ? result.value : defaultValue;
}

/**
 * Get the value or throw an error
 */
export function unwrap<T>(result: Result<T>): T {
  if (isOk(result)) {
    return result.value;
  }
  throw new Error(`Unwrapped error: ${result.error.message}`);
}

/**
 * Get the error or null
 */
export function unwrapError<T, E>(result: Result<T, E>): E | null {
  return isErr(result) ? result.error : null;
}

/**
 * Create a validation error
 */
export function validationError(field: string, message: string): ErrorValue {
  return {
    code: ErrorCode.ValidationFailed,
    message,
    field,
  };
}

/**
 * Create a not found error
 */
export function notFoundError(resource: string, id: string | number): ErrorValue {
  return {
    code: ErrorCode.ResourceNotFound,
    message: `${resource} not found: ${id}`,
    context: { resource, id: String(id) },
  };
}

/**
 * Create an internal error
 */
export function internalError(message: string, cause?: string): ErrorValue {
  return {
    code: ErrorCode.InternalError,
    message,
    cause,
  };
}

/**
 * Create a generic error with code and message
 */
export function createError(code: ErrorCode, message: string, details?: string): ErrorValue {
  return {
    code,
    message,
    details,
  };
}

/**
 * Convert an ErrorValue to a user-friendly message
 * This function should provide helpful, actionable messages for users
 */
export function toUserMessage(error: ErrorValue): string {
  // Handle null/undefined error
  if (!error) {
    return 'An unknown error occurred.';
  }

  // For validation errors, show field-specific messages
  if (error.field && error.code === ErrorCode.ValidationFailed) {
    const msg = error.message ?? 'Invalid value';
    return `${error.field}: ${msg}`;
  }

  // For already exists errors
  if (error.code === ErrorCode.DbAlreadyExists) {
    return error.message ?? 'This item already exists.';
  }

  // For not found errors
  if (
    error.code === ErrorCode.ResourceNotFound ||
    error.code === ErrorCode.DbNotFound ||
    error.code === ErrorCode.UserNotFound ||
    error.code === ErrorCode.EntityNotFound
  ) {
    return error.message ?? 'The requested item was not found.';
  }

  // For database errors
  if (error.code === ErrorCode.DbConnectionFailed) {
    return 'Unable to connect to the database. Please check your connection and try again.';
  }
  if (error.code === ErrorCode.DbQueryFailed) {
    const msg = error.message ?? '';
    if (msg.includes('duplicate')) {
      return 'A record with this information already exists.';
    }
    if (msg.includes('constraint')) {
      return 'This operation would violate a database rule.';
    }
    return 'A database operation failed. Please try again.';
  }
  if (error.code === ErrorCode.DbConstraintViolation) {
    return 'This action would violate a data rule. Please check your input.';
  }

  // For configuration errors
  if (error.code === ErrorCode.ConfigNotFound) {
    return 'Configuration not found. Please check your settings.';
  }
  if (error.code === ErrorCode.ConfigInvalid) {
    return 'Invalid configuration. Please review your settings.';
  }
  if (error.code === ErrorCode.ConfigMissingField) {
    return error.message ?? 'Required configuration is missing.';
  }

  // For serialization errors
  if (
    error.code === ErrorCode.SerializationFailed ||
    error.code === ErrorCode.DeserializationFailed
  ) {
    return 'Failed to process data. Please check your input and try again.';
  }
  if (error.code === ErrorCode.InvalidFormat) {
    return error.message ?? 'The data format is invalid.';
  }

  // For validation errors (without field)
  if (error.code === ErrorCode.ValidationFailed) {
    return error.message ?? 'Validation failed. Please check your input.';
  }
  if (error.code === ErrorCode.MissingRequiredField) {
    return error.message ?? 'A required field is missing.';
  }
  if (error.code === ErrorCode.InvalidFieldValue) {
    return error.message ?? 'A field contains an invalid value.';
  }

  // For system errors - provide more helpful messages
  if (error.code === ErrorCode.InternalError || error.code === ErrorCode.LockPoisoned) {
    // If we have a specific message, show it (without technical details)
    if (error.message && !error.message.includes('stack')) {
      return error.message;
    }
    // Add context-aware messages
    if (error.context?.operation) {
      return `Failed to ${error.context.operation}. Please try again.`;
    }
    return 'An unexpected error occurred. Please try again. If the problem persists, check the technical details below.';
  }

  // For unknown errors, try to extract useful information
  if (error.code === ErrorCode.Unknown) {
    if (error.message && error.message.length < 200) {
      return error.message;
    }
    return 'An unknown error occurred. Please check the technical details for more information.';
  }

  // Default: show the message if available, otherwise generic
  return error.message ?? 'An error occurred. Please try again.';
}

/**
 * Log an error for debugging
 */
export function logError(error: ErrorValue, context?: string): void {
  const logContext = context ? `[${context}] ` : '';
  console.error(`${logContext}Error [${error.code}]: ${error.message}`, {
    details: error.details,
    cause: error.cause,
    field: error.field,
    context: error.context,
  });
}

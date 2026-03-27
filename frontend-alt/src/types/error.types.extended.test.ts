// frontend/src/types/error.types.extended.test.ts
// Extended error type tests with comprehensive coverage

import { describe, expect, it, beforeEach, mock } from 'bun:test';
import {
  ErrorCode,
  type ErrorValue,
  err,
  ok,
  type Result,
  isOk,
  isErr,
  unwrap,
  unwrapOr,
  unwrapError,
  mapResult,
  mapError,
  andThen,
  toResult,
  isSuccess,
  isError,
  type ApiResponse,
  validationError,
  notFoundError,
  internalError,
  createError,
  toUserMessage,
  logError,
} from './error.types';

describe('ErrorCode Enum', () => {
  it('should have all database error codes', () => {
    expect(ErrorCode.DbConnectionFailed).toBe('DB_CONNECTION_FAILED');
    expect(ErrorCode.DbQueryFailed).toBe('DB_QUERY_FAILED');
    expect(ErrorCode.DbConstraintViolation).toBe('DB_CONSTRAINT_VIOLATION');
    expect(ErrorCode.DbNotFound).toBe('DB_NOT_FOUND');
    expect(ErrorCode.DbAlreadyExists).toBe('DB_ALREADY_EXISTS');
  });

  it('should have all configuration error codes', () => {
    expect(ErrorCode.ConfigNotFound).toBe('CONFIG_NOT_FOUND');
    expect(ErrorCode.ConfigInvalid).toBe('CONFIG_INVALID');
    expect(ErrorCode.ConfigMissingField).toBe('CONFIG_MISSING_FIELD');
  });

  it('should have all serialization error codes', () => {
    expect(ErrorCode.SerializationFailed).toBe('SERIALIZATION_FAILED');
    expect(ErrorCode.DeserializationFailed).toBe('DESERIALIZATION_FAILED');
    expect(ErrorCode.InvalidFormat).toBe('INVALID_FORMAT');
  });

  it('should have all validation error codes', () => {
    expect(ErrorCode.ValidationFailed).toBe('VALIDATION_FAILED');
    expect(ErrorCode.MissingRequiredField).toBe('MISSING_REQUIRED_FIELD');
    expect(ErrorCode.InvalidFieldValue).toBe('INVALID_FIELD_VALUE');
  });

  it('should have all not found error codes', () => {
    expect(ErrorCode.ResourceNotFound).toBe('RESOURCE_NOT_FOUND');
    expect(ErrorCode.UserNotFound).toBe('USER_NOT_FOUND');
    expect(ErrorCode.EntityNotFound).toBe('ENTITY_NOT_FOUND');
  });

  it('should have all system error codes', () => {
    expect(ErrorCode.LockPoisoned).toBe('LOCK_POISONED');
    expect(ErrorCode.InternalError).toBe('INTERNAL_ERROR');
  });

  it('should have plugin and unknown error codes', () => {
    expect(ErrorCode.Plugin).toBe('PLUGIN');
    expect(ErrorCode.Unknown).toBe('UNKNOWN');
  });
});

describe('Result Type Operations', () => {
  describe('ok() and err()', () => {
    it('should create successful result with various types', () => {
      expect(ok(42)).toEqual({ ok: true, value: 42 });
      expect(ok('string')).toEqual({ ok: true, value: 'string' });
      expect(ok({ key: 'value' })).toEqual({ ok: true, value: { key: 'value' } });
      expect(ok(null)).toEqual({ ok: true, value: null });
      expect(ok(undefined)).toEqual({ ok: true, value: undefined });
    });

    it('should create error result with ErrorValue', () => {
      const error: ErrorValue = { 
        code: ErrorCode.ValidationFailed, 
        message: 'Invalid input',
        field: 'email'
      };
      expect(err(error)).toEqual({ ok: false, error });
    });
  });

  describe('isOk() and isErr()', () => {
    it('isOk should return true for success and false for error', () => {
      expect(isOk(ok(42))).toBe(true);
      expect(isOk(err({ code: ErrorCode.Unknown, message: 'err' }))).toBe(false);
    });

    it('isErr should return false for success and true for error', () => {
      expect(isErr(ok(42))).toBe(false);
      expect(isErr(err({ code: ErrorCode.Unknown, message: 'err' }))).toBe(true);
    });
  });

  describe('unwrap()', () => {
    it('should return value for successful result', () => {
      expect(unwrap(ok(100))).toBe(100);
      expect(unwrap(ok('test'))).toBe('test');
    });

    it('should throw error with message for failed result', () => {
      const errorResult: Result<number> = err({ 
        code: ErrorCode.InternalError, 
        message: 'Something failed' 
      });
      
      expect(() => unwrap(errorResult)).toThrow('Unwrapped error: Something failed');
    });
  });

  describe('unwrapOr()', () => {
    it('should return value for successful result', () => {
      expect(unwrapOr(ok(42), 0)).toBe(42);
    });

    it('should return default for failed result', () => {
      expect(unwrapOr(err({ code: ErrorCode.Unknown, message: 'err' }), 42)).toBe(42);
      expect(unwrapOr(err({ code: ErrorCode.Unknown, message: 'err' }), 'default')).toBe('default');
    });
  });

  describe('unwrapError()', () => {
    it('should return null for successful result', () => {
      expect(unwrapError(ok(42))).toBeNull();
    });

    it('should return error for failed result', () => {
      const error = { code: ErrorCode.ValidationFailed, message: 'Invalid' };
      expect(unwrapError(err(error))).toEqual(error);
    });
  });
});

describe('Result Transformations', () => {
  describe('mapResult()', () => {
    it('should transform successful result value', () => {
      const result: Result<number> = ok(5);
      const mapped = mapResult(result, n => n * 2);
      expect(mapped).toEqual({ ok: true, value: 10 });
    });

    it('should preserve error for failed result', () => {
      const error = { code: ErrorCode.InternalError, message: 'Failed' };
      const result: Result<number> = err(error);
      const mapped = mapResult(result, n => n * 2);
      expect(mapped).toEqual({ ok: false, error });
    });

    it('should handle type transformations', () => {
      const result: Result<number> = ok(42);
      const mapped = mapResult(result, n => `Number: ${n}`);
      expect(mapped).toEqual({ ok: true, value: 'Number: 42' });
    });
  });

  describe('mapError()', () => {
    it('should preserve successful result', () => {
      const result: Result<number, string> = ok(42);
      const mapped = mapError(result, e => `Error: ${e}`);
      expect(mapped).toEqual({ ok: true, value: 42 });
    });

    it('should transform error value', () => {
      const result: Result<number, string> = err('original');
      const mapped = mapError(result, e => `Transformed: ${e}`);
      expect(mapped).toEqual({ ok: false, error: 'Transformed: original' });
    });
  });

  describe('andThen() - chaining', () => {
    it('should chain successful results', () => {
      const result: Result<number> = ok(5);
      const chained = andThen(result, n => ok(n * 2));
      expect(chained).toEqual({ ok: true, value: 10 });
    });

    it('should short-circuit on error', () => {
      const error = { code: ErrorCode.ValidationFailed, message: 'First error' };
      const result: Result<number> = err(error);
      const chained = andThen(result, n => ok(n * 2));
      expect(chained).toEqual({ ok: false, error });
    });

    it('should propagate errors from chain', () => {
      const result: Result<number> = ok(5);
      const secondError = { code: ErrorCode.InternalError, message: 'Second error' };
      const chained = andThen(result, () => err(secondError));
      expect(chained).toEqual({ ok: false, error: secondError });
    });
  });
});

describe('ApiResponse Type Guards', () => {
  describe('isSuccess()', () => {
    it('should return true for success response', () => {
      const response: ApiResponse<string> = { 
        success: true, 
        data: 'test', 
        error: null 
      };
      expect(isSuccess(response)).toBe(true);
    });

    it('should return false for error response', () => {
      const response: ApiResponse<string> = { 
        success: false, 
        data: null, 
        error: { code: ErrorCode.Unknown, message: 'err' } 
      };
      expect(isSuccess(response)).toBe(false);
    });
  });

  describe('isError()', () => {
    it('should return true for error response', () => {
      const response: ApiResponse<string> = { 
        success: false, 
        data: null, 
        error: { code: ErrorCode.Unknown, message: 'err' } 
      };
      expect(isError(response)).toBe(true);
    });

    it('should return false for success response', () => {
      const response: ApiResponse<string> = { 
        success: true, 
        data: 'test', 
        error: null 
      };
      expect(isError(response)).toBe(false);
    });
  });

  describe('toResult()', () => {
    it('should convert success response to Result', () => {
      const response: ApiResponse<number> = { 
        success: true, 
        data: 42, 
        error: null 
      };
      expect(toResult(response)).toEqual({ ok: true, value: 42 });
    });

    it('should convert error response to Result', () => {
      const error = { code: ErrorCode.ValidationFailed, message: 'Invalid' };
      const response: ApiResponse<number> = { 
        success: false, 
        data: null, 
        error 
      };
      expect(toResult(response)).toEqual({ ok: false, error });
    });
  });
});

describe('Error Factories', () => {
  describe('validationError()', () => {
    it('should create validation error with field', () => {
      const error = validationError('email', 'Invalid format');
      expect(error.code).toBe(ErrorCode.ValidationFailed);
      expect(error.field).toBe('email');
      expect(error.message).toBe('Invalid format');
    });

    it('should create validation error without context', () => {
      const error = validationError('password', 'Too short');
      expect(error.context).toBeUndefined();
    });
  });

  describe('notFoundError()', () => {
    it('should create not found error with string ID', () => {
      const error = notFoundError('User', 'abc123');
      expect(error.code).toBe(ErrorCode.ResourceNotFound);
      expect(error.message).toBe('User not found: abc123');
      expect(error.context?.resource).toBe('User');
      expect(error.context?.id).toBe('abc123');
    });

    it('should create not found error with number ID', () => {
      const error = notFoundError('Product', 42);
      expect(error.message).toBe('Product not found: 42');
      expect(error.context?.id).toBe('42');
    });
  });

  describe('internalError()', () => {
    it('should create internal error with message', () => {
      const error = internalError('System crash');
      expect(error.code).toBe(ErrorCode.InternalError);
      expect(error.message).toBe('System crash');
    });

    it('should create internal error with cause', () => {
      const error = internalError('Failed', 'Root cause');
      expect(error.cause).toBe('Root cause');
    });
  });

  describe('createError()', () => {
    it('should create generic error with code and message', () => {
      const error = createError(ErrorCode.Plugin, 'Plugin failed');
      expect(error.code).toBe(ErrorCode.Plugin);
      expect(error.message).toBe('Plugin failed');
    });

    it('should create error with details', () => {
      const error = createError(ErrorCode.InternalError, 'Error', 'Stack trace');
      expect(error.details).toBe('Stack trace');
    });
  });
});

describe('toUserMessage()', () => {
  it('should show field-specific message for validation errors', () => {
    const error: ErrorValue = {
      code: ErrorCode.ValidationFailed,
      message: 'Invalid',
      field: 'email',
    };
    expect(toUserMessage(error)).toBe('email: Invalid');
  });

  it('should show friendly message for already exists errors', () => {
    const error: ErrorValue = {
      code: ErrorCode.DbAlreadyExists,
      message: 'User exists',
    };
    expect(toUserMessage(error)).toBe('User exists');
  });

  it('should show friendly message for not found errors', () => {
    const error: ErrorValue = {
      code: ErrorCode.ResourceNotFound,
      message: 'Missing',
    };
    expect(toUserMessage(error)).toBe('Missing');
  });

  it('should show fallback for not found without message', () => {
    const error: ErrorValue = {
      code: ErrorCode.ResourceNotFound,
    };
    expect(toUserMessage(error)).toBe('The requested item was not found.');
  });

  it('should show specific message for DB connection errors', () => {
    const error: ErrorValue = {
      code: ErrorCode.DbConnectionFailed,
      message: 'Cannot connect',
    };
    expect(toUserMessage(error)).toBe(
      'Unable to connect to the database. Please check your connection and try again.'
    );
  });

  it('should handle DB query failed with duplicate message', () => {
    const error: ErrorValue = {
      code: ErrorCode.DbQueryFailed,
      message: 'duplicate key value',
    };
    expect(toUserMessage(error)).toBe('A record with this information already exists.');
  });

  it('should handle DB query failed with constraint message', () => {
    const error: ErrorValue = {
      code: ErrorCode.DbQueryFailed,
      message: 'constraint violation',
    };
    expect(toUserMessage(error)).toBe('A database operation failed. Please try again.');
  });

  it('should show friendly message for constraint violations', () => {
    const error: ErrorValue = {
      code: ErrorCode.DbConstraintViolation,
    };
    expect(toUserMessage(error)).toBe('This action would violate a data rule. Please check your input.');
  });

  it('should show config-specific messages', () => {
    expect(toUserMessage({ code: ErrorCode.ConfigNotFound, message: '' })).toBe(
      'Configuration not found. Please check your settings.'
    );
    expect(toUserMessage({ code: ErrorCode.ConfigInvalid, message: '' })).toBe(
      'Invalid configuration. Please review your settings.'
    );
  });

  it('should show serialization error messages', () => {
    expect(toUserMessage({ code: ErrorCode.SerializationFailed, message: '' })).toBe(
      'Failed to process data. Please check your input and try again.'
    );
  });

  it('should show validation error messages', () => {
    expect(toUserMessage({ code: ErrorCode.ValidationFailed, message: '' })).toBe(
      'Validation failed. Please check your input.'
    );
    expect(toUserMessage({ code: ErrorCode.MissingRequiredField, message: '' })).toBe(
      'A required field is missing.'
    );
  });

  it('should show internal error with operation context', () => {
    const error: ErrorValue = {
      code: ErrorCode.InternalError,
      message: 'Failed',
      context: { operation: 'save_user' },
    };
    expect(toUserMessage(error)).toBe('Failed to save_user. Please try again.');
  });

  it('should show generic internal error message', () => {
    const error: ErrorValue = {
      code: ErrorCode.InternalError,
    };
    expect(toUserMessage(error)).toBe(
      'An unexpected error occurred. Please try again. If the problem persists, check the technical details below.'
    );
  });

  it('should handle unknown errors with short messages', () => {
    const error: ErrorValue = {
      code: ErrorCode.Unknown,
      message: 'Short error',
    };
    expect(toUserMessage(error)).toBe('Short error');
  });

  it('should show generic message for long unknown errors', () => {
    const error: ErrorValue = {
      code: ErrorCode.Unknown,
      message: 'A'.repeat(201),
    };
    expect(toUserMessage(error)).toBe(
      'An unknown error occurred. Please check the technical details for more information.'
    );
  });

  it('should return default message when no specific handler', () => {
    const error: ErrorValue = {
      code: ErrorCode.Plugin as ErrorCode,
      message: 'Plugin error',
    };
    expect(toUserMessage(error)).toBe('Plugin error');
  });
});

describe('logError()', () => {
  it('should log error to console with context', () => {
    const consoleSpy = mock((msg: string, ...args: unknown[]) => {});
    const originalError = console.error;
    console.error = consoleSpy;

    const error: ErrorValue = {
      code: ErrorCode.InternalError,
      message: 'Test error',
      details: 'Stack trace',
    };

    logError(error, 'TestContext');
    
    expect(consoleSpy).toHaveBeenCalled();
    
    console.error = originalError;
  });

  it('should log without context when not provided', () => {
    const consoleSpy = mock((msg: string, ...args: unknown[]) => {});
    const originalError = console.error;
    console.error = consoleSpy;

    const error: ErrorValue = {
      code: ErrorCode.ValidationFailed,
      message: 'Invalid',
    };

    logError(error);
    
    expect(consoleSpy).toHaveBeenCalled();
    
    console.error = originalError;
  });
});

describe('Edge Cases', () => {
  it('should handle empty string messages', () => {
    const error = err({ code: ErrorCode.Unknown, message: '' });
    expect(unwrapOr(error, 'default')).toBe('default');
  });

  it('should handle null/undefined in error context', () => {
    const error: ErrorValue = {
      code: ErrorCode.InternalError,
      message: 'Error',
      context: null as unknown as Record<string, string>,
    };
    expect(toUserMessage(error)).toContain('An unexpected error occurred');
  });

  it('should handle very long error messages', () => {
    const longMessage = 'A'.repeat(10000);
    const error = err({ code: ErrorCode.InternalError, message: longMessage });
    expect(unwrapOr(error, 'default')).toBe('default');
  });

  it('should handle special characters in messages', () => {
    const error = validationError('field', '<script>alert("xss")</script>');
    expect(error.message).toBe('<script>alert("xss")</script>');
  });

  it('should handle unicode in messages', () => {
    const error = validationError('name', '名前が無効です');
    expect(error.message).toBe('名前が無効です');
  });
});

import { describe, expect, it } from 'bun:test';
import {
  ErrorCode,
  type ErrorValue,
  err,
  internalError,
  isErr,
  isOk,
  notFoundError,
  ok,
  type Result,
  toUserMessage,
  unwrap,
  unwrapError,
  unwrapOr,
  validationError,
} from './error.types';

describe('ErrorCode', () => {
  it('should have database error codes', () => {
    expect(ErrorCode.DbConnectionFailed).toBe('DB_CONNECTION_FAILED');
    expect(ErrorCode.DbQueryFailed).toBe('DB_QUERY_FAILED');
    expect(ErrorCode.DbConstraintViolation).toBe('DB_CONSTRAINT_VIOLATION');
  });

  it('should have validation error codes', () => {
    expect(ErrorCode.ValidationFailed).toBe('VALIDATION_FAILED');
    expect(ErrorCode.MissingRequiredField).toBe('MISSING_REQUIRED_FIELD');
  });

  it('should have not found error codes', () => {
    expect(ErrorCode.ResourceNotFound).toBe('RESOURCE_NOT_FOUND');
    expect(ErrorCode.UserNotFound).toBe('USER_NOT_FOUND');
  });
});

describe('Result type', () => {
  describe('ok()', () => {
    it('should create a successful result', () => {
      const result = ok(42);
      expect(result.ok).toBe(true);
      expect(result.value).toBe(42);
    });
  });

  describe('err()', () => {
    it('should create an error result', () => {
      const error: ErrorValue = { code: ErrorCode.ValidationFailed, message: 'Invalid' };
      const result = err(error);
      expect(result.ok).toBe(false);
      expect(result.error).toEqual(error);
    });
  });

  describe('isOk()', () => {
    it('should return true for ok result', () => {
      const result = ok(42) as Result<number>;
      expect(isOk(result)).toBe(true);
    });

    it('should return false for error result', () => {
      const result = err({ code: ErrorCode.Unknown, message: 'error' }) as Result<number>;
      expect(isOk(result)).toBe(false);
    });
  });

  describe('isErr()', () => {
    it('should return false for ok result', () => {
      const result = ok(42) as Result<number>;
      expect(isErr(result)).toBe(false);
    });

    it('should return true for error result', () => {
      const result = err({ code: ErrorCode.Unknown, message: 'error' }) as Result<number>;
      expect(isErr(result)).toBe(true);
    });
  });

  describe('unwrapOr()', () => {
    it('should return value for ok result', () => {
      const result = ok(42) as Result<number>;
      expect(unwrapOr(result, 0)).toBe(42);
    });

    it('should return default for error result', () => {
      const result = err({ code: ErrorCode.Unknown, message: 'error' }) as Result<number>;
      expect(unwrapOr(result, 0)).toBe(0);
    });
  });

  describe('unwrap()', () => {
    it('should return value for ok result', () => {
      const result = ok(42) as Result<number>;
      expect(unwrap(result)).toBe(42);
    });

    it('should throw for error result', () => {
      const result = err({ code: ErrorCode.Unknown, message: 'test error' }) as Result<number>;
      expect(() => unwrap(result)).toThrow('Unwrapped error: test error');
    });
  });

  describe('unwrapError()', () => {
    it('should return null for ok result', () => {
      const result = ok(42) as Result<number, ErrorValue>;
      expect(unwrapError(result)).toBeNull();
    });

    it('should return error for error result', () => {
      const error: ErrorValue = { code: ErrorCode.Unknown, message: 'test error' };
      const result = err(error) as Result<number, ErrorValue>;
      expect(unwrapError(result)).toEqual(error);
    });
  });
});

describe('ErrorValue factories', () => {
  describe('validationError()', () => {
    it('should create validation error with field', () => {
      const error = validationError('email', 'Invalid email format');
      expect(error.code).toBe(ErrorCode.ValidationFailed);
      expect(error.field).toBe('email');
      expect(error.message).toBe('Invalid email format');
    });
  });

  describe('notFoundError()', () => {
    it('should create not found error with context', () => {
      const error = notFoundError('User', 123);
      expect(error.code).toBe(ErrorCode.ResourceNotFound);
      expect(error.context?.resource).toBe('User');
      expect(error.context?.id).toBe('123');
    });
  });

  describe('internalError()', () => {
    it('should create internal error', () => {
      const error = internalError('Something went wrong', 'Root cause');
      expect(error.code).toBe(ErrorCode.InternalError);
      expect(error.message).toBe('Something went wrong');
      expect(error.cause).toBe('Root cause');
    });
  });
});

describe('toUserMessage()', () => {
  it('should return field-specific message for validation errors', () => {
    const error: ErrorValue = {
      code: ErrorCode.ValidationFailed,
      message: 'Invalid email',
      field: 'email',
    };
    expect(toUserMessage(error)).toBe('email: Invalid email');
  });

  it('should return friendly message for not found errors', () => {
    const error: ErrorValue = {
      code: ErrorCode.ResourceNotFound,
      message: 'User not found: 123',
    };
    expect(toUserMessage(error)).toBe('User not found: 123');
  });

  it('should return fallback message when no message provided', () => {
    const error: ErrorValue = {
      code: ErrorCode.ResourceNotFound,
    };
    expect(toUserMessage(error)).toBe('The requested item was not found.');
  });

  it('should return friendly message for database errors', () => {
    const error: ErrorValue = {
      code: ErrorCode.DbConnectionFailed,
      message: 'Connection refused',
    };
    expect(toUserMessage(error)).toBe(
      'Unable to connect to the database. Please check your connection and try again.'
    );
  });

  it('should return generic message for unknown errors', () => {
    const error: ErrorValue = {
      code: ErrorCode.Unknown,
      message: 'Something unexpected happened',
    };
    expect(toUserMessage(error)).toBe('Something unexpected happened');
  });
});

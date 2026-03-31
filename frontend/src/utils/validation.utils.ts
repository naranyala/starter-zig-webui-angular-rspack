/**
 * Validation Utilities
 * 
 * Reusable validation functions for forms and data validation
 */

import { VALIDATION_CONFIG } from '../constants/app.constants';
import { ValidationError } from '../types/api.types';

// ============================================================================
// String Validators
// ============================================================================

export function isNotEmpty(value: string | null | undefined): boolean {
  return value != null && value.trim().length > 0;
}

export function minLength(value: string, min: number): boolean {
  return value.length >= min;
}

export function maxLength(value: string, max: number): boolean {
  return value.length <= max;
}

export function lengthBetween(value: string, min: number, max: number): boolean {
  return value.length >= min && value.length <= max;
}

export function matchesPattern(value: string, pattern: RegExp): boolean {
  return pattern.test(value);
}

// ============================================================================
// Email Validators
// ============================================================================

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRICT_EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export function isValidEmail(value: string, strict = false): boolean {
  if (!value || value.length > VALIDATION_CONFIG.user.email.maxLength) {
    return false;
  }
  const regex = strict ? STRICT_EMAIL_REGEX : EMAIL_REGEX;
  return regex.test(value);
}

// ============================================================================
// Number Validators
// ============================================================================

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

export function isInteger(value: unknown): value is number {
  return isNumber(value) && Number.isInteger(value);
}

export function isPositive(value: number): boolean {
  return value > 0;
}

export function isNonNegative(value: number): boolean {
  return value >= 0;
}

export function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

export function isValidAge(value: number): boolean {
  return isInteger(value) && inRange(value, VALIDATION_CONFIG.user.age.min, VALIDATION_CONFIG.user.age.max);
}

export function isValidPrice(value: number): boolean {
  return isNumber(value) && isNonNegative(value) && value <= VALIDATION_CONFIG.user.age.max;
}

// ============================================================================
// Date Validators
// ============================================================================

export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

export function isDateInPast(value: Date): boolean {
  return value.getTime() < Date.now();
}

export function isDateInFuture(value: Date): boolean {
  return value.getTime() > Date.now();
}

export function isDateBetween(value: Date, start: Date, end: Date): boolean {
  const time = value.getTime();
  return time >= start.getTime() && time <= end.getTime();
}

// ============================================================================
// Array Validators
// ============================================================================

export function isArrayNotEmpty<T>(value: T[] | null | undefined): boolean {
  return Array.isArray(value) && value.length > 0;
}

export function arrayMinLength<T>(value: T[], min: number): boolean {
  return Array.isArray(value) && value.length >= min;
}

export function arrayMaxLength<T>(value: T[], max: number): boolean {
  return Array.isArray(value) && value.length <= max;
}

export function arrayEvery<T>(value: T[], predicate: (item: T) => boolean): boolean {
  return Array.isArray(value) && value.every(predicate);
}

// ============================================================================
// Object Validators
// ============================================================================

export function isObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

export function hasRequiredFields<T extends Record<string, unknown>>(
  value: T,
  fields: (keyof T)[]
): boolean {
  return fields.every(field => value[field] != null && value[field] !== '');
}

// ============================================================================
// Status Validators
// ============================================================================

export function isValidUserStatus(value: string): boolean {
  return VALIDATION_CONFIG.user.status.allowedValues.includes(value as typeof VALIDATION_CONFIG.user.status.allowedValues[number]);
}

export function isValidProductStatus(value: string): boolean {
  const allowedValues = ['available', 'unavailable', 'discontinued'];
  return allowedValues.includes(value);
}

export function isValidOrderStatus(value: string): boolean {
  const allowedValues = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  return allowedValues.includes(value);
}

// ============================================================================
// User Validators
// ============================================================================

export function isValidName(value: string): boolean {
  if (!value) return false;
  return lengthBetween(
    value,
    VALIDATION_CONFIG.user.name.minLength,
    VALIDATION_CONFIG.user.name.maxLength
  );
}

export function validateUserData(data: {
  name?: string;
  email?: string;
  age?: number;
  status?: string;
}): ValidationError[] {
  const errors: ValidationError[] = [];

  if (data.name !== undefined) {
    if (!isValidName(data.name)) {
      errors.push({
        field: 'name',
        message: `Name must be between ${VALIDATION_CONFIG.user.name.minLength} and ${VALIDATION_CONFIG.user.name.maxLength} characters`,
        value: data.name,
      });
    }
  }

  if (data.email !== undefined) {
    if (!isValidEmail(data.email)) {
      errors.push({
        field: 'email',
        message: 'Invalid email format',
        value: data.email,
      });
    }
  }

  if (data.age !== undefined) {
    if (!isValidAge(data.age)) {
      errors.push({
        field: 'age',
        message: `Age must be between ${VALIDATION_CONFIG.user.age.min} and ${VALIDATION_CONFIG.user.age.max}`,
        value: data.age,
      });
    }
  }

  if (data.status !== undefined) {
    if (!isValidUserStatus(data.status)) {
      errors.push({
        field: 'status',
        message: `Status must be one of: ${VALIDATION_CONFIG.user.status.allowedValues.join(', ')}`,
        value: data.status,
      });
    }
  }

  return errors;
}

// ============================================================================
// SQL Query Validators
// ============================================================================

export function isValidSqlQuery(value: string): boolean {
  if (!value || value.length > VALIDATION_CONFIG.query.maxLength) {
    return false;
  }
  
  // Basic SQL injection prevention
  const dangerousPatterns = [
    /;\s*DROP/i,
    /;\s*DELETE/i,
    /;\s*TRUNCATE/i,
    /;\s*ALTER/i,
    /;\s*CREATE/i,
    /--/,
    /\/\*/,
  ];

  return !dangerousPatterns.some(pattern => pattern.test(value));
}

// ============================================================================
// Composite Validators
// ============================================================================

export interface ValidationRule<T> {
  validator: (value: T) => boolean;
  message: string;
}

export function validate<T>(
  value: T,
  rules: ValidationRule<T>[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const rule of rules) {
    if (!rule.validator(value)) {
      errors.push(rule.message);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function createStringValidator(
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    patternMessage?: string;
  } = {}
): ValidationRule<string>[] {
  const rules: ValidationRule<string>[] = [];

  if (options.required) {
    rules.push({
      validator: isNotEmpty,
      message: 'This field is required',
    });
  }

  if (options.minLength !== undefined) {
    rules.push({
      validator: value => minLength(value, options.minLength!),
      message: `Minimum length is ${options.minLength} characters`,
    });
  }

  if (options.maxLength !== undefined) {
    rules.push({
      validator: value => maxLength(value, options.maxLength!),
      message: `Maximum length is ${options.maxLength} characters`,
    });
  }

  if (options.pattern) {
    rules.push({
      validator: value => matchesPattern(value, options.pattern!),
      message: options.patternMessage ?? 'Invalid format',
    });
  }

  return rules;
}

export function createNumberValidator(
  options: {
    required?: boolean;
    min?: number;
    max?: number;
    integer?: boolean;
  } = {}
): ValidationRule<number>[] {
  const rules: ValidationRule<number>[] = [];

  if (options.required) {
    rules.push({
      validator: (value: number) => value != null && (value as unknown) !== '',
      message: 'This field is required',
    });
  }

  if (options.min !== undefined) {
    rules.push({
      validator: value => value >= options.min!,
      message: `Minimum value is ${options.min}`,
    });
  }

  if (options.max !== undefined) {
    rules.push({
      validator: value => value <= options.max!,
      message: `Maximum value is ${options.max}`,
    });
  }

  if (options.integer) {
    rules.push({
      validator: isInteger,
      message: 'Value must be an integer',
    });
  }

  return rules;
}

// ============================================================================
// Async Validators
// ============================================================================

export type AsyncValidationRule<T> = (value: T) => Promise<{ valid: boolean; message?: string }>;

export async function validateAsync<T>(
  value: T,
  asyncRules: AsyncValidationRule<T>[]
): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  for (const rule of asyncRules) {
    const result = await rule(value);
    if (!result.valid && result.message) {
      errors.push(result.message);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function createUniqueValidator(
  checkFn: (value: string) => Promise<boolean>,
  fieldName: string
): AsyncValidationRule<string> {
  return async (value: string) => {
    const isUnique = await checkFn(value);
    return {
      valid: isUnique,
      message: isUnique ? undefined : `${fieldName} already exists`,
    };
  };
}

// ============================================================================
// Exports
// ============================================================================

export const Validators = {
  // String
  isNotEmpty,
  minLength,
  maxLength,
  lengthBetween,
  matchesPattern,
  
  // Email
  isValidEmail,
  
  // Number
  isNumber,
  isInteger,
  isPositive,
  isNonNegative,
  inRange,
  isValidAge,
  isValidPrice,
  
  // Date
  isValidDate,
  isDateInPast,
  isDateInFuture,
  isDateBetween,
  
  // Array
  isArrayNotEmpty,
  arrayMinLength,
  arrayMaxLength,
  arrayEvery,
  
  // Object
  isObject,
  hasRequiredFields,
  
  // Status
  isValidUserStatus,
  isValidProductStatus,
  isValidOrderStatus,
  
  // User
  isValidName,
  validateUserData,
  
  // SQL
  isValidSqlQuery,
  
  // Composite
  validate,
  createStringValidator,
  createNumberValidator,
  
  // Async
  validateAsync,
  createUniqueValidator,
};


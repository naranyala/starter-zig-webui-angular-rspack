/**
 * Data Transformation Types
 * 
 * Shared types and interfaces for data transformation services
 */

/**
 * Generic data type enum for runtime type checking
 */
export enum DataType {
  UNDEFINED = 'undefined',
  NULL = 'null',
  BOOLEAN = 'boolean',
  NUMBER = 'number',
  STRING = 'string',
  DATE = 'date',
  ARRAY = 'array',
  OBJECT = 'object',
  BINARY = 'binary',
  ANY = 'any',
}

/**
 * Type descriptor for schema validation
 */
export interface TypeDescriptor {
  type: DataType;
  name: string;
  isRequired?: boolean;
  isNullable?: boolean;
  defaultValue?: any;
  enumValues?: any[];
  nestedType?: TypeDescriptor;
  arrayItemType?: TypeDescriptor;
}

/**
 * Transformation result wrapper
 */
export interface TransformResult<T> {
  data: T;
  error?: string;
  success: boolean;
  errorCode?: number;
}

/**
 * Transformation options
 */
export interface TransformOptions {
  skipNull?: boolean;
  skipUndefined?: boolean;
  strictMode?: boolean;
  deepClone?: boolean;
  excludeFields?: string[];
  includeFields?: string[];
}

/**
 * API Response interface
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: number;
  requestId?: string;
  timestamp?: number;
  errors?: string[];
}

/**
 * Paginated response interface
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  fieldErrors: { [field: string]: string[] };
  warnings: string[];
}

/**
 * Date format types
 */
export enum DateFormat {
  ISO = 'iso',
  ISO_LOCAL = 'iso-local',
  RFC2822 = 'rfc2822',
  RFC3339 = 'rfc3339',
  UNIX_TIMESTAMP = 'unix',
  UNIX_TIMESTAMP_MS = 'unix-ms',
  CUSTOM = 'custom',
}

/**
 * String case types
 */
export enum StringCase {
  CAMEL = 'camel',
  PASCAL = 'pascal',
  SNAKE = 'snake',
  KEBAB = 'kebab',
  CONSTANT = 'constant',
  TITLE = 'title',
  LOWER = 'lower',
  UPPER = 'upper',
  SENTENCE = 'sentence',
}

/**
 * Field mapping definition
 */
export interface FieldMap {
  sourceField: string;
  targetField: string;
  transformFn?: (value: any) => any;
}

/**
 * Date Time Service configuration
 */
export interface DateTimeConfig {
  timezone: string;
  outputFormat: DateFormat;
  customFormat?: string;
  locale: string;
}

/**
 * String Transform Service configuration
 */
export interface StringTransformConfig {
  trimWhitespace: boolean;
  normalizeUnicode: boolean;
  encoding: string;
}

/**
 * Object Mapper configuration
 */
export interface ObjectMapperConfig {
  skipNullValues: boolean;
  skipUndefined: boolean;
  deepMap: boolean;
  stripUnknownFields: boolean;
}

/**
 * Validation rule interface
 */
export interface ValidationRule {
  field: string;
  ruleType: string;
  message: string;
  params?: any;
  validatorFn?: (value: any) => boolean;
}

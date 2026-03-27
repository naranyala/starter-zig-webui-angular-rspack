/**
 * Data Transformation Services - Part 2
 * String, Object, Array, Encoding, Validation, DTO services
 */

import { Injectable } from '@angular/core';
import { DataType, TypeDescriptor, TransformResult, TransformOptions, StringCase, StringTransformConfig, FieldMap, ObjectMapperConfig } from './data-transform.types';

// ============================================================================
// String Transform Service
// ============================================================================

/**
 * String Transform Service
 *
 * String manipulation and transformation utilities
 */
@Injectable({ providedIn: 'root' })
export class StringTransformService {
  private config: StringTransformConfig = {
    trimWhitespace: true,
    normalizeUnicode: true,
    encoding: 'utf-8',
  };

  constructor() {}

  /**
   * Configure string transform
   */
  configure(config: Partial<StringTransformConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Convert to camelCase
   */
  toCamel(input: string): string {
    return this.convertCase(input, StringCase.CAMEL);
  }

  /**
   * Convert to PascalCase
   */
  toPascal(input: string): string {
    return this.convertCase(input, StringCase.PASCAL);
  }

  /**
   * Convert to snake_case
   */
  toSnake(input: string): string {
    return this.convertCase(input, StringCase.SNAKE);
  }

  /**
   * Convert to kebab-case
   */
  toKebab(input: string): string {
    return this.convertCase(input, StringCase.KEBAB);
  }

  /**
   * Convert to CONSTANT_CASE
   */
  toConstant(input: string): string {
    return this.convertCase(input, StringCase.CONSTANT);
  }

  /**
   * Convert to Title Case
   */
  toTitle(input: string): string {
    return this.convertCase(input, StringCase.TITLE);
  }

  /**
   * Convert to lowercase
   */
  toLower(input: string): string {
    return input.toLowerCase();
  }

  /**
   * Convert to uppercase
   */
  toUpper(input: string): string {
    return input.toUpperCase();
  }

  /**
   * Convert to Sentence case
   */
  toSentence(input: string): string {
    if (!input) return '';
    return input.charAt(0).toUpperCase() + input.slice(1).toLowerCase();
  }

  /**
   * Convert to specific case
   */
  convertCase(input: string, caseType: StringCase): string {
    if (!input) return '';

    // Split on various delimiters
    const words = input
      .replace(/([a-z])([A-Z])/g, '$1 $2')  // camelCase → camel Case
      .replace(/[-_]/g, ' ')  // snake/kebab → space
      .split(/\s+/)
      .filter(w => w.length > 0);

    switch (caseType) {
      case StringCase.CAMEL:
        return words[0].toLowerCase() + words.slice(1)
          .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
          .join('');
      case StringCase.PASCAL:
        return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
      case StringCase.SNAKE:
        return words.map(w => w.toLowerCase()).join('_');
      case StringCase.KEBAB:
        return words.map(w => w.toLowerCase()).join('-');
      case StringCase.CONSTANT:
        return words.map(w => w.toUpperCase()).join('_');
      case StringCase.TITLE:
        return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      case StringCase.LOWER:
        return input.toLowerCase();
      case StringCase.UPPER:
        return input.toUpperCase();
      case StringCase.SENTENCE:
        return input.charAt(0).toUpperCase() + input.slice(1).toLowerCase();
      default:
        return input;
    }
  }

  /**
   * Trim whitespace
   */
  trim(input: string): string {
    return input.trim();
  }

  /**
   * Trim left
   */
  trimLeft(input: string): string {
    return input.replace(/^\s+/, '');
  }

  /**
   * Trim right
   */
  trimRight(input: string): string {
    return input.replace(/\s+$/, '');
  }

  /**
   * Trim all extra whitespace
   */
  trimAll(input: string): string {
    return input.replace(/\s+/g, ' ').trim();
  }

  /**
   * Normalize whitespace
   */
  normalizeWhitespace(input: string): string {
    return this.trimAll(input);
  }

  /**
   * Remove control characters
   */
  removeControlChars(input: string): string {
    return input.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  }

  /**
   * Capitalize first letter
   */
  capitalize(input: string): string {
    if (!input) return '';
    return input.charAt(0).toUpperCase() + input.slice(1);
  }

  /**
   * Reverse string
   */
  reverse(input: string): string {
    return input.split('').reverse().join('');
  }

  /**
   * Truncate to max length
   */
  truncate(input: string, maxLength: number, suffix: string = '...'): string {
    if (!input || input.length <= maxLength) return input;
    return input.slice(0, maxLength - suffix.length) + suffix;
  }

  /**
   * Pad left
   */
  padLeft(input: string, length: number, padChar: string = ' '): string {
    return input.padStart(length, padChar);
  }

  /**
   * Pad right
   */
  padRight(input: string, length: number, padChar: string = ' '): string {
    return input.padEnd(length, padChar);
  }

  /**
   * Replace first occurrence
   */
  replace(input: string, search: string, replace: string): string {
    return input.replace(search, replace);
  }

  /**
   * Replace all occurrences
   */
  replaceAll(input: string, search: string, replace: string): string {
    return input.split(search).join(replace);
  }

  /**
   * Replace with regex
   */
  replaceRegex(input: string, pattern: string, replace: string): string {
    const regex = new RegExp(pattern, 'g');
    return input.replace(regex, replace);
  }

  /**
   * Get substring
   */
  substring(input: string, start: number, length?: number): string {
    if (length !== undefined) {
      return input.substr(start, length);
    }
    return input.substr(start);
  }

  /**
   * Get text before delimiter
   */
  before(input: string, delimiter: string): string {
    const index = input.indexOf(delimiter);
    return index === -1 ? input : input.slice(0, index);
  }

  /**
   * Get text after delimiter
   */
  after(input: string, delimiter: string): string {
    const index = input.indexOf(delimiter);
    return index === -1 ? '' : input.slice(index + delimiter.length);
  }

  /**
   * Get text between delimiters
   */
  between(input: string, start: string, end: string): string {
    const startIndex = input.indexOf(start);
    if (startIndex === -1) return '';
    const endIndex = input.indexOf(end, startIndex + start.length);
    if (endIndex === -1) return '';
    return input.slice(startIndex + start.length, endIndex);
  }

  /**
   * Split by delimiter
   */
  split(input: string, delimiter: string): string[] {
    return input.split(delimiter);
  }

  /**
   * Split by lines
   */
  splitLines(input: string): string[] {
    return input.split(/\r?\n/);
  }

  /**
   * Join array with delimiter
   */
  join(parts: string[], delimiter: string): string {
    return parts.join(delimiter);
  }

  /**
   * Check if empty
   */
  isEmpty(input: string): boolean {
    return !input || input.length === 0;
  }

  /**
   * Check if blank (whitespace only)
   */
  isBlank(input: string): boolean {
    return !input || input.trim().length === 0;
  }

  /**
   * Check if numeric
   */
  isNumeric(input: string): boolean {
    return /^-?\d*\.?\d+$/.test(input);
  }

  /**
   * Check if alphabetic
   */
  isAlpha(input: string): boolean {
    return /^[a-zA-Z]+$/.test(input);
  }

  /**
   * Check if alphanumeric
   */
  isAlphanumeric(input: string): boolean {
    return /^[a-zA-Z0-9]+$/.test(input);
  }

  /**
   * Check if valid email
   */
  isEmail(input: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(input);
  }

  /**
   * Check if valid URL
   */
  isUrl(input: string): boolean {
    try {
      new URL(input);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if valid phone
   */
  isPhone(input: string): boolean {
    const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
    return phoneRegex.test(input);
  }
}

// ============================================================================
// Object Mapper Service
// ============================================================================

/**
 * Object Mapper Service
 *
 * Object mapping and transformation between different shapes
 */
@Injectable({ providedIn: 'root' })
export class ObjectMapperService {
  private config: ObjectMapperConfig = {
    skipNullValues: true,
    skipUndefined: true,
    deepMap: true,
    stripUnknownFields: false,
  };

  private fieldMappings: FieldMap[] = [];

  constructor() {}

  /**
   * Configure object mapper
   */
  configure(config: Partial<ObjectMapperConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Add field mapping
   */
  addMapping(source: string, target: string, transformFn?: (value: any) => any): void {
    this.fieldMappings.push({ sourceField: source, targetField: target, transformFn });
  }

  /**
   * Add multiple mappings
   */
  addMappings(mappings: FieldMap[]): void {
    this.fieldMappings.push(...mappings);
  }

  /**
   * Clear all mappings
   */
  clearMappings(): void {
    this.fieldMappings = [];
  }

  /**
   * Map object with configured mappings
   */
  map<T, U>(source: T, targetConstructor?: new () => U): U {
    const result: any = targetConstructor ? new targetConstructor() : {};

    // Apply field mappings
    for (const mapping of this.fieldMappings) {
      const value = this.getProperty(source as any, mapping.sourceField);
      if (value !== undefined && value !== null) {
        const transformed = mapping.transformFn ? mapping.transformFn(value) : value;
        this.setProperty(result, mapping.targetField, transformed);
      }
    }

    // Copy remaining properties
    if (!this.config.stripUnknownFields) {
      for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key) && !this.isMappedField(key)) {
          const value = (source as any)[key];
          if (!this.shouldSkip(value)) {
            result[key] = this.config.deepMap ? this.mapValue(value) : value;
          }
        }
      }
    }

    return result;
  }

  /**
   * Map specific fields only
   */
  mapFields<T>(source: T, fields: string[]): Partial<T> {
    const result: any = {};
    for (const field of fields) {
      const value = this.getProperty(source, field);
      if (!this.shouldSkip(value)) {
        result[field] = this.config.deepMap ? this.mapValue(value) : value;
      }
    }
    return result;
  }

  /**
   * Exclude specific fields
   */
  excludeFields<T>(source: T, exclude: string[]): T {
    const result: any = {};
    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key) && !exclude.includes(key)) {
        const value = (source as any)[key];
        if (!this.shouldSkip(value)) {
          result[key] = this.config.deepMap ? this.mapValue(value) : value;
        }
      }
    }
    return result;
  }

  /**
   * Get property by path
   */
  getProperty<T>(obj: T, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj as any);
  }

  /**
   * Set property by path
   */
  setProperty<T>(obj: T, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj as any);
    target[lastKey] = value;
  }

  /**
   * Check if object has property
   */
  hasProperty<T>(obj: T, property: string): boolean {
    return this.getProperty(obj, property) !== undefined;
  }

  /**
   * Delete property
   */
  deleteProperty<T>(obj: T, property: string): boolean {
    const value = this.getProperty(obj, property);
    if (value !== undefined) {
      // Simple implementation - doesn't handle nested paths
      delete (obj as any)[property];
      return true;
    }
    return false;
  }

  /**
   * Get object keys
   */
  getKeys<T extends object>(obj: T): string[] {
    return Object.keys(obj);
  }

  /**
   * Get object values
   */
  getValues<T extends object>(obj: T): any[] {
    return Object.values(obj);
  }

  /**
   * Clone object (shallow)
   */
  clone<T>(source: T): T {
    return { ...source };
  }

  /**
   * Clone object (deep)
   */
  cloneDeep<T>(source: T): T {
    return JSON.parse(JSON.stringify(source));
  }

  /**
   * Merge objects (shallow)
   */
  merge<T>(target: T, source: Partial<T>): T {
    return { ...target, ...source };
  }

  /**
   * Merge objects (deep)
   */
  mergeDeep<T extends object>(target: T, source: Partial<T>): T {
    const result = { ...target } as any;
    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        const sourceValue = (source as any)[key];
        const targetValue = (target as any)[key];
        if (this.isObject(sourceValue) && this.isObject(targetValue)) {
          result[key] = this.mergeDeep(targetValue, sourceValue);
        } else {
          result[key] = sourceValue;
        }
      }
    }
    return result;
  }

  /**
   * Pick specific keys
   */
  pick<T extends object>(obj: T, keys: string[]): Partial<T> {
    const result: any = {};
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = (obj as any)[key];
      }
    }
    return result;
  }

  /**
   * Omit specific keys
   */
  omit<T extends object>(obj: T, keys: string[]): Partial<T> {
    const result: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key) && !keys.includes(key)) {
        result[key] = (obj as any)[key];
      }
    }
    return result;
  }

  /**
   * Flatten nested object
   */
  flatten<T extends object>(obj: T, prefix: string = ''): any {
    const result: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = (obj as any)[key];
        const newKey = prefix ? `${prefix}.${key}` : key;
        if (this.isObject(value) && !Array.isArray(value)) {
          Object.assign(result, this.flatten(value, newKey));
        } else {
          result[newKey] = value;
        }
      }
    }
    return result;
  }

  /**
   * Unflatten object
   */
  unflatten<T extends object>(flat: T): any {
    const result: any = {};
    for (const key in flat) {
      if (Object.prototype.hasOwnProperty.call(flat, key)) {
        this.setProperty(result, key, (flat as any)[key]);
      }
    }
    return result;
  }

  /**
   * Filter by keys
   */
  filterKeys<T extends object>(obj: T, keys: string[]): Partial<T> {
    return this.pick(obj, keys);
  }

  /**
   * Filter by values predicate
   */
  filterValues<T extends object>(obj: T, predicate: (value: any) => boolean): Partial<T> {
    const result: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key) && predicate((obj as any)[key])) {
        result[key] = (obj as any)[key];
      }
    }
    return result;
  }

  /**
   * Check if value should be skipped
   */
  private shouldSkip(value: any): boolean {
    if (value === null && this.config.skipNullValues) return true;
    if (value === undefined && this.config.skipUndefined) return true;
    return false;
  }

  /**
   * Check if field is mapped
   */
  private isMappedField(field: string): boolean {
    return this.fieldMappings.some(m => m.sourceField === field);
  }

  /**
   * Map value recursively
   */
  private mapValue(value: any): any {
    if (value === null || value === undefined) return value;
    if (Array.isArray(value)) return value.map(v => this.mapValue(v));
    if (this.isObject(value)) return this.map(value);
    return value;
  }

  /**
   * Check if value is object
   */
  private isObject(value: any): boolean {
    return typeof value === 'object' && value !== null;
  }
}

// Continue in next file...

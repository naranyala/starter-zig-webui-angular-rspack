/**
 * Data Transformation Services - Angular Frontend
 * 
 * Comprehensive Angular DI services for data shape transformation,
 * conversion, and serialization that integrate with C3 backend.
 * 
 * @module DataTransformServices
 */

import { Injectable } from '@angular/core';
import { DataType, TypeDescriptor, TransformResult, TransformOptions, DateFormat, DateTimeConfig } from './data-transform.types';

// ============================================================================
// JSON Serialization Service
// ============================================================================

/**
 * JSON Serializer configuration
 */
export interface JsonSerializerConfig {
  prettyPrint: boolean;
  indentSize: number;
  skipNulls: boolean;
  dateAsIso: boolean;
  bigintAsString: boolean;
}

/**
 * JSON Serializer Service
 * 
 * Handles JSON serialization/deserialization between Angular and C3 backend
 */
@Injectable({ providedIn: 'root' })
export class JsonSerializerService {
  private config: JsonSerializerConfig = {
    prettyPrint: false,
    indentSize: 2,
    skipNulls: true,
    dateAsIso: true,
    bigintAsString: true,
  };

  constructor() {}

  /**
   * Configure serializer
   */
  configure(config: Partial<JsonSerializerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Serialize object to JSON string
   */
  serialize<T>(data: T): string {
    return JSON.stringify(data, this.replacer.bind(this), 
      this.config.prettyPrint ? this.config.indentSize : 0);
  }

  /**
   * Deserialize JSON string to object
   */
  deserialize<T>(json: string): TransformResult<T> {
    try {
      const data = JSON.parse(json, this.reviver.bind(this));
      return { data, success: true };
    } catch (error) {
      return { 
        data: null as any, 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
        errorCode: 400
      };
    }
  }

  /**
   * Pretty print JSON
   */
  pretty<T>(data: T): string {
    return JSON.stringify(data, this.replacer.bind(this), 2);
  }

  /**
   * Compact JSON (no whitespace)
   */
  compact<T>(data: T): string {
    return JSON.stringify(data, this.replacer.bind(this));
  }

  /**
   * JSON replacer for special types
   */
  private replacer(key: string, value: any): any {
    if (value === null || value === undefined) {
      return this.config.skipNulls ? undefined : value;
    }

    if (value instanceof Date) {
      return this.config.dateAsIso ? value.toISOString() : value.toJSON();
    }

    if (typeof value === 'bigint') {
      return this.config.bigintAsString ? value.toString() : Number(value);
    }

    return value;
  }

  /**
   * JSON reviver for special types
   */
  private reviver(key: string, value: any): any {
    if (typeof value === 'string') {
      // Try to parse ISO date strings
      const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
      if (isoDateRegex.test(value)) {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
    }
    return value;
  }
}

// ============================================================================
// Type Converter Service
// ============================================================================

/**
 * Type Converter Service
 * 
 * Converts between different data types with proper coercion
 */
@Injectable({ providedIn: 'root' })
export class TypeConverterService {
  private strictMode = false;
  private allowCoercion = true;

  constructor() {}

  /**
   * Convert to integer
   */
  toInt(value: any): number {
    if (typeof value === 'number') return Math.floor(value);
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? 0 : parsed;
    }
    if (typeof value === 'boolean') return value ? 1 : 0;
    return 0;
  }

  /**
   * Convert to long (number in JS)
   */
  toLong(value: any): number {
    return this.toInt(value);
  }

  /**
   * Convert to float
   */
  toFloat(value: any): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    if (typeof value === 'boolean') return value ? 1 : 0;
    return 0;
  }

  /**
   * Convert to double (number in JS)
   */
  toDouble(value: any): number {
    return this.toFloat(value);
  }

  /**
   * Convert to boolean
   */
  toBool(value: any): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      return ['true', '1', 'yes', 'on'].includes(lower);
    }
    return !!value;
  }

  /**
   * Convert to string
   */
  toString(value: any): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    return String(value);
  }

  /**
   * Convert to timestamp (milliseconds)
   */
  toTimestamp(value: any): number {
    if (typeof value === 'number') return value;
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'string') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? 0 : date.getTime();
    }
    return 0;
  }

  /**
   * Convert to ISO string
   */
  toIsoString(value: any): string {
    const timestamp = this.toTimestamp(value);
    return timestamp === 0 ? '' : new Date(timestamp).toISOString();
  }

  /**
   * Convert to integer array
   */
  toIntArray(value: any): number[] {
    if (!Array.isArray(value)) return [];
    return value.map(v => this.toInt(v));
  }

  /**
   * Convert to double array
   */
  toDoubleArray(value: any): number[] {
    if (!Array.isArray(value)) return [];
    return value.map(v => this.toDouble(v));
  }

  /**
   * Convert to string array
   */
  toStringArray(value: any): string[] {
    if (!Array.isArray(value)) return [];
    return value.map(v => this.toString(v));
  }
}

// ============================================================================
// Date/Time Service
// ============================================================================

/**
 * Date Time Service
 *
 * Comprehensive date/time parsing, formatting, and transformation
 */
@Injectable({ providedIn: 'root' })
export class DateTimeService {
  private config: DateTimeConfig = {
    timezone: 'UTC',
    outputFormat: DateFormat.ISO,
    locale: 'en-US',
  };

  constructor() {}

  /**
   * Configure date time service
   */
  configure(config: Partial<DateTimeConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Parse date from various formats
   */
  parse(input: any): Date | null {
    if (input instanceof Date) return input;
    if (typeof input === 'number') return new Date(input);
    if (typeof input === 'string') {
      const date = new Date(input);
      return isNaN(date.getTime()) ? null : date;
    }
    return null;
  }

  /**
   * Parse ISO string
   */
  parseIso(isoString: string): Date | null {
    return this.parse(isoString);
  }

  /**
   * Parse RFC 2822 string
   */
  parseRfc(rfcString: string): Date | null {
    return this.parse(rfcString);
  }

  /**
   * Parse Unix timestamp (seconds)
   */
  parseUnix(unixTime: number): Date {
    return new Date(unixTime * 1000);
  }

  /**
   * Parse Unix timestamp in milliseconds
   */
  parseTimestamp(timestamp: number): Date {
    return new Date(timestamp);
  }

  /**
   * Format date to string
   */
  format(date: Date | number | string): string {
    const d = this.parse(date);
    if (!d) return '';

    switch (this.config.outputFormat) {
      case DateFormat.ISO:
        return d.toISOString();
      case DateFormat.ISO_LOCAL:
        return d.toLocaleDateString(this.config.locale);
      case DateFormat.RFC2822:
        return d.toUTCString();
      case DateFormat.UNIX_TIMESTAMP:
        return Math.floor(d.getTime() / 1000).toString();
      case DateFormat.UNIX_TIMESTAMP_MS:
        return d.getTime().toString();
      default:
        return d.toString();
    }
  }

  /**
   * Format to ISO string
   */
  formatIso(date: Date | number | string): string {
    const d = this.parse(date);
    return d ? d.toISOString() : '';
  }

  /**
   * Format to RFC 2822 string
   */
  formatRfc(date: Date | number | string): string {
    const d = this.parse(date);
    return d ? d.toUTCString() : '';
  }

  /**
   * Format to relative time (e.g., "2 hours ago")
   */
  formatRelative(date: Date | number | string): string {
    const d = this.parse(date);
    if (!d) return '';

    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;
    if (diffMonths < 12) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
    return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
  }

  /**
   * Convert to UTC
   */
  toUtc(date: Date | number | string): Date | null {
    const d = this.parse(date);
    if (!d) return null;
    return new Date(d.toISOString());
  }

  /**
   * Convert to local time
   */
  toLocal(date: Date | number | string): Date | null {
    return this.parse(date);
  }

  /**
   * Convert to specific timezone
   */
  toTimezone(date: Date | number | string, timezone: string): string {
    const d = this.parse(date);
    if (!d) return '';
    
    try {
      return d.toLocaleString(this.config.locale, { timeZone: timezone });
    } catch {
      return d.toString();
    }
  }

  /**
   * Get year
   */
  getYear(date: Date | number | string): number {
    const d = this.parse(date);
    return d ? d.getFullYear() : 0;
  }

  /**
   * Get month (1-12)
   */
  getMonth(date: Date | number | string): number {
    const d = this.parse(date);
    return d ? d.getMonth() + 1 : 0;
  }

  /**
   * Get day of month (1-31)
   */
  getDay(date: Date | number | string): number {
    const d = this.parse(date);
    return d ? d.getDate() : 0;
  }

  /**
   * Get hour (0-23)
   */
  getHour(date: Date | number | string): number {
    const d = this.parse(date);
    return d ? d.getHours() : 0;
  }

  /**
   * Get minute (0-59)
   */
  getMinute(date: Date | number | string): number {
    const d = this.parse(date);
    return d ? d.getMinutes() : 0;
  }

  /**
   * Get second (0-59)
   */
  getSecond(date: Date | number | string): number {
    const d = this.parse(date);
    return d ? d.getSeconds() : 0;
  }

  /**
   * Validate date
   */
  isValid(input: any): boolean {
    const d = this.parse(input);
    return d !== null && !isNaN(d.getTime());
  }

  /**
   * Validate ISO string
   */
  isValidIso(isoString: string): boolean {
    return this.isValid(isoString);
  }

  /**
   * Validate timestamp
   */
  isValidTimestamp(timestamp: number): boolean {
    return !isNaN(timestamp) && isFinite(timestamp);
  }
}

// ============================================================================
// Number Format Service
// ============================================================================

/**
 * Number format options
 */
export interface NumberFormatOptions {
  decimalPlaces?: number;
  decimalSeparator?: string;
  thousandsSeparator?: string;
  prefix?: string;
  suffix?: string;
  showThousands?: boolean;
  showSign?: boolean;
  roundHalfUp?: boolean;
}

/**
 * Number Format Service
 * 
 * Number formatting for display and parsing
 */
@Injectable({ providedIn: 'root' })
export class NumberFormatService {
  private options: NumberFormatOptions = {
    decimalPlaces: 2,
    decimalSeparator: '.',
    thousandsSeparator: ',',
    showThousands: true,
    showSign: false,
    roundHalfUp: true,
  };

  private locale = 'en-US';

  constructor() {}

  /**
   * Configure number format
   */
  configure(options: Partial<NumberFormatOptions>, locale?: string): void {
    this.options = { ...this.options, ...options };
    if (locale) this.locale = locale;
  }

  /**
   * Format integer
   */
  formatInt(value: number): string {
    return value.toLocaleString(this.locale);
  }

  /**
   * Format long/number
   */
  formatLong(value: number): string {
    return value.toLocaleString(this.locale);
  }

  /**
   * Format float/number with decimals
   */
  formatFloat(value: number): string {
    return this.formatDouble(value);
  }

  /**
   * Format double with configurable decimals
   */
  formatDouble(value: number): string {
    return value.toLocaleString(this.locale, {
      minimumFractionDigits: this.options.decimalPlaces,
      maximumFractionDigits: this.options.decimalPlaces,
    });
  }

  /**
   * Format with specific decimal places
   */
  formatDecimal(value: number, places: number): string {
    return value.toLocaleString(this.locale, {
      minimumFractionDigits: places,
      maximumFractionDigits: places,
    });
  }

  /**
   * Format as currency
   */
  formatCurrency(value: number, currencyCode: string): string {
    return value.toLocaleString(this.locale, {
      style: 'currency',
      currency: currencyCode,
    });
  }

  /**
   * Format as USD
   */
  formatUsd(value: number): string {
    return this.formatCurrency(value, 'USD');
  }

  /**
   * Format as EUR
   */
  formatEur(value: number): string {
    return this.formatCurrency(value, 'EUR');
  }

  /**
   * Format as GBP
   */
  formatGbp(value: number): string {
    return this.formatCurrency(value, 'GBP');
  }

  /**
   * Format as JPY
   */
  formatJpy(value: number): string {
    return this.formatCurrency(value, 'JPY');
  }

  /**
   * Format as percentage
   */
  formatPercent(value: number, places: number = 1): string {
    return value.toLocaleString(this.locale, {
      style: 'percent',
      minimumFractionDigits: places,
      maximumFractionDigits: places,
    });
  }

  /**
   * Format in scientific notation
   */
  formatScientific(value: number): string {
    return value.toExponential();
  }

  /**
   * Parse formatted number
   */
  parse(formatted: string): number {
    const cleaned = formatted.replace(/[^\d.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Parse formatted integer
   */
  parseInt(formatted: string): number {
    return Math.floor(this.parse(formatted));
  }

  /**
   * Validate number string
   */
  isValid(input: string): boolean {
    const parsed = this.parse(input);
    return !isNaN(parsed) && isFinite(parsed);
  }

  /**
   * Check if integer
   */
  isInteger(value: number): boolean {
    return Number.isInteger(value);
  }

  /**
   * Check if finite
   */
  isFinite(value: number): boolean {
    return Number.isFinite(value);
  }

  /**
   * Check if NaN
   */
  isNaN(value: number): boolean {
    return Number.isNaN(value);
  }

  /**
   * Round to decimal places
   */
  round(value: number, places: number): number {
    const multiplier = Math.pow(10, places);
    return Math.round(value * multiplier) / multiplier;
  }

  /**
   * Floor
   */
  floor(value: number): number {
    return Math.floor(value);
  }

  /**
   * Ceiling
   */
  ceil(value: number): number {
    return Math.ceil(value);
  }

  /**
   * Truncate
   */
  trunc(value: number): number {
    return Math.trunc(value);
  }
}

// Continue in next part due to length...

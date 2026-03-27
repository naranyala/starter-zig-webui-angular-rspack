/**
 * Validation Service
 *
 * Data validation with comprehensive rule system
 */
import { Injectable } from '@angular/core';
import { ValidationRule, ValidationResult } from './data-transform.types';

@Injectable({ providedIn: 'root' })
export class ValidationService {
  private rules: ValidationRule[] = [];
  private stopOnFirstError = false;

  /**
   * Add validation rule
   */
  addRule(field: string, ruleType: string, message: string, params?: any): void {
    this.rules.push({ field, ruleType, message, params });
  }

  /**
   * Add custom rule
   */
  addCustomRule(field: string, validatorFn: (value: any) => boolean, message: string): void {
    this.rules.push({ field, ruleType: 'custom', message, validatorFn });
  }

  /**
   * Clear all rules
   */
  clearRules(): void {
    this.rules = [];
  }

  /**
   * Validate data
   */
  validate<T>(data: T): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      fieldErrors: {},
      warnings: [],
    };

    for (const rule of this.rules) {
      const value = (data as any)[rule.field];
      let isValid = true;

      switch (rule.ruleType) {
        case 'required':
          isValid = ValidationService.required(value);
          break;
        case 'minLength':
          isValid = ValidationService.minLength(value, rule.params);
          break;
        case 'maxLength':
          isValid = ValidationService.maxLength(value, rule.params);
          break;
        case 'min':
          isValid = ValidationService.min(value, rule.params);
          break;
        case 'max':
          isValid = ValidationService.max(value, rule.params);
          break;
        case 'pattern':
          isValid = ValidationService.pattern(value, rule.params);
          break;
        case 'email':
          isValid = ValidationService.email(value);
          break;
        case 'url':
          isValid = ValidationService.url(value);
          break;
        case 'phone':
          isValid = ValidationService.phone(value);
          break;
        case 'date':
          isValid = ValidationService.date(value);
          break;
        case 'numeric':
          isValid = ValidationService.numeric(value);
          break;
        case 'integer':
          isValid = ValidationService.integer(value);
          break;
        case 'boolean':
          isValid = ValidationService.boolean(value);
          break;
        case 'inArray':
          isValid = ValidationService.inArray(value, rule.params);
          break;
        case 'custom':
          isValid = rule.validatorFn ? rule.validatorFn(value) : true;
          break;
      }

      if (!isValid) {
        result.isValid = false;
        result.errors.push(rule.message);
        if (!result.fieldErrors[rule.field]) {
          result.fieldErrors[rule.field] = [];
        }
        result.fieldErrors[rule.field].push(rule.message);

        if (this.stopOnFirstError) {
          return result;
        }
      }
    }

    return result;
  }

  /**
   * Check if valid
   */
  isValid<T>(data: T): boolean {
    return this.validate(data).isValid;
  }

  /**
   * Get errors for field
   */
  getFieldErrors(field: string): string[] {
    const result = this.validate({} as any);
    return result.fieldErrors[field] || [];
  }

  // ========== Built-in Validators ==========

  static required(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  }

  static minLength(value: string, min: number): boolean {
    if (!value) return false;
    return value.length >= min;
  }

  static maxLength(value: string, max: number): boolean {
    if (!value) return true;
    return value.length <= max;
  }

  static min(value: number, min: number): boolean {
    if (value === null || value === undefined) return false;
    return Number(value) >= min;
  }

  static max(value: number, max: number): boolean {
    if (value === null || value === undefined) return false;
    return Number(value) <= max;
  }

  static pattern(value: string, pattern: string | RegExp): boolean {
    if (!value) return false;
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    return regex.test(value);
  }

  static email(value: string): boolean {
    if (!value) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }

  static url(value: string): boolean {
    if (!value) return false;
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  static phone(value: string): boolean {
    if (!value) return false;
    const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
    return phoneRegex.test(value);
  }

  static date(value: any): boolean {
    if (!value) return false;
    const date = new Date(value);
    return !isNaN(date.getTime());
  }

  static numeric(value: any): boolean {
    if (value === null || value === undefined) return false;
    return !isNaN(Number(value));
  }

  static integer(value: any): boolean {
    if (value === null || value === undefined) return false;
    return Number.isInteger(Number(value));
  }

  static boolean(value: any): boolean {
    return typeof value === 'boolean';
  }

  static inArray(value: any, allowed: any[]): boolean {
    return allowed.includes(value);
  }

  // ========== Sanitization ==========

  static sanitizeString(input: string): string {
    return input.trim().replace(/\s+/g, ' ');
  }

  static sanitizeHtml(input: string): string {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  }

  static sanitizeXss(input: string): string {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  static sanitizeSql(input: string): string {
    return input.replace(/['";\\]/g, '');
  }
}

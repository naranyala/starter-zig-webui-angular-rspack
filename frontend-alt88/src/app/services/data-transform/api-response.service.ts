/**
 * API Response Service
 *
 * Standardized API response handling
 */
import { Injectable } from '@angular/core';
import { ApiResponse, ValidationResult } from './data-transform.types';
import { ErrorResponse } from './dto.service';

export interface StandardApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: number;
  requestId?: string;
  timestamp?: number;
  errors?: string[];
}

@Injectable({ providedIn: 'root' })
export class ApiResponseService {
  private includeTimestamp = true;
  private includeRequestId = true;
  private defaultSuccessCode = 200;
  private defaultErrorCode = 500;

  /**
   * Create success response
   */
  success<T>(data: T): StandardApiResponse<T> {
    return this.buildResponse({
      success: true,
      data,
      code: this.defaultSuccessCode,
    });
  }

  /**
   * Create success response with message
   */
  successMessage<T>(data: T, message: string): StandardApiResponse<T> {
    return this.buildResponse({
      success: true,
      data,
      message,
      code: this.defaultSuccessCode,
    });
  }

  /**
   * Create error response
   */
  error(message: string, code: number = this.defaultErrorCode): StandardApiResponse<null> {
    return this.buildResponse({
      success: false,
      error: message,
      code,
    });
  }

  /**
   * Create detailed error response
   */
  errorDetailed(message: string, code: number, errors: string[]): StandardApiResponse<null> {
    return this.buildResponse({
      success: false,
      error: message,
      code,
      errors,
    });
  }

  /**
   * Create not found response
   */
  notFound(resource: string = 'Resource'): StandardApiResponse<null> {
    return this.error(`${resource} not found`, 404);
  }

  /**
   * Create unauthorized response
   */
  unauthorized(): StandardApiResponse<null> {
    return this.error('Unauthorized', 401);
  }

  /**
   * Create forbidden response
   */
  forbidden(): StandardApiResponse<null> {
    return this.error('Forbidden', 403);
  }

  /**
   * Create validation error response
   */
  validationError(validation: ValidationResult): StandardApiResponse<null> {
    const errors = Object.entries(validation.fieldErrors).flatMap(
      ([field, messages]: [string, string[]]) => messages.map((m: string) => `${field}: ${m}`)
    );
    return this.errorDetailed('Validation failed', 400, errors);
  }

  /**
   * Create bad request response
   */
  badRequest(message: string = 'Bad request'): StandardApiResponse<null> {
    return this.error(message, 400);
  }

  /**
   * Create conflict response
   */
  conflict(message: string = 'Conflict'): StandardApiResponse<null> {
    return this.error(message, 409);
  }

  /**
   * Create too many requests response
   */
  tooManyRequests(message: string = 'Too many requests'): StandardApiResponse<null> {
    return this.error(message, 429);
  }

  /**
   * Parse HTTP response
   */
  parseHttpResponse<T>(response: any): StandardApiResponse<T> {
    if (typeof response === 'string') {
      try {
        response = JSON.parse(response);
      } catch {
        return this.error('Invalid response format') as StandardApiResponse<T>;
      }
    }

    return response as StandardApiResponse<T>;
  }

  /**
   * Check if response is successful
   */
  isSuccess<T>(response: StandardApiResponse<T>): boolean {
    return response.success === true;
  }

  /**
   * Check if response is error
   */
  isError<T>(response: StandardApiResponse<T>): boolean {
    return response.success === false;
  }

  /**
   * Extract data from response
   */
  extractData<T>(response: StandardApiResponse<T>): T | null {
    return response.success ? response.data || null : null;
  }

  /**
   * Extract error from response
   */
  extractError<T>(response: StandardApiResponse<T>): string | null {
    return response.success ? null : response.error || null;
  }

  /**
   * Build response with common fields
   */
  private buildResponse<T>(response: Partial<StandardApiResponse<T>>): StandardApiResponse<T> {
    const result: StandardApiResponse<T> = {
      success: response.success ?? false,
    };

    if (response.data !== undefined) {
      result.data = response.data;
    }

    if (response.message) {
      result.message = response.message;
    }

    if (response.error) {
      result.error = response.error;
    }

    if (response.code) {
      result.code = response.code;
    }

    if (response.errors) {
      result.errors = response.errors;
    }

    if (this.includeRequestId) {
      result.requestId = this.generateRequestId();
    }

    if (this.includeTimestamp) {
      result.timestamp = Date.now();
    }

    return result;
  }

  /**
   * Generate request ID
   */
  private generateRequestId(): string {
    return 'req_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  }
}

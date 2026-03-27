/**
 * Error Tracking Service
 * 
 * Captures, logs, and reports errors to a tracking service (e.g., Sentry).
 * Supports offline queuing and batch reporting.
 * 
 * @module core/error-tracking
 */

import { Injectable, signal, computed, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ErrorHandler } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';

// ============================================
// Types & Interfaces
// ============================================

export interface ErrorEvent {
  id: string;
  type: 'error' | 'warning' | 'info' | 'critical';
  message: string;
  stack?: string;
  context: ErrorContext;
  timestamp: number;
  user?: UserInfo;
  tags: Record<string, string>;
  extra: Record<string, unknown>;
}

export interface ErrorContext {
  url: string;
  userAgent: string;
  language: string;
  platform: string;
  screenResolution: string;
  memoryUsage?: number;
}

export interface UserInfo {
  id?: string;
  username?: string;
  email?: string;
}

export interface ErrorReport {
  events: ErrorEvent[];
  appVersion: string;
  environment: string;
  release: string;
}

export interface ErrorTrackingConfig {
  enabled: boolean;
  dsn: string;
  environment: string;
  release: string;
  sampleRate: number; // 0-1, percentage of errors to report
  maxQueueSize: number;
  autoReport: boolean;
  offlineEnabled: boolean;
}

export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

// ============================================
// Error Tracking Service
// ============================================

@Injectable({ providedIn: 'root' })
export class ErrorTrackingService {
  private readonly defaultConfig: ErrorTrackingConfig = {
    enabled: true,
    dsn: '', // Would be set via environment
    environment: 'development',
    release: '0.1.0',
    sampleRate: 1.0,
    maxQueueSize: 50,
    autoReport: true,
    offlineEnabled: true,
  };

  private config: ErrorTrackingConfig = { ...this.defaultConfig };
  private errorQueue: ErrorEvent[] = [];
  private userContext: UserInfo | null = null;
  private globalTags: Record<string, string> = {};
  private flushTimer: any = null;

  // Signals for reactive state
  private readonly errorCount = signal(0);
  private readonly lastError = signal<ErrorEvent | null>(null);
  private readonly isOnline = signal(navigator.onLine);
  private readonly queueLength = signal(0);

  // Public readonly signals
  readonly errorCount$ = this.errorCount.asReadonly();
  readonly lastError$ = this.lastError.asReadonly();
  readonly isOnline$ = this.isOnline.asReadonly();
  readonly queueLength$ = this.queueLength.asReadonly();

  // Computed signals
  readonly hasErrors = computed(() => this.errorCount() > 0);
  readonly hasQueuedErrors = computed(() => this.queueLength() > 0);

  constructor(
    private http: HttpClient,
    private ngZone: NgZone
  ) {
    this.loadConfig();
    this.setupGlobalErrorHandler();
    this.setupOnlineListener();
    
    // Periodic flush
    this.startPeriodicFlush();
  }

  // ============================================
  // Configuration
  // ============================================

  /**
   * Initialize error tracking with configuration
   */
  initialize(config: Partial<ErrorTrackingConfig>): void {
    this.config = { ...this.config, ...config };
    this.saveConfig();
    
    if (!this.config.enabled) {
      console.log('[ErrorTracking] Disabled');
      return;
    }

    console.log(`[ErrorTracking] Initialized (env: ${this.config.environment})`);
  }

  /**
   * Set user context for error reports
   */
  setUser(user: UserInfo): void {
    this.userContext = user;
  }

  /**
   * Clear user context
   */
  clearUser(): void {
    this.userContext = null;
  }

  /**
   * Set global tags for all errors
   */
  setTag(key: string, value: string): void {
    this.globalTags[key] = value;
  }

  /**
   * Load configuration from storage
   */
  private loadConfig(): void {
    try {
      const stored = localStorage.getItem('error_tracking_config');
      if (stored) {
        this.config = { ...this.defaultConfig, ...JSON.parse(stored) };
      }
    } catch {
      // Use defaults
    }
  }

  /**
   * Save configuration to storage
   */
  private saveConfig(): void {
    try {
      localStorage.setItem('error_tracking_config', JSON.stringify(this.config));
    } catch {
      // Ignore
    }
  }

  // ============================================
  // Error Capture
  // ============================================

  /**
   * Capture an error
   */
  capture(error: Error | string, options?: {
    type?: ErrorEvent['type'];
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    severity?: ErrorSeverity;
  }): ErrorEvent {
    const event = this.createErrorEvent(error, options);
    
    this.errorCount.update(count => count + 1);
    this.lastError.set(event);
    
    // Add to queue
    this.addToQueue(event);
    
    // Auto-report if enabled and online
    if (this.config.autoReport && this.isOnline()) {
      this.report(event);
    }
    
    return event;
  }

  /**
   * Capture exception
   */
  captureException(exception: Error, options?: Partial<ErrorEvent>): ErrorEvent {
    return this.capture(exception, {
      type: 'error',
      tags: options?.tags,
      extra: options?.extra,
    });
  }

  /**
   * Capture message
   */
  captureMessage(message: string, level: ErrorEvent['type'] = 'info'): ErrorEvent {
    return this.capture(message, { type: level });
  }

  /**
   * Create error event from error object
   */
  private createErrorEvent(
    error: Error | string,
    options?: {
      type?: ErrorEvent['type'];
      tags?: Record<string, string>;
      extra?: Record<string, unknown>;
    }
  ): ErrorEvent {
    const isErrorObj = error instanceof Error;
    
    return {
      id: this.generateId(),
      type: options?.type || 'error',
      message: isErrorObj ? error.message : error,
      stack: isErrorObj ? error.stack : undefined,
      context: this.captureContext(),
      timestamp: Date.now(),
      user: this.userContext || undefined,
      tags: { ...this.globalTags, ...options?.tags },
      extra: options?.extra || {},
    };
  }

  /**
   * Capture current context
   */
  private captureContext(): ErrorContext {
    return {
      url: window.location.href,
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${screen.width}x${screen.height}`,
      memoryUsage: (performance as any).memory?.usedJSHeapSize,
    };
  }

  // ============================================
  // Queue Management
  // ============================================

  /**
   * Add error to queue
   */
  private addToQueue(event: ErrorEvent): void {
    // Check queue size limit
    if (this.errorQueue.length >= this.config.maxQueueSize) {
      // Remove oldest error
      this.errorQueue.shift();
    }
    
    this.errorQueue.push(event);
    this.queueLength.set(this.errorQueue.length);
    
    // Save to localStorage if offline enabled
    if (this.config.offlineEnabled) {
      this.saveQueue();
    }
  }

  /**
   * Save queue to localStorage
   */
  private saveQueue(): void {
    try {
      localStorage.setItem('error_queue', JSON.stringify(this.errorQueue));
    } catch {
      // Storage full or unavailable
    }
  }

  /**
   * Load queue from localStorage
   */
  private loadQueue(): void {
    try {
      const stored = localStorage.getItem('error_queue');
      if (stored) {
        this.errorQueue = JSON.parse(stored);
        this.queueLength.set(this.errorQueue.length);
      }
    } catch {
      this.errorQueue = [];
    }
  }

  /**
   * Clear error queue
   */
  clearQueue(): void {
    this.errorQueue = [];
    this.queueLength.set(0);
    localStorage.removeItem('error_queue');
  }

  // ============================================
  // Error Reporting
  // ============================================

  /**
   * Report error to tracking service
   */
  report(event: ErrorEvent): Observable<boolean> {
    if (!this.config.enabled || !this.config.dsn) {
      return of(false);
    }

    // Sample rate check
    if (Math.random() > this.config.sampleRate) {
      return of(false);
    }

    const report: ErrorReport = {
      events: [event],
      appVersion: this.config.release,
      environment: this.config.environment,
      release: this.config.release,
    };

    return this.http.post(this.config.dsn, report).pipe(
      tap(() => {
        // Remove from queue on success
        const index = this.errorQueue.findIndex(e => e.id === event.id);
        if (index !== -1) {
          this.errorQueue.splice(index, 1);
          this.queueLength.set(this.errorQueue.length);
          this.saveQueue();
        }
      }),
      map(() => true),
      catchError(() => of(false))
    );
  }

  /**
   * Flush queued errors
   */
  flush(): Observable<number> {
    if (!this.isOnline() || this.errorQueue.length === 0) {
      return of(0);
    }

    const report: ErrorReport = {
      events: [...this.errorQueue],
      appVersion: this.config.release,
      environment: this.config.environment,
      release: this.config.release,
    };

    return this.http.post(this.config.dsn, report).pipe(
      tap(() => {
        this.clearQueue();
      }),
      map(() => report.events.length),
      catchError(() => of(0))
    );
  }

  /**
   * Start periodic flush
   */
  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      if (this.isOnline() && this.errorQueue.length > 0) {
        this.ngZone.run(() => {
          this.flush().subscribe();
        });
      }
    }, 60000); // Every minute
  }

  // ============================================
  // Global Error Handler
  // ============================================

  /**
   * Setup global error handler
   */
  private setupGlobalErrorHandler(): void {
    // Angular error handler
    const originalHandler = window.onerror;
    
    window.onerror = (message, source, lineno, colno, error) => {
      this.capture(error || new Error(String(message)), {
        type: 'critical',
        extra: { source, lineno, colno },
      });
      
      if (originalHandler) {
        originalHandler(message, source, lineno, colno, error);
      }
    };

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      this.capture(event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason)), {
        type: 'critical',
        extra: { unhandledRejection: true },
      });
    });
  }

  /**
   * Setup online/offline listener
   */
  private setupOnlineListener(): void {
    window.addEventListener('online', () => {
      this.isOnline.set(true);
      // Flush queued errors
      this.flush().subscribe();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline.set(false);
    });
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get error statistics
   */
  getStats(): { total: number; queued: number; byType: Record<string, number> } {
    const byType: Record<string, number> = {};
    
    this.errorQueue.forEach(event => {
      byType[event.type] = (byType[event.type] || 0) + 1;
    });
    
    return {
      total: this.errorCount(),
      queued: this.queueLength(),
      byType,
    };
  }

  /**
   * Stop error tracking
   */
  stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }
}

// ============================================
// Angular Error Handler Integration
// ============================================

@Injectable()
export class TrackingErrorHandler implements ErrorHandler {
  constructor(private errorTracking: ErrorTrackingService) {}

  handleError(error: any): void {
    this.errorTracking.captureException(error);
    
    // Re-throw to maintain Angular's default behavior
    throw error;
  }
}

// ============================================
// HTTP Error Interceptor
// ============================================

import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { throwError } from 'rxjs';

export function errorTrackingInterceptorFactory(
  errorTracking: ErrorTrackingService
): HttpInterceptorFn {
  return (req, next) => {
    return next(req).pipe(
      catchError((error: HttpErrorResponse) => {
        // Capture HTTP errors
        errorTracking.capture(`HTTP ${error.status}: ${error.message}`, {
          type: 'warning',
          tags: { http_status: String(error.status) },
          extra: {
            url: req.url,
            method: req.method,
            status: error.status,
            statusText: error.statusText,
          },
        });
        
        return throwError(() => error);
      })
    );
  };
}

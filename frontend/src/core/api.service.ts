// Modern API service with signals for backend communication
// Supports both WebUI bridge (desktop) and HTTP fallback (web deployment)
// SECURITY: Includes input validation and function whitelisting
import { Injectable, signal, computed } from '@angular/core';
import { DEFAULT_TIMEOUT_MS } from '../app/constants/app.constants';

export type CommunicationMode = 'webui' | 'http' | 'auto';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: number;
}

export interface CallOptions {
  timeoutMs?: number;
  forceHttp?: boolean;
}

export interface ApiState {
  loading: boolean;
  error: string | null;
  lastCallTime: number | null;
  callCount: number;
  communicationMode: CommunicationMode;
  httpAvailable: boolean;
}

// SECURITY: Whitelist of allowed backend functions
const ALLOWED_FUNCTIONS = [
  // User operations
  'getUsers', 'getUserStats', 'createUser', 'deleteUser', 'updateUser', 'forceDeleteUser',
  // Product operations
  'getProducts',
  // Order operations
  'getOrders',
  // DuckDB operations
  'duckdbGetUsers', 'duckdbCreateUser', 'duckdbDeleteUser', 'duckdbExecuteQuery',
  // SQLite operations
  'sqliteExecuteQuery',
  // Core operations
  'ping', 'getData', 'emitEvent',
];

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly defaultTimeout = DEFAULT_TIMEOUT_MS;
  private httpBaseUrl = '/api';

  // Communication mode - auto-detect or manual override
  private communicationMode: CommunicationMode = 'auto';
  private httpAvailable = false;

  // Internal state signals
  private readonly loading = signal(false);
  private readonly error = signal<string | null>(null);
  private readonly lastCallTime = signal<number | null>(null);
  private readonly callCount = signal(0);
  private readonly mode = signal<CommunicationMode>('auto');

  // Public readonly signals
  readonly isLoading = this.loading.asReadonly();
  readonly error$ = this.error.asReadonly();
  readonly lastCallTime$ = this.lastCallTime.asReadonly();
  readonly callCount$ = this.callCount.asReadonly();
  readonly communicationMode$ = this.mode.asReadonly();

  // Computed signals
  readonly hasError = computed(() => this.error() !== null);
  readonly isReady = computed(() => !this.loading() && this.error() === null);
  readonly isWebUIMode = computed(() => this.mode() === 'webui');
  readonly isHttpMode = computed(() => this.mode() === 'http');

  constructor() {
    this.detectCommunicationMode();
  }

  /**
   * Detect available communication method
   */
  private detectCommunicationMode(): void {
    // Check if WebUI is available (desktop environment)
    const isWebUIAvailable = typeof window !== 'undefined' &&
      typeof (window as unknown as Record<string, unknown>)['webui'] !== 'undefined';

    if (isWebUIAvailable) {
      this.setMode('webui');
    } else {
      // Try HTTP as fallback
      this.checkHttpAvailability().then(available => {
        if (available) {
          this.setMode('http');
        } else {
          console.warn('[ApiService] No communication method available');
          this.setMode('webui'); // Default to webui
        }
      });
    }
  }

  /**
   * Check if HTTP endpoints are available
   */
  private async checkHttpAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${this.httpBaseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      this.httpAvailable = response.ok;
      return this.httpAvailable;
    } catch {
      this.httpAvailable = false;
      return false;
    }
  }

  /**
   * Set communication mode manually
   */
  setMode(mode: CommunicationMode): void {
    this.communicationMode = mode;
    this.mode.set(mode);
    console.log(`[ApiService] Communication mode set to: ${mode}`);
  }

  /**
   * Force use of HTTP communication
   */
  useHttp(baseUrl?: string): void {
    if (baseUrl) {
      this.httpBaseUrl = baseUrl;
    }
    this.setMode('http');
  }

  /**
   * Force use of WebUI bridge
   */
  useWebUI(): void {
    this.setMode('webui');
  }

  /**
   * Get current communication mode
   */
  getMode(): CommunicationMode {
    return this.communicationMode;
  }

  /**
   * Determine which communication method to use
   */
  private getEffectiveMode(options?: CallOptions): CommunicationMode {
    if (options?.forceHttp) {
      return 'http';
    }

    if (this.communicationMode === 'auto') {
      return this.httpAvailable ? 'http' : 'webui';
    }

    return this.communicationMode;
  }

  /**
   * SECURITY: Validate function name against whitelist
   */
  private validateFunctionName(functionName: string): void {
    if (!ALLOWED_FUNCTIONS.includes(functionName)) {
      const error = `Function not allowed: ${functionName}`;
      console.error('[ApiService] Security violation:', error);
      throw new Error(error);
    }
  }

  /**
   * SECURITY: Sanitize error messages from backend
   */
  private sanitizeErrorMessage(error: string): string {
    // Remove potential script tags and HTML
    return error
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .substring(0, 500); // Limit length
  }

  /**
   * Call backend function via WebUI bridge (desktop)
   */
  private async callWebUI<T>(functionName: string, args: unknown[], options?: CallOptions): Promise<ApiResponse<T>> {
    // SECURITY: Validate function name
    this.validateFunctionName(functionName);

    const timeoutMs = options?.timeoutMs ?? this.defaultTimeout;
    const responseEventName = `${functionName}_response`;

    return new Promise((resolve, reject) => {
      const handler = (event: CustomEvent<ApiResponse<T>>) => {
        clearTimeout(timeoutId);
        window.removeEventListener(responseEventName, handler as EventListener);

        this.loading.set(false);
        this.lastCallTime.set(Date.now());

        if (!event.detail.success) {
          // SECURITY: Sanitize error message
          const sanitizedError = this.sanitizeErrorMessage(event.detail.error ?? 'Unknown error');
          this.error.set(sanitizedError);
        }

        resolve(event.detail);
      };

      const timeoutId = setTimeout(() => {
        window.removeEventListener(responseEventName, handler as EventListener);
        this.loading.set(false);
        const errorMsg = `Request timeout after ${timeoutMs}ms`;
        this.error.set(errorMsg);

        reject({
          success: false,
          error: errorMsg,
        });
      }, timeoutMs);

      try {
        const backendFn = (window as unknown as Record<string, unknown>)[functionName];

        if (typeof backendFn !== 'function') {
          clearTimeout(timeoutId);
          window.removeEventListener(responseEventName, handler as EventListener);
          this.loading.set(false);
          const errorMsg = `Backend function not found: ${functionName}`;
          this.error.set(errorMsg);

          reject({
            success: false,
            error: errorMsg,
          });
          return;
        }

        backendFn(...args);
      } catch (error) {
        clearTimeout(timeoutId);
        window.removeEventListener(responseEventName, handler as EventListener);
        this.loading.set(false);
        const errorMsg = error instanceof Error ? this.sanitizeErrorMessage(error.message) : String(error);
        this.error.set(errorMsg);

        reject({
          success: false,
          error: errorMsg,
        });
      }
    });
  }

  /**
   * Call backend function via HTTP (web deployment)
   */
  private async callHttp<T>(functionName: string, args: unknown[], options?: CallOptions): Promise<ApiResponse<T>> {
    const timeoutMs = options?.timeoutMs ?? this.defaultTimeout;

    try {
      const response = await fetch(`${this.httpBaseUrl}/${functionName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(args),
        signal: AbortSignal.timeout(timeoutMs),
      });

      this.loading.set(false);
      this.lastCallTime.set(Date.now());

      if (!response.ok) {
        const errorText = await response.text();
        this.error.set(`HTTP ${response.status}: ${errorText}`);
        
        return {
          success: false,
          error: `HTTP ${response.status}: ${errorText}`,
        };
      }

      const data = await response.json() as ApiResponse<T>;
      return data;
    } catch (error) {
      this.loading.set(false);
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.error.set(errorMsg);
      
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * Call a backend function with automatic communication method selection
   * and fallback support
   */
  async call<T>(functionName: string, args: unknown[] = [], options?: CallOptions): Promise<ApiResponse<T>> {
    this.loading.set(true);
    this.error.set(null);
    this.callCount.update(count => count + 1);
    
    const effectiveMode = this.getEffectiveMode(options);
    this.mode.set(effectiveMode);

    try {
      if (effectiveMode === 'http') {
        return await this.callHttp<T>(functionName, args, options);
      } else {
        return await this.callWebUI<T>(functionName, args, options);
      }
    } catch (error) {
      // Try fallback if primary method fails
      if (effectiveMode === 'webui' && this.httpAvailable) {
        console.warn(`[ApiService] WebUI call failed, trying HTTP fallback for ${functionName}`);
        this.mode.set('http');
        return await this.callHttp<T>(functionName, args, options);
      }
      
      throw error;
    }
  }

  /**
   * Call backend and throw on error
   */
  async callOrThrow<T>(functionName: string, args: unknown[] = []): Promise<T> {
    const response = await this.call<T>(functionName, args);
    if (!response.success) {
      throw new Error(response.error ?? 'Unknown error');
    }
    return response.data as T;
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.error.set(null);
  }

  /**
   * Reset all state
   */
  reset(): void {
    this.loading.set(false);
    this.error.set(null);
    this.lastCallTime.set(null);
    this.callCount.set(0);
  }
}

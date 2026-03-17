// API Service using WebUI Native Bridge - NO HTTP/HTTPS
// All communication goes through WebUI's WebSocket bridge
import { Injectable, signal, computed, inject } from '@angular/core';
import { WebuiBridgeService } from './webui-bridge.service';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CallOptions {
  timeoutMs?: number;
}

export interface ApiState {
  loading: boolean;
  error: string | null;
  lastCallTime: number | null;
  callCount: number;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly defaultTimeout = 30000;
  private readonly webui = inject(WebuiBridgeService);

  // Internal state signals
  private readonly loading = signal(false);
  private readonly error = signal<string | null>(null);
  private readonly lastCallTime = signal<number | null>(null);
  private readonly callCount = signal(0);

  // Public readonly signals
  readonly isLoading = this.loading.asReadonly();
  readonly error$ = this.error.asReadonly();
  readonly lastCallTime$ = this.lastCallTime.asReadonly();
  readonly callCount$ = this.callCount.asReadonly();

  // Computed signals
  readonly hasError = computed(() => this.error() !== null);
  readonly isReady = computed(() => !this.loading() && this.error() === null);
  readonly isConnected = this.webui.isConnected;

  /**
   * Call a backend function via WebUI WebSocket bridge
   * NO HTTP/HTTPS is used - all communication is via WebSocket
   */
  async call<T>(functionName: string, args: unknown[] = [], options?: CallOptions): Promise<ApiResponse<T>> {
    this.loading.set(true);
    this.error.set(null);
    this.callCount.update(count => count + 1);

    try {
      // Use WebUI bridge for direct WebSocket communication
      const data = await this.webui.call<T>(functionName, args);
      
      this.loading.set(false);
      this.lastCallTime.set(Date.now());
      
      return {
        success: true,
        data,
      };
    } catch (err) {
      this.loading.set(false);
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      this.error.set(errorMsg);
      this.lastCallTime.set(Date.now());
      
      return {
        success: false,
        error: errorMsg,
      };
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
   * Subscribe to backend events via WebUI bridge
   */
  onEvent<T>(event: string, handler: (data: T) => void): () => void {
    return this.webui.onEvent(event, handler as (data: unknown) => void);
  }

  /**
   * Emit event to backend via WebUI WebSocket bridge
   */
  async emit(event: string, data: unknown): Promise<void> {
    return this.webui.emit(event, data);
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

  /**
   * Get WebUI bridge stats
   */
  getStats() {
    return this.webui.stats$();
  }
}

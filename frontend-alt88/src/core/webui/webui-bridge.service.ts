/**
 * WebUI Bridge Service
 *
 * Simplified bidirectional communication between Angular frontend
 * and C3 backend through WebUI library.
 */
import { Injectable, signal, computed } from '@angular/core';

export interface BridgeEvent {
  type: string;
  payload?: unknown;
}

export interface BridgeStats {
  eventsSent: number;
  eventsReceived: number;
  isConnected: boolean;
}

@Injectable({ providedIn: 'root' })
export class WebUIBridgeService {
  private eventListeners = new Map<string, Set<(data: unknown) => void>>();

  // Signal-based state
  private readonly stats = signal<BridgeStats>({
    eventsSent: 0,
    eventsReceived: 0,
    isConnected: false,
  });

  // Public readonly signals
  readonly bridgeStats = this.stats.asReadonly();
  readonly isConnected = computed(() => this.stats().isConnected);

  constructor() {
    this.checkConnection();
    this.setupEventListeners();
  }

  /**
   * Check if WebUI is available
   */
  private checkConnection(): void {
    const isAvailable = typeof (window as any).webui !== 'undefined';
    this.stats.update(s => ({ ...s, isConnected: isAvailable }));

    if (isAvailable) {
      console.log('[WebUIBridge] Connected to backend');
    } else {
      console.warn('[WebUIBridge] Backend not connected - running standalone');
    }
  }

  /**
   * Setup global event listeners
   */
  private setupEventListeners(): void {
    // Listen for backend events
    window.addEventListener('webui:event', ((event: Event) => {
      const customEvent = event as CustomEvent;
      this.handleBackendEvent(customEvent.detail);
    }) as EventListener);

    // Listen for RPC responses
    window.addEventListener('rpc:response', ((event: Event) => {
      const customEvent = event as CustomEvent;
      const { id, result, error } = customEvent.detail;
      this.handleRpcResponse(id, result, error);
    }) as EventListener);
  }

  /**
   * Handle events from backend
   */
  private handleBackendEvent(data: BridgeEvent): void {
    const listeners = this.eventListeners.get(data.type);
    if (listeners) {
      listeners.forEach(listener => listener(data.payload));
    }
    this.stats.update(s => ({ ...s, eventsReceived: s.eventsReceived + 1 }));
  }

  /**
   * Handle RPC responses
   */
  private handleRpcResponse(id: number, result: unknown, error?: string): void {
    // Could be extended with pending request handling
    if (error) {
      console.error('[WebUIBridge] RPC error:', error);
    }
  }

  /**
   * Send event to backend
   */
  send(type: string, payload?: unknown): void {
    const webui = (window as any).webui;
    if (webui && typeof webui.emit === 'function') {
      webui.emit(type, payload);
      this.stats.update(s => ({ ...s, eventsSent: s.eventsSent + 1 }));
    } else {
      console.warn('[WebUIBridge] Cannot send - backend not available');
    }
  }

  /**
   * Subscribe to backend events
   */
  on<T = unknown>(type: string, callback: (data: T) => void): () => void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, new Set());
    }
    this.eventListeners.get(type)!.add(callback as (data: unknown) => void);

    return () => {
      this.eventListeners.get(type)?.delete(callback as (data: unknown) => void);
    };
  }

  /**
   * Call backend function
   */
  async call<T = unknown>(fnName: string, ...args: unknown[]): Promise<T> {
    const webui = (window as any).webui;
    if (!webui || typeof webui[fnName] !== 'function') {
      throw new Error(`Backend function ${fnName} not found`);
    }
    return webui[fnName](...args);
  }

  /**
   * Call backend function with timeout
   */
  async callWithTimeout<T = unknown>(
    fnName: string,
    timeoutMs: number,
    ...args: unknown[]
  ): Promise<T> {
    return Promise.race([
      this.call<T>(fnName, ...args),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Timeout: ${fnName}`)), timeoutMs)
      ),
    ]);
  }

  /**
   * Get bridge statistics
   */
  getStats(): BridgeStats {
    return this.stats();
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats.set({
      eventsSent: 0,
      eventsReceived: 0,
      isConnected: this.stats().isConnected,
    });
  }
}

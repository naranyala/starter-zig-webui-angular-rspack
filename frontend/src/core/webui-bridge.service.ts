// WebUI Native Bridge Service
// Direct function binding via WebUI WebSocket bridge - NO HTTP/HTTPS
import { Injectable, signal, computed, effect } from '@angular/core';

export interface WebUIConnectionState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  lastPing: number | null;
}

export interface WebUIStats {
  callsSent: number;
  callsReceived: number;
  errors: number;
  averageLatency: number;
}

/**
 * WebUI Bridge Service - Direct backend communication via WebSocket
 * 
 * This service provides direct function binding between frontend and backend
 * using WebUI's native WebSocket bridge. NO HTTP/HTTPS is used.
 * 
 * Usage:
 *   // Call backend function
 *   const result = await webui.call<number>('add', [1, 2]);
 * 
 *   // Bind to backend events
 *   webui.onEvent('my-event', (data) => console.log(data));
 */
@Injectable({ providedIn: 'root' })
export class WebuiBridgeService {
  // Connection state signals
  private readonly connectionState = signal<WebUIConnectionState>({
    connected: false,
    connecting: true,
    error: null,
    lastPing: null,
  });

  // Stats signals
  private readonly stats = signal<WebUIStats>({
    callsSent: 0,
    callsReceived: 0,
    errors: 0,
    averageLatency: 0,
  });

  // Event handlers
  private eventHandlers = new Map<string, Set<(data: unknown) => void>>();

  // Public readonly signals
  readonly isConnected = computed(() => this.connectionState().connected);
  readonly isConnecting = computed(() => this.connectionState().connecting);
  readonly connectionError = computed(() => this.connectionState().error);
  readonly stats$ = this.stats.asReadonly();

  // Latency tracking
  private latencySamples: number[] = [];

  constructor() {
    // Initialize connection monitoring
    this.monitorConnection();
    
    // Setup global event listeners from WebUI bridge
    this.setupEventListeners();
  }

  /**
   * Call a backend function via WebUI bridge
   * 
   * @param functionName - Name of the bound backend function
   * @param args - Arguments to pass to the backend function
   * @returns Promise resolving to the function result
   * 
   * Example:
   *   const sum = await webui.call<number>('add', [1, 2]);
   */
  async call<T>(functionName: string, args: unknown[] = []): Promise<T> {
    const startTime = performance.now();
    
    this.updateStats({ callsSent: 1 });

    return new Promise((resolve, reject) => {
      const timeoutMs = 30000;
      const responseEvent = `${functionName}_response`;

      // Create one-time response handler
      const handler = (event: CustomEvent<T>) => {
        clearTimeout(timeoutId);
        window.removeEventListener(responseEvent, handler as EventListener);
        
        const latency = performance.now() - startTime;
        this.recordLatency(latency);
        this.updateStats({ callsReceived: 1 });
        
        resolve(event.detail);
      };

      // Setup timeout
      const timeoutId = setTimeout(() => {
        window.removeEventListener(responseEvent, handler as EventListener);
        this.updateStats({ errors: 1 });
        reject(new Error(`WebUI call timeout: ${functionName}`));
      }, timeoutMs);

      // Listen for response
      window.addEventListener(responseEvent, handler as EventListener);

      // Call backend function via WebUI bridge
      try {
        const backendFn = (window as Record<string, unknown>)[functionName];
        
        if (typeof backendFn !== 'function') {
          clearTimeout(timeoutId);
          window.removeEventListener(responseEvent, handler as EventListener);
          this.updateStats({ errors: 1 });
          reject(new Error(`Backend function not bound: ${functionName}`));
          return;
        }

        // Call the backend function - this sends data via WebSocket
        backendFn(...args);
      } catch (error) {
        clearTimeout(timeoutId);
        window.removeEventListener(responseEvent, handler as EventListener);
        this.updateStats({ errors: 1 });
        reject(error);
      }
    });
  }

  /**
   * Call backend and throw on error (convenience method)
   */
  async callOrThrow<T>(functionName: string, args: unknown[] = []): Promise<T> {
    return this.call<T>(functionName, args);
  }

  /**
   * Subscribe to backend events
   * 
   * @param event - Event name to subscribe to
   * @param handler - Callback function
   * @returns Unsubscribe function
   * 
   * Example:
   *   const unsubscribe = webui.onEvent('data-update', (data) => {
   *     console.log('Data updated:', data);
   *   });
   *   
   *   // Later: unsubscribe();
   */
  onEvent(event: string, handler: (data: unknown) => void): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.eventHandlers.get(event)?.delete(handler);
    };
  }

  /**
   * Emit event to backend (via WebSocket)
   */
  async emit(event: string, data: unknown): Promise<void> {
    return this.call('emitEvent', [event, data]).catch(() => {
      // Silently fail if backend doesn't have emitEvent bound
    });
  }

  /**
   * Get connection state
   */
  getConnectionState(): WebUIConnectionState {
    return this.connectionState();
  }

  /**
   * Reset stats
   */
  resetStats(): void {
    this.stats.set({
      callsSent: 0,
      callsReceived: 0,
      errors: 0,
      averageLatency: 0,
    });
    this.latencySamples = [];
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private monitorConnection(): void {
    // Check connection status periodically
    setInterval(() => {
      const state = this.connectionState();
      
      // Check if WebUI bridge is available
      const hasWebUI = typeof (window as Record<string, unknown>).webui !== 'undefined';
      
      if (hasWebUI) {
        this.connectionState.set({
          ...state,
          connected: true,
          connecting: false,
          error: null,
          lastPing: Date.now(),
        });
      } else if (!state.connecting) {
        this.connectionState.set({
          ...state,
          connected: false,
          connecting: true,
          error: 'Waiting for WebUI bridge...',
        });
      }
    }, 1000);
  }

  private setupEventListeners(): void {
    // Listen for backend events dispatched by WebUI bridge
    window.addEventListener('backend-event', (event: CustomEvent) => {
      const { event: eventName, data } = event.detail;
      this.handleEvent(eventName, data);
    });

    // Listen for state updates from backend
    window.addEventListener('state-update', (event: CustomEvent) => {
      const { key, value } = event.detail;
      this.handleEvent('state-update', { key, value });
    });

    // Listen for broadcast messages
    window.addEventListener('broadcast-message', (event: CustomEvent) => {
      const { event: eventName, data } = event.detail;
      this.handleEvent('broadcast', { event: eventName, data });
    });
  }

  private handleEvent(event: string, data: unknown): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
          this.updateStats({ errors: 1 });
        }
      });
    }
  }

  private updateStats(updates: Partial<WebUIStats>): void {
    this.stats.set({
      callsSent: (this.stats().callsSent + (updates.callsSent || 0)),
      callsReceived: (this.stats().callsReceived + (updates.callsReceived || 0)),
      errors: (this.stats().errors + (updates.errors || 0)),
      averageLatency: this.calculateAverageLatency(),
    });
  }

  private recordLatency(latency: number): void {
    this.latencySamples.push(latency);
    // Keep last 100 samples
    if (this.latencySamples.length > 100) {
      this.latencySamples.shift();
    }
  }

  private calculateAverageLatency(): number {
    if (this.latencySamples.length === 0) return 0;
    const sum = this.latencySamples.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.latencySamples.length);
  }
}

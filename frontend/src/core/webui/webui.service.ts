/**
 * WebUI Service for Angular
 *
 * Provides bidirectional communication between Angular frontend
 * and Odin backend through WebUI library.
 */

import { Injectable, NgZone } from '@angular/core';

export interface WebUIEvent {
  type: string;
  payload?: any;
}

export interface WebUIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class WebUIService {
  private isWebUIAvailable = false;
  private eventListeners = new Map<string, Set<(data: any) => void>>();
  private pendingRequests = new Map<number, {
    resolve: (value: any) => void;
    reject: (reason: any) => void;
    timeout?: ReturnType<typeof setTimeout>;
  }>();
  private requestIdCounter = 0;

  constructor(private ngZone: NgZone) {
    this.checkAvailability();
  }

  /**
   * Check if WebUI is available in the current environment
   */
  private checkAvailability(): void {
    // Check if webui object exists (injected by WebUI library)
    this.isWebUIAvailable = typeof (window as any).webui !== 'undefined';
    
    if (this.isWebUIAvailable) {
      console.log('[WebUI] WebUI is available');
      this.setupEventListeners();
    } else {
      console.warn('[WebUI] WebUI is not available. Running in standalone mode.');
    }
  }

  /**
   * Check if WebUI is available
   */
  isAvailable(): boolean {
    return this.isWebUIAvailable;
  }

  /**
   * Setup global event listeners for WebUI events
   */
  private setupEventListeners(): void {
    // Listen for events from Odin backend
    window.addEventListener('webui:event', (event: any) => {
      this.handleBackendEvent(event.detail);
    });
  }

  /**
   * Handle events from backend
   */
  private handleBackendEvent(data: any): void {
    const listeners = this.eventListeners.get(data.type) || new Set();
    
    this.ngZone.run(() => {
      listeners.forEach(listener => {
        try {
          listener(data.payload);
        } catch (error) {
          console.error('[WebUI] Error in event listener:', error);
        }
      });
    });
  }

  /**
   * Send data to Odin backend and get response
   */
  async send<T = any>(eventName: string, data?: any): Promise<WebUIResponse<T>> {
    if (!this.isWebUIAvailable) {
      console.warn('[WebUI] Not available, simulating response');
      return {
        success: true,
        data: data as T,
      };
    }

    return new Promise<WebUIResponse<T>>((resolve, reject) => {
      const requestId = ++this.requestIdCounter;
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request ${eventName} timed out`));
      }, 5000); // 5 second timeout

      this.pendingRequests.set(requestId, {
        resolve: (result: any) => {
          clearTimeout(timeout);
          resolve({ success: true, data: result as T });
        },
        reject: (error: any) => {
          clearTimeout(timeout);
          reject(error);
        },
        timeout,
      });

      try {
        // Call Odin backend function through WebUI
        const webui = (window as any).webui;
        if (webui && typeof webui[eventName] === 'function') {
          webui[eventName](data).then((result: any) => {
            const request = this.pendingRequests.get(requestId);
            if (request) {
              request.resolve(result);
            }
          }).catch((error: any) => {
            const request = this.pendingRequests.get(requestId);
            if (request) {
              request.reject(error);
            }
          });
        } else {
          // Fallback: try direct call
          resolve({ success: true, data: data as T });
        }
      } catch (error) {
        const request = this.pendingRequests.get(requestId);
        if (request) {
          request.reject(error);
        }
      }
    });
  }

  /**
   * Subscribe to events from Odin backend
   */
  on<T = any>(eventName: string, callback: (data: T) => void): () => void {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, new Set());
    }
    
    const listeners = this.eventListeners.get(eventName)!;
    listeners.add(callback);

    // Return unsubscribe function
    return () => {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.eventListeners.delete(eventName);
      }
    };
  }

  /**
   * Emit event to Odin backend (fire and forget)
   */
  emit(eventName: string, data?: any): void {
    if (!this.isWebUIAvailable) {
      console.warn('[WebUI] Not available, event not emitted:', eventName);
      return;
    }

    try {
      const webui = (window as any).webui;
      if (webui && typeof webui.emit === 'function') {
        webui.emit(eventName, data);
      }
    } catch (error) {
      console.error('[WebUI] Error emitting event:', error);
    }
  }

  /**
   * Call a specific backend function by name
   */
  async call<T = any>(functionName: string, ...args: any[]): Promise<T> {
    if (!this.isWebUIAvailable) {
      console.warn('[WebUI] Not available, simulating call:', functionName);
      return Promise.resolve(null as T);
    }

    const webui = (window as any).webui;
    if (!webui || typeof webui[functionName] !== 'function') {
      throw new Error(`Backend function ${functionName} not found`);
    }

    return webui[functionName](...args);
  }
}

/**
 * Directive for binding element clicks to backend functions
 */
@Injectable({
  providedIn: 'root',
})
export class WebUIBindService {
  constructor(private webuiService: WebUIService) {}

  /**
   * Bind a click event to a backend function
   */
  bind(elementId: string, backendFunction: string): void {
    setTimeout(() => {
      const element = document.getElementById(elementId);
      if (element) {
        element.addEventListener('click', async () => {
          try {
            await this.webuiService.call(backendFunction);
          } catch (error) {
            console.error(`[WebUIBind] Error calling ${backendFunction}:`, error);
          }
        });
      }
    }, 100);
  }
}

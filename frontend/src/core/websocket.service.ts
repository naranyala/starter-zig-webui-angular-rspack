/**
 * WebSocket Service for Backend Communication
 * 
 * Provides pure WebSocket communication as an alternative to WebUI bridge.
 * Use this for:
 * - Real-time data streaming
 * - Large data transfers
 * - Complex messaging patterns
 * - Pub/Sub communication
 * 
 * @example
 * // Connect to WebSocket server
 * const ws = new WebSocketService();
 * ws.connect('ws://localhost:8765');
 * 
 * // Request/Response
 * const result = await ws.request('getData', { id: 123 });
 * 
 * // Subscribe to events
 * ws.subscribe('updates');
 * ws.onEvent('updates', (data) => console.log(data));
 */

import { Injectable, signal, computed } from '@angular/core';

export interface WebSocketMessage {
  type: 'request' | 'response' | 'event' | 'subscribe' | 'unsubscribe' | 'ping' | 'pong';
  id?: number;
  method?: string;
  params?: unknown;
  event?: string;
  data?: unknown;
  error?: string;
}

export interface WebSocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

export type EventCallback = (data: unknown, event: string) => void;

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig = {
    url: 'ws://localhost:8765',
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
    heartbeatInterval: 30000,
  };

  // State signals
  private readonly connected = signal(false);
  private readonly connecting = signal(false);
  private readonly error = signal<string | null>(null);
  private readonly reconnectAttempts = signal(0);

  // Message handlers
  private readonly pendingRequests = new Map<number, {
    resolve: (data: unknown) => void;
    reject: (error: Error) => void;
    timeout: number;
  }>();
  
  private readonly eventHandlers = new Map<string, Set<EventCallback>>();
  
  private messageId = 0;
  private heartbeatTimer?: number;
  private reconnectTimer?: number;

  // Public signals
  readonly isConnected = this.connected.asReadonly();
  readonly isConnecting = this.connecting.asReadonly();
  readonly connectionError = this.error.asReadonly();
  readonly stats = signal({
    messagesSent: 0,
    messagesReceived: 0,
    errors: 0,
  });

  constructor() {}

  /**
   * Connect to WebSocket server
   */
  connect(config?: Partial<WebSocketConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.connecting.set(true);
    this.error.set(null);

    try {
      this.ws = new WebSocket(this.config.url);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => this.onOpen();
      this.ws.onclose = (event) => this.onClose(event);
      this.ws.onerror = () => this.onError();
      this.ws.onmessage = (event) => this.onMessage(event);
    } catch (err) {
      this.onError(err instanceof Error ? err.message : 'Connection failed');
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.stopHeartbeat();
    this.clearReconnect();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.connected.set(false);
    this.connecting.set(false);
  }

  /**
   * Send request and wait for response
   */
  async request<T>(method: string, params?: unknown, timeoutMs = 30000): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = ++this.messageId;
      
      const timeout = window.setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Request timeout: ${method}`));
      }, timeoutMs);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      this.send({
        type: 'request',
        id,
        method,
        params,
      });
    });
  }

  /**
   * Subscribe to event topic
   */
  subscribe(topic: string): void {
    this.send({
      type: 'subscribe',
      event: topic,
    });
  }

  /**
   * Unsubscribe from event topic
   */
  unsubscribe(topic: string): void {
    this.send({
      type: 'unsubscribe',
      event: topic,
    });
  }

  /**
   * Register event handler
   */
  onEvent(topic: string, callback: EventCallback): () => void {
    if (!this.eventHandlers.has(topic)) {
      this.eventHandlers.set(topic, new Set());
    }
    this.eventHandlers.get(topic)!.add(callback);

    // Auto-subscribe
    this.subscribe(topic);

    // Return unsubscribe function
    return () => {
      this.eventHandlers.get(topic)?.delete(callback);
      if (this.eventHandlers.get(topic)?.size === 0) {
        this.unsubscribe(topic);
      }
    };
  }

  /**
   * Emit event to backend
   */
  emit(event: string, data: unknown): void {
    this.send({
      type: 'event',
      event,
      data,
    });
  }

  /**
   * Send ping to keep connection alive
   */
  ping(): void {
    this.send({ type: 'ping' });
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private send(message: WebSocketMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.error.set('WebSocket not connected');
      this.updateStats({ errors: 1 });
      throw new Error('WebSocket not connected');
    }

    try {
      this.ws.send(JSON.stringify(message));
      this.updateStats({ messagesSent: 1 });
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Send failed');
      this.updateStats({ errors: 1 });
      throw err;
    }
  }

  private onOpen(): void {
    this.connected.set(true);
    this.connecting.set(false);
    this.reconnectAttempts.set(0);
    this.error.set(null);
    
    console.log('[WebSocket] Connected to', this.config.url);
    
    this.startHeartbeat();
  }

  private onClose(event: CloseEvent): void {
    this.connected.set(false);
    this.connecting.set(false);
    this.stopHeartbeat();

    console.log('[WebSocket] Closed:', event.code, event.reason);

    // Reject pending requests
    this.pendingRequests.forEach((request, id) => {
      window.clearTimeout(request.timeout);
      request.reject(new Error('Connection closed'));
    });
    this.pendingRequests.clear();

    // Attempt reconnect
    if (this.reconnectAttempts.get() < (this.config.maxReconnectAttempts ?? 5)) {
      this.scheduleReconnect();
    }
  }

  private onError(): void {
    this.error.set('Connection error');
    this.updateStats({ errors: 1 });
    console.error('[WebSocket] Error');
  }

  private onMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      this.updateStats({ messagesReceived: 1 });
      this.handleMessage(message);
    } catch (err) {
      console.error('[WebSocket] Failed to parse message:', err);
      this.updateStats({ errors: 1 });
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'response':
        this.handleResponse(message);
        break;
      
      case 'event':
        this.handleEvent(message.event ?? 'unknown', message.data);
        break;
      
      case 'pong':
        // Heartbeat response - connection is alive
        break;
      
      default:
        console.warn('[WebSocket] Unknown message type:', message.type);
    }
  }

  private handleResponse(message: WebSocketMessage): void {
    if (!message.id) return;

    const request = this.pendingRequests.get(message.id);
    if (!request) return;

    window.clearTimeout(request.timeout);
    this.pendingRequests.delete(message.id);

    if (message.error) {
      request.reject(new Error(message.error));
    } else {
      request.resolve(message.data ?? null);
    }
  }

  private handleEvent(event: string, data: unknown): void {
    const handlers = this.eventHandlers.get(event);
    if (!handlers) return;

    handlers.forEach(handler => {
      try {
        handler(data, event);
      } catch (err) {
        console.error(`[WebSocket] Event handler error for ${event}:`, err);
      }
    });
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    const interval = this.config.heartbeatInterval ?? 30000;
    this.heartbeatTimer = window.setInterval(() => {
      this.ping();
    }, interval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  private scheduleReconnect(): void {
    this.clearReconnect();
    
    const attempts = this.reconnectAttempts.get();
    const delay = this.config.reconnectInterval ?? 3000;
    
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectAttempts.set(attempts + 1);
      console.log('[WebSocket] Reconnecting... (attempt %d)', attempts + 1);
      this.connect();
    }, delay);
  }

  private clearReconnect(): void {
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
  }

  private updateStats(updates: { messagesSent?: number; messagesReceived?: number; errors?: number }): void {
    this.stats.set({
      messagesSent: this.stats().messagesSent + (updates.messagesSent ?? 0),
      messagesReceived: this.stats().messagesReceived + (updates.messagesReceived ?? 0),
      errors: this.stats().errors + (updates.errors ?? 0),
    });
  }
}

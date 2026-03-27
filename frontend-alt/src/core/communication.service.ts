// Multi-channel communication service for backend-frontend communication
// Supports: WebUI Bridge, Event Bus, Shared State, Message Queue, Broadcast
import { Injectable, signal, computed, inject } from '@angular/core';
import { ApiService } from './api.service';

// ============================================================================
// Type Definitions
// ============================================================================

export type MessageChannel = 'webui-bridge' | 'event-bus' | 'shared-state' | 'message-queue' | 'broadcast';
export type MessageType = 'request' | 'response' | 'event' | 'broadcast' | 'state-update' | 'ack';

export interface Message {
  id: string;
  channel: MessageChannel;
  type: MessageType;
  source: 'frontend' | 'backend';
  destination: string;
  timestamp: number;
  data: unknown;
  priority: number;
}

export interface CommunicationStats {
  totalMessages: number;
  messagesByChannel: Record<string, number>;
  messagesByType: Record<string, number>;
  queueLength: number;
  broadcastCount: number;
  activeSubscriptions: number;
  stateVersion: number;
  lastActivity: number;
}

export interface SharedState {
  [key: string]: unknown;
}

export type EventHandler = (data: unknown, event: string) => void;
export type StateChangeHandler = (key: string, value: unknown) => void;

// ============================================================================
// Communication Service
// ============================================================================

@Injectable({ providedIn: 'root' })
export class CommunicationService {
  private readonly api = inject(ApiService);

  // State Signals
  private readonly stats = signal<CommunicationStats>({
    totalMessages: 0,
    messagesByChannel: {},
    messagesByType: {},
    queueLength: 0,
    broadcastCount: 0,
    activeSubscriptions: 0,
    stateVersion: 0,
    lastActivity: Date.now(),
  });

  private readonly sharedState = signal<SharedState>({});
  private readonly messageQueue = signal<Message[]>([]);
  private readonly eventHandlers = new Map<string, Set<EventHandler>>();
  private readonly stateHandlers = new Set<StateChangeHandler>();

  // Public Signals
  readonly stats$ = this.stats.asReadonly();
  readonly sharedState$ = this.sharedState.asReadonly();
  readonly queue$ = this.messageQueue.asReadonly();
  readonly queueLength = computed(() => this.messageQueue().length);
  readonly isConnected = signal(true);

  constructor() {
    this.setupEventListeners();
    this.setupStateSync();
  }

  // ============================================================================
  // WebUI Bridge Channel (RPC)
  // ============================================================================

  /**
   * Call backend function via WebUI bridge
   */
  async call<T>(functionName: string, args: unknown[] = []): Promise<T> {
    this.incrementStats('webui-bridge', 'request');
    return this.api.callOrThrow<T>(functionName, args);
  }

  /**
   * Call with response event listener
   */
  async callWithResponse<T>(functionName: string, args: unknown[] = []): Promise<T> {
    return new Promise((resolve, reject) => {
      const responseEvent = `${functionName}_response`;
      
      const handler = (event: CustomEvent<T>) => {
        window.removeEventListener(responseEvent, handler as EventListener);
        this.incrementStats('webui-bridge', 'response');
        resolve(event.detail);
      };

      window.addEventListener(responseEvent, handler as EventListener);

      this.call(functionName, args).catch(reject);

      // Timeout after 30 seconds
      setTimeout(() => {
        window.removeEventListener(responseEvent, handler as EventListener);
        reject(new Error(`Timeout waiting for response: ${functionName}`));
      }, 30000);
    });
  }

  // ============================================================================
  // Event Bus Channel (Pub/Sub)
  // ============================================================================

  /**
   * Subscribe to an event
   */
  subscribe(event: string, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
    this.updateSubscriptionCount();

    // Return unsubscribe function
    return () => {
      this.eventHandlers.get(event)?.delete(handler);
      this.updateSubscriptionCount();
    };
  }

  /**
   * Publish an event to backend
   */
  async publish(event: string, data: unknown): Promise<void> {
    this.incrementStats('event-bus', 'event');
    await this.api.call('publishEvent', [event, data]).catch(() => {});
  }

  /**
   * Emit a local event (frontend only)
   */
  emit(event: string, data: unknown): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data, event));
    }

    // Also notify backend
    this.publish(event, data).catch(() => {});
  }

  /**
   * Get event history from backend
   */
  async getEventHistory(): Promise<Message[]> {
    return this.api.callOrThrow<Message[]>('devtools.getLogs').catch(() => []);
  }

  // ============================================================================
  // Shared State Channel
  // ============================================================================

  /**
   * Get a value from shared state
   */
  getState<T>(key: string): T | undefined {
    return this.sharedState()[key] as T;
  }

  /**
   * Set a value in shared state
   */
  async setState(key: string, value: unknown): Promise<void> {
    this.sharedState.update(state => ({ ...state, [key]: value }));
    this.stats.update(s => ({ ...s, stateVersion: s.stateVersion + 1 }));
    
    // Notify backend
    await this.api.call('setSharedState', [key, value]).catch(() => {});
    
    // Notify local subscribers
    this.stateHandlers.forEach(handler => handler(key, value));
  }

  /**
   * Subscribe to state changes
   */
  subscribeState(handler: StateChangeHandler): () => void {
    this.stateHandlers.add(handler);
    return () => {
      this.stateHandlers.delete(handler);
    };
  }

  /**
   * Get all shared state
   */
  getAllState(): SharedState {
    return { ...this.sharedState() };
  }

  // ============================================================================
  // Message Queue Channel (Async)
  // ============================================================================

  /**
   * Enqueue a message for async processing
   */
  async enqueue(destination: string, data: unknown, priority: number = 1): Promise<void> {
    const message: Message = {
      id: this.generateId(),
      channel: 'message-queue',
      type: 'request',
      source: 'frontend',
      destination,
      timestamp: Date.now(),
      data,
      priority,
    };

    this.messageQueue.update(queue => [...queue, message]);
    this.stats.update(s => ({ ...s, queueLength: this.messageQueue().length }));

    // Send to backend queue
    await this.api.call('enqueueMessage', [destination, JSON.stringify(data), priority]).catch(() => {});
  }

  /**
   * Dequeue and process next message
   */
  async dequeue<T>(): Promise<T | null> {
    const queue = this.messageQueue();
    if (queue.length === 0) {
      return null;
    }

    const message = queue[0];
    this.messageQueue.update(q => q.slice(1));
    this.stats.update(s => ({ ...s, queueLength: this.messageQueue().length }));

    return message.data as T;
  }

  /**
   * Peek at next message without removing
   */
  peek(): Message | null {
    const queue = this.messageQueue();
    return queue.length > 0 ? queue[0] : null;
  }

  /**
   * Clear message queue
   */
  clearQueue(): void {
    this.messageQueue.set([]);
    this.stats.update(s => ({ ...s, queueLength: 0 }));
  }

  // ============================================================================
  // Broadcast Channel (One-to-Many)
  // ============================================================================

  /**
   * Broadcast a message to all clients
   */
  async broadcast(event: string, data: unknown): Promise<void> {
    this.stats.update(s => ({ ...s, broadcastCount: s.broadcastCount + 1 }));
    await this.api.call('broadcast', [event, data]).catch(() => {});
  }

  /**
   * Listen for broadcast messages
   */
  onBroadcast(handler: EventHandler): () => void {
    return this.subscribe('broadcast', handler);
  }

  // ============================================================================
  // Statistics and Monitoring
  // ============================================================================

  /**
   * Get communication statistics
   */
  getStats(): CommunicationStats {
    return this.stats();
  }

  /**
   * Reset all statistics
   */
  resetStats(): void {
    this.stats.set({
      totalMessages: 0,
      messagesByChannel: {},
      messagesByType: {},
      queueLength: 0,
      broadcastCount: 0,
      activeSubscriptions: 0,
      stateVersion: 0,
      lastActivity: Date.now(),
    });
  }

  /**
   * Get channel usage breakdown
   */
  getChannelUsage(): Record<string, number> {
    return { ...this.stats().messagesByChannel };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private setupEventListeners(): void {
    // Listen for backend events
    window.addEventListener('backend-event', ((event: CustomEvent) => {
      const { event: eventName, data } = event.detail;
      this.emit(eventName, data);
    }) as EventListener);

    // Listen for state updates
    window.addEventListener('state-update', ((event: CustomEvent) => {
      const { key, value } = event.detail;
      this.sharedState.update(state => ({ ...state, [key]: value }));
      this.stateHandlers.forEach(handler => handler(key, value));
    }) as EventListener);

    // Listen for broadcast messages
    window.addEventListener('broadcast-message', ((event: CustomEvent) => {
      const { event: eventName, data } = event.detail;
      this.emit('broadcast', { event: eventName, data });
    }) as EventListener);
  }

  private setupStateSync(): void {
    // Periodically sync state with backend
    setInterval(async () => {
      try {
        const backendState = await this.api.call<SharedState>('getSharedState').catch(() => ({}));
        this.sharedState.update(state => ({ ...state, ...backendState }));
      } catch {
        // Ignore sync errors
      }
    }, 5000);
  }

  private incrementStats(channel: MessageChannel, type: MessageType): void {
    this.stats.update(s => ({
      ...s,
      totalMessages: s.totalMessages + 1,
      messagesByChannel: {
        ...s.messagesByChannel,
        [channel]: (s.messagesByChannel[channel] || 0) + 1,
      },
      messagesByType: {
        ...s.messagesByType,
        [type]: (s.messagesByType[type] || 0) + 1,
      },
      lastActivity: Date.now(),
    }));
  }

  private updateSubscriptionCount(): void {
    let count = 0;
    this.eventHandlers.forEach(handlers => {
      count += handlers.size;
    });
    this.stats.update(s => ({ ...s, activeSubscriptions: count }));
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

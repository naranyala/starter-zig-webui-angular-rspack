import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';

// ============================================================================
// RPC Client Service
// ============================================================================

export interface RpcRequest {
  id: number;
  method: string;
  params: any[];
}

export interface RpcResponse<T = any> {
  id: number;
  result?: T;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class RpcClientService {
  private requestId = 0;
  private pendingCalls = new Map<number, {
    resolve: (value: any) => void;
    reject: (reason: any) => void;
    timeout: any;
  }>();

  private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds

  constructor() {
    // Expose response handler to global scope for WebUI callbacks
    (window as any).rpcClient = {
      handleResponse: (responseStr: string) => this.handleResponse(responseStr)
    };
  }

  /**
   * Call a backend RPC method
   * @param method - Method name to call
   * @param params - Parameters to pass
   * @param timeout - Optional timeout in ms
   */
  async call<T>(method: string, params: any[] = [], timeout?: number): Promise<T> {
    const id = ++this.requestId;
    const request: RpcRequest = { id, method, params };

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingCalls.delete(id);
        reject(new Error(`RPC timeout: ${method}`));
      }, timeout || this.DEFAULT_TIMEOUT);

      this.pendingCalls.set(id, { resolve, reject, timeout: timeoutId });

      // Call WebUI backend method
      const requestJson = JSON.stringify(request);
      (window as any).webui.rpcCall(requestJson);
    });
  }

  /**
   * Handle RPC response from backend
   */
  private handleResponse(responseStr: string): void {
    const response: RpcResponse = JSON.parse(responseStr);
    const pending = this.pendingCalls.get(response.id);

    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingCalls.delete(response.id);

      if (response.error) {
        pending.reject(new Error(response.error));
      } else {
        pending.resolve(response.result);
      }
    }
  }
}

// ============================================================================
// Event Bus Service (Pub-Sub)
// ============================================================================

export type EventHandler = (data: any) => void;

export interface Subscription {
  unsubscribe: () => void;
}

@Injectable({ providedIn: 'root' })
export class EventBusService {
  private subscribers = new Map<string, Set<EventHandler>>();
  private eventSubject = new Subject<{ topic: string; data: any }>();

  // Observable for all events
  readonly events$ = this.eventSubject.asObservable();

  constructor() {
    // Expose event handler to global scope
    (window as any).eventBus = {
      onEvent: (topic: string, data: any) => this.onEvent(topic, data)
    };
  }

  /**
   * Subscribe to an event topic
   * @param topic - Event topic name
   * @param handler - Event handler function
   */
  subscribe(topic: string, handler: EventHandler): Subscription {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set());
    }
    this.subscribers.get(topic)!.add(handler);

    // Subscribe on backend too
    this.subscribeBackend(topic);

    return {
      unsubscribe: () => {
        this.subscribers.get(topic)?.delete(handler);
        this.unsubscribeBackend(topic);
      }
    };
  }

  /**
   * Subscribe to event as Observable
   */
  observe<T>(topic: string): Observable<T> {
    return new Observable<T>(observer => {
      const handler = (data: T) => observer.next(data);
      const subscription = this.subscribe(topic, handler);
      return () => subscription.unsubscribe();
    });
  }

  /**
   * Publish an event to backend and local subscribers
   */
  publish(topic: string, data: any): void {
    // Publish to backend
    const dataJson = JSON.stringify(data);
    (window as any).webui.publishEvent(topic, dataJson);

    // Also emit locally
    this.eventSubject.next({ topic, data });
  }

  /**
   * Handle event from backend
   */
  private onEvent(topic: string, data: any): void {
    this.eventSubject.next({ topic, data });
    this.subscribers.get(topic)?.forEach(handler => handler(data));
  }

  private subscribeBackend(topic: string): void {
    (window as any).webui.subscribe(topic);
  }

  private unsubscribeBackend(topic: string): void {
    (window as any).webui.unsubscribe(topic);
  }
}

// ============================================================================
// Channel Service (Full-Duplex)
// ============================================================================

export interface ChannelMessage<T = any> {
  channel: string;
  data: T;
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class ChannelService {
  private channels = new Map<string, Subject<any>>();

  constructor() {
    // Expose channel handler to global scope
    (window as any).channelManager = {
      onMessage: (channel: string, data: any) => this.onMessage(channel, data)
    };
  }

  /**
   * Create/join a channel
   * @param name - Channel name
   */
  createChannel<T>(name: string): Observable<ChannelMessage<T>> {
    if (!this.channels.has(name)) {
      this.channels.set(name, new Subject<ChannelMessage<T>>());
      // Create channel on backend
      (window as any).webui.createChannel(name);
    }
    return this.channels.get(name)!.asObservable() as Observable<ChannelMessage<T>>;
  }

  /**
   * Send message to channel
   */
  send<T>(channel: string, data: T): void {
    const message = {
      channel,
      data,
      timestamp: Date.now()
    };
    (window as any).webui.sendToChannel(channel, JSON.stringify(data));
  }

  /**
   * Join channel and send/receive messages
   */
  join<T>(channel: string): {
    messages$: Observable<ChannelMessage<T>>;
    send: (data: T) => void;
    leave: () => void;
  } {
    const messages$ = this.createChannel<T>(channel);
    
    return {
      messages$,
      send: (data: T) => this.send(channel, data),
      leave: () => {
        (window as any).webui.leaveChannel(channel);
        this.channels.get(channel)?.complete();
        this.channels.delete(channel);
      }
    };
  }

  private onMessage(channel: string, data: any): void {
    const message: ChannelMessage = {
      channel,
      data,
      timestamp: Date.now()
    };
    this.channels.get(channel)?.next(message);
  }
}

// ============================================================================
// Message Queue Service
// ============================================================================

export interface Message {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  priority: number;
  replyTo?: string;
  correlationId?: string;
}

@Injectable({ providedIn: 'root' })
export class MessageQueueService {
  private messageSubject = new Subject<Message>();
  private pendingRequests = new Map<string, {
    resolve: (value: any) => void;
    reject: (reason: any) => void;
    timeout: any;
  }>();

  readonly messages$ = this.messageSubject.asObservable();

  constructor() {
    (window as any).messageQueue = {
      onMessage: (messageStr: string) => this.onMessage(messageStr)
    };
  }

  /**
   * Push message to queue
   */
  push(type: string, payload: any, priority: number = 5): void {
    const message: Message = {
      id: this.generateId(),
      type,
      payload,
      timestamp: Date.now(),
      priority
    };
    (window as any).webui.pushMessage(JSON.stringify(message));
  }

  /**
   * Request-Response pattern via message queue
   */
  request<T>(type: string, payload: any, timeout = 30000): Promise<T> {
    const correlationId = this.generateId();
    
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(correlationId);
        reject(new Error(`Message timeout: ${type}`));
      }, timeout);

      this.pendingRequests.set(correlationId, { resolve, reject, timeout: timeoutId });

      this.push(type, payload, 5);
      // correlationId would be included in payload
    });
  }

  /**
   * Subscribe to messages by type
   */
  subscribe(type: string, handler: (message: Message) => void): Subscription {
    const subscription = this.messages$
      .pipe(filter(msg => msg.type === type))
      .subscribe(handler);

    return {
      unsubscribe: () => subscription.unsubscribe()
    };
  }

  private onMessage(messageStr: string): void {
    const message: Message = JSON.parse(messageStr);
    this.messageSubject.next(message);

    // Check if it's a response to a request
    if (message.correlationId && this.pendingRequests.has(message.correlationId)) {
      const pending = this.pendingRequests.get(message.correlationId)!;
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(message.correlationId);
      pending.resolve(message.payload);
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}

// ============================================================================
// Binary Protocol Service
// ============================================================================

@Injectable({ providedIn: 'root' })
export class BinaryProtocolService {
  private readonly MAGIC = 0xABCD;
  private readonly VERSION = 1;

  /**
   * Encode message to binary format
   */
  encode(msgType: number, payload: Uint8Array): Uint8Array {
    const header = new Uint8Array(8);
    const view = new DataView(header.buffer);

    // Magic (2 bytes)
    view.setUint16(0, this.MAGIC, true); // little endian

    // Version (1 byte)
    view.setUint8(2, this.VERSION);

    // Message type (1 byte)
    view.setUint8(3, msgType);

    // Length (4 bytes)
    view.setUint32(4, payload.length, true);

    // Combine header and payload
    const result = new Uint8Array(header.length + payload.length);
    result.set(header, 0);
    result.set(payload, 8);

    return result;
  }

  /**
   * Decode binary message
   */
  decode(data: Uint8Array): { msgType: number; payload: Uint8Array } | null {
    if (data.length < 8) return null;

    const view = new DataView(data.buffer);
    const magic = view.getUint16(0, true);

    if (magic !== this.MAGIC) return null;

    const version = view.getUint8(2);
    const msgType = view.getUint8(3);
    const length = view.getUint32(4, true);

    if (version !== this.VERSION) return null;

    const payload = data.slice(8, 8 + length);
    return { msgType, payload };
  }

  /**
   * Send binary message via WebUI
   */
  send(msgType: number, payload: Uint8Array): void {
    const encoded = this.encode(msgType, payload);
    const base64 = this.arrayBufferToBase64(encoded);
    (window as any).webui.sendBinary(base64);
  }

  private arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

// ============================================================================
// Unified Communication Facade
// ============================================================================

export enum CommProtocol {
  RPC = 'rpc',
  EVENTS = 'events',
  CHANNELS = 'channels',
  MESSAGES = 'messages',
  BINARY = 'binary'
}

export interface CommConfig {
  rpc: boolean;
  events: boolean;
  channels: boolean;
  messages: boolean;
  binary: boolean;
}

@Injectable({ providedIn: 'root' })
export class CommunicationService {
  readonly config: CommConfig = {
    rpc: true,
    events: true,
    channels: false,
    messages: false,
    binary: false
  };

  constructor(
    private rpc: RpcClientService,
    private eventBus: EventBusService,
    private channel: ChannelService,
    private queue: MessageQueueService,
    private binary: BinaryProtocolService
  ) {}

  /**
   * RPC call
   */
  call<T>(method: string, params?: any[]): Promise<T> {
    if (!this.config.rpc) {
      throw new Error('RPC is disabled');
    }
    return this.rpc.call(method, params);
  }

  /**
   * Subscribe to event
   */
  on<T>(topic: string, handler: (data: T) => void): Subscription {
    if (!this.config.events) {
      throw new Error('Events are disabled');
    }
    return this.eventBus.subscribe(topic, handler);
  }

  /**
   * Publish event
   */
  emit(topic: string, data: any): void {
    if (!this.config.events) {
      throw new Error('Events are disabled');
    }
    this.eventBus.publish(topic, data);
  }

  /**
   * Join channel
   */
  joinChannel<T>(name: string) {
    if (!this.config.channels) {
      throw new Error('Channels are disabled');
    }
    return this.channel.join<T>(name);
  }

  /**
   * Send message
   */
  send(type: string, payload: any): void {
    if (!this.config.messages) {
      throw new Error('Messages are disabled');
    }
    this.queue.push(type, payload);
  }

  /**
   * Send binary data
   */
  sendBinary(msgType: number, data: Uint8Array): void {
    if (!this.config.binary) {
      throw new Error('Binary protocol is disabled');
    }
    this.binary.send(msgType, data);
  }
}

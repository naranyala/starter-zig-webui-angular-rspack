import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

/**
 * Event handler function type
 */
export type EventHandler = (data: any) => void;

/**
 * Subscription interface
 */
export interface Subscription {
  unsubscribe: () => void;
}

/**
 * Event Bus Service (Pub-Sub)
 * Handles event publishing and subscribing
 */
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

import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

/**
 * Channel message interface
 */
export interface ChannelMessage<T = any> {
  channel: string;
  data: T;
  timestamp: number;
}

/**
 * Channel Service (Full-Duplex)
 * Handles bidirectional communication channels
 */
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

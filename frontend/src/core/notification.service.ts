// Simple notification service
import { Injectable, signal } from '@angular/core';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly notifications = signal<Notification[]>([]);

  readonly items = this.notifications;

  show(message: string, type: Notification['type'] = 'info', duration = 3000): void {
    const notification: Notification = {
      id: Math.random().toString(36).slice(2),
      type,
      message,
      duration,
    };

    this.notifications.update(items => [...items, notification]);

    if (duration > 0) {
      setTimeout(() => this.dismiss(notification.id), duration);
    }
  }

  success(message: string, duration = 3000): void {
    this.show(message, 'success', duration);
  }

  error(message: string, duration = 5000): void {
    this.show(message, 'error', duration);
  }

  info(message: string, duration = 3000): void {
    this.show(message, 'info', duration);
  }

  warning(message: string, duration = 4000): void {
    this.show(message, 'warning', duration);
  }

  dismiss(id: string): void {
    this.notifications.update(items => items.filter(n => n.id !== id));
  }

  clear(): void {
    this.notifications.set([]);
  }
}

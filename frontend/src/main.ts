import 'zone.js';
import '@angular/compiler';
import './winbox-loader';
import { provideHttpClient } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideMarkdown } from 'ngx-markdown';
import { APP_ROUTES } from './app.routes';
import { AppComponent } from './views/app.component';

const logger = console;

const debugApiWindow = window as unknown as {
  __FRONTEND_EVENT_BUS__?: any;
};

// Simple event bus for backward compatibility
class SimpleEventBus {
  private subscribers = new Map<string, Set<(payload: any) => void>>();

  init(app: string, replaySize?: number) {}

  publish(event: string, payload: any) {
    const handlers = this.subscribers.get(event) || new Set();
    for (const handler of handlers) {
      handler(payload);
    }
  }

  subscribe(event: string, handler: (payload: any) => void) {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }
    this.subscribers.get(event)!.add(handler);
  }
}

const eventBus = new SimpleEventBus();
eventBus.init('app', 300);
debugApiWindow.__FRONTEND_EVENT_BUS__ = eventBus;

logger.info('Starting Angular bootstrap');

try {
  bootstrapApplication(AppComponent, {
    providers: [
      provideHttpClient(),
      provideMarkdown(),
      provideRouter(APP_ROUTES),
    ],
  })
    .then(appRef => {
      logger.info('Angular bootstrap completed successfully');

      // Global error handler
      window.addEventListener('error', event => {
        event.preventDefault();
        const error = event.error ?? event.message ?? 'Unknown error';
        logger.error('Global error:', error);
      });

      // Unhandled promise rejection handler
      window.addEventListener('unhandledrejection', event => {
        event.preventDefault();
        const reason = event.reason ?? 'Unknown rejection';
        logger.error('Unhandled promise rejection:', reason);
      });

      // Publish app ready event
      eventBus.publish('app:ready', { timestamp: Date.now() });
    })
    .catch(err => {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error('Angular bootstrap failed:', errorMessage);
    });
} catch (err: unknown) {
  const errorMessage = err instanceof Error ? err.message : String(err);
  logger.error('Bootstrap threw synchronously:', errorMessage);
}

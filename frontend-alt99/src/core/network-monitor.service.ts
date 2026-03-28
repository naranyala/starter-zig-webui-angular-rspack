// Network monitor service for tracking online/offline status
import { Injectable, signal, computed } from '@angular/core';

export interface NetworkStatus {
  online: boolean;
  lastChecked: number;
  requests: number;
  failures: number;
  successRate: number;
  type: string;
}

@Injectable({ providedIn: 'root' })
export class NetworkMonitorService {
  private readonly online = signal<boolean>(true);
  private readonly lastChecked = signal<number>(Date.now());
  private readonly requests = signal<number>(0);
  private readonly failures = signal<number>(0);

  readonly status = computed<NetworkStatus>(() => ({
    online: this.online(),
    lastChecked: this.lastChecked(),
    requests: this.requests(),
    failures: this.failures(),
    successRate: this.calculateSuccessRate(),
    type: 'unknown',
  }));

  constructor() {
    this.setupListeners();
  }

  /**
   * Check if currently online
   */
  isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  /**
   * Get current network status
   */
  getStatus(): NetworkStatus {
    return this.status();
  }

  /**
   * Wait for network to be online
   */
  async waitForOnline(timeoutMs: number): Promise<boolean> {
    if (this.isOnline()) {
      return true;
    }

    return new Promise(resolve => {
      const timeoutId = setTimeout(() => {
        window.removeEventListener('online', onOnline);
        resolve(false);
      }, timeoutMs);

      const onOnline = () => {
        clearTimeout(timeoutId);
        window.removeEventListener('online', onOnline);
        resolve(true);
      };

      window.addEventListener('online', onOnline);
    });
  }

  /**
   * Record a network request
   */
  recordRequest(latencyMs: number, success: boolean): void {
    this.requests.update(count => count + 1);
    this.lastChecked.set(Date.now());
    
    if (!success) {
      this.failures.update(count => count + 1);
    }
  }

  /**
   * Dispose of listeners (cleanup)
   */
  dispose(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline.bind(this));
      window.removeEventListener('offline', this.handleOffline.bind(this));
    }
  }

  private setupListeners(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }

  private handleOnline(): void {
    this.online.set(true);
    this.lastChecked.set(Date.now());
  }

  private handleOffline(): void {
    this.online.set(false);
    this.lastChecked.set(Date.now());
  }

  private calculateSuccessRate(): number {
    const requests = this.requests();
    const failures = this.failures();
    if (requests === 0) {
      return 100;
    }
    return ((requests - failures) / requests) * 100;
  }
}

// Loading service for managing loading states and spinners
import { Injectable, signal, computed } from '@angular/core';

export interface LoadingState {
  id: string;
  message?: string;
  createdAt: number;
}

export interface LoadingConfig {
  message?: string;
  minDuration?: number;
  backdrop?: boolean;
}

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly loaders = signal<LoadingState[]>([]);
  private readonly globalMessage = signal<string | undefined>(undefined);

  readonly isLoading = computed(() => this.loaders().length > 0);
  readonly count = computed(() => this.loaders().length);
  readonly currentMessage = computed(() => {
    const loaders = this.loaders();
    return loaders.length > 0 ? loaders[loaders.length - 1].message : this.globalMessage();
  });

  /**
   * Show a loading indicator
   */
  show(message?: string, config?: LoadingConfig): string {
    const id = this.generateId();
    const state: LoadingState = {
      id,
      message: message ?? config?.message,
      createdAt: Date.now(),
    };

    this.loaders.update(loaders => [...loaders, state]);

    if (config?.minDuration) {
      setTimeout(() => {
        this.hide(id);
      }, config.minDuration);
    }

    return id;
  }

  /**
   * Hide a loading indicator
   */
  hide(id?: string): void {
    const loaders = this.loaders();

    if (id) {
      this.loaders.update(list => list.filter(l => l.id !== id));
    } else if (loaders.length > 0) {
      this.loaders.update(list => list.slice(0, -1));
    }
  }

  /**
   * Hide all loading indicators
   */
  hideAll(): void {
    this.loaders.set([]);
  }

  /**
   * Set a global loading message
   */
  setMessage(message: string | undefined): void {
    this.globalMessage.set(message);
  }

  /**
   * Wrap a promise with loading state
   */
  async wrap<T>(
    promise: Promise<T>,
    message?: string,
    config?: LoadingConfig
  ): Promise<T> {
    const id = this.show(message, config);

    try {
      return await promise;
    } finally {
      this.hide(id);
    }
  }

  private generateId(): string {
    return `loading_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

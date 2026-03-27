// Modern storage service with signals
import { Injectable, signal, computed, effect } from '@angular/core';

export interface StorageEntry<T> {
  value: T;
  expires?: number;
}

export interface StorageStats {
  count: number;
  memoryCount: number;
  localStorageCount: number;
}

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly prefix = 'app:';
  private readonly memoryStore = new Map<string, StorageEntry<unknown>>();
  
  // Signal-based state tracking
  private readonly keys = signal<Set<string>>(new Set());
  private readonly stats = signal<StorageStats>({
    count: 0,
    memoryCount: 0,
    localStorageCount: 0,
  });
  
  // Public readonly signals
  readonly allKeys = this.keys.asReadonly();
  readonly storageStats = this.stats.asReadonly();
  
  // Computed signals
  readonly count = computed(() => this.stats().count);
  readonly hasItems = computed(() => this.stats().count > 0);
  readonly isEmpty = computed(() => this.stats().count === 0);
  
  constructor() {
    // Load initial keys
    this.loadKeys();
    
    // Setup effect to update stats when keys change
    effect(() => {
      const keys = this.keys();
      let localStorageCount = 0;
      let memoryCount = 0;
      
      keys.forEach(key => {
        const fullKey = this.prefix + key;
        try {
          if (localStorage.getItem(fullKey)) {
            localStorageCount++;
          } else {
            memoryCount++;
          }
        } catch {
          memoryCount++;
        }
      });
      
      this.stats.set({
        count: keys.size,
        memoryCount,
        localStorageCount,
      });
    });
  }

  /**
   * Get a value from storage
   */
  get<T>(key: string, defaultValue?: T): T | null {
    const fullKey = this.prefix + key;
    const entry = this.getEntry(fullKey);

    if (!entry) {
      return defaultValue ?? null;
    }

    // Check expiration
    if (entry.expires && Date.now() > entry.expires) {
      this.delete(key);
      return defaultValue ?? null;
    }

    return entry.value as T;
  }

  /**
   * Set a value in storage with optional TTL
   */
  set<T>(key: string, value: T, options?: { ttl?: number }): void {
    const fullKey = this.prefix + key;
    const entry: StorageEntry<T> = {
      value,
      expires: options?.ttl ? Date.now() + options.ttl : undefined,
    };

    try {
      localStorage.setItem(fullKey, JSON.stringify(entry));
      this.updateKeys(key, true);
    } catch {
      // Fallback to memory storage if localStorage fails
      this.memoryStore.set(fullKey, entry as StorageEntry<unknown>);
      this.updateKeys(key, true);
    }
  }

  /**
   * Delete a value from storage
   */
  delete(key: string): void {
    const fullKey = this.prefix + key;
    try {
      localStorage.removeItem(fullKey);
    } catch {
      this.memoryStore.delete(fullKey);
    }
    this.updateKeys(key, false);
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    const fullKey = this.prefix + key;
    try {
      const item = localStorage.getItem(fullKey);
      if (item) {
        const entry = JSON.parse(item) as StorageEntry<unknown>;
        // Check expiration
        if (entry.expires && Date.now() > entry.expires) {
          this.delete(key);
          return false;
        }
        return true;
      }
      return false;
    } catch {
      const entry = this.memoryStore.get(fullKey);
      if (entry && entry.expires && Date.now() > entry.expires) {
        this.delete(key);
        return false;
      }
      return !!entry;
    }
  }

  /**
   * Clear all storage
   */
  clear(): void {
    try {
      // Clear only prefixed keys from localStorage
      const keys = Array.from(this.keys());
      keys.forEach(key => {
        try {
          localStorage.removeItem(this.prefix + key);
        } catch {
          // Ignore
        }
      });
    } catch {
      // Ignore
    }
    this.memoryStore.clear();
    this.keys.set(new Set());
  }

  /**
   * Get all values as object
   */
  getAll(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    this.keys().forEach(key => {
      const value = this.get(key);
      if (value !== null) {
        result[key] = value;
      }
    });
    return result;
  }

  /**
   * Get keys matching pattern
   */
  getKeysByPattern(pattern: string): string[] {
    const regex = new RegExp(pattern);
    return Array.from(this.keys()).filter(key => regex.test(key));
  }

  /**
   * Get entries with expiration in next N milliseconds
   */
  getExpiringSoon(ms: number): string[] {
    const threshold = Date.now() + ms;
    return Array.from(this.keys()).filter(key => {
      const entry = this.getEntry(this.prefix + key);
      return entry?.expires !== undefined && entry.expires <= threshold;
    });
  }

  /**
   * Refresh expiration for a key
   */
  refreshExpiration(key: string, ttl: number): boolean {
    const value = this.get(key);
    if (value === null) return false;
    this.set(key, value as any, { ttl });
    return true;
  }

  private updateKeys(key: string, add: boolean): void {
    this.keys.update(keys => {
      const newKeys = new Set(keys);
      if (add) {
        newKeys.add(key);
      } else {
        newKeys.delete(key);
      }
      return newKeys;
    });
  }

  private loadKeys(): void {
    const keys = new Set<string>();
    
    // Load from localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        const storageKey = key.slice(this.prefix.length);
        keys.add(storageKey);
      }
    }
    
    // Load from memory store
    this.memoryStore.forEach((_, key) => {
      if (key.startsWith(this.prefix)) {
        const storageKey = key.slice(this.prefix.length);
        keys.add(storageKey);
      }
    });
    
    this.keys.set(keys);
  }

  private getEntry<T>(key: string): StorageEntry<T> | null {
    try {
      const item = localStorage.getItem(key);
      if (item) {
        return JSON.parse(item) as StorageEntry<T>;
      }
    } catch {
      return (this.memoryStore.get(key) as StorageEntry<T>) ?? null;
    }
    return (this.memoryStore.get(key) as StorageEntry<T>) ?? null;
  }
}

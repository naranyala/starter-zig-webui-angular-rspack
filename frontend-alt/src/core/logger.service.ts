// Modern logger service with signals
import { Injectable, signal, computed, effect } from '@angular/core';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  level: LogLevel;
  message: string;
  data?: unknown;
  timestamp: number;
  source?: string;
}

export interface LogStats {
  total: number;
  debug: number;
  info: number;
  warn: number;
  error: number;
}

@Injectable({ providedIn: 'root' })
export class LoggerService {
  private readonly minLevel: LogLevel = 'info';
  private readonly maxEntries = 100;
  
  // Signal-based log buffer
  private readonly logs = signal<LogEntry[]>([]);
  private readonly stats = signal<LogStats>({
    total: 0,
    debug: 0,
    info: 0,
    warn: 0,
    error: 0,
  });
  
  // Public readonly signals
  readonly allLogs = this.logs.asReadonly();
  readonly logStats = this.stats.asReadonly();
  
  // Computed signals
  readonly errorLogs = computed(() => 
    this.logs().filter(log => log.level === 'error')
  );
  readonly warnLogs = computed(() => 
    this.logs().filter(log => log.level === 'warn')
  );
  readonly recentLogs = computed(() => 
    this.logs().slice(-20)
  );
  readonly hasErrors = computed(() => this.stats().error > 0);
  readonly logCount = computed(() => this.stats().total);
  
  private readonly levelOrder: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor() {
    // Setup effect to trim logs when they exceed max
    effect(() => {
      const currentLogs = this.logs();
      if (currentLogs.length > this.maxEntries) {
        this.logs.set(currentLogs.slice(-this.maxEntries));
      }
    });
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levelOrder[level] >= this.levelOrder[this.minLevel];
  }

  private addLog(level: LogLevel, message: string, data?: unknown, source?: string): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      level,
      message,
      data,
      timestamp: Date.now(),
      source,
    };

    this.logs.update(logs => [...logs, entry]);
    this.updateStats(level);

    // Also log to console
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    switch (level) {
      case 'debug':
        console.debug(logMessage, data ?? '');
        break;
      case 'info':
        console.info(logMessage, data ?? '');
        break;
      case 'warn':
        console.warn(logMessage, data ?? '');
        break;
      case 'error':
        console.error(logMessage, data ?? '');
        break;
    }
  }

  private updateStats(level: LogLevel): void {
    this.stats.update(stats => ({
      ...stats,
      total: stats.total + 1,
      [level]: stats[level] + 1,
    }));
  }

  debug(message: string, data?: unknown, source?: string): void {
    this.addLog('debug', message, data, source);
  }

  info(message: string, data?: unknown, source?: string): void {
    this.addLog('info', message, data, source);
  }

  warn(message: string, data?: unknown, source?: string): void {
    this.addLog('warn', message, data, source);
  }

  error(message: string, data?: unknown, source?: string): void {
    this.addLog('error', message, data, source);
  }

  /**
   * Get logs filtered by level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs().filter(log => log.level === level);
  }

  /**
   * Get logs since a timestamp
   */
  getLogsSince(timestamp: number): LogEntry[] {
    return this.logs().filter(log => log.timestamp >= timestamp);
  }

  /**
   * Get logs by source
   */
  getLogsBySource(source: string): LogEntry[] {
    return this.logs().filter(log => log.source === source);
  }

  /**
   * Search logs by message content
   */
  searchLogs(query: string): LogEntry[] {
    const lowerQuery = query.toLowerCase();
    return this.logs().filter(log => 
      log.message.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify(this.logs(), null, 2);
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs.set([]);
    this.stats.set({
      total: 0,
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
    });
  }

  /**
   * Clear error logs only
   */
  clearErrors(): void {
    this.logs.update(logs => logs.filter(log => log.level !== 'error'));
    this.stats.update(stats => ({
      ...stats,
      total: stats.total - stats.error,
      error: 0,
    }));
  }

  /**
   * Set minimum log level
   */
  setMinLevel(level: LogLevel): void {
    Object.assign(this, { minLevel: level });
  }
}

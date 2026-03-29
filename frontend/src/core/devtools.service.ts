// DevTools service for connecting to backend devtools API
import { Injectable, signal, computed, inject } from '@angular/core';
import { ApiService } from './api.service';

export interface DevToolsStats {
  uptime_seconds: number;
  memory_usage: MemoryStats;
  system_info: SystemSummary;
  active_connections: number;
  request_count: number;
  error_count: number;
  cache_stats: CacheSummary;
  database_stats: DatabaseSummary;
  last_updated: number;
}

export interface MemoryStats {
  used_mb: number;
  total_mb: number;
  percent: number;
  available_mb: number;
}

export interface SystemSummary {
  hostname: string;
  os: string;
  arch: string;
  cpu_cores: number;
  load_avg: number[];
}

export interface CacheSummary {
  total_entries: number;
  hit_count: number;
  miss_count: number;
  hit_rate: number;
  size_bytes: number;
}

export interface DatabaseSummary {
  total_records: number;
  table_count: number;
  last_write: number;
  size_bytes: number;
}

export interface LogEntry {
  timestamp: number;
  level: string;
  message: string;
  source: string;
  context: Record<string, string>;
}

export interface ErrorReport {
  timestamp: number;
  error_code: string;
  message: string;
  source: string;
  stack_trace: string;
  context: Record<string, string>;
  resolved: boolean;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags: Record<string, string>;
}

export interface DevToolsState {
  loading: boolean;
  error: string | null;
  lastRefresh: number | null;
}

@Injectable({ providedIn: 'root' })
export class DevToolsService {
  private readonly api = inject(ApiService);

  // State signals
  private readonly state = signal<DevToolsState>({
    loading: false,
    error: null,
    lastRefresh: null,
  });

  // Data signals
  private readonly stats = signal<DevToolsStats | null>(null);
  private readonly logs = signal<LogEntry[]>([]);
  private readonly errors = signal<ErrorReport[]>([]);
  private readonly metrics = signal<PerformanceMetric[]>([]);

  // Public readonly signals
  readonly isLoading = this.state.asReadonly();
  readonly hasError = computed(() => this.state().error !== null);
  readonly lastRefresh = computed(() => this.state().lastRefresh);

  // Computed signals
  readonly devToolsStats = computed(() => this.stats());
  readonly recentLogs = computed(() => this.logs().slice(-50));
  readonly recentErrors = computed(() => this.errors().slice(-20));
  readonly recentMetrics = computed(() => this.metrics().slice(-100));

  readonly errorStats = computed(() => {
    const errors = this.errors();
    return {
      total: errors.length,
      criticalCount: errors.filter(e => e.error_code.includes('CRITICAL')).length,
      bySource: this.groupBySource(errors),
    };
  });

  /**
   * Get comprehensive devtools statistics
   */
  async getStats(): Promise<DevToolsStats> {
    this.setState({ loading: true, error: null });

    try {
      const stats = await this.api.callOrThrow<DevToolsStats>('devtools.getStats');
      this.stats.set(stats);
      this.setState({ loading: false, lastRefresh: Date.now() });
      return stats;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to get stats';
      this.setState({ loading: false, error: errorMsg });
      throw error;
    }
  }

  /**
   * Get recent logs
   */
  async getLogs(): Promise<LogEntry[]> {
    try {
      const logs = await this.api.callOrThrow<LogEntry[]>('devtools.getLogs');
      this.logs.set(logs);
      return logs;
    } catch (error) {
      console.error('Failed to get logs:', error);
      return [];
    }
  }

  /**
   * Get error reports
   */
  async getErrors(): Promise<ErrorReport[]> {
    try {
      const errors = await this.api.callOrThrow<ErrorReport[]>('devtools.getErrors');
      this.errors.set(errors);
      return errors;
    } catch (error) {
      console.error('Failed to get errors:', error);
      return [];
    }
  }

  /**
   * Get performance metrics
   */
  async getMetrics(): Promise<PerformanceMetric[]> {
    try {
      const metrics = await this.api.callOrThrow<PerformanceMetric[]>('devtools.getMetrics');
      this.metrics.set(metrics);
      return metrics;
    } catch (error) {
      console.error('Failed to get metrics:', error);
      return [];
    }
  }

  /**
   * Get application uptime
   */
  async getUptime(): Promise<number> {
    try {
      const response = await this.api.callOrThrow<{ uptime: number }>('devtools.getUptime');
      return response.uptime;
    } catch (error) {
      console.error('Failed to get uptime:', error);
      return 0;
    }
  }

  /**
   * Log a message to backend
   */
  async log(level: string, message: string, source: string): Promise<void> {
    try {
      await this.api.call('devtools.log', [{ level, message, source }]);
    } catch (error) {
      console.error('Failed to log:', error);
    }
  }

  /**
   * Report an error to backend
   */
  async reportError(code: string, message: string, source: string): Promise<void> {
    try {
      await this.api.call('devtools.reportError', [{ code, message, source }]);
      await this.getErrors(); // Refresh errors
    } catch (error) {
      console.error('Failed to report error:', error);
    }
  }

  /**
   * Record a performance metric
   */
  async recordMetric(name: string, value: number, unit: string): Promise<void> {
    try {
      await this.api.call('devtools.recordMetric', [{ name, value, unit }]);
    } catch (error) {
      console.error('Failed to record metric:', error);
    }
  }

  /**
   * Clear backend logs
   */
  async clearLogs(): Promise<void> {
    try {
      await this.api.call('devtools.clearLogs');
      this.logs.set([]);
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  }

  /**
   * Clear backend errors
   */
  async clearErrors(): Promise<void> {
    try {
      await this.api.call('devtools.clearErrors');
      this.errors.set([]);
    } catch (error) {
      console.error('Failed to clear errors:', error);
    }
  }

  /**
   * Refresh all devtools data
   */
  async refresh(): Promise<void> {
    await Promise.all([
      this.getStats(),
      this.getLogs(),
      this.getErrors(),
      this.getMetrics(),
    ]);
  }

  private setState(partial: Partial<DevToolsState>): void {
    this.state.update(state => ({ ...state, ...partial }));
  }

  private groupBySource(errors: ErrorReport[]): Record<string, number> {
    return errors.reduce((acc, error) => {
      acc[error.source] = (acc[error.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}

// src/views/devtools/devtools.component.ts
// DevTools panel for debugging with backend integration

import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DevToolsService, type LogEntry, type ErrorReport } from '../../core/devtools.service';

@Component({
  selector: 'app-devtools',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="devtools">
      <div class="devtools__header">
        <h3>DevTools</h3>
        <div class="devtools__actions">
          <button type="button" class="btn btn--icon" (click)="refresh()" title="Refresh">⟳</button>
          <button type="button" class="btn btn--icon" (click)="clearLogs()" title="Clear">🗔</button>
        </div>
      </div>

      <div class="devtools__tabs">
        @for (tab of tabs; track tab.id) {
          <button type="button"
                  class="devtools__tab"
                  [class.active]="activeTab() === tab.id"
                  (click)="activeTab.set(tab.id)">
            {{ tab.icon }} {{ tab.label }}
          </button>
        }
      </div>

      <div class="devtools__content">
        @if (devToolsService.isLoading()) {
          <div class="loading-state">Loading...</div>
        }

        @if (activeTab() === 'stats') {
          <div class="devtools-panel">
            <div class="panel-section">
              <h4>Application Statistics</h4>
              <div class="stats-grid">
                <div class="stat-card">
                  <div class="stat-card__value">{{ formatUptime(uptime()) }}</div>
                  <div class="stat-card__label">Uptime</div>
                </div>
                <div class="stat-card">
                  <div class="stat-card__value">{{ stats()?.request_count ?? 0 }}</div>
                  <div class="stat-card__label">Requests</div>
                </div>
                <div class="stat-card stat-card--warning">
                  <div class="stat-card__value">{{ stats()?.error_count ?? 0 }}</div>
                  <div class="stat-card__label">Errors</div>
                </div>
                <div class="stat-card">
                  <div class="stat-card__value">{{ stats()?.active_connections ?? 0 }}</div>
                  <div class="stat-card__label">Connections</div>
                </div>
              </div>
            </div>

            <div class="panel-section">
              <h4>Memory Usage</h4>
              <div class="memory-bar">
                <div class="memory-bar__fill" [style.width.%]="memoryPercent()">
                  {{ memoryPercent() | number:'1.0-0' }}%
                </div>
              </div>
              <div class="memory-details">
                <span>Used: {{ memoryUsed() | number:'1.0-0' }} MB</span>
                <span>Total: {{ memoryTotal() | number:'1.0-0' }} MB</span>
                <span>Available: {{ memoryAvailable() | number:'1.0-0' }} MB</span>
              </div>
            </div>

            <div class="panel-section">
              <h4>System Information</h4>
              <div class="system-info">
                <div class="info-row">
                  <span class="info-label">Hostname:</span>
                  <span class="info-value">{{ systemInfo()?.hostname ?? 'N/A' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">OS:</span>
                  <span class="info-value">{{ systemInfo()?.os ?? 'N/A' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Architecture:</span>
                  <span class="info-value">{{ systemInfo()?.arch ?? 'N/A' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">CPU Cores:</span>
                  <span class="info-value">{{ systemInfo()?.cpu_cores ?? 'N/A' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Load Average:</span>
                  <span class="info-value">{{ loadAverage() }}</span>
                </div>
              </div>
            </div>
          </div>
        }

        @if (activeTab() === 'logs') {
          <div class="devtools-panel">
            <div class="panel-section">
              <h4>Recent Logs ({{ logs().length }})</h4>
              <div class="logs-list">
                @for (log of logs(); track log.timestamp) {
                  <div class="log-item log-item--{{ log.level }}">
                    <span class="log-item__time">{{ formatTime(log.timestamp) }}</span>
                    <span class="log-item__level">{{ log.level }}</span>
                    <span class="log-item__source">{{ log.source }}</span>
                    <span class="log-item__message">{{ log.message }}</span>
                  </div>
                } @empty {
                  <div class="empty-state">No logs available</div>
                }
              </div>
            </div>
          </div>
        }

        @if (activeTab() === 'errors') {
          <div class="devtools-panel">
            <div class="panel-section">
              <h4>Error Reports ({{ errors().length }})</h4>
              <div class="error-stats">
                <div class="error-stat">
                  <span class="error-stat__value">{{ errorStats().total }}</span>
                  <span class="error-stat__label">Total</span>
                </div>
                <div class="error-stat error-stat--critical">
                  <span class="error-stat__value">{{ errorStats().criticalCount }}</span>
                  <span class="error-stat__label">Critical</span>
                </div>
              </div>
              <div class="errors-list">
                @for (error of errors(); track error.timestamp) {
                  <div class="error-item error-item--{{ error.error_code.includes('CRITICAL') ? 'critical' : 'normal' }}">
                    <div class="error-item__header">
                      <span class="error-item__time">{{ formatTime(error.timestamp) }}</span>
                      <span class="error-item__code">{{ error.error_code }}</span>
                    </div>
                    <div class="error-item__message">{{ error.message }}</div>
                    <div class="error-item__source">Source: {{ error.source }}</div>
                  </div>
                } @empty {
                  <div class="empty-state">No errors reported</div>
                }
              </div>
            </div>
          </div>
        }

        @if (activeTab() === 'metrics') {
          <div class="devtools-panel">
            <div class="panel-section">
              <h4>Performance Metrics</h4>
              <div class="metrics-list">
                @for (metric of metrics(); track metric.timestamp) {
                  <div class="metric-item">
                    <span class="metric-item__name">{{ metric.name }}</span>
                    <span class="metric-item__value">{{ metric.value | number:'1.2-2' }} {{ metric.unit }}</span>
                    <span class="metric-item__time">{{ formatTime(metric.timestamp) }}</span>
                  </div>
                } @empty {
                  <div class="empty-state">No metrics recorded</div>
                }
              </div>
            </div>
          </div>
        }

        @if (activeTab() === 'actions') {
          <div class="devtools-panel">
            <div class="panel-section">
              <h4>Quick Actions</h4>
              <div class="actions-grid">
                <button type="button" class="action-btn" (click)="refresh()">
                  ⟳ Refresh All Data
                </button>
                <button type="button" class="action-btn" (click)="clearLogs()">
                  🗔 Clear Logs
                </button>
                <button type="button" class="action-btn" (click)="clearErrors()">
                  🗔 Clear Errors
                </button>
                <button type="button" class="action-btn" (click)="triggerTestError()">
                  ⚠ Trigger Test Error
                </button>
              </div>
            </div>

            <div class="panel-section">
              <h4>Environment</h4>
              <div class="env-grid">
                <div class="env-item">
                  <span class="env-label">User Agent:</span>
                  <span class="env-value env-value--small">{{ userAgent }}</span>
                </div>
                <div class="env-item">
                  <span class="env-label">Language:</span>
                  <span class="env-value">{{ language }}</span>
                </div>
                <div class="env-item">
                  <span class="env-label">Screen:</span>
                  <span class="env-value">{{ screenResolution }}</span>
                </div>
                <div class="env-item">
                  <span class="env-label">Timezone:</span>
                  <span class="env-value">{{ timezone }}</span>
                </div>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .devtools {
      display: flex;
      flex-direction: column;
      height: 100%;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      background: #1e1e1e;
      color: #d4d4d4;
    }

    .devtools__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: #252526;
      border-bottom: 1px solid #3c3c3c;
    }

    .devtools__header h3 {
      margin: 0;
      font-size: 14px;
      color: #fff;
    }

    .devtools__actions {
      display: flex;
      gap: 4px;
    }

    .btn--icon {
      background: #3c3c3c;
      border: none;
      color: #d4d4d4;
      padding: 4px 8px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }

    .btn--icon:hover {
      background: #4c4c4c;
    }

    .devtools__tabs {
      display: flex;
      gap: 2px;
      padding: 4px 8px;
      background: #252526;
      border-bottom: 1px solid #3c3c3c;
    }

    .devtools__tab {
      background: transparent;
      border: none;
      color: #858585;
      padding: 6px 12px;
      border-radius: 4px 4px 0 0;
      cursor: pointer;
      white-space: nowrap;
      font-size: 11px;
    }

    .devtools__tab:hover {
      background: #2a2a2a;
      color: #d4d4d4;
    }

    .devtools__tab.active {
      background: #1e1e1e;
      color: #fff;
    }

    .devtools__content {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
    }

    .loading-state {
      text-align: center;
      padding: 40px;
      color: #858585;
    }

    .devtools-panel {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .panel-section {
      background: #252526;
      border-radius: 6px;
      padding: 12px;
    }

    .panel-section h4 {
      margin: 0 0 12px 0;
      font-size: 13px;
      color: #fff;
      border-bottom: 1px solid #3c3c3c;
      padding-bottom: 8px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 8px;
    }

    .stat-card {
      background: #1e1e1e;
      padding: 12px;
      border-radius: 4px;
      text-align: center;
      border-left: 3px solid #007acc;
    }

    .stat-card--warning {
      border-left-color: #c7254e;
    }

    .stat-card__value {
      font-size: 20px;
      font-weight: bold;
      color: #fff;
    }

    .stat-card__label {
      font-size: 10px;
      color: #858585;
      margin-top: 4px;
    }

    .memory-bar {
      background: #1e1e1e;
      border-radius: 4px;
      height: 30px;
      overflow: hidden;
      position: relative;
    }

    .memory-bar__fill {
      background: linear-gradient(90deg, #007acc, #00a8ff);
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-weight: bold;
      transition: width 0.3s ease;
    }

    .memory-details {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 11px;
      color: #858585;
    }

    .system-info {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 8px;
      background: #1e1e1e;
      border-radius: 4px;
    }

    .info-label {
      color: #858585;
    }

    .info-value {
      color: #d4d4d4;
    }

    .logs-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      max-height: 400px;
      overflow-y: auto;
    }

    .log-item {
      display: grid;
      grid-template-columns: 60px 50px 80px 1fr;
      gap: 8px;
      padding: 6px 8px;
      background: #1e1e1e;
      border-radius: 4px;
      font-size: 11px;
    }

    .log-item--debug { border-left: 2px solid #6a9955; }
    .log-item--info { border-left: 2px solid #007acc; }
    .log-item--warn { border-left: 2px solid #dcdcaa; }
    .log-item--error { border-left: 2px solid #c7254e; }

    .log-item__time { color: #858585; }
    .log-item__level { font-weight: bold; }
    .log-item__source { color: #9cdcfe; }
    .log-item__message { color: #d4d4d4; }

    .error-stats {
      display: flex;
      gap: 16px;
      margin-bottom: 12px;
    }

    .error-stat {
      background: #1e1e1e;
      padding: 12px;
      border-radius: 4px;
      text-align: center;
      flex: 1;
    }

    .error-stat--critical {
      background: #2d1f1f;
    }

    .error-stat__value {
      display: block;
      font-size: 24px;
      font-weight: bold;
      color: #fff;
    }

    .error-stat--critical .error-stat__value {
      color: #c7254e;
    }

    .error-stat__label {
      display: block;
      font-size: 10px;
      color: #858585;
      margin-top: 4px;
    }

    .errors-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      max-height: 400px;
      overflow-y: auto;
    }

    .error-item {
      padding: 8px;
      background: #1e1e1e;
      border-radius: 4px;
      border-left: 3px solid #858585;
    }

    .error-item--critical {
      border-left-color: #c7254e;
      background: #2d1f1f;
    }

    .error-item__header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      font-size: 10px;
    }

    .error-item__time { color: #858585; }
    .error-item__code { color: #9cdcfe; font-weight: bold; }
    .error-item__message { color: #d4d4d4; margin-bottom: 4px; }
    .error-item__source { color: #858585; font-size: 10px; }

    .metrics-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      max-height: 400px;
      overflow-y: auto;
    }

    .metric-item {
      display: flex;
      justify-content: space-between;
      padding: 6px 8px;
      background: #1e1e1e;
      border-radius: 4px;
      font-size: 11px;
    }

    .metric-item__name { color: #9cdcfe; }
    .metric-item__value { color: #b5cea8; font-weight: bold; }
    .metric-item__time { color: #858585; }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 8px;
      margin-bottom: 16px;
    }

    .action-btn {
      background: #0e639c;
      border: none;
      color: #fff;
      padding: 10px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }

    .action-btn:hover {
      background: #1177bb;
    }

    .env-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 8px;
    }

    .env-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 8px;
      background: #1e1e1e;
      border-radius: 4px;
    }

    .env-label {
      color: #858585;
      font-size: 10px;
    }

    .env-value {
      color: #d4d4d4;
      font-size: 11px;
    }

    .env-value--small {
      font-size: 10px;
      word-break: break-all;
    }

    .empty-state {
      text-align: center;
      padding: 20px;
      color: #858585;
    }
  `],
})
export class DevtoolsComponent implements OnInit {
  private readonly devToolsService = inject(DevToolsService);

  activeTab = signal<'stats' | 'logs' | 'errors' | 'metrics' | 'actions'>('stats');

  tabs = [
    { id: 'stats', label: 'Statistics', icon: '📊' },
    { id: 'logs', label: 'Logs', icon: '📝' },
    { id: 'errors', label: 'Errors', icon: '⚠' },
    { id: 'metrics', label: 'Metrics', icon: '📈' },
    { id: 'actions', label: 'Actions', icon: '⚡' },
  ];

  // Environment info
  userAgent = '';
  language = '';
  screenResolution = '';
  timezone = '';

  // Computed signals from service
  readonly stats = this.devToolsService.devToolsStats;
  readonly logs = this.devToolsService.recentLogs;
  readonly errors = this.devToolsService.recentErrors;
  readonly metrics = this.devToolsService.recentMetrics;
  readonly errorStats = this.devToolsService.errorStats;

  // Derived computed values
  readonly uptime = computed(() => this.stats()?.uptime_seconds ?? 0);
  readonly memoryUsed = computed(() => this.stats()?.memory_usage.used_mb ?? 0);
  readonly memoryTotal = computed(() => this.stats()?.memory_usage.total_mb ?? 0);
  readonly memoryAvailable = computed(() => this.stats()?.memory_usage.available_mb ?? 0);
  readonly memoryPercent = computed(() => this.stats()?.memory_usage.percent ?? 0);
  readonly systemInfo = computed(() => this.stats()?.system_info ?? null);
  readonly loadAverage = computed(() => {
    const load = this.systemInfo()?.load_avg ?? [];
    return load.map(l => l.toFixed(2)).join(', ') || 'N/A';
  });

  constructor() {
    if (typeof window !== 'undefined') {
      this.userAgent = navigator.userAgent;
      this.language = navigator.language;
      this.screenResolution = `${screen.width}x${screen.height}`;
      this.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
  }

  ngOnInit(): void {
    this.refresh();
  }

  async refresh(): Promise<void> {
    await this.devToolsService.refresh();
  }

  async clearLogs(): Promise<void> {
    await this.devToolsService.clearLogs();
    await this.devToolsService.getLogs();
  }

  async clearErrors(): Promise<void> {
    await this.devToolsService.clearErrors();
    await this.devToolsService.getErrors();
  }

  async triggerTestError(): Promise<void> {
    await this.devToolsService.reportError('TEST_ERROR', 'Test error from DevTools', 'devtools');
    await this.devToolsService.getErrors();
  }

  formatTime(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleTimeString();
  }

  formatUptime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  }
}

// Simplified DevTools component
import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoggerService } from '../../core/logger.service';
import { CommunicationService } from '../../core/communication.service';

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

      <div class="devtools__content">
        <section class="devtools__section">
          <h4>System Info</h4>
          <div class="devtools__info">
            <div class="info-item">
              <span class="info-label">Status:</span>
              <span class="info-value" [class.ok]="connected()" [class.error]="!connected()">
                {{ connected() ? 'Connected' : 'Disconnected' }}
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">Events Sent:</span>
              <span class="info-value">{{ stats().eventsSent }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Events Received:</span>
              <span class="info-value">{{ stats().eventsReceived }}</span>
            </div>
          </div>
        </section>

        <section class="devtools__section">
          <h4>Recent Logs</h4>
          <div class="devtools__logs">
            @for (log of logs(); track log.timestamp) {
              <div class="log-entry" [class]="'log-entry--' + log.level">
                <span class="log-entry__time">{{ getTime(log.timestamp) }}</span>
                <span class="log-entry__level">{{ log.level }}</span>
                <span class="log-entry__message">{{ log.message }}</span>
              </div>
            } @empty {
              <div class="log-empty">No logs</div>
            }
          </div>
        </section>

        <section class="devtools__section">
          <h4>Actions</h4>
          <div class="devtools__actions-grid">
            <button type="button" class="btn btn--primary" (click)="testConnection()">
              Test Connection
            </button>
            <button type="button" class="btn btn--secondary" (click)="exportLogs()">
              Export Logs
            </button>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .devtools {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #1e293b;
      color: #e2e8f0;
    }

    .devtools__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      border-bottom: 1px solid #334155;
    }

    .devtools__header h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
    }

    .devtools__actions {
      display: flex;
      gap: 0.5rem;
    }

    .btn--icon {
      background: #334155;
      border: none;
      color: #e2e8f0;
      padding: 0.4rem 0.6rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 1rem;
    }

    .btn--icon:hover {
      background: #475569;
    }

    .devtools__content {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
    }

    .devtools__section {
      margin-bottom: 1.5rem;
    }

    .devtools__section h4 {
      margin: 0 0 0.75rem 0;
      font-size: 0.85rem;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
    }

    .devtools__info {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .info-item {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem;
      background: #334155;
      border-radius: 4px;
    }

    .info-label {
      color: #94a3b8;
      font-size: 0.85rem;
    }

    .info-value {
      font-weight: 500;
    }

    .info-value.ok {
      color: #10b981;
    }

    .info-value.error {
      color: #ef4444;
    }

    .devtools__logs {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      max-height: 300px;
      overflow-y: auto;
    }

    .log-entry {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0.6rem;
      background: #334155;
      border-radius: 4px;
      font-size: 0.8rem;
    }

    .log-entry--info {
      border-left: 3px solid #3b82f6;
    }

    .log-entry--warn {
      border-left: 3px solid #f59e0b;
    }

    .log-entry--error {
      border-left: 3px solid #ef4444;
    }

    .log-entry__time {
      color: #64748b;
      font-size: 0.7rem;
    }

    .log-entry__level {
      font-weight: 600;
      text-transform: uppercase;
      font-size: 0.7rem;
    }

    .log-entry__message {
      flex: 1;
      color: #e2e8f0;
    }

    .log-empty {
      text-align: center;
      color: #64748b;
      padding: 1rem;
    }

    .devtools__actions-grid {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .btn {
      padding: 0.5rem 1rem;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }

    .btn--primary {
      background: #3b82f6;
      color: white;
    }

    .btn--primary:hover {
      background: #2563eb;
    }

    .btn--secondary {
      background: #475569;
      color: #e2e8f0;
    }

    .btn--secondary:hover {
      background: #64748b;
    }
  `]
})
export class DevToolsComponent implements OnInit {
  private readonly logger = inject(LoggerService);
  private readonly comm = inject(CommunicationService);

  readonly connected = signal(false);
  readonly stats = signal({ eventsSent: 0, eventsReceived: 0 });
  readonly logs = signal<any[]>([]);

  ngOnInit(): void {
    this.checkConnection();
    this.loadLogs();
  }

  private checkConnection(): void {
    const stats = this.comm.getStats();
    this.connected.set(stats.activeSubscriptions > 0 || stats.totalMessages > 0);
    this.stats.set({
      eventsSent: stats.totalMessages,
      eventsReceived: 0,
    });
  }

  private loadLogs(): void {
    const allLogs = this.logger.allLogs();
    this.logs.set(allLogs.slice(-50));
  }

  refresh(): void {
    this.checkConnection();
    this.loadLogs();
    this.logger.info('DevTools refreshed');
  }

  clearLogs(): void {
    this.logger.clearLogs();
    this.logs.set([]);
  }

  testConnection(): void {
    this.logger.info('Testing connection...');
    this.connected.set(true);
  }

  exportLogs(): void {
    const logs = this.logger.exportLogs();
    const blob = new Blob([logs], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `devtools-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.logger.info('Logs exported');
  }

  getTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString();
  }
}

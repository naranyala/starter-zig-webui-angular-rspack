/**
 * Data Migration Demo Component
 * Demonstrates data migration between SQLite and DuckDB databases
 */

import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { LoggerService } from '../../core/logger.service';

interface User {
  id: number;
  name: string;
  email: string;
  age: number;
  status: string;
  created_at: string;
}

interface MigrationStep {
  step: number;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  message?: string;
  duration?: number;
}

interface MigrationStats {
  totalRecords: number;
  migratedRecords: number;
  failedRecords: number;
  duration: number;
  recordsPerSecond: number;
}

@Component({
  selector: 'app-data-migration-demo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="migration-container">
      <header class="migration-header">
        <h1>🔄 Data Migration Demo</h1>
        <p>Migrate data between SQLite and DuckDB databases</p>
      </header>

      <!-- Database Status Cards -->
      <div class="status-cards">
        <div class="db-status-card sqlite">
          <div class="db-icon">🗄️</div>
          <div class="db-info">
            <h3>SQLite</h3>
            <p class="record-count">{{ sqliteRecordCount() }} records</p>
          </div>
          <button class="btn btn-sm" (click)="loadSqliteData()" [disabled]="loading()">🔄</button>
        </div>

        <div class="migration-arrow">
          <span>⇄</span>
        </div>

        <div class="db-status-card duckdb">
          <div class="db-icon">🦆</div>
          <div class="db-info">
            <h3>DuckDB</h3>
            <p class="record-count">{{ duckdbRecordCount() }} records</p>
          </div>
          <button class="btn btn-sm" (click)="loadDuckdbData()" [disabled]="loading()">🔄</button>
        </div>
      </div>

      <!-- Migration Direction Selector -->
      <div class="direction-selector">
        <button
          class="direction-btn"
          [class.active]="migrationDirection() === 'sqlite-to-duckdb'"
          (click)="setMigrationDirection('sqlite-to-duckdb')">
          🗄️ → 🦆
          <span class="direction-label">SQLite to DuckDB</span>
        </button>
        <button
          class="direction-btn"
          [class.active]="migrationDirection() === 'duckdb-to-sqlite'"
          (click)="setMigrationDirection('duckdb-to-sqlite')">
          🦆 → 🗄️
          <span class="direction-label">DuckDB to SQLite</span>
        </button>
      </div>

      <!-- Migration Controls -->
      <div class="migration-controls">
        <div class="control-group">
          <label>Migration Mode</label>
          <select [(ngModel)]="migrationMode" class="form-select">
            <option value="full">Full Migration (All Records)</option>
            <option value="incremental">Incremental (New/Updated Only)</option>
            <option value="sample">Sample (100 Records)</option>
          </select>
        </div>

        <div class="control-group">
          <label>Batch Size</label>
          <select [(ngModel)]="batchSize" class="form-select">
            <option [ngValue]="10">10 records/batch</option>
            <option [ngValue]="50">50 records/batch</option>
            <option [ngValue]="100">100 records/batch</option>
            <option [ngValue]="500">500 records/batch</option>
          </select>
        </div>

        <button
          class="btn btn-primary btn-lg"
          (click)="startMigration()"
          [disabled]="loading() || migrating()">
          {{ migrating() ? '⏳ Migrating...' : '🚀 Start Migration' }}
        </button>
      </div>

      <!-- Migration Progress -->
      @if (migrating() || migrationComplete()) {
        <div class="migration-progress">
          <div class="progress-header">
            <h3>Migration Progress</h3>
            @if (migrationComplete()) {
              <span class="complete-badge">✅ Complete</span>
            }
          </div>

          <!-- Progress Bar -->
          <div class="progress-bar-container">
            <div class="progress-bar" [style.width.%]="migrationProgress()"></div>
            <span class="progress-text">{{ migrationProgress() }}%</span>
          </div>

          <!-- Migration Steps -->
          <div class="migration-steps">
            @for (step of migrationSteps(); track step.step) {
              <div class="step-item" [class]="'step-' + step.status">
                <div class="step-indicator">
                  @if (step.status === 'pending') {
                    <span>⏳</span>
                  } @else if (step.status === 'running') {
                    <span class="spinner-small"></span>
                  } @else if (step.status === 'completed') {
                    <span>✅</span>
                  } @else if (step.status === 'failed') {
                    <span>❌</span>
                  }
                </div>
                <div class="step-info">
                  <div class="step-description">{{ step.description }}</div>
                  @if (step.message) {
                    <div class="step-message">{{ step.message }}</div>
                  }
                  @if (step.duration) {
                    <div class="step-duration">{{ step.duration }}ms</div>
                  }
                </div>
              </div>
            }
          </div>

          <!-- Migration Stats -->
          @if (migrationComplete()) {
            <div class="migration-stats">
              <div class="stat-item">
                <span class="stat-label">Total Records:</span>
                <span class="stat-value">{{ migrationStats().totalRecords }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Migrated:</span>
                <span class="stat-value success">{{ migrationStats().migratedRecords }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Failed:</span>
                <span class="stat-value error">{{ migrationStats().failedRecords }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Duration:</span>
                <span class="stat-value">{{ migrationStats().duration }}ms</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Speed:</span>
                <span class="stat-value highlight">{{ migrationStats().recordsPerSecond }} rec/s</span>
              </div>
            </div>
          }
        </div>
      }

      <!-- Data Preview -->
      <div class="data-preview">
        <div class="preview-header">
          <h3>📊 Data Preview</h3>
          <div class="preview-toggle">
            <button
              class="toggle-btn"
              [class.active]="previewSource() === 'sqlite'"
              (click)="previewSource.set('sqlite')">
              🗄️ SQLite
            </button>
            <button
              class="toggle-btn"
              [class.active]="previewSource() === 'duckdb'"
              (click)="previewSource.set('duckdb')">
              🦆 DuckDB
            </button>
          </div>
        </div>

        @if (previewSource() === 'sqlite') {
          <div class="preview-table">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Age</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                @for (user of sqliteUsers(); track user.id) {
                  <tr>
                    <td>{{ user.id }}</td>
                    <td>{{ user.name }}</td>
                    <td>{{ user.email }}</td>
                    <td>{{ user.age }}</td>
                    <td><span class="status-badge status-{{ user.status }}">{{ user.status }}</span></td>
                    <td>{{ user.created_at | date:'short' }}</td>
                  </tr>
                }
                @empty {
                  <tr>
                    <td colspan="6" class="empty-state">No data in SQLite</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div class="preview-table">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Age</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                @for (user of duckdbUsers(); track user.id) {
                  <tr>
                    <td>{{ user.id }}</td>
                    <td>{{ user.name }}</td>
                    <td>{{ user.email }}</td>
                    <td>{{ user.age }}</td>
                    <td><span class="status-badge status-{{ user.status }}">{{ user.status }}</span></td>
                    <td>{{ user.created_at | date:'short' }}</td>
                  </tr>
                }
                @empty {
                  <tr>
                    <td colspan="6" class="empty-state">No data in DuckDB</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

      <!-- Migration History -->
      <div class="migration-history">
        <h3>📜 Migration History</h3>
        @if (migrationHistory().length > 0) {
          <div class="history-list">
            @for (record of migrationHistory(); track record.timestamp) {
              <div class="history-item">
                <div class="history-icon">{{ record.direction === 'sqlite-to-duckdb' ? '🗄️→🦆' : '🦆→🗄️' }}</div>
                <div class="history-info">
                  <div class="history-mode">{{ record.mode }}</div>
                  <div class="history-details">{{ record.records }} records in {{ record.duration }}ms</div>
                </div>
                <div class="history-status" [class.success]="record.success">
                  {{ record.success ? '✅' : '❌' }}
                </div>
                <div class="history-time">{{ record.timestamp | date:'medium' }}</div>
              </div>
            }
          </div>
        } @else {
          <p class="history-empty">No migration history yet</p>
        }
      </div>
    </div>
  `,
  styles: [`
    .migration-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
      color: #e2e8f0;
    }

    .migration-header {
      margin-bottom: 24px;
    }

    .migration-header h1 {
      font-size: 28px;
      font-weight: 700;
      color: #fff;
      margin: 0 0 8px;
    }

    .migration-header p {
      font-size: 14px;
      color: #94a3b8;
      margin: 0;
    }

    .status-cards {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }

    .db-status-card {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: rgba(30, 41, 59, 0.5);
      border-radius: 12px;
      border: 2px solid transparent;
      transition: all 0.3s;
    }

    .db-status-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
    }

    .db-status-card.sqlite {
      border-color: rgba(16, 185, 129, 0.3);
    }

    .db-status-card.duckdb {
      border-color: rgba(59, 130, 246, 0.3);
    }

    .db-icon {
      font-size: 40px;
    }

    .db-info h3 {
      font-size: 18px;
      font-weight: 600;
      color: #fff;
      margin: 0 0 4px;
    }

    .record-count {
      font-size: 14px;
      color: #94a3b8;
      margin: 0;
    }

    .migration-arrow {
      font-size: 32px;
      color: #64748b;
      padding: 12px;
    }

    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-sm {
      padding: 8px 12px;
      font-size: 13px;
    }

    .btn-lg {
      padding: 14px 28px;
      font-size: 16px;
    }

    .btn-primary { background: #3b82f6; color: #fff; }
    .btn:hover:not(:disabled) { transform: translateY(-2px); opacity: 0.9; }

    .direction-selector {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
    }

    .direction-btn {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 20px;
      background: rgba(30, 41, 59, 0.5);
      border: 2px solid rgba(148, 163, 184, 0.2);
      border-radius: 12px;
      color: #94a3b8;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 24px;
    }

    .direction-btn:hover {
      background: rgba(59, 130, 246, 0.1);
      border-color: rgba(59, 130, 246, 0.3);
      color: #fff;
    }

    .direction-btn.active {
      background: rgba(139, 92, 246, 0.1);
      border-color: #8b5cf6;
      color: #fff;
    }

    .direction-label {
      font-size: 14px;
      font-weight: 600;
    }

    .migration-controls {
      display: flex;
      gap: 16px;
      align-items: flex-end;
      margin-bottom: 24px;
      padding: 20px;
      background: rgba(30, 41, 59, 0.5);
      border-radius: 12px;
    }

    .control-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .control-group label {
      font-size: 13px;
      font-weight: 600;
      color: #94a3b8;
    }

    .form-select {
      padding: 10px 14px;
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 6px;
      background: rgba(15, 23, 42, 0.8);
      color: #fff;
      font-size: 14px;
      min-width: 200px;
    }

    .migration-progress {
      background: rgba(30, 41, 59, 0.5);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
    }

    .progress-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .progress-header h3 {
      font-size: 18px;
      font-weight: 600;
      color: #fff;
      margin: 0;
    }

    .complete-badge {
      padding: 6px 16px;
      background: rgba(16, 185, 129, 0.2);
      border-radius: 20px;
      color: #10b981;
      font-size: 14px;
      font-weight: 600;
    }

    .progress-bar-container {
      position: relative;
      height: 32px;
      background: rgba(148, 163, 184, 0.1);
      border-radius: 16px;
      overflow: hidden;
      margin-bottom: 24px;
    }

    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #8b5cf6, #6366f1);
      transition: width 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .progress-text {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 14px;
      font-weight: 600;
      color: #fff;
    }

    .migration-steps {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 24px;
    }

    .step-item {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding: 16px;
      background: rgba(15, 23, 42, 0.6);
      border-radius: 8px;
      border-left: 4px solid transparent;
    }

    .step-item.step-pending {
      border-left-color: #64748b;
      opacity: 0.6;
    }

    .step-item.step-running {
      border-left-color: #3b82f6;
    }

    .step-item.step-completed {
      border-left-color: #10b981;
    }

    .step-item.step-failed {
      border-left-color: #ef4444;
    }

    .step-indicator {
      font-size: 20px;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .spinner-small {
      width: 20px;
      height: 20px;
      border: 3px solid rgba(59, 130, 246, 0.2);
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .step-info {
      flex: 1;
    }

    .step-description {
      font-size: 14px;
      font-weight: 600;
      color: #fff;
      margin-bottom: 4px;
    }

    .step-message {
      font-size: 13px;
      color: #94a3b8;
      margin-bottom: 4px;
    }

    .step-duration {
      font-size: 12px;
      color: #64748b;
      font-family: monospace;
    }

    .migration-stats {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 16px;
      padding-top: 20px;
      border-top: 1px solid rgba(148, 163, 184, 0.2);
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 16px;
      background: rgba(15, 23, 42, 0.6);
      border-radius: 8px;
    }

    .stat-label {
      font-size: 12px;
      color: #94a3b8;
    }

    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: #fff;
    }

    .stat-value.success { color: #10b981; }
    .stat-value.error { color: #ef4444; }
    .stat-value.highlight { color: #f59e0b; }

    .data-preview {
      background: rgba(30, 41, 59, 0.5);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
    }

    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .preview-header h3 {
      font-size: 18px;
      font-weight: 600;
      color: #fff;
      margin: 0;
    }

    .preview-toggle {
      display: flex;
      gap: 8px;
    }

    .toggle-btn {
      padding: 8px 16px;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 6px;
      color: #94a3b8;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }

    .toggle-btn:hover {
      background: rgba(59, 130, 246, 0.1);
      border-color: rgba(59, 130, 246, 0.3);
      color: #fff;
    }

    .toggle-btn.active {
      background: rgba(139, 92, 246, 0.2);
      border-color: #8b5cf6;
      color: #fff;
    }

    .preview-table {
      overflow-x: auto;
    }

    .preview-table table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .preview-table th, .preview-table td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid rgba(148, 163, 184, 0.1);
    }

    .preview-table th {
      background: rgba(59, 130, 246, 0.1);
      font-weight: 600;
      color: #94a3b8;
    }

    .preview-table tr:hover {
      background: rgba(59, 130, 246, 0.05);
    }

    .status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-active { background: rgba(16, 185, 129, 0.2); color: #10b981; }
    .status-inactive { background: rgba(148, 163, 184, 0.2); color: #94a3b8; }
    .status-pending { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }

    .empty-state {
      text-align: center;
      color: #64748b;
      padding: 32px;
    }

    .migration-history {
      background: rgba(30, 41, 59, 0.5);
      border-radius: 12px;
      padding: 24px;
    }

    .migration-history h3 {
      font-size: 18px;
      font-weight: 600;
      color: #fff;
      margin: 0 0 20px;
    }

    .history-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .history-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: rgba(15, 23, 42, 0.6);
      border-radius: 8px;
      transition: all 0.2s;
    }

    .history-item:hover {
      background: rgba(15, 23, 42, 0.8);
    }

    .history-icon {
      font-size: 24px;
    }

    .history-info {
      flex: 1;
    }

    .history-mode {
      font-size: 14px;
      font-weight: 600;
      color: #fff;
    }

    .history-details {
      font-size: 13px;
      color: #94a3b8;
    }

    .history-status {
      font-size: 20px;
      opacity: 0.5;
    }

    .history-status.success {
      opacity: 1;
    }

    .history-time {
      font-size: 12px;
      color: #64748b;
      font-family: monospace;
    }

    .history-empty {
      color: #64748b;
      text-align: center;
      padding: 32px;
    }

    @media (max-width: 1024px) {
      .status-cards,
      .migration-controls {
        flex-direction: column;
      }

      .migration-stats {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `]
})
export class DataMigrationDemoComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly logger = inject(LoggerService);

  readonly loading = signal(false);
  readonly migrating = signal(false);
  readonly migrationComplete = signal(false);
  readonly migrationProgress = signal(0);

  readonly sqliteRecordCount = signal(0);
  readonly duckdbRecordCount = signal(0);

  readonly sqliteUsers = signal<User[]>([]);
  readonly duckdbUsers = signal<User[]>([]);

  readonly migrationDirection = signal<'sqlite-to-duckdb' | 'duckdb-to-sqlite'>('sqlite-to-duckdb');
  readonly migrationSteps = signal<MigrationStep[]>([]);
  readonly migrationStats = signal<MigrationStats>({
    totalRecords: 0,
    migratedRecords: 0,
    failedRecords: 0,
    duration: 0,
    recordsPerSecond: 0,
  });

  readonly migrationHistory = signal<{
    direction: string;
    mode: string;
    records: number;
    duration: number;
    success: boolean;
    timestamp: Date;
  }[]>([]);

  migrationMode = 'full';
  batchSize = 50;
  previewSource = signal<'sqlite' | 'duckdb'>('sqlite');

  ngOnInit(): void {
    this.loadSqliteData();
    this.loadDuckdbData();
  }

  async loadSqliteData(): Promise<void> {
    this.loading.set(true);
    try {
      const users = await this.api.callOrThrow<User[]>('getUsers', []);
      this.sqliteUsers.set(users);
      this.sqliteRecordCount.set(users.length);
    } catch (error) {
      this.logger.error('Failed to load SQLite data', error);
    } finally {
      this.loading.set(false);
    }
  }

  async loadDuckdbData(): Promise<void> {
    this.loading.set(true);
    try {
      const users = await this.api.callOrThrow<User[]>('duckdbGetUsers', []);
      this.duckdbUsers.set(users);
      this.duckdbRecordCount.set(users.length);
    } catch (error) {
      this.logger.error('Failed to load DuckDB data', error);
    } finally {
      this.loading.set(false);
    }
  }

  setMigrationDirection(direction: 'sqlite-to-duckdb' | 'duckdb-to-sqlite'): void {
    this.migrationDirection.set(direction);
  }

  async startMigration(): Promise<void> {
    this.migrating.set(true);
    this.migrationComplete.set(false);
    this.migrationProgress.set(0);
    this.migrationSteps.set([
      { step: 1, description: 'Preparing migration...', status: 'pending' },
      { step: 2, description: 'Reading source data...', status: 'pending' },
      { step: 3, description: 'Transforming data...', status: 'pending' },
      { step: 4, description: 'Writing to target...', status: 'pending' },
      { step: 5, description: 'Verifying migration...', status: 'pending' },
    ]);

    const startTime = Date.now();

    try {
      // Step 1: Prepare
      this.updateStepStatus(1, 'running');
      await this.sleep(500);
      this.updateStepStatus(1, 'completed', 'Migration initialized', Date.now() - startTime);

      // Step 2: Read source data
      this.updateStepStatus(2, 'running');
      const sourceData = await this.readSourceData();
      const totalRecords = this.migrationMode === 'sample' 
        ? Math.min(100, sourceData.length) 
        : sourceData.length;
      this.updateStepStatus(2, 'completed', `Read ${sourceData.length} records`, Date.now() - startTime);
      this.migrationProgress.set(20);

      // Step 3: Transform data
      this.updateStepStatus(3, 'running');
      const transformedData = this.transformData(sourceData.slice(0, totalRecords));
      await this.sleep(300);
      this.updateStepStatus(3, 'completed', `Transformed ${transformedData.length} records`, Date.now() - startTime);
      this.migrationProgress.set(50);

      // Step 4: Write to target (batch processing)
      this.updateStepStatus(4, 'running');
      let migratedCount = 0;
      let failedCount = 0;

      const batches = Math.ceil(transformedData.length / this.batchSize);
      for (let i = 0; i < batches; i++) {
        const batch = transformedData.slice(i * this.batchSize, (i + 1) * this.batchSize);
        const result = await this.writeToTarget(batch);
        migratedCount += result.success;
        failedCount += result.failed;
        this.migrationProgress.set(50 + ((i + 1) / batches) * 30);
      }

      this.updateStepStatus(4, 'completed', `Migrated ${migratedCount} records`, Date.now() - startTime);
      this.migrationProgress.set(90);

      // Step 5: Verify
      this.updateStepStatus(5, 'running');
      await this.verifyMigration(migratedCount);
      this.updateStepStatus(5, 'completed', 'Verification complete', Date.now() - startTime);
      this.migrationProgress.set(100);

      // Update stats
      const duration = Date.now() - startTime;
      this.migrationStats.set({
        totalRecords: totalRecords,
        migratedRecords: migratedCount,
        failedRecords: failedCount,
        duration: duration,
        recordsPerSecond: Math.round((migratedCount / duration) * 1000),
      });

      // Add to history
      this.migrationHistory.update(history => [{
        direction: this.migrationDirection(),
        mode: this.migrationMode,
        records: migratedCount,
        duration: duration,
        success: failedCount === 0,
        timestamp: new Date(),
      }, ...history].slice(0, 10));

      // Reload data
      await this.loadSqliteData();
      await this.loadDuckdbData();

    } catch (error) {
      this.logger.error('Migration failed', error);
      this.updateStepStatus(4, 'failed', (error as Error).message);
    } finally {
      this.migrating.set(false);
      this.migrationComplete.set(true);
    }
  }

  async readSourceData(): Promise<User[]> {
    if (this.migrationDirection() === 'sqlite-to-duckdb') {
      return await this.api.callOrThrow<User[]>('getUsers', []);
    } else {
      return await this.api.callOrThrow<User[]>('duckdbGetUsers', []);
    }
  }

  transformData(data: User[]): User[] {
    // In a real scenario, you might need to transform data between different schemas
    return data.map(user => ({
      ...user,
      created_at: user.created_at || new Date().toISOString(),
    }));
  }

  async writeToTarget(batch: User[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    if (this.migrationDirection() === 'sqlite-to-duckdb') {
      for (const user of batch) {
        try {
          await this.api.callOrThrow('duckdbCreateUser', [{
            name: user.name,
            email: user.email,
            age: user.age,
            status: user.status,
          }]);
          success++;
        } catch {
          failed++;
        }
      }
    } else {
      for (const user of batch) {
        try {
          await this.api.callOrThrow('createUser', [{
            name: user.name,
            email: user.email,
            age: user.age,
            status: user.status,
          }]);
          success++;
        } catch {
          failed++;
        }
      }
    }

    return { success, failed };
  }

  async verifyMigration(expectedCount: number): Promise<void> {
    await this.sleep(300);
    // Verification logic would go here
  }

  updateStepStatus(step: number, status: MigrationStep['status'], message?: string, duration?: number): void {
    this.migrationSteps.update(steps => 
      steps.map(s => s.step === step ? { ...s, status, message, duration: duration ?? s.duration } : s)
    );
  }

  sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

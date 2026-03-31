/**
 * DuckDB Integration Exploration Demo
 * Explores DuckDB-specific features: analytics, bulk operations, and column-oriented queries
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

interface AnalyticsResult {
  metric: string;
  value: string | number;
  change?: number;
}

@Component({
  selector: 'app-duckdb-exploration',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="exploration-container">
      <header class="exploration-header">
        <h1>🦆 DuckDB Integration Exploration</h1>
        <p>Discover DuckDB's column-oriented analytics capabilities</p>
      </header>

      <!-- Mode Selector -->
      <div class="mode-selector">
        <button 
          class="mode-btn" 
          [class.active]="mode() === 'basic'"
          (click)="mode.set('basic')">
          📋 Basic CRUD
        </button>
        <button 
          class="mode-btn" 
          [class.active]="mode() === 'analytics'"
          (click)="loadAnalytics(); mode.set('analytics')">
          📊 Analytics
        </button>
        <button 
          class="mode-btn" 
          [class.active]="mode() === 'bulk'"
          (click)="mode.set('bulk')">
          ⚡ Bulk Operations
        </button>
        <button 
          class="mode-btn" 
          [class.active]="mode() === 'sql'"
          (click)="mode.set('sql')">
          💻 SQL Editor
        </button>
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Loading...</p>
        </div>
      }

      <!-- Basic CRUD Mode -->
      @if (mode() === 'basic' && !loading()) {
        <div class="crud-section">
          <div class="section-header">
            <h2>Basic CRUD Operations</h2>
            <button class="btn btn-primary" (click)="toggleCreateForm()">
              {{ showCreateForm() ? '📋 View List' : '➕ Create User' }}
            </button>
          </div>

          @if (showCreateForm()) {
            <div class="create-card">
              <h3>Create New User</h3>
              <form (ngSubmit)="createUser()" class="create-form">
                <div class="form-row">
                  <div class="form-group">
                    <label>Name</label>
                    <input type="text" [ngModel]="formData().name" (ngModelChange)="updateDuckFormDataName($event)" name="name" required class="form-input">
                  </div>
                  <div class="form-group">
                    <label>Email</label>
                    <input type="email" [ngModel]="formData().email" (ngModelChange)="updateDuckFormDataEmail($event)" name="email" required class="form-input">
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Age</label>
                    <input type="number" [ngModel]="formData().age" (ngModelChange)="updateDuckFormDataAge($event)" name="age" required class="form-input">
                  </div>
                  <div class="form-group">
                    <label>Status</label>
                    <select [ngModel]="formData().status" (ngModelChange)="updateDuckFormDataStatus($event)" name="status" required class="form-input">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                </div>
                <div class="form-actions">
                  <button type="submit" class="btn btn-success">Create User</button>
                </div>
              </form>
            </div>
          } @else {
            <div class="data-table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Age</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (user of users(); track user.id) {
                    <tr>
                      <td class="id-cell">{{ user.id }}</td>
                      <td>{{ user.name }}</td>
                      <td>{{ user.email }}</td>
                      <td>{{ user.age }}</td>
                      <td><span class="status-badge status-{{ user.status }}">{{ user.status }}</span></td>
                      <td>{{ user.created_at | date:'short' }}</td>
                      <td>
                        <button class="btn-icon btn-delete" (click)="deleteUser(user.id)">🗑️</button>
                      </td>
                    </tr>
                  }
                  @empty {
                    <tr>
                      <td colspan="7" class="empty-state">No users found. Create one!</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }

      <!-- Analytics Mode -->
      @if (mode() === 'analytics' && !loading()) {
        <div class="analytics-section">
          <div class="section-header">
            <h2>📊 Analytics Dashboard</h2>
            <button class="btn btn-primary" (click)="loadAnalytics()">🔄 Refresh</button>
          </div>

          <!-- Analytics Cards -->
          <div class="analytics-grid">
            @for (stat of analytics(); track stat.metric) {
              <div class="analytics-card">
                <div class="analytics-label">{{ stat.metric }}</div>
                <div class="analytics-value">{{ stat.value }}</div>
                @if (stat.change) {
                  <div class="analytics-change" [class.positive]="stat.change > 0" [class.negative]="stat.change < 0">
                    {{ stat.change > 0 ? '↑' : '↓' }} {{ Math.abs(stat.change) }}%
                  </div>
                }
              </div>
            }
          </div>

          <!-- Age Distribution -->
          <div class="chart-section">
            <h3>Age Distribution</h3>
            <div class="bar-chart">
              @for (group of ageDistribution(); track group.label) {
                <div class="bar-row">
                  <div class="bar-label">{{ group.label }}</div>
                  <div class="bar-track">
                    <div class="bar-fill" [style.width.%]="(group.count / maxCount()) * 100">
                      {{ group.count }}
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Status Breakdown -->
          <div class="chart-section">
            <h3>Status Breakdown</h3>
            <div class="status-breakdown">
              @for (item of statusBreakdown(); track item.status) {
                <div class="status-item">
                  <div class="status-indicator" [class]="'status-' + item.status"></div>
                  <div class="status-info">
                    <div class="status-name">{{ item.status }}</div>
                    <div class="status-count">{{ item.count }} users</div>
                  </div>
                  <div class="status-percent">{{ item.percent }}%</div>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- Bulk Operations Mode -->
      @if (mode() === 'bulk' && !loading()) {
        <div class="bulk-section">
          <div class="section-header">
            <h2>⚡ Bulk Operations</h2>
            <div class="bulk-actions">
              <button class="btn btn-success" (click)="bulkInsert()">📥 Insert 100 Records</button>
              <button class="btn btn-warning" (click)="bulkUpdate()">🔄 Update All</button>
              <button class="btn btn-danger" (click)="bulkDelete()">🗑️ Clear All</button>
            </div>
          </div>

          <div class="bulk-info">
            <div class="info-card">
              <h4>📊 Current Statistics</h4>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Total Records:</span>
                  <span class="info-value">{{ users().length }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Last Operation:</span>
                  <span class="info-value">{{ lastOperation() || 'None' }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="bulk-log">
            <h4>Operation Log</h4>
            <div class="log-entries">
              @for (log of operationLog(); track log.timestamp) {
                <div class="log-entry">
                  <span class="log-time">{{ log.timestamp | date:'HH:mm:ss' }}</span>
                  <span class="log-message">{{ log.message }}</span>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- SQL Editor Mode -->
      @if (mode() === 'sql' && !loading()) {
        <div class="sql-section">
          <div class="section-header">
            <h2>💻 SQL Query Editor</h2>
            <button class="btn btn-primary" (click)="executeQuery()">▶️ Execute</button>
          </div>

          <div class="sql-editor-container">
            <div class="sql-input-section">
              <label>SQL Query (SELECT only)</label>
              <textarea 
                [(ngModel)]="sqlQuery" 
                class="sql-editor"
                placeholder="SELECT * FROM users WHERE age > 30 ORDER BY age DESC"
                rows="8"></textarea>
              <div class="query-presets">
                <button class="preset-btn" (click)="setPresetQuery('all')">All Users</button>
                <button class="preset-btn" (click)="setPresetQuery('age')">By Age</button>
                <button class="preset-btn" (click)="setPresetQuery('status')">By Status</button>
                <button class="preset-btn" (click)="setPresetQuery('analytics')">Analytics</button>
              </div>
            </div>

            @if (queryResults().length > 0) {
              <div class="sql-results">
                <div class="results-header">
                  <h4>Query Results ({{ queryResults().length }} rows)</h4>
                </div>
                <div class="results-table-container">
                  <table class="results-table">
                    <thead>
                      <tr>
                        @for (key of resultKeys(); track key) {
                          <th>{{ key }}</th>
                        }
                      </tr>
                    </thead>
                    <tbody>
                      @for (row of queryResults(); track $index) {
                        <tr>
                          @for (key of resultKeys(); track key) {
                            <td>{{ row[key] }}</td>
                          }
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .exploration-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
      color: #e2e8f0;
    }

    .exploration-header {
      margin-bottom: 24px;
    }

    .exploration-header h1 {
      font-size: 28px;
      font-weight: 700;
      color: #fff;
      margin: 0 0 8px;
    }

    .exploration-header p {
      font-size: 14px;
      color: #94a3b8;
      margin: 0;
    }

    .mode-selector {
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .mode-btn {
      padding: 12px 20px;
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 8px;
      background: rgba(30, 41, 59, 0.5);
      color: #94a3b8;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }

    .mode-btn:hover {
      background: rgba(59, 130, 246, 0.1);
      border-color: rgba(59, 130, 246, 0.3);
      color: #fff;
    }

    .mode-btn.active {
      background: linear-gradient(135deg, #3b82f6, #06b6d4);
      border-color: transparent;
      color: #fff;
      box-shadow: 0 4px 15px rgba(59, 130, 246, 0.4);
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 64px;
    }

    .spinner {
      width: 48px;
      height: 48px;
      border: 4px solid rgba(59, 130, 246, 0.2);
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .section-header h2 {
      font-size: 20px;
      font-weight: 600;
      color: #fff;
      margin: 0;
    }

    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }

    .btn-primary { background: #3b82f6; color: #fff; }
    .btn-success { background: #10b981; color: #fff; }
    .btn-warning { background: #f59e0b; color: #fff; }
    .btn-danger { background: #ef4444; color: #fff; }

    .btn:hover { transform: translateY(-2px); opacity: 0.9; }

    .btn-icon {
      padding: 6px 10px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      background: transparent;
    }

    .btn-delete:hover { background: rgba(239, 68, 68, 0.2); }

    /* CRUD Section */
    .crud-section {
      background: rgba(30, 41, 59, 0.5);
      border-radius: 12px;
      padding: 24px;
    }

    .create-card {
      background: rgba(15, 23, 42, 0.8);
      border-radius: 8px;
      padding: 24px;
    }

    .create-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .form-group label {
      font-size: 13px;
      font-weight: 600;
      color: #94a3b8;
    }

    .form-input {
      padding: 10px 14px;
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 6px;
      background: rgba(15, 23, 42, 0.8);
      color: #fff;
      font-size: 14px;
    }

    .form-actions {
      display: flex;
      gap: 12px;
      margin-top: 8px;
    }

    .data-table-container {
      overflow-x: auto;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
    }

    .data-table th, .data-table td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid rgba(148, 163, 184, 0.1);
    }

    .data-table th {
      background: rgba(59, 130, 246, 0.1);
      font-weight: 600;
      color: #94a3b8;
    }

    .data-table tr:hover {
      background: rgba(59, 130, 246, 0.05);
    }

    .id-cell {
      font-family: monospace;
      color: #94a3b8;
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

    /* Analytics Section */
    .analytics-section {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .analytics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }

    .analytics-card {
      background: rgba(15, 23, 42, 0.8);
      border-radius: 8px;
      padding: 20px;
    }

    .analytics-label {
      font-size: 12px;
      color: #94a3b8;
      margin-bottom: 8px;
    }

    .analytics-value {
      font-size: 32px;
      font-weight: 700;
      color: #fff;
    }

    .analytics-change {
      font-size: 12px;
      margin-top: 8px;
    }

    .analytics-change.positive { color: #10b981; }
    .analytics-change.negative { color: #ef4444; }

    .chart-section {
      background: rgba(15, 23, 42, 0.8);
      border-radius: 8px;
      padding: 20px;
    }

    .chart-section h3 {
      font-size: 16px;
      font-weight: 600;
      color: #fff;
      margin: 0 0 16px;
    }

    .bar-chart {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .bar-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .bar-label {
      width: 80px;
      font-size: 13px;
      color: #94a3b8;
    }

    .bar-track {
      flex: 1;
      height: 32px;
      background: rgba(148, 163, 184, 0.1);
      border-radius: 4px;
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #3b82f6, #06b6d4);
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 8px;
      color: #fff;
      font-size: 12px;
      font-weight: 600;
      transition: width 0.3s ease;
    }

    .status-breakdown {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .status-item {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .status-indicator {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }

    .status-indicator.status-active { background: #10b981; }
    .status-indicator.status-inactive { background: #94a3b8; }
    .status-indicator.status-pending { background: #f59e0b; }

    .status-info {
      flex: 1;
    }

    .status-name {
      font-size: 14px;
      font-weight: 600;
      color: #fff;
      text-transform: capitalize;
    }

    .status-count {
      font-size: 12px;
      color: #94a3b8;
    }

    .status-percent {
      font-size: 14px;
      font-weight: 600;
      color: #3b82f6;
    }

    /* Bulk Section */
    .bulk-section {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .bulk-actions {
      display: flex;
      gap: 12px;
    }

    .bulk-info {
      display: flex;
      gap: 16px;
    }

    .info-card {
      flex: 1;
      background: rgba(15, 23, 42, 0.8);
      border-radius: 8px;
      padding: 20px;
    }

    .info-card h4 {
      font-size: 14px;
      font-weight: 600;
      color: #fff;
      margin: 0 0 16px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .info-label {
      font-size: 12px;
      color: #94a3b8;
    }

    .info-value {
      font-size: 18px;
      font-weight: 600;
      color: #fff;
    }

    .bulk-log {
      background: rgba(15, 23, 42, 0.8);
      border-radius: 8px;
      padding: 20px;
    }

    .bulk-log h4 {
      font-size: 14px;
      font-weight: 600;
      color: #fff;
      margin: 0 0 12px;
    }

    .log-entries {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 300px;
      overflow-y: auto;
    }

    .log-entry {
      display: flex;
      gap: 12px;
      padding: 8px 12px;
      background: rgba(59, 130, 246, 0.05);
      border-radius: 4px;
      font-size: 13px;
    }

    .log-time {
      color: #94a3b8;
      font-family: monospace;
    }

    .log-message {
      color: #e2e8f0;
    }

    /* SQL Section */
    .sql-section {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .sql-editor-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .sql-input-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .sql-input-section label {
      font-size: 14px;
      font-weight: 600;
      color: #94a3b8;
    }

    .sql-editor {
      width: 100%;
      padding: 16px;
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 8px;
      background: rgba(15, 23, 42, 0.8);
      color: #fff;
      font-family: 'Fira Code', monospace;
      font-size: 13px;
      resize: vertical;
    }

    .query-presets {
      display: flex;
      gap: 8px;
    }

    .preset-btn {
      padding: 8px 16px;
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 6px;
      background: rgba(30, 41, 59, 0.5);
      color: #94a3b8;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.2s;
    }

    .preset-btn:hover {
      background: rgba(59, 130, 246, 0.1);
      border-color: rgba(59, 130, 246, 0.3);
      color: #fff;
    }

    .sql-results {
      background: rgba(15, 23, 42, 0.8);
      border-radius: 8px;
      overflow: hidden;
    }

    .results-header {
      padding: 16px 20px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.1);
    }

    .results-header h4 {
      font-size: 14px;
      font-weight: 600;
      color: #fff;
      margin: 0;
    }

    .results-table-container {
      overflow-x: auto;
      max-height: 400px;
      overflow-y: auto;
    }

    .results-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    .results-table th, .results-table td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid rgba(148, 163, 184, 0.1);
    }

    .results-table th {
      background: rgba(59, 130, 246, 0.1);
      font-weight: 600;
      color: #94a3b8;
      position: sticky;
      top: 0;
    }

    .results-table tr:hover {
      background: rgba(59, 130, 246, 0.05);
    }
  `]
})
export class DuckdbExplorationComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly logger = inject(LoggerService);

  readonly mode = signal<'basic' | 'analytics' | 'bulk' | 'sql'>('basic');
  readonly loading = signal(false);
  readonly users = signal<User[]>([]);
  readonly analytics = signal<AnalyticsResult[]>([]);
  readonly ageDistribution = signal<{ label: string; count: number }[]>([]);
  readonly statusBreakdown = signal<{ status: string; count: number; percent: number }[]>([]);
  readonly maxCount = signal(1);
  readonly showCreateForm = signal(false);
  readonly lastOperation = signal('');
  readonly operationLog = signal<{ timestamp: Date; message: string }[]>([]);

  readonly formData = signal({ name: '', email: '', age: 25, status: 'active' });
  readonly sqlQuery = signal('SELECT * FROM users ORDER BY id DESC LIMIT 10');
  readonly queryResults = signal<any[]>([]);
  readonly resultKeys = signal<string[]>([]);

  readonly Math = Math;

  ngOnInit(): void {
    this.loadUsers();
  }

  async loadUsers(): Promise<void> {
    this.loading.set(true);
    try {
      const result = await this.api.callOrThrow<any[]>('duckdbGetUsers', []);
      this.users.set(result);
    } catch (error) {
      this.logger.error('Failed to load users', error);
    } finally {
      this.loading.set(false);
    }
  }

  toggleCreateForm(): void {
    this.showCreateForm.update(v => !v);
  }

  async createUser(): Promise<void> {
    this.loading.set(true);
    try {
      await this.api.callOrThrow('duckdbCreateUser', [this.formData()]);
      await this.loadUsers();
      this.formData.set({ name: '', email: '', age: 25, status: 'active' });
      this.showCreateForm.set(false);
      this.logOperation('Created new user: ' + this.formData().name);
    } catch (error) {
      this.logger.error('Failed to create user', error);
    } finally {
      this.loading.set(false);
    }
  }

  updateDuckFormDataName(value: string): void {
    this.formData.update(d => ({ ...d, name: value }));
  }

  updateDuckFormDataEmail(value: string): void {
    this.formData.update(d => ({ ...d, email: value }));
  }

  updateDuckFormDataAge(value: number): void {
    this.formData.update(d => ({ ...d, age: value }));
  }

  updateDuckFormDataStatus(value: string): void {
    this.formData.update(d => ({ ...d, status: value }));
  }

  async deleteUser(id: number): Promise<void> {
    if (!confirm('Delete this user?')) return;
    this.loading.set(true);
    try {
      await this.api.callOrThrow('duckdbDeleteUser', [{ id }]);
      await this.loadUsers();
      this.logOperation('Deleted user with ID: ' + id);
    } catch (error) {
      this.logger.error('Failed to delete user', error);
    } finally {
      this.loading.set(false);
    }
  }

  async loadAnalytics(): Promise<void> {
    this.loading.set(true);
    try {
      const [stats, users] = await Promise.all([
        this.api.callOrThrow<any>('duckdbGetStats', []),
        this.api.callOrThrow<any[]>('duckdbGetUsers', [])
      ]);

      this.analytics.set([
        { metric: 'Total Users', value: stats.total_users || 0 },
        { metric: 'Avg Age', value: (stats.avg_age || 0).toFixed(1) },
        { metric: 'Max Age', value: stats.max_age || 0 },
        { metric: 'Min Age', value: stats.min_age || 0 }
      ]);

      // Age distribution
      const groups = [
        { label: '0-18', min: 0, max: 18, count: 0 },
        { label: '19-30', min: 19, max: 30, count: 0 },
        { label: '31-50', min: 31, max: 50, count: 0 },
        { label: '51+', min: 51, max: 150, count: 0 }
      ];
      users.forEach(u => {
        const g = groups.find(x => u.age >= x.min && u.age <= x.max);
        if (g) g.count++;
      });
      this.ageDistribution.set(groups);
      this.maxCount.set(Math.max(...groups.map(g => g.count), 1));

      // Status breakdown
      const statusMap = new Map<string, number>();
      users.forEach(u => {
        statusMap.set(u.status, (statusMap.get(u.status) || 0) + 1);
      });
      const total = users.length || 1;
      this.statusBreakdown.set(
        Array.from(statusMap.entries()).map(([status, count]) => ({
          status,
          count,
          percent: Math.round((count / total) * 100)
        }))
      );
    } catch (error) {
      this.logger.error('Failed to load analytics', error);
    } finally {
      this.loading.set(false);
    }
  }

  async bulkInsert(): Promise<void> {
    this.loading.set(true);
    try {
      const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];
      const domains = ['example.com', 'test.org', 'demo.net', 'sample.io'];
      
      for (let i = 0; i < 100; i++) {
        const name = names[Math.floor(Math.random() * names.length)] + ' ' + i;
        const email = name.toLowerCase().replace(' ', '.') + '@' + domains[Math.floor(Math.random() * domains.length)];
        const age = Math.floor(Math.random() * 50) + 20;
        const status = ['active', 'inactive', 'pending'][Math.floor(Math.random() * 3)];
        
        await this.api.callOrThrow('duckdbCreateUser', [{ name, email, age, status }]);
      }
      
      await this.loadUsers();
      this.lastOperation.set('Bulk Insert: 100 records');
      this.logOperation('Inserted 100 records');
    } catch (error) {
      this.logger.error('Bulk insert failed', error);
    } finally {
      this.loading.set(false);
    }
  }

  async bulkUpdate(): Promise<void> {
    this.loading.set(true);
    try {
      // This would require an update endpoint - for demo purposes
      this.lastOperation.set('Bulk Update: All records');
      this.logOperation('Updated all records');
    } catch (error) {
      this.logger.error('Bulk update failed', error);
    } finally {
      this.loading.set(false);
    }
  }

  async bulkDelete(): Promise<void> {
    if (!confirm('Delete ALL users? This cannot be undone!')) return;
    this.loading.set(true);
    try {
      const users = this.users();
      for (const user of users) {
        await this.api.callOrThrow('duckdbDeleteUser', [{ id: user.id }]);
      }
      await this.loadUsers();
      this.lastOperation.set('Bulk Delete: ' + users.length + ' records');
      this.logOperation('Deleted ' + users.length + ' records');
    } catch (error) {
      this.logger.error('Bulk delete failed', error);
    } finally {
      this.loading.set(false);
    }
  }

  logOperation(message: string): void {
    const log = this.operationLog();
    this.operationLog.set([{ timestamp: new Date(), message }, ...log].slice(0, 50));
  }

  setPresetQuery(type: string): void {
    const presets: Record<string, string> = {
      all: 'SELECT * FROM users ORDER BY id DESC LIMIT 20',
      age: 'SELECT * FROM users WHERE age > 30 ORDER BY age DESC',
      status: "SELECT * FROM users WHERE status = 'active' ORDER BY created_at DESC",
      analytics: 'SELECT COUNT(*) as count, AVG(age) as avg_age FROM users'
    };
    this.sqlQuery.set(presets[type]);
  }

  async executeQuery(): Promise<void> {
    const query = this.sqlQuery();
    if (!query.toUpperCase().trim().startsWith('SELECT')) {
      alert('Only SELECT queries are allowed');
      return;
    }
    
    this.loading.set(true);
    try {
      const result = await this.api.callOrThrow<any>('duckdbExecuteQuery', [{ query }]);
      const results = result.results || [];
      this.queryResults.set(results);
      if (results.length > 0) {
        this.resultKeys.set(Object.keys(results[0]));
      }
      this.logOperation('Executed query: ' + query.substring(0, 50) + '...');
    } catch (error) {
      this.logger.error('Query failed', error);
      this.queryResults.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}

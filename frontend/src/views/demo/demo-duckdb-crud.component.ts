/**
 * DuckDB CRUD Demo Component
 * Complete CRUD operations with analytics capabilities
 */

import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { LoggerService } from '../../core/logger.service';
import { NotificationService } from '../../core/notification.service';

export interface DuckDbUser {
  id: number;
  name: string;
  email: string;
  age: number;
  status: string;
  created_at?: string;
}

@Component({
  selector: 'app-demo-duckdb-crud',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="duckdb-crud-demo">
      <header class="demo-header">
        <h1>🦆 DuckDB CRUD Demo</h1>
        <p>Analytics-ready database with full CRUD support</p>
      </header>

      <!-- Feature Highlights -->
      <div class="features-bar">
        <div class="feature-item">
          <span class="feature-icon">⚡</span>
          <span>Fast Analytics</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">📊</span>
          <span>Column-oriented</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">🔍</span>
          <span>SQL Queries</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">✅</span>
          <span>ACID Compliant</span>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="action-bar">
        <button class="btn btn-primary" (click)="setMode('list')">
          📋 View All
        </button>
        <button class="btn btn-success" (click)="setMode('create')">
          ➕ Create User
        </button>
        <button class="btn btn-info" (click)="loadStats()">
          📊 Analytics
        </button>
        <button class="btn btn-purple" (click)="setMode('query')">
          💻 Custom Query
        </button>
      </div>

      <!-- Loading State -->
      <div class="loading" *ngIf="loading()">
        <div class="spinner"></div>
        <p>Loading...</p>
      </div>

      <!-- Create Form -->
      <div class="form-panel" *ngIf="mode() === 'create'">
        <h2>Create New User</h2>
        
        <div class="form-group">
          <label>Name *</label>
          <input 
            type="text" 
            [(ngModel)]="formData().name"
            placeholder="Enter name"
            [class.error]="!formData().name"
          />
        </div>

        <div class="form-group">
          <label>Email *</label>
          <input 
            type="email" 
            [(ngModel)]="formData().email"
            placeholder="Enter email"
            [class.error]="!formData().email"
          />
        </div>

        <div class="form-group">
          <label>Age *</label>
          <input 
            type="number" 
            [(ngModel)]="formData().age"
            placeholder="Enter age"
            [class.error]="!formData().age"
          />
        </div>

        <div class="form-group">
          <label>Status</label>
          <select [(ngModel)]="formData().status">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        <div class="form-actions">
          <button class="btn btn-success" (click)="createUser()" [disabled]="!canSubmit()">
            ✅ Create User
          </button>
          <button class="btn btn-secondary" (click)="setMode('list')">
            ❌ Cancel
          </button>
        </div>
      </div>

      <!-- Users List -->
      <div class="list-panel" *ngIf="mode() === 'list'">
        <div class="panel-header">
          <h2>Users ({{ users().length }})</h2>
          <button class="btn btn-primary btn-sm" (click)="loadUsers()">
            🔄 Refresh
          </button>
        </div>

        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Age</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let user of users()">
                <td>#{{ user.id }}</td>
                <td>{{ user.name }}</td>
                <td>{{ user.email }}</td>
                <td>{{ user.age }}</td>
                <td>
                  <span class="status-badge" [class]="'status-' + user.status">
                    {{ user.status }}
                  </span>
                </td>
                <td>
                  <button class="btn-icon btn-danger" (click)="deleteUser(user.id)">
                    🗑️
                  </button>
                </td>
              </tr>
              <tr *ngIf="users().length === 0">
                <td colspan="6" class="empty-state">
                  No users found. Click "Create User" to add one.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Analytics Panel -->
      <div class="analytics-panel" *ngIf="mode() === 'stats'">
        <h2>📊 DuckDB Analytics</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">{{ stats().totalUsers }}</div>
            <div class="stat-label">Total Users</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ stats().avgAge }}</div>
            <div class="stat-label">Average Age</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ stats().maxAge }}</div>
            <div class="stat-label">Max Age</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ stats().minAge }}</div>
            <div class="stat-label">Min Age</div>
          </div>
        </div>

        <div class="chart-placeholder">
          <h3>Age Distribution</h3>
          <div class="bar-chart">
            <div class="bar-group" *ngFor="let group of ageGroups()">
              <div class="bar-label">{{ group.label }}</div>
              <div class="bar-container">
                <div class="bar" [style.width.%]="group.percentage"></div>
              </div>
              <div class="bar-value">{{ group.count }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Custom Query Panel -->
      <div class="query-panel" *ngIf="mode() === 'query'">
        <h2>💻 Custom SQL Query</h2>
        <div class="query-editor">
          <textarea 
            [(ngModel)]="customQuery"
            placeholder="SELECT * FROM users WHERE age > 30"
            rows="5"
          ></textarea>
          <div class="query-actions">
            <button class="btn btn-primary" (click)="executeQuery()">
              ▶️ Execute
            </button>
            <button class="btn btn-secondary" (click)="clearQuery()">
              🗑️ Clear
            </button>
          </div>
        </div>

        <div class="query-results" *ngIf="queryResults().length > 0">
          <h3>Results ({{ queryResults().length }} rows)</h3>
          <pre class="results-json">{{ queryResults() | json }}</pre>
        </div>
      </div>

      <!-- Checklist -->
      <div class="checklist-panel">
        <h3>✅ DuckDB Features</h3>
        <div class="checklist-grid">
          <div class="checklist-item" [class.done]="checklist().crud">
            <span class="check-icon">{{ checklist().crud ? '✅' : '⬜' }}</span>
            <span>CRUD Operations</span>
          </div>
          <div class="checklist-item" [class.done]="checklist().analytics">
            <span class="check-icon">{{ checklist().analytics ? '✅' : '⬜' }}</span>
            <span>Analytics</span>
          </div>
          <div class="checklist-item" [class.done]="checklist().queries">
            <span class="check-icon">{{ checklist().queries ? '✅' : '⬜' }}</span>
            <span>Custom Queries</span>
          </div>
          <div class="checklist-item" [class.done]="checklist().performance">
            <span class="check-icon">{{ checklist().performance ? '✅' : '⬜' }}</span>
            <span>Performance</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .duckdb-crud-demo {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    .demo-header {
      margin-bottom: 2rem;
      
      h1 {
        font-size: 2rem;
        margin-bottom: 0.5rem;
        color: #fff;
      }
      
      p {
        color: #9ca3af;
      }
    }

    .features-bar {
      display: flex;
      gap: 2rem;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      
      .feature-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: #e5e7eb;
        background: rgba(55, 65, 81, 0.5);
        padding: 0.75rem 1.25rem;
        border-radius: 8px;
        
        .feature-icon {
          font-size: 1.5rem;
        }
      }
    }

    .action-bar {
      display: flex;
      gap: 1rem;
      margin-bottom: 2rem;
      flex-wrap: wrap;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      
      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      
      &:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      }
    }

    .btn-success {
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      
      &:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
      }
    }

    .btn-info {
      background: linear-gradient(135deg, #3b82f6, #2563eb);
      color: white;
      
      &:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
      }
    }

    .btn-purple {
      background: linear-gradient(135deg, #8b5cf6, #7c3aed);
      color: white;
      
      &:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
      }
    }

    .btn-secondary {
      background: #4b5563;
      color: white;
      
      &:hover:not(:disabled) {
        background: #6b7280;
      }
    }

    .btn-danger {
      background: #ef4444;
      color: white;
      padding: 0.5rem 1rem;
    }

    .btn-sm {
      padding: 0.5rem 1rem;
      font-size: 0.9rem;
    }

    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 3rem;
      
      .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #374151;
        border-top-color: #667eea;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      
      p {
        margin-top: 1rem;
        color: #9ca3af;
      }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .form-panel, .list-panel, .analytics-panel, .query-panel {
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid rgba(148, 163, 184, 0.1);
      border-radius: 12px;
      padding: 2rem;
      margin-bottom: 2rem;
    }

    .form-group {
      margin-bottom: 1.5rem;
      
      label {
        display: block;
        margin-bottom: 0.5rem;
        color: #e5e7eb;
        font-weight: 500;
      }
      
      input, select, textarea {
        width: 100%;
        padding: 0.75rem;
        border: 2px solid #374151;
        border-radius: 8px;
        background: #1f2937;
        color: #fff;
        font-size: 1rem;
        transition: all 0.3s;
        
        &:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        &.error {
          border-color: #ef4444;
        }
      }
      
      textarea {
        font-family: 'Monaco', 'Consolas', monospace;
        resize: vertical;
      }
    }

    .form-actions {
      display: flex;
      gap: 1rem;
      margin-top: 2rem;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      
      h2 {
        color: #fff;
      }
    }

    .table-container {
      overflow-x: auto;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      
      th, td {
        padding: 1rem;
        text-align: left;
        border-bottom: 1px solid #374151;
      }
      
      th {
        background: rgba(55, 65, 81, 0.5);
        color: #e5e7eb;
        font-weight: 600;
      }
      
      td {
        color: #d1d5db;
      }
      
      tr:hover {
        background: rgba(55, 65, 81, 0.3);
      }
    }

    .status-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 500;
      
      &.status-active {
        background: rgba(16, 185, 129, 0.2);
        color: #10b981;
      }
      
      &.status-inactive {
        background: rgba(107, 114, 128, 0.2);
        color: #9ca3af;
      }
      
      &.status-pending {
        background: rgba(245, 158, 11, 0.2);
        color: #f59e0b;
      }
    }

    .btn-icon {
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 1.2rem;
      padding: 0.25rem;
      transition: transform 0.3s;
      
      &:hover {
        transform: scale(1.2);
      }
    }

    .empty-state {
      text-align: center;
      color: #6b7280;
      padding: 2rem;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
      
      .stat-card {
        background: rgba(55, 65, 81, 0.5);
        padding: 1.5rem;
        border-radius: 8px;
        text-align: center;
        
        .stat-value {
          font-size: 2.5rem;
          font-weight: 700;
          color: #8b5cf6;
          margin-bottom: 0.5rem;
        }
        
        .stat-label {
          color: #9ca3af;
          font-size: 0.9rem;
        }
      }
    }

    .chart-placeholder {
      background: rgba(55, 65, 81, 0.3);
      padding: 1.5rem;
      border-radius: 8px;
      
      h3 {
        color: #fff;
        margin-bottom: 1.5rem;
      }
    }

    .bar-chart {
      .bar-group {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1rem;
        
        .bar-label {
          width: 100px;
          color: #e5e7eb;
          font-size: 0.9rem;
        }
        
        .bar-container {
          flex: 1;
          height: 24px;
          background: rgba(55, 65, 81, 0.5);
          border-radius: 4px;
          overflow: hidden;
          
          .bar {
            height: 100%;
            background: linear-gradient(90deg, #8b5cf6, #7c3aed);
            transition: width 0.5s ease;
          }
        }
        
        .bar-value {
          width: 40px;
          text-align: right;
          color: #9ca3af;
          font-size: 0.9rem;
        }
      }
    }

    .query-editor {
      margin-bottom: 1.5rem;
      
      textarea {
        width: 100%;
        font-family: 'Monaco', 'Consolas', monospace;
        font-size: 0.9rem;
      }
      
      .query-actions {
        display: flex;
        gap: 1rem;
        margin-top: 1rem;
      }
    }

    .query-results {
      background: rgba(55, 65, 81, 0.3);
      padding: 1.5rem;
      border-radius: 8px;
      
      h3 {
        color: #fff;
        margin-bottom: 1rem;
      }
      
      .results-json {
        background: #1f2937;
        padding: 1rem;
        border-radius: 4px;
        overflow-x: auto;
        color: #10b981;
        font-family: 'Monaco', 'Consolas', monospace;
        font-size: 0.875rem;
        max-height: 400px;
        overflow-y: auto;
      }
    }

    .checklist-panel {
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid rgba(148, 163, 184, 0.1);
      border-radius: 12px;
      padding: 2rem;
      
      h3 {
        color: #fff;
        margin-bottom: 1.5rem;
      }
    }

    .checklist-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
    }

    .checklist-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      background: rgba(55, 65, 81, 0.3);
      border-radius: 8px;
      color: #9ca3af;
      transition: all 0.3s;
      
      &.done {
        background: rgba(139, 92, 246, 0.2);
        color: #8b5cf6;
      }
      
      .check-icon {
        font-size: 1.5rem;
      }
    }
  `]
})
export class DemoDuckdbCrudComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly logger = inject(LoggerService);
  private readonly notification = inject(NotificationService);

  readonly loading = signal(false);
  readonly mode = signal<'list' | 'create' | 'stats' | 'query'>('list');
  readonly users = signal<DuckDbUser[]>([]);
  readonly stats = signal({
    totalUsers: 0,
    avgAge: 0,
    maxAge: 0,
    minAge: 0
  });
  readonly ageGroups = signal<Array<{ label: string; count: number; percentage: number }>>([]);

  readonly formData = signal({
    name: '',
    email: '',
    age: '',
    status: 'active'
  });

  readonly checklist = signal({
    crud: false,
    analytics: false,
    queries: false,
    performance: false
  });

  customQuery = 'SELECT * FROM users ORDER BY age DESC LIMIT 10';
  readonly queryResults = signal<any[]>([]);

  ngOnInit(): void {
    this.loadUsers();
  }

  async loadUsers(): Promise<void> {
    this.loading.set(true);
    try {
      const response = await this.api.callOrThrow<DuckDbUser[]>('duckdbGetUsers', []);
      this.users.set(response);
      this.checklist.update(c => ({ ...c, crud: true }));
    } catch (error) {
      this.logger.error('Failed to load DuckDB users', error);
      this.notification.error('Failed to load DuckDB users');
    } finally {
      this.loading.set(false);
    }
  }

  async loadStats(): Promise<void> {
    this.loading.set(true);
    try {
      const response = await this.api.callOrThrow<any>('duckdbGetUserStats', []);
      this.stats.set(response);
      this.calculateAgeGroups();
      this.mode.set('stats');
      this.checklist.update(c => ({ ...c, analytics: true }));
    } catch (error) {
      this.logger.error('Failed to load DuckDB stats', error);
      this.notification.error('Failed to load statistics');
    } finally {
      this.loading.set(false);
    }
  }

  calculateAgeGroups(): void {
    const users = this.users();
    const groups = [
      { label: '0-18', min: 0, max: 18, count: 0 },
      { label: '19-30', min: 19, max: 30, count: 0 },
      { label: '31-50', min: 31, max: 50, count: 0 },
      { label: '51+', min: 51, max: 999, count: 0 }
    ];

    users.forEach(user => {
      groups.forEach(group => {
        if (user.age >= group.min && user.age <= group.max) {
          group.count++;
        }
      });
    });

    const total = users.length || 1;
    this.ageGroups.set(groups.map(g => ({
      label: g.label,
      count: g.count,
      percentage: (g.count / total) * 100
    })));
  }

  setMode(newMode: 'list' | 'create' | 'stats' | 'query'): void {
    this.mode.set(newMode);
    if (newMode === 'list') {
      this.loadUsers();
    }
  }

  canSubmit(): boolean {
    return !!(
      this.formData().name.trim() &&
      this.formData().email.trim() &&
      this.formData().age
    );
  }

  async createUser(): Promise<void> {
    if (!this.canSubmit()) {
      this.notification.error('Please fill all required fields');
      return;
    }

    this.loading.set(true);
    try {
      const userData = {
        name: this.formData().name.trim(),
        email: this.formData().email.trim(),
        age: parseInt(this.formData().age, 10),
        status: this.formData().status
      };

      await this.api.callOrThrow('duckdbCreateUser', [userData]);
      this.notification.success('User created successfully');
      this.resetForm();
      this.loadUsers();
      this.setMode('list');
    } catch (error) {
      this.logger.error('Failed to create DuckDB user', error);
      this.notification.error('Failed to create user');
    } finally {
      this.loading.set(false);
    }
  }

  async deleteUser(userId: number): Promise<void> {
    if (!confirm(`Delete user #${userId}?`)) {
      return;
    }

    this.loading.set(true);
    try {
      await this.api.callOrThrow('duckdbDeleteUser', [userId.toString()]);
      this.notification.success('User deleted successfully');
      this.loadUsers();
    } catch (error) {
      this.logger.error('Failed to delete DuckDB user', error);
      this.notification.error('Failed to delete user');
    } finally {
      this.loading.set(false);
    }
  }

  async executeQuery(): Promise<void> {
    if (!this.customQuery.trim()) {
      this.notification.error('Please enter a query');
      return;
    }

    this.loading.set(true);
    try {
      const results = await this.api.call<any[]>('duckdbExecuteQuery', [this.customQuery]);
      this.queryResults.set(results.data || []);
      this.checklist.update(c => ({ ...c, queries: true }));
    } catch (error) {
      this.logger.error('Query execution failed', error);
      this.notification.error('Query failed: ' + (error as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  clearQuery(): void {
    this.customQuery = '';
    this.queryResults.set([]);
  }

  resetForm(): void {
    this.formData.set({
      name: '',
      email: '',
      age: '',
      status: 'active'
    });
  }
}

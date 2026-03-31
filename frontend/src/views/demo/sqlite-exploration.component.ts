/**
 * SQLite Integration Exploration Demo
 * Explores SQLite-specific features: transactions, constraints, and row-oriented operations
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
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  created_at: string;
  updated_at: string;
}

interface ConstraintData {
  name: string;
  email: string;
  age: number;
  status: string;
}

interface TransactionLog {
  id: number;
  operation: string;
  table: string;
  timestamp: string;
  success: boolean;
}

@Component({
  selector: 'app-sqlite-exploration',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="exploration-container">
      <header class="exploration-header">
        <h1>🗄️ SQLite Integration Exploration</h1>
        <p>Discover SQLite's transactional integrity and constraint features</p>
      </header>

      <!-- Mode Selector -->
      <div class="mode-selector">
        <button 
          class="mode-btn" 
          [class.active]="mode() === 'crud'"
          (click)="mode.set('crud')">
          📋 Full CRUD
        </button>
        <button 
          class="mode-btn" 
          [class.active]="mode() === 'constraints'"
          (click)="mode.set('constraints')">
          🔒 Constraints
        </button>
        <button 
          class="mode-btn" 
          [class.active]="mode() === 'transactions'"
          (click)="loadTransactionHistory(); mode.set('transactions')">
          🔄 Transactions
        </button>
        <button 
          class="mode-btn" 
          [class.active]="mode() === 'performance'"
          (click)="runPerformanceTest(); mode.set('performance')">
          ⚡ Performance
        </button>
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Loading...</p>
        </div>
      }

      <!-- Full CRUD Mode -->
      @if (mode() === 'crud' && !loading()) {
        <div class="crud-section">
          <div class="tabs">
            <button 
              class="tab-btn" 
              [class.active]="crudTab() === 'list'"
              (click)="crudTab.set('list')">
              📋 User List
            </button>
            <button 
              class="tab-btn" 
              [class.active]="crudTab() === 'create'"
              (click)="crudTab.set('create')">
              ➕ Create
            </button>
            @if (editingUser()) {
              <button 
                class="tab-btn active"
                (click)="crudTab.set('edit')">
                ✏️ Edit
              </button>
            }
          </div>

          @if (crudTab() === 'list') {
            <div class="list-controls">
              <input 
                type="text" 
                placeholder="Search users..." 
                class="search-input"
                [(ngModel)]="searchQuery"
                (input)="filterUsers()">
              <select [(ngModel)]="statusFilter" (change)="filterUsers()" class="filter-select">
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

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
                    <th>Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (user of filteredUsers(); track user.id) {
                    <tr>
                      <td class="id-cell">#{{ user.id }}</td>
                      <td class="name-cell">{{ user.name }}</td>
                      <td class="email-cell">{{ user.email }}</td>
                      <td>{{ user.age }}</td>
                      <td>
                        <span class="status-badge" [class]="'status-' + user.status">
                          {{ user.status }}
                        </span>
                      </td>
                      <td>{{ user.created_at | date:'MMM d, y' }}</td>
                      <td>{{ user.updated_at | date:'MMM d, y' }}</td>
                      <td class="actions-cell">
                        <button class="btn-icon btn-edit" (click)="startEdit(user)">✏️</button>
                        <button class="btn-icon btn-delete" (click)="deleteUser(user.id)">🗑️</button>
                      </td>
                    </tr>
                  }
                  @empty {
                    <tr>
                      <td colspan="8" class="empty-state">No users found</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }

          @if (crudTab() === 'create' || crudTab() === 'edit') {
            <div class="form-card">
              <h3>{{ crudTab() === 'create' ? 'Create New User' : 'Edit User' }}</h3>
              <form (ngSubmit)="crudTab() === 'create' ? createUser() : updateUser()" class="user-form">
                <div class="form-grid">
                  <div class="form-group">
                    <label>Name *</label>
                    <input 
                      type="text" 
                      [(ngModel)]="formData.name" 
                      name="name" 
                      required
                      minlength="2"
                      maxlength="256"
                      class="form-input"
                      [class.error]="formErrors().name">
                    @if (formErrors().name) {
                      <span class="error-text">{{ formErrors().name }}</span>
                    }
                  </div>

                  <div class="form-group">
                    <label>Email *</label>
                    <input 
                      type="email" 
                      [ngModel]="formData().email"
                      (ngModelChange)="updateFormEmail($event)"
                      name="email" 
                      required
                      class="form-input"
                      [class.error]="formErrors().email">
                    @if (formErrors().email) {
                      <span class="error-text">{{ formErrors().email }}</span>
                    }
                  </div>

                  <div class="form-group">
                    <label>Age *</label>
                    <input 
                      type="number" 
                      [ngModel]="formData().age"
                      (ngModelChange)="updateFormAge($event)"
                      name="age"
                      required
                      min="0"
                      max="150"
                      class="form-input"
                      [class.error]="formErrors().age">
                    @if (formErrors().age) {
                      <span class="error-text">{{ formErrors().age }}</span>
                    }
                  </div>

                  <div class="form-group">
                    <label>Status *</label>
                    <select
                      [ngModel]="formData().status"
                      (ngModelChange)="updateFormStatus($event)"
                      name="status"
                      required
                      class="form-input">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="pending">Pending</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </div>

                <div class="form-actions">
                  <button type="submit" class="btn btn-success">
                    {{ crudTab() === 'create' ? '✅ Create User' : '💾 Save Changes' }}
                  </button>
                  <button type="button" class="btn btn-secondary" (click)="cancelEdit()">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          }
        </div>
      }

      <!-- Constraints Mode -->
      @if (mode() === 'constraints' && !loading()) {
        <div class="constraints-section">
          <div class="section-header">
            <h2>🔒 Database Constraints Demo</h2>
            <p>Test SQLite's data integrity features</p>
          </div>

          <div class="constraints-grid">
            <div class="constraint-card">
              <h3>NOT NULL Constraint</h3>
              <p>Fields marked as required cannot be empty</p>
              <div class="constraint-demo">
                <input type="text" placeholder="Enter name (required)" [ngModel]="constraintData().name" (ngModelChange)="updateConstraintName($event)" class="demo-input">
                <button class="btn btn-primary" (click)="testNotNullConstraint()">Test</button>
              </div>
              @if (constraintResult()) {
                <div class="constraint-result" [class.success]="constraintResult()?.success" [class.error]="!constraintResult()?.success">
                  {{ constraintResult()?.message }}
                </div>
              }
            </div>

            <div class="constraint-card">
              <h3>UNIQUE Constraint</h3>
              <p>Email addresses must be unique across all records</p>
              <div class="constraint-demo">
                <input type="email" placeholder="Enter email" [ngModel]="constraintData().email" (ngModelChange)="updateConstraintEmail($event)" class="demo-input">
                <button class="btn btn-primary" (click)="testUniqueConstraint()">Test</button>
              </div>
              @if (constraintResult()) {
                <div class="constraint-result" [class.success]="constraintResult()?.success" [class.error]="!constraintResult()?.success">
                  {{ constraintResult()?.message }}
                </div>
              }
            </div>

            <div class="constraint-card">
              <h3>CHECK Constraint</h3>
              <p>Age must be between 0 and 150</p>
              <div class="constraint-demo">
                <input type="number" placeholder="Enter age (0-150)" [ngModel]="constraintData().age" (ngModelChange)="updateConstraintAge($event)" class="demo-input">
                <button class="btn btn-primary" (click)="testCheckConstraint()">Test</button>
              </div>
              @if (constraintResult()) {
                <div class="constraint-result" [class.success]="constraintResult()?.success" [class.error]="!constraintResult()?.success">
                  {{ constraintResult()?.message }}
                </div>
              }
            </div>

            <div class="constraint-card">
              <h3>ENUM Constraint</h3>
              <p>Status must be one of: active, inactive, pending, suspended</p>
              <div class="constraint-demo">
                <select [ngModel]="constraintData().status" (ngModelChange)="updateConstraintStatus($event)" class="demo-input">
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                  <option value="pending">pending</option>
                  <option value="suspended">suspended</option>
                  <option value="invalid">invalid (test)</option>
                </select>
                <button class="btn btn-primary" (click)="testEnumConstraint()">Test</button>
              </div>
              @if (constraintResult()) {
                <div class="constraint-result" [class.success]="constraintResult()?.success" [class.error]="!constraintResult()?.success">
                  {{ constraintResult()?.message }}
                </div>
              }
            </div>
          </div>

          <div class="schema-info">
            <h3>Users Table Schema</h3>
            <pre class="schema-code">CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    age INTEGER CHECK (age >= 0 AND age <= 150),
    status TEXT CHECK (status IN ('active', 'inactive', 'pending', 'suspended')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);</pre>
          </div>
        </div>
      }

      <!-- Transactions Mode -->
      @if (mode() === 'transactions' && !loading()) {
        <div class="transactions-section">
          <div class="section-header">
            <h2>🔄 Transaction History</h2>
            <button class="btn btn-primary" (click)="loadTransactionHistory()">🔄 Refresh</button>
          </div>

          <div class="transaction-stats">
            <div class="stat-card">
              <div class="stat-label">Total Operations</div>
              <div class="stat-value">{{ transactionStats().total }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Successful</div>
              <div class="stat-value success">{{ transactionStats().success }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Failed</div>
              <div class="stat-value error">{{ transactionStats().failed }}</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Success Rate</div>
              <div class="stat-value">{{ transactionStats().rate }}%</div>
            </div>
          </div>

          <div class="transaction-log">
            <div class="log-header">
              <h3>Recent Operations</h3>
              <div class="log-filters">
                <button class="filter-chip" [class.active]="transactionFilter() === 'all'" (click)="transactionFilter.set('all')">All</button>
                <button class="filter-chip" [class.active]="transactionFilter() === 'success'" (click)="transactionFilter.set('success')">Success</button>
                <button class="filter-chip" [class.active]="transactionFilter() === 'failed'" (click)="transactionFilter.set('failed')">Failed</button>
              </div>
            </div>
            <div class="log-entries">
              @for (log of filteredTransactions(); track log.id) {
                <div class="log-entry" [class.success]="log.success" [class.failed]="!log.success">
                  <div class="log-icon">{{ log.success ? '✅' : '❌' }}</div>
                  <div class="log-content">
                    <div class="log-operation">{{ log.operation }}</div>
                    <div class="log-detail">{{ log.table }} • {{ log.timestamp | date:'medium' }}</div>
                  </div>
                </div>
              }
              @empty {
                <div class="empty-log">No transaction history available</div>
              }
            </div>
          </div>
        </div>
      }

      <!-- Performance Mode -->
      @if (mode() === 'performance' && !loading()) {
        <div class="performance-section">
          <div class="section-header">
            <h2>⚡ Performance Testing</h2>
            <button class="btn btn-success" (click)="runPerformanceTest()" [disabled]="performanceRunning()">
              {{ performanceRunning() ? '⏳ Running...' : '▶️ Run Test' }}
            </button>
          </div>

          @if (performanceResults().length > 0) {
            <div class="results-grid">
              @for (result of performanceResults(); track result.operation) {
                <div class="result-card">
                  <div class="result-header">
                    <h4>{{ result.operation }}</h4>
                    <span class="result-count">{{ result.count }} ops</span>
                  </div>
                  <div class="result-metrics">
                    <div class="metric">
                      <span class="metric-label">Total Time</span>
                      <span class="metric-value">{{ result.totalTime }}ms</span>
                    </div>
                    <div class="metric">
                      <span class="metric-label">Avg per Op</span>
                      <span class="metric-value">{{ result.avgTime }}ms</span>
                    </div>
                    <div class="metric">
                      <span class="metric-label">Ops/Second</span>
                      <span class="metric-value highlight">{{ result.opsPerSecond }}</span>
                    </div>
                  </div>
                  <div class="result-bar">
                    <div class="bar-fill" [style.width.%]="(result.avgTime / maxAvgTime()) * 100"></div>
                  </div>
                </div>
              }
            </div>

            <div class="performance-summary">
              <h3>Performance Summary</h3>
              <div class="summary-grid">
                <div class="summary-item">
                  <span class="summary-label">Fastest Operation:</span>
                  <span class="summary-value">{{ fastestOperation() }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Slowest Operation:</span>
                  <span class="summary-value">{{ slowestOperation() }}</span>
                </div>
                <div class="summary-item">
                  <span class="summary-label">Average Response:</span>
                  <span class="summary-value">{{ avgResponseTime() }}ms</span>
                </div>
              </div>
            </div>
          } @else {
            <div class="performance-intro">
              <p>Click "Run Test" to benchmark SQLite operations:</p>
              <ul>
                <li>📊 Insert 50 records</li>
                <li>📊 Read all records</li>
                <li>📊 Update 25 records</li>
                <li>📊 Delete 25 records</li>
              </ul>
            </div>
          }
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
      background: linear-gradient(135deg, #10b981, #059669);
      border-color: transparent;
      color: #fff;
      box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
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
      border: 4px solid rgba(16, 185, 129, 0.2);
      border-top-color: #10b981;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.1);
      padding-bottom: 12px;
    }

    .tab-btn {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: #94a3b8;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
    }

    .tab-btn:hover {
      background: rgba(16, 185, 129, 0.1);
      color: #fff;
    }

    .tab-btn.active {
      background: rgba(16, 185, 129, 0.2);
      color: #10b981;
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

    .section-header p {
      color: #94a3b8;
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

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-primary { background: #3b82f6; color: #fff; }
    .btn-success { background: #10b981; color: #fff; }
    .btn-secondary { background: #64748b; color: #fff; }

    .btn:hover:not(:disabled) { transform: translateY(-2px); opacity: 0.9; }

    .btn-icon {
      padding: 6px 10px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      background: transparent;
    }

    .btn-edit:hover { background: rgba(245, 158, 11, 0.2); }
    .btn-delete:hover { background: rgba(239, 68, 68, 0.2); }

    /* CRUD Section */
    .crud-section {
      background: rgba(30, 41, 59, 0.5);
      border-radius: 12px;
      padding: 24px;
    }

    .list-controls {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
    }

    .search-input {
      flex: 1;
      padding: 10px 14px;
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 6px;
      background: rgba(15, 23, 42, 0.8);
      color: #fff;
      font-size: 14px;
    }

    .filter-select {
      padding: 10px 14px;
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 6px;
      background: rgba(15, 23, 42, 0.8);
      color: #fff;
      font-size: 14px;
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
      background: rgba(16, 185, 129, 0.1);
      font-weight: 600;
      color: #94a3b8;
    }

    .data-table tr:hover {
      background: rgba(16, 185, 129, 0.05);
    }

    .id-cell {
      font-family: monospace;
      color: #94a3b8;
    }

    .name-cell {
      font-weight: 500;
      color: #fff;
    }

    .email-cell {
      color: #94a3b8;
    }

    .actions-cell {
      display: flex;
      gap: 4px;
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
    .status-suspended { background: rgba(239, 68, 68, 0.2); color: #ef4444; }

    .empty-state {
      text-align: center;
      color: #64748b;
      padding: 32px;
    }

    .form-card {
      background: rgba(15, 23, 42, 0.8);
      border-radius: 8px;
      padding: 24px;
    }

    .form-card h3 {
      font-size: 18px;
      font-weight: 600;
      color: #fff;
      margin: 0 0 20px;
    }

    .form-grid {
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

    .form-input.error {
      border-color: #ef4444;
    }

    .error-text {
      color: #ef4444;
      font-size: 12px;
    }

    .form-actions {
      display: flex;
      gap: 12px;
      margin-top: 20px;
    }

    /* Constraints Section */
    .constraints-section {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .constraints-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .constraint-card {
      background: rgba(15, 23, 42, 0.8);
      border-radius: 8px;
      padding: 20px;
    }

    .constraint-card h3 {
      font-size: 16px;
      font-weight: 600;
      color: #fff;
      margin: 0 0 8px;
    }

    .constraint-card p {
      font-size: 13px;
      color: #94a3b8;
      margin: 0 0 16px;
    }

    .constraint-demo {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .demo-input {
      flex: 1;
      padding: 10px 14px;
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 6px;
      background: rgba(15, 23, 42, 0.8);
      color: #fff;
      font-size: 14px;
    }

    .constraint-result {
      margin-top: 12px;
      padding: 10px 14px;
      border-radius: 6px;
      font-size: 13px;
    }

    .constraint-result.success {
      background: rgba(16, 185, 129, 0.2);
      color: #10b981;
    }

    .constraint-result.error {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }

    .schema-info {
      background: rgba(15, 23, 42, 0.8);
      border-radius: 8px;
      padding: 20px;
    }

    .schema-info h3 {
      font-size: 16px;
      font-weight: 600;
      color: #fff;
      margin: 0 0 16px;
    }

    .schema-code {
      background: rgba(30, 41, 59, 0.8);
      padding: 16px;
      border-radius: 6px;
      font-family: 'Fira Code', monospace;
      font-size: 13px;
      color: #10b981;
      overflow-x: auto;
      margin: 0;
    }

    /* Transactions Section */
    .transactions-section {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .transaction-stats {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }

    .stat-card {
      background: rgba(15, 23, 42, 0.8);
      border-radius: 8px;
      padding: 20px;
      text-align: center;
    }

    .stat-label {
      font-size: 12px;
      color: #94a3b8;
      margin-bottom: 8px;
    }

    .stat-value {
      font-size: 32px;
      font-weight: 700;
      color: #fff;
    }

    .stat-value.success { color: #10b981; }
    .stat-value.error { color: #ef4444; }

    .transaction-log {
      background: rgba(15, 23, 42, 0.8);
      border-radius: 8px;
      overflow: hidden;
    }

    .log-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.1);
    }

    .log-header h3 {
      font-size: 16px;
      font-weight: 600;
      color: #fff;
      margin: 0;
    }

    .log-filters {
      display: flex;
      gap: 8px;
    }

    .filter-chip {
      padding: 6px 12px;
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 12px;
      background: transparent;
      color: #94a3b8;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.2s;
    }

    .filter-chip:hover {
      border-color: rgba(16, 185, 129, 0.3);
      color: #fff;
    }

    .filter-chip.active {
      background: rgba(16, 185, 129, 0.2);
      border-color: rgba(16, 185, 129, 0.3);
      color: #10b981;
    }

    .log-entries {
      display: flex;
      flex-direction: column;
      max-height: 400px;
      overflow-y: auto;
    }

    .log-entry {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 20px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.05);
    }

    .log-entry:last-child {
      border-bottom: none;
    }

    .log-entry.success {
      background: rgba(16, 185, 129, 0.05);
    }

    .log-entry.failed {
      background: rgba(239, 68, 68, 0.05);
    }

    .log-icon {
      font-size: 18px;
    }

    .log-content {
      flex: 1;
    }

    .log-operation {
      font-size: 14px;
      font-weight: 600;
      color: #fff;
    }

    .log-detail {
      font-size: 12px;
      color: #94a3b8;
    }

    .empty-log {
      text-align: center;
      color: #94a3b8;
      padding: 32px;
    }

    /* Performance Section */
    .performance-section {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .results-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .result-card {
      background: rgba(15, 23, 42, 0.8);
      border-radius: 8px;
      padding: 20px;
    }

    .result-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .result-header h4 {
      font-size: 14px;
      font-weight: 600;
      color: #fff;
      margin: 0;
    }

    .result-count {
      font-size: 12px;
      color: #94a3b8;
    }

    .result-metrics {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 16px;
    }

    .metric {
      text-align: center;
    }

    .metric-label {
      font-size: 11px;
      color: #94a3b8;
      display: block;
      margin-bottom: 4px;
    }

    .metric-value {
      font-size: 18px;
      font-weight: 600;
      color: #fff;
    }

    .metric-value.highlight {
      color: #10b981;
    }

    .result-bar {
      height: 4px;
      background: rgba(148, 163, 184, 0.1);
      border-radius: 2px;
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #10b981, #059669);
      transition: width 0.3s ease;
    }

    .performance-summary {
      background: rgba(15, 23, 42, 0.8);
      border-radius: 8px;
      padding: 20px;
    }

    .performance-summary h3 {
      font-size: 16px;
      font-weight: 600;
      color: #fff;
      margin: 0 0 16px;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .summary-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .summary-label {
      font-size: 12px;
      color: #94a3b8;
    }

    .summary-value {
      font-size: 18px;
      font-weight: 600;
      color: #fff;
    }

    .performance-intro {
      background: rgba(15, 23, 42, 0.8);
      border-radius: 8px;
      padding: 24px;
    }

    .performance-intro p {
      font-size: 14px;
      color: #94a3b8;
      margin: 0 0 16px;
    }

    .performance-intro ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .performance-intro li {
      font-size: 14px;
      color: #e2e8f0;
      padding: 8px 0;
    }
  `]
})
export class SqliteExplorationComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly logger = inject(LoggerService);

  readonly mode = signal<'crud' | 'constraints' | 'transactions' | 'performance'>('crud');
  readonly crudTab = signal<'list' | 'create' | 'edit'>('list');
  readonly loading = signal(false);
  readonly users = signal<User[]>([]);
  readonly filteredUsers = signal<User[]>([]);
  readonly editingUser = signal<User | null>(null);

  readonly searchQuery = signal('');
  readonly statusFilter = signal('');

  readonly formData = signal<{ id: number; name: string; email: string; age: number; status: 'active' | 'inactive' | 'pending' | 'suspended' }>({ id: 0, name: '', email: '', age: 25, status: 'active' });
  readonly formErrors = signal<{ [key: string]: string }>({});

  readonly constraintData = signal<ConstraintData>({ name: '', email: '', age: 25, status: 'active' });
  readonly constraintResult = signal<{ success: boolean; message: string } | null>(null);

  readonly transactions = signal<TransactionLog[]>([]);
  readonly transactionFilter = signal<'all' | 'success' | 'failed'>('all');
  readonly filteredTransactions = signal<TransactionLog[]>([]);
  readonly transactionStats = signal({ total: 0, success: 0, failed: 0, rate: 0 });

  readonly performanceRunning = signal(false);
  readonly performanceResults = signal<any[]>([]);
  readonly maxAvgTime = signal(1);
  readonly fastestOperation = signal('');
  readonly slowestOperation = signal('');
  readonly avgResponseTime = signal(0);

  ngOnInit(): void {
    this.loadUsers();
  }

  async loadUsers(): Promise<void> {
    this.loading.set(true);
    try {
      const result = await this.api.callOrThrow<any[]>('getUsers', []);
      this.users.set(result);
      this.filteredUsers.set(result);
    } catch (error) {
      this.logger.error('Failed to load users', error);
    } finally {
      this.loading.set(false);
    }
  }

  filterUsers(): void {
    let filtered = this.users();
    
    if (this.searchQuery()) {
      const query = this.searchQuery().toLowerCase();
      filtered = filtered.filter(u => 
        u.name.toLowerCase().includes(query) || 
        u.email.toLowerCase().includes(query)
      );
    }
    
    if (this.statusFilter()) {
      filtered = filtered.filter(u => u.status === this.statusFilter());
    }
    
    this.filteredUsers.set(filtered);
  }

  async createUser(): Promise<void> {
    this.formErrors.set({});
    
    if (!this.validateForm()) return;

    this.loading.set(true);
    try {
      await this.api.callOrThrow('createUser', [this.formData()]);
      await this.loadUsers();
      this.formData.set({ id: 0, name: '', email: '', age: 25, status: 'active' });
      this.crudTab.set('list');
    } catch (error) {
      this.logger.error('Failed to create user', error);
    } finally {
      this.loading.set(false);
    }
  }

  async updateUser(): Promise<void> {
    this.formErrors.set({});
    
    if (!this.validateForm()) return;

    this.loading.set(true);
    try {
      await this.api.callOrThrow('updateUser', [this.formData()]);
      await this.loadUsers();
      this.editingUser.set(null);
      this.crudTab.set('list');
    } catch (error) {
      this.logger.error('Failed to update user', error);
    } finally {
      this.loading.set(false);
    }
  }

  async deleteUser(id: number): Promise<void> {
    if (!confirm('Delete this user?')) return;
    this.loading.set(true);
    try {
      await this.api.callOrThrow('deleteUser', [{ id }]);
      await this.loadUsers();
    } catch (error) {
      this.logger.error('Failed to delete user', error);
    } finally {
      this.loading.set(false);
    }
  }

  startEdit(user: User): void {
    this.editingUser.set(user);
    this.formData.set({ 
      id: user.id, 
      name: user.name, 
      email: user.email, 
      age: user.age, 
      status: user.status 
    });
    this.crudTab.set('edit');
  }

  cancelEdit(): void {
    this.editingUser.set(null);
    this.formData.set({ id: 0, name: '', email: '', age: 25, status: 'active' });
    this.crudTab.set('list');
  }

  validateForm(): boolean {
    const errors: { [key: string]: string } = {};
    const data = this.formData();

    if (!data.name || data.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email || !emailRegex.test(data.email)) {
      errors.email = 'Invalid email format';
    }

    if (!data.age || data.age < 0 || data.age > 150) {
      errors.age = 'Age must be between 0 and 150';
    }

    this.formErrors.set(errors);
    return Object.keys(errors).length === 0;
  }

  testNotNullConstraint(): void {
    if (!this.constraintData().name || this.constraintData().name.trim().length === 0) {
      this.constraintResult.set({ success: false, message: '❌ Constraint violated: Name cannot be NULL' });
    } else {
      this.constraintResult.set({ success: true, message: '✅ Constraint satisfied: Name is valid' });
    }
  }

  testUniqueConstraint(): void {
    const email = this.constraintData().email;
    const exists = this.users().some(u => u.email === email);
    if (exists) {
      this.constraintResult.set({ success: false, message: '❌ Constraint violated: Email already exists' });
    } else {
      this.constraintResult.set({ success: true, message: '✅ Constraint satisfied: Email is unique' });
    }
  }

  testCheckConstraint(): void {
    const age = this.constraintData().age;
    if (age < 0 || age > 150) {
      this.constraintResult.set({ success: false, message: '❌ Constraint violated: Age must be 0-150' });
    } else {
      this.constraintResult.set({ success: true, message: '✅ Constraint satisfied: Age is valid' });
    }
  }

  testEnumConstraint(): void {
    const status = this.constraintData().status;
    const validStatuses = ['active', 'inactive', 'pending', 'suspended'];
    if (!validStatuses.includes(status)) {
      this.constraintResult.set({ success: false, message: '❌ Constraint violated: Invalid status value' });
    } else {
      this.constraintResult.set({ success: true, message: '✅ Constraint satisfied: Status is valid' });
    }
  }

  updateConstraintName(value: string): void {
    this.constraintData.update(d => ({ ...d, name: value }));
  }

  updateConstraintEmail(value: string): void {
    this.constraintData.update(d => ({ ...d, email: value }));
  }

  updateConstraintAge(value: number): void {
    this.constraintData.update(d => ({ ...d, age: value }));
  }

  updateConstraintStatus(value: string): void {
    this.constraintData.update(d => ({ ...d, status: value }));
  }

  updateFormStatus(value: 'active' | 'inactive' | 'pending' | 'suspended'): void {
    this.formData.update(d => ({ ...d, status: value }));
  }

  updateFormName(value: string): void {
    this.formData.update(d => ({ ...d, name: value }));
  }

  updateFormEmail(value: string): void {
    this.formData.update(d => ({ ...d, email: value }));
  }

  updateFormAge(value: number): void {
    this.formData.update(d => ({ ...d, age: value }));
  }

  async loadTransactionHistory(): Promise<void> {
    // Simulated transaction history
    const mockTransactions: TransactionLog[] = [
      { id: 1, operation: 'INSERT', table: 'users', timestamp: new Date().toISOString(), success: true },
      { id: 2, operation: 'UPDATE', table: 'users', timestamp: new Date(Date.now() - 60000).toISOString(), success: true },
      { id: 3, operation: 'DELETE', table: 'users', timestamp: new Date(Date.now() - 120000).toISOString(), success: false },
      { id: 4, operation: 'SELECT', table: 'users', timestamp: new Date(Date.now() - 180000).toISOString(), success: true },
    ];
    
    this.transactions.set(mockTransactions);
    this.filterTransactions();
    
    const total = mockTransactions.length;
    const success = mockTransactions.filter(t => t.success).length;
    this.transactionStats.set({
      total,
      success,
      failed: total - success,
      rate: Math.round((success / total) * 100)
    });
  }

  filterTransactions(): void {
    let filtered = this.transactions();
    if (this.transactionFilter() === 'success') {
      filtered = filtered.filter(t => t.success);
    } else if (this.transactionFilter() === 'failed') {
      filtered = filtered.filter(t => !t.success);
    }
    this.filteredTransactions.set(filtered);
  }

  async runPerformanceTest(): Promise<void> {
    this.performanceRunning.set(true);
    this.performanceResults.set([]);
    
    const results: any[] = [];
    const users = this.users();
    
    try {
      // Test INSERT
      const insertStart = Date.now();
      const insertCount = 10;
      for (let i = 0; i < insertCount; i++) {
        await this.api.callOrThrow('createUser', [{
          name: 'Test User ' + i,
          email: 'test' + i + '@example.com',
          age: 25 + i,
          status: 'active'
        }]);
      }
      const insertTime = Date.now() - insertStart;
      results.push({
        operation: 'INSERT',
        count: insertCount,
        totalTime: insertTime,
        avgTime: (insertTime / insertCount).toFixed(2),
        opsPerSecond: Math.round((insertCount / insertTime) * 1000)
      });
      
      await this.loadUsers();
      
      // Test SELECT
      const selectStart = Date.now();
      await this.api.callOrThrow('getUsers', []);
      const selectTime = Date.now() - selectStart;
      results.push({
        operation: 'SELECT',
        count: 1,
        totalTime: selectTime,
        avgTime: selectTime.toFixed(2),
        opsPerSecond: Math.round(1000 / selectTime)
      });
      
      // Test UPDATE
      const updateStart = Date.now();
      const updateCount = 5;
      for (let i = 0; i < updateCount && i < users.length; i++) {
        await this.api.callOrThrow('updateUser', [{
          ...users[i],
          name: users[i].name + ' (updated)'
        }]);
      }
      const updateTime = Date.now() - updateStart;
      results.push({
        operation: 'UPDATE',
        count: Math.min(updateCount, users.length),
        totalTime: updateTime,
        avgTime: (updateTime / Math.min(updateCount, users.length)).toFixed(2),
        opsPerSecond: Math.round((Math.min(updateCount, users.length) / updateTime) * 1000)
      });
      
      // Test DELETE
      const deleteStart = Date.now();
      const deleteCount = Math.min(insertCount, users.length);
      for (let i = 0; i < deleteCount; i++) {
        const user = this.users()[i];
        if (user) {
          await this.api.callOrThrow('deleteUser', [{ id: user.id }]);
        }
      }
      const deleteTime = Date.now() - deleteStart;
      results.push({
        operation: 'DELETE',
        count: deleteCount,
        totalTime: deleteTime,
        avgTime: (deleteTime / deleteCount).toFixed(2),
        opsPerSecond: Math.round((deleteCount / deleteTime) * 1000)
      });
      
      this.performanceResults.set(results);
      this.maxAvgTime.set(Math.max(...results.map(r => parseFloat(r.avgTime))));
      
      const sorted = [...results].sort((a, b) => parseFloat(a.avgTime) - parseFloat(b.avgTime));
      this.fastestOperation.set(sorted[0]?.operation || '');
      this.slowestOperation.set(sorted[sorted.length - 1]?.operation || '');
      this.avgResponseTime.set(Math.round(results.reduce((sum, r) => sum + parseFloat(r.avgTime), 0) / results.length));
      
      await this.loadUsers();
    } catch (error) {
      this.logger.error('Performance test failed', error);
    } finally {
      this.performanceRunning.set(false);
    }
  }
}

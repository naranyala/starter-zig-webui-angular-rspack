/**
 * SQLite CRUD Demo Component
 * Complete CRUD operations with validation and real-time feedback
 */

import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { LoggerService } from '../../core/logger.service';
import { NotificationService } from '../../core/notification.service';

export interface User {
  id: number;
  name: string;
  email: string;
  age: number;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  created_at?: string;
}

export interface FormData {
  name: string;
  email: string;
  age: string;
  status: string;
}

export interface ValidationErrors {
  name?: string;
  email?: string;
  age?: string;
  status?: string;
}

@Component({
  selector: 'app-demo-sqlite-crud',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="sqlite-crud-demo">
      <header class="demo-header">
        <h1>🗄️ SQLite CRUD Demo</h1>
        <p>Complete CRUD operations with input validation</p>
      </header>

      <!-- Action Buttons -->
      <div class="action-bar">
        <button class="btn btn-primary" (click)="setMode('list')">
          📋 View All
        </button>
        <button class="btn btn-success" (click)="setMode('create')">
          ➕ Create User
        </button>
        <button class="btn btn-info" (click)="loadStats()">
          📊 Statistics
        </button>
        <button class="btn btn-warning" (click)="resetForm()">
          🔄 Reset
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
            (blur)="validateName()"
            placeholder="Enter name (2-256 chars)"
            [class.error]="errors().name"
          />
          <span class="error-msg" *ngIf="errors().name">{{ errors().name }}</span>
        </div>

        <div class="form-group">
          <label>Email *</label>
          <input 
            type="email" 
            [(ngModel)]="formData().email"
            (blur)="validateEmail()"
            placeholder="Enter email (valid format)"
            [class.error]="errors().email"
          />
          <span class="error-msg" *ngIf="errors().email">{{ errors().email }}</span>
        </div>

        <div class="form-group">
          <label>Age *</label>
          <input 
            type="number" 
            [(ngModel)]="formData().age"
            (blur)="validateAge()"
            placeholder="Enter age (0-150)"
            [class.error]="errors().age"
          />
          <span class="error-msg" *ngIf="errors().age">{{ errors().age }}</span>
        </div>

        <div class="form-group">
          <label>Status</label>
          <select 
            [(ngModel)]="formData().status"
            (change)="validateStatus()"
            [class.error]="errors().status"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </select>
          <span class="error-msg" *ngIf="errors().status">{{ errors().status }}</span>
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
                  <button class="btn-icon btn-danger" (click)="deleteUser(user.id)" title="Delete">
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

      <!-- Statistics Panel -->
      <div class="stats-panel" *ngIf="mode() === 'stats'">
        <h2>Database Statistics</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">{{ stats().totalUsers }}</div>
            <div class="stat-label">Total Users</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ stats().activeUsers }}</div>
            <div class="stat-label">Active Users</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ stats().avgAge }}</div>
            <div class="stat-label">Average Age</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ stats().lastCreated }}</div>
            <div class="stat-label">Last Created</div>
          </div>
        </div>
      </div>

      <!-- Checklist -->
      <div class="checklist-panel">
        <h3>✅ Feature Checklist</h3>
        <div class="checklist-grid">
          <div class="checklist-item" [class.done]="checklist().create">
            <span class="check-icon">{{ checklist().create ? '✅' : '⬜' }}</span>
            <span>Create User</span>
          </div>
          <div class="checklist-item" [class.done]="checklist().read">
            <span class="check-icon">{{ checklist().read ? '✅' : '⬜' }}</span>
            <span>Read/List Users</span>
          </div>
          <div class="checklist-item" [class.done]="checklist().update">
            <span class="check-icon">{{ checklist().update ? '✅' : '⬜' }}</span>
            <span>Update User</span>
          </div>
          <div class="checklist-item" [class.done]="checklist().delete">
            <span class="check-icon">{{ checklist().delete ? '✅' : '⬜' }}</span>
            <span>Delete User</span>
          </div>
          <div class="checklist-item" [class.done]="checklist().validation">
            <span class="check-icon">{{ checklist().validation ? '✅' : '⬜' }}</span>
            <span>Input Validation</span>
          </div>
          <div class="checklist-item" [class.done]="checklist().errorHandling">
            <span class="check-icon">{{ checklist().errorHandling ? '✅' : '⬜' }}</span>
            <span>Error Handling</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .sqlite-crud-demo {
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

    .btn-warning {
      background: linear-gradient(135deg, #f59e0b, #d97706);
      color: white;
      
      &:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);
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
      
      &:hover {
        background: #dc2626;
      }
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

    .form-panel, .list-panel, .stats-panel {
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
      
      input, select {
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
      
      .error-msg {
        display: block;
        margin-top: 0.25rem;
        color: #ef4444;
        font-size: 0.875rem;
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
      
      &.status-suspended {
        background: rgba(239, 68, 68, 0.2);
        color: #ef4444;
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
      
      .stat-card {
        background: rgba(55, 65, 81, 0.5);
        padding: 1.5rem;
        border-radius: 8px;
        text-align: center;
        
        .stat-value {
          font-size: 2.5rem;
          font-weight: 700;
          color: #667eea;
          margin-bottom: 0.5rem;
        }
        
        .stat-label {
          color: #9ca3af;
          font-size: 0.9rem;
        }
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
        background: rgba(16, 185, 129, 0.2);
        color: #10b981;
      }
      
      .check-icon {
        font-size: 1.5rem;
      }
    }
  `]
})
export class DemoSqliteCrudComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly logger = inject(LoggerService);
  private readonly notification = inject(NotificationService);

  readonly loading = signal(false);
  readonly mode = signal<'list' | 'create' | 'stats'>('list');
  readonly users = signal<User[]>([]);
  readonly stats = signal({
    totalUsers: 0,
    activeUsers: 0,
    avgAge: 0,
    lastCreated: 0
  });

  readonly formData = signal<FormData>({
    name: '',
    email: '',
    age: '',
    status: 'active'
  });

  readonly errors = signal<ValidationErrors>({});
  readonly checklist = signal({
    create: false,
    read: false,
    update: false,
    delete: false,
    validation: false,
    errorHandling: false
  });

  ngOnInit(): void {
    this.loadUsers();
  }

  async loadUsers(): Promise<void> {
    this.loading.set(true);
    try {
      const response = await this.api.callOrThrow<any[]>('getUsers', []);
      this.users.set(response);
      this.checklist.update(c => ({ ...c, read: true }));
      this.logger.info(`Loaded ${response.length} users`);
    } catch (error) {
      this.logger.error('Failed to load users', error);
      this.notification.error('Failed to load users');
      this.checklist.update(c => ({ ...c, errorHandling: true }));
    } finally {
      this.loading.set(false);
    }
  }

  async loadStats(): Promise<void> {
    this.loading.set(true);
    try {
      const response = await this.api.callOrThrow<any>('getUserStats', []);
      this.stats.set(response);
      this.mode.set('stats');
    } catch (error) {
      this.logger.error('Failed to load stats', error);
      this.notification.error('Failed to load statistics');
    } finally {
      this.loading.set(false);
    }
  }

  setMode(newMode: 'list' | 'create' | 'stats'): void {
    this.mode.set(newMode);
    if (newMode === 'list') {
      this.loadUsers();
    }
  }

  validateName(): boolean {
    const name = this.formData().name.trim();
    if (!name) {
      this.errors.update(e => ({ ...e, name: 'Name is required' }));
      return false;
    }
    if (name.length < 2 || name.length > 256) {
      this.errors.update(e => ({ ...e, name: 'Name must be 2-256 characters' }));
      return false;
    }
    this.errors.update(e => ({ ...e, name: undefined }));
    this.checklist.update(c => ({ ...c, validation: true }));
    return true;
  }

  validateEmail(): boolean {
    const email = this.formData().email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email) {
      this.errors.update(e => ({ ...e, email: 'Email is required' }));
      return false;
    }
    if (!emailRegex.test(email)) {
      this.errors.update(e => ({ ...e, email: 'Invalid email format' }));
      return false;
    }
    this.errors.update(e => ({ ...e, email: undefined }));
    this.checklist.update(c => ({ ...c, validation: true }));
    return true;
  }

  validateAge(): boolean {
    const age = parseInt(this.formData().age, 10);
    
    if (!this.formData().age) {
      this.errors.update(e => ({ ...e, age: 'Age is required' }));
      return false;
    }
    if (isNaN(age) || age < 0 || age > 150) {
      this.errors.update(e => ({ ...e, age: 'Age must be 0-150' }));
      return false;
    }
    this.errors.update(e => ({ ...e, age: undefined }));
    this.checklist.update(c => ({ ...c, validation: true }));
    return true;
  }

  validateStatus(): boolean {
    const validStatuses = ['active', 'inactive', 'pending', 'suspended'];
    if (!validStatuses.includes(this.formData().status)) {
      this.errors.update(e => ({ ...e, status: 'Invalid status' }));
      return false;
    }
    this.errors.update(e => ({ ...e, status: undefined }));
    return true;
  }

  canSubmit(): boolean {
    return (
      this.validateName() &&
      this.validateEmail() &&
      this.validateAge() &&
      this.validateStatus()
    );
  }

  async createUser(): Promise<void> {
    if (!this.canSubmit()) {
      this.notification.error('Please fix validation errors');
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

      await this.api.callOrThrow('createUser', [userData]);
      this.checklist.update(c => ({ ...c, create: true }));
      this.notification.success('User created successfully');
      this.resetForm();
      this.loadUsers();
      this.setMode('list');
    } catch (error) {
      this.logger.error('Failed to create user', error);
      this.notification.error('Failed to create user');
      this.checklist.update(c => ({ ...c, errorHandling: true }));
    } finally {
      this.loading.set(false);
    }
  }

  async deleteUser(userId: number): Promise<void> {
    if (!confirm(`Are you sure you want to delete user #${userId}?`)) {
      return;
    }

    this.loading.set(true);
    try {
      await this.api.callOrThrow('deleteUser', [userId.toString()]);
      this.checklist.update(c => ({ ...c, delete: true }));
      this.notification.success('User deleted successfully');
      this.loadUsers();
    } catch (error) {
      this.logger.error('Failed to delete user', error);
      this.notification.error('Failed to delete user');
      this.checklist.update(c => ({ ...c, errorHandling: true }));
    } finally {
      this.loading.set(false);
    }
  }

  resetForm(): void {
    this.formData.set({
      name: '',
      email: '',
      age: '',
      status: 'active'
    });
    this.errors.set({});
  }
}

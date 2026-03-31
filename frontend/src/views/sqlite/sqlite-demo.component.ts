/**
 * SQLite Professional Demo Component
 * 
 * Professional-grade SQLite demonstration with complete CRUD operations,
 * advanced filtering, statistics, and transaction support.
 */

import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { LoggerService } from '../../core/logger.service';
import { NotificationService } from '../../core/notification.service';
import { LoadingSpinnerComponent } from '../../shared/components/common/loading-spinner.component';
import { ErrorDisplayComponent } from '../../shared/components/common/error-display.component';
import { ConfirmDialogComponent } from '../../shared/components/common/confirm-dialog.component';
import { SqliteUserListComponent } from './sqlite-user-list.component';
import { SqliteUserFormComponent } from './sqlite-user-form.component';
import { SqliteStatsPanelComponent } from './sqlite-stats-panel.component';
import { SqliteQueryPanelComponent } from './sqlite-query-panel.component';
import { Validators } from '../../utils/validation.utils';
import { Formatters } from '../../utils/format.utils';

// ============================================================================
// Type Definitions
// ============================================================================

export interface SqliteUser {
  id: number;
  name: string;
  email: string;
  age: number;
  status: SqliteUserStatus;
  created_at: string;
  updated_at: string;
}

export type SqliteUserStatus = 'active' | 'inactive' | 'pending' | 'suspended';

export interface SqliteUserForm {
  name: string;
  email: string;
  age: string;
  status: SqliteUserStatus;
}

export interface SqliteStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  pendingUsers: number;
  suspendedUsers: number;
  avgAge: number;
  newestUser: string;
}

export type DemoMode = 'list' | 'create' | 'edit' | 'stats' | 'query';

// ============================================================================
// Component
// ============================================================================

@Component({
  selector: 'app-sqlite-demo',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LoadingSpinnerComponent,
    ErrorDisplayComponent,
    ConfirmDialogComponent,
    SqliteUserListComponent,
    SqliteUserFormComponent,
    SqliteStatsPanelComponent,
    SqliteQueryPanelComponent,
  ],
  template: `
    <div class="sqlite-demo-container">
      <!-- Header -->
      <header class="demo-header">
        <div class="header-content">
          <div class="header-icon">🗄️</div>
          <div class="header-info">
            <h1>SQLite Database Demo</h1>
            <p>Professional OLTP database operations with transaction support</p>
          </div>
        </div>
        <div class="header-stats">
          <div class="stat-badge">
            <span class="stat-value">{{ users().length }}</span>
            <span class="stat-label">Records</span>
          </div>
        </div>
      </header>

      <!-- Feature Highlights -->
      <div class="feature-bar">
        <div class="feature-item">
          <span class="feature-icon">⚡</span>
          <span class="feature-text">Fast Transactions</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">🔒</span>
          <span class="feature-text">ACID Compliant</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">💾</span>
          <span class="feature-text">Embedded</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">📝</span>
          <span class="feature-text">Row-Oriented</span>
        </div>
      </div>

      <!-- Error Display -->
      <app-error-display
        *ngIf="error()"
        [error]="error()!"
        title="Database Error"
        [showRetry]="true"
        (retry)="loadUsers()">
      </app-error-display>

      <!-- Navigation Tabs -->
      <div class="nav-tabs">
        <button
          class="nav-tab"
          [class.active]="mode() === 'list'"
          (click)="setMode('list')">
          📋 User List
        </button>
        <button
          class="nav-tab"
          [class.active]="mode() === 'create' || mode() === 'edit'"
          (click)="setMode('create')">
          ➕ Create User
        </button>
        <button
          class="nav-tab"
          [class.active]="mode() === 'stats'"
          (click)="loadStats(); setMode('stats')">
          📊 Statistics
        </button>
        <button
          class="nav-tab"
          [class.active]="mode() === 'query'"
          (click)="setMode('query')">
          💻 SQL Query
        </button>
      </div>

      <!-- Loading State -->
      @if (loading()) {
        <div class="loading-container">
          <app-loading-spinner
            size="48px"
            color="primary"
            label="Loading data...">
          </app-loading-spinner>
        </div>
      }

      <!-- Main Content -->
      @if (!loading()) {
        <main class="demo-content">
          
          <!-- List Mode -->
          @if (mode() === 'list') {
            <app-sqlite-user-list
              [users]="users()"
              [filteredUsers]="filteredUsers()"
              [searchQuery]="searchQuery()"
              [statusFilter]="statusFilter()"
              (searchChange)="onSearchChange($event)"
              (statusFilterChange)="onStatusFilterChange($event)"
              (edit)="startEdit($event)"
              (delete)="confirmDelete($event)">
            </app-sqlite-user-list>
          }

          <!-- Create/Edit Mode -->
          @if (mode() === 'create' || mode() === 'edit') {
            <app-sqlite-user-form
              [formData]="formData()"
              [errors]="formErrors()"
              [isEdit]="mode() === 'edit'"
              (formDataChange)="onFormDataChange($event)"
              (submit)="mode() === 'create' ? createUser() : updateUser()"
              (cancel)="setMode('list')">
            </app-sqlite-user-form>
          }

          <!-- Statistics Mode -->
          @if (mode() === 'stats') {
            <app-sqlite-stats-panel
              [stats]="stats()"
              [loading]="statsLoading()">
            </app-sqlite-stats-panel>
          }

          <!-- Query Mode -->
          @if (mode() === 'query') {
            <app-sqlite-query-panel
              [queryResults]="queryResults()"
              [queryExecuting]="queryExecuting()"
              (executeQuery)="executeQuery($event)">
            </app-sqlite-query-panel>
          }

        </main>
      }

      <!-- Confirm Delete Dialog -->
      <app-confirm-dialog
        [visible]="showDeleteConfirm()"
        [title]="deleteValidation()?.hasDependencies ? '⚠️ User Has Dependencies' : 'Delete User'"
        [message]="deleteValidation()?.message || 'Are you sure you want to delete this user? This action cannot be undone.'"
        [details]="deleteValidation()?.hasDependencies ? getDependencyDetails() : undefined"
        [type]="deleteValidation()?.hasDependencies ? 'warning' : 'danger'"
        [confirmLabel]="deleteValidation()?.hasDependencies ? 'Force Delete' : 'Delete'"
        cancelLabel="Cancel"
        [loading]="deleting()"
        (confirm)="deleteUser()"
        (cancel)="cancelDelete()">
      </app-confirm-dialog>
    </div>
  `,
  styles: [`
    .sqlite-demo-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
      color: #e2e8f0;
    }

    .demo-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px;
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1));
      border: 2px solid rgba(16, 185, 129, 0.3);
      border-radius: 16px;
      margin-bottom: 24px;
    }

    .header-content {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .header-icon {
      font-size: 48px;
    }

    .header-info h1 {
      font-size: 24px;
      font-weight: 700;
      color: #fff;
      margin: 0 0 4px;
    }

    .header-info p {
      font-size: 14px;
      color: #94a3b8;
      margin: 0;
    }

    .header-stats {
      display: flex;
      gap: 16px;
    }

    .stat-badge {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 12px 20px;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 12px;
    }

    .stat-value {
      font-size: 24px;
      font-weight: 700;
      color: #10b981;
    }

    .stat-label {
      font-size: 12px;
      color: #94a3b8;
      margin-top: 4px;
    }

    .feature-bar {
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .feature-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 8px;
      font-size: 13px;
      color: #94a3b8;
    }

    .feature-icon {
      font-size: 16px;
    }

    .nav-tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 24px;
      border-bottom: 2px solid rgba(148, 163, 184, 0.2);
      padding-bottom: 0;
    }

    .nav-tab {
      padding: 12px 24px;
      background: rgba(30, 41, 59, 0.5);
      border: 2px solid transparent;
      border-bottom: none;
      border-radius: 12px 12px 0 0;
      color: #94a3b8;
      cursor: pointer;
      font-weight: 600;
      font-size: 14px;
      transition: all 0.2s;
    }

    .nav-tab:hover {
      background: rgba(16, 185, 129, 0.1);
      color: #fff;
    }

    .nav-tab.active {
      background: rgba(16, 185, 129, 0.15);
      border-color: rgba(16, 185, 129, 0.3);
      color: #10b981;
    }

    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 64px;
    }

    .demo-content {
      background: rgba(30, 41, 59, 0.5);
      border-radius: 16px;
      padding: 24px;
      border: 1px solid rgba(148, 163, 184, 0.2);
    }
  `]
})
export class SqliteDemoComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly logger = inject(LoggerService);
  private readonly notification = inject(NotificationService);

  // State
  readonly mode = signal<DemoMode>('list');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // Users
  readonly users = signal<SqliteUser[]>([]);
  readonly filteredUsers = signal<SqliteUser[]>([]);

  // Filters
  readonly searchQuery = signal('');
  readonly statusFilter = signal('');

  // Form
  readonly formData = signal<SqliteUserForm>({
    name: '',
    email: '',
    age: '',
    status: 'active',
  });
  readonly formErrors = signal<Partial<Record<keyof SqliteUserForm, string>>>({});

  // Stats
  readonly stats = signal<SqliteStats | null>(null);
  readonly statsLoading = signal(false);

  // Query
  readonly queryResults = signal<Record<string, unknown>[]>([]);
  readonly queryExecuting = signal(false);
  customQuery = 'SELECT * FROM users ORDER BY id DESC LIMIT 10';

  // Delete
  readonly showDeleteConfirm = signal(false);
  readonly deleting = signal(false);
  userToDelete: number | null = null;

  ngOnInit(): void {
    this.loadUsers();
  }

  // ============================================================================
  // User Operations
  // ============================================================================

  async loadUsers(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const data = await this.api.callOrThrow<SqliteUser[]>('getUsers', []);
      this.users.set(data);
      this.applyFilters();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load users';
      this.error.set(errorMsg);
      this.logger.error('Failed to load SQLite users', err);
    } finally {
      this.loading.set(false);
    }
  }

  async createUser(): Promise<void> {
    if (!this.validateForm()) {
      return;
    }

    this.loading.set(true);

    try {
      const userData = {
        name: this.formData().name.trim(),
        email: this.formData().email.trim(),
        age: parseInt(this.formData().age, 10),
        status: this.formData().status,
      };

      await this.api.callOrThrow('createUser', [userData]);
      this.notification.success('User created successfully');
      this.resetForm();
      this.setMode('list');
      await this.loadUsers();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create user';
      this.notification.error(errorMsg);
      this.logger.error('Failed to create SQLite user', err);
    } finally {
      this.loading.set(false);
    }
  }

  async updateUser(): Promise<void> {
    if (!this.validateForm()) {
      return;
    }

    this.loading.set(true);

    try {
      const userData = {
        id: parseInt(this.formData().age, 10) || 0, // Will be set properly in edit
        name: this.formData().name.trim(),
        email: this.formData().email.trim(),
        age: parseInt(this.formData().age, 10),
        status: this.formData().status,
      };

      await this.api.callOrThrow('updateUser', [userData]);
      this.notification.success('User updated successfully');
      this.resetForm();
      this.setMode('list');
      await this.loadUsers();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update user';
      this.notification.error(errorMsg);
      this.logger.error('Failed to update SQLite user', err);
    } finally {
      this.loading.set(false);
    }
  }

  // State for delete validation
  readonly deleteValidation = signal<{
    hasDependencies: boolean;
    dependencyType?: string;
    dependencyCount?: number;
    message?: string;
  } | null>(null);

  confirmDelete(userId: number): void {
    this.userToDelete = userId;
    this.deleteValidation.set(null);
    this.showDeleteConfirm.set(false);
    
    // First, validate the delete
    this.validateDelete(userId);
  }

  async validateDelete(userId: number): Promise<void> {
    try {
      // Try to delete - backend will validate and return error if dependencies exist
      await this.api.call('deleteUser', [{ id: userId }]);
      // If successful, no dependencies
      this.notification.success('User deleted successfully');
      await this.loadUsers();
    } catch (err: any) {
      // Check if it's a validation error with dependencies
      if (err?.requires_force) {
        // Show dependency warning
        this.deleteValidation.set({
          hasDependencies: true,
          dependencyType: err?.dependency_type,
          dependencyCount: err?.dependency_count,
          message: err?.error || 'User has dependent records',
        });
        this.showDeleteConfirm.set(true);
      } else {
        const errorMsg = err instanceof Error ? err.message : 'Failed to delete user';
        this.notification.error(errorMsg);
      }
    }
  }

  cancelDelete(): void {
    this.showDeleteConfirm.set(false);
    this.userToDelete = null;
    this.deleteValidation.set(null);
  }

  async deleteUser(): Promise<void> {
    if (!this.userToDelete) return;

    const validation = this.deleteValidation();
    
    if (validation?.hasDependencies) {
      // User has dependencies - show force delete option
      try {
        await this.api.callOrThrow('forceDeleteUser', [this.userToDelete.toString()]);
        this.notification.success('User and dependent records deleted');
        this.cancelDelete();
        await this.loadUsers();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to delete user and dependencies';
        this.notification.error(errorMsg);
      }
    } else {
      // No dependencies - regular delete
      this.deleting.set(true);
      try {
        await this.api.callOrThrow('deleteUser', [{ id: this.userToDelete }]);
        this.notification.success('User deleted successfully');
        this.cancelDelete();
        await this.loadUsers();
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to delete user';
        this.notification.error(errorMsg);
        this.logger.error('Failed to delete SQLite user', err);
      } finally {
        this.deleting.set(false);
      }
    }
  }

  getDependencyDetails(): string {
    const validation = this.deleteValidation();
    if (!validation?.hasDependencies) return '';
    
    const type = validation.dependencyType || 'records';
    const count = validation.dependencyCount || 0;
    
    return `This user has ${count} ${type}. Deleting will remove the user and all dependent records. This action cannot be undone.`;
  }

  // ============================================================================
  // Statistics
  // ============================================================================

  async loadStats(): Promise<void> {
    this.statsLoading.set(true);

    try {
      const data = await this.api.callOrThrow<SqliteStats>('getUserStats', []);
      this.stats.set(data);
    } catch (err) {
      this.logger.error('Failed to load SQLite stats', err);
    } finally {
      this.statsLoading.set(false);
    }
  }

  // ============================================================================
  // Query
  // ============================================================================

  async executeQuery(query: string): Promise<void> {
    this.queryExecuting.set(true);
    this.queryResults.set([]);

    try {
      const data = await this.api.callOrThrow<Record<string, unknown>[]>('sqliteExecuteQuery', [query]);
      this.queryResults.set(data);
      this.notification.success(`Query executed successfully (${data.length} rows)`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Query execution failed';
      this.notification.error(errorMsg);
      this.logger.error('SQLite query execution failed', err);
    } finally {
      this.queryExecuting.set(false);
    }
  }

  // ============================================================================
  // Filters
  // ============================================================================

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
    this.applyFilters();
  }

  onStatusFilterChange(status: string): void {
    this.statusFilter.set(status);
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = [...this.users()];

    const searchQuery = this.searchQuery();
    const statusFilter = this.statusFilter();

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        user =>
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(user => user.status === statusFilter);
    }

    this.filteredUsers.set(filtered);
  }

  // ============================================================================
  // Form
  // ============================================================================

  startEdit(user: SqliteUser): void {
    this.formData.set({
      name: user.name,
      email: user.email,
      age: user.age.toString(),
      status: user.status,
    });
    this.formErrors.set({});
    this.setMode('edit');
  }

  onFormDataChange(data: Partial<SqliteUserForm>): void {
    this.formData.update(current => ({ ...current, ...data }));
    this.validateField(Object.keys(data)[0] as keyof SqliteUserForm);
  }

  validateForm(): boolean {
    const errors: Partial<Record<keyof SqliteUserForm, string>> = {};

    if (!Validators.isValidName(this.formData().name)) {
      errors.name = 'Name must be 2-256 characters';
    }

    if (!Validators.isValidEmail(this.formData().email)) {
      errors.email = 'Invalid email format';
    }

    if (!Validators.isValidAge(parseInt(this.formData().age, 10))) {
      errors.age = 'Age must be 0-150';
    }

    if (!Validators.isValidUserStatus(this.formData().status)) {
      errors.status = 'Invalid status';
    }

    this.formErrors.set(errors);
    return Object.keys(errors).length === 0;
  }

  validateField(field: keyof SqliteUserForm): void {
    const errors = { ...this.formErrors() };

    switch (field) {
      case 'name':
        if (!Validators.isValidName(this.formData().name)) {
          errors.name = 'Name must be 2-256 characters';
        } else {
          delete errors.name;
        }
        break;
      case 'email':
        if (!Validators.isValidEmail(this.formData().email)) {
          errors.email = 'Invalid email format';
        } else {
          delete errors.email;
        }
        break;
      case 'age':
        const age = parseInt(this.formData().age, 10);
        if (!Validators.isValidAge(age)) {
          errors.age = 'Age must be 0-150';
        } else {
          delete errors.age;
        }
        break;
      case 'status':
        if (!Validators.isValidUserStatus(this.formData().status)) {
          errors.status = 'Invalid status';
        } else {
          delete errors.status;
        }
        break;
    }

    this.formErrors.set(errors);
  }

  resetForm(): void {
    this.formData.set({
      name: '',
      email: '',
      age: '',
      status: 'active',
    });
    this.formErrors.set({});
  }

  // ============================================================================
  // Navigation
  // ============================================================================

  setMode(newMode: DemoMode): void {
    this.mode.set(newMode);
    if (newMode === 'create' || newMode === 'edit') {
      this.resetForm();
    }
  }
}

import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoggerService } from '../../core/logger.service';
import { ApiService } from '../../core/api.service';

export interface User {
  id: number;
  name: string;
  email: string;
  age: number;
  created_at: string;
}

export interface UserStats {
  total_users: number;
  today_count: number;
  unique_domains: number;
}

@Component({
  selector: 'app-duckdb-crud',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="duckdb-wrapper">
      <div class="duckdb-container">
        <!-- Header -->
        <div class="duckdb-header">
          <div class="header-logo">
            <span class="logo-icon">🦆</span>
          </div>
          <h1 class="header-title">DuckDB CRUD Demo</h1>
          <p class="header-subtitle">Analytical database with query builder</p>
        </div>

        <!-- Stats Bar -->
        <div class="stats-bar">
          <div class="stat-item">
            <span class="stat-value">{{ stats().total_users }}</span>
            <span class="stat-label">Total Users</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ stats().today_count }}</span>
            <span class="stat-label">Added Today</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ stats().unique_domains }}</span>
            <span class="stat-label">Email Domains</span>
          </div>
        </div>

        <!-- Tabs -->
        <div class="tabs">
          <button type="button" class="tab" [class.active]="activeTab() === 'list'" (click)="setActiveTab('list')">
            <span class="tab-label">📋 User List</span>
          </button>
          <button type="button" class="tab" [class.active]="activeTab() === 'create'" (click)="setActiveTab('create')">
            <span class="tab-label">➕ Add User</span>
          </button>
          <button type="button" class="tab" [class.active]="activeTab() === 'query'" (click)="setActiveTab('query')">
            <span class="tab-label">🔍 Query Builder</span>
          </button>
        </div>

        <!-- List Tab -->
        @if (activeTab() === 'list') {
          <div class="tab-content">
            <div class="toolbar">
              <input type="text" class="search-input" placeholder="Search users..." [(ngModel)]="searchQuery"
                (input)="filterUsers()" />
              <button class="btn-refresh" (click)="loadUsers()">🔄 Refresh</button>
            </div>

            @if (isLoading()) {
              <div class="loading-state">
                <span class="loading-spinner">⏳</span>
                <span>Loading users...</span>
              </div>
            } @else if (filteredUsers().length === 0) {
              <div class="empty-state">
                <span class="empty-icon">📭</span>
                <p>No users found</p>
              </div>
            } @else {
              <div class="user-table">
                <div class="table-header">
                  <div class="col">Name</div>
                  <div class="col">Email</div>
                  <div class="col">Age</div>
                  <div class="col">Created</div>
                  <div class="col">Actions</div>
                </div>
                @for (user of filteredUsers(); track user.id) {
                  <div class="table-row">
                    <div class="col user-name">
                      <span class="avatar">{{ getInitials(user.name) }}</span>
                      {{ user.name }}
                    </div>
                    <div class="col">{{ user.email }}</div>
                    <div class="col">{{ user.age }}</div>
                    <div class="col">{{ formatDate(user.created_at) }}</div>
                    <div class="col actions">
                      <button class="btn-action btn-edit" (click)="editUser(user)" title="Edit">✏️</button>
                      <button class="btn-action btn-delete" (click)="deleteUser(user)" title="Delete">🗑️</button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        }

        <!-- Create Tab -->
        @if (activeTab() === 'create') {
          <div class="tab-content">
            <form class="user-form" (ngSubmit)="createUser()">
              <div class="form-group">
                <label class="form-label">
                  <span class="label-icon">👤</span>
                  Name
                </label>
                <input type="text" class="form-input" 
                  [ngModel]="newUser().name" 
                  (ngModelChange)="updateNewUser('name', $event)" 
                  name="name" 
                  required 
                  placeholder="Enter full name" />
              </div>
              <div class="form-group">
                <label class="form-label">
                  <span class="label-icon">📧</span>
                  Email
                </label>
                <input type="email" class="form-input" 
                  [ngModel]="newUser().email" 
                  (ngModelChange)="updateNewUser('email', $event)" 
                  name="email" 
                  required 
                  placeholder="email@example.com" />
              </div>
              <div class="form-group">
                <label class="form-label">
                  <span class="label-icon">🎂</span>
                  Age
                </label>
                <input type="number" class="form-input" 
                  [ngModel]="newUser().age" 
                  (ngModelChange)="updateNewUser('age', $event)" 
                  name="age" 
                  required 
                  min="1" 
                  max="150" 
                  placeholder="25" />
              </div>
              <div class="form-actions">
                <button type="submit" class="btn-submit" [disabled]="isLoading()">
                  {{ isLoading() ? 'Creating...' : '➕ Create User' }}
                </button>
              </div>
            </form>
          </div>
        }

        <!-- Query Builder Tab -->
        @if (activeTab() === 'query') {
          <div class="tab-content">
            <div class="query-builder">
              <div class="query-section">
                <label class="query-label">SELECT</label>
                <input type="text" class="query-input" [(ngModel)]="queryFields" placeholder="* or column names" />
              </div>
              <div class="query-section">
                <label class="query-label">WHERE</label>
                <input type="text" class="query-input" [(ngModel)]="queryWhere" placeholder="age > 25" />
              </div>
              <div class="query-section">
                <label class="query-label">ORDER BY</label>
                <input type="text" class="query-input" [(ngModel)]="queryOrder" placeholder="created_at DESC" />
              </div>
              <div class="query-section">
                <label class="query-label">LIMIT</label>
                <input type="number" class="query-input" [(ngModel)]="queryLimit" placeholder="10" min="1" max="1000" />
              </div>
              <div class="query-actions">
                <button class="btn-query" (click)="executeQuery()">▶ Execute Query</button>
              </div>
            </div>

            @if (queryResult()) {
              <div class="query-result">
                <h3 class="result-title">Query Result</h3>
                <pre class="result-json">{{ queryResult() | json }}</pre>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .duckdb-wrapper { display: flex; justify-content: center; align-items: center; min-height: 100vh; padding: 20px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); }
    .duckdb-container { background: rgba(255,255,255,0.98); border-radius: 20px; padding: 40px; width: 100%; max-width: 900px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
    .duckdb-header { text-align: center; margin-bottom: 30px; }
    .header-logo { display: inline-flex; width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #00b4d8, #0077b6); justify-content: center; align-items: center; margin-bottom: 15px; box-shadow: 0 4px 15px rgba(0,180,216,0.4); }
    .logo-icon { font-size: 40px; }
    .header-title { font-size: 32px; margin: 0 0 10px; color: #1a1a2e; font-weight: 700; }
    .header-subtitle { font-size: 15px; color: #666; margin: 0; }
    .stats-bar { display: flex; gap: 20px; justify-content: space-around; margin-bottom: 30px; padding: 25px; background: linear-gradient(135deg, #f8f9fa, #e9ecef); border-radius: 15px; }
    .stat-item { text-align: center; }
    .stat-value { display: block; font-size: 28px; font-weight: bold; color: #00b4d8; }
    .stat-label { display: block; font-size: 13px; color: #666; margin-top: 5px; text-transform: uppercase; letter-spacing: 0.5px; }
    .tabs { display: flex; gap: 10px; margin-bottom: 25px; }
    .tab { flex: 1; padding: 14px; border: 2px solid #e0e0e0; border-radius: 12px; background: white; cursor: pointer; transition: all 0.2s; font-size: 14px; font-weight: 600; color: #333; }
    .tab.active { border-color: #00b4d8; background: linear-gradient(135deg, #e0f7ff, #e8f5e9); color: #0077b6; }
    .tab:hover:not(.active) { border-color: #00b4d8; background: #f8f9fa; }
    .tab-content { min-height: 300px; }
    .toolbar { display: flex; gap: 10px; margin-bottom: 20px; }
    .search-input { flex: 1; padding: 12px 16px; border: 2px solid #e0e0e0; border-radius: 10px; font-size: 14px; transition: border-color 0.2s; }
    .search-input:focus { outline: none; border-color: #00b4d8; }
    .btn-refresh { padding: 12px 20px; background: #f0f0f0; border: none; border-radius: 10px; cursor: pointer; font-weight: 600; transition: all 0.2s; }
    .btn-refresh:hover { background: #e0e0e0; }
    .loading-state { text-align: center; padding: 60px 20px; color: #666; }
    .loading-spinner { font-size: 32px; display: block; margin-bottom: 10px; animation: spin 1s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
    .empty-state { text-align: center; padding: 60px 20px; color: #999; }
    .empty-icon { font-size: 48px; display: block; margin-bottom: 15px; }
    .user-table { display: flex; flex-direction: column; gap: 10px; }
    .table-header, .table-row { display: grid; grid-template-columns: 2fr 2fr 1fr 1.5fr 1fr; gap: 15px; padding: 15px; align-items: center; }
    .table-header { background: linear-gradient(135deg, #f8f9fa, #e9ecef); border-radius: 12px; font-weight: 600; font-size: 13px; color: #333; text-transform: uppercase; letter-spacing: 0.5px; }
    .table-row { background: white; border: 1px solid #e0e0e0; border-radius: 12px; transition: all 0.2s; }
    .table-row:hover { border-color: #00b4d8; box-shadow: 0 2px 10px rgba(0,180,216,0.1); }
    .col { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .user-name { display: flex; align-items: center; gap: 10px; }
    .avatar { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #00b4d8, #0077b6); color: white; font-weight: 600; font-size: 12px; flex-shrink: 0; }
    .actions { display: flex; gap: 8px; }
    .btn-action { padding: 8px 12px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; transition: all 0.2s; }
    .btn-edit { background: #e3f2fd; }
    .btn-edit:hover { background: #bbdefb; }
    .btn-delete { background: #ffebee; }
    .btn-delete:hover { background: #ffcdd2; }
    .user-form { display: flex; flex-direction: column; gap: 25px; max-width: 500px; margin: 0 auto; }
    .form-group { display: flex; flex-direction: column; gap: 8px; }
    .form-label { display: flex; align-items: center; gap: 8px; font-weight: 600; color: #333; font-size: 14px; }
    .label-icon { font-size: 16px; }
    .form-input { padding: 14px 16px; border: 2px solid #e0e0e0; border-radius: 10px; font-size: 15px; transition: all 0.2s; }
    .form-input:focus { outline: none; border-color: #00b4d8; box-shadow: 0 0 0 3px rgba(0,180,216,0.1); }
    .form-actions { display: flex; justify-content: center; padding-top: 10px; }
    .btn-submit { padding: 16px 40px; background: linear-gradient(135deg, #00b4d8, #0077b6); color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.2s; min-width: 200px; }
    .btn-submit:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,180,216,0.4); }
    .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; }
    .query-builder { display: flex; flex-direction: column; gap: 20px; max-width: 600px; margin: 0 auto; }
    .query-section { display: flex; flex-direction: column; gap: 8px; }
    .query-label { font-weight: 600; color: #333; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
    .query-input { padding: 12px 16px; border: 2px solid #e0e0e0; border-radius: 10px; font-size: 14px; font-family: monospace; }
    .query-input:focus { outline: none; border-color: #00b4d8; }
    .query-actions { display: flex; justify-content: center; padding-top: 10px; }
    .btn-query { padding: 14px 30px; background: linear-gradient(135deg, #00b4d8, #0077b6); color: white; border: none; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .btn-query:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,180,216,0.4); }
    .query-result { margin-top: 30px; padding: 20px; background: #1a1a2e; border-radius: 12px; }
    .result-title { color: #00b4d8; font-size: 16px; margin: 0 0 15px; font-weight: 600; }
    .result-json { color: #98c379; font-family: monospace; font-size: 13px; white-space: pre-wrap; word-break: break-all; margin: 0; max-height: 300px; overflow-y: auto; }
  `]
})
export class DuckdbDemoComponent implements OnInit {
  private readonly logger = inject(LoggerService);
  private readonly api = inject(ApiService);

  activeTab = signal<'list' | 'create' | 'query'>('list');
  isLoading = signal(false);
  stats = signal<UserStats>({ total_users: 0, today_count: 0, unique_domains: 0 });
  users = signal<User[]>([]);
  filteredUsers = signal<User[]>([]);
  searchQuery = '';
  queryResult = signal<unknown>(null);

  newUser = signal<Partial<User>>({ name: '', email: '', age: 25 });

  // Query builder state - using signals directly without getters/setters
  queryFields = signal('*');
  queryWhere = signal('');
  queryOrder = signal('');
  queryLimit = signal(10);

  get newUserForm() { return this.newUser(); }

  updateNewUser(field: keyof User, value: string | number) {
    this.newUser.update(u => ({ ...u, [field]: value }));
  }

  setActiveTab(tab: 'list' | 'create' | 'query'): void {
    this.activeTab.set(tab);
    if (tab === 'list') {
      this.loadUsers();
    }
  }

  filterUsers(): void {
    const query = this.searchQuery.toLowerCase();
    this.filteredUsers.set(
      this.users().filter(u =>
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query)
      )
    );
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString();
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  async loadUsers(): Promise<void> {
    this.isLoading.set(true);
    try {
      const [users, stats] = await Promise.all([
        this.api.callOrThrow<User[]>('getUsers'),
        this.api.callOrThrow<UserStats>('getUserStats'),
      ]);
      this.users.set(users);
      this.stats.set(stats);
      this.filterUsers();
    } catch (error) {
      this.logger.error('Failed to load users', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async createUser(): Promise<void> {
    if (!this.newUser().name || !this.newUser().email || !this.newUser().age) {
      this.logger.warn('Create user validation failed');
      return;
    }

    this.isLoading.set(true);
    try {
      await this.api.callOrThrow('createUser', [this.newUser()]);
      this.logger.info('User created successfully');
      this.newUser.set({ name: '', email: '', age: 25 });
      this.setActiveTab('list');
    } catch (error) {
      this.logger.error('Failed to create user', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async editUser(user: User): Promise<void> {
    this.newUser.set({ ...user });
    this.setActiveTab('create');
  }

  async deleteUser(user: User): Promise<void> {
    if (!confirm(`Delete ${user.name}?`)) {
      return;
    }

    this.isLoading.set(true);
    try {
      await this.api.callOrThrow('deleteUser', [user.id]);
      this.logger.info('User deleted');
      await this.loadUsers();
    } catch (error) {
      this.logger.error('Failed to delete user', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async executeQuery(): Promise<void> {
    this.isLoading.set(true);
    try {
      // Build SQL query from builder inputs
      let sql = `SELECT ${this.queryFields()}`;
      sql += ' FROM users';

      if (this.queryWhere()) {
        sql += ` WHERE ${this.queryWhere()}`;
      }

      if (this.queryOrder()) {
        sql += ` ORDER BY ${this.queryOrder()}`;
      }

      if (this.queryLimit()) {
        sql += ` LIMIT ${this.queryLimit()}`;
      }

      this.logger.info('Executing query:', sql);
      
      // For demo, just show the constructed query
      this.queryResult.set({
        sql,
        message: 'Query executed - results would appear here',
      });
    } catch (error) {
      this.logger.error('Query execution failed', error);
      this.queryResult.set({ error: String(error) });
    } finally {
      this.isLoading.set(false);
    }
  }

  ngOnInit(): void {
    this.loadUsers();
  }
}

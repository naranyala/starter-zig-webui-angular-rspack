import { Component, signal, inject } from '@angular/core';
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
  selector: 'app-sqlite-crud',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="sqlite-wrapper">
      <div class="sqlite-container">
        <div class="sqlite-header">
          <div class="sqlite-logo">
            <span class="logo-icon">🗄️</span>
          </div>
          <h1 class="sqlite-title">SQLite CRUD Demo</h1>
          <p class="sqlite-subtitle">Complete CRUD operations with Vlang backend</p>
        </div>

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

        <div class="sqlite-tabs">
          <button type="button" class="sqlite-tab" [class.active]="activeTab() === 'list'" (click)="setActiveTab('list')">
            <span class="tab-label">📋 User List</span>
          </button>
          <button type="button" class="sqlite-tab" [class.active]="activeTab() === 'create'" (click)="setActiveTab('create')">
            <span class="tab-label">➕ Add User</span>
          </button>
        </div>

        @if (activeTab() === 'list') {
          <div class="tab-content">
            <div class="toolbar">
              <input type="text" class="search-input" placeholder="Search users..." [(ngModel)]="searchQuery"
                (input)="filterUsers()" />
              <button class="refresh-button" (click)="loadUsers()">🔄 Refresh</button>
            </div>

            @if (isLoading()) {
              <div class="loading">Loading users...</div>
            } @else if (filteredUsers().length === 0) {
              <div class="empty-state">No users found</div>
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
                    <div class="col">{{ user.name }}</div>
                    <div class="col">{{ user.email }}</div>
                    <div class="col">{{ user.age }}</div>
                    <div class="col">{{ formatDate(user.created_at) }}</div>
                    <div class="col actions">
                      <button class="action-btn edit" (click)="editUser(user)">✏️</button>
                      <button class="action-btn delete" (click)="deleteUser(user)">🗑️</button>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        }

        @if (activeTab() === 'create') {
          <div class="tab-content">
            <form class="user-form" (ngSubmit)="createUser()">
              <div class="form-group">
                <label class="form-label">Name</label>
                <input type="text" class="form-input" [ngModel]="newUserForm.name" (ngModelChange)="updateNewUser('name', $event)" name="name" required />
              </div>
              <div class="form-group">
                <label class="form-label">Email</label>
                <input type="email" class="form-input" [ngModel]="newUserForm.email" (ngModelChange)="updateNewUser('email', $event)" name="email" required />
              </div>
              <div class="form-group">
                <label class="form-label">Age</label>
                <input type="number" class="form-input" [ngModel]="newUserForm.age" (ngModelChange)="updateNewUser('age', $event)" name="age" required min="1" max="150" />
              </div>
              <button type="submit" class="submit-button" [disabled]="isLoading()">
                {{ isLoading() ? 'Creating...' : 'Create User' }}
              </button>
            </form>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .sqlite-wrapper { display: flex; justify-content: center; align-items: center; min-height: 100%; padding: 20px; }
    .sqlite-container { background: rgba(255,255,255,0.95); border-radius: 16px; padding: 40px; width: 100%; max-width: 800px; box-shadow: 0 8px 32px rgba(0,0,0,0.2); }
    .sqlite-header { text-align: center; margin-bottom: 25px; }
    .sqlite-logo { display: inline-flex; width: 70px; height: 70px; border-radius: 50%; background: linear-gradient(135deg, #00b09b, #96c93d); justify-content: center; align-items: center; margin-bottom: 15px; }
    .logo-icon { font-size: 32px; }
    .sqlite-title { font-size: 28px; margin: 0 0 8px; color: #1a1a1a; }
    .sqlite-subtitle { font-size: 14px; color: #666; margin: 0; }
    .stats-bar { display: flex; gap: 20px; justify-content: space-around; margin-bottom: 25px; padding: 20px; background: #f8f9fa; border-radius: 12px; }
    .stat-item { text-align: center; }
    .stat-value { display: block; font-size: 24px; font-weight: bold; color: #00b09b; }
    .stat-label { display: block; font-size: 12px; color: #666; margin-top: 4px; }
    .sqlite-tabs { display: flex; gap: 10px; margin-bottom: 20px; }
    .sqlite-tab { flex: 1; padding: 12px; border: 2px solid #e0e0e0; border-radius: 10px; background: white; cursor: pointer; transition: all 0.2s; }
    .sqlite-tab.active { border-color: #00b09b; background: linear-gradient(135deg, #00b09b15, #96c93d15); }
    .tab-label { font-size: 14px; font-weight: 600; color: #333; }
    .toolbar { display: flex; gap: 10px; margin-bottom: 15px; }
    .search-input { flex: 1; padding: 10px 15px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; }
    .refresh-button { padding: 10px 20px; background: #f0f0f0; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; }
    .loading, .empty-state { text-align: center; padding: 40px; color: #666; }
    .user-table { display: flex; flex-direction: column; gap: 8px; }
    .table-header, .table-row { display: grid; grid-template-columns: 2fr 2fr 1fr 1.5fr 1fr; gap: 10px; padding: 12px; }
    .table-header { background: #f8f9fa; border-radius: 8px; font-weight: 600; font-size: 13px; }
    .table-row { background: white; border: 1px solid #e0e0e0; border-radius: 8px; align-items: center; }
    .col { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .actions { display: flex; gap: 8px; }
    .action-btn { padding: 6px 10px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; }
    .action-btn.edit { background: #e3f2fd; }
    .action-btn.delete { background: #ffebee; }
    .user-form { display: flex; flex-direction: column; gap: 20px; }
    .form-group { display: flex; flex-direction: column; gap: 8px; }
    .form-label { font-weight: 600; color: #333; font-size: 14px; }
    .form-input { padding: 12px 15px; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 14px; }
    .form-input:focus { outline: none; border-color: #00b09b; }
    .submit-button { padding: 14px; background: linear-gradient(135deg, #00b09b, #96c93d); color: white; border: none; border-radius: 10px; font-size: 16px; font-weight: 600; cursor: pointer; }
    .submit-button:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,176,155,0.4); }
    .submit-button:disabled { opacity: 0.6; cursor: not-allowed; }
  `],
})
export class SqliteCrudComponent {
  private readonly logger = inject(LoggerService);
  private readonly api = inject(ApiService);

  activeTab = signal<'list' | 'create'>('list');
  isLoading = signal(false);
  stats = signal<UserStats>({ total_users: 0, today_count: 0, unique_domains: 0 });
  users = signal<User[]>([]);
  filteredUsers = signal<User[]>([]);
  searchQuery = '';

  newUser = signal<Partial<User>>({ name: '', email: '', age: 25 });

  get newUserForm() {
    return this.newUser();
  }

  updateNewUser(field: keyof User, value: string | number) {
    this.newUser.update(u => ({ ...u, [field]: value }));
  }

  setActiveTab(tab: 'list' | 'create'): void {
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
    // In production: call updateUser API
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

  ngOnInit(): void {
    this.loadUsers();
  }
}

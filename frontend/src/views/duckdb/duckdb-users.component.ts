/**
 * DuckDB Users Table Component
 */

import { Component, signal, inject, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoggerService } from '../../core/logger.service';
import { ApiService } from '../../core/api.service';

export interface User {
  id: number;
  name: string;
  email: string;
  age: number;
  status: 'active' | 'inactive';
  created_at: string;
}

@Component({
  selector: 'app-duckdb-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="table-card">
      <!-- Card Header -->
      <div class="card-header">
        <div class="header-left">
          <h2 class="card-title">
            <span class="title-icon">👥</span>
            Users Management
          </h2>
          <span class="record-count">{{ users().length }} records</span>
        </div>
        <div class="header-actions">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input
              type="text"
              class="search-input"
              placeholder="Search users..."
              [(ngModel)]="searchQuery"
              (input)="filterUsers()"
            />
          </div>
          <button class="btn btn-primary" (click)="showCreateModal()">
            <span class="btn-icon">+</span> Add User
          </button>
        </div>
      </div>

      <!-- Table -->
      <div class="table-container">
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
            @if (isLoading()) {
              <tr class="loading-row">
                <td colspan="7">
                  <div class="loading-spinner">
                    <span class="spinner">⏳</span>
                    <span>Loading users...</span>
                  </div>
                </td>
              </tr>
            } @else if (filteredUsers().length === 0) {
              <tr class="empty-row">
                <td colspan="7">
                  <div class="empty-state">
                    <span class="empty-icon">📭</span>
                    <p>No users found</p>
                  </div>
                </td>
              </tr>
            } @else {
              @for (user of filteredUsers(); track user.id) {
                <tr class="data-row">
                  <td class="cell-id">{{ user.id }}</td>
                  <td>
                    <div class="user-cell">
                      <div class="avatar">{{ getInitials(user.name) }}</div>
                      <span class="user-name">{{ user.name }}</span>
                    </div>
                  </td>
                  <td class="cell-email">{{ user.email }}</td>
                  <td class="cell-age">{{ user.age }}</td>
                  <td>
                    <span class="status-badge" [class.status-active]="user.status === 'active'" [class.status-inactive]="user.status === 'inactive'">
                      {{ user.status }}
                    </span>
                  </td>
                  <td class="cell-date">{{ formatDate(user.created_at) }}</td>
                  <td>
                    <div class="action-buttons">
                      <button class="btn-icon-edit" (click)="editUser(user)" title="Edit">✏️</button>
                      <button class="btn-icon-delete" (click)="deleteUser(user)" title="Delete">🗑️</button>
                    </div>
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>

      <!-- Create/Edit Modal -->
      @if (showModal()) {
        <div class="modal-overlay" (click)="closeModal()">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>{{ editingUser() ? 'Edit User' : 'Create New User' }}</h3>
              <button class="modal-close" (click)="closeModal()">×</button>
            </div>
            <form class="modal-form" (ngSubmit)="saveUser()">
              <div class="form-group">
                <label class="form-label">Name</label>
                <input
                  type="text"
                  class="form-input"
                  [ngModel]="formData().name"
                  (ngModelChange)="updateFormData('name', $event)"
                  name="name"
                  required
                  placeholder="Enter full name"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Email</label>
                <input
                  type="email"
                  class="form-input"
                  [ngModel]="formData().email"
                  (ngModelChange)="updateFormData('email', $event)"
                  name="email"
                  required
                  placeholder="email@example.com"
                />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Age</label>
                  <input
                    type="number"
                    class="form-input"
                    [ngModel]="formData().age"
                    (ngModelChange)="updateFormData('age', $event)"
                    name="age"
                    required
                    min="1"
                    max="150"
                  />
                </div>
                <div class="form-group">
                  <label class="form-label">Status</label>
                  <select
                    class="form-input"
                    [ngModel]="formData().status"
                    (ngModelChange)="updateFormData('status', $event)"
                    name="status"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary" [disabled]="isLoading()">
                  {{ isLoading() ? 'Saving...' : (editingUser() ? 'Update' : 'Create') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .table-card {
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid rgba(148, 163, 184, 0.1);
      border-radius: 16px;
      padding: 24px;
      backdrop-filter: blur(10px);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .card-title {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: #fff;
    }

    .title-icon {
      font-size: 24px;
    }

    .record-count {
      font-size: 13px;
      color: #64748b;
      background: rgba(148, 163, 184, 0.1);
      padding: 4px 12px;
      border-radius: 20px;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .search-box {
      position: relative;
    }

    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 14px;
      color: #64748b;
    }

    .search-input {
      padding: 10px 16px 10px 40px;
      background: rgba(15, 23, 42, 0.5);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 10px;
      color: #fff;
      font-size: 14px;
      width: 280px;
      transition: all 0.2s;
    }

    .search-input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 20px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }

    .btn-icon {
      font-size: 16px;
    }

    .btn-primary {
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      color: #fff;
      box-shadow: 0 4px 15px rgba(6, 182, 212, 0.3);
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(6, 182, 212, 0.4);
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .table-container {
      overflow-x: auto;
      border-radius: 12px;
      border: 1px solid rgba(148, 163, 184, 0.1);
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }

    .data-table thead {
      background: rgba(15, 23, 42, 0.5);
    }

    .data-table th {
      padding: 14px 16px;
      text-align: left;
      font-size: 12px;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.1);
    }

    .data-table tbody tr {
      border-bottom: 1px solid rgba(148, 163, 184, 0.05);
      transition: all 0.2s;
    }

    .data-table tbody tr:hover {
      background: rgba(59, 130, 246, 0.05);
    }

    .data-table td {
      padding: 14px 16px;
      color: #e2e8f0;
    }

    .cell-id {
      font-family: monospace;
      color: #64748b;
      font-size: 13px;
    }

    .cell-email {
      color: #94a3b8;
    }

    .cell-age {
      text-align: center;
    }

    .cell-date {
      color: #64748b;
      font-size: 13px;
    }

    .user-cell {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 13px;
      flex-shrink: 0;
    }

    .user-name {
      font-weight: 500;
      color: #fff;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      text-transform: capitalize;
    }

    .status-active {
      background: rgba(16, 185, 129, 0.2);
      color: #10b981;
    }

    .status-inactive {
      background: rgba(148, 163, 184, 0.2);
      color: #94a3b8;
    }

    .action-buttons {
      display: flex;
      gap: 8px;
    }

    .btn-icon-edit,
    .btn-icon-delete {
      padding: 6px 10px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    }

    .btn-icon-edit {
      background: rgba(59, 130, 246, 0.2);
    }

    .btn-icon-edit:hover {
      background: rgba(59, 130, 246, 0.3);
    }

    .btn-icon-delete {
      background: rgba(239, 68, 68, 0.2);
    }

    .btn-icon-delete:hover {
      background: rgba(239, 68, 68, 0.3);
    }

    .loading-row,
    .empty-row {
      text-align: center;
    }

    .loading-spinner {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 40px;
      color: #64748b;
    }

    .spinner {
      font-size: 32px;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 60px 20px;
      color: #64748b;
    }

    .empty-icon {
      font-size: 48px;
      opacity: 0.5;
    }

    .empty-state p {
      margin: 0;
      font-size: 14px;
    }

    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      backdrop-filter: blur(4px);
      padding: 20px;
    }

    .modal-content {
      background: #1e293b;
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 16px;
      width: 100%;
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.1);
    }

    .modal-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #fff;
    }

    .modal-close {
      background: transparent;
      border: none;
      color: #64748b;
      font-size: 28px;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: all 0.2s;
    }

    .modal-close:hover {
      background: rgba(148, 163, 184, 0.1);
      color: #fff;
    }

    .modal-form {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .form-label {
      font-size: 13px;
      font-weight: 500;
      color: #94a3b8;
    }

    .form-input {
      padding: 12px 16px;
      background: rgba(15, 23, 42, 0.5);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 10px;
      color: #fff;
      font-size: 14px;
      transition: all 0.2s;
    }

    .form-input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .modal-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding-top: 8px;
    }
  `]
})
export class DuckdbUsersComponent implements OnInit {
  private readonly logger = inject(LoggerService);
  private readonly api = inject(ApiService);

  @Output() statsChange = new EventEmitter<{ type: string; count: number }>();

  isLoading = signal(false);
  users = signal<User[]>([]);
  filteredUsers = signal<User[]>([]);
  searchQuery = '';
  showModal = signal(false);
  editingUser = signal<User | null>(null);
  formData = signal<Partial<User>>({ name: '', email: '', age: 25, status: 'active' });

  ngOnInit(): void {
    this.loadUsers();
  }

  async loadUsers(): Promise<void> {
    this.isLoading.set(true);
    try {
      const users = await this.api.callOrThrow<User[]>('getUsers');
      this.users.set(users);
      this.filterUsers();
      this.statsChange.emit({ type: 'totalUsers', count: users.length });
    } catch (error) {
      this.logger.error('Failed to load users', error);
    } finally {
      this.isLoading.set(false);
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

  showCreateModal(): void {
    this.editingUser.set(null);
    this.formData.set({ name: '', email: '', age: 25, status: 'active' });
    this.showModal.set(true);
  }

  editUser(user: User): void {
    this.editingUser.set(user);
    this.formData.set({ ...user });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingUser.set(null);
  }

  updateFormData(field: keyof User, value: any): void {
    this.formData.update(d => ({ ...d, [field]: value }));
  }

  async saveUser(): Promise<void> {
    this.isLoading.set(true);
    try {
      if (this.editingUser()) {
        await this.api.callOrThrow('updateUser', [this.editingUser()!.id, this.formData()]);
        this.logger.info('User updated successfully');
      } else {
        await this.api.callOrThrow('createUser', [this.formData()]);
        this.logger.info('User created successfully');
      }
      await this.loadUsers();
      this.closeModal();
    } catch (error) {
      this.logger.error('Failed to save user', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async deleteUser(user: User): Promise<void> {
    if (!confirm(`Delete ${user.name}?`)) return;

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
}

/**
 * SQLite User List Component
 * 
 * Displays users in a professional data table with filtering and actions
 */

import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmptyStateComponent } from '../../shared/components/common/empty-state.component';
import { Formatters } from '../../utils/format.utils';
import type { SqliteUser } from './sqlite-demo.component';

@Component({
  selector: 'app-sqlite-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule, EmptyStateComponent],
  template: `
    <div class="user-list-panel">
      <!-- Toolbar -->
      <div class="toolbar">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by name or email..."
            [ngModel]="searchQuery()"
            (ngModelChange)="searchChange.emit($event)"
            class="search-input" />
        </div>

        <div class="filter-box">
          <select
            [ngModel]="statusFilter()"
            (ngModelChange)="statusFilterChange.emit($event)"
            class="filter-select">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      <!-- Results Info -->
      <div class="results-info">
        <span>Showing {{ filteredUsers().length }} of {{ users().length }} users</span>
      </div>

      <!-- Table -->
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th class="col-id">ID</th>
              <th class="col-name">Name</th>
              <th class="col-email">Email</th>
              <th class="col-age">Age</th>
              <th class="col-status">Status</th>
              <th class="col-created">Created</th>
              <th class="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            @for (user of filteredUsers(); track user.id) {
              <tr class="user-row">
                <td class="cell-id">#{{ user.id }}</td>
                <td class="cell-name">
                  <div class="name-content">
                    <span class="name-text">{{ user.name }}</span>
                  </div>
                </td>
                <td class="cell-email">{{ user.email }}</td>
                <td class="cell-age">{{ user.age }}</td>
                <td class="cell-status">
                  <span class="status-badge" [class]="'status-' + user.status">
                    {{ Formatters.formatStatus(user.status) }}
                  </span>
                </td>
                <td class="cell-created">
                  {{ Formatters.formatDate(user.created_at, { format: 'medium' }) }}
                </td>
                <td class="cell-actions">
                  <button
                    class="action-btn action-edit"
                    (click)="edit.emit(user)"
                    title="Edit">
                    ✏️
                  </button>
                  <button
                    class="action-btn action-delete"
                    (click)="delete.emit(user.id)"
                    title="Delete">
                    🗑️
                  </button>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7" class="empty-state">
                  <app-empty-state
                    icon="📭"
                    title="No Users Found"
                    message="No users match your search criteria">
                  </app-empty-state>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .user-list-panel {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .toolbar {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .search-box {
      flex: 1;
      position: relative;
    }

    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 14px;
    }

    .search-input {
      width: 100%;
      padding: 10px 12px 10px 36px;
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 8px;
      background: rgba(15, 23, 42, 0.8);
      color: #fff;
      font-size: 14px;
    }

    .search-input:focus {
      outline: none;
      border-color: #10b981;
    }

    .filter-box {
      min-width: 180px;
    }

    .filter-select {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 8px;
      background: rgba(15, 23, 42, 0.8);
      color: #fff;
      font-size: 14px;
      cursor: pointer;
    }

    .filter-select:focus {
      outline: none;
      border-color: #10b981;
    }

    .results-info {
      font-size: 13px;
      color: #94a3b8;
      padding: 8px 0;
    }

    .table-wrapper {
      overflow-x: auto;
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 12px;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }

    .data-table th {
      padding: 14px 16px;
      text-align: left;
      font-weight: 600;
      color: #94a3b8;
      background: rgba(16, 185, 129, 0.1);
      border-bottom: 2px solid rgba(16, 185, 129, 0.3);
      white-space: nowrap;
    }

    .data-table td {
      padding: 14px 16px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.1);
      color: #e2e8f0;
    }

    .data-table tr:hover {
      background: rgba(16, 185, 129, 0.05);
    }

    .col-id { width: 80px; }
    .col-name { min-width: 200px; }
    .col-email { min-width: 250px; }
    .col-age { width: 80px; }
    .col-status { width: 120px; }
    .col-created { width: 140px; }
    .col-actions { width: 120px; }

    .cell-id {
      font-family: 'Fira Code', monospace;
      color: #94a3b8;
    }

    .cell-name {
      font-weight: 500;
      color: #fff;
    }

    .cell-email {
      color: #94a3b8;
      font-family: 'Fira Code', monospace;
      font-size: 13px;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-active {
      background: rgba(16, 185, 129, 0.2);
      color: #10b981;
    }

    .status-inactive {
      background: rgba(148, 163, 184, 0.2);
      color: #94a3b8;
    }

    .status-pending {
      background: rgba(245, 158, 11, 0.2);
      color: #f59e0b;
    }

    .status-suspended {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }

    .cell-created {
      color: #64748b;
      font-size: 13px;
    }

    .cell-actions {
      display: flex;
      gap: 8px;
    }

    .action-btn {
      padding: 6px 10px;
      border: none;
      border-radius: 6px;
      background: transparent;
      cursor: pointer;
      font-size: 16px;
      transition: all 0.2s;
    }

    .action-btn:hover {
      transform: scale(1.1);
    }

    .action-edit:hover {
      background: rgba(245, 158, 11, 0.2);
    }

    .action-delete:hover {
      background: rgba(239, 68, 68, 0.2);
    }

    .empty-state {
      padding: 48px;
      text-align: center;
    }
  `]
})
export class SqliteUserListComponent {
  readonly users = input.required<SqliteUser[]>();
  readonly filteredUsers = input.required<SqliteUser[]>();
  readonly searchQuery = input.required<string>();
  readonly statusFilter = input.required<string>();

  readonly searchChange = output<string>();
  readonly statusFilterChange = output<string>();
  readonly edit = output<SqliteUser>();
  readonly delete = output<number>();

  protected readonly Formatters = Formatters;
}

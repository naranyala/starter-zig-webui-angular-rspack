/**
 * SQLite User Form Component
 * 
 * Professional form for creating and editing users
 */

import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { SqliteUserForm } from './sqlite-demo.component';

@Component({
  selector: 'app-sqlite-user-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="user-form-panel">
      <div class="form-header">
        <h2>{{ isEdit() ? '✏️ Edit User' : '➕ Create New User' }}</h2>
        <p>{{ isEdit() ? 'Update user information' : 'Add a new user to the database' }}</p>
      </div>

      <form (ngSubmit)="submit.emit()" class="user-form">
        <div class="form-grid">
          <div class="form-group">
            <label>Name *</label>
            <input
              type="text"
              [ngModel]="formData().name"
              (ngModelChange)="onFieldChange('name', $event)"
              [class.error]="errors().name"
              placeholder="Enter full name"
              minlength="2"
              maxlength="256"
              required />
            @if (errors().name) {
              <span class="error-text">{{ errors().name }}</span>
            }
          </div>

          <div class="form-group">
            <label>Email *</label>
            <input
              type="email"
              [ngModel]="formData().email"
              (ngModelChange)="onFieldChange('email', $event)"
              [class.error]="errors().email"
              placeholder="user@example.com"
              required />
            @if (errors().email) {
              <span class="error-text">{{ errors().email }}</span>
            }
          </div>

          <div class="form-group">
            <label>Age *</label>
            <input
              type="number"
              [ngModel]="formData().age"
              (ngModelChange)="onFieldChange('age', $event)"
              [class.error]="errors().age"
              placeholder="Enter age"
              min="0"
              max="150"
              required />
            @if (errors().age) {
              <span class="error-text">{{ errors().age }}</span>
            }
          </div>

          <div class="form-group">
            <label>Status *</label>
            <select
              [ngModel]="formData().status"
              (ngModelChange)="onFieldChange('status', $event)"
              [class.error]="errors().status"
              required>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>
            @if (errors().status) {
              <span class="error-text">{{ errors().status }}</span>
            }
          </div>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary">
            {{ isEdit() ? '💾 Save Changes' : '✅ Create User' }}
          </button>
          <button type="button" class="btn btn-secondary" (click)="cancel.emit()">
            Cancel
          </button>
        </div>
      </form>

      <!-- Info Box -->
      <div class="info-box">
        <span class="info-icon">ℹ️</span>
        <div class="info-content">
          <strong>Input Requirements:</strong>
          <ul>
            <li>Name must be between 2 and 256 characters</li>
            <li>Email must be a valid email format</li>
            <li>Age must be between 0 and 150</li>
            <li>Status must be one of: active, inactive, pending, suspended</li>
          </ul>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .user-form-panel {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .form-header {
      padding-bottom: 16px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.2);
    }

    .form-header h2 {
      font-size: 20px;
      font-weight: 600;
      color: #fff;
      margin: 0 0 8px;
    }

    .form-header p {
      font-size: 14px;
      color: #94a3b8;
      margin: 0;
    }

    .user-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }

    .form-actions {
      display: flex;
      gap: 12px;
      padding-top: 16px;
      border-top: 1px solid rgba(148, 163, 184, 0.2);
    }

    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      font-size: 14px;
      transition: all 0.2s;
    }

    .btn-primary {
      background: linear-gradient(135deg, #10b981, #059669);
      color: #fff;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(16, 185, 129, 0.4);
    }

    .btn-secondary {
      background: rgba(148, 163, 184, 0.1);
      color: #94a3b8;
    }

    .btn-secondary:hover {
      background: rgba(148, 163, 184, 0.2);
      color: #fff;
    }

    .info-box {
      display: flex;
      gap: 12px;
      padding: 16px;
      background: rgba(59, 130, 246, 0.1);
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: 8px;
    }

    .info-icon {
      font-size: 20px;
      flex-shrink: 0;
    }

    .info-content {
      flex: 1;
    }

    .info-content strong {
      display: block;
      color: #60a5fa;
      margin-bottom: 8px;
    }

    .info-content ul {
      margin: 0;
      padding-left: 20px;
      font-size: 13px;
      color: #94a3b8;
      line-height: 1.8;
    }

    @media (max-width: 768px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class SqliteUserFormComponent {
  readonly formData = input.required<SqliteUserForm>();
  readonly errors = input.required<Record<string, string>>();
  readonly isEdit = input.required<boolean>();

  readonly formDataChange = output<Partial<SqliteUserForm>>();
  readonly submit = output<void>();
  readonly cancel = output<void>();

  onFieldChange(field: keyof SqliteUserForm, value: string): void {
    this.formDataChange.emit({ [field]: value });
  }
}

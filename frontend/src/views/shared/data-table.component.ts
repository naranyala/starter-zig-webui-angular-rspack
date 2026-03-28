import { Component, signal, inject, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { LoggerService } from '../../core/logger.service';

export interface DataTableColumn {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'actions' | 'status';
  width?: string;
}

export interface FormField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date';
  options?: Array<{ value: string; label: string }>;
}

export interface DataTableConfig {
  entityName: string;
  entityNamePlural: string;
  icon: string;
  columns: DataTableColumn[];
  formFields: FormField[];
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="table-card">
      <div class="card-header">
        <div class="header-left">
          <h2 class="card-title">
            <span class="title-icon">{{ config?.icon || '📋' }}</span>
            {{ config?.entityNamePlural || 'Items' }} Management
          </h2>
          <span class="record-count">{{ filteredItems.length }} records</span>
        </div>
        <div class="header-actions">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input
              type="text"
              class="search-input"
              placeholder="Search..."
              [(ngModel)]="searchQuery"
              (ngModelChange)="filterItems()"
            />
          </div>
          <button class="btn btn-primary" (click)="showCreateModal()">
            <span class="btn-icon">+</span> Add {{ config?.entityName || 'Item' }}
          </button>
        </div>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              @for (col of config?.columns || []; track col.key) {
                <th [style.width]="col.width || 'auto'">{{ col.label }}</th>
              }
            </tr>
          </thead>
          <tbody>
            @if (filteredItems.length === 0) {
              <tr>
                <td [attr.colspan]="config?.columns?.length || 1" class="empty-state">
                  No {{ config?.entityNamePlural?.toLowerCase() || 'items' }} found
                </td>
              </tr>
            } @else {
              @for (item of filteredItems; track item.id) {
                <tr>
                  @for (col of config?.columns || []; track col.key) {
                    <td>
                      @if (col.type === 'actions') {
                        <div class="action-buttons">
                          <button class="btn btn--icon btn--edit" (click)="editItem(item)">✏️</button>
                          <button class="btn btn--icon btn--delete" (click)="deleteItem(item)">🗑️</button>
                        </div>
                      } @else if (col.type === 'date') {
                        {{ formatDate(item[col.key]) }}
                      } @else if (col.type === 'status') {
                        <span class="status-badge" [class]="'status-' + item[col.key]">
                          {{ item[col.key] }}
                        </span>
                      } @else {
                        {{ item[col.key] }}
                      }
                    </td>
                  }
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
    </div>

    @if (showModal) {
      <div class="modal-backdrop" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ editingItem ? 'Edit' : 'Create New' }} {{ config?.entityName || 'Item' }}</h3>
            <button class="btn btn--icon" (click)="closeModal()">✕</button>
          </div>
          <div class="modal-body">
            <form (ngSubmit)="saveItem()" #itemForm="ngForm">
              @for (field of config?.formFields || []; track field.key) {
                <div class="form-group">
                  <label>{{ field.label }}</label>
                  @if (field.type === 'select') {
                    <select
                      [(ngModel)]="formData[field.key]"
                      [name]="field.key"
                      class="form-control"
                      required
                    >
                      @for (option of field.options || []; track option.value) {
                        <option [value]="option.value">{{ option.label }}</option>
                      }
                    </select>
                  } @else if (field.type === 'date') {
                    <input
                      type="date"
                      [(ngModel)]="formData[field.key]"
                      [name]="field.key"
                      class="form-control"
                    />
                  } @else if (field.type === 'number') {
                    <input
                      type="number"
                      [(ngModel)]="formData[field.key]"
                      [name]="field.key"
                      class="form-control"
                      required
                    />
                  } @else {
                    <input
                      type="text"
                      [(ngModel)]="formData[field.key]"
                      [name]="field.key"
                      class="form-control"
                      required
                    />
                  }
                </div>
              }
              <div class="modal-actions">
                <button type="button" class="btn btn--secondary" (click)="closeModal()">Cancel</button>
                <button type="submit" class="btn btn--primary" [disabled]="itemForm.invalid || isLoading">
                  {{ isLoading ? 'Saving...' : (editingItem ? 'Update' : 'Create') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .table-card {
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid rgba(148, 163, 184, 0.1);
      border-radius: 12px;
      overflow: hidden;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.1);
      background: rgba(15, 23, 42, 0.3);
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 1.5rem;
      font-weight: 600;
      color: #fff;
      margin: 0;
    }
    .title-icon { font-size: 2rem; }
    .record-count { font-size: 0.9rem; color: #94a3b8; }
    .header-actions { display: flex; gap: 12px; align-items: center; }
    .search-box { display: flex; align-items: center; gap: 6px; }
    .search-icon { font-size: 1rem; }
    .search-input {
      padding: 8px 12px;
      border: 1px solid rgba(148, 163, 184, 0.3);
      border-radius: 6px;
      background: rgba(30, 41, 59, 0.8);
      color: #fff;
      width: 200px;
      font-size: 0.9rem;
    }
    .search-input::placeholder { color: #94a3b8; }
    .search-input:focus {
      outline: none;
      border-color: rgba(59, 130, 246, 0.5);
    }
    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .btn-primary {
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      color: #fff;
    }
    .btn-primary:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(6, 182, 212, 0.4);
    }
    .btn--secondary {
      background: rgba(59, 130, 246, 0.2);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }
    .btn--icon {
      width: 32px;
      height: 32px;
      padding: 0;
      font-size: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      color: #94a3b8;
    }
    .btn--edit { color: #10b981; }
    .btn--delete { color: #ef4444; }
    .table-container { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; }
    .data-table th, .data-table td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid rgba(148, 163, 184, 0.1);
    }
    .data-table th {
      background: rgba(15, 23, 42, 0.2);
      font-weight: 600;
      color: #e2e8f0;
      font-size: 0.9rem;
    }
    .data-table td { color: #e2e8f0; font-size: 0.9rem; }
    .data-table tr:hover { background: rgba(59, 130, 246, 0.1); }
    .empty-state { text-align: center; padding: 32px; color: #94a3b8; }
    .action-buttons { display: flex; gap: 6px; }
    .status-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 500;
    }
    .status-active, .status-delivered { background: rgba(16, 185, 129, 0.2); color: #10b981; }
    .status-inactive, .status-cancelled { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
    .status-pending, .status-processing { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
    .status-shipped { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .modal {
      background: rgba(15, 23, 42, 0.95);
      border-radius: 12px;
      width: 90%;
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.1);
    }
    .modal-header h3 { margin: 0; font-size: 1.5rem; color: #fff; }
    .modal-body { padding: 20px; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; margin-bottom: 6px; color: #e2e8f0; font-size: 0.9rem; }
    .form-control {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid rgba(148, 163, 184, 0.3);
      border-radius: 6px;
      background: rgba(30, 41, 59, 0.8);
      color: #fff;
      font-size: 0.9rem;
    }
    .form-control:focus {
      outline: none;
      border-color: rgba(59, 130, 246, 0.5);
    }
    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 20px;
      border-top: 1px solid rgba(148, 163, 184, 0.1);
    }
  `]
})
export class DataTableComponent {
  private api = inject(ApiService);
  private logger = inject(LoggerService);

  @Input() config: DataTableConfig | null = null;
  @Input() items: any[] = [];
  @Output() itemsChange = new EventEmitter<any[]>();
  @Output() statsChange = new EventEmitter<{ type: string; count: number }>();

  filteredItems: any[] = [];
  searchQuery = '';
  showModal = false;
  editingItem: any = null;
  formData: Record<string, any> = {};
  isLoading = false;

  ngOnInit(): void {
    this.filterItems();
  }

  ngOnChanges(): void {
    this.filterItems();
  }

  filterItems(): void {
    const query = this.searchQuery.toLowerCase();
    if (!query) {
      this.filteredItems = [...this.items];
      return;
    }
    this.filteredItems = this.items.filter(item =>
      Object.values(item).some(val =>
        val !== null && val !== undefined &&
        String(val).toLowerCase().includes(query)
      )
    );
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString();
  }

  showCreateModal(): void {
    this.editingItem = null;
    this.formData = {};
    if (this.config?.formFields) {
      for (const field of this.config.formFields) {
        this.formData[field.key] = field.type === 'number' ? 0 : '';
      }
    }
    this.showModal = true;
  }

  editItem(item: any): void {
    this.editingItem = { ...item };
    this.formData = { ...item };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.editingItem = null;
  }

  async saveItem(): Promise<void> {
    if (!this.config) return;
    this.isLoading = true;
    try {
      if (this.editingItem) {
        await this.api.callOrThrow(`update${this.config.entityName}`, [
          this.editingItem.id,
          ...this.config.formFields.map(f => this.formData[f.key])
        ]);
      } else {
        await this.api.callOrThrow(`create${this.config.entityName}`,
          this.config.formFields.map(f => this.formData[f.key])
        );
      }
      this.closeModal();
      this.statsChange.emit({ type: `total${this.config.entityNamePlural}`, count: this.items.length });
    } catch (error) {
      this.logger.error(`Failed to save ${this.config.entityName}`, error);
    } finally {
      this.isLoading = false;
    }
  }

  async deleteItem(item: any): Promise<void> {
    if (!this.config) return;
    if (!confirm(`Delete ${item.name || item.customer_name || 'item'}?`)) return;
    this.isLoading = true;
    try {
      await this.api.callOrThrow(`delete${this.config.entityName}`, [item.id]);
      this.statsChange.emit({ type: `total${this.config.entityNamePlural}`, count: this.items.length - 1 });
    } catch (error) {
      this.logger.error(`Failed to delete ${this.config.entityName}`, error);
    } finally {
      this.isLoading = false;
    }
  }
}

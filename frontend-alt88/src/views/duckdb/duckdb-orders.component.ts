/**
 * DuckDB Orders Table Component
 */

import { Component, signal, inject, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoggerService } from '../../core/logger.service';
import { ApiService } from '../../core/api.service';

export interface Order {
  id: number;
  customer_name: string;
  customer_email: string;
  product_name: string;
  quantity: number;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  created_at: string;
}

@Component({
  selector: 'app-duckdb-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="table-card">
      <!-- Card Header -->
      <div class="card-header">
        <div class="header-left">
          <h2 class="card-title">
            <span class="title-icon">🛒</span>
            Orders Management
          </h2>
          <span class="record-count">{{ orders().length }} records</span>
        </div>
        <div class="header-actions">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input
              type="text"
              class="search-input"
              placeholder="Search orders..."
              [(ngModel)]="searchQuery"
              (input)="filterOrders()"
            />
          </div>
          <button class="btn btn-primary" (click)="showCreateModal()">
            <span class="btn-icon">+</span> New Order
          </button>
        </div>
      </div>

      <!-- Table -->
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Product</th>
              <th>Quantity</th>
              <th>Total</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            @if (isLoading()) {
              <tr class="loading-row">
                <td colspan="8">
                  <div class="loading-spinner">
                    <span class="spinner">⏳</span>
                    <span>Loading orders...</span>
                  </div>
                </td>
              </tr>
            } @else if (filteredOrders().length === 0) {
              <tr class="empty-row">
                <td colspan="8">
                  <div class="empty-state">
                    <span class="empty-icon">📭</span>
                    <p>No orders found</p>
                  </div>
                </td>
              </tr>
            } @else {
              @for (order of filteredOrders(); track order.id) {
                <tr class="data-row">
                  <td class="cell-id">
                    <span class="order-id">#{{ order.id }}</span>
                  </td>
                  <td>
                    <div class="customer-cell">
                      <span class="customer-name">{{ order.customer_name }}</span>
                      <span class="customer-email">{{ order.customer_email }}</span>
                    </div>
                  </td>
                  <td class="cell-product">{{ order.product_name }}</td>
                  <td class="cell-quantity">{{ order.quantity }}</td>
                  <td class="cell-total">\${{ order.total | number:'1.2-2' }}</td>
                  <td>
                    <span class="status-badge" [class]="'status-' + order.status">
                      {{ order.status }}
                    </span>
                  </td>
                  <td class="cell-date">{{ formatDate(order.created_at) }}</td>
                  <td>
                    <div class="action-buttons">
                      <button class="btn-icon-edit" (click)="editOrder(order)" title="Edit">✏️</button>
                      <button class="btn-icon-delete" (click)="deleteOrder(order)" title="Delete">🗑️</button>
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
              <h3>{{ editingOrder() ? 'Edit Order' : 'Create New Order' }}</h3>
              <button class="modal-close" (click)="closeModal()">×</button>
            </div>
            <form class="modal-form" (ngSubmit)="saveOrder()">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Customer Name</label>
                  <input
                    type="text"
                    class="form-input"
                    [ngModel]="formData().customer_name"
                    (ngModelChange)="updateFormData('customer_name', $event)"
                    name="customer_name"
                    required
                    placeholder="Enter customer name"
                  />
                </div>
                <div class="form-group">
                  <label class="form-label">Customer Email</label>
                  <input
                    type="email"
                    class="form-input"
                    [ngModel]="formData().customer_email"
                    (ngModelChange)="updateFormData('customer_email', $event)"
                    name="customer_email"
                    required
                    placeholder="customer@example.com"
                  />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Product Name</label>
                  <input
                    type="text"
                    class="form-input"
                    [ngModel]="formData().product_name"
                    (ngModelChange)="updateFormData('product_name', $event)"
                    name="product_name"
                    required
                    placeholder="Enter product name"
                  />
                </div>
                <div class="form-group">
                  <label class="form-label">Quantity</label>
                  <input
                    type="number"
                    class="form-input"
                    [ngModel]="formData().quantity"
                    (ngModelChange)="updateFormData('quantity', $event)"
                    name="quantity"
                    required
                    min="1"
                  />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Total Price</label>
                  <input
                    type="number"
                    class="form-input"
                    [ngModel]="formData().total"
                    (ngModelChange)="updateFormData('total', $event)"
                    name="total"
                    required
                    min="0"
                    step="0.01"
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
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary" [disabled]="isLoading()">
                  {{ isLoading() ? 'Saving...' : (editingOrder() ? 'Update' : 'Create') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .table-card { background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(148, 163, 184, 0.1); border-radius: 16px; padding: 24px; backdrop-filter: blur(10px); }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
    .header-left { display: flex; align-items: center; gap: 16px; }
    .card-title { display: flex; align-items: center; gap: 12px; margin: 0; font-size: 20px; font-weight: 600; color: #fff; }
    .title-icon { font-size: 24px; }
    .record-count { font-size: 13px; color: #64748b; background: rgba(148, 163, 184, 0.1); padding: 4px 12px; border-radius: 20px; }
    .header-actions { display: flex; align-items: center; gap: 12px; }
    .search-box { position: relative; }
    .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 14px; color: #64748b; }
    .search-input { padding: 10px 16px 10px 40px; background: rgba(15, 23, 42, 0.5); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 10px; color: #fff; font-size: 14px; width: 280px; transition: all 0.2s; }
    .search-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
    .btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 10px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.2s; border: none; }
    .btn-icon { font-size: 16px; }
    .btn-primary { background: linear-gradient(135deg, #06b6d4, #3b82f6); color: #fff; box-shadow: 0 4px 15px rgba(6, 182, 212, 0.3); }
    .btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(6, 182, 212, 0.4); }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .table-container { overflow-x: auto; border-radius: 12px; border: 1px solid rgba(148, 163, 184, 0.1); }
    .data-table { width: 100%; border-collapse: collapse; font-size: 14px; }
    .data-table thead { background: rgba(15, 23, 42, 0.5); }
    .data-table th { padding: 14px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid rgba(148, 163, 184, 0.1); }
    .data-table tbody tr { border-bottom: 1px solid rgba(148, 163, 184, 0.05); transition: all 0.2s; }
    .data-table tbody tr:hover { background: rgba(59, 130, 246, 0.05); }
    .data-table td { padding: 14px 16px; color: #e2e8f0; }
    .cell-id { font-family: monospace; color: #64748b; font-size: 13px; }
    .cell-total { font-weight: 600; color: #10b981; }
    .cell-date { color: #64748b; font-size: 13px; }
    .cell-quantity, .cell-product { text-align: center; }
    .customer-cell { display: flex; flex-direction: column; gap: 4px; }
    .customer-name { font-weight: 500; color: #fff; }
    .customer-email { font-size: 12px; color: #64748b; }
    .order-id { font-family: monospace; color: #3b82f6; font-weight: 600; }
    .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; text-transform: capitalize; }
    .status-pending { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
    .status-processing { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
    .status-shipped { background: rgba(6, 182, 212, 0.2); color: #06b6d4; }
    .status-delivered { background: rgba(16, 185, 129, 0.2); color: #10b981; }
    .status-cancelled { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
    .action-buttons { display: flex; gap: 8px; }
    .btn-icon-edit, .btn-icon-delete { padding: 6px 10px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; transition: all 0.2s; }
    .btn-icon-edit { background: rgba(59, 130, 246, 0.2); }
    .btn-icon-edit:hover { background: rgba(59, 130, 246, 0.3); }
    .btn-icon-delete { background: rgba(239, 68, 68, 0.2); }
    .btn-icon-delete:hover { background: rgba(239, 68, 68, 0.3); }
    .loading-row, .empty-row { text-align: center; }
    .loading-spinner { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 40px; color: #64748b; }
    .spinner { font-size: 32px; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .empty-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 20px; color: #64748b; }
    .empty-icon { font-size: 48px; opacity: 0.5; }
    .empty-state p { margin: 0; font-size: 14px; }
    .modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center; z-index: 9999; backdrop-filter: blur(4px); padding: 20px; }
    .modal-content { background: #1e293b; border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 16px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5); }
    .modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid rgba(148, 163, 184, 0.1); }
    .modal-header h3 { margin: 0; font-size: 18px; font-weight: 600; color: #fff; }
    .modal-close { background: transparent; border: none; color: #64748b; font-size: 28px; cursor: pointer; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 6px; transition: all 0.2s; }
    .modal-close:hover { background: rgba(148, 163, 184, 0.1); color: #fff; }
    .modal-form { padding: 24px; display: flex; flex-direction: column; gap: 20px; }
    .form-group { display: flex; flex-direction: column; gap: 8px; }
    .form-label { font-size: 13px; font-weight: 500; color: #94a3b8; }
    .form-input { padding: 12px 16px; background: rgba(15, 23, 42, 0.5); border: 1px solid rgba(148, 163, 184, 0.2); border-radius: 10px; color: #fff; font-size: 14px; transition: all 0.2s; }
    .form-input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .modal-actions { display: flex; gap: 12px; justify-content: flex-end; padding-top: 8px; }
  `]
})
export class DuckdbOrdersComponent implements OnInit {
  private readonly logger = inject(LoggerService);
  private readonly api = inject(ApiService);

  @Output() statsChange = new EventEmitter<{ type: string; count: number }>();

  isLoading = signal(false);
  orders = signal<Order[]>([]);
  filteredOrders = signal<Order[]>([]);
  searchQuery = '';
  showModal = signal(false);
  editingOrder = signal<Order | null>(null);
  formData = signal<Partial<Order>>({
    customer_name: '',
    customer_email: '',
    product_name: '',
    quantity: 1,
    total: 0,
    status: 'pending',
  });

  ngOnInit(): void {
    this.loadOrders();
  }

  async loadOrders(): Promise<void> {
    this.isLoading.set(true);
    try {
      const orders = await this.api.callOrThrow<Order[]>('getOrders');
      this.orders.set(orders);
      this.filterOrders();
      this.statsChange.emit({ type: 'totalOrders', count: orders.length });
    } catch (error) {
      this.logger.error('Failed to load orders', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  filterOrders(): void {
    const query = this.searchQuery.toLowerCase();
    this.filteredOrders.set(
      this.orders().filter(o =>
        o.customer_name.toLowerCase().includes(query) ||
        o.customer_email.toLowerCase().includes(query) ||
        o.product_name.toLowerCase().includes(query) ||
        o.status.toLowerCase().includes(query)
      )
    );
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString();
  }

  showCreateModal(): void {
    this.editingOrder.set(null);
    this.formData.set({
      customer_name: '',
      customer_email: '',
      product_name: '',
      quantity: 1,
      total: 0,
      status: 'pending',
    });
    this.showModal.set(true);
  }

  editOrder(order: Order): void {
    this.editingOrder.set(order);
    this.formData.set({ ...order });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingOrder.set(null);
  }

  updateFormData(field: keyof Order, value: any): void {
    this.formData.update(d => ({ ...d, [field]: value }));
  }

  async saveOrder(): Promise<void> {
    this.isLoading.set(true);
    try {
      if (this.editingOrder()) {
        await this.api.callOrThrow('updateOrder', [this.editingOrder()!.id, this.formData()]);
        this.logger.info('Order updated successfully');
      } else {
        await this.api.callOrThrow('createOrder', [this.formData()]);
        this.logger.info('Order created successfully');
      }
      await this.loadOrders();
      this.closeModal();
    } catch (error) {
      this.logger.error('Failed to save order', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async deleteOrder(order: Order): Promise<void> {
    if (!confirm(`Delete order #${order.id}?`)) return;

    this.isLoading.set(true);
    try {
      await this.api.callOrThrow('deleteOrder', [order.id]);
      this.logger.info('Order deleted');
      await this.loadOrders();
    } catch (error) {
      this.logger.error('Failed to delete order', error);
    } finally {
      this.isLoading.set(false);
    }
  }
}

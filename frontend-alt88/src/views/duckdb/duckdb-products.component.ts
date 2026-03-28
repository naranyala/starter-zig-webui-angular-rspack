/**
 * DuckDB Products Table Component
 */

import { Component, signal, inject, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoggerService } from '../../core/logger.service';
import { ApiService } from '../../core/api.service';

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  created_at: string;
}

@Component({
  selector: 'app-duckdb-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="table-card">
      <!-- Card Header -->
      <div class="card-header">
        <div class="header-left">
          <h2 class="card-title">
            <span class="title-icon">📦</span>
            Products Management
          </h2>
          <span class="record-count">{{ products().length }} records</span>
        </div>
        <div class="header-actions">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input
              type="text"
              class="search-input"
              placeholder="Search products..."
              [(ngModel)]="searchQuery"
              (input)="filterProducts()"
            />
          </div>
          <button class="btn btn-primary" (click)="showCreateModal()">
            <span class="btn-icon">+</span> Add Product
          </button>
        </div>
      </div>

      <!-- Table -->
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Product</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
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
                    <span>Loading products...</span>
                  </div>
                </td>
              </tr>
            } @else if (filteredProducts().length === 0) {
              <tr class="empty-row">
                <td colspan="7">
                  <div class="empty-state">
                    <span class="empty-icon">📭</span>
                    <p>No products found</p>
                  </div>
                </td>
              </tr>
            } @else {
              @for (product of filteredProducts(); track product.id) {
                <tr class="data-row">
                  <td class="cell-id">{{ product.id }}</td>
                  <td>
                    <div class="product-cell">
                      <div class="product-icon">📦</div>
                      <div class="product-info">
                        <span class="product-name">{{ product.name }}</span>
                        <span class="product-desc">{{ product.description | slice:0:50 }}{{ product.description.length > 50 ? '...' : '' }}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="category-badge">{{ product.category }}</span>
                  </td>
                  <td class="cell-price">\${{ product.price | number:'1.2-2' }}</td>
                  <td>
                    <span class="stock-badge" [class.stock-low]="product.stock < 10" [class.stock-ok]="product.stock >= 10">
                      {{ product.stock }}
                    </span>
                  </td>
                  <td class="cell-date">{{ formatDate(product.created_at) }}</td>
                  <td>
                    <div class="action-buttons">
                      <button class="btn-icon-edit" (click)="editProduct(product)" title="Edit">✏️</button>
                      <button class="btn-icon-delete" (click)="deleteProduct(product)" title="Delete">🗑️</button>
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
              <h3>{{ editingProduct() ? 'Edit Product' : 'Create New Product' }}</h3>
              <button class="modal-close" (click)="closeModal()">×</button>
            </div>
            <form class="modal-form" (ngSubmit)="saveProduct()">
              <div class="form-group">
                <label class="form-label">Product Name</label>
                <input
                  type="text"
                  class="form-input"
                  [ngModel]="formData().name"
                  (ngModelChange)="updateFormData('name', $event)"
                  name="name"
                  required
                  placeholder="Enter product name"
                />
              </div>
              <div class="form-group">
                <label class="form-label">Description</label>
                <textarea
                  class="form-input"
                  [ngModel]="formData().description"
                  (ngModelChange)="updateFormData('description', $event)"
                  name="description"
                  rows="3"
                  placeholder="Product description"
                ></textarea>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Price</label>
                  <input
                    type="number"
                    class="form-input"
                    [ngModel]="formData().price"
                    (ngModelChange)="updateFormData('price', $event)"
                    name="price"
                    required
                    min="0"
                    step="0.01"
                  />
                </div>
                <div class="form-group">
                  <label class="form-label">Stock</label>
                  <input
                    type="number"
                    class="form-input"
                    [ngModel]="formData().stock"
                    (ngModelChange)="updateFormData('stock', $event)"
                    name="stock"
                    required
                    min="0"
                  />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Category</label>
                <select
                  class="form-input"
                  [ngModel]="formData().category"
                  (ngModelChange)="updateFormData('category', $event)"
                  name="category"
                >
                  <option value="Electronics">Electronics</option>
                  <option value="Clothing">Clothing</option>
                  <option value="Books">Books</option>
                  <option value="Home">Home</option>
                  <option value="Sports">Sports</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn btn-secondary" (click)="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary" [disabled]="isLoading()">
                  {{ isLoading() ? 'Saving...' : (editingProduct() ? 'Update' : 'Create') }}
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
    .cell-price { font-weight: 600; color: #10b981; }
    .cell-date { color: #64748b; font-size: 13px; }
    .cell-quantity { text-align: center; }
    .product-cell { display: flex; align-items: center; gap: 12px; }
    .product-icon { font-size: 20px; }
    .product-info { display: flex; flex-direction: column; }
    .product-name { font-weight: 500; color: #fff; }
    .product-desc { font-size: 12px; color: #64748b; }
    .category-badge { display: inline-block; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 500; background: rgba(139, 92, 246, 0.2); color: #a78bfa; }
    .stock-badge { display: inline-block; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 500; text-align: center; min-width: 40px; }
    .stock-ok { background: rgba(16, 185, 129, 0.2); color: #10b981; }
    .stock-low { background: rgba(245, 158, 11, 0.2); color: #f59e0b; }
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
export class DuckdbProductsComponent implements OnInit {
  private readonly logger = inject(LoggerService);
  private readonly api = inject(ApiService);

  @Output() statsChange = new EventEmitter<{ type: string; count: number }>();

  isLoading = signal(false);
  products = signal<Product[]>([]);
  filteredProducts = signal<Product[]>([]);
  searchQuery = '';
  showModal = signal(false);
  editingProduct = signal<Product | null>(null);
  formData = signal<Partial<Product>>({ name: '', description: '', price: 0, stock: 0, category: 'Other' });

  ngOnInit(): void {
    this.loadProducts();
  }

  async loadProducts(): Promise<void> {
    this.isLoading.set(true);
    try {
      const products = await this.api.callOrThrow<Product[]>('getProducts');
      this.products.set(products);
      this.filterProducts();
      this.statsChange.emit({ type: 'totalProducts', count: products.length });
    } catch (error) {
      this.logger.error('Failed to load products', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  filterProducts(): void {
    const query = this.searchQuery.toLowerCase();
    this.filteredProducts.set(
      this.products().filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
      )
    );
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString();
  }

  showCreateModal(): void {
    this.editingProduct.set(null);
    this.formData.set({ name: '', description: '', price: 0, stock: 0, category: 'Other' });
    this.showModal.set(true);
  }

  editProduct(product: Product): void {
    this.editingProduct.set(product);
    this.formData.set({ ...product });
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.editingProduct.set(null);
  }

  updateFormData(field: keyof Product, value: any): void {
    this.formData.update(d => ({ ...d, [field]: value }));
  }

  async saveProduct(): Promise<void> {
    this.isLoading.set(true);
    try {
      if (this.editingProduct()) {
        await this.api.callOrThrow('updateProduct', [this.editingProduct()!.id, this.formData()]);
        this.logger.info('Product updated successfully');
      } else {
        await this.api.callOrThrow('createProduct', [this.formData()]);
        this.logger.info('Product created successfully');
      }
      await this.loadProducts();
      this.closeModal();
    } catch (error) {
      this.logger.error('Failed to save product', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async deleteProduct(product: Product): Promise<void> {
    if (!confirm(`Delete ${product.name}?`)) return;

    this.isLoading.set(true);
    try {
      await this.api.callOrThrow('deleteProduct', [product.id]);
      this.logger.info('Product deleted');
      await this.loadProducts();
    } catch (error) {
      this.logger.error('Failed to delete product', error);
    } finally {
      this.isLoading.set(false);
    }
  }
}

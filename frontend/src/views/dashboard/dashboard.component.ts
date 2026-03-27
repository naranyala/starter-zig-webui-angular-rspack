/**
 * Enhanced Dashboard Component with Database Switching
 *
 * Main dashboard with statistics, database switching, and navigation
 */

import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoggerService } from '../../core/logger.service';
import { ApiService } from '../../core/api.service';

export type DatabaseType = 'sqlite' | 'duckdb';

export interface DashboardStats {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  activeUsers: number;
  pendingOrders: number;
}

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  active: boolean;
}

export interface User {
  id: number;
  name: string;
  email: string;
  age: number;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  created_at: string;
}

export interface Order {
  id: number;
  user_id: number;
  product_id: number;
  quantity: number;
  total_price: number;
  status: 'pending' | 'completed' | 'cancelled';
  created_at: string;
  user_name?: string;
  product_name?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dashboard-container">
      <!-- Sidebar Navigation -->
      <aside class="sidebar" [class.collapsed]="sidebarCollapsed()">
        <div class="sidebar-header">
          <div class="logo">
            <span class="logo-icon">{{ databaseType() === 'sqlite' ? '🗄️' : '🦆' }}</span>
            @if (!sidebarCollapsed()) {
              <span class="logo-text">{{ databaseType() === 'sqlite' ? 'SQLite' : 'DuckDB' }} Admin</span>
            }
          </div>
        </div>

        <!-- Database Switcher -->
        <div class="database-switcher" [class.collapsed]="sidebarCollapsed()">
          <span class="switcher-label" *ngIf="!sidebarCollapsed()">Database:</span>
          <div class="switch-buttons">
            <button 
              class="db-btn" 
              [class.active]="databaseType() === 'sqlite'"
              (click)="switchDatabase('sqlite')"
              title="SQLite"
            >
              🗄️
            </button>
            <button 
              class="db-btn" 
              [class.active]="databaseType() === 'duckdb'"
              (click)="switchDatabase('duckdb')"
              title="DuckDB"
            >
              🦆
            </button>
          </div>
        </div>

        <nav class="sidebar-nav">
          @for (item of navItems(); track item.id) {
            <button
              class="nav-item"
              [class.active]="activeView() === item.id"
              (click)="onNavClick(item.id)"
              [attr.title]="sidebarCollapsed() ? item.label : ''"
            >
              <span class="nav-icon">{{ item.icon }}</span>
              @if (!sidebarCollapsed()) {
                <span class="nav-label">{{ item.label }}</span>
              }
            </button>
          }
        </nav>

        <div class="sidebar-footer">
          <button class="nav-item" (click)="toggleSidebar()" title="Toggle sidebar">
            <span class="nav-icon">{{ sidebarCollapsed() ? '→' : '←' }}</span>
            @if (!sidebarCollapsed()) {
              <span class="nav-label">Collapse</span>
            }
          </button>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="main-content">
        <!-- Top Header -->
        <header class="top-header">
          <div class="header-left">
            <button class="menu-toggle" (click)="toggleSidebar()" title="Toggle menu">
              <span>☰</span>
            </button>
            <h1 class="page-title">{{ currentPageTitle() }}</h1>
            <span class="db-badge" [class.sqlite]="databaseType() === 'sqlite'" [class.duckdb]="databaseType() === 'duckdb'">
              {{ databaseType() === 'sqlite' ? '🗄️ SQLite Mode' : '🦆 DuckDB Mode' }}
            </span>
          </div>
          <div class="header-right">
            <div class="header-stats">
              <div class="mini-stat">
                <span class="mini-stat-label">Total Records</span>
                <span class="mini-stat-value">{{ getTotalRecords() }}</span>
              </div>
            </div>
            <button class="btn-refresh" (click)="refreshAll()" title="Refresh all data">
              <span class="refresh-icon" [class.spinning]="isLoading()">🔄</span>
            </button>
          </div>
        </header>

        <!-- Stats Cards -->
        <div class="stats-grid">
          <div class="stat-card stat-primary">
            <div class="stat-icon">👥</div>
            <div class="stat-content">
              <span class="stat-value">{{ stats().totalUsers | number }}</span>
              <span class="stat-label">Total Users</span>
            </div>
          </div>
          <div class="stat-card stat-success">
            <div class="stat-icon">📦</div>
            <div class="stat-content">
              <span class="stat-value">{{ stats().totalProducts | number }}</span>
              <span class="stat-label">Products</span>
            </div>
          </div>
          <div class="stat-card stat-warning">
            <div class="stat-icon">🛒</div>
            <div class="stat-content">
              <span class="stat-value">{{ stats().totalOrders | number }}</span>
              <span class="stat-label">Orders</span>
            </div>
          </div>
          <div class="stat-card stat-info">
            <div class="stat-icon">💰</div>
            <div class="stat-content">
              <span class="stat-value">{{ stats().totalRevenue | number:'1.2-2' }}</span>
              <span class="stat-label">Revenue</span>
            </div>
          </div>
        </div>

        <!-- Content Area -->
        <div class="content-area">
          <!-- Users View -->
          @if (activeView() === 'users') {
            <div class="view-container">
              <div class="view-header">
                <div class="view-title">
                  <span>👥</span>
                  <h2>User Management</h2>
                </div>
                <div class="view-actions">
                  <input 
                    type="text" 
                    class="search-input" 
                    placeholder="Search users..." 
                    [(ngModel)]="searchQuery"
                    (input)="filterUsers()"
                  />
                  <button class="btn btn-primary" (click)="showCreateUserModal()">
                    <span>+</span> Add User
                  </button>
                </div>
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
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @if (isLoading()) {
                      <tr>
                        <td colspan="7" class="loading-cell">
                          <div class="loading-spinner">
                            <span class="spinner">⏳</span>
                            <span>Loading users...</span>
                          </div>
                        </td>
                      </tr>
                    } @else if (filteredUsers().length === 0) {
                      <tr>
                        <td colspan="7" class="empty-cell">
                          <div class="empty-state">
                            <span class="empty-icon">📭</span>
                            <p>No users found</p>
                          </div>
                        </td>
                      </tr>
                    } @else {
                      @for (user of filteredUsers(); track user.id) {
                        <tr>
                          <td class="cell-id">#{{ user.id }}</td>
                          <td>
                            <div class="user-cell">
                              <div class="avatar">{{ getInitials(user.name) }}</div>
                              <span>{{ user.name }}</span>
                            </div>
                          </td>
                          <td class="cell-email">{{ user.email }}</td>
                          <td>{{ user.age }}</td>
                          <td>
                            <span class="status-badge" [class.active]="user.status === 'active'" [class.inactive]="user.status === 'inactive'">
                              {{ user.status }}
                            </span>
                          </td>
                          <td class="cell-date">{{ formatDate(user.created_at) }}</td>
                          <td class="cell-actions">
                            <button class="action-btn edit" (click)="editUser(user)" title="Edit">✏️</button>
                            <button class="action-btn delete" (click)="deleteUser(user)" title="Delete">🗑️</button>
                          </td>
                        </tr>
                      }
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }

          <!-- Products View -->
          @if (activeView() === 'products') {
            <div class="view-container">
              <div class="view-header">
                <div class="view-title">
                  <span>📦</span>
                  <h2>Product Catalog</h2>
                </div>
                <div class="view-actions">
                  <input 
                    type="text" 
                    class="search-input" 
                    placeholder="Search products..." 
                    [(ngModel)]="searchQuery"
                    (input)="filterProducts()"
                  />
                  <button class="btn btn-primary" (click)="showCreateProductModal()">
                    <span>+</span> Add Product
                  </button>
                </div>
              </div>

              <div class="table-container">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    @if (isLoading()) {
                      <tr>
                        <td colspan="7" class="loading-cell">
                          <div class="loading-spinner">
                            <span class="spinner">⏳</span>
                            <span>Loading products...</span>
                          </div>
                        </td>
                      </tr>
                    } @else if (filteredProducts().length === 0) {
                      <tr>
                        <td colspan="7" class="empty-cell">
                          <div class="empty-state">
                            <span class="empty-icon">📭</span>
                            <p>No products found</p>
                          </div>
                        </td>
                      </tr>
                    } @else {
                      @for (product of filteredProducts(); track product.id) {
                        <tr>
                          <td class="cell-id">#{{ product.id }}</td>
                          <td>
                            <div class="product-cell">
                              <span class="product-name">{{ product.name }}</span>
                              <span class="product-desc">{{ product.description }}</span>
                            </div>
                          </td>
                          <td><span class="category-badge">{{ product.category }}</span></td>
                          <td class="cell-price">\${{ product.price | number:'1.2-2' }}</td>
                          <td>
                            <span class="stock-badge" [class.low]="product.stock < 10" [class.out]="product.stock === 0">
                              {{ product.stock }} in stock
                            </span>
                          </td>
                          <td class="cell-date">{{ formatDate(product.created_at) }}</td>
                          <td class="cell-actions">
                            <button class="action-btn edit" (click)="editProduct(product)" title="Edit">✏️</button>
                            <button class="action-btn delete" (click)="deleteProduct(product)" title="Delete">🗑️</button>
                          </td>
                        </tr>
                      }
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }

          <!-- Orders View -->
          @if (activeView() === 'orders') {
            <div class="view-container">
              <div class="view-header">
                <div class="view-title">
                  <span>🛒</span>
                  <h2>Orders Management</h2>
                </div>
                <div class="view-actions">
                  <input 
                    type="text" 
                    class="search-input" 
                    placeholder="Search orders..." 
                    [(ngModel)]="searchQuery"
                    (input)="filterOrders()"
                  />
                  <button class="btn btn-primary" (click)="showCreateOrderModal()">
                    <span>+</span> New Order
                  </button>
                </div>
              </div>

              <div class="table-container">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>ID</th>
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
                      <tr>
                        <td colspan="8" class="loading-cell">
                          <div class="loading-spinner">
                            <span class="spinner">⏳</span>
                            <span>Loading orders...</span>
                          </div>
                        </td>
                      </tr>
                    } @else if (filteredOrders().length === 0) {
                      <tr>
                        <td colspan="8" class="empty-cell">
                          <div class="empty-state">
                            <span class="empty-icon">📭</span>
                            <p>No orders found</p>
                          </div>
                        </td>
                      </tr>
                    } @else {
                      @for (order of filteredOrders(); track order.id) {
                        <tr>
                          <td class="cell-id">#{{ order.id }}</td>
                          <td>{{ order.user_name || 'User #' + order.user_id }}</td>
                          <td>{{ order.product_name || 'Product #' + order.product_id }}</td>
                          <td>{{ order.quantity }}</td>
                          <td class="cell-price">\${{ order.total_price | number:'1.2-2' }}</td>
                          <td>
                            <span class="order-status" [class]="order.status">
                              {{ order.status }}
                            </span>
                          </td>
                          <td class="cell-date">{{ formatDate(order.created_at) }}</td>
                          <td class="cell-actions">
                            <button class="action-btn view" (click)="viewOrder(order)" title="View">👁️</button>
                            <button class="action-btn delete" (click)="deleteOrder(order)" title="Delete">🗑️</button>
                          </td>
                        </tr>
                      }
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }

          <!-- Analytics View -->
          @if (activeView() === 'analytics') {
            <div class="view-container analytics-view">
              <div class="analytics-header">
                <div class="view-title">
                  <span>📊</span>
                  <h2>Analytics Dashboard</h2>
                </div>
              </div>

              <div class="analytics-grid">
                <!-- Users Chart Placeholder -->
                <div class="analytics-card">
                  <div class="card-header">
                    <h3>User Growth</h3>
                    <span class="card-icon">📈</span>
                  </div>
                  <div class="card-content">
                    <div class="chart-placeholder">
                      <div class="bar-chart">
                        @for (bar of userGrowthData(); track bar.label; let i = $index) {
                          <div class="bar-item">
                            <div class="bar" [style.height.%]="bar.value"></div>
                            <span class="bar-label">{{ bar.label }}</span>
                          </div>
                        }
                      </div>
                    </div>
                    <div class="chart-stats">
                      <div class="stat">
                        <span class="stat-label">Total Users</span>
                        <span class="stat-value">{{ stats().totalUsers }}</span>
                      </div>
                      <div class="stat">
                        <span class="stat-label">Active</span>
                        <span class="stat-value">{{ stats().activeUsers }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Revenue Chart Placeholder -->
                <div class="analytics-card">
                  <div class="card-header">
                    <h3>Revenue Overview</h3>
                    <span class="card-icon">💰</span>
                  </div>
                  <div class="card-content">
                    <div class="chart-placeholder">
                      <div class="bar-chart">
                        @for (bar of revenueData(); track bar.label; let i = $index) {
                          <div class="bar-item">
                            <div class="bar revenue" [style.height.%]="bar.value"></div>
                            <span class="bar-label">{{ bar.label }}</span>
                          </div>
                        }
                      </div>
                    </div>
                    <div class="chart-stats">
                      <div class="stat">
                        <span class="stat-label">Total Revenue</span>
                        <span class="stat-value">\${{ stats().totalRevenue | number:'1.2-2' }}</span>
                      </div>
                      <div class="stat">
                        <span class="stat-label">Orders</span>
                        <span class="stat-value">{{ stats().totalOrders }}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Category Distribution -->
                <div class="analytics-card">
                  <div class="card-header">
                    <h3>Category Distribution</h3>
                    <span class="card-icon">🥧</span>
                  </div>
                  <div class="card-content">
                    <div class="category-list">
                      @for (cat of categoryData(); track cat.name) {
                        <div class="category-item">
                          <div class="category-info">
                            <span class="category-name">{{ cat.name }}</span>
                            <span class="category-count">{{ cat.count }} products</span>
                          </div>
                          <div class="category-bar">
                            <div class="fill" [style.width.%]="cat.percentage"></div>
                          </div>
                        </div>
                      }
                    </div>
                  </div>
                </div>

                <!-- Order Status -->
                <div class="analytics-card">
                  <div class="card-header">
                    <h3>Order Status</h3>
                    <span class="card-icon">📋</span>
                  </div>
                  <div class="card-content">
                    <div class="status-list">
                      <div class="status-item">
                        <span class="status-dot completed"></span>
                        <span>Completed</span>
                        <span class="status-count">{{ getOrderStatusCount('completed') }}</span>
                      </div>
                      <div class="status-item">
                        <span class="status-dot pending"></span>
                        <span>Pending</span>
                        <span class="status-count">{{ getOrderStatusCount('pending') }}</span>
                      </div>
                      <div class="status-item">
                        <span class="status-dot cancelled"></span>
                        <span>Cancelled</span>
                        <span class="status-count">{{ getOrderStatusCount('cancelled') }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      </main>

      <!-- Create User Modal -->
      @if (showUserModal()) {
        <div class="modal-overlay" (click)="closeUserModal()">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>{{ editingUser() ? 'Edit User' : 'Create New User' }}</h3>
              <button class="modal-close" (click)="closeUserModal()">×</button>
            </div>
            <form class="modal-form" (ngSubmit)="saveUser()">
              <div class="form-group">
                <label class="form-label">Name</label>
                <input type="text" class="form-input" [ngModel]="userForm().name" (ngModelChange)="updateUserForm('name', $event)" name="name" required placeholder="Enter full name" />
              </div>
              <div class="form-group">
                <label class="form-label">Email</label>
                <input type="email" class="form-input" [ngModel]="userForm().email" (ngModelChange)="updateUserForm('email', $event)" name="email" required placeholder="email@example.com" />
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Age</label>
                  <input type="number" class="form-input" [ngModel]="userForm().age" (ngModelChange)="updateUserForm('age', $event)" name="age" required min="1" max="150" />
                </div>
                <div class="form-group">
                  <label class="form-label">Status</label>
                  <select class="form-input" [ngModel]="userForm().status" (ngModelChange)="updateUserForm('status', $event)" name="status">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn btn-secondary" (click)="closeUserModal()">Cancel</button>
                <button type="submit" class="btn btn-primary" [disabled]="isSaving()">
                  {{ isSaving() ? 'Saving...' : 'Save' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .dashboard-container {
      display: flex;
      height: 100vh;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      overflow: hidden;
    }

    /* Sidebar */
    .sidebar {
      width: 280px;
      background: rgba(15, 23, 42, 0.95);
      border-right: 1px solid rgba(148, 163, 184, 0.1);
      display: flex;
      flex-direction: column;
      transition: width 0.3s ease;
      backdrop-filter: blur(10px);
    }

    .sidebar.collapsed {
      width: 80px;
    }

    .sidebar-header {
      padding: 20px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.1);
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .logo-icon {
      font-size: 32px;
    }

    .logo-text {
      font-size: 18px;
      font-weight: 700;
      color: #fff;
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    /* Database Switcher */
    .database-switcher {
      padding: 16px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.1);
    }

    .database-switcher.collapsed {
      text-align: center;
    }

    .switcher-label {
      display: block;
      font-size: 12px;
      color: #64748b;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .switch-buttons {
      display: flex;
      gap: 8px;
    }

    .db-btn {
      flex: 1;
      padding: 10px;
      font-size: 20px;
      background: rgba(148, 163, 184, 0.1);
      border: 2px solid transparent;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .db-btn:hover {
      background: rgba(148, 163, 184, 0.2);
    }

    .db-btn.active {
      border-color: #06b6d4;
      background: rgba(6, 182, 212, 0.2);
      box-shadow: 0 0 15px rgba(6, 182, 212, 0.3);
    }

    /* Navigation */
    .sidebar-nav {
      flex: 1;
      padding: 16px 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      overflow-y: auto;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: transparent;
      border: none;
      border-radius: 10px;
      color: #94a3b8;
      cursor: pointer;
      transition: all 0.2s;
      text-align: left;
      width: 100%;
    }

    .nav-item:hover {
      background: rgba(59, 130, 246, 0.1);
      color: #fff;
    }

    .nav-item.active {
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      color: #fff;
      box-shadow: 0 4px 15px rgba(6, 182, 212, 0.4);
    }

    .nav-icon {
      font-size: 20px;
      width: 24px;
      text-align: center;
    }

    .nav-label {
      font-size: 14px;
      font-weight: 500;
      white-space: nowrap;
    }

    .sidebar-footer {
      padding: 16px;
      border-top: 1px solid rgba(148, 163, 184, 0.1);
    }

    /* Main Content */
    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: #0f172a;
    }

    .top-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 32px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.1);
      background: rgba(15, 23, 42, 0.5);
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .menu-toggle {
      display: none;
      padding: 8px 12px;
      background: rgba(148, 163, 184, 0.1);
      border: none;
      border-radius: 8px;
      color: #fff;
      cursor: pointer;
      font-size: 20px;
    }

    .page-title {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
      color: #fff;
    }

    .db-badge {
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }

    .db-badge.sqlite {
      background: rgba(16, 185, 129, 0.2);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .db-badge.duckdb {
      background: rgba(59, 130, 246, 0.2);
      color: #3b82f6;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .header-stats {
      display: flex;
      gap: 16px;
    }

    .mini-stat {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }

    .mini-stat-label {
      font-size: 12px;
      color: #64748b;
    }

    .mini-stat-value {
      font-size: 18px;
      font-weight: 600;
      color: #06b6d4;
    }

    .btn-refresh {
      padding: 10px 16px;
      background: rgba(59, 130, 246, 0.2);
      border: 1px solid rgba(59, 130, 246, 0.3);
      border-radius: 8px;
      color: #60a5fa;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-refresh:hover {
      background: rgba(59, 130, 246, 0.3);
    }

    .refresh-icon.spinning {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      padding: 24px 32px;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid rgba(148, 163, 184, 0.1);
      border-radius: 12px;
      transition: all 0.3s;
    }

    .stat-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
    }

    .stat-icon {
      font-size: 40px;
      width: 60px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 12px;
    }

    .stat-content {
      display: flex;
      flex-direction: column;
    }

    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: #fff;
    }

    .stat-label {
      font-size: 13px;
      color: #64748b;
      margin-top: 4px;
    }

    .stat-primary .stat-icon { background: rgba(59, 130, 246, 0.2); }
    .stat-success .stat-icon { background: rgba(16, 185, 129, 0.2); }
    .stat-warning .stat-icon { background: rgba(245, 158, 11, 0.2); }
    .stat-info .stat-icon { background: rgba(6, 182, 212, 0.2); }

    /* Content Area */
    .content-area {
      flex: 1;
      overflow-y: auto;
      padding: 0 32px 32px;
    }

    /* View Container */
    .view-container {
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid rgba(148, 163, 184, 0.1);
      border-radius: 12px;
      padding: 24px;
    }

    .view-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .view-title {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .view-title h2 {
      margin: 0;
      font-size: 20px;
      color: #fff;
    }

    .view-actions {
      display: flex;
      gap: 12px;
    }

    .search-input {
      padding: 10px 16px;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 8px;
      color: #fff;
      font-size: 14px;
      width: 250px;
    }

    .search-input:focus {
      outline: none;
      border-color: #06b6d4;
    }

    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary {
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      color: #fff;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(6, 182, 212, 0.4);
    }

    .btn-secondary {
      background: rgba(148, 163, 184, 0.2);
      color: #94a3b8;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    /* Table */
    .table-container {
      overflow-x: auto;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
    }

    .data-table th {
      padding: 12px 16px;
      text-align: left;
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.1);
    }

    .data-table td {
      padding: 14px 16px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.1);
      color: #e2e8f0;
    }

    .data-table tr:hover td {
      background: rgba(59, 130, 246, 0.05);
    }

    .cell-id {
      font-family: monospace;
      color: #64748b;
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
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
      color: #fff;
    }

    .cell-email {
      color: #94a3b8;
    }

    .cell-price {
      font-weight: 600;
      color: #10b981;
    }

    .cell-date {
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
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    }

    .action-btn.edit {
      background: rgba(59, 130, 246, 0.2);
    }

    .action-btn.delete {
      background: rgba(239, 68, 68, 0.2);
    }

    .action-btn.view {
      background: rgba(16, 185, 129, 0.2);
    }

    .action-btn:hover {
      transform: scale(1.1);
    }

    /* Status Badges */
    .status-badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .status-badge.active {
      background: rgba(16, 185, 129, 0.2);
      color: #10b981;
    }

    .status-badge.inactive {
      background: rgba(148, 163, 184, 0.2);
      color: #94a3b8;
    }

    .category-badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      background: rgba(139, 92, 246, 0.2);
      color: #a78bfa;
    }

    .stock-badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      background: rgba(16, 185, 129, 0.2);
      color: #10b981;
    }

    .stock-badge.low {
      background: rgba(245, 158, 11, 0.2);
      color: #f59e0b;
    }

    .stock-badge.out {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }

    .order-status {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: capitalize;
    }

    .order-status.completed {
      background: rgba(16, 185, 129, 0.2);
      color: #10b981;
    }

    .order-status.pending {
      background: rgba(245, 158, 11, 0.2);
      color: #f59e0b;
    }

    .order-status.cancelled {
      background: rgba(239, 68, 68, 0.2);
      color: #ef4444;
    }

    /* Loading & Empty States */
    .loading-cell, .empty-cell {
      text-align: center;
      padding: 60px 20px !important;
    }

    .loading-spinner {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: #64748b;
    }

    .spinner {
      animation: spin 1s linear infinite;
    }

    .empty-state {
      text-align: center;
      color: #64748b;
    }

    .empty-icon {
      font-size: 48px;
      display: block;
      margin-bottom: 12px;
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: #1e293b;
      border: 1px solid rgba(148, 163, 184, 0.1);
      border-radius: 16px;
      width: 100%;
      max-width: 500px;
      padding: 24px;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .modal-header h3 {
      margin: 0;
      font-size: 20px;
      color: #fff;
    }

    .modal-close {
      background: none;
      border: none;
      font-size: 28px;
      color: #64748b;
      cursor: pointer;
    }

    .modal-form {
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
      font-size: 14px;
      font-weight: 600;
      color: #94a3b8;
    }

    .form-input {
      padding: 12px 16px;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 8px;
      color: #fff;
      font-size: 14px;
    }

    .form-input:focus {
      outline: none;
      border-color: #06b6d4;
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
      margin-top: 8px;
    }

    /* Analytics View */
    .analytics-view {
      background: transparent;
      border: none;
      padding: 0;
    }

    .analytics-header {
      margin-bottom: 24px;
    }

    .analytics-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }

    .analytics-card {
      background: rgba(30, 41, 59, 0.5);
      border: 1px solid rgba(148, 163, 184, 0.1);
      border-radius: 12px;
      overflow: hidden;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.1);
    }

    .card-header h3 {
      margin: 0;
      font-size: 16px;
      color: #fff;
    }

    .card-icon {
      font-size: 24px;
    }

    .card-content {
      padding: 20px;
    }

    .chart-placeholder {
      height: 150px;
      display: flex;
      align-items: flex-end;
      justify-content: space-around;
      padding: 10px;
    }

    .bar-chart {
      display: flex;
      gap: 12px;
      align-items: flex-end;
      height: 100%;
    }

    .bar-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .bar {
      width: 30px;
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      border-radius: 4px 4px 0 0;
      transition: height 0.3s ease;
    }

    .bar.revenue {
      background: linear-gradient(135deg, #10b981, #34d399);
    }

    .bar-label {
      font-size: 11px;
      color: #64748b;
    }

    .chart-stats {
      display: flex;
      gap: 24px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid rgba(148, 163, 184, 0.1);
    }

    .stat {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .stat-label {
      font-size: 12px;
      color: #64748b;
    }

    .stat-value {
      font-size: 20px;
      font-weight: 700;
      color: #fff;
    }

    .category-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .category-item {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .category-info {
      display: flex;
      justify-content: space-between;
    }

    .category-name {
      font-size: 14px;
      color: #e2e8f0;
    }

    .category-count {
      font-size: 12px;
      color: #64748b;
    }

    .category-bar {
      height: 8px;
      background: rgba(148, 163, 184, 0.1);
      border-radius: 4px;
      overflow: hidden;
    }

    .category-bar .fill {
      height: 100%;
      background: linear-gradient(135deg, #8b5cf6, #a78bfa);
      border-radius: 4px;
      transition: width 0.3s ease;
    }

    .status-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .status-item {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 14px;
      color: #e2e8f0;
    }

    .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .status-dot.completed { background: #10b981; }
    .status-dot.pending { background: #f59e0b; }
    .status-dot.cancelled { background: #ef4444; }

    .status-count {
      margin-left: auto;
      font-weight: 600;
    }

    /* Product Cell */
    .product-cell {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .product-name {
      font-weight: 600;
      color: #fff;
    }

    .product-desc {
      font-size: 12px;
      color: #64748b;
    }

    /* Responsive */
    @media (max-width: 1200px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .analytics-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .sidebar {
        position: fixed;
        left: 0;
        top: 0;
        height: 100vh;
        z-index: 1000;
        transform: translateX(-100%);
      }

      .sidebar:not(.collapsed) {
        transform: translateX(0);
      }

      .menu-toggle {
        display: block;
      }

      .stats-grid {
        grid-template-columns: 1fr;
        padding: 16px 20px;
      }

      .top-header {
        padding: 16px 20px;
      }

      .content-area {
        padding: 0 20px 20px;
      }

      .view-container {
        padding: 16px;
      }

      .view-header {
        flex-direction: column;
        gap: 12px;
        align-items: stretch;
      }

      .view-actions {
        flex-direction: column;
      }

      .search-input {
        width: 100%;
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private readonly logger = inject(LoggerService);
  private readonly api = inject(ApiService);

  // State signals
  sidebarCollapsed = signal(false);
  databaseType = signal<DatabaseType>('sqlite');
  activeView = signal<'users' | 'products' | 'orders' | 'analytics'>('users');
  isLoading = signal(false);
  isSaving = signal(false);
  searchQuery = signal('');

  // Data signals
  users = signal<User[]>([]);
  products = signal<Product[]>([]);
  orders = signal<Order[]>([]);
  filteredUsers = signal<User[]>([]);
  filteredProducts = signal<Product[]>([]);
  filteredOrders = signal<Order[]>([]);

  // Modal state
  showUserModal = signal(false);
  editingUser = signal<User | null>(null);
  userForm = signal<{ name: string; email: string; age: number; status: 'active' | 'inactive' }>({
    name: '',
    email: '',
    age: 25,
    status: 'active'
  });

  // Stats
  stats = signal<DashboardStats>({
    totalUsers: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    activeUsers: 0,
    pendingOrders: 0,
  });

  // Navigation
  navItems = signal<NavItem[]>([
    { id: 'users', label: 'Users', icon: '👥', active: true },
    { id: 'products', label: 'Products', icon: '📦', active: false },
    { id: 'orders', label: 'Orders', icon: '🛒', active: false },
    { id: 'analytics', label: 'Analytics', icon: '📊', active: false },
  ]);

  currentPageTitle = signal('Users');

  // Dummy data for demo
  private dummyUsers: User[] = [
    { id: 1, name: 'Alice Johnson', email: 'alice@example.com', age: 28, status: 'active', created_at: '2024-01-15T10:30:00Z' },
    { id: 2, name: 'Bob Smith', email: 'bob@gmail.com', age: 35, status: 'active', created_at: '2024-02-20T14:45:00Z' },
    { id: 3, name: 'Charlie Brown', email: 'charlie@yahoo.com', age: 42, status: 'inactive', created_at: '2024-01-10T09:15:00Z' },
    { id: 4, name: 'Diana Ross', email: 'diana@outlook.com', age: 31, status: 'active', created_at: '2024-03-05T16:20:00Z' },
    { id: 5, name: 'Edward Norton', email: 'edward@example.com', age: 45, status: 'active', created_at: '2024-02-28T11:00:00Z' },
    { id: 6, name: 'Fiona Apple', email: 'fiona@icloud.com', age: 29, status: 'active', created_at: '2024-03-10T13:30:00Z' },
    { id: 7, name: 'George Lucas', email: 'george@film.com', age: 55, status: 'inactive', created_at: '2024-01-25T08:45:00Z' },
    { id: 8, name: 'Hannah Montana', email: 'hannah@music.com', age: 22, status: 'active', created_at: '2024-03-15T15:00:00Z' },
  ];

  private dummyProducts: Product[] = [
    { id: 1, name: 'Laptop Pro', description: 'High-performance laptop', price: 1299.99, stock: 50, category: 'Electronics', created_at: '2024-01-01T00:00:00Z' },
    { id: 2, name: 'Wireless Mouse', description: 'Ergonomic wireless mouse', price: 49.99, stock: 200, category: 'Electronics', created_at: '2024-01-05T00:00:00Z' },
    { id: 3, name: 'Coffee Maker', description: 'Automatic coffee maker', price: 89.99, stock: 75, category: 'Home', created_at: '2024-01-10T00:00:00Z' },
    { id: 4, name: 'Desk Chair', description: 'Ergonomic office chair', price: 299.99, stock: 30, category: 'Furniture', created_at: '2024-01-15T00:00:00Z' },
    { id: 5, name: 'Headphones', description: 'Noise-canceling headphones', price: 199.99, stock: 100, category: 'Electronics', created_at: '2024-01-20T00:00:00Z' },
    { id: 6, name: 'Water Bottle', description: 'Insulated water bottle', price: 24.99, stock: 500, category: 'Sports', created_at: '2024-01-25T00:00:00Z' },
    { id: 7, name: 'Notebook', description: 'Leather-bound notebook', price: 19.99, stock: 300, category: 'Office', created_at: '2024-02-01T00:00:00Z' },
    { id: 8, name: 'Desk Lamp', description: 'LED desk lamp', price: 39.99, stock: 150, category: 'Home', created_at: '2024-02-05T00:00:00Z' },
  ];

  private dummyOrders: Order[] = [
    { id: 1, user_id: 1, product_id: 1, quantity: 1, total_price: 1299.99, status: 'completed', created_at: '2024-03-01T10:00:00Z', user_name: 'Alice Johnson', product_name: 'Laptop Pro' },
    { id: 2, user_id: 2, product_id: 2, quantity: 2, total_price: 99.98, status: 'completed', created_at: '2024-03-02T11:30:00Z', user_name: 'Bob Smith', product_name: 'Wireless Mouse' },
    { id: 3, user_id: 3, product_id: 3, quantity: 1, total_price: 89.99, status: 'pending', created_at: '2024-03-05T14:00:00Z', user_name: 'Charlie Brown', product_name: 'Coffee Maker' },
    { id: 4, user_id: 4, product_id: 4, quantity: 1, total_price: 299.99, status: 'completed', created_at: '2024-03-08T09:15:00Z', user_name: 'Diana Ross', product_name: 'Desk Chair' },
    { id: 5, user_id: 5, product_id: 5, quantity: 1, total_price: 199.99, status: 'pending', created_at: '2024-03-10T16:45:00Z', user_name: 'Edward Norton', product_name: 'Headphones' },
    { id: 6, user_id: 6, product_id: 6, quantity: 3, total_price: 74.97, status: 'completed', created_at: '2024-03-12T12:00:00Z', user_name: 'Fiona Apple', product_name: 'Water Bottle' },
    { id: 7, user_id: 7, product_id: 7, quantity: 5, total_price: 99.95, status: 'cancelled', created_at: '2024-03-14T08:30:00Z', user_name: 'George Lucas', product_name: 'Notebook' },
    { id: 8, user_id: 8, product_id: 8, quantity: 2, total_price: 79.98, status: 'pending', created_at: '2024-03-15T17:00:00Z', user_name: 'Hannah Montana', product_name: 'Desk Lamp' },
  ];

  // Analytics data
  userGrowthData = signal([
    { label: 'Jan', value: 30 },
    { label: 'Feb', value: 45 },
    { label: 'Mar', value: 60 },
    { label: 'Apr', value: 75 },
    { label: 'May', value: 85 },
    { label: 'Jun', value: 100 },
  ]);

  revenueData = signal([
    { label: 'Jan', value: 40 },
    { label: 'Feb', value: 55 },
    { label: 'Mar', value: 70 },
    { label: 'Apr', value: 80 },
    { label: 'May', value: 90 },
    { label: 'Jun', value: 100 },
  ]);

  categoryData = signal([
    { name: 'Electronics', count: 3, percentage: 37.5 },
    { name: 'Home', count: 2, percentage: 25 },
    { name: 'Furniture', count: 1, percentage: 12.5 },
    { name: 'Sports', count: 1, percentage: 12.5 },
    { name: 'Office', count: 1, percentage: 12.5 },
  ]);

  ngOnInit(): void {
    this.loadAllData();
  }

  async loadAllData(): Promise<void> {
    this.isLoading.set(true);
    try {
      // Try to load from backend, fall back to dummy data
      const [users, products, orders] = await Promise.all([
        this.api.callOrThrow<User[]>('getUsers').catch(() => {
          this.logger.info('Using dummy user data for demo');
          return this.dummyUsers;
        }),
        this.api.callOrThrow<Product[]>('getProducts').catch(() => {
          this.logger.info('Using dummy product data for demo');
          return this.dummyProducts;
        }),
        this.api.callOrThrow<Order[]>('getOrders').catch(() => {
          this.logger.info('Using dummy order data for demo');
          return this.dummyOrders;
        }),
      ]);

      this.users.set(users);
      this.products.set(products);
      this.orders.set(orders);
      
      this.filterUsers();
      this.filterProducts();
      this.filterOrders();
      this.updateStats();
    } catch (error) {
      this.logger.error('Failed to load data', error);
      // Use dummy data as fallback
      this.users.set(this.dummyUsers);
      this.products.set(this.dummyProducts);
      this.orders.set(this.dummyOrders);
      this.filterUsers();
      this.filterProducts();
      this.filterOrders();
      this.updateStats();
    } finally {
      this.isLoading.set(false);
    }
  }

  switchDatabase(dbType: DatabaseType): void {
    this.databaseType.set(dbType);
    this.logger.info(`Switched to ${dbType === 'sqlite' ? 'SQLite' : 'DuckDB'} mode`);
    // In a real implementation, this would switch the backend database
    // For demo, we just update the UI
    this.loadAllData();
  }

  setActiveView(viewId: 'users' | 'products' | 'orders' | 'analytics'): void {
    this.activeView.set(viewId);
    this.currentPageTitle.set(viewId.charAt(0).toUpperCase() + viewId.slice(1));
    
    // Update nav items
    this.navItems.update(items => 
      items.map(item => ({ ...item, active: item.id === viewId }))
    );
  }

  onNavClick(viewId: string): void {
    this.setActiveView(viewId as 'users' | 'products' | 'orders' | 'analytics');
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }

  getTotalRecords(): number {
    return this.users().length + this.products().length + this.orders().length;
  }

  updateStats(): void {
    const users = this.users();
    const products = this.products();
    const orders = this.orders();

    this.stats.set({
      totalUsers: users.length,
      totalProducts: products.length,
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, o) => sum + o.total_price, 0),
      activeUsers: users.filter(u => u.status === 'active').length,
      pendingOrders: orders.filter(o => o.status === 'pending').length,
    });
  }

  filterUsers(): void {
    const query = this.searchQuery().toLowerCase();
    if (!query) {
      this.filteredUsers.set(this.users());
    } else {
      this.filteredUsers.set(
        this.users().filter(u =>
          u.name.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query)
        )
      );
    }
  }

  filterProducts(): void {
    const query = this.searchQuery().toLowerCase();
    if (!query) {
      this.filteredProducts.set(this.products());
    } else {
      this.filteredProducts.set(
        this.products().filter(p =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query)
        )
      );
    }
  }

  filterOrders(): void {
    const query = this.searchQuery().toLowerCase();
    if (!query) {
      this.filteredOrders.set(this.orders());
    } else {
      this.filteredOrders.set(
        this.orders().filter(o =>
          (o.user_name || '').toLowerCase().includes(query) ||
          (o.product_name || '').toLowerCase().includes(query) ||
          o.status.toLowerCase().includes(query)
        )
      );
    }
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  getOrderStatusCount(status: string): number {
    return this.orders().filter(o => o.status === status).length;
  }

  // User CRUD operations
  showCreateUserModal(): void {
    this.editingUser.set(null);
    this.userForm.set({ name: '', email: '', age: 25, status: 'active' });
    this.showUserModal.set(true);
  }

  editUser(user: User): void {
    this.editingUser.set(user);
    this.userForm.set({
      name: user.name,
      email: user.email,
      age: user.age,
      status: user.status
    });
    this.showUserModal.set(true);
  }

  updateUserForm(field: 'name' | 'email' | 'age' | 'status', value: string | number): void {
    this.userForm.update(form => ({ ...form, [field]: value }));
  }

  closeUserModal(): void {
    this.showUserModal.set(false);
    this.editingUser.set(null);
  }

  async saveUser(): Promise<void> {
    this.isSaving.set(true);
    try {
      if (this.editingUser()) {
        // Update existing user (for demo, just update local data)
        this.users.update(users =>
          users.map(u => u.id === this.editingUser()!.id
            ? { ...u, ...this.userForm() }
            : u
          )
        );
        this.logger.info('User updated (demo mode)');
      } else {
        // Create new user
        const newUser: User = {
          id: Math.max(0, ...this.users().map(u => u.id)) + 1,
          ...this.userForm(),
          created_at: new Date().toISOString()
        };
        this.users.update(users => [...users, newUser]);
        this.logger.info('User created (demo mode)');
      }
      this.filterUsers();
      this.updateStats();
      this.closeUserModal();
    } catch (error) {
      this.logger.error('Failed to save user', error);
    } finally {
      this.isSaving.set(false);
    }
  }

  async deleteUser(user: User): Promise<void> {
    if (!confirm(`Delete ${user.name}?`)) return;
    
    try {
      await this.api.callOrThrow('deleteUser', [user.id]).catch(() => {
        // Demo mode - just update local data
        this.users.update(users => users.filter(u => u.id !== user.id));
        this.logger.info('User deleted (demo mode)');
      });
      this.filterUsers();
      this.updateStats();
    } catch (error) {
      this.logger.error('Failed to delete user', error);
    }
  }

  // Product CRUD operations
  showCreateProductModal(): void {
    this.logger.info('Create product (demo - not fully implemented)');
  }

  editProduct(product: Product): void {
    this.logger.info('Edit product (demo - not fully implemented)');
  }

  deleteProduct(product: Product): void {
    this.logger.info('Delete product (demo - not fully implemented)');
  }

  // Order operations
  showCreateOrderModal(): void {
    this.logger.info('Create order (demo - not fully implemented)');
  }

  viewOrder(order: Order): void {
    this.logger.info(`View order #${order.id} (demo)`);
  }

  deleteOrder(order: Order): void {
    if (!confirm(`Delete order #${order.id}?`)) return;
    
    this.orders.update(orders => orders.filter(o => o.id !== order.id));
    this.filterOrders();
    this.updateStats();
    this.logger.info('Order deleted (demo mode)');
  }

  refreshAll(): void {
    this.loadAllData();
  }
}

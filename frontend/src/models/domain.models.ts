/**
 * Domain Models
 * 
 * Business domain models with validation and business logic
 * These models extend the API types with additional functionality
 */

import {
  User,
  UserStatus,
  CreateUserRequest,
  UpdateUserRequest,
  Product,
  ProductStatus,
  Order,
  OrderStatus,
  OrderItem,
  DatabaseStats,
  MigrationProgress,
  SyncState,
  SyncEvent,
} from '../types/api.types';

// ============================================================================
// User Domain Model
// ============================================================================

export class UserDomain implements User {
  id: number;
  name: string;
  email: string;
  age: number;
  status: UserStatus;
  createdAt: string;
  updatedAt?: string;

  constructor(data: User) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
    this.age = data.age;
    this.status = data.status;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  // Business logic methods
  isActive(): boolean {
    return this.status === 'active';
  }

  isPending(): boolean {
    return this.status === 'pending';
  }

  canBeDeleted(): boolean {
    // Users with pending status cannot be deleted
    return !this.isPending();
  }

  validateEmail(): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(this.email);
  }

  validateAge(): boolean {
    return this.age >= 0 && this.age <= 150;
  }

  validateName(): boolean {
    return this.name.length >= 2 && this.name.length <= 256;
  }

  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.validateName()) {
      errors.push('Name must be between 2 and 256 characters');
    }

    if (!this.validateEmail()) {
      errors.push('Invalid email format');
    }

    if (!this.validateAge()) {
      errors.push('Age must be between 0 and 150');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  toCreateRequest(): CreateUserRequest {
    return {
      name: this.name,
      email: this.email,
      age: this.age,
      status: this.status,
    };
  }

  toUpdateRequest(): UpdateUserRequest {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      age: this.age,
      status: this.status,
    };
  }

  static create(data: Omit<User, 'id' | 'createdAt'>): UserDomain {
    return new UserDomain({
      ...data,
      id: 0, // Will be assigned by database
      createdAt: new Date().toISOString(),
    });
  }
}

// ============================================================================
// Product Domain Model
// ============================================================================

export class ProductDomain implements Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  status: ProductStatus;
  createdAt: string;
  updatedAt?: string;

  constructor(data: Product) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.price = data.price;
    this.stock = data.stock;
    this.status = data.status;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  // Business logic methods
  isAvailable(): boolean {
    return this.status === 'available' && this.stock > 0;
  }

  isInStock(): boolean {
    return this.stock > 0;
  }

  canBeOrdered(quantity: number): boolean {
    return this.isAvailable() && this.stock >= quantity;
  }

  getFormattedPrice(): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(this.price);
  }

  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.name.length < 2 || this.name.length > 256) {
      errors.push('Name must be between 2 and 256 characters');
    }

    if (this.price < 0) {
      errors.push('Price cannot be negative');
    }

    if (this.stock < 0) {
      errors.push('Stock cannot be negative');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  static create(data: Omit<Product, 'id' | 'createdAt'>): ProductDomain {
    return new ProductDomain({
      ...data,
      id: 0,
      createdAt: new Date().toISOString(),
    });
  }
}

// ============================================================================
// Order Domain Model
// ============================================================================

export class OrderItemDomain implements OrderItem {
  productId: number;
  quantity: number;
  unitPrice: number;

  constructor(data: OrderItem) {
    this.productId = data.productId;
    this.quantity = data.quantity;
    this.unitPrice = data.unitPrice;
  }

  getTotal(): number {
    return this.quantity * this.unitPrice;
  }
}

export class OrderDomain implements Order {
  id: number;
  userId: number;
  items: OrderItemDomain[];
  total: number;
  status: OrderStatus;
  createdAt: string;
  shippedAt?: string;
  deliveredAt?: string;

  constructor(data: Order) {
    this.id = data.id;
    this.userId = data.userId;
    this.items = data.items.map(item => new OrderItemDomain(item));
    this.total = data.total;
    this.status = data.status;
    this.createdAt = data.createdAt;
    this.shippedAt = data.shippedAt;
    this.deliveredAt = data.deliveredAt;
  }

  // Business logic methods
  isPending(): boolean {
    return this.status === 'pending';
  }

  isShipped(): boolean {
    return this.status === 'shipped';
  }

  isDelivered(): boolean {
    return this.status === 'delivered';
  }

  isCancelled(): boolean {
    return this.status === 'cancelled';
  }

  canBeShipped(): boolean {
    return this.isPending() || this.status === 'confirmed';
  }

  canBeCancelled(): boolean {
    return this.isPending() || this.isShipped();
  }

  calculateTotal(): number {
    return this.items.reduce((sum, item) => sum + item.getTotal(), 0);
  }

  validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.items.length === 0) {
      errors.push('Order must have at least one item');
    }

    if (this.total < 0) {
      errors.push('Total cannot be negative');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  static create(data: Omit<Order, 'id' | 'createdAt' | 'total'>): OrderDomain {
    const items = data.items.map(item => new OrderItemDomain(item));
    const total = items.reduce((sum, item) => sum + item.getTotal(), 0);

    return new OrderDomain({
      ...data,
      id: 0,
      items: data.items,
      total,
      createdAt: new Date().toISOString(),
    });
  }
}

// ============================================================================
// Database Stats Domain Model
// ============================================================================

export class DatabaseStatsDomain implements DatabaseStats {
  type: 'sqlite' | 'duckdb';
  totalRecords: number;
  tableSizes: Record<string, number>;
  lastModified?: string;
  version: string;

  constructor(data: DatabaseStats) {
    this.type = data.type;
    this.totalRecords = data.totalRecords;
    this.tableSizes = data.tableSizes;
    this.lastModified = data.lastModified;
    this.version = data.version;
  }

  getLargestTable(): string {
    return Object.entries(this.tableSizes)
      .sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'unknown';
  }

  getTotalSize(): number {
    return Object.values(this.tableSizes).reduce((sum, size) => sum + size, 0);
  }
}

// ============================================================================
// Migration Progress Domain Model
// ============================================================================

export class MigrationProgressDomain implements MigrationProgress {
  status: 'pending' | 'running' | 'completed' | 'failed';
  currentStep: number;
  totalSteps: number;
  processedRecords: number;
  totalRecords: number;
  percentage: number;
  errors: string[];

  constructor(data: MigrationProgress) {
    this.status = data.status;
    this.currentStep = data.currentStep;
    this.totalSteps = data.totalSteps;
    this.processedRecords = data.processedRecords;
    this.totalRecords = data.totalRecords;
    this.percentage = data.percentage;
    this.errors = data.errors;
  }

  isComplete(): boolean {
    return this.status === 'completed' || this.status === 'failed';
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  getEstimatedRemainingTime(elapsedMs: number): number {
    if (this.percentage === 0) return 0;
    const totalEstimated = (elapsedMs / this.percentage) * 100;
    return totalEstimated - elapsedMs;
  }
}

// ============================================================================
// Sync State Domain Model
// ============================================================================

export class SyncStateDomain implements SyncState {
  status: 'idle' | 'syncing' | 'error';
  connected: boolean;
  lastSync?: string;
  pendingChanges: number;
  lastError?: string;

  constructor(data: SyncState) {
    this.status = data.status;
    this.connected = data.connected;
    this.lastSync = data.lastSync;
    this.pendingChanges = data.pendingChanges;
    this.lastError = data.lastError;
  }

  isHealthy(): boolean {
    return this.connected && this.status !== 'error';
  }

  needsSync(): boolean {
    return this.pendingChanges > 0;
  }

  getTimeSinceLastSync(): number {
    if (!this.lastSync) return Infinity;
    return Date.now() - new Date(this.lastSync).getTime();
  }
}

// ============================================================================
// Sync Event Domain Model
// ============================================================================

export class SyncEventDomain implements SyncEvent {
  id: string;
  type: 'create' | 'update' | 'delete' | 'sync';
  source: 'sqlite' | 'duckdb' | 'websocket';
  timestamp: string;
  data?: unknown;
  status: 'pending' | 'synced' | 'conflict' | 'failed';

  constructor(data: SyncEvent) {
    this.id = data.id;
    this.type = data.type;
    this.source = data.source;
    this.timestamp = data.timestamp;
    this.data = data.data;
    this.status = data.status;
  }

  isPending(): boolean {
    return this.status === 'pending';
  }

  isSynced(): boolean {
    return this.status === 'synced';
  }

  hasConflict(): boolean {
    return this.status === 'conflict';
  }

  isFailed(): boolean {
    return this.status === 'failed';
  }

  static create(
    type: SyncEvent['type'],
    source: SyncEvent['source'],
    data?: unknown
  ): SyncEventDomain {
    return new SyncEventDomain({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      source,
      timestamp: new Date().toISOString(),
      data,
      status: 'pending',
    });
  }
}

// ============================================================================
// Export factory functions
// ============================================================================

export const DomainModels = {
  User: UserDomain,
  Product: ProductDomain,
  Order: OrderDomain,
  OrderItem: OrderItemDomain,
  DatabaseStats: DatabaseStatsDomain,
  MigrationProgress: MigrationProgressDomain,
  SyncState: SyncStateDomain,
  SyncEvent: SyncEventDomain,
};

export type DomainModel = InstanceType<typeof DomainModels[keyof typeof DomainModels]>;

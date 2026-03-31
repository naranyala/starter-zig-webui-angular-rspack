/**
 * Shared API Types
 * 
 * Common types used across the application for API communication
 * These types ensure type safety between frontend and backend
 */

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp?: string;
  correlationId?: string;
}

export interface ApiRequest<T = unknown> {
  action: string;
  payload: T;
  timestamp: string;
  correlationId: string;
}

// ============================================================================
// Pagination Types
// ============================================================================

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

// ============================================================================
// Query Types
// ============================================================================

export interface QueryParams {
  filters?: Record<string, unknown>;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface QueryResult<T> {
  data: T[];
  count: number;
  executedAt: string;
  executionTimeMs: number;
}

// ============================================================================
// Error Types
// ============================================================================

export type ErrorCode = 
  | 'VALIDATION_ERROR'
  | 'DATABASE_ERROR'
  | 'NETWORK_ERROR'
  | 'AUTH_ERROR'
  | 'NOT_FOUND'
  | 'PERMISSION_DENIED'
  | 'INTERNAL_ERROR'
  | 'UNKNOWN_ERROR';

export interface ErrorValue {
  code: ErrorCode;
  message: string;
  details?: Record<string, string>;
  stack?: string;
  timestamp: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string>;
  stack?: string;
  timestamp: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface ValidationErrors {
  success: false;
  errors: ValidationError[];
}

// ============================================================================
// Database Types
// ============================================================================

export type DatabaseType = 'sqlite' | 'duckdb';

export interface DatabaseConnection {
  type: DatabaseType;
  connected: boolean;
  lastSync?: string;
  recordCount: number;
}

export interface DatabaseStats {
  type: DatabaseType;
  totalRecords: number;
  tableSizes: Record<string, number>;
  lastModified?: string;
  version: string;
}

// ============================================================================
// Migration Types
// ============================================================================

export type MigrationDirection = 'sqlite-to-duckdb' | 'duckdb-to-sqlite';
export type MigrationMode = 'full' | 'incremental' | 'sample';
export type MigrationStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface MigrationConfig {
  direction: MigrationDirection;
  mode: MigrationMode;
  batchSize: number;
  verifyData: boolean;
}

export interface MigrationProgress {
  status: MigrationStatus;
  currentStep: number;
  totalSteps: number;
  processedRecords: number;
  totalRecords: number;
  percentage: number;
  errors: string[];
}

export interface MigrationResult {
  success: boolean;
  direction: MigrationDirection;
  mode: MigrationMode;
  totalRecords: number;
  migratedRecords: number;
  failedRecords: number;
  durationMs: number;
  errors: string[];
  timestamp: string;
}

export interface MigrationHistory {
  id: string;
  direction: MigrationDirection;
  mode: MigrationMode;
  records: number;
  duration: number;
  success: boolean;
  timestamp: string;
}

// ============================================================================
// Sync Types
// ============================================================================

export type SyncMode = 'manual' | 'auto';
export type SyncDirection = 'bidirectional' | 'sqlite-to-duckdb' | 'duckdb-to-sqlite';
export type SyncStatus = 'idle' | 'syncing' | 'error';
export type ConflictResolution = 'latest' | 'sqlite' | 'duckdb' | 'manual';

export interface SyncConfig {
  mode: SyncMode;
  direction: SyncDirection;
  autoSyncIntervalMs: number;
  batchSize: number;
  conflictResolution: ConflictResolution;
}

export interface SyncState {
  status: SyncStatus;
  connected: boolean;
  lastSync?: string;
  pendingChanges: number;
  lastError?: string;
}

export interface SyncEvent {
  id: string;
  type: 'create' | 'update' | 'delete' | 'sync';
  source: 'sqlite' | 'duckdb' | 'websocket';
  timestamp: string;
  data?: unknown;
  status: 'pending' | 'synced' | 'conflict' | 'failed';
}

export interface SyncStats {
  totalSyncs: number;
  successfulSyncs: number;
  conflicts: number;
  failedSyncs: number;
  avgSyncTimeMs: number;
  lastSyncDurationMs: number;
}

// ============================================================================
// Benchmark Types
// ============================================================================

export type BenchmarkOperation = 'insert' | 'select' | 'update' | 'delete' | 'aggregation';

export interface BenchmarkConfig {
  operations: BenchmarkOperation[];
  iterations: number;
  warmupIterations: number;
  recordCount: number;
}

export interface BenchmarkResult {
  operation: string;
  sqliteMs: number;
  duckdbMs: number;
  winner: 'SQLite' | 'DuckDB' | 'Tie';
  speedup: number;
  iterations: number;
}

export interface BenchmarkSummary {
  sqliteWins: number;
  duckdbWins: number;
  ties: number;
  totalOperations: number;
  results: BenchmarkResult[];
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface AnalyticsQuery {
  query: string;
  params?: unknown[];
  database: DatabaseType;
}

export interface AnalyticsResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
}

export interface AgeDistribution {
  ageGroup: string;
  count: number;
  percentage: number;
}

export interface StatusDistribution {
  status: string;
  count: number;
  percentage: number;
}

export interface UserAnalytics {
  totalUsers: number;
  activeUsers: number;
  avgAge: number;
  ageDistribution: AgeDistribution[];
  statusDistribution: StatusDistribution[];
}

// ============================================================================
// User Types
// ============================================================================

export type UserStatus = 'active' | 'inactive' | 'pending' | 'suspended';

export interface User {
  id: number;
  name: string;
  email: string;
  age: number;
  status: UserStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  age: number;
  status: UserStatus;
}

export interface UpdateUserRequest {
  id: number;
  name?: string;
  email?: string;
  age?: number;
  status?: UserStatus;
}

export interface DeleteUserRequest {
  id: number;
}

// ============================================================================
// Product Types
// ============================================================================

export type ProductStatus = 'available' | 'unavailable' | 'discontinued';

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  status: ProductStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateProductRequest {
  name: string;
  description: string;
  price: number;
  stock: number;
  status: ProductStatus;
}

// ============================================================================
// Order Types
// ============================================================================

export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export interface OrderItem {
  productId: number;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: number;
  userId: number;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: string;
  shippedAt?: string;
  deliveredAt?: string;
}

export interface CreateOrderRequest {
  userId: number;
  items: OrderItem[];
}

// ============================================================================
// Health Check Types
// ============================================================================

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  timestamp: string;
  services: ServiceHealth[];
}

export interface ServiceHealth {
  name: string;
  status: 'up' | 'down' | 'degraded';
  responseTimeMs?: number;
  message?: string;
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface AppConfig {
  appName: string;
  version: string;
  environment: 'development' | 'production' | 'test';
  debug: boolean;
  features: FeatureFlags;
}

export interface FeatureFlags {
  enableSync: boolean;
  enableMigration: boolean;
  enableBenchmark: boolean;
  enableAnalytics: boolean;
  enableDevTools: boolean;
}

// ============================================================================
// Utility Types
// ============================================================================

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type AsyncResult<T> = Promise<ApiResponse<T>>;

export interface Timestamped<T> {
  data: T;
  timestamp: string;
}

export interface NamedEntity {
  id: number | string;
  name: string;
}

export interface Auditable {
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

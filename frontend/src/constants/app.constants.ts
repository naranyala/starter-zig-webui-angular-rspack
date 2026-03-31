/**
 * Application Constants
 * 
 * Centralized configuration and constants for the application
 */

// ============================================================================
// Application Info
// ============================================================================

export const APP_INFO = {
  name: 'Zig WebUI Angular Rspack',
  version: '1.0.0',
  author: 'Development Team',
  description: 'Modern desktop application with Zig backend and Angular frontend',
} as const;

// ============================================================================
// API Configuration
// ============================================================================

export const API_CONFIG = {
  defaultTimeoutMs: 30000,
  retryAttempts: 3,
  retryDelayMs: 1000,
  httpBaseUrl: '/api',
  websocketReconnectIntervalMs: 5000,
} as const;

// ============================================================================
// Database Configuration
// ============================================================================

export const DATABASE_CONFIG = {
  sqlite: {
    filename: 'app.db',
    defaultPageSize: 4096,
    maxConnections: 1,
  },
  duckdb: {
    filename: 'app.duckdb',
    defaultPageSize: 8192,
    maxConnections: 1,
  },
} as const;

// ============================================================================
// UI Configuration
// ============================================================================

export const UI_CONFIG = {
  animationDurationMs: 300,
  debounceTimeMs: 300,
  throttleTimeMs: 1000,
  toastDurationMs: 5000,
  confirmDialogDefault: {
    title: 'Confirm Action',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
  },
} as const;

// ============================================================================
// Pagination Configuration
// ============================================================================

export const PAGINATION_CONFIG = {
  defaultPageSize: 10,
  pageSizeOptions: [5, 10, 25, 50, 100],
  maxPageSize: 100,
  defaultPage: 1,
} as const;

// ============================================================================
// Validation Configuration
// ============================================================================

export const VALIDATION_CONFIG = {
  user: {
    name: {
      minLength: 2,
      maxLength: 256,
    },
    email: {
      maxLength: 320,
    },
    age: {
      min: 0,
      max: 150,
    },
    status: {
      maxLength: 64,
      allowedValues: ['active', 'inactive', 'pending', 'suspended'],
    },
  },
  product: {
    name: {
      minLength: 2,
      maxLength: 256,
    },
    description: {
      maxLength: 2000,
    },
    price: {
      min: 0,
      max: 999999.99,
    },
    stock: {
      min: 0,
      max: 999999,
    },
  },
  query: {
    maxLength: 4096,
    maxExecutionTimeMs: 30000,
  },
} as const;

// ============================================================================
// Migration Configuration
// ============================================================================

export const MIGRATION_CONFIG = {
  defaultBatchSize: 50,
  batchSizeOptions: [10, 50, 100, 500],
  maxBatchSize: 1000,
  sampleSize: 100,
  defaultMode: 'full' as const,
  verifyData: true,
  maxRetries: 3,
  retryDelayMs: 1000,
} as const;

// ============================================================================
// Sync Configuration
// ============================================================================

export const SYNC_CONFIG = {
  defaultMode: 'manual' as const,
  defaultIntervalMs: 5000,
  intervalOptions: [
    { value: 5000, label: '5 seconds' },
    { value: 10000, label: '10 seconds' },
    { value: 30000, label: '30 seconds' },
    { value: 60000, label: '1 minute' },
  ],
  defaultBatchSize: 50,
  maxPendingChanges: 1000,
  conflictResolution: 'latest' as const,
} as const;

// ============================================================================
// Benchmark Configuration
// ============================================================================

export const BENCHMARK_CONFIG = {
  defaultIterations: 10,
  warmupIterations: 3,
  defaultRecordCount: 100,
  recordCountOptions: [10, 50, 100, 500, 1000],
  operations: ['insert', 'select', 'update', 'delete', 'aggregation'] as const,
} as const;

// ============================================================================
// Logging Configuration
// ============================================================================

export const LOGGING_CONFIG = {
  level: 'info' as const,
  levels: ['debug', 'info', 'warn', 'error'] as const,
  maxHistorySize: 1000,
  includeTimestamp: true,
  includeStackTrace: true,
} as const;

// ============================================================================
// Feature Flags
// ============================================================================

export const FEATURE_FLAGS = {
  enableSync: true,
  enableMigration: true,
  enableBenchmark: true,
  enableAnalytics: true,
  enableDevTools: true,
  enableDarkMode: true,
  enableNotifications: true,
} as const;

// ============================================================================
// Route Paths
// ============================================================================

export const ROUTES = {
  home: '',
  dashboard: 'dashboard',
  docs: 'docs',
  sqlite: 'sqlite',
  duckdb: 'duckdb',
  migration: 'migration',
  sync: 'sync',
  benchmark: 'benchmark',
  settings: 'settings',
} as const;

// ============================================================================
// Storage Keys
// ============================================================================

export const STORAGE_KEYS = {
  theme: 'app_theme',
  language: 'app_language',
  userPreferences: 'app_preferences',
  syncConfig: 'sync_config',
  migrationConfig: 'migration_config',
  lastView: 'last_view',
} as const;

// ============================================================================
// Event Names
// ============================================================================

export const EVENT_NAMES = {
  // API events
  apiResponse: (action: string) => `${action}_response`,
  
  // Sync events
  syncStart: 'sync_start',
  syncComplete: 'sync_complete',
  syncError: 'sync_error',
  
  // Migration events
  migrationStart: 'migration_start',
  migrationProgress: 'migration_progress',
  migrationComplete: 'migration_complete',
  migrationError: 'migration_error',
  
  // Database events
  databaseConnect: 'database_connect',
  databaseDisconnect: 'database_disconnect',
  databaseError: 'database_error',
  
  // UI events
  themeChange: 'theme_change',
  languageChange: 'language_change',
  viewChange: 'view_change',
} as const;

// ============================================================================
// CSS Classes
// ============================================================================

export const CSS_CLASSES = {
  loading: 'loading',
  error: 'error',
  success: 'success',
  warning: 'warning',
  active: 'active',
  disabled: 'disabled',
  hidden: 'hidden',
  visible: 'visible',
} as const;

// ============================================================================
// Key Codes
// ============================================================================

export const KEY_CODES = {
  enter: 'Enter',
  escape: 'Escape',
  tab: 'Tab',
  space: 'Space',
  arrowUp: 'ArrowUp',
  arrowDown: 'ArrowDown',
  arrowLeft: 'ArrowLeft',
  arrowRight: 'ArrowRight',
} as const;

// ============================================================================
// Time Constants
// ============================================================================

export const TIME_CONSTANTS = {
  oneSecond: 1000,
  oneMinute: 60000,
  oneHour: 3600000,
  oneDay: 86400000,
  oneWeek: 604800000,
} as const;

// ============================================================================
// Export combined config
// ============================================================================

export const APP_CONFIG = {
  app: APP_INFO,
  api: API_CONFIG,
  database: DATABASE_CONFIG,
  ui: UI_CONFIG,
  pagination: PAGINATION_CONFIG,
  validation: VALIDATION_CONFIG,
  migration: MIGRATION_CONFIG,
  sync: SYNC_CONFIG,
  benchmark: BENCHMARK_CONFIG,
  logging: LOGGING_CONFIG,
  features: FEATURE_FLAGS,
  routes: ROUTES,
  storage: STORAGE_KEYS,
  events: EVENT_NAMES,
  css: CSS_CLASSES,
  keys: KEY_CODES,
  time: TIME_CONSTANTS,
} as const;

export type AppConfig = typeof APP_CONFIG;

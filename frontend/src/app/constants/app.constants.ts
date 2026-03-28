export const APP_CONSTANTS = {
  TIMEOUT: {
    DEFAULT: 30000,
    SHORT: 5000,
    LONG: 60000,
  },
  SYNC: {
    INTERVAL_MS: 5000,
    DEBOUNCE_MS: 300,
  },
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
  },
  STORAGE: {
    KEY_PREFIX: 'app_',
    VERSION: 'v1',
  },
  API: {
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
  },
} as const;

export const COLORS = {
  PRIMARY: '#3b82f6',
  SUCCESS: '#10b981',
  WARNING: '#f59e0b',
  ERROR: '#ef4444',
  INFO: '#06b6d4',
  MUTED: '#64748b',
  BORDER: 'rgba(148, 163, 184, 0.1)',
  CARD_BG: 'rgba(30, 41, 59, 0.5)',
} as const;

export const DEFAULT_TIMEOUT_MS = APP_CONSTANTS.TIMEOUT.DEFAULT;
export const STATE_SYNC_INTERVAL_MS = APP_CONSTANTS.SYNC.INTERVAL_MS;

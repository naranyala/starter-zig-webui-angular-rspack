/**
 * Format Utilities
 * 
 * Reusable formatting functions for displaying data
 */

// ============================================================================
// Number Formatting
// ============================================================================

export function formatNumber(
  value: number,
  options: {
    decimals?: number;
    thousandSeparator?: boolean;
    locale?: string;
  } = {}
): string {
  const {
    decimals = 0,
    thousandSeparator = true,
    locale = 'en-US',
  } = options;

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: thousandSeparator,
  }).format(value);
}

export function formatInteger(value: number, locale = 'en-US'): string {
  return formatNumber(value, { decimals: 0, locale });
}

export function formatDecimal(value: number, decimals = 2, locale = 'en-US'): string {
  return formatNumber(value, { decimals, locale });
}

export function formatPercentage(value: number, decimals = 1, locale = 'en-US'): string {
  return formatNumber(value * 100, { decimals, locale }) + '%';
}

// ============================================================================
// Currency Formatting
// ============================================================================

export function formatCurrency(
  value: number,
  options: {
    currency?: string;
    locale?: string;
  } = {}
): string {
  const { currency = 'USD', locale = 'en-US' } = options;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatUSD(value: number, locale = 'en-US'): string {
  return formatCurrency(value, { currency: 'USD', locale });
}

export function formatEUR(value: number, locale = 'en-US'): string {
  return formatCurrency(value, { currency: 'EUR', locale });
}

// ============================================================================
// Date Formatting
// ============================================================================

export function formatDate(
  value: string | number | Date,
  options: {
    format?: 'short' | 'medium' | 'long' | 'full';
    locale?: string;
    timeZone?: string;
  } = {}
): string {
  const { format = 'medium', locale = 'en-US', timeZone } = options;
  const date = new Date(value);

  const formatOptionsMap: Record<string, Intl.DateTimeFormatOptions> = {
    short: { year: '2-digit', month: 'numeric', day: 'numeric' },
    medium: { year: 'numeric', month: 'short', day: 'numeric' },
    long: { year: 'numeric', month: 'long', day: 'numeric' },
    full: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' },
  };

  return new Intl.DateTimeFormat(locale, {
    ...formatOptionsMap[format],
    timeZone,
  }).format(date);
}

export function formatDateTime(
  value: string | number | Date,
  options: {
    showSeconds?: boolean;
    hour12?: boolean;
    locale?: string;
    timeZone?: string;
  } = {}
): string {
  const { showSeconds = true, hour12 = true, locale = 'en-US', timeZone } = options;
  const date = new Date(value);

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: showSeconds ? 'numeric' : undefined,
    hour12,
    timeZone,
  }).format(date);
}

export function formatTime(
  value: string | number | Date,
  options: {
    showSeconds?: boolean;
    hour12?: boolean;
    locale?: string;
  } = {}
): string {
  const { showSeconds = true, hour12 = true, locale = 'en-US' } = options;
  const date = new Date(value);

  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: 'numeric',
    second: showSeconds ? 'numeric' : undefined,
    hour12,
  }).format(date);
}

export function formatRelativeTime(
  value: string | number | Date,
  locale = 'en-US'
): string {
  const date = new Date(value);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffSecs = Math.round(diffMs / 1000);
  const diffMins = Math.round(diffSecs / 60);
  const diffHours = Math.round(diffMins / 60);
  const diffDays = Math.round(diffHours / 24);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (Math.abs(diffDays) >= 1) {
    return rtf.format(diffDays, 'day');
  } else if (Math.abs(diffHours) >= 1) {
    return rtf.format(diffHours, 'hour');
  } else if (Math.abs(diffMins) >= 1) {
    return rtf.format(diffMins, 'minute');
  } else {
    return rtf.format(diffSecs, 'second');
  }
}

export function formatAge(birthDate: string | Date, locale = 'en-US'): string {
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--;
  }

  return formatInteger(age, locale);
}

// ============================================================================
// Duration Formatting
// ============================================================================

export function formatDuration(
  milliseconds: number,
  options: {
    verbose?: boolean;
    maxUnits?: number;
  } = {}
): string {
  const { verbose = false, maxUnits = 2 } = options;

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const units: { value: number; label: string; short: string }[] = [
    { value: days, label: 'day', short: 'd' },
    { value: hours % 24, label: 'hour', short: 'h' },
    { value: minutes % 60, label: 'minute', short: 'm' },
    { value: seconds % 60, label: 'second', short: 's' },
  ];

  const result = units
    .filter(u => u.value > 0)
    .slice(0, maxUnits)
    .map(u => {
      if (verbose) {
        return `${u.value} ${u.label}${u.value !== 1 ? 's' : ''}`;
      }
      return `${u.value}${u.short}`;
    });

  if (result.length === 0) {
    return verbose ? '0 seconds' : '0s';
  }

  return verbose ? result.join(', ') : result.join(' ');
}

export function formatExecutionTime(milliseconds: number): string {
  if (milliseconds < 1) {
    return `${Math.round(milliseconds * 1000)}μs`;
  } else if (milliseconds < 1000) {
    return `${milliseconds.toFixed(2)}ms`;
  } else {
    return `${(milliseconds / 1000).toFixed(2)}s`;
  }
}

// ============================================================================
// File Size Formatting
// ============================================================================

export function formatFileSize(
  bytes: number,
  options: {
    decimals?: number;
    binary?: boolean;
  } = {}
): string {
  const { decimals = 1, binary = false } = options;
  
  const units = binary
    ? ['B', 'KiB', 'MiB', 'GiB', 'TiB']
    : ['B', 'KB', 'MB', 'GB', 'TB'];
  
  const base = binary ? 1024 : 1000;

  if (bytes === 0) return '0 B';

  const exponent = Math.floor(Math.log(bytes) / Math.log(base));
  const value = bytes / Math.pow(base, exponent);

  return `${value.toFixed(decimals)} ${units[exponent]}`;
}

// ============================================================================
// String Formatting
// ============================================================================

export function truncate(
  value: string,
  length: number,
  options: {
    suffix?: string;
    wordBoundary?: boolean;
  } = {}
): string {
  const { suffix = '...', wordBoundary = false } = options;

  if (value.length <= length) return value;

  if (!wordBoundary) {
    return value.slice(0, length) + suffix;
  }

  const truncated = value.slice(0, length);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace === -1) {
    return truncated + suffix;
  }

  return truncated.slice(0, lastSpace) + suffix;
}

export function capitalize(value: string): string {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export function titleCase(value: string): string {
  if (!value) return '';
  return value
    .split(' ')
    .map(word => capitalize(word))
    .join(' ');
}

export function camelCase(value: string): string {
  return value
    .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
    .replace(/^[A-Z]/, char => char.toLowerCase());
}

export function snakeCase(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .toLowerCase();
}

export function kebabCase(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[-_\s]+/g, '-')
    .toLowerCase();
}

// ============================================================================
// Status Formatting
// ============================================================================

export function formatStatus(value: string): string {
  return titleCase(value.replace(/[-_]/g, ' '));
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: '#10b981',
    available: '#10b981',
    confirmed: '#10b981',
    shipped: '#3b82f6',
    delivered: '#10b981',
    pending: '#f59e0b',
    inactive: '#94a3b8',
    unavailable: '#94a3b8',
    suspended: '#ef4444',
    cancelled: '#ef4444',
    failed: '#ef4444',
    error: '#ef4444',
    synced: '#10b981',
    conflict: '#f59e0b',
  };

  return colors[status.toLowerCase()] || '#64748b';
}

export function getStatusIcon(status: string): string {
  const icons: Record<string, string> = {
    active: '✅',
    available: '✅',
    confirmed: '✅',
    delivered: '✅',
    synced: '✅',
    pending: '⏳',
    inactive: '⏸️',
    unavailable: '⏸️',
    suspended: '⛔',
    cancelled: '❌',
    failed: '❌',
    error: '❌',
    conflict: '⚠️',
    shipped: '📦',
    running: '🔄',
    completed: '✅',
  };

  return icons[status.toLowerCase()] || '📄';
}

// ============================================================================
// Database Formatting
// ============================================================================

export function formatDatabaseType(type: string): string {
  const names: Record<string, string> = {
    sqlite: 'SQLite',
    duckdb: 'DuckDB',
  };

  return names[type.toLowerCase()] || type;
}

export function formatDatabaseIcon(type: string): string {
  const icons: Record<string, string> = {
    sqlite: '🗄️',
    duckdb: '🦆',
  };

  return icons[type.toLowerCase()] || '💾';
}

// ============================================================================
// Record Count Formatting
// ============================================================================

export function formatRecordCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  } else if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

// ============================================================================
// Exports
// ============================================================================

export const Formatters = {
  // Number
  formatNumber,
  formatInteger,
  formatDecimal,
  formatPercentage,
  
  // Currency
  formatCurrency,
  formatUSD,
  formatEUR,
  
  // Date
  formatDate,
  formatDateTime,
  formatTime,
  formatRelativeTime,
  formatAge,
  
  // Duration
  formatDuration,
  formatExecutionTime,
  
  // File Size
  formatFileSize,
  
  // String
  truncate,
  capitalize,
  titleCase,
  camelCase,
  snakeCase,
  kebabCase,
  
  // Status
  formatStatus,
  getStatusColor,
  getStatusIcon,
  
  // Database
  formatDatabaseType,
  formatDatabaseIcon,
  
  // Record Count
  formatRecordCount,
};

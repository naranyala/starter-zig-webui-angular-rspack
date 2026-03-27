/**
 * Data Shape Utilities
 * 
 * General-purpose data manipulation utilities
 */

/**
 * Deep clone any data structure
 */
export function cloneDeep<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

/**
 * Get data type
 */
export function getDataType(value: any): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return 'array';
  if (value instanceof Date) return 'date';
  return typeof value;
}

/**
 * Check if plain object
 */
export function isPlainObject(value: any): boolean {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Check if array
 */
export function isArray(value: any): value is any[] {
  return Array.isArray(value);
}

/**
 * Check if primitive
 */
export function isPrimitive(value: any): boolean {
  return value === null || value === undefined || 
         typeof value === 'string' || typeof value === 'number' || 
         typeof value === 'boolean';
}

/**
 * Get data size
 */
export function getSize(value: any): number {
  if (Array.isArray(value)) return value.length;
  if (typeof value === 'string') return value.length;
  if (isPlainObject(value)) return Object.keys(value).length;
  return 0;
}

/**
 * Check if empty
 */
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'string') return value.length === 0;
  if (isPlainObject(value)) return Object.keys(value).length === 0;
  return false;
}

/**
 * Get nested value by path
 */
export function getByPath<T>(obj: T, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj as any);
}

/**
 * Set nested value by path
 */
export function setByPath<T>(obj: T, path: string, value: any): void {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  const target = keys.reduce((current, key) => {
    if (!current[key]) current[key] = {};
    return current[key];
  }, obj as any);
  target[lastKey] = value;
}

/**
 * Delete nested value by path
 */
export function deleteByPath<T>(obj: T, path: string): boolean {
  const value = getByPath(obj, path);
  if (value !== undefined) {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      return current && current[key] ? current[key] : null;
    }, obj as any);
    if (target) {
      delete target[lastKey];
      return true;
    }
  }
  return false;
}

/**
 * Check if path exists
 */
export function hasPath<T>(obj: T, path: string): boolean {
  return getByPath(obj, path) !== undefined;
}

/**
 * Transform keys recursively
 */
export function transformKeys<T>(data: T, transform: (key: string) => string): any {
  if (Array.isArray(data)) {
    return data.map(item => transformKeys(item, transform));
  }
  if (isPlainObject(data)) {
    const result: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        result[transform(key)] = transformKeys((data as any)[key], transform);
      }
    }
    return result;
  }
  return data;
}

/**
 * Transform values recursively
 */
export function transformValues<T>(data: T, transform: (value: any) => any): any {
  if (Array.isArray(data)) {
    return data.map(item => transformValues(item, transform));
  }
  if (isPlainObject(data)) {
    const result: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        result[key] = transformValues((data as any)[key], transform);
      }
    }
    return result;
  }
  return transform(data);
}

/**
 * Filter recursively
 */
export function filterDeep<T>(data: T, predicate: (key: string, value: any) => boolean): any {
  if (Array.isArray(data)) {
    return data.filter(item => filterDeep(item, predicate));
  }
  if (isPlainObject(data)) {
    const result: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key) && predicate(key, (data as any)[key])) {
        result[key] = filterDeep((data as any)[key], predicate);
      }
    }
    return result;
  }
  return data;
}

/**
 * Convert to plain object
 */
export function toPlainObject<T>(data: T): any {
  return JSON.parse(JSON.stringify(data));
}

/**
 * Convert to JSON-safe (remove circular refs, functions, etc.)
 */
export function toJsonSafe<T>(data: T): any {
  return JSON.parse(JSON.stringify(data, (key, value) => {
    if (typeof value === 'function') return undefined;
    if (value instanceof Date) return value.toISOString();
    if (value instanceof Map) return Array.from(value.entries());
    if (value instanceof Set) return Array.from(value.values());
    return value;
  }));
}

/**
 * Remove undefined values
 */
export function removeUndefined<T>(data: T): any {
  if (Array.isArray(data)) {
    return data.filter(item => item !== undefined).map(item => removeUndefined(item));
  }
  if (isPlainObject(data)) {
    const result: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key) && (data as any)[key] !== undefined) {
        result[key] = removeUndefined((data as any)[key]);
      }
    }
    return result;
  }
  return data;
}

/**
 * Remove null values
 */
export function removeNull<T>(data: T): any {
  if (Array.isArray(data)) {
    return data.filter(item => item !== null).map(item => removeNull(item));
  }
  if (isPlainObject(data)) {
    const result: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key) && (data as any)[key] !== null) {
        result[key] = removeNull((data as any)[key]);
      }
    }
    return result;
  }
  return data;
}

/**
 * Compact (remove falsy values: null, undefined, false, 0, '')
 */
export function compact<T>(data: T): any {
  if (Array.isArray(data)) {
    return data.filter(item => item).map(item => compact(item));
  }
  if (isPlainObject(data)) {
    const result: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key) && (data as any)[key]) {
        result[key] = compact((data as any)[key]);
      }
    }
    return result;
  }
  return data;
}

/**
 * Merge objects
 */
export function merge<T>(target: T, source: Partial<T>): T {
  return { ...target, ...source };
}

/**
 * Deep merge objects
 */
export function mergeDeep<T>(target: T, source: Partial<T>): T {
  const result = { ...target } as any;
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = (source as any)[key];
      const targetValue = (target as any)[key];
      if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
        result[key] = mergeDeep(targetValue, sourceValue);
      } else {
        result[key] = sourceValue;
      }
    }
  }
  return result;
}

/**
 * Pick specific keys
 */
export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Omit specific keys
 */
export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj } as any;
  for (const key of keys) {
    delete result[key];
  }
  return result;
}

/**
 * Array Transform Service
 * 
 * Array/collection transformation utilities following JavaScript patterns
 */
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ArrayTransformService {
  private skipNulls = true;
  private deduplicate = false;

  constructor() {}

  /**
   * Map array (like Array.map)
   */
  map<T, U>(arr: T[], transform: (item: T, index: number) => U): U[] {
    return arr.map(transform);
  }

  /**
   * Map integers
   */
  mapInt(arr: number[], transform: (item: number) => number): number[] {
    return arr.map(transform);
  }

  /**
   * Map doubles
   */
  mapDouble(arr: number[], transform: (item: number) => number): number[] {
    return arr.map(transform);
  }

  /**
   * Map strings
   */
  mapString(arr: string[], transform: (item: string) => string): string[] {
    return arr.map(transform);
  }

  /**
   * Filter array (like Array.filter)
   */
  filter<T>(arr: T[], predicate: (item: T) => boolean): T[] {
    let filtered = arr.filter(predicate);
    if (this.skipNulls) {
      filtered = filtered.filter(item => item !== null && item !== undefined);
    }
    if (this.deduplicate) {
      filtered = this.unique(filtered);
    }
    return filtered;
  }

  /**
   * Filter integers
   */
  filterInt(arr: number[], predicate: (item: number) => boolean): number[] {
    return this.filter(arr, predicate);
  }

  /**
   * Filter strings
   */
  filterString(arr: string[], predicate: (item: string) => boolean): string[] {
    return this.filter(arr, predicate);
  }

  /**
   * Reduce array (like Array.reduce)
   */
  reduce<T, U>(arr: T[], initial: U, reducer: (acc: U, item: T) => U): U {
    return arr.reduce(reducer, initial);
  }

  /**
   * Reduce integers
   */
  reduceInt(arr: number[], initial: number, reducer: (acc: number, item: number) => number): number {
    return arr.reduce(reducer, initial);
  }

  /**
   * Reduce doubles
   */
  reduceDouble(arr: number[], initial: number, reducer: (acc: number, item: number) => number): number {
    return arr.reduce(reducer, initial);
  }

  /**
   * Sort array (like Array.sort)
   */
  sort<T>(arr: T[], compare: (a: T, b: T) => number): T[] {
    return [...arr].sort(compare);
  }

  /**
   * Sort integers
   */
  sortInt(arr: number[], ascending: boolean = true): number[] {
    return [...arr].sort((a, b) => ascending ? a - b : b - a);
  }

  /**
   * Sort doubles
   */
  sortDouble(arr: number[], ascending: boolean = true): number[] {
    return [...arr].sort((a, b) => ascending ? a - b : b - a);
  }

  /**
   * Sort strings
   */
  sortString(arr: string[], ascending: boolean = true): string[] {
    return [...arr].sort((a, b) => ascending ? a.localeCompare(b) : b.localeCompare(a));
  }

  /**
   * Get unique values (like [...new Set()])
   */
  unique<T>(arr: T[]): T[] {
    return Array.from(new Set(arr));
  }

  /**
   * Get unique integers
   */
  uniqueInt(arr: number[]): number[] {
    return this.unique(arr);
  }

  /**
   * Get unique strings
   */
  uniqueString(arr: string[]): string[] {
    return this.unique(arr);
  }

  /**
   * Chunk array (like _.chunk)
   */
  chunk<T>(arr: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += chunkSize) {
      chunks.push(arr.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Chunk integers
   */
  chunkInt(arr: number[], chunkSize: number): number[][] {
    return this.chunk(arr, chunkSize);
  }

  /**
   * Flatten array (like Array.flat)
   */
  flatten<T>(arr: T[][]): T[] {
    return arr.flat();
  }

  /**
   * Flatten deeply (like Array.flat with depth)
   */
  flattenDeep<T>(arr: any[], depth: number = 1): T[] {
    return arr.flat(depth);
  }

  /**
   * Concatenate arrays
   */
  concat<T>(...arrays: T[][]): T[] {
    return arrays.reduce((acc, arr) => [...acc, ...arr], [] as T[]);
  }

  /**
   * Zip arrays together
   */
  zip<T, U>(arr1: T[], arr2: U[]): [T, U][] {
    const minLength = Math.min(arr1.length, arr2.length);
    const result: [T, U][] = [];
    for (let i = 0; i < minLength; i++) {
      result.push([arr1[i], arr2[i]]);
    }
    return result;
  }

  /**
   * Union of arrays
   */
  union<T>(...arrays: T[][]): T[] {
    return this.unique(arrays.reduce((acc, arr) => [...acc, ...arr], []));
  }

  /**
   * Intersection of arrays
   */
  intersection<T>(arr1: T[], arr2: T[]): T[] {
    const set2 = new Set(arr2);
    return arr1.filter(item => set2.has(item));
  }

  /**
   * Difference of arrays (arr1 - arr2)
   */
  difference<T>(arr1: T[], arr2: T[]): T[] {
    const set2 = new Set(arr2);
    return arr1.filter(item => !set2.has(item));
  }

  /**
   * Find first matching element (like Array.find)
   */
  find<T>(arr: T[], predicate: (item: T) => boolean): T | undefined {
    return arr.find(predicate);
  }

  /**
   * Find index of first matching element (like Array.findIndex)
   */
  findIndex<T>(arr: T[], predicate: (item: T) => boolean): number {
    return arr.findIndex(predicate);
  }

  /**
   * Find last matching element (like Array.findLast)
   */
  findLast<T>(arr: T[], predicate: (item: T) => boolean): T | undefined {
    for (let i = arr.length - 1; i >= 0; i--) {
      if (predicate(arr[i])) return arr[i];
    }
    return undefined;
  }

  /**
   * Check if all elements match (like Array.every)
   */
  every<T>(arr: T[], predicate: (item: T) => boolean): boolean {
    return arr.every(predicate);
  }

  /**
   * Check if any element matches (like Array.some)
   */
  some<T>(arr: T[], predicate: (item: T) => boolean): boolean {
    return arr.some(predicate);
  }

  /**
   * Check if array includes value (like Array.includes)
   */
  includes<T>(arr: T[], value: T): boolean {
    return arr.includes(value);
  }

  /**
   * Get array length
   */
  length<T>(arr: T[]): number {
    return arr.length;
  }

  /**
   * Check if array is empty
   */
  isEmpty<T>(arr: T[]): boolean {
    return arr.length === 0;
  }

  /**
   * Get first element
   */
  first<T>(arr: T[]): T | undefined {
    return arr[0];
  }

  /**
   * Get last element
   */
  last<T>(arr: T[]): T | undefined {
    return arr[arr.length - 1];
  }

  /**
   * Get element at index
   */
  at<T>(arr: T[], index: number): T | undefined {
    return arr.at(index);
  }

  /**
   * Get min value
   */
  min(arr: number[]): number | undefined {
    return arr.length === 0 ? undefined : Math.min(...arr);
  }

  /**
   * Get max value
   */
  max(arr: number[]): number | undefined {
    return arr.length === 0 ? undefined : Math.max(...arr);
  }

  /**
   * Get sum
   */
  sum(arr: number[]): number {
    return arr.reduce((a, b) => a + b, 0);
  }

  /**
   * Get average
   */
  average(arr: number[]): number | undefined {
    if (arr.length === 0) return undefined;
    return this.sum(arr) / arr.length;
  }
}

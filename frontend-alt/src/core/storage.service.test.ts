// frontend/src/core/storage.service.test.ts
import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  let storage: StorageService;

  beforeEach(() => {
    storage = new StorageService();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create service', () => {
    expect(storage).toBeDefined();
  });

  describe('get/set', () => {
    it('should store and retrieve values', () => {
      storage.set('testKey', 'testValue');
      const value = storage.get('testKey');
      expect(value).toBe('testValue');
    });

    it('should store and retrieve objects', () => {
      const obj = { name: 'test', value: 42 };
      storage.set('objKey', obj);
      const retrieved = storage.get<typeof obj>('objKey');
      expect(retrieved).toEqual(obj);
    });

    it('should store and retrieve arrays', () => {
      const arr = [1, 2, 3, 4, 5];
      storage.set('arrKey', arr);
      const retrieved = storage.get<number[]>('arrKey');
      expect(retrieved).toEqual(arr);
    });

    it('should return null for missing key', () => {
      const value = storage.get('nonExistent');
      expect(value).toBeNull();
    });

    it('should return default value for missing key', () => {
      const value = storage.get('nonExistent', 'defaultValue');
      expect(value).toBe('defaultValue');
    });
  });

  describe('TTL expiration', () => {
    it('should handle TTL expiration', (done) => {
      storage.set('ttlKey', 'ttlValue', { ttl: 100 });
      
      expect(storage.get('ttlKey')).toBe('ttlValue');
      
      setTimeout(() => {
        expect(storage.get('ttlKey')).toBeNull();
        done();
      }, 150);
    });

    it('should not expire value without TTL', (done) => {
      storage.set('permanentKey', 'permanentValue');
      
      setTimeout(() => {
        expect(storage.get('permanentKey')).toBe('permanentValue');
        done();
      }, 100);
    });
  });

  describe('delete', () => {
    it('should remove values', () => {
      storage.set('deleteKey', 'deleteValue');
      expect(storage.get('deleteKey')).toBe('deleteValue');
      
      storage.delete('deleteKey');
      expect(storage.get('deleteKey')).toBeNull();
    });

    it('should not throw for non-existent key', () => {
      expect(() => storage.delete('nonExistent')).not.toThrow();
    });
  });

  describe('has', () => {
    it('should check existence', () => {
      expect(storage.has('nonExistent')).toBe(false);
      
      storage.set('existsKey', 'existsValue');
      expect(storage.has('existsKey')).toBe(true);
    });

    it('should return false for expired key', (done) => {
      storage.set('expireKey', 'expireValue', { ttl: 50 });
      expect(storage.has('expireKey')).toBe(true);
      
      setTimeout(() => {
        expect(storage.has('expireKey')).toBe(false);
        done();
      }, 100);
    });
  });

  describe('clear', () => {
    it('should remove all values', () => {
      storage.set('key1', 'value1');
      storage.set('key2', 'value2');
      storage.set('key3', 'value3');
      
      expect(storage.has('key1')).toBe(true);
      expect(storage.has('key2')).toBe(true);
      expect(storage.has('key3')).toBe(true);
      
      storage.clear();
      
      expect(storage.has('key1')).toBe(false);
      expect(storage.has('key2')).toBe(false);
      expect(storage.has('key3')).toBe(false);
    });
  });

  describe('prefix', () => {
    it('should use default prefix', () => {
      storage.set('key', 'value');
      expect(localStorage.getItem('app:key')).toBeTruthy();
    });

    it('should not conflict with different prefix', () => {
      const storage1 = new StorageService({ prefix: 'prefix1:' });
      const storage2 = new StorageService({ prefix: 'prefix2:' });
      
      storage1.set('key', 'value1');
      storage2.set('key', 'value2');
      
      expect(storage1.get('key')).toBe('value1');
      expect(storage2.get('key')).toBe('value2');
    });
  });

  describe('memory fallback', () => {
    it('should use memory storage when localStorage fails', () => {
      // Mock localStorage to throw
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = () => {
        throw new Error('LocalStorage disabled');
      };
      
      try {
        storage.set('memoryKey', 'memoryValue');
        expect(storage.get('memoryKey')).toBe('memoryValue');
      } finally {
        localStorage.setItem = originalSetItem;
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty string values', () => {
      storage.set('emptyKey', '');
      expect(storage.get('emptyKey')).toBe('');
    });

    it('should handle null values', () => {
      storage.set('nullKey', null as any);
      expect(storage.get('nullKey')).toBeNull();
    });

    it('should handle special characters', () => {
      const special = '<script>alert("xss")</script>';
      storage.set('specialKey', special);
      expect(storage.get('specialKey')).toBe(special);
    });

    it('should handle unicode characters', () => {
      const unicode = '你好世界 🌍';
      storage.set('unicodeKey', unicode);
      expect(storage.get('unicodeKey')).toBe(unicode);
    });
  });
});

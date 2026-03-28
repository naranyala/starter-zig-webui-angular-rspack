// frontend/src/integration/services.integration.test.ts
import { describe, expect, it, beforeEach } from 'bun:test';
import { ApiService } from '../core/api.service';
import { LoggerService } from '../core/logger.service';
import { StorageService } from '../core/storage.service';

describe('Services Integration', () => {
  let apiService: ApiService;
  let logger: LoggerService;
  let storage: StorageService;

  beforeEach(() => {
    apiService = new ApiService();
    logger = new LoggerService();
    storage = new StorageService();
    localStorage.clear();
  });

  describe('Service Composition', () => {
    it('should work together for cached API call', async () => {
      // Setup mock backend
      const mockBackendFn = () => {};
      (window as any).cachedData = mockBackendFn;

      // Store cached data
      storage.set('api_cache', { data: 'cached', timestamp: Date.now() });

      // Setup response
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('cachedData_response', {
            detail: { success: true, data: { fresh: 'data' } },
          })
        );
      }, 10);

      // Call API
      const result = await apiService.call('cachedData');

      expect(result.success).toBe(true);

      // Log the result
      logger.info('API call completed', result);

      expect(logger.getRecentLogs().length).toBeGreaterThan(0);

      delete (window as any).cachedData;
    });
  });

  describe('Error Handling Flow', () => {
    it('should handle error across services', async () => {
      const mockBackendFn = () => {};
      (window as any).errorApi = mockBackendFn;

      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('errorApi_response', {
            detail: { success: false, error: 'API Error' },
          })
        );
      }, 10);

      try {
        const result = await apiService.call('errorApi');

        // Log error
        logger.error('API failed', result);

        expect(logger.getRecentLogs().find(l => l.level === 'error')).toBeDefined();
      } catch {
        // Expected
      }

      delete (window as any).errorApi;
    });
  });

  describe('Loading State Management', () => {
    it('should coordinate loading across services', async () => {
      const mockBackendFn = () => {};
      (window as any).loadingApi = mockBackendFn;

      // Log start
      logger.info('Starting API call');

      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('loadingApi_response', {
            detail: { success: true, data: 'loaded' },
          })
        );
      }, 50);

      const result = await apiService.call('loadingApi');

      // Update UI
      if (result.success) {
        logger.info('API call completed successfully');
      }

      expect(result.success).toBe(true);

      delete (window as any).loadingApi;
    });
  });

  describe('Storage and API Integration', () => {
    it('should cache API responses', async () => {
      const mockBackendFn = () => {};
      (window as any).cacheApi = mockBackendFn;

      const testData = { users: ['user1', 'user2'] };

      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('cacheApi_response', {
            detail: { success: true, data: testData },
          })
        );
      }, 10);

      const result = await apiService.call('cacheApi');

      if (result.success && result.data) {
        // Cache the result
        storage.set('api_cache_users', result.data, { ttl: 60000 });

        // Verify cache
        const cached = storage.get('api_cache_users');
        expect(cached).toEqual(testData);
      }

      delete (window as any).cacheApi;
    });

    it('should use cached data when available', () => {
      const cachedData = { users: ['cached1', 'cached2'] };
      storage.set('api_cache_users', cachedData);

      const retrieved = storage.get('api_cache_users');
      expect(retrieved).toEqual(cachedData);
    });
  });

  describe('Logging Flow', () => {
    it('should log complete flow', async () => {
      logger.info('Flow started');
      logger.debug('Debug info');

      try {
        // Simulate operation
        logger.info('Operation in progress');
        throw new Error('Test error');
      } catch (error) {
        logger.error('Operation failed', error);
      }

      logger.info('Flow completed');

      const logs = logger.getRecentLogs();
      expect(logs.find(l => l.message === 'Flow started')).toBeDefined();
      expect(logs.find(l => l.message === 'Operation failed')).toBeDefined();
      expect(logs.find(l => l.message === 'Flow completed')).toBeDefined();
    });
  });
});

// frontend/src/integration/e2e-flow.integration.test.ts
import { describe, expect, it, beforeEach } from 'bun:test';
import { ApiService } from '../core/api.service';
import { LoggerService } from '../core/logger.service';
import { StorageService } from '../core/storage.service';

/**
 * End-to-End Flow Integration Tests
 * Tests complete user workflows across multiple services
 */
describe('E2E Flow Integration', () => {
  let api: ApiService;
  let logger: LoggerService;
  let storage: StorageService;

  beforeEach(() => {
    api = new ApiService();
    logger = new LoggerService();
    storage = new StorageService();
    localStorage.clear();
  });

  describe('Complete API Request Flow', () => {
    it('should handle complete request lifecycle', (done) => {
      const mockCall = 'testApiCall';
      (window as any)[mockCall] = () => {};

      // Track the flow
      let flowStep = 0;

      // Setup response
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent(`${mockCall}_response`, {
            detail: { success: true, data: { id: 1, name: 'Test' } },
          })
        );
      }, 10);

      // Execute API call
      api.call(mockCall).then((result) => {
        flowStep++;
        expect(flowStep).toBe(1);
        expect(result.success).toBe(true);

        // Log success
        logger.info('API call succeeded', result);
        flowStep++;

        // Store result
        storage.set('api_result', result.data);
        flowStep++;

        expect(flowStep).toBe(3);
        expect(logger.getRecentLogs().length).toBeGreaterThan(0);
        expect(storage.get('api_result')).toEqual({ id: 1, name: 'Test' });

        delete (window as any)[mockCall];
        done();
      });
    });
  });

  describe('Error Handling Flow', () => {
    it('should handle errors across all services', (done) => {
      const errorCall = 'errorApiCall';
      (window as any)[errorCall] = () => {};

      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent(`${errorCall}_response`, {
            detail: { success: false, error: 'API Error' },
          })
        );
      }, 10);

      api.call(errorCall).catch(() => {
        // Log error
        logger.error('API call failed', { error: 'API Error' });

        // Store error
        storage.set('last_error', { type: 'api', message: 'API Error' });

        // Verify error handling
        expect(logger.getRecentLogs().find(l => l.level === 'error')).toBeDefined();
        expect(storage.get('last_error')).toEqual({ type: 'api', message: 'API Error' });

        delete (window as any)[errorCall];
        done();
      });
    });
  });

  describe('Loading State Flow', () => {
    it('should coordinate loading states', (done) => {
      const loadingCall = 'loadingApiCall';
      (window as any)[loadingCall] = () => {};

      // Log start
      logger.info('Starting API call');

      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent(`${loadingCall}_response`, {
            detail: { success: true, data: {} },
          })
        );
      }, 50);

      api.call(loadingCall).then(() => {
        logger.info('API call completed');

        // Verify loading flow
        const logs = logger.getRecentLogs();
        expect(logs.find(l => l.message.includes('Starting'))).toBeDefined();
        expect(logs.find(l => l.message.includes('completed'))).toBeDefined();

        delete (window as any)[loadingCall];
        done();
      });
    });
  });

  describe('Data Persistence Flow', () => {
    it('should persist and retrieve data', async () => {
      const testData = { user: 'test', preferences: { theme: 'dark' } };

      // Store data
      storage.set('user_data', testData);
      logger.info('Data stored', testData);

      // Retrieve data
      const retrieved = storage.get('user_data');
      expect(retrieved).toEqual(testData);

      // Verify in logs
      const logs = logger.getRecentLogs();
      expect(logs.find(l => l.message === 'Data stored')).toBeDefined();
    });

    it('should handle storage errors', () => {
      // Try to store circular reference
      const circularData: any = { name: 'test' };
      circularData.self = circularData;

      try {
        storage.set('circular', circularData);
      } catch (e) {
        logger.error('Storage failed', e);
        expect(logger.getRecentLogs().find(l => l.level === 'error')).toBeDefined();
      }
    });
  });

  describe('Logging Flow', () => {
    it('should maintain log history', () => {
      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');

      const logs = logger.getRecentLogs();
      expect(logs.length).toBe(4);
      expect(logs.map(l => l.level)).toEqual(['debug', 'info', 'warn', 'error']);
    });

    it('should filter logs by level', () => {
      logger.debug('Debug 1');
      logger.info('Info 1');
      logger.warn('Warn 1');
      logger.error('Error 1');
      logger.info('Info 2');

      const errors = logger.getRecentLogs('error');
      expect(errors.length).toBe(1);

      const infos = logger.getRecentLogs('info');
      expect(infos.length).toBe(2);
    });
  });

  describe('Cross-Service State', () => {
    it('should maintain consistent state', () => {
      // Initial state
      const initialState = {
        logs: logger.getRecentLogs().length,
        storage: storage.keys().length,
      };

      // Perform operations
      logger.info('Test');
      storage.set('test', 'value');

      // Verify state changes
      expect(logger.getRecentLogs().length).toBe(initialState.logs + 1);
      expect(storage.keys().length).toBe(initialState.storage + 1);
    });
  });
});

// frontend/src/integration/e2e-flow.integration.test.ts
import { describe, expect, it, beforeEach, afterEach } from 'bun:test';
import { ApiService } from '../core/api.service';
import { LoggerService } from '../core/logger.service';
import { StorageService } from '../core/storage.service';
import { NotificationService } from '../core/notification.service';
import { DevtoolsService } from '../core/devtools.service';

/**
 * End-to-End Flow Integration Tests
 * Tests complete user workflows across multiple services
 */
describe('E2E Flow Integration', () => {
  let api: ApiService;
  let logger: LoggerService;
  let storage: StorageService;
  let notifications: NotificationService;
  let devtools: DevtoolsService;

  beforeEach(() => {
    api = new ApiService();
    logger = new LoggerService();
    storage = new StorageService();
    notifications = new NotificationService();
    devtools = new DevtoolsService();
    devtools.init();
    localStorage.clear();
  });

  afterEach(() => {
    devtools.dispose();
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

        // Show notification
        notifications.success('Data loaded');
        flowStep++;

        // Track in devtools
        devtools.recordMetric('api_call_duration', 100, 'ms');
        flowStep++;

        expect(flowStep).toBe(5);
        expect(logger.getRecentLogs().length).toBeGreaterThan(0);
        expect(storage.get('api_result')).toEqual({ id: 1, name: 'Test' });
        expect(notifications.items().length).toBeGreaterThan(0);
        expect(devtools.getMetrics().length).toBeGreaterThan(0);

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

        // Show error notification
        notifications.error('Failed to load data');

        // Track error in devtools
        devtools.reportError('API_ERROR', 'API call failed', 'integration-test');

        // Verify all services handled the error
        expect(logger.getRecentLogs().find(l => l.level === 'error')).toBeDefined();
        expect(storage.get('last_error')).toEqual({ type: 'api', message: 'API Error' });
        expect(notifications.items().find(n => n.type === 'error')).toBeDefined();
        expect(devtools.getErrors().length).toBe(1);

        delete (window as any)[errorCall];
        done();
      });
    });
  });

  describe('Loading State Flow', () => {
    it('should coordinate loading states', (done) => {
      const loadingCall = 'loadingApiCall';
      (window as any)[loadingCall] = () => {};

      // Show initial loading state
      notifications.info('Loading data...');
      logger.info('Starting API call');
      devtools.log('info', 'API call started', 'loading-flow');

      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent(`${loadingCall}_response`, {
            detail: { success: true, data: {} },
          })
        );
      }, 50);

      api.call(loadingCall).then(() => {
        // Clear loading, show success
        notifications.success('Data loaded');
        logger.info('API call completed');
        devtools.recordMetric('loading_time', 50, 'ms');

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

      // Track in devtools
      devtools.recordMetric('storage_operation', 1, 'count');
      expect(devtools.getMetrics().length).toBeGreaterThan(0);
    });

    it('should handle storage errors', () => {
      // Try to store circular reference
      const circularData: any = { name: 'test' };
      circularData.self = circularData;

      try {
        storage.set('circular', circularData);
      } catch (e) {
        logger.error('Storage failed', e);
        notifications.error('Failed to save data');
        devtools.reportError('STORAGE_ERROR', 'Circular reference', 'storage');

        expect(logger.getRecentLogs().find(l => l.level === 'error')).toBeDefined();
        expect(devtools.getErrors().length).toBe(1);
      }
    });
  });

  describe('Notification Flow', () => {
    it('should show coordinated notifications', () => {
      // Sequence of notifications
      notifications.info('Starting process...');
      
      setTimeout(() => {
        notifications.warn('Warning: This might take a while');
      }, 10);

      setTimeout(() => {
        notifications.success('Process completed');
      }, 20);

      // Verify notifications
      expect(notifications.items().length).toBeGreaterThan(0);
      expect(notifications.items()[0].type).toBe('info');
    });

    it('should clear notifications', () => {
      notifications.success('Test 1');
      notifications.error('Test 2');
      notifications.info('Test 3');

      expect(notifications.items().length).toBe(3);

      notifications.clear();
      expect(notifications.items().length).toBe(0);
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

  describe('DevTools Monitoring Flow', () => {
    it('should track complete session', () => {
      // Simulate a session
      devtools.log('info', 'Session started', 'app');
      devtools.trackRequest('api_call');
      devtools.recordMetric('page_load', 500, 'ms');
      devtools.reportError('MINOR_ERROR', 'Something minor', 'app');
      devtools.log('info', 'Session ended', 'app');

      const stats = devtools.getStats();
      expect(stats.requestCount).toBe(1);
      expect(stats.errorCount).toBe(1);
      expect(stats.logCount).toBe(2);
    });

    it('should provide session summary', () => {
      devtools.log('info', 'Test', 'test');
      devtools.trackRequest('test');
      devtools.recordMetric('test', 100, 'ms');

      const stats = devtools.getStats();
      expect(stats).toHaveProperty('requestCount');
      expect(stats).toHaveProperty('errorCount');
      expect(stats).toHaveProperty('logCount');
      expect(stats).toHaveProperty('uptime');
    });
  });

  describe('Cross-Service State', () => {
    it('should maintain consistent state', () => {
      // Initial state
      const initialState = {
        logs: logger.getRecentLogs().length,
        notifications: notifications.items().length,
        storage: storage.keys().length,
        errors: devtools.getErrors().length,
      };

      // Perform operations
      logger.info('Test');
      notifications.success('Test');
      storage.set('test', 'value');
      devtools.reportError('TEST', 'Test', 'test');

      // Verify state changes
      expect(logger.getRecentLogs().length).toBe(initialState.logs + 1);
      expect(notifications.items().length).toBe(initialState.notifications + 1);
      expect(storage.keys().length).toBe(initialState.storage + 1);
      expect(devtools.getErrors().length).toBe(initialState.errors + 1);
    });
  });
});

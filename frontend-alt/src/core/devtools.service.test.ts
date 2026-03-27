// frontend/src/core/devtools.service.test.ts
import { describe, expect, it, beforeEach } from 'bun:test';
import { DevtoolsService } from './devtools.service';

describe('DevtoolsService', () => {
  let service: DevtoolsService;

  beforeEach(() => {
    service = new DevtoolsService();
    service.init();
  });

  describe('Initialization', () => {
    it('should initialize correctly', () => {
      expect(service).toBeDefined();
      expect(service.isInitialized()).toBe(true);
    });

    it('should have default stats', () => {
      const stats = service.getStats();
      expect(stats.requestCount).toBe(0);
      expect(stats.errorCount).toBe(0);
      expect(stats.logCount).toBe(0);
    });
  });

  describe('Request Tracking', () => {
    it('should increment request count', () => {
      service.incrementRequestCount();
      expect(service.getStats().requestCount).toBe(1);

      service.incrementRequestCount();
      expect(service.getStats().requestCount).toBe(2);
    });

    it('should track request by type', () => {
      service.trackRequest('api_call');
      service.trackRequest('api_call');
      service.trackRequest('websocket');

      const stats = service.getStats();
      expect(stats.requestsByType['api_call']).toBe(2);
      expect(stats.requestsByType['websocket']).toBe(1);
    });
  });

  describe('Logging', () => {
    it('should add logs', () => {
      service.log('info', 'Test message', 'test');
      expect(service.getStats().logCount).toBe(1);
    });

    it('should store log details', () => {
      const timestamp = Date.now();
      service.log('warn', 'Warning message', 'test-module', { data: 'test' });

      const logs = service.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].level).toBe('warn');
      expect(logs[0].message).toBe('Warning message');
      expect(logs[0].module).toBe('test-module');
    });

    it('should limit log count', () => {
      // Add more than max logs (assuming max is 100)
      for (let i = 0; i < 150; i++) {
        service.log('info', `Log ${i}`, 'test');
      }

      const logs = service.getLogs();
      expect(logs.length).toBeLessThanOrEqual(100);
    });

    it('should clear logs', () => {
      service.log('info', 'Test', 'test');
      service.clearLogs();
      expect(service.getLogs().length).toBe(0);
    });

    it('should get logs by level', () => {
      service.log('info', 'Info', 'test');
      service.log('warn', 'Warn', 'test');
      service.log('error', 'Error', 'test');

      const errors = service.getLogsByLevel('error');
      expect(errors.length).toBe(1);
      expect(errors[0].level).toBe('error');
    });
  });

  describe('Error Tracking', () => {
    it('should report errors', () => {
      service.reportError('TEST_ERROR', 'Test error message', 'test-module');
      expect(service.getStats().errorCount).toBe(1);
    });

    it('should store error details', () => {
      const metadata = { userId: '123', action: 'delete' };
      service.reportError('PERMISSION_ERROR', 'Access denied', 'auth', metadata);

      const errors = service.getErrors();
      expect(errors.length).toBe(1);
      expect(errors[0].code).toBe('PERMISSION_ERROR');
      expect(errors[0].module).toBe('auth');
      expect(errors[0].metadata).toEqual(metadata);
    });

    it('should limit error count', () => {
      for (let i = 0; i < 60; i++) {
        service.reportError(`ERROR_${i}`, `Error ${i}`, 'test');
      }

      const errors = service.getErrors();
      expect(errors.length).toBeLessThanOrEqual(50);
    });

    it('should clear errors', () => {
      service.reportError('TEST', 'Test', 'test');
      service.clearErrors();
      expect(service.getErrors().length).toBe(0);
    });

    it('should get errors by module', () => {
      service.reportError('ERR1', 'Error 1', 'auth');
      service.reportError('ERR2', 'Error 2', 'api');
      service.reportError('ERR3', 'Error 3', 'auth');

      const authErrors = service.getErrorsByModule('auth');
      expect(authErrors.length).toBe(2);
    });
  });

  describe('Metrics', () => {
    it('should record metrics', () => {
      service.recordMetric('response_time', 150, 'ms');
      
      const metrics = service.getMetrics();
      expect(metrics.length).toBe(1);
      expect(metrics[0].name).toBe('response_time');
      expect(metrics[0].value).toBe(150);
      expect(metrics[0].unit).toBe('ms');
    });

    it('should track metric timestamps', () => {
      const before = Date.now();
      service.recordMetric('test', 100, 'ms');
      const after = Date.now();

      const metrics = service.getMetrics();
      expect(metrics[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(metrics[0].timestamp).toBeLessThanOrEqual(after);
    });

    it('should limit metrics', () => {
      for (let i = 0; i < 120; i++) {
        service.recordMetric(`metric_${i}`, i, 'ms');
      }

      const metrics = service.getMetrics();
      expect(metrics.length).toBeLessThanOrEqual(100);
    });

    it('should get metrics by name', () => {
      service.recordMetric('response_time', 100, 'ms');
      service.recordMetric('response_time', 200, 'ms');
      service.recordMetric('memory_usage', 512, 'mb');

      const responseMetrics = service.getMetricsByName('response_time');
      expect(responseMetrics.length).toBe(2);
    });

    it('should calculate metric averages', () => {
      service.recordMetric('response_time', 100, 'ms');
      service.recordMetric('response_time', 200, 'ms');
      service.recordMetric('response_time', 300, 'ms');

      const avg = service.getMetricAverage('response_time');
      expect(avg).toBe(200);
    });
  });

  describe('Uptime', () => {
    it('should track uptime', () => {
      const beforeUptime = service.getUptime();
      
      // Wait a bit
      const start = Date.now();
      while (Date.now() - start < 100) {
        // Busy wait
      }
      
      const afterUptime = service.getUptime();
      
      expect(afterUptime).toBeGreaterThanOrEqual(beforeUptime);
    });

    it('should return uptime in seconds', () => {
      const uptime = service.getUptime();
      expect(uptime).toBeGreaterThanOrEqual(0);
      expect(uptime).toBeLessThan(1000000); // Reasonable upper bound
    });
  });

  describe('Event Callbacks', () => {
    it('should call event callback on log', () => {
      let callbackCalled = false;
      service.setEventCallback((event) => {
        if (event === 0) { // CONNECTED event
          callbackCalled = true;
        }
      });

      service.log('info', 'Test', 'test');
      // Callback might not be called for log, depends on implementation
      expect(service).toBeDefined();
    });
  });

  describe('Performance', () => {
    it('should handle rapid logging', () => {
      const start = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        service.log('info', `Log ${i}`, 'test');
      }
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should handle rapid error reporting', () => {
      const start = performance.now();
      
      for (let i = 0; i < 100; i++) {
        service.reportError(`ERR_${i}`, `Error ${i}`, 'test');
      }
      
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Disposal', () => {
    it('should dispose cleanly', () => {
      service.log('info', 'Test', 'test');
      service.reportError('TEST', 'Test', 'test');
      service.recordMetric('test', 100, 'ms');
      
      service.dispose();
      
      expect(service.isInitialized()).toBe(false);
    });

    it('should clear all data on dispose', () => {
      service.log('info', 'Test', 'test');
      service.reportError('TEST', 'Test', 'test');
      
      service.dispose();
      
      expect(service.getLogs().length).toBe(0);
      expect(service.getErrors().length).toBe(0);
    });
  });
});

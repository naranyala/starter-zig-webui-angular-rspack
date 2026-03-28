// frontend/src/core/logger.service.test.ts
import { describe, expect, it, beforeEach } from 'bun:test';
import { LoggerService } from './logger.service';

describe('LoggerService', () => {
  let logger: LoggerService;

  beforeEach(() => {
    logger = new LoggerService();
  });

  it('should create service', () => {
    expect(logger).toBeDefined();
  });

  it('should log at all levels', () => {
    expect(() => logger.debug('debug message')).not.toThrow();
    expect(() => logger.info('info message')).not.toThrow();
    expect(() => logger.warn('warn message')).not.toThrow();
    expect(() => logger.error('error message')).not.toThrow();
  });

  it('should filter by min level', () => {
    const logsBefore = logger.getRecentLogs().length;
    
    logger.debug('debug message');
    const logsAfterDebug = logger.getRecentLogs().length;
    
    // Debug should be filtered out by default (min level is 'info')
    expect(logsAfterDebug).toBe(logsBefore);
    
    logger.info('info message');
    const logsAfterInfo = logger.getRecentLogs().length;
    
    // Info should be logged
    expect(logsAfterInfo).toBe(logsBefore + 1);
  });

  it('should store recent logs', () => {
    logger.info('message 1');
    logger.warn('message 2');
    logger.error('message 3');

    const logs = logger.getRecentLogs();
    expect(logs.length).toBe(3);
    expect(logs[0].message).toBe('message 1');
    expect(logs[1].message).toBe('message 2');
    expect(logs[2].message).toBe('message 3');
  });

  it('should include timestamp in logs', () => {
    const before = Date.now();
    logger.info('timestamped message');
    const after = Date.now();

    const logs = logger.getRecentLogs();
    const log = logs.find(l => l.message === 'timestamped message');
    
    expect(log).toBeDefined();
    expect(log!.timestamp).toBeGreaterThanOrEqual(before);
    expect(log!.timestamp).toBeLessThanOrEqual(after);
  });

  it('should store log level', () => {
    logger.debug('debug');
    logger.info('info');
    logger.warn('warn');
    logger.error('error');

    const logs = logger.getRecentLogs();
    
    expect(logs.find(l => l.level === 'debug')).toBeDefined();
    expect(logs.find(l => l.level === 'info')).toBeDefined();
    expect(logs.find(l => l.level === 'warn')).toBeDefined();
    expect(logs.find(l => l.level === 'error')).toBeDefined();
  });

  it('should store log data', () => {
    const testData = { key: 'value', number: 42 };
    logger.info('with data', testData);

    const logs = logger.getRecentLogs();
    const log = logs.find(l => l.message === 'with data');
    
    expect(log).toBeDefined();
    expect(log!.data).toEqual(testData);
  });

  it('should clear logs', () => {
    logger.info('message 1');
    logger.warn('message 2');
    
    expect(logger.getRecentLogs().length).toBe(2);
    
    logger.clearLogs();
    
    expect(logger.getRecentLogs().length).toBe(0);
  });

  it('should limit recent logs count', () => {
    // Add more than 50 logs
    for (let i = 0; i < 60; i++) {
      logger.info(`message ${i}`);
    }

    const logs = logger.getRecentLogs();
    expect(logs.length).toBeLessThanOrEqual(50);
  });

  it('should get specific count of recent logs', () => {
    for (let i = 0; i < 10; i++) {
      logger.info(`message ${i}`);
    }

    const logs = logger.getRecentLogs(5);
    expect(logs.length).toBe(5);
  });
});

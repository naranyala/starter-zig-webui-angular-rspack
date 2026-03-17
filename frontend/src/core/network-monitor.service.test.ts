// frontend/src/core/network-monitor.service.test.ts
import { describe, expect, it, beforeEach, mock, spyOn } from 'bun:test';
import { NetworkMonitorService } from './network-monitor.service';

describe('NetworkMonitorService', () => {
  let networkMonitor: NetworkMonitorService;

  beforeEach(() => {
    networkMonitor = new NetworkMonitorService();
  });

  it('should create service', () => {
    expect(networkMonitor).toBeDefined();
  });

  describe('isOnline', () => {
    it('should return true when navigator reports online', () => {
      spyOn(navigator, 'onLine').get(() => true);
      expect(networkMonitor.isOnline()).toBe(true);
    });

    it('should return false when navigator reports offline', () => {
      spyOn(navigator, 'onLine').get(() => false);
      expect(networkMonitor.isOnline()).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('should return online status', () => {
      spyOn(navigator, 'onLine').get(() => true);
      const status = networkMonitor.getStatus();
      expect(status.online).toBe(true);
      expect(status.lastChecked).toBeDefined();
    });

    it('should return offline status', () => {
      spyOn(navigator, 'onLine').get(() => false);
      const status = networkMonitor.getStatus();
      expect(status.online).toBe(false);
    });
  });

  describe('waitForOnline', () => {
    it('should resolve immediately if already online', async () => {
      spyOn(navigator, 'onLine').get(() => true);
      const result = await networkMonitor.waitForOnline(1000);
      expect(result).toBe(true);
    });

    it('should wait for online event', async () => {
      spyOn(navigator, 'onLine').get(() => false);
      
      // Simulate online event after delay
      setTimeout(() => {
        window.dispatchEvent(new Event('online'));
      }, 50);

      const result = await networkMonitor.waitForOnline(1000);
      expect(result).toBe(true);
    });

    it('should timeout if never online', async () => {
      spyOn(navigator, 'onLine').get(() => false);
      const result = await networkMonitor.waitForOnline(100);
      expect(result).toBe(false);
    });
  });

  describe('event listeners', () => {
    it('should listen to online events', () => {
      const addEventListenerSpy = spyOn(window, 'addEventListener');
      const service = new NetworkMonitorService();
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
      
      service.dispose();
    });

    it('should remove listeners on dispose', () => {
      const removeEventListenerSpy = spyOn(window, 'removeEventListener');
      const service = new NetworkMonitorService();
      service.dispose();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    });
  });

  describe('request tracking', () => {
    it('should track request latency', () => {
      networkMonitor.recordRequest(100, true);
      const status = networkMonitor.getStatus();
      expect(status.requests).toBe(1);
    });

    it('should track failed requests', () => {
      networkMonitor.recordRequest(100, false);
      const status = networkMonitor.getStatus();
      expect(status.failures).toBe(1);
    });

    it('should calculate success rate', () => {
      networkMonitor.recordRequest(100, true);
      networkMonitor.recordRequest(100, true);
      networkMonitor.recordRequest(100, false);
      const status = networkMonitor.getStatus();
      expect(status.successRate).toBeCloseTo(66.67, 0);
    });
  });

  describe('connection type', () => {
    it('should return unknown if connection API not available', () => {
      const status = networkMonitor.getStatus();
      expect(status.type).toBe('unknown');
    });
  });
});

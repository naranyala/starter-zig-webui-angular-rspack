// frontend/src/core/loading.service.test.ts
import { describe, expect, it, beforeEach } from 'bun:test';
import { LoadingService } from './loading.service';

describe('LoadingService', () => {
  let loadingService: LoadingService;

  beforeEach(() => {
    loadingService = new LoadingService();
  });

  it('should create service', () => {
    expect(loadingService).toBeDefined();
  });

  describe('show', () => {
    it('should add loading indicator', () => {
      loadingService.show('Loading...');
      expect(loadingService.isLoading()).toBe(true);
      expect(loadingService.message()).toBe('Loading...');
    });

    it('should use default message', () => {
      loadingService.show();
      expect(loadingService.message()).toBe('Loading...');
    });

    it('should track multiple indicators', () => {
      loadingService.show('Loading 1');
      loadingService.show('Loading 2');
      expect(loadingService.count()).toBe(2);
      expect(loadingService.isLoading()).toBe(true);
    });
  });

  describe('hide', () => {
    it('should remove loading indicator', () => {
      loadingService.show('Loading...');
      loadingService.hide();
      expect(loadingService.isLoading()).toBe(false);
    });

    it('should not go negative', () => {
      loadingService.hide();
      loadingService.hide();
      expect(loadingService.count()).toBe(0);
    });

    it('should decrement count', () => {
      loadingService.show('Loading 1');
      loadingService.show('Loading 2');
      loadingService.hide();
      expect(loadingService.count()).toBe(1);
      expect(loadingService.isLoading()).toBe(true);
    });
  });

  describe('hideAll', () => {
    it('should remove all indicators', () => {
      loadingService.show('Loading 1');
      loadingService.show('Loading 2');
      loadingService.show('Loading 3');
      loadingService.hideAll();
      expect(loadingService.count()).toBe(0);
      expect(loadingService.isLoading()).toBe(false);
    });
  });

  describe('isLoading', () => {
    it('should return false initially', () => {
      expect(loadingService.isLoading()).toBe(false);
    });

    it('should return true when loading', () => {
      loadingService.show();
      expect(loadingService.isLoading()).toBe(true);
    });

    it('should return false after hide', () => {
      loadingService.show();
      loadingService.hide();
      expect(loadingService.isLoading()).toBe(false);
    });
  });

  describe('message', () => {
    it('should return current message', () => {
      loadingService.show('Custom message');
      expect(loadingService.message()).toBe('Custom message');
    });

    it('should return last message', () => {
      loadingService.show('Message 1');
      loadingService.show('Message 2');
      expect(loadingService.message()).toBe('Message 2');
    });

    it('should return empty when no loading', () => {
      expect(loadingService.message()).toBe('');
    });
  });

  describe('autoHide', () => {
    it('should auto-hide after duration', (done) => {
      loadingService.show('Loading...', 100);
      expect(loadingService.isLoading()).toBe(true);
      
      setTimeout(() => {
        expect(loadingService.isLoading()).toBe(false);
        done();
      }, 150);
    });
  });
});

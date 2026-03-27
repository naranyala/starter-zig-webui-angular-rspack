// frontend/src/core/winbox.service.test.ts
import { describe, expect, it, beforeEach, mock } from 'bun:test';
import { WinBoxService } from './winbox.service';

describe('WinBoxService', () => {
  let winboxService: WinBoxService;

  beforeEach(() => {
    // Mock WinBox on window
    (window as any).WinBox = mock(() => ({
      id: 'test-window',
      title: 'Test',
      focus: mock().mockReturnThis(),
      close: mock().mockReturnValue(true),
      minimize: mock().mockReturnThis(),
      maximize: mock().mockReturnThis(),
      restore: mock().mockReturnThis(),
      move: mock().mockReturnThis(),
      resize: mock().mockReturnThis(),
      setTitle: mock().mockReturnThis(),
    }));
    
    winboxService = new WinBoxService();
  });

  afterEach(() => {
    delete (window as any).WinBox;
  });

  it('should create service', () => {
    expect(winboxService).toBeDefined();
  });

  describe('isAvailable', () => {
    it('should return true when WinBox is loaded', () => {
      expect(winboxService.isAvailable()).toBe(true);
    });

    it('should return false when WinBox is not loaded', () => {
      delete (window as any).WinBox;
      const service = new WinBoxService();
      expect(service.isAvailable()).toBe(false);
    });
  });

  describe('create', () => {
    it('should create a new window', () => {
      const options = {
        id: 'test-1',
        title: 'Test Window',
        width: 800,
        height: 600,
      };
      
      const instance = winboxService.create(options);
      
      expect(instance).toBeDefined();
      expect(instance?.id).toBe('test-window');
    });

    it('should return null when WinBox not available', () => {
      delete (window as any).WinBox;
      const service = new WinBoxService();
      const instance = service.create({});
      expect(instance).toBeNull();
    });

    it('should handle creation error', () => {
      (window as any).WinBox = mock(() => {
        throw new Error('Creation failed');
      });
      
      const instance = winboxService.create({});
      expect(instance).toBeNull();
    });

    it('should pass options to WinBox', () => {
      const options = {
        id: 'custom-id',
        title: 'Custom Title',
        background: '#ff0000',
        width: 1024,
        height: 768,
      };
      
      winboxService.create(options);
      
      // WinBox should have been called with options
      expect((window as any).WinBox).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'custom-id',
          title: 'Custom Title',
        })
      );
    });
  });

  describe('getConstructor', () => {
    it('should return WinBox constructor', () => {
      const constructor = winboxService.getConstructor();
      expect(constructor).toBeDefined();
      expect(typeof constructor).toBe('function');
    });
  });

  describe('window lifecycle', () => {
    it('should create window with HTML content', () => {
      const instance = winboxService.create({
        html: '<div>Test Content</div>',
      });
      
      expect(instance).toBeDefined();
    });

    it('should create window with URL', () => {
      const instance = winboxService.create({
        url: 'https://example.com',
      });
      
      expect(instance).toBeDefined();
    });
  });
});

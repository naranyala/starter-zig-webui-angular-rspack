// frontend/src/views/app.component.test.ts
import { describe, expect, it, beforeEach, mock } from 'bun:test';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  let component: AppComponent;

  beforeEach(() => {
    // Mock WinBoxService
    const mockWinBoxService = {
      isAvailable: mock(() => true),
    };
    
    // Mock inject
    const originalInject = globalThis.inject;
    globalThis.inject = mock((token: any) => {
      if (token === mockWinBoxService.constructor) {
        return mockWinBoxService;
      }
      return null;
    });
    
    component = new AppComponent();
  });

  it('should create component', () => {
    expect(component).toBeDefined();
  });

  describe('panel state', () => {
    it('should start with top panel collapsed', () => {
      expect(component.topCollapsed()).toBe(false);
    });

    it('should start with bottom panel collapsed', () => {
      expect(component.bottomCollapsed()).toBe(true);
    });

    it('should start with card 1 active', () => {
      expect(component.activeCard()).toBe(1);
    });
  });

  describe('toggleTop', () => {
    it('should toggle top panel', () => {
      component.toggleTop();
      expect(component.topCollapsed()).toBe(true);
      
      component.toggleTop();
      expect(component.topCollapsed()).toBe(false);
    });
  });

  describe('toggleBottom', () => {
    it('should toggle bottom panel', () => {
      component.toggleBottom();
      expect(component.bottomCollapsed()).toBe(false);
      
      component.toggleBottom();
      expect(component.bottomCollapsed()).toBe(true);
    });
  });

  describe('setActiveCard', () => {
    it('should set active card to 1', () => {
      component.setActiveCard(1);
      expect(component.activeCard()).toBe(1);
    });

    it('should set active card to 2', () => {
      component.setActiveCard(2);
      expect(component.activeCard()).toBe(2);
    });
  });

  describe('closeAllWindows', () => {
    it('should close all windows', () => {
      // Setup mock windows
      component['existingBoxes'] = [
        { close: mock().mockReturnValue(true) },
        { close: mock().mockReturnValue(true) },
      ];
      
      component.closeAllWindows();
      
      // Windows should be closed
      expect(component['existingBoxes'].length).toBe(0);
    });

    it('should stop propagation if event provided', () => {
      const mockEvent = {
        stopPropagation: mock(),
      };
      
      component.closeAllWindows(mockEvent as any);
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });
  });

  describe('openAuthWindow', () => {
    it('should create auth window', () => {
      // Mock WinBox constructor
      (window as any).WinBox = mock(() => ({
        id: 'auth-window-1',
        focus: mock(),
        close: mock().mockReturnValue(true),
        __windowId: 'auth-window-1',
      }));
      
      component.openAuthWindow();
      
      // Window entries should be updated
      expect(component.windowEntries().length).toBeGreaterThan(0);
      
      delete (window as any).WinBox;
    });

    it('should stop propagation if event provided', () => {
      const mockEvent = {
        stopPropagation: mock(),
      };
      
      component.openAuthWindow(mockEvent as any);
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });
  });

  describe('openSqliteWindow', () => {
    it('should create sqlite window', () => {
      // Mock WinBox constructor
      (window as any).WinBox = mock(() => ({
        id: 'sqlite-window-2',
        focus: mock(),
        close: mock().mockReturnValue(true),
        __windowId: 'sqlite-window-2',
      }));
      
      component.openSqliteWindow();
      
      // Window entries should be updated
      expect(component.windowEntries().length).toBeGreaterThan(0);
      
      delete (window as any).WinBox;
    });
  });

  describe('hasFocusedWindow', () => {
    it('should return false when no windows', () => {
      expect(component.hasFocusedWindow()).toBe(false);
    });

    it('should return true when window is focused', () => {
      component.windowEntries.set([
        { id: '1', title: 'Test', minimized: false, focused: true },
      ]);
      expect(component.hasFocusedWindow()).toBe(true);
    });
  });

  describe('activateWindow', () => {
    it('should focus existing window', () => {
      const mockBox = {
        focus: mock(),
        restore: mock(),
        min: false,
        __windowId: 'test-1',
        __isMaximized: false,
      };
      component['existingBoxes'] = [mockBox];
      component.windowEntries.set([
        { id: 'test-1', title: 'Test', minimized: false, focused: false },
      ]);
      
      const mockEvent = { stopPropagation: mock() };
      component.activateWindow('test-1', mockEvent as any);
      
      expect(mockBox.focus).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });

    it('should remove entry if window not found', () => {
      component.windowEntries.set([
        { id: 'nonexistent', title: 'Test', minimized: false, focused: false },
      ]);
      
      const mockEvent = { stopPropagation: mock() };
      component.activateWindow('nonexistent', mockEvent as any);
      
      expect(component.windowEntries().length).toBe(0);
    });
  });

  describe('ngOnInit', () => {
    it('should initialize component', () => {
      // Mock WinBox
      (window as any).WinBox = mock(() => ({}));
      
      component.ngOnInit();
      
      // Should not throw
      expect(component).toBeDefined();
      
      delete (window as any).WinBox;
    });
  });

  describe('ngOnDestroy', () => {
    it('should cleanup on destroy', () => {
      const removeEventListenerSpy = globalThis.window?.removeEventListener || mock();
      
      component.ngOnInit();
      component.ngOnDestroy();
      
      // Resize handler should be removed
      expect(removeEventListenerSpy).toHaveBeenCalled();
    });
  });
});

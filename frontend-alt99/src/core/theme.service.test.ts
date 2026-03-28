// frontend/src/core/theme.service.test.ts
import { describe, expect, it, beforeEach } from 'bun:test';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let themeService: ThemeService;

  beforeEach(() => {
    themeService = new ThemeService();
    // Reset localStorage
    localStorage.clear();
  });

  it('should create service', () => {
    expect(themeService).toBeDefined();
  });

  describe('getTheme', () => {
    it('should return default theme', () => {
      expect(themeService.getTheme()).toBe('light');
    });

    it('should return saved theme', () => {
      localStorage.setItem('theme', 'dark');
      const service = new ThemeService();
      expect(service.getTheme()).toBe('dark');
    });
  });

  describe('setTheme', () => {
    it('should set theme to dark', () => {
      themeService.setTheme('dark');
      expect(themeService.getTheme()).toBe('dark');
      expect(localStorage.getItem('theme')).toBe('dark');
    });

    it('should set theme to light', () => {
      themeService.setTheme('light');
      expect(themeService.getTheme()).toBe('light');
      expect(localStorage.getItem('theme')).toBe('light');
    });

    it('should update document class', () => {
      // Mock document
      const originalClass = document.documentElement.className;
      themeService.setTheme('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
      document.documentElement.className = originalClass;
    });
  });

  describe('toggle', () => {
    it('should toggle from light to dark', () => {
      themeService.setTheme('light');
      themeService.toggle();
      expect(themeService.getTheme()).toBe('dark');
    });

    it('should toggle from dark to light', () => {
      themeService.setTheme('dark');
      themeService.toggle();
      expect(themeService.getTheme()).toBe('light');
    });
  });

  describe('isDark', () => {
    it('should return false for light theme', () => {
      themeService.setTheme('light');
      expect(themeService.isDark()).toBe(false);
    });

    it('should return true for dark theme', () => {
      themeService.setTheme('dark');
      expect(themeService.isDark()).toBe(true);
    });
  });

  describe('isLight', () => {
    it('should return true for light theme', () => {
      themeService.setTheme('light');
      expect(themeService.isLight()).toBe(true);
    });

    it('should return false for dark theme', () => {
      themeService.setTheme('dark');
      expect(themeService.isLight()).toBe(false);
    });
  });

  describe('system preference', () => {
    it('should respect system preference if no saved theme', () => {
      localStorage.clear();
      const service = new ThemeService();
      // Should default to light if no preference
      expect(service.getTheme()).toBe('light');
    });
  });
});

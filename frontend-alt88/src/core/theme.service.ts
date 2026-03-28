// Theme service for dark/light mode switching
import { Injectable, signal, computed, effect } from '@angular/core';
import { StorageService } from './storage.service';

export type Theme = 'light' | 'dark' | 'system';

export interface ThemeConfig {
  defaultTheme?: Theme;
  storageKey?: string;
  autoDetect?: boolean;
}

const STORAGE_KEY = 'app:theme';
const DARK_MODE_MEDIA_QUERY = '(prefers-color-scheme: dark)';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly storage: StorageService;

  private readonly theme = signal<Theme>('system');
  private readonly systemDark = signal<boolean>(false);
  private readonly initialized = signal<boolean>(false);

  readonly currentTheme = computed(() => {
    const t = this.theme();
    if (t === 'system') {
      return this.systemDark() ? 'dark' : 'light';
    }
    return t;
  });

  readonly isDark = computed(() => this.currentTheme() === 'dark');
  readonly isLight = computed(() => this.currentTheme() === 'light');

  constructor(storage: StorageService) {
    this.storage = storage;
    this.setupSystemThemeListener();
  }

  /**
   * Initialize theme from storage or system preference
   */
  init(config?: ThemeConfig): void {
    const storageKey = config?.storageKey ?? STORAGE_KEY;
    const storedTheme = this.storage.get<Theme>(storageKey);
    const defaultTheme = config?.defaultTheme ?? 'system';

    if (storedTheme && this.isValidTheme(storedTheme)) {
      this.setTheme(storedTheme, false);
    } else {
      this.setTheme(defaultTheme, false);
    }

    if (config?.autoDetect !== false) {
      this.setupSystemThemeListener();
    }

    this.initialized.set(true);
  }

  /**
   * Set the theme
   */
  setTheme(theme: Theme, persist = true): void {
    if (!this.isValidTheme(theme)) {
      return;
    }

    this.theme.set(theme);
    this.applyTheme(theme);

    if (persist) {
      this.storage.set(STORAGE_KEY, theme);
    }
  }

  /**
   * Toggle between light and dark
   */
  toggle(): void {
    const current = this.theme();
    const newTheme: Theme = current === 'dark' ? 'light' : 'dark';
    this.setTheme(newTheme);
  }

  /**
   * Set to system preference
   */
  setSystemTheme(): void {
    this.setTheme('system');
  }

  /**
   * Get current theme
   */
  getTheme(): Theme {
    return this.theme();
  }

  /**
   * Get effective theme (resolves 'system' to actual theme)
   */
  getEffectiveTheme(): 'light' | 'dark' {
    return this.currentTheme();
  }

  /**
   * Check if a specific theme is active
   */
  is(theme: Theme): boolean {
    if (theme === 'system') {
      return this.theme() === 'system';
    }
    return this.currentTheme() === theme;
  }

  private setupSystemThemeListener(): void {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia(DARK_MODE_MEDIA_QUERY);
    this.systemDark.set(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      this.systemDark.set(event.matches);
      if (this.theme() === 'system') {
        this.applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handler);
  }

  private applyTheme(theme: Theme): void {
    if (typeof document === 'undefined') {
      return;
    }

    const effectiveTheme = theme === 'system'
      ? (this.systemDark() ? 'dark' : 'light')
      : theme;

    const root = document.documentElement;
    root.classList.remove('light-theme', 'dark-theme');
    root.classList.add(`${effectiveTheme}-theme`);
    root.setAttribute('data-theme', effectiveTheme);

    this.updateMetaThemeColor(effectiveTheme);
  }

  private updateMetaThemeColor(theme: 'light' | 'dark'): void {
    if (typeof document === 'undefined') {
      return;
    }

    let metaThemeColor = document.querySelector('meta[name="theme-color"]');

    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }

    const color = theme === 'dark' ? '#1a1a2e' : '#f8f9fb';
    metaThemeColor.setAttribute('content', color);
  }

  private isValidTheme(theme: string): theme is Theme {
    return theme === 'light' || theme === 'dark' || theme === 'system';
  }
}

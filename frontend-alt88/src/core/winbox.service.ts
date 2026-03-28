import { Injectable } from '@angular/core';
import { LoggerService } from './logger.service';

export interface WinBoxOptions {
  id?: string;
  title?: string;
  background?: string;
  border?: number;
  radius?: number;
  width?: string | number;
  height?: string | number;
  x?: string | number;
  y?: string | number;
  max?: boolean;
  html?: string;
  url?: string;
  mount?: HTMLElement;
  controls?: {
    minimize?: boolean;
    maximize?: boolean;
    close?: boolean;
  };
  onfocus?: () => void;
  onblur?: () => void;
  onminimize?: () => void;
  onmaximize?: () => void;
  onrestore?: () => void;
  onclose?: () => boolean | undefined;
  onresize?: (width: number, height: number) => void;
  onmove?: (x: number, y: number) => void;
}

export interface WinBoxInstance {
  id: string;
  title: string;
  body: HTMLElement;
  window: HTMLElement;
  focus: (value?: boolean) => WinBoxInstance;
  blur: (value?: boolean) => WinBoxInstance;
  minimize: (value?: boolean) => WinBoxInstance;
  maximize: (value?: boolean) => WinBoxInstance;
  restore: () => WinBoxInstance;
  fullscreen: (value?: boolean) => WinBoxInstance;
  close: (force?: boolean) => boolean;
  move: (x?: number | string, y?: number | string, skipEvent?: boolean) => WinBoxInstance;
  resize: (
    width?: number | string,
    height?: number | string,
    skipEvent?: boolean
  ) => WinBoxInstance;
  setTitle: (title: string) => WinBoxInstance;
  setIcon: (iconUrl: string) => WinBoxInstance;
  setBackground: (color: string) => WinBoxInstance;
  setUrl: (url: string, onLoad?: () => void) => WinBoxInstance;
  mount: (element: HTMLElement) => WinBoxInstance;
  unmount: (returnToParent?: boolean) => WinBoxInstance;
  addClass: (className: string) => WinBoxInstance;
  removeClass: (className: string) => WinBoxInstance;
  toggleClass: (className: string) => WinBoxInstance;
  addControl: (control: {
    class?: string;
    image?: string;
    click?: (e: Event, win: WinBoxInstance) => void;
    index?: number;
  }) => WinBoxInstance;
  removeControl: (controlClass: string) => WinBoxInstance;
  hide: (value?: boolean) => WinBoxInstance;
  show: (value?: boolean) => WinBoxInstance;
  min: boolean;
  max: boolean;
  full: boolean;
  focused: boolean;
  hidden: boolean;
  // Custom properties added by our application
  __windowId?: string;
  __cardTitle?: string;
  __cardId?: number;
  __isMaximized?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class WinBoxService {
  private readonly logger = new LoggerService();
  private winboxConstructor: any = null;

  constructor() {
    // WinBox should be loaded from static/js/winbox.min.js via script tag
    // Check if it's available on window
    if (typeof window !== 'undefined' && (window as any).WinBox) {
      this.winboxConstructor = (window as any).WinBox;
      this.logger.debug('WinBox found on window object');
    } else {
      this.logger.warn(
        'WinBox not found on window - it should be loaded from static/js/winbox.min.js'
      );
    }
  }

  /**
   * Create a new WinBox window
   */
  create(options: WinBoxOptions): WinBoxInstance | null {
    // Re-check window.WinBox in case it was loaded asynchronously
    if (!this.winboxConstructor && typeof window !== 'undefined') {
      this.winboxConstructor = (window as any).WinBox;
    }

    if (!this.winboxConstructor) {
      this.logger.error('WinBox constructor not available. Make sure winbox.min.js is loaded.');
      return null;
    }

    try {
      const box = new this.winboxConstructor(options);
      this.logger.debug('WinBox created', { id: options.id, title: options.title });
      return box;
    } catch (error) {
      this.logger.error('Failed to create WinBox', { error, options });
      return null;
    }
  }

  /**
   * Get the WinBox constructor (for advanced usage)
   */
  getConstructor(): any {
    return this.winboxConstructor;
  }

  /**
   * Check if WinBox is available
   */
  isAvailable(): boolean {
    // Re-check in case it was loaded after service initialization
    if (!this.winboxConstructor && typeof window !== 'undefined') {
      this.winboxConstructor = (window as any).WinBox;
    }
    return !!this.winboxConstructor;
  }
}

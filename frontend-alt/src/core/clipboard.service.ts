// Clipboard service for clipboard operations
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ClipboardService {
  /**
   * Copy text to clipboard
   */
  async copy(text: string): Promise<boolean> {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        return true;
      }
      
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read text from clipboard
   */
  async read(): Promise<string> {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        return await navigator.clipboard.readText();
      }
      return '';
    } catch {
      return '';
    }
  }

  /**
   * Copy JSON object to clipboard
   */
  async copyJson(obj: unknown, spaces = 2): Promise<boolean> {
    try {
      const json = JSON.stringify(obj, null, spaces);
      return await this.copy(json);
    } catch {
      return false;
    }
  }

  /**
   * Check if clipboard API is supported
   */
  isSupported(): boolean {
    return typeof navigator !== 'undefined' && !!navigator.clipboard;
  }
}

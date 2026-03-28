// frontend/src/core/clipboard.service.test.ts
import { describe, expect, it, beforeEach } from 'bun:test';
import { ClipboardService } from './clipboard.service';

describe('ClipboardService', () => {
  let clipboardService: ClipboardService;
  let mockClipboard: { text: string };

  beforeEach(() => {
    mockClipboard = { text: '' };
    
    // Mock navigator.clipboard
    Object.assign(navigator, {
      clipboard: {
        writeText: mock((text: string) => {
          mockClipboard.text = text;
          return Promise.resolve();
        }),
        readText: mock(() => Promise.resolve(mockClipboard.text)),
      },
    });
    
    clipboardService = new ClipboardService();
  });

  it('should create service', () => {
    expect(clipboardService).toBeDefined();
  });

  describe('copy', () => {
    it('should copy text to clipboard', async () => {
      const result = await clipboardService.copy('Test text');
      expect(result).toBe(true);
      expect(mockClipboard.text).toBe('Test text');
    });

    it('should handle copy failure', async () => {
      Object.assign(navigator, {
        clipboard: {
          writeText: mock(() => Promise.reject(new Error('Clipboard error'))),
        },
      });
      
      const result = await clipboardService.copy('Test');
      expect(result).toBe(false);
    });

    it('should handle empty text', async () => {
      const result = await clipboardService.copy('');
      expect(result).toBe(true);
    });
  });

  describe('read', () => {
    it('should read text from clipboard', async () => {
      mockClipboard.text = 'Clipboard content';
      const result = await clipboardService.read();
      expect(result).toBe('Clipboard content');
    });

    it('should handle read failure', async () => {
      Object.assign(navigator, {
        clipboard: {
          readText: mock(() => Promise.reject(new Error('Read error'))),
        },
      });
      
      const result = await clipboardService.read();
      expect(result).toBe('');
    });
  });

  describe('copyJson', () => {
    it('should copy JSON object', async () => {
      const obj = { name: 'Test', value: 42 };
      const result = await clipboardService.copyJson(obj);
      expect(result).toBe(true);
      expect(mockClipboard.text).toBe(JSON.stringify(obj, null, 2));
    });

    it('should handle invalid JSON', async () => {
      const circular: any = {};
      circular.self = circular;
      const result = await clipboardService.copyJson(circular);
      expect(result).toBe(false);
    });
  });

  describe('isSupported', () => {
    it('should return true if clipboard API exists', () => {
      expect(clipboardService.isSupported()).toBe(true);
    });

    it('should return false if clipboard API missing', () => {
      Object.assign(navigator, { clipboard: undefined });
      const service = new ClipboardService();
      expect(service.isSupported()).toBe(false);
    });
  });
});

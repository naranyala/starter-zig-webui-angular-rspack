// frontend/src/core/api.service.test.ts
import { describe, expect, it, mock, beforeEach } from 'bun:test';
import { ApiService } from './api.service';

describe('ApiService', () => {
  let apiService: ApiService;

  beforeEach(() => {
    apiService = new ApiService();
  });

  it('should create service', () => {
    expect(apiService).toBeDefined();
  });

  describe('call', () => {
    it('should call backend function', async () => {
      const mockBackendFn = mock(() => {});
      (window as any).testFunction = mockBackendFn;

      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('testFunction_response', {
            detail: { success: true, data: 'test' },
          })
        );
      }, 10);

      const result = await apiService.call('testFunction');
      expect(result.success).toBe(true);
      expect(result.data).toBe('test');

      delete (window as any).testFunction;
    });

    it('should handle timeout', async () => {
      const mockBackendFn = mock(() => {});
      (window as any).timeoutFunction = mockBackendFn;

      try {
        await apiService.call('timeoutFunction', [], { timeoutMs: 50 });
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.success).toBe(false);
        expect(error.error).toContain('timeout');
      }

      delete (window as any).timeoutFunction;
    });

    it('should handle missing function', async () => {
      try {
        await apiService.call('nonExistentFunction');
        expect.fail('Should have thrown');
      } catch (error: any) {
        expect(error.success).toBe(false);
        expect(error.error).toContain('not found');
      }
    });

    it('should handle backend error response', async () => {
      const mockBackendFn = mock(() => {});
      (window as any).errorFunction = mockBackendFn;

      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('errorFunction_response', {
            detail: { success: false, error: 'Backend error' },
          })
        );
      }, 10);

      const result = await apiService.call('errorFunction');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Backend error');

      delete (window as any).errorFunction;
    });

    it('should pass arguments to backend', async () => {
      const mockBackendFn = mock(() => {});
      (window as any).argsFunction = mockBackendFn;

      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('argsFunction_response', {
            detail: { success: true, data: 'result' },
          })
        );
      }, 10);

      await apiService.call('argsFunction', ['arg1', 42, { key: 'value' }]);
      expect(mockBackendFn).toHaveBeenCalledWith('arg1', 42, { key: 'value' });

      delete (window as any).argsFunction;
    });
  });

  describe('callOrThrow', () => {
    it('should return data on success', async () => {
      const mockBackendFn = mock(() => {});
      (window as any).successFunction = mockBackendFn;

      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('successFunction_response', {
            detail: { success: true, data: 'success_data' },
          })
        );
      }, 10);

      const data = await apiService.callOrThrow('successFunction');
      expect(data).toBe('success_data');

      delete (window as any).successFunction;
    });

    it('should throw on error', async () => {
      const mockBackendFn = mock(() => {});
      (window as any).throwFunction = mockBackendFn;

      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('throwFunction_response', {
            detail: { success: false, error: 'Error occurred' },
          })
        );
      }, 10);

      await expect(apiService.callOrThrow('throwFunction')).rejects.toThrow('Error occurred');

      delete (window as any).throwFunction;
    });
  });
});

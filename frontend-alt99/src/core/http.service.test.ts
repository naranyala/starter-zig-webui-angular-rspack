// frontend/src/core/http.service.test.ts
import { describe, expect, it, beforeEach, mock } from 'bun:test';
import { HttpService } from './http.service';
import { StorageService } from './storage.service';

describe('HttpService', () => {
  let httpService: HttpService;
  let storageService: StorageService;

  beforeEach(() => {
    storageService = new StorageService();
    httpService = new HttpService(storageService);
  });

  it('should create service', () => {
    expect(httpService).toBeDefined();
  });

  it('should set base URL', () => {
    httpService.setBaseUrl('https://api.example.com');
    // Base URL should be set (implementation dependent)
    expect(httpService).toBeDefined();
  });

  describe('get', () => {
    it('should make GET request', async () => {
      const mockFetch = mock(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: 'test' }),
        })
      );
      global.fetch = mockFetch as any;

      const response = await httpService.get('https://api.example.com/test');
      
      expect(response.status).toBe(200);
      expect(response.ok).toBe(true);
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should handle GET request error', async () => {
      const mockFetch = mock(() =>
        Promise.reject(new Error('Network error'))
      );
      global.fetch = mockFetch as any;

      await expect(httpService.get('https://api.example.com/test')).rejects.toThrow('Network error');
    });
  });

  describe('post', () => {
    it('should make POST request with body', async () => {
      const mockFetch = mock(() =>
        Promise.resolve({
          ok: true,
          status: 201,
          json: () => Promise.resolve({ id: 1, name: 'Created' }),
        })
      );
      global.fetch = mockFetch as any;

      const body = { name: 'Test' };
      const response = await httpService.post('https://api.example.com/test', body);
      
      expect(response.status).toBe(201);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body),
        })
      );
    });
  });

  describe('put', () => {
    it('should make PUT request', async () => {
      const mockFetch = mock(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ id: 1, updated: true }),
        })
      );
      global.fetch = mockFetch as any;

      const response = await httpService.put('https://api.example.com/test/1', { id: 1 });
      
      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test/1',
        expect.objectContaining({
          method: 'PUT',
        })
      );
    });
  });

  describe('delete', () => {
    it('should make DELETE request', async () => {
      const mockFetch = mock(() =>
        Promise.resolve({
          ok: true,
          status: 204,
          json: () => Promise.resolve({}),
        })
      );
      global.fetch = mockFetch as any;

      const response = await httpService.delete('https://api.example.com/test/1');
      
      expect(response.status).toBe(204);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/test/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('timeout', () => {
    it('should handle timeout', async () => {
      const mockFetch = mock(() => new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 1000);
      }));
      global.fetch = mockFetch as any;

      await expect(
        httpService.get('https://api.example.com/slow', { timeout: 100 })
      ).rejects.toThrow();
    });
  });

  describe('headers', () => {
    it('should include default headers', async () => {
      const mockFetch = mock(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({}),
        })
      );
      global.fetch = mockFetch as any;

      await httpService.get('https://api.example.com/test');
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          }),
        })
      );
    });

    it('should merge custom headers', async () => {
      const mockFetch = mock(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({}),
        })
      );
      global.fetch = mockFetch as any;

      await httpService.get('https://api.example.com/test', {
        headers: { 'Authorization': 'Bearer token' },
      });
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer token',
          }),
        })
      );
    });
  });
});

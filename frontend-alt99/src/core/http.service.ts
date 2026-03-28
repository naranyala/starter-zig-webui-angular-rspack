// Simplified HTTP client service
import { Injectable } from '@angular/core';
import { StorageService } from './storage.service';

export interface HttpRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  cache?: boolean;
}

export interface HttpResponse<T> {
  status: number;
  body: T;
  ok: boolean;
}

@Injectable({ providedIn: 'root' })
export class HttpService {
  private readonly baseUrl = '';
  private readonly defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  constructor(private readonly storage: StorageService) {}

  setBaseUrl(url: string): void {
    Object.assign(this, { baseUrl: url });
  }

  async get<T>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return this.request<T>('GET', url, options);
  }

  async post<T>(url: string, body?: unknown, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return this.request<T>('POST', url, { ...options, body });
  }

  async put<T>(url: string, body?: unknown, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return this.request<T>('PUT', url, { ...options, body });
  }

  async delete<T>(url: string, options?: HttpRequestOptions): Promise<HttpResponse<T>> {
    return this.request<T>('DELETE', url, options);
  }

  private async request<T>(
    method: string,
    url: string,
    options?: HttpRequestOptions
  ): Promise<HttpResponse<T>> {
    const fullUrl = this.baseUrl && !url.startsWith('http') ? `${this.baseUrl}/${url}` : url;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options?.timeout ?? 30000);

    try {
      const response = await fetch(fullUrl, {
        method,
        headers: { ...this.defaultHeaders, ...options?.headers },
        body: options?.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const body = await response.json();

      return {
        status: response.status,
        body,
        ok: response.ok,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }
}

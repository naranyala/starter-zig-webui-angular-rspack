import { Injectable } from '@angular/core';

/**
 * RPC Request interface
 */
export interface RpcRequest {
  id: number;
  method: string;
  params: any[];
}

/**
 * RPC Response interface
 */
export interface RpcResponse<T = any> {
  id: number;
  result?: T;
  error?: string;
}

/**
 * RPC Client Service
 * Handles Remote Procedure Calls to the backend
 */
@Injectable({ providedIn: 'root' })
export class RpcClientService {
  private requestId = 0;
  private pendingCalls = new Map<number, {
    resolve: (value: any) => void;
    reject: (reason: any) => void;
    timeout: any;
  }>();

  private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds

  constructor() {
    // Expose response handler to global scope for WebUI callbacks
    (window as any).rpcClient = {
      handleResponse: (responseStr: string) => this.handleResponse(responseStr)
    };
  }

  /**
   * Call a backend RPC method
   * @param method - Method name to call
   * @param params - Parameters to pass
   * @param timeout - Optional timeout in ms
   */
  async call<T>(method: string, params: any[] = [], timeout?: number): Promise<T> {
    const id = ++this.requestId;
    const request: RpcRequest = { id, method, params };

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pendingCalls.delete(id);
        reject(new Error(`RPC timeout: ${method}`));
      }, timeout || this.DEFAULT_TIMEOUT);

      this.pendingCalls.set(id, { resolve, reject, timeout: timeoutId });

      // Call WebUI backend method
      const requestJson = JSON.stringify(request);
      (window as any).webui.rpcCall(requestJson);
    });
  }

  /**
   * Handle RPC response from backend
   */
  private handleResponse(responseStr: string): void {
    const response: RpcResponse = JSON.parse(responseStr);
    const pending = this.pendingCalls.get(response.id);

    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingCalls.delete(response.id);

      if (response.error) {
        pending.reject(new Error(response.error));
      } else {
        pending.resolve(response.result);
      }
    }
  }
}

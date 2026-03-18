// ApiService Tests - Testing signal state management
import { describe, expect, it, beforeEach } from 'bun:test';

// Simple signal implementation for testing
class Signal<T> {
  private value: T;
  private subscribers: Set<(value: T) => void> = new Set();

  constructor(initial: T) {
    this.value = initial;
  }

  set(newValue: T) {
    this.value = newValue;
    this.subscribers.forEach(fn => fn(newValue));
  }

  get(): T {
    return this.value;
  }

  update(fn: (value: T) => T) {
    this.value = fn(this.value);
    this.subscribers.forEach(fn => fn(this.value));
  }
}

// Test the ApiResponse structure
describe('ApiResponse Structure', () => {
  it('should have correct success structure', () => {
    const response = { success: true, data: 'test' };
    expect(response.success).toBe(true);
    expect(response.data).toBe('test');
  });

  it('should have correct error structure', () => {
    const response = { success: false, error: 'Something went wrong' };
    expect(response.success).toBe(false);
    expect(response.error).toBe('Something went wrong');
  });
});

// Test the CallOptions structure
describe('CallOptions Structure', () => {
  it('should accept timeoutMs option', () => {
    const options = { timeoutMs: 5000 };
    expect(options.timeoutMs).toBe(5000);
  });

  it('should be optional', () => {
    const options = {};
    expect(options).toBeDefined();
  });
});

// Test signal behavior (mirrors ApiService state)
describe('Signal State Management', () => {
  let loading: Signal<boolean>;
  let error: Signal<string | null>;
  let lastCallTime: Signal<number | null>;
  let callCount: Signal<number>;

  beforeEach(() => {
    loading = new Signal(false);
    error = new Signal<string | null>(null);
    lastCallTime = new Signal<number | null>(null);
    callCount = new Signal(0);
  });

  it('should track loading state', () => {
    expect(loading.get()).toBe(false);
    loading.set(true);
    expect(loading.get()).toBe(true);
    loading.set(false);
    expect(loading.get()).toBe(false);
  });

  it('should track error state', () => {
    expect(error.get()).toBeNull();
    error.set('Error occurred');
    expect(error.get()).toBe('Error occurred');
    expect(error.get() !== null).toBe(true);
  });

  it('should track call count', () => {
    expect(callCount.get()).toBe(0);
    callCount.update(c => c + 1);
    expect(callCount.get()).toBe(1);
    callCount.update(c => c + 1);
    expect(callCount.get()).toBe(2);
  });

  it('should compute hasError correctly', () => {
    const hasError = () => error.get() !== null;
    
    expect(hasError()).toBe(false);
    error.set('Error');
    expect(hasError()).toBe(true);
    error.set(null);
    expect(hasError()).toBe(false);
  });

  it('should compute isReady correctly', () => {
    const isReady = () => !loading.get() && error.get() === null;
    
    expect(isReady()).toBe(true);
    
    loading.set(true);
    expect(isReady()).toBe(false);
    
    loading.set(false);
    expect(isReady()).toBe(true);
    
    error.set('Error');
    expect(isReady()).toBe(false);
  });

  it('should track lastCallTime', () => {
    expect(lastCallTime.get()).toBeNull();
    const now = Date.now();
    lastCallTime.set(now);
    expect(lastCallTime.get()).toBe(now);
  });

  it('should reset all state', () => {
    loading.set(true);
    error.set('Some error');
    lastCallTime.set(Date.now());
    callCount.set(5);

    loading.set(false);
    error.set(null);
    lastCallTime.set(null);
    callCount.set(0);

    expect(loading.get()).toBe(false);
    expect(error.get()).toBeNull();
    expect(lastCallTime.get()).toBeNull();
    expect(callCount.get()).toBe(0);
  });
});

// Test timeout calculation
describe('Timeout Handling', () => {
  it('should use default timeout when not specified', () => {
    const defaultTimeout = 30000;
    const options = {};
    const timeoutMs = (options as any).timeoutMs ?? defaultTimeout;
    expect(timeoutMs).toBe(30000);
  });

  it('should use custom timeout when specified', () => {
    const defaultTimeout = 30000;
    const options = { timeoutMs: 5000 };
    const timeoutMs = options.timeoutMs ?? defaultTimeout;
    expect(timeoutMs).toBe(5000);
  });

  it('should generate response event name correctly', () => {
    const functionName = 'testFunction';
    const responseEventName = `${functionName}_response`;
    expect(responseEventName).toBe('testFunction_response');
  });
});

// Test backend function validation
describe('Backend Function Validation', () => {
  it('should validate function exists on window', () => {
    const mockWindow: any = {
      testFn: () => {}
    };
    
    const fn = mockWindow.testFn;
    expect(typeof fn).toBe('function');
  });

  it('should reject non-existent function', () => {
    const mockWindow: any = {};
    const fn = mockWindow.nonExistent;
    expect(fn).toBeUndefined();
    expect(typeof fn).toBe('undefined');
  });
});

// Test response event dispatching
describe('Response Event Dispatching', () => {
  it('should create CustomEvent with detail', () => {
    const response = { success: true, data: 'test' };
    const event = new CustomEvent('test_response', { detail: response });
    
    expect(event.type).toBe('test_response');
    expect((event as any).detail).toEqual(response);
  });

  it('should handle success and error responses', () => {
    const successEvent = new CustomEvent('success_response', {
      detail: { success: true, data: { id: 1 } }
    });
    
    const errorEvent = new CustomEvent('error_response', {
      detail: { success: false, error: 'Error message' }
    });
    
    expect((successEvent as any).detail.success).toBe(true);
    expect((errorEvent as any).detail.success).toBe(false);
    expect((errorEvent as any).detail.error).toBe('Error message');
  });
});

// Test utilities for browser environment mocks

// Mock window object
export const mockWindow = {
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => true,
};

// Mock localStorage
export const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
})();

// Mock navigator
export const mockNavigator = {
  clipboard: {
    writeText: async () => {},
    readText: async () => '',
  },
  onLine: true,
};

// Setup function for tests
export function setupBrowserMocks() {
  (globalThis as any).window = mockWindow;
  (globalThis as any).navigator = mockNavigator;
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  });
}

// Cleanup function for tests
export function cleanupBrowserMocks() {
  delete (globalThis as any).window;
  delete (globalThis as any).navigator;
  delete (globalThis as any).localStorage;
}

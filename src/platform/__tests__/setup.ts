import { vi } from 'vitest';

// Monaco Editorのモック
const mockMonaco = {
  editor: {
    create: vi.fn(),
    setTheme: vi.fn(),
    setModelLanguage: vi.fn(),
    setModelMarkers: vi.fn(),
    IStandaloneCodeEditor: {},
    IMarkerData: {},
    MarkerSeverity: {
      Error: 8,
      Warning: 4,
      Info: 2
    }
  },
  Range: vi.fn(),
  MarkerSeverity: {
    Error: 8,
    Warning: 4,
    Info: 2
  }
};

// グローバルにMonacoを設定
Object.defineProperty(globalThis, 'monaco', {
  value: mockMonaco,
  writable: true
});

// ブラウザAPIのモック
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn()
  }
});

Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn()
  },
  configurable: true
});

// File System Access APIのモック
Object.defineProperty(window, 'showOpenFilePicker', {
  value: vi.fn(),
  configurable: true
});

Object.defineProperty(window, 'showSaveFilePicker', {
  value: vi.fn(),
  configurable: true
});

// Performance APIのモック
Object.defineProperty(global, 'performance', {
  value: {
    timing: {
      navigationStart: 1000,
      loadEventEnd: 2000
    },
    memory: {
      usedJSHeapSize: 1000000,
      totalJSHeapSize: 2000000,
      jsHeapSizeLimit: 4000000
    }
  },
  configurable: true
});
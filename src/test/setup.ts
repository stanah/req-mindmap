/**
 * テストセットアップファイル
 */

import '@testing-library/jest-dom';

// Vitest用のjest-dom型定義を手動で拡張
declare global {
  namespace Vi {
    interface JestAssertion<T = unknown> {
      toBeInTheDocument(): T;
      toHaveValue(value: unknown): T;
      toBeDisabled(): T;
      toHaveBeenCalled(): T;
      toHaveBeenCalledWith(...args: unknown[]): T;
      toHaveBeenCalledTimes(times: number): T;
    }
  }
}
import { vi } from 'vitest';
import React from 'react';

// monaco-editorのモック（最小限）
vi.mock('monaco-editor', () => ({
  default: {},
  editor: {
    create: vi.fn(() => ({
      dispose: vi.fn(),
      setValue: vi.fn(),
      getValue: vi.fn(() => ''),
      onDidChangeModelContent: vi.fn(() => ({ dispose: vi.fn() })),
    })),
  },
}));

// @monaco-editor/reactのモック（最小限）
vi.mock('@monaco-editor/react', () => {
  const MockEditor = vi.fn(({ value, onChange }: { value?: string; onChange?: (value: string, event: unknown) => void }) => 
    React.createElement('div', {
      'data-testid': 'monaco-editor',
      onChange: onChange ? (e) => onChange(e.target.value || '', {}) : undefined,
    }, value || '')
  );

  return {
    default: MockEditor,
    Editor: MockEditor,
  };
});

// D3.jsのモック（最小限）
vi.mock('d3', () => {
  const mockSelection = {
    selectAll: vi.fn(() => mockSelection),
    select: vi.fn(() => mockSelection),
    data: vi.fn(() => mockSelection),
    enter: vi.fn(() => mockSelection),
    exit: vi.fn(() => mockSelection),
    append: vi.fn(() => mockSelection),
    attr: vi.fn(() => mockSelection),
    style: vi.fn(() => mockSelection),
    text: vi.fn(() => mockSelection),
    on: vi.fn(() => mockSelection),
    remove: vi.fn(() => mockSelection),
    classed: vi.fn(() => mockSelection),
    call: vi.fn(() => mockSelection),
    node: vi.fn(() => ({ getBBox: vi.fn(() => ({ width: 100, height: 50 })) })),
  };

  return {
    select: vi.fn(() => mockSelection),
    selectAll: vi.fn(() => mockSelection),
    zoom: vi.fn(() => ({ scaleExtent: vi.fn().mockReturnValue({ on: vi.fn() }) })),
    tree: vi.fn(() => ({ size: vi.fn().mockReturnValue({ separation: vi.fn() }) })),
    hierarchy: vi.fn(() => ({ descendants: vi.fn(() => []), links: vi.fn(() => []) })),
    linkHorizontal: vi.fn(() => vi.fn()),
  };
});

// 必要最小限のブラウザAPIモック
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

global.confirm = vi.fn(() => true);
global.alert = vi.fn();

// File System Access APIのモック
global.showOpenFilePicker = vi.fn();
global.showSaveFilePicker = vi.fn();

// localStorageは削除済み（settingsServiceで直接デフォルト値を使用）

// テスト中のコンソールログを制御（成功テストでは非表示にする）
const originalConsole = { ...console };
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: console.warn, // 警告は表示
  error: console.error, // エラーは表示
};

// テスト失敗時のみコンソールログを復元
global.addEventListener?.('error', () => {
  global.console = originalConsole;
});

// vitest の afterEach で失敗時のログ復元
if (typeof afterEach !== 'undefined') {
  afterEach(() => {
    // テスト失敗時はコンソールログを復元
    if (global.expect?.getState?.()?.testPath) {
      global.console = originalConsole;
    }
  });
}

// React act() 警告を抑制 - より包括的に対応
const originalError = console.error;
const originalWarn = console.warn;

// console.error の置き換え
console.error = (...args: unknown[]) => {
  const message = String(args[0] || '');
  if (
    message.includes('Warning: An update to') ||
    message.includes('act(...)') ||
    message.includes('Warning: You called act(') ||
    message.includes('was not wrapped in act') ||
    message.includes('When testing, code that causes React state updates should be wrapped into act') ||
    message.includes('This ensures that you\'re testing the behavior the user would see in the browser')
  ) {
    return; // React act 警告は無視
  }
  originalError.apply(console, args);
};

// console.warn の置き換え（念のため）
console.warn = (...args: unknown[]) => {
  const message = String(args[0] || '');
  if (
    message.includes('Warning: An update to') ||
    message.includes('act(...)') ||
    message.includes('was not wrapped in act')
  ) {
    return; // React act 警告は無視
  }
  originalWarn.apply(console, args);
};

// React Testing Library の act 警告も抑制
// @ts-expect-error global環境でのReact Act設定
global.IS_REACT_ACT_ENVIRONMENT = true;

// React DevTools のメッセージも抑制
if (typeof window !== 'undefined') {
  Object.defineProperty(window, '__REACT_DEVTOOLS_GLOBAL_HOOK__', {
    value: {
      isDisabled: true,
      supportsFiber: true,
      inject: () => {},
      onCommitFiberRoot: () => {},
      onCommitFiberUnmount: () => {},
    },
    writable: false,
    configurable: false,
  });
}

// SVGのモック
Object.defineProperty(global.SVGElement.prototype, 'getBBox', {
  value: vi.fn().mockReturnValue({ x: 0, y: 0, width: 100, height: 50 }),
});

// HTMLElementのモック
global.HTMLElement.prototype.scrollIntoView = vi.fn();

// matchMediaのモック
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
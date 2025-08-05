/**
 * テストセットアップファイル
 */

import '@testing-library/jest-dom';

// Vitest用のjest-dom型定義を手動で拡張
declare global {
  namespace Vi {
    interface JestAssertion<T = any> {
      toBeInTheDocument(): T;
      toHaveValue(value: any): T;
      toBeDisabled(): T;
      toHaveBeenCalled(): T;
      toHaveBeenCalledWith(...args: any[]): T;
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
  const MockEditor = vi.fn(({ value, onChange }) => 
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

// localStorageのモック
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// localStorageMockをグローバルで利用可能にする
(global as any).localStorageMock = localStorageMock;;
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// SVGのモック
Object.defineProperty(global.SVGElement.prototype, 'getBBox', {
  value: vi.fn().mockReturnValue({ x: 0, y: 0, width: 100, height: 50 }),
});

// HTMLElementのモック
global.HTMLElement.prototype.scrollIntoView = vi.fn();
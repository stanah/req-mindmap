/**
 * テストセットアップファイル
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';

// monaco-editorのモック
vi.mock('monaco-editor', () => ({
  default: {},
  editor: {
    setModelMarkers: vi.fn(),
    getModel: vi.fn(() => ({
      updateOptions: vi.fn(),
      setValue: vi.fn(),
      getValue: vi.fn(() => ''),
      onDidChangeContent: vi.fn(() => ({ dispose: vi.fn() })),
    })),
    create: vi.fn(() => ({
      getModel: vi.fn(() => ({
        updateOptions: vi.fn(),
        setValue: vi.fn(),
        getValue: vi.fn(() => ''),
        onDidChangeContent: vi.fn(() => ({ dispose: vi.fn() })),
      })),
      dispose: vi.fn(),
      onDidChangeModelContent: vi.fn(() => ({ dispose: vi.fn() })),
      updateOptions: vi.fn(),
      setValue: vi.fn(),
      getValue: vi.fn(() => ''),
    })),
  },
  languages: {
    setMonarchTokensProvider: vi.fn(),
    setLanguageConfiguration: vi.fn(),
    registerCompletionItemProvider: vi.fn(),
  },
  Range: vi.fn(() => ({})),
  Selection: vi.fn(() => ({})),
}));

// @monaco-editor/reactのモック
vi.mock('@monaco-editor/react', () => ({
  default: vi.fn(({ value, onChange, height = '100%', language, theme, options }) => 
    React.createElement('div', {
      'data-testid': 'monaco-editor',
      role: 'textbox',
      style: { height },
      contentEditable: true,
      suppressContentEditableWarning: true,
      onInput: (e) => {
        if (onChange) {
          onChange(e.target.textContent || '', {});
        }
      }
    }, value || '')
  ),
  Editor: vi.fn(({ value, onChange, height = '100%', language, theme, options }) => 
    React.createElement('div', {
      'data-testid': 'monaco-editor',
      role: 'textbox',
      style: { height },
      contentEditable: true,
      suppressContentEditableWarning: true,
      onInput: (e) => {
        if (onChange) {
          onChange(e.target.textContent || '', {});
        }
      }
    }, value || '')
  ),
}));

// D3.jsのモック
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
    transition: vi.fn(() => mockSelection),
    duration: vi.fn(() => mockSelection),
    call: vi.fn(() => mockSelection),
    node: vi.fn(() => ({
      getBBox: vi.fn(() => ({ x: 0, y: 0, width: 100, height: 50 })),
      getBoundingClientRect: vi.fn(() => ({ x: 0, y: 0, width: 100, height: 50 })),
    })),
    nodes: vi.fn(() => []),
    size: vi.fn(() => [100, 100]),
  };

  return {
    select: vi.fn(() => mockSelection),
    selectAll: vi.fn(() => mockSelection),
    zoom: vi.fn(() => ({
      scaleExtent: vi.fn(() => ({
        on: vi.fn(() => mockSelection),
      })),
      on: vi.fn(() => mockSelection),
    })),
    tree: vi.fn(() => ({
      size: vi.fn(() => ({
        separation: vi.fn(() => mockSelection),
      })),
    })),
    hierarchy: vi.fn(() => ({
      descendants: vi.fn(() => []),
      links: vi.fn(() => []),
    })),
    linkHorizontal: vi.fn(() => vi.fn()),
    scaleOrdinal: vi.fn(() => vi.fn()),
    schemeCategory10: [],
  };
});

// ブラウザAPIのモック
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// File System Access APIのモック
global.showOpenFilePicker = vi.fn();
global.showSaveFilePicker = vi.fn();

// SVG関連のモック
Object.defineProperty(global.SVGElement.prototype, 'getBBox', {
  value: vi.fn().mockReturnValue({
    x: 0,
    y: 0,
    width: 100,
    height: 50
  }),
  writable: true
});

// localStorageのモック
const localStorageMock = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
});

// HTMLElement.prototype.scrollIntoViewのモック
global.HTMLElement.prototype.scrollIntoView = vi.fn();

// matchMediaのモック
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
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

// グローバルなテスト設定
global.console = {
  ...console,
  // テスト中のログを抑制（必要に応じて）
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};
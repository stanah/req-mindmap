/**
 * ローカルストレージフックのテスト
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '../useLocalStorage';

// localStorageのモック
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// console.errorのモック
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('useLocalStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    consoleErrorSpy.mockClear();
  });

  describe('基本機能', () => {
    it('初期値を返す', () => {
      const { result } = renderHook(() => useLocalStorage('test-key', 'default-value'));
      
      expect(result.current[0]).toBe('default-value');
      expect(localStorageMock.getItem).toHaveBeenCalledWith('test-key');
    });

    it('保存された値を読み込む', () => {
      localStorageMock.getItem.mockReturnValue('"saved-value"');
      
      const { result } = renderHook(() => useLocalStorage('test-key', 'default-value'));
      
      expect(result.current[0]).toBe('saved-value');
    });

    it('値を設定できる', () => {
      const { result } = renderHook(() => useLocalStorage('test-key', 'default-value'));
      
      act(() => {
        result.current[1]('new-value');
      });
      
      expect(result.current[0]).toBe('new-value');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('test-key', '"new-value"');
    });

    it('関数を使って値を更新できる', () => {
      const { result } = renderHook(() => useLocalStorage('test-key', 10));
      
      act(() => {
        result.current[1]((prev) => prev + 5);
      });
      
      expect(result.current[0]).toBe(15);
      expect(localStorageMock.setItem).toHaveBeenCalledWith('test-key', '15');
    });
  });

  describe('データ型の処理', () => {
    it('文字列を正しく処理する', () => {
      localStorageMock.getItem.mockReturnValue('"hello world"');
      
      const { result } = renderHook(() => useLocalStorage('string-key', ''));
      
      expect(result.current[0]).toBe('hello world');
    });

    it('数値を正しく処理する', () => {
      localStorageMock.getItem.mockReturnValue('42');
      
      const { result } = renderHook(() => useLocalStorage('number-key', 0));
      
      expect(result.current[0]).toBe(42);
    });

    it('ブール値を正しく処理する', () => {
      localStorageMock.getItem.mockReturnValue('true');
      
      const { result } = renderHook(() => useLocalStorage('boolean-key', false));
      
      expect(result.current[0]).toBe(true);
    });

    it('オブジェクトを正しく処理する', () => {
      const testObject = { name: 'test', value: 123 };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(testObject));
      
      const { result } = renderHook(() => useLocalStorage('object-key', {}));
      
      expect(result.current[0]).toEqual(testObject);
    });

    it('配列を正しく処理する', () => {
      const testArray = [1, 2, 3, 'test'];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(testArray));
      
      const { result } = renderHook(() => useLocalStorage('array-key', []));
      
      expect(result.current[0]).toEqual(testArray);
    });

    it('nullを正しく処理する', () => {
      localStorageMock.getItem.mockReturnValue('null');
      
      const { result } = renderHook(() => useLocalStorage('null-key', 'default'));
      
      expect(result.current[0]).toBeNull();
    });
  });

  describe('エラーハンドリング', () => {
    it('無効なJSONの場合は初期値を使用する', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');
      
      const { result } = renderHook(() => useLocalStorage('invalid-key', 'default-value'));
      
      expect(result.current[0]).toBe('default-value');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error reading localStorage key "invalid-key":',
        expect.any(SyntaxError)
      );
    });

    it('setItemでエラーが発生した場合はエラーをログに出力する', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      
      const { result } = renderHook(() => useLocalStorage('test-key', 'default'));
      
      act(() => {
        result.current[1]('new-value');
      });
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error setting localStorage key "test-key":',
        expect.any(Error)
      );
    });

    it('getItemでエラーが発生した場合は初期値を使用する', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('localStorage not available');
      });
      
      const { result } = renderHook(() => useLocalStorage('test-key', 'default-value'));
      
      expect(result.current[0]).toBe('default-value');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error reading localStorage key "test-key":',
        expect.any(Error)
      );
    });
  });

  describe('複数のインスタンス', () => {
    it('同じキーを使用する複数のフックが同期される', () => {
      const { result: result1 } = renderHook(() => useLocalStorage('shared-key', 'initial'));
      const { result: result2 } = renderHook(() => useLocalStorage('shared-key', 'initial'));
      
      expect(result1.current[0]).toBe('initial');
      expect(result2.current[0]).toBe('initial');
      
      act(() => {
        result1.current[1]('updated');
      });
      
      expect(result1.current[0]).toBe('updated');
      expect(result2.current[0]).toBe('updated');
    });

    it('異なるキーを使用するフックは独立している', () => {
      const { result: result1 } = renderHook(() => useLocalStorage('key1', 'value1'));
      const { result: result2 } = renderHook(() => useLocalStorage('key2', 'value2'));
      
      act(() => {
        result1.current[1]('updated1');
      });
      
      expect(result1.current[0]).toBe('updated1');
      expect(result2.current[0]).toBe('value2');
    });
  });

  describe('パフォーマンス', () => {
    it('同じ値を設定した場合はlocalStorageに書き込まない', () => {
      const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
      
      act(() => {
        result.current[1]('initial');
      });
      
      // 初期化時の1回のみ
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
    });

    it('オブジェクトの参照が同じ場合は書き込まない', () => {
      const initialObject = { name: 'test' };
      const { result } = renderHook(() => useLocalStorage('test-key', initialObject));
      
      act(() => {
        result.current[1](initialObject);
      });
      
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
    });
  });

  describe('特殊なケース', () => {
    it('undefinedを初期値として使用できる', () => {
      const { result } = renderHook(() => useLocalStorage('undefined-key', undefined));
      
      expect(result.current[0]).toBeUndefined();
    });

    it('関数を初期値として使用できる', () => {
      const initializer = vi.fn(() => 'computed-value');
      const { result } = renderHook(() => useLocalStorage('function-key', initializer));
      
      expect(result.current[0]).toBe('computed-value');
      expect(initializer).toHaveBeenCalledTimes(1);
    });

    it('関数を値として保存できる', () => {
      const testFunction = () => 'test';
      const { result } = renderHook(() => useLocalStorage<() => string>('function-value-key', () => 'default'));
      
      act(() => {
        result.current[1](testFunction);
      });
      
      expect(result.current[0]).toBe(testFunction);
    });

    it('空文字列を正しく処理する', () => {
      localStorageMock.getItem.mockReturnValue('""');
      
      const { result } = renderHook(() => useLocalStorage('empty-string-key', 'default'));
      
      expect(result.current[0]).toBe('');
    });

    it('0を正しく処理する', () => {
      localStorageMock.getItem.mockReturnValue('0');
      
      const { result } = renderHook(() => useLocalStorage('zero-key', 1));
      
      expect(result.current[0]).toBe(0);
    });

    it('falseを正しく処理する', () => {
      localStorageMock.getItem.mockReturnValue('false');
      
      const { result } = renderHook(() => useLocalStorage('false-key', true));
      
      expect(result.current[0]).toBe(false);
    });
  });

  describe('型安全性', () => {
    it('TypeScriptの型推論が正しく動作する', () => {
      // 文字列型
      const { result: stringResult } = renderHook(() => useLocalStorage('string-key', 'default'));
      const [stringValue, setStringValue] = stringResult.current;
      
      // 型チェック（コンパイル時）
      expect(typeof stringValue).toBe('string');
      
      act(() => {
        setStringValue('new string');
      });
      
      // 数値型
      const { result: numberResult } = renderHook(() => useLocalStorage('number-key', 42));
      const [numberValue, setNumberValue] = numberResult.current;
      
      expect(typeof numberValue).toBe('number');
      
      act(() => {
        setNumberValue(100);
      });
      
      // オブジェクト型
      interface TestObject {
        name: string;
        count: number;
      }
      
      const { result: objectResult } = renderHook(() => 
        useLocalStorage<TestObject>('object-key', { name: 'test', count: 0 })
      );
      const [objectValue, setObjectValue] = objectResult.current;
      
      expect(typeof objectValue).toBe('object');
      expect(objectValue.name).toBe('test');
      
      act(() => {
        setObjectValue({ name: 'updated', count: 1 });
      });
    });
  });
});
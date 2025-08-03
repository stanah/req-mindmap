import { useState, useEffect } from 'react';

/**
 * ローカルストレージと同期するカスタムフック
 * @param key ローカルストレージのキー
 * @param initialValue 初期値
 * @returns [値, セッター関数]
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T)
): [T, (value: T | ((val: T) => T)) => void] {
  // ローカルストレージから初期値を取得
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        return JSON.parse(item);
      } else {
        // 初期値が関数の場合は実行する
        return typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
      }
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue;
    }
  });

  // 値を設定し、ローカルストレージに保存
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // 関数の値を保存する場合と更新関数として使用する場合を区別
      // 更新関数の場合は引数の数で判定
      let valueToStore: T;
      if (typeof value === 'function') {
        const func = value as any;
        // 引数が1つある場合は更新関数として扱う
        if (func.length === 1) {
          valueToStore = func(storedValue);
        } else {
          // 引数がない場合は関数そのものを値として保存
          valueToStore = value as T;
        }
      } else {
        valueToStore = value;
      }
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
      
      // 他のタブ/ウィンドウに変更を通知
      window.dispatchEvent(new StorageEvent('storage', {
        key,
        newValue: JSON.stringify(valueToStore),
        oldValue: window.localStorage.getItem(key),
        storageArea: window.localStorage
      }));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  // ローカルストレージの変更を監視
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          console.error(`Error parsing localStorage value for key "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [storedValue, setValue];
}
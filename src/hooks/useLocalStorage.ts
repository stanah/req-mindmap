import { useState, useEffect, useCallback } from 'react';

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

  // 同じキーを使用する他のインスタンスに通知するためのカスタムイベント
  const notifyOtherInstances = useCallback((newValue: T) => {
    // カスタムイベントで同じページ内の他のインスタンスに通知
    window.dispatchEvent(new CustomEvent(`localStorage-${key}`, {
      detail: { newValue }
    }));
  }, [key]);

  // 値を設定し、ローカルストレージに保存
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      // 関数の値を保存する場合と更新関数として使用する場合を区別
      // 更新関数の場合は引数の数で判定
      let valueToStore: T;
      if (typeof value === 'function') {
        const func = value as (val: T) => T;
        // 引数が1つある場合は更新関数として扱う
        if (func.length === 1) {
          valueToStore = func(storedValue);
        } else {
          // 引数がない場合は関数そのものを値として保存
          // ただし、関数はJSONシリアライズできないため、文字列化する
          if (typeof value === 'function') {
            // 関数の場合は文字列として保存し、特別なマーカーを付ける
            const functionData = {
              __isFunction: true,
              __functionString: value.toString(),
              __originalFunction: value
            };
            valueToStore = functionData as T;
          } else {
            valueToStore = value as T;
          }
        }
      } else {
        valueToStore = value;
      }

      // 同じ値の場合は更新をスキップ（パフォーマンス最適化）
      if (JSON.stringify(storedValue) === JSON.stringify(valueToStore)) {
        return;
      }

      setStoredValue(valueToStore);
      
      // 関数の場合は特別な処理でlocalStorageに保存
      let storageValue = valueToStore;
      if (typeof valueToStore === 'object' && valueToStore !== null && (valueToStore as { __isFunction?: boolean }).__isFunction) {
        // 関数の場合は__originalFunctionは除いてシリアライズ
        const { __originalFunction, ...serializableData } = valueToStore as { __originalFunction: unknown, [key: string]: unknown };
        storageValue = serializableData;
      }
      
      window.localStorage.setItem(key, JSON.stringify(storageValue));
      
      // 他のインスタンスに通知
      notifyOtherInstances(valueToStore);
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue, notifyOtherInstances]);

  // ローカルストレージの変更を監視（他のタブ/ウィンドウから）
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          const parsedValue = JSON.parse(e.newValue);
          
          // 関数データの場合は復元
          if (typeof parsedValue === 'object' && parsedValue !== null && parsedValue.__isFunction) {
            // 関数文字列から関数を復元
            try {
              const restoredFunction = new Function('return ' + parsedValue.__functionString)();
              setStoredValue(restoredFunction);
            } catch (funcError) {
              console.error('Failed to restore function:', funcError);
              setStoredValue(parsedValue);
            }
          } else {
            setStoredValue(parsedValue);
          }
        } catch (error) {
          console.error(`Error parsing localStorage value for key "${key}":`, error);
        }
      }
    };

    // 同一ページ内の他のインスタンスからの変更を監視
    const handleCustomEvent = (e: CustomEvent) => {
      setStoredValue(e.detail.newValue);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(`localStorage-${key}`, handleCustomEvent as EventListener);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(`localStorage-${key}`, handleCustomEvent as EventListener);
    };
  }, [key]);

  return [storedValue, setValue];
}
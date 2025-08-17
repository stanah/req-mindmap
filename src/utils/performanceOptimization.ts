/**
 * パフォーマンス最適化ユーティリティ
 * Re-render storm 防止と効率的な更新のためのヘルパー関数群
 */

import { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { useAppStore } from '../stores/appStore';
import { createSafeDebounce, createSafeThrottle, TimerManager } from './memoryLeakPrevention';

/**
 * 深い比較用のユーティリティ
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  
  if (a == null || b == null) return a === b;
  
  if (typeof a !== typeof b) return false;
  
  if (typeof a !== 'object') return a === b;
  
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  
  return true;
}

/**
 * 最適化されたメモ化フック
 * 深い比較を使用してより正確な依存関係チェックを行う
 */
export function useDeepMemo<T>(factory: () => T, deps: React.DependencyList): T {
  const ref = useRef<{ deps: React.DependencyList; value: T }>();
  
  if (!ref.current || !deepEqual(ref.current.deps, deps)) {
    ref.current = {
      deps: [...deps],
      value: factory()
    };
  }
  
  return ref.current.value;
}

/**
 * 最適化されたコールバックフック
 * 深い比較を使用してより正確な依存関係チェックを行う
 */
export function useDeepCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  return useDeepMemo(() => callback, deps);
}

/**
 * 安定したセレクターフック
 * Zustand ストアで頻繁な再レンダリングを防ぐ
 */
export function useStableSelector<T>(
  selector: (state: ReturnType<typeof useAppStore.getState>) => T,
  equalityFn?: (a: T, b: T) => boolean
): T {
  const store = useAppStore();
  
  return useMemo(() => {
    return selector(store);
  }, [store, selector, equalityFn]);
}

/**
 * バッチ更新フック
 * 複数の状態更新を一度にまとめて実行
 */
export function useBatchedUpdates() {
  const updateQueue = useRef<Array<() => void>>([]);
  const timerManager = useRef(new TimerManager());
  const isProcessing = useRef(false);
  
  const addUpdate = useCallback((update: () => void) => {
    updateQueue.current.push(update);
    
    if (!isProcessing.current) {
      isProcessing.current = true;
      
      // 次のマイクロタスクで実行
      timerManager.current.setTimeout(() => {
        const updates = updateQueue.current.splice(0);
        updates.forEach(update => update());
        isProcessing.current = false;
      }, 0);
    }
  }, []);
  
  useEffect(() => {
    return () => {
      timerManager.current.clearAll();
    };
  }, []);
  
  return addUpdate;
}

/**
 * デバウンス付きストア更新フック
 */
export function useDebouncedStoreUpdate<T>(
  selector: (state: ReturnType<typeof useAppStore.getState>) => T,
  updater: (value: T) => void,
  delay: number = 300
) {
  const timerManager = useRef(new TimerManager());
  const lastValue = useRef<T>();
  
  const debouncedUpdate = useMemo(() => {
    return createSafeDebounce((value: T) => {
      if (!deepEqual(lastValue.current, value)) {
        lastValue.current = value;
        updater(value);
      }
    }, delay, timerManager.current);
  }, [updater, delay]);
  
  const currentValue = useAppStore(selector, (a, b) => deepEqual(a, b));
  
  useEffect(() => {
    debouncedUpdate(currentValue);
  }, [currentValue, debouncedUpdate]);
  
  useEffect(() => {
    return () => {
      debouncedUpdate.cancel();
      timerManager.current.clearAll();
    };
  }, [debouncedUpdate]);
}

/**
 * スロットル付きイベントハンドラーフック
 */
export function useThrottledEventHandler<T extends (...args: any[]) => void>(
  handler: T,
  delay: number = 100
): T {
  const timerManager = useRef(new TimerManager());
  
  const throttledHandler = useMemo(() => {
    return createSafeThrottle(handler, delay, timerManager.current);
  }, [handler, delay]);
  
  useEffect(() => {
    return () => {
      throttledHandler.cancel();
      timerManager.current.clearAll();
    };
  }, [throttledHandler]);
  
  return throttledHandler as T;
}

/**
 * レンダリング回数監視フック（開発用）
 */
export function useRenderCount(name: string = 'Component') {
  const renderCount = useRef(0);
  
  useEffect(() => {
    renderCount.current += 1;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${name} rendered ${renderCount.current} times`);
      
      // 異常な再レンダリング数を警告
      if (renderCount.current > 10) {
        console.warn(`[Performance] ${name} has rendered ${renderCount.current} times - potential performance issue`);
      }
    }
  });
  
  return renderCount.current;
}

/**
 * 大きなデータセット用の仮想化選択フック
 */
export function useVirtualizedSelection<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  return useMemo(() => {
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const totalCount = items.length;
    
    // 表示範囲を計算
    const startIndex = 0;
    const endIndex = Math.min(visibleCount + overscan, totalCount);
    
    return {
      visibleItems: items.slice(startIndex, endIndex),
      startIndex,
      endIndex,
      totalCount,
      offsetY: startIndex * itemHeight
    };
  }, [items, itemHeight, containerHeight, overscan]);
}

/**
 * メモリ効率的なキャッシュフック
 */
export function useMemoryEfficientCache<K, V>(maxSize: number = 100) {
  const cache = useRef(new Map<K, V>());
  
  const get = useCallback((key: K): V | undefined => {
    return cache.current.get(key);
  }, []);
  
  const set = useCallback((key: K, value: V): void => {
    // LRU実装：サイズ上限に達したら最も古いエントリを削除
    if (cache.current.size >= maxSize && !cache.current.has(key)) {
      const firstKey = cache.current.keys().next().value;
      cache.current.delete(firstKey);
    }
    
    // 既存キーの場合は削除してから追加（LRU順序更新）
    if (cache.current.has(key)) {
      cache.current.delete(key);
    }
    
    cache.current.set(key, value);
  }, [maxSize]);
  
  const clear = useCallback(() => {
    cache.current.clear();
  }, []);
  
  const has = useCallback((key: K): boolean => {
    return cache.current.has(key);
  }, []);
  
  return { get, set, clear, has, size: cache.current.size };
}

/**
 * パフォーマンス測定フック
 */
export function usePerformanceMeasurement(name: string) {
  const startTime = useRef<number>();
  
  const start = useCallback(() => {
    startTime.current = performance.now();
  }, []);
  
  const end = useCallback(() => {
    if (startTime.current) {
      const duration = performance.now() - startTime.current;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
      }
      
      startTime.current = undefined;
      return duration;
    }
    return 0;
  }, [name]);
  
  return { start, end };
}

/**
 * リアクティブな要素サイズ観測フック
 * ResizeObserver を使用してパフォーマンスを最適化
 */
export function useElementSize() {
  const ref = useRef<HTMLElement>(null);
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setSize({ width, height });
      }
    });
    
    resizeObserver.observe(element);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);
  
  return [ref, size] as const;
}


/**
 * メモリリーク防止のためのユーティリティ関数群
 */

/**
 * 安全なタイマー型定義
 */
export type SafeTimerId = ReturnType<typeof setTimeout>;

/**
 * タイマーマネージャークラス
 * 複数のタイマーを管理し、一括でクリアできる
 */
export class TimerManager {
  private timers = new Set<SafeTimerId>();

  /**
   * タイマーを作成して管理対象に追加
   */
  setTimeout(callback: () => void, delay: number): SafeTimerId {
    const timerId = setTimeout(() => {
      this.timers.delete(timerId);
      callback();
    }, delay);
    
    this.timers.add(timerId);
    return timerId;
  }

  /**
   * 特定のタイマーをクリア
   */
  clearTimeout(timerId: SafeTimerId): void {
    clearTimeout(timerId);
    this.timers.delete(timerId);
  }

  /**
   * 全てのタイマーをクリア
   */
  clearAll(): void {
    this.timers.forEach(timerId => {
      clearTimeout(timerId);
    });
    this.timers.clear();
  }

  /**
   * 管理中のタイマー数を取得
   */
  getTimerCount(): number {
    return this.timers.size;
  }

  /**
   * 全てのタイマーがクリアされているかチェック
   */
  isEmpty(): boolean {
    return this.timers.size === 0;
  }
}

/**
 * イベントリスナーマネージャークラス
 * 複数のイベントリスナーを管理し、一括で削除できる
 */
export class EventListenerManager {
  private listeners = new Map<EventTarget, Array<{
    type: string;
    listener: EventListener;
    options?: boolean | AddEventListenerOptions;
  }>>();

  /**
   * イベントリスナーを追加して管理対象に登録
   */
  addEventListener<K extends keyof DocumentEventMap>(
    target: Document,
    type: K,
    listener: (this: Document, ev: DocumentEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener<K extends keyof WindowEventMap>(
    target: Window,
    type: K,
    listener: (this: Window, ev: WindowEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: boolean | AddEventListenerOptions
  ): void {
    target.addEventListener(type, listener, options);
    
    if (!this.listeners.has(target)) {
      this.listeners.set(target, []);
    }
    
    this.listeners.get(target)!.push({ type, listener, options });
  }

  /**
   * 特定のイベントリスナーを削除
   */
  removeEventListener(
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: boolean | EventListenerOptions
  ): void {
    target.removeEventListener(type, listener, options);
    
    const targetListeners = this.listeners.get(target);
    if (targetListeners) {
      const index = targetListeners.findIndex(
        item => item.type === type && item.listener === listener
      );
      if (index !== -1) {
        targetListeners.splice(index, 1);
      }
      
      if (targetListeners.length === 0) {
        this.listeners.delete(target);
      }
    }
  }

  /**
   * 全てのイベントリスナーを削除
   */
  removeAll(): void {
    this.listeners.forEach((listeners, target) => {
      listeners.forEach(({ type, listener, options }) => {
        target.removeEventListener(type, listener, options);
      });
    });
    this.listeners.clear();
  }

  /**
   * 管理中のイベントリスナー数を取得
   */
  getListenerCount(): number {
    let count = 0;
    this.listeners.forEach(listeners => {
      count += listeners.length;
    });
    return count;
  }

  /**
   * 全てのイベントリスナーが削除されているかチェック
   */
  isEmpty(): boolean {
    return this.listeners.size === 0;
  }
}

/**
 * メモリリーク防止のためのリソースマネージャー
 * タイマーとイベントリスナーを統合管理
 */
export class ResourceManager {
  private timerManager = new TimerManager();
  private eventListenerManager = new EventListenerManager();

  /**
   * タイマーマネージャーを取得
   */
  get timers(): TimerManager {
    return this.timerManager;
  }

  /**
   * イベントリスナーマネージャーを取得
   */
  get eventListeners(): EventListenerManager {
    return this.eventListenerManager;
  }

  /**
   * 全てのリソースを一括クリーンアップ
   */
  cleanup(): void {
    this.timerManager.clearAll();
    this.eventListenerManager.removeAll();
  }

  /**
   * リソースの使用状況を取得
   */
  getResourceUsage(): {
    timers: number;
    eventListeners: number;
  } {
    return {
      timers: this.timerManager.getTimerCount(),
      eventListeners: this.eventListenerManager.getListenerCount(),
    };
  }

  /**
   * 全てのリソースがクリーンアップされているかチェック
   */
  isClean(): boolean {
    return this.timerManager.isEmpty() && this.eventListenerManager.isEmpty();
  }
}

/**
 * デバウンス関数（メモリリーク防止版）
 */
export function createSafeDebounce<T extends (...args: unknown[]) => void>(
  func: T,
  delay: number,
  timerManager?: TimerManager
): T & { cancel: () => void } {
  const manager = timerManager || new TimerManager();
  let timerId: SafeTimerId | null = null;

  const debouncedFunction = ((...args: Parameters<T>) => {
    if (timerId) {
      manager.clearTimeout(timerId);
    }
    
    timerId = manager.setTimeout(() => {
      timerId = null;
      func(...args);
    }, delay);
  }) as T & { cancel: () => void };

  debouncedFunction.cancel = () => {
    if (timerId) {
      manager.clearTimeout(timerId);
      timerId = null;
    }
  };

  return debouncedFunction;
}

/**
 * スロットル関数（メモリリーク防止版）
 */
export function createSafeThrottle<T extends (...args: unknown[]) => void>(
  func: T,
  delay: number,
  timerManager?: TimerManager
): T & { cancel: () => void } {
  const manager = timerManager || new TimerManager();
  let lastExecTime = 0;
  let timerId: SafeTimerId | null = null;

  const throttledFunction = ((...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastExecTime >= delay) {
      lastExecTime = now;
      func(...args);
    } else if (!timerId) {
      timerId = manager.setTimeout(() => {
        lastExecTime = Date.now();
        timerId = null;
        func(...args);
      }, delay - (now - lastExecTime));
    }
  }) as T & { cancel: () => void };

  throttledFunction.cancel = () => {
    if (timerId) {
      manager.clearTimeout(timerId);
      timerId = null;
    }
  };

  return throttledFunction;
}

/**
 * リソース使用量の監視とログ出力
 */
export function monitorResourceUsage(
  manager: ResourceManager,
  intervalMs: number = 10000
): () => void {
  let monitorTimerId: SafeTimerId | null = null;

  const startMonitoring = () => {
    const monitor = () => {
      const usage = manager.getResourceUsage();
      if (usage.timers > 0 || usage.eventListeners > 0) {
        console.warn('[ResourceManager] リソース使用量:', usage);
      }
      
      monitorTimerId = setTimeout(monitor, intervalMs);
    };
    
    monitor();
  };

  const stopMonitoring = () => {
    if (monitorTimerId) {
      clearTimeout(monitorTimerId);
      monitorTimerId = null;
    }
  };

  startMonitoring();
  return stopMonitoring;
}
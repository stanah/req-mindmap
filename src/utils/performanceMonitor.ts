/**
 * パフォーマンス監視とメモリ使用量の監視ユーティリティ
 * 
 * 大規模データでの描画パフォーマンス最適化と
 * メモリ使用量の監視・最適化を提供します。
 */

/**
 * パフォーマンス測定結果
 */
export interface PerformanceMetrics {
  /** 測定名 */
  name: string;
  /** 開始時刻 */
  startTime: number;
  /** 終了時刻 */
  endTime: number;
  /** 実行時間（ミリ秒） */
  duration: number;
  /** メモリ使用量（バイト） */
  memoryUsage?: number;
  /** 追加のメタデータ */
  metadata?: Record<string, unknown>;
}

/**
 * メモリ使用量情報
 */
export interface MemoryInfo {
  /** 使用中のJSヒープサイズ（バイト） */
  usedJSHeapSize: number;
  /** 総JSヒープサイズ（バイト） */
  totalJSHeapSize: number;
  /** JSヒープサイズ制限（バイト） */
  jsHeapSizeLimit: number;
  /** 使用率（0-1） */
  usageRatio: number;
}

/**
 * パフォーマンス監視クラス
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private measurements: Map<string, number> = new Map();
  private metrics: PerformanceMetrics[] = [];
  private memoryCheckInterval: NodeJS.Timeout | null = null;
  private memoryThreshold = 0.8; // 80%でアラート
  private onMemoryWarning?: (info: MemoryInfo) => void;

  private constructor() {}

  /**
   * シングルトンインスタンスを取得
   */
  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * パフォーマンス測定を開始
   */
  public startMeasurement(name: string, metadata?: Record<string, unknown>): void {
    const startTime = performance.now();
    this.measurements.set(name, startTime);
    
    // Performance APIを使用してマークを作成
    if (performance.mark) {
      performance.mark(`${name}-start`);
    }
    
    if (metadata) {
      console.debug(`[Performance] Started: ${name}`, metadata);
    }
  }

  /**
   * パフォーマンス測定を終了
   */
  public endMeasurement(name: string, metadata?: Record<string, unknown>): PerformanceMetrics | null {
    const endTime = performance.now();
    const startTime = this.measurements.get(name);
    
    if (startTime === undefined) {
      console.warn(`[Performance] No start measurement found for: ${name}`);
      return null;
    }

    const duration = endTime - startTime;
    const memoryUsage = this.getCurrentMemoryUsage()?.usedJSHeapSize;

    const metric: PerformanceMetrics = {
      name,
      startTime,
      endTime,
      duration,
      memoryUsage,
      metadata,
    };

    this.metrics.push(metric);
    this.measurements.delete(name);

    // Performance APIを使用してマークと測定を作成
    if (performance.mark && performance.measure) {
      performance.mark(`${name}-end`);
      try {
        performance.measure(name, `${name}-start`, `${name}-end`);
      } catch (error) {
        console.warn(`[Performance] Failed to create measure for: ${name}`, error);
      }
    }

    // 長時間の処理に対して警告
    if (duration > 1000) {
      console.warn(`[Performance] Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
    }

    console.debug(`[Performance] Completed: ${name} in ${duration.toFixed(2)}ms`, metadata);
    
    return metric;
  }

  /**
   * 現在のメモリ使用量を取得
   */
  public getCurrentMemoryUsage(): MemoryInfo | null {
    if (!('memory' in performance)) {
      return null;
    }

    const memory = (performance as { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usageRatio: memory.usedJSHeapSize / memory.jsHeapSizeLimit,
    };
  }

  /**
   * メモリ監視を開始
   */
  public startMemoryMonitoring(
    intervalMs: number = 5000,
    onWarning?: (info: MemoryInfo) => void
  ): void {
    this.onMemoryWarning = onWarning;
    
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
    }

    this.memoryCheckInterval = setInterval(() => {
      const memoryInfo = this.getCurrentMemoryUsage();
      if (memoryInfo && memoryInfo.usageRatio > this.memoryThreshold) {
        console.warn('[Performance] High memory usage detected:', memoryInfo);
        if (this.onMemoryWarning) {
          this.onMemoryWarning(memoryInfo);
        }
      }
    }, intervalMs);
  }

  /**
   * メモリ監視を停止
   */
  public stopMemoryMonitoring(): void {
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }
  }

  /**
   * メモリ警告閾値を設定
   */
  public setMemoryThreshold(threshold: number): void {
    this.memoryThreshold = Math.max(0.1, Math.min(1.0, threshold));
  }

  /**
   * ガベージコレクションを強制実行（可能な場合）
   */
  public forceGarbageCollection(): void {
    if ('gc' in window && typeof (window as { gc?: () => void }).gc === 'function') {
      console.debug('[Performance] Forcing garbage collection');
      (window as { gc: () => void }).gc();
    } else {
      console.debug('[Performance] Garbage collection not available');
    }
  }

  /**
   * パフォーマンス統計を取得
   */
  public getMetrics(filterName?: string): PerformanceMetrics[] {
    if (filterName) {
      return this.metrics.filter(m => m.name.includes(filterName));
    }
    return [...this.metrics];
  }

  /**
   * パフォーマンス統計をクリア
   */
  public clearMetrics(): void {
    this.metrics = [];
    this.measurements.clear();
    
    // Performance APIのマークもクリア
    if (performance.clearMarks) {
      performance.clearMarks();
    }
    if (performance.clearMeasures) {
      performance.clearMeasures();
    }
  }

  /**
   * パフォーマンス統計のサマリーを取得
   */
  public getMetricsSummary(name?: string): {
    count: number;
    totalDuration: number;
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
    lastMemoryUsage?: number;
  } | null {
    const filteredMetrics = name 
      ? this.metrics.filter(m => m.name === name)
      : this.metrics;

    if (filteredMetrics.length === 0) {
      return null;
    }

    const durations = filteredMetrics.map(m => m.duration);
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    const lastMetric = filteredMetrics[filteredMetrics.length - 1];

    return {
      count: filteredMetrics.length,
      totalDuration,
      averageDuration: totalDuration / filteredMetrics.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      lastMemoryUsage: lastMetric.memoryUsage,
    };
  }

  /**
   * パフォーマンス統計をコンソールに出力
   */
  public logMetrics(name?: string): void {
    const summary = this.getMetricsSummary(name);
    if (!summary) {
      console.log('[Performance] No metrics found');
      return;
    }

    console.group(`[Performance] Metrics Summary${name ? ` for "${name}"` : ''}`);
    console.log(`Count: ${summary.count}`);
    console.log(`Total Duration: ${summary.totalDuration.toFixed(2)}ms`);
    console.log(`Average Duration: ${summary.averageDuration.toFixed(2)}ms`);
    console.log(`Min Duration: ${summary.minDuration.toFixed(2)}ms`);
    console.log(`Max Duration: ${summary.maxDuration.toFixed(2)}ms`);
    if (summary.lastMemoryUsage) {
      console.log(`Last Memory Usage: ${(summary.lastMemoryUsage / 1024 / 1024).toFixed(2)}MB`);
    }
    console.groupEnd();
  }

  /**
   * リソースのクリーンアップ
   */
  public destroy(): void {
    this.stopMemoryMonitoring();
    this.clearMetrics();
    this.onMemoryWarning = undefined;
  }
}

/**
 * デバウンス関数（パフォーマンス最適化用）
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
  immediate = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    
    const callNow = immediate && !timeout;
    
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(later, wait);
    
    if (callNow) {
      func(...args);
    }
  };
}

/**
 * スロットル関数（パフォーマンス最適化用）
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * RAF（RequestAnimationFrame）ベースのスロットル
 */
export function rafThrottle<TArgs extends readonly unknown[], TReturn>(
  func: (...args: TArgs) => TReturn
): (...args: TArgs) => void {
  let rafId: number | null = null;
  
  return function executedFunction(...args: TArgs) {
    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        func(...args);
        rafId = null;
      });
    }
  };
}

/**
 * 非同期処理のバッチ実行
 */
export class BatchProcessor<T> {
  private queue: T[] = [];
  private processing = false;
  private batchSize: number;
  private processFn: (items: T[]) => Promise<void>;
  private delayMs: number;

  constructor(
    processFn: (items: T[]) => Promise<void>,
    batchSize = 50,
    delayMs = 16 // 約60FPS
  ) {
    this.processFn = processFn;
    this.batchSize = batchSize;
    this.delayMs = delayMs;
  }

  /**
   * アイテムをキューに追加
   */
  public add(item: T): void {
    this.queue.push(item);
    this.scheduleProcessing();
  }

  /**
   * 複数のアイテムをキューに追加
   */
  public addBatch(items: T[]): void {
    this.queue.push(...items);
    this.scheduleProcessing();
  }

  /**
   * 処理をスケジュール
   */
  private scheduleProcessing(): void {
    if (this.processing) return;

    this.processing = true;
    setTimeout(() => this.processQueue(), this.delayMs);
  }

  /**
   * キューを処理
   */
  private async processQueue(): Promise<void> {
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.batchSize);
      
      try {
        await this.processFn(batch);
      } catch (error) {
        console.error('[BatchProcessor] Error processing batch:', error);
      }
      
      // 次のバッチまで少し待機（UIをブロックしないため）
      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.delayMs));
      }
    }
    
    this.processing = false;
  }

  /**
   * キューをクリア
   */
  public clear(): void {
    this.queue = [];
  }

  /**
   * キューのサイズを取得
   */
  public getQueueSize(): number {
    return this.queue.length;
  }
}

// グローバルインスタンス
export const performanceMonitor = PerformanceMonitor.getInstance();
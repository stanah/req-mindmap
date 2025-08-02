/**
 * パフォーマンス監視機能のテスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PerformanceMonitor, debounce, throttle, rafThrottle, BatchProcessor } from '../performanceMonitor';

// モックのセットアップ
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
  clearMarks: vi.fn(),
  clearMeasures: vi.fn(),
  memory: {
    usedJSHeapSize: 10 * 1024 * 1024, // 10MB
    totalJSHeapSize: 20 * 1024 * 1024, // 20MB
    jsHeapSizeLimit: 100 * 1024 * 1024, // 100MB
  },
};

// グローバルのperformanceをモック
Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true,
});

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = PerformanceMonitor.getInstance();
    monitor.clearMetrics();
    vi.clearAllMocks();
  });

  afterEach(() => {
    monitor.stopMemoryMonitoring();
  });

  describe('測定機能', () => {
    it('パフォーマンス測定を開始・終了できる', () => {
      const testName = 'test-measurement';
      
      monitor.startMeasurement(testName);
      
      // 少し時間を進める
      mockPerformance.now.mockReturnValue(Date.now() + 100);
      
      const result = monitor.endMeasurement(testName);
      
      expect(result).toBeDefined();
      expect(result?.name).toBe(testName);
      expect(result?.duration).toBeGreaterThan(0);
    });

    it('存在しない測定を終了しようとするとnullを返す', () => {
      const result = monitor.endMeasurement('non-existent');
      expect(result).toBeNull();
    });

    it('メタデータ付きで測定できる', () => {
      const testName = 'test-with-metadata';
      const metadata = { nodeCount: 100, type: 'render' };
      
      monitor.startMeasurement(testName, metadata);
      mockPerformance.now.mockReturnValue(Date.now() + 50);
      const result = monitor.endMeasurement(testName, { success: true });
      
      expect(result?.metadata).toEqual({ success: true });
    });
  });

  describe('メモリ監視', () => {
    it('現在のメモリ使用量を取得できる', () => {
      const memoryInfo = monitor.getCurrentMemoryUsage();
      
      expect(memoryInfo).toBeDefined();
      expect(memoryInfo?.usedJSHeapSize).toBe(10 * 1024 * 1024);
      expect(memoryInfo?.totalJSHeapSize).toBe(20 * 1024 * 1024);
      expect(memoryInfo?.jsHeapSizeLimit).toBe(100 * 1024 * 1024);
      expect(memoryInfo?.usageRatio).toBe(0.1);
    });

    it('メモリ監視を開始・停止できる', () => {
      const onWarning = vi.fn();
      
      monitor.startMemoryMonitoring(100, onWarning);
      monitor.stopMemoryMonitoring();
      
      // 警告が呼ばれないことを確認
      expect(onWarning).not.toHaveBeenCalled();
    });

    it('メモリ使用量が閾値を超えると警告が発生する', (done) => {
      // 高いメモリ使用量をシミュレート
      mockPerformance.memory.usedJSHeapSize = 90 * 1024 * 1024; // 90MB
      
      const onWarning = vi.fn((info) => {
        expect(info.usageRatio).toBe(0.9);
        monitor.stopMemoryMonitoring();
        done();
      });
      
      monitor.setMemoryThreshold(0.8);
      monitor.startMemoryMonitoring(10, onWarning);
    });
  });

  describe('統計機能', () => {
    it('測定統計を取得できる', () => {
      const testName = 'test-stats';
      let currentTime = 1000;
      
      // 複数回測定
      for (let i = 0; i < 3; i++) {
        mockPerformance.now.mockReturnValue(currentTime);
        monitor.startMeasurement(testName);
        
        currentTime += (i + 1) * 10; // 時間を進める
        mockPerformance.now.mockReturnValue(currentTime);
        monitor.endMeasurement(testName);
      }
      
      const summary = monitor.getMetricsSummary(testName);
      
      expect(summary).toBeDefined();
      expect(summary?.count).toBe(3);
      expect(summary?.averageDuration).toBeGreaterThan(0);
      expect(summary?.minDuration).toBeGreaterThan(0);
      expect(summary?.maxDuration).toBeGreaterThan(0);
    });

    it('測定統計をクリアできる', () => {
      monitor.startMeasurement('test');
      monitor.endMeasurement('test');
      
      expect(monitor.getMetrics()).toHaveLength(1);
      
      monitor.clearMetrics();
      
      expect(monitor.getMetrics()).toHaveLength(0);
    });
  });
});

describe('デバウンス関数', () => {
  it('指定時間内の連続呼び出しを1回にまとめる', (done) => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 50);
    
    // 連続で呼び出し
    debouncedFn('arg1');
    debouncedFn('arg2');
    debouncedFn('arg3');
    
    // すぐには呼ばれない
    expect(mockFn).not.toHaveBeenCalled();
    
    // 指定時間後に最後の引数で1回だけ呼ばれる
    setTimeout(() => {
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg3');
      done();
    }, 60);
  });

  it('immediate=trueの場合は最初の呼び出しが即座に実行される', () => {
    const mockFn = vi.fn();
    const debouncedFn = debounce(mockFn, 50, true);
    
    debouncedFn('arg1');
    
    // 即座に呼ばれる
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('arg1');
  });
});

describe('スロットル関数', () => {
  it('指定時間内に1回だけ実行される', (done) => {
    const mockFn = vi.fn();
    const throttledFn = throttle(mockFn, 50);
    
    // 連続で呼び出し
    throttledFn('arg1');
    throttledFn('arg2');
    throttledFn('arg3');
    
    // 最初の呼び出しのみ実行される
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('arg1');
    
    // 指定時間後に再度呼び出し可能
    setTimeout(() => {
      throttledFn('arg4');
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(mockFn).toHaveBeenCalledWith('arg4');
      done();
    }, 60);
  });
});

describe('RAFスロットル関数', () => {
  it('requestAnimationFrameを使用してスロットルする', () => {
    const mockFn = vi.fn();
    const mockRAF = vi.fn((callback) => {
      setTimeout(callback, 16); // 約60FPS
      return 1;
    });
    
    global.requestAnimationFrame = mockRAF;
    
    const rafThrottledFn = rafThrottle(mockFn);
    
    // 連続で呼び出し
    rafThrottledFn('arg1');
    rafThrottledFn('arg2');
    
    // requestAnimationFrameが1回だけ呼ばれる
    expect(mockRAF).toHaveBeenCalledTimes(1);
  });
});

describe('BatchProcessor', () => {
  it('アイテムをバッチで処理する', (done) => {
    const processedBatches: number[][] = [];
    const processFn = async (items: number[]) => {
      processedBatches.push([...items]);
    };
    
    const processor = new BatchProcessor(processFn, 3, 10);
    
    // 5個のアイテムを追加
    for (let i = 1; i <= 5; i++) {
      processor.add(i);
    }
    
    // 少し待ってから結果を確認
    setTimeout(() => {
      expect(processedBatches).toHaveLength(2);
      expect(processedBatches[0]).toEqual([1, 2, 3]);
      expect(processedBatches[1]).toEqual([4, 5]);
      done();
    }, 50);
  });

  it('複数のアイテムを一度に追加できる', (done) => {
    const processedBatches: number[][] = [];
    const processFn = async (items: number[]) => {
      processedBatches.push([...items]);
    };
    
    const processor = new BatchProcessor(processFn, 2, 10);
    
    processor.addBatch([1, 2, 3, 4]);
    
    setTimeout(() => {
      expect(processedBatches).toHaveLength(2);
      expect(processedBatches[0]).toEqual([1, 2]);
      expect(processedBatches[1]).toEqual([3, 4]);
      done();
    }, 50);
  });

  it('キューをクリアできる', () => {
    const processFn = async (items: number[]) => {};
    const processor = new BatchProcessor(processFn, 10, 100);
    
    processor.addBatch([1, 2, 3]);
    expect(processor.getQueueSize()).toBe(3);
    
    processor.clear();
    expect(processor.getQueueSize()).toBe(0);
  });
});
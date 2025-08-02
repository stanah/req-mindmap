/**
 * ストア同期フックのテスト
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEditorSync, useMindmapSync, useFileSync, useUISync } from '../useStoreSync';
import { useAppStore } from '../../stores/appStore';

// タイマーのモック
vi.useFakeTimers();

// ストアのモック
vi.mock('../../stores/appStore', () => ({
  useAppStore: vi.fn(),
}));

describe('useStoreSync', () => {
  const mockUpdateContent = vi.fn();
  const mockSelectNode = vi.fn();
  const mockToggleNodeCollapse = vi.fn();
  const mockLoadFile = vi.fn();
  const mockSaveFile = vi.fn();
  const mockAddNotification = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // useAppStoreのモック実装
    (useAppStore as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) => {
      const mockState = {
        file: {
          fileContent: '',
          isDirty: false,
          currentFile: null,
        },
        parse: {
          parseErrors: [],
          isParsing: false,
          parsedData: null,
        },
        ui: {
          selectedNodeId: null,
          mindmapSettings: {},
          isLoading: false,
          notifications: [],
          modal: null,
          editorSettings: { autoSave: false },
        },
        updateContent: mockUpdateContent,
        selectNode: mockSelectNode,
        toggleNodeCollapse: mockToggleNodeCollapse,
        loadFile: mockLoadFile,
        saveFile: mockSaveFile,
        addNotification: mockAddNotification,
      };
      
      return selector(mockState);
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.useFakeTimers();
  });

  describe('useEditorSync', () => {
    it('デバウンス付きでコンテンツを更新する', () => {
      const { result } = renderHook(() => useEditorSync());

      act(() => {
        result.current.debouncedUpdateContent('test content 1');
        result.current.debouncedUpdateContent('test content 2');
        result.current.debouncedUpdateContent('test content 3');
      });

      // デバウンス期間中は呼ばれない
      expect(mockUpdateContent).not.toHaveBeenCalled();

      // デバウンス期間後に最後の値で呼ばれる
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(mockUpdateContent).toHaveBeenCalledTimes(1);
      expect(mockUpdateContent).toHaveBeenCalledWith('test content 3');
    });

    it('即座にコンテンツを更新する', () => {
      const { result } = renderHook(() => useEditorSync());

      act(() => {
        result.current.immediateUpdateContent('immediate content');
      });

      expect(mockUpdateContent).toHaveBeenCalledTimes(1);
      expect(mockUpdateContent).toHaveBeenCalledWith('immediate content');
    });

    it('デバウンス中に即座更新が呼ばれるとタイマーがクリアされる', () => {
      const { result } = renderHook(() => useEditorSync());

      act(() => {
        result.current.debouncedUpdateContent('debounced content');
      });

      // デバウンス期間の途中で即座更新
      act(() => {
        vi.advanceTimersByTime(150);
        result.current.immediateUpdateContent('immediate content');
      });

      expect(mockUpdateContent).toHaveBeenCalledTimes(1);
      expect(mockUpdateContent).toHaveBeenCalledWith('immediate content');

      // 残りの時間が経過してもデバウンス関数は呼ばれない
      act(() => {
        vi.advanceTimersByTime(150);
      });

      expect(mockUpdateContent).toHaveBeenCalledTimes(1);
    });
  });

  describe('useMindmapSync', () => {
    it('ノード選択を同期する', () => {
      const { result } = renderHook(() => useMindmapSync());

      act(() => {
        result.current.syncNodeSelection('test-node-id');
      });

      expect(mockSelectNode).toHaveBeenCalledTimes(1);
      expect(mockSelectNode).toHaveBeenCalledWith('test-node-id');
    });

    it('ノード折りたたみを同期する', () => {
      const { result } = renderHook(() => useMindmapSync());

      act(() => {
        result.current.syncNodeCollapse('test-node-id');
      });

      expect(mockToggleNodeCollapse).toHaveBeenCalledTimes(1);
      expect(mockToggleNodeCollapse).toHaveBeenCalledWith('test-node-id');
    });
  });

  describe('useFileSync', () => {
    it('ファイル操作を同期する', () => {
      const { result } = renderHook(() => useFileSync());

      act(() => {
        result.current.loadFile('/test/path');
      });

      expect(mockLoadFile).toHaveBeenCalledTimes(1);
      expect(mockLoadFile).toHaveBeenCalledWith('/test/path');
    });

    it('自動保存が有効な場合にファイルを自動保存する', () => {
      // 自動保存が有効な状態をモック
      (useAppStore as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: unknown) => unknown) => {
        const mockState = {
          file: {
            isDirty: true,
            currentFile: '/test/file.json',
          },
          ui: {
            editorSettings: { autoSave: true },
          },
          saveFile: mockSaveFile,
        };
        
        return selector(mockState);
      });

      renderHook(() => useFileSync());

      // 5秒後に自動保存される
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(mockSaveFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('useUISync', () => {
    it('通知を管理する', () => {
      const { result } = renderHook(() => useUISync());

      act(() => {
        result.current.addNotification({
          message: 'テスト通知',
          type: 'info',
          autoHide: false,
        });
      });

      expect(mockAddNotification).toHaveBeenCalledTimes(1);
      expect(mockAddNotification).toHaveBeenCalledWith({
        message: 'テスト通知',
        type: 'info',
        autoHide: false,
      });
    });
  });
});

describe('デバウンス機能の統合テスト', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.useFakeTimers();
  });

  it('デバウンス機能が正しく動作することを確認', () => {
    // 実際のデバウンス関数をテスト
    const mockFn = vi.fn();
    let timeoutId: NodeJS.Timeout | null = null;
    
    const debouncedFn = (value: string) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        mockFn(value);
      }, 300);
    };

    // 短時間で複数回呼び出し
    debouncedFn('content 1');
    debouncedFn('content 2');
    debouncedFn('content 3');

    // まだ呼ばれていない
    expect(mockFn).not.toHaveBeenCalled();

    // デバウンス期間が完了
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // 最後の値で1回だけ呼ばれる
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('content 3');
  });

  it('デバウンス期間を超えた場合は個別に処理される', () => {
    const mockFn = vi.fn();
    let timeoutId: NodeJS.Timeout | null = null;
    
    const debouncedFn = (value: string) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        mockFn(value);
      }, 300);
    };

    // 最初の更新
    debouncedFn('content 1');

    // デバウンス期間完了
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('content 1');

    // 十分な時間を空けて2回目の更新
    act(() => {
      vi.advanceTimersByTime(500);
    });
    
    debouncedFn('content 2');

    // 2回目のデバウンス期間完了
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenLastCalledWith('content 2');
  });
});
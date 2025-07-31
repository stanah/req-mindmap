/**
 * Zustandを使用したアプリケーション状態管理ストア
 * 
 * このファイルは、アプリケーション全体の状態を管理し、
 * ファイル状態、パース状態、UI状態を統合的に扱います。
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { 
  AppStore, 
  AppState, 
  FileState, 
  ParseState, 
  UIState,
  Notification,
  ModalState
} from '../types/store';
import type { 
  EditorSettings, 
  MindmapSettings, 
  AppSettings,
  MindmapData,
  ParseError,
  ValidationResult
} from '../types/mindmap';
import { APP_CONFIG, STORAGE_KEYS, DEBOUNCE_DELAY } from '../utils/constants';
import { storage, debounce, generateId, detectFileFormat, deepClone, findNodeById } from '../utils/helpers';

/**
 * 初期ファイル状態
 */
const initialFileState: FileState = {
  currentFile: null,
  fileContent: '',
  isDirty: false,
  lastSaved: null,
  fileFormat: null,
  fileSize: 0,
  encoding: 'utf-8',
};

/**
 * 初期パース状態
 */
const initialParseState: ParseState = {
  parsedData: null,
  parseErrors: [],
  validationResult: null,
  isParsing: false,
  lastParsed: null,
  parseSuccessCount: 0,
  parseErrorCount: 0,
};

/**
 * 初期UI状態
 */
const initialUIState: UIState = {
  editorSettings: storage.get(STORAGE_KEYS.EDITOR_SETTINGS, {
    language: 'json',
    theme: 'vs-light',
    fontSize: 14,
    tabSize: 2,
    formatOnType: true,
    autoSave: false,
    lineNumbers: true,
    wordWrap: true,
    minimap: true,
  }),
  mindmapSettings: storage.get(STORAGE_KEYS.MINDMAP_SETTINGS, {
    theme: 'light',
    layout: 'tree',
    zoom: 1,
    center: { x: 0, y: 0 },
    maxNodeWidth: 300,
    nodeSpacing: 20,
    levelSpacing: 100,
    enableAnimation: true,
    autoLayout: true,
  }),
  selectedNodeId: null,
  nodeSelection: null,
  sidebarOpen: true,
  settingsPanelOpen: false,
  errorPanelOpen: false,
  isLoading: false,
  loadingMessage: '',
  notifications: [],
  modal: null,
  panelSizes: {
    editor: 50,
    mindmap: 50,
  },
  fullscreen: false,
  darkMode: false,
};

/**
 * 初期アプリケーション設定
 */
const initialSettings: AppSettings = {
  editor: initialUIState.editorSettings,
  mindmap: initialUIState.mindmapSettings,
  language: 'ja',
  debug: false,
  autoBackup: true,
  recentFiles: storage.get(STORAGE_KEYS.RECENT_FILES, []),
};

/**
 * 初期アプリケーション状態
 */
const initialState: AppState = {
  file: initialFileState,
  parse: initialParseState,
  ui: initialUIState,
  settings: initialSettings,
  recentFiles: storage.get(STORAGE_KEYS.RECENT_FILES, []),
  initialized: false,
  debugMode: false,
};

/**
 * デバウンス処理用のタイマー管理
 */
let contentUpdateTimer: NodeJS.Timeout | null = null;
let parseTimer: NodeJS.Timeout | null = null;

/**
 * アプリケーションストアの作成
 */
export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // ===== ファイル操作 =====
        
        loadFile: async (path: string) => {
          set((state) => ({
            ui: {
              ...state.ui,
              isLoading: true,
              loadingMessage: 'ファイルを読み込み中...',
            },
          }));

          try {
            // TODO: 実際のファイル読み込み処理を実装（FileServiceと連携）
            // 現在はプレースホルダー
            console.log('Loading file:', path);
            
            const format = detectFileFormat(path);
            const fileName = path.split('/').pop() || path;
            
            // 最近開いたファイルに追加
            const recentFiles = get().recentFiles.filter(f => f !== path);
            recentFiles.unshift(path);
            const updatedRecentFiles = recentFiles.slice(0, 10); // 最大10件
            
            set((state) => ({
              file: {
                ...state.file,
                currentFile: path,
                fileFormat: format,
                isDirty: false,
                lastSaved: Date.now(),
                fileSize: 0, // TODO: 実際のファイルサイズを取得
              },
              recentFiles: updatedRecentFiles,
              ui: {
                ...state.ui,
                isLoading: false,
                loadingMessage: '',
              },
            }));

            // ローカルストレージに保存
            storage.set(STORAGE_KEYS.RECENT_FILES, updatedRecentFiles);

            // 成功通知
            get().addNotification({
              message: `ファイル "${fileName}" を読み込みました`,
              type: 'success',
              autoHide: true,
              duration: 3000,
            });

          } catch (error) {
            console.error('Failed to load file:', error);
            
            set((state) => ({
              ui: {
                ...state.ui,
                isLoading: false,
                loadingMessage: '',
              },
            }));

            // エラー通知
            get().addNotification({
              message: `ファイルの読み込みに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
              type: 'error',
              autoHide: false,
            });
          }
        },

        saveFile: async () => {
          const { file } = get();
          if (!file.currentFile) return;

          set((state) => ({
            ui: {
              ...state.ui,
              isLoading: true,
              loadingMessage: 'ファイルを保存中...',
            },
          }));

          try {
            // TODO: 実際のファイル保存処理を実装（FileServiceと連携）
            console.log('Saving file:', file.currentFile);
            
            set((state) => ({
              file: {
                ...state.file,
                isDirty: false,
                lastSaved: Date.now(),
              },
              ui: {
                ...state.ui,
                isLoading: false,
                loadingMessage: '',
              },
            }));

            // 成功通知
            get().addNotification({
              message: 'ファイルを保存しました',
              type: 'success',
              autoHide: true,
              duration: 2000,
            });

          } catch (error) {
            console.error('Failed to save file:', error);
            
            set((state) => ({
              ui: {
                ...state.ui,
                isLoading: false,
                loadingMessage: '',
              },
            }));

            // エラー通知
            get().addNotification({
              message: `ファイルの保存に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
              type: 'error',
              autoHide: false,
            });
          }
        },

        saveFileAs: async (path: string) => {
          set((state) => ({
            ui: {
              ...state.ui,
              isLoading: true,
              loadingMessage: '名前を付けて保存中...',
            },
          }));

          try {
            // TODO: 実際のファイル保存処理を実装
            console.log('Saving file as:', path);
            
            const format = detectFileFormat(path);
            
            set((state) => ({
              file: {
                ...state.file,
                currentFile: path,
                fileFormat: format,
                isDirty: false,
                lastSaved: Date.now(),
              },
              ui: {
                ...state.ui,
                isLoading: false,
                loadingMessage: '',
              },
            }));

            // 成功通知
            get().addNotification({
              message: `ファイルを "${path}" として保存しました`,
              type: 'success',
              autoHide: true,
              duration: 3000,
            });

          } catch (error) {
            console.error('Failed to save file as:', error);
            
            set((state) => ({
              ui: {
                ...state.ui,
                isLoading: false,
                loadingMessage: '',
              },
            }));

            // エラー通知
            get().addNotification({
              message: `ファイルの保存に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
              type: 'error',
              autoHide: false,
            });
          }
        },

        newFile: () => {
          set((state) => ({
            file: {
              ...initialFileState,
              fileContent: '{\n  "version": "1.0",\n  "title": "新しいマインドマップ",\n  "root": {\n    "id": "root",\n    "title": "ルートノード",\n    "children": []\n  }\n}',
              fileFormat: 'json',
              isDirty: true,
            },
            parse: initialParseState,
            ui: {
              ...state.ui,
              selectedNodeId: null,
              nodeSelection: null,
            },
          }));

          // 新規ファイル作成通知
          get().addNotification({
            message: '新しいファイルを作成しました',
            type: 'info',
            autoHide: true,
            duration: 2000,
          });
        },

        closeFile: () => {
          const { file } = get();
          
          if (file.isDirty) {
            // 未保存の変更がある場合は確認ダイアログを表示
            get().showModal({
              type: 'confirm',
              title: 'ファイルを閉じる',
              message: '保存されていない変更があります。ファイルを閉じますか？',
              onConfirm: () => {
                set((state) => ({
                  file: initialFileState,
                  parse: initialParseState,
                  ui: {
                    ...state.ui,
                    selectedNodeId: null,
                    nodeSelection: null,
                  },
                }));
                get().closeModal();
              },
              onCancel: () => {
                get().closeModal();
              },
            });
          } else {
            set((state) => ({
              file: initialFileState,
              parse: initialParseState,
              ui: {
                ...state.ui,
                selectedNodeId: null,
                nodeSelection: null,
              },
            }));
          }
        },

        openRecentFile: async (path: string) => {
          await get().loadFile(path);
        },

        // ===== エディタ操作 =====

        updateContent: (content: string) => {
          const { file } = get();
          const isDirty = content !== file.fileContent;
          
          set((state) => ({
            file: {
              ...state.file,
              fileContent: content,
              isDirty,
              fileSize: new Blob([content]).size,
            },
          }));

          // デバウンス処理でパースを実行
          if (contentUpdateTimer) {
            clearTimeout(contentUpdateTimer);
          }
          
          contentUpdateTimer = setTimeout(() => {
            get().parseContent(content);
          }, DEBOUNCE_DELAY.EDITOR_CHANGE);
        },

        updateEditorSettings: (settings: Partial<EditorSettings>) => {
          set((state) => ({
            ui: {
              ...state.ui,
              editorSettings: {
                ...state.ui.editorSettings,
                ...settings,
              },
            },
            settings: {
              ...state.settings,
              editor: {
                ...state.settings.editor,
                ...settings,
              },
            },
          }));

          // ローカルストレージに保存
          const newSettings = { ...get().ui.editorSettings, ...settings };
          storage.set(STORAGE_KEYS.EDITOR_SETTINGS, newSettings);
        },

        focusEditor: () => {
          // TODO: エディタにフォーカスを設定する処理を実装
          console.log('Focus editor');
        },

        goToLine: (line: number) => {
          // TODO: 指定行にジャンプする処理を実装
          console.log('Go to line:', line);
        },

        // ===== マインドマップ操作 =====

        selectNode: (nodeId: string) => {
          set((state) => ({
            ui: {
              ...state.ui,
              selectedNodeId: nodeId,
              nodeSelection: {
                nodeId,
                type: 'click',
                timestamp: Date.now(),
              },
            },
          }));
        },

        toggleNodeCollapse: (nodeId: string) => {
          const { parse } = get();
          if (!parse.parsedData) return;

          const updatedData = deepClone(parse.parsedData);
          const node = findNodeById(updatedData.root, nodeId);
          
          if (node) {
            node.collapsed = !node.collapsed;
            
            set((state) => ({
              parse: {
                ...state.parse,
                parsedData: updatedData,
              },
            }));
          }
        },

        updateMindmapSettings: (settings: Partial<MindmapSettings>) => {
          set((state) => ({
            ui: {
              ...state.ui,
              mindmapSettings: {
                ...state.ui.mindmapSettings,
                ...settings,
              },
            },
            settings: {
              ...state.settings,
              mindmap: {
                ...state.settings.mindmap,
                ...settings,
              },
            },
          }));

          // ローカルストレージに保存
          const newSettings = { ...get().ui.mindmapSettings, ...settings };
          storage.set(STORAGE_KEYS.MINDMAP_SETTINGS, newSettings);
        },

        setZoom: (level: number) => {
          get().updateMindmapSettings({ zoom: level });
        },

        setCenter: (x: number, y: number) => {
          get().updateMindmapSettings({ center: { x, y } });
        },

        resetLayout: () => {
          get().updateMindmapSettings({
            zoom: 1,
            center: { x: 0, y: 0 },
          });
        },

        // ===== UI操作 =====

        toggleSidebar: () => {
          set((state) => ({
            ui: {
              ...state.ui,
              sidebarOpen: !state.ui.sidebarOpen,
            },
          }));
        },

        toggleSettingsPanel: () => {
          set((state) => ({
            ui: {
              ...state.ui,
              settingsPanelOpen: !state.ui.settingsPanelOpen,
            },
          }));
        },

        toggleErrorPanel: () => {
          set((state) => ({
            ui: {
              ...state.ui,
              errorPanelOpen: !state.ui.errorPanelOpen,
            },
          }));
        },

        updatePanelSizes: (sizes: { editor: number; mindmap: number }) => {
          set((state) => ({
            ui: {
              ...state.ui,
              panelSizes: sizes,
            },
          }));
        },

        toggleFullscreen: () => {
          set((state) => ({
            ui: {
              ...state.ui,
              fullscreen: !state.ui.fullscreen,
            },
          }));
        },

        toggleDarkMode: () => {
          set((state) => ({
            ui: {
              ...state.ui,
              darkMode: !state.ui.darkMode,
            },
          }));
        },

        // ===== 通知操作 =====

        addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => {
          const newNotification: Notification = {
            ...notification,
            id: generateId(),
            timestamp: Date.now(),
          };

          set((state) => ({
            ui: {
              ...state.ui,
              notifications: [...(state.ui.notifications || []), newNotification],
            },
          }));

          // 自動削除の設定
          if (newNotification.autoHide && newNotification.duration) {
            setTimeout(() => {
              get().removeNotification(newNotification.id);
            }, newNotification.duration);
          }
        },

        removeNotification: (id: string) => {
          set((state) => ({
            ui: {
              ...state.ui,
              notifications: (state.ui.notifications || []).filter(n => n.id !== id),
            },
          }));
        },

        clearNotifications: () => {
          set((state) => ({
            ui: {
              ...state.ui,
              notifications: [],
            },
          }));
        },

        // ===== モーダル操作 =====

        showModal: (modal: ModalState) => {
          set((state) => ({
            ui: {
              ...state.ui,
              modal,
            },
          }));
        },

        closeModal: () => {
          set((state) => ({
            ui: {
              ...state.ui,
              modal: null,
            },
          }));
        },

        // ===== 設定操作 =====

        updateSettings: (settings: Partial<AppSettings>) => {
          set((state) => ({
            settings: {
              ...state.settings,
              ...settings,
            },
          }));
        },

        resetSettings: () => {
          set((state) => ({
            settings: initialSettings,
            ui: {
              ...state.ui,
              editorSettings: initialSettings.editor,
              mindmapSettings: initialSettings.mindmap,
            },
          }));

          // ローカルストレージからも削除
          storage.remove(STORAGE_KEYS.EDITOR_SETTINGS);
          storage.remove(STORAGE_KEYS.MINDMAP_SETTINGS);
        },

        exportSettings: () => {
          return get().settings;
        },

        importSettings: (settings: Record<string, any>) => {
          try {
            get().updateSettings(settings as Partial<AppSettings>);
            get().addNotification({
              message: '設定をインポートしました',
              type: 'success',
              autoHide: true,
              duration: 2000,
            });
          } catch (error) {
            get().addNotification({
              message: '設定のインポートに失敗しました',
              type: 'error',
              autoHide: false,
            });
          }
        },

        // ===== アプリケーション操作 =====

        initialize: async () => {
          try {
            set((state) => ({
              ui: {
                ...state.ui,
                isLoading: true,
                loadingMessage: 'アプリケーションを初期化中...',
              },
            }));

            // 初期化処理
            // TODO: 必要な初期化処理を実装

            set((state) => ({
              initialized: true,
              ui: {
                ...state.ui,
                isLoading: false,
                loadingMessage: '',
              },
            }));

          } catch (error) {
            console.error('Failed to initialize app:', error);
            
            set((state) => ({
              ui: {
                ...state.ui,
                isLoading: false,
                loadingMessage: '',
              },
            }));

            get().addNotification({
              message: 'アプリケーションの初期化に失敗しました',
              type: 'error',
              autoHide: false,
            });
          }
        },

        toggleDebugMode: () => {
          set((state) => ({
            debugMode: !state.debugMode,
            settings: {
              ...state.settings,
              debug: !state.debugMode,
            },
          }));
        },

        reset: () => {
          set(initialState);
          
          // ローカルストレージもクリア
          storage.remove(STORAGE_KEYS.EDITOR_SETTINGS);
          storage.remove(STORAGE_KEYS.MINDMAP_SETTINGS);
          storage.remove(STORAGE_KEYS.RECENT_FILES);
        },

        // ===== 内部ヘルパーメソッド =====

        parseContent: async (content: string) => {
          if (!content.trim()) {
            set((state) => ({
              parse: {
                ...state.parse,
                parsedData: null,
                parseErrors: [],
                validationResult: null,
                isParsing: false,
              },
            }));
            return;
          }

          set((state) => ({
            parse: {
              ...state.parse,
              isParsing: true,
            },
          }));

          try {
            // ParserServiceをインポート
            const { parserService } = await import('../services');
            
            // パース処理を実行
            const result = await parserService.parse(content);
            
            let parsedData: MindmapData | null = null;
            const parseErrors: ParseError[] = [];
            
            if (result.success && result.data) {
              parsedData = result.data;
            } else if (result.errors) {
              parseErrors.push(...result.errors);
            }

            set((state) => ({
              parse: {
                ...state.parse,
                parsedData,
                parseErrors,
                validationResult: {
                  valid: parseErrors.length === 0,
                  errors: [],
                },
                isParsing: false,
                lastParsed: Date.now(),
                parseSuccessCount: parseErrors.length === 0 ? state.parse.parseSuccessCount + 1 : state.parse.parseSuccessCount,
                parseErrorCount: parseErrors.length > 0 ? state.parse.parseErrorCount + 1 : state.parse.parseErrorCount,
              },
            }));

          } catch (error) {
            console.error('Parse error:', error);
            
            set((state) => ({
              parse: {
                ...state.parse,
                parsedData: null,
                parseErrors: [{
                  line: 1,
                  column: 1,
                  message: error instanceof Error ? error.message : '不明なパースエラー',
                  severity: 'error',
                }],
                validationResult: {
                  valid: false,
                  errors: [],
                },
                isParsing: false,
                parseErrorCount: state.parse.parseErrorCount + 1,
              },
            }));
          }
        },
      }),
      {
        name: 'mindmap-app-store',
        partialize: (state) => ({
          settings: state.settings,
          recentFiles: state.recentFiles,
          ui: {
            editorSettings: state.ui.editorSettings,
            mindmapSettings: state.ui.mindmapSettings,
            panelSizes: state.ui.panelSizes,
            darkMode: state.ui.darkMode,
          },
        }),
      }
    ),
    {
      name: 'mindmap-app-store',
    }
  )
);
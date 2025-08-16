/**
 * Zustandを使用したアプリケーション状態管理ストア
 * 
 * このファイルは、アプリケーション全体の状態を管理し、
 * ファイル状態、パース状態、UI状態を統合的に扱います。
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { 
  AppStore, 
  AppState, 
  FileState, 
  ParseState, 
  UIState,
  Notification,
  ModalState,
  EditorCursorPosition,
  EditorHighlightRange
} from '../types/store';
import type { 
  EditorSettings, 
  MindmapSettings, 
  AppSettings,
  MindmapData,
  ParseError,
  MindmapNode
} from '../types';
import { DEBOUNCE_DELAY } from '../utils/constants';
import { generateId, detectFileFormat, deepClone, findNodeById } from '../utils/helpers';
import { createNodeMapping, getNodeIdAtCursor, getEditorPositionForNode, type NodeMappingResult } from '../utils/nodeMapping';
import { settingsService } from '../services/settingsService';
import { performanceMonitor } from '../utils/performanceMonitor';
import VSCodeApiSingleton from '../platform/vscode/VSCodeApiSingleton';

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
  editorSettings: settingsService.loadSettings().editor,
  mindmapSettings: settingsService.loadSettings().mindmap,
  selectedNodeId: null,
  nodeSelection: null,
  editorCursorPosition: null,
  editorHighlightRange: null,
  cursorCorrespondingNodeId: null,
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
const initialSettings: AppSettings = settingsService.loadSettings();

/**
 * 初期アプリケーション状態
 */
const initialState: AppState = {
  file: initialFileState,
  parse: initialParseState,
  ui: initialUIState,
  settings: initialSettings,
  recentFiles: settingsService.getRecentFiles().map(f => f.path),
  initialized: false,
  debugMode: false,
};

/**
 * デバウンス処理用のタイマー管理
 */
let contentUpdateTimer: NodeJS.Timeout | null = null;

/**
 * ノードマッピング情報のグローバル管理
 */
let currentNodeMapping: NodeMappingResult | null = null;

/**
 * アプリケーションストアの作成
 */
export const useAppStore = create<AppStore>()(
  devtools(
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
            settingsService.addRecentFile({
              path,
              name: fileName,
              size: 0, // TODO: 実際のファイルサイズを取得
              format: format as 'json' | 'yaml',
            });
            const updatedRecentFiles = settingsService.getRecentFiles().map(f => f.path);
            
            set((state) => ({
              file: {
                ...state.file,
                currentFile: path,
                fileFormat: format === 'unknown' ? null : format,
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
                fileFormat: format === 'unknown' ? null : format,
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

        updateContent: (content: string, fromVSCode?: boolean) => {
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

          // セッション状態を保存
          settingsService.saveSessionState({
            lastFileContent: content,
            lastOpenFile: file.currentFile || undefined,
          });

          // VSCode環境でプレビュー側からの変更の場合、VSCodeエディタに同期
          if (!fromVSCode && typeof window !== 'undefined' && window.vscodeApiInstance) {
            const singleton = VSCodeApiSingleton.getInstance();
            singleton.updateDocumentContent(content);
          }

          // デバウンス処理でパースを実行
          if (contentUpdateTimer) {
            clearTimeout(contentUpdateTimer);
          }
          
          contentUpdateTimer = setTimeout(async () => {
            await get().parseContent(content);
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

          // settingsServiceを使ってローカルストレージに保存
          const currentSettings = get().settings;
          const updatedSettings = {
            ...currentSettings,
            editor: {
              ...currentSettings.editor,
              ...settings,
            },
          };
          settingsService.saveSettings(updatedSettings);
        },

        focusEditor: () => {
          // TODO: エディタにフォーカスを設定する処理を実装
          console.log('Focus editor');
        },

        goToLine: (line: number) => {
          // TODO: 指定行にジャンプする処理を実装
          console.log('Go to line:', line);
        },

        updateEditorCursorPosition: (position: EditorCursorPosition) => {
          set((state) => ({
            ui: {
              ...state.ui,
              editorCursorPosition: position,
            },
          }));

          // カーソル位置に対応するノードIDを取得して設定
          if (currentNodeMapping) {
            const nodeId = getNodeIdAtCursor(position, currentNodeMapping);
            set((state) => ({
              ui: {
                ...state.ui,
                cursorCorrespondingNodeId: nodeId,
              },
            }));
          }
        },

        setEditorHighlight: (range: EditorHighlightRange | null) => {
          set((state) => ({
            ui: {
              ...state.ui,
              editorHighlightRange: range,
            },
          }));
        },

        highlightEditorRange: (startLine: number, startColumn: number, endLine: number, endColumn: number, reason: 'node-selection' | 'search' | 'error' = 'node-selection') => {
          const range: EditorHighlightRange = {
            startLine,
            startColumn,
            endLine,
            endColumn,
            reason,
          };
          
          get().setEditorHighlight(range);
        },

        // ===== マインドマップ操作 =====

        selectNode: (nodeId: string | null) => {
          console.log('🎯 [Store] selectNode called:', { nodeId });
          
          set((state) => ({
            ui: {
              ...state.ui,
              selectedNodeId: nodeId,
              nodeSelection: nodeId ? {
                nodeId,
                type: 'click',
                timestamp: Date.now(),
              } : null,
            },
          }));
          console.log('✅ [Store] selectNode state updated');

          // セッション状態を保存
          settingsService.saveSessionState({
            lastSelectedNodeId: nodeId || undefined,
          });

          // ノードに対応するエディタ位置をハイライト
          if (currentNodeMapping && nodeId) {
            const position = getEditorPositionForNode(nodeId, currentNodeMapping);
            if (position) {
              get().highlightEditorRange(
                position.startLine,
                position.startColumn,
                position.endLine,
                position.endColumn,
                'node-selection'
              );
            }
          }
          
          console.log('🏁 [Store] selectNode completed');
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

          // settingsServiceを使ってローカルストレージに保存
          const currentSettings = get().settings;
          const updatedSettings = {
            ...currentSettings,
            mindmap: {
              ...currentSettings.mindmap,
              ...settings,
            },
          };
          settingsService.saveSettings(updatedSettings);
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
          
          // セッション状態を保存
          settingsService.saveSessionState({
            panelSizes: sizes,
          });
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
          const newSettings = { ...get().settings, ...settings };
          
          set((state) => ({
            ...state,
            settings: newSettings,
          }));
          
          // ローカルストレージに保存
          settingsService.saveSettings(newSettings);
        },

        resetSettings: () => {
          // クリアしてからデフォルト設定を取得
          settingsService.clearAllData();
          const defaultSettings = settingsService.loadSettings();
          
          set((state) => ({
            ...state,
            settings: defaultSettings,
            ui: {
              ...state.ui,
              editorSettings: defaultSettings.editor,
              mindmapSettings: defaultSettings.mindmap,
            },
          }));
        },

        exportSettings: () => {
          const exportedData = settingsService.exportSettings();
          return JSON.parse(exportedData);
        },

        importSettings: (settings: Record<string, unknown>) => {
          try {
            settingsService.importSettings(JSON.stringify(settings));
            
            // ストアの状態も更新
            const newSettings = settingsService.loadSettings();
            set((state) => ({
              settings: newSettings,
              ui: {
                ...state.ui,
                editorSettings: newSettings.editor,
                mindmapSettings: newSettings.mindmap,
              },
              recentFiles: settingsService.getRecentFiles().map(f => f.path),
            }));
            
            get().addNotification({
              message: '設定をインポートしました',
              type: 'success',
              autoHide: true,
              duration: 2000,
            });
          } catch {
            get().addNotification({
              message: '設定のインポートに失敗しました',
              type: 'error',
              autoHide: false,
            });
          }
        },

        // ===== アプリケーション操作 =====

        initialize: async () => {
          // 既に初期化済みの場合はスキップ
          if (get().initialized) {
            return;
          }

          try {
            set((state) => ({
              ui: {
                ...state.ui,
                isLoading: true,
                loadingMessage: 'アプリケーションを初期化中...',
              },
            }));

            // 設定を読み込む
            const settings = settingsService.loadSettings();
            const sessionState = settingsService.loadSessionState();
            
            // 前回のセッション状態を復元
            set((state) => ({
              settings,
              ui: {
                ...state.ui,
                editorSettings: settings.editor,
                mindmapSettings: settings.mindmap,
                panelSizes: sessionState.panelSizes || state.ui.panelSizes,
                darkMode: settings.editor.theme === 'vs-dark',
              },
              recentFiles: settingsService.getRecentFiles().map(f => f.path),
            }));

            // 前回のファイル内容を復元（オプション）
            if (sessionState.lastOpenFile && sessionState.lastFileContent) {
              set((state) => ({
                file: {
                  ...state.file,
                  currentFile: sessionState.lastOpenFile || null,
                  fileContent: sessionState.lastFileContent || '',
                  fileFormat: sessionState.lastOpenFile ? 
                    (detectFileFormat(sessionState.lastOpenFile) === 'unknown' ? null : detectFileFormat(sessionState.lastOpenFile) as 'json' | 'yaml') 
                    : null,
                  isDirty: false,
                },
              }));

              // 前回の内容をパース
              if (sessionState.lastFileContent) {
                await get().parseContent(sessionState.lastFileContent);
              }

              // 前回の選択状態を復元
              if (sessionState.lastSelectedNodeId) {
                get().selectNode(sessionState.lastSelectedNodeId);
              }
            }

            // 自動保存を開始
            if (settings.autoBackup) {
              settingsService.startAutoSave(async () => {
                const currentState = get();
                if (currentState.file.fileContent) {
                  settingsService.saveAutoSaveData(
                    currentState.file.fileContent,
                    currentState.file.currentFile?.split('/').pop()
                  );
                }
              });
            }

            set((state) => ({
              initialized: true,
              ui: {
                ...state.ui,
                isLoading: false,
                loadingMessage: '',
              },
            }));

            get().addNotification({
              message: 'アプリケーションが初期化されました',
              type: 'success',
              autoHide: true,
              duration: 2000,
            });

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
          
          // settingsServiceを使ってローカルストレージをクリア
          settingsService.clearAllData();
        },

        // ===== 内部ヘルパーメソッド =====

        parseContent: async (content: string) => {
          console.log('parseContent開始 - content length:', content.length);
          console.log('content preview:', content.substring(0, 200));
          console.log('parseContent called from:', new Error().stack?.split('\n')[2]);
          
          if (!content.trim()) {
            console.log('コンテンツが空のため、パース処理をスキップ');
            set((state) => ({
              parse: {
                ...state.parse,
                parsedData: null,
                parseErrors: [],
                validationResult: null,
                isParsing: false,
              },
            }));
            currentNodeMapping = null;
            return;
          }

          // パフォーマンス測定を開始
          performanceMonitor.startMeasurement('content-parse', {
            contentLength: content.length,
          });

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
            
            // パース結果のnullチェック
            if (!result) {
              console.error('Parse error: パーサーサービスがnullを返しました');
              set((state) => ({
                parse: {
                  ...state.parse,
                  parseErrors: [{
                    line: 1,
                    column: 1,
                    message: 'パーサーサービスの内部エラー',
                    severity: 'error',
                    code: 'PARSER_SERVICE_ERROR'
                  }],
                  isProcessing: false
                }
              }));
              return;
            }
            
            console.log('パース結果:', {
              success: result.success,
              hasData: !!result.data,
              dataKeys: result.data ? Object.keys(result.data) : null,
              errorCount: result.errors?.length || 0,
              errors: result.errors
            });
            
            let parsedData: MindmapData | null = null;
            const parseErrors: ParseError[] = [];
            
            if (result.success && result.data) {
              parsedData = result.data;
              console.log('パース成功 - データタイトル:', parsedData.title);
              
              // ノードマッピングを作成
              const { ui } = get();
              const format = ui.editorSettings.language;
              currentNodeMapping = await createNodeMapping(content, format);
            } else if (result.errors) {
              console.error('パースエラー詳細:', result.errors.map(err => ({
                message: err.message,
                line: err.line,
                column: err.column,
                code: err.code,
                type: err.type
              })));
              parseErrors.push(...result.errors);
              currentNodeMapping = null;
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

            // パフォーマンス測定を終了
            performanceMonitor.endMeasurement('content-parse', {
              success: parseErrors.length === 0,
              nodeCount: parsedData ? get().countNodes(parsedData.root) : 0,
            });

          } catch (error) {
            console.error('Parse error:', error);
            currentNodeMapping = null;
            
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

            // エラー時もパフォーマンス測定を終了
            performanceMonitor.endMeasurement('content-parse', {
              success: false,
              error: error instanceof Error ? error.message : '不明なエラー',
            });
          }
        },

        // ===== パフォーマンス最適化関連 =====

        /**
         * ノード数をカウント
         */
        countNodes: (node: MindmapNode): number => {
          let count = 1;
          if (node.children) {
            for (const child of node.children) {
              count += get().countNodes(child);
            }
          }
          return count;
        },

        /**
         * パフォーマンス統計を取得
         */
        getPerformanceStats: () => {
          const parseMetrics = performanceMonitor.getMetricsSummary('content-parse');
          const memoryInfo = performanceMonitor.getCurrentMemoryUsage();
          
          return {
            parseMetrics,
            memoryInfo,
            totalMetrics: performanceMonitor.getMetrics().length,
          };
        },

        /**
         * パフォーマンス統計をログ出力
         */
        logPerformanceStats: () => {
          console.group('[AppStore] Performance Statistics');
          
          const stats = get().getPerformanceStats();
          
          if (stats.parseMetrics) {
            console.log('Parse Metrics:', stats.parseMetrics);
          }
          
          if (stats.memoryInfo) {
            console.log('Memory Usage:', {
              used: `${(stats.memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
              total: `${(stats.memoryInfo.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB`,
              limit: `${(stats.memoryInfo.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB`,
              usage: `${(stats.memoryInfo.usageRatio * 100).toFixed(1)}%`,
            });
          }
          
          console.log('Total Metrics Collected:', stats.totalMetrics);
          
          console.groupEnd();
        },

        /**
         * メモリ使用量を最適化
         */
        optimizeMemory: () => {
          console.log('[AppStore] Optimizing memory usage...');
          
          // パフォーマンス統計をクリア
          performanceMonitor.clearMetrics();
          
          // ガベージコレクションを強制実行（可能な場合）
          performanceMonitor.forceGarbageCollection();
          
          // 通知を追加
          get().addNotification({
            message: 'メモリ使用量を最適化しました',
            type: 'info',
            autoHide: true,
            duration: 2000,
          });
          
          console.log('[AppStore] Memory optimization completed');
        },
      }),
    {
      name: 'mindmap-app-store',
    }
  )
);
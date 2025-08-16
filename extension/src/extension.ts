import * as vscode from 'vscode';
import * as path from 'path';
import { MindmapEditorProvider } from './MindmapEditorProvider';
import { MindmapWebviewProvider } from './MindmapWebviewProvider';
import { MindmapTreeDataProvider, MindmapTreeItem } from './MindmapTreeDataProvider';

// アクティブなプレビューパネルを管理
const previewPanels = new Map<string, vscode.WebviewPanel>();

/**
 * VSCode拡張のメインエントリーポイント
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('Mindmap Tool拡張が有効化されました');

    // Webviewプロバイダーの登録
    const _webviewProvider = new MindmapWebviewProvider(context.extensionUri);
    
    // カスタムエディタープロバイダーの登録
    const editorProvider = new MindmapEditorProvider(context);
    context.subscriptions.push(
        vscode.window.registerCustomEditorProvider(
            'mindmapTool.mindmapEditor',
            editorProvider,
            {
                webviewOptions: {
                    retainContextWhenHidden: true,
                },
                supportsMultipleEditorsPerDocument: false,
            }
        )
    );

    // ツリーデータプロバイダーの登録
    const treeDataProvider = new MindmapTreeDataProvider();
    const treeView = vscode.window.createTreeView('mindmapTree', {
        treeDataProvider,
        showCollapseAll: true
    });
    context.subscriptions.push(treeView);

    // アクティブエディタの変更を監視してツリーを更新
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(async (editor) => {
            if (editor) {
                const fileName = editor.document.fileName;
                const ext = path.extname(fileName).toLowerCase();
                
                // マインドマップファイルの場合のみツリーを更新
                if (ext === '.json' || ext === '.yaml' || ext === '.yml') {
                    try {
                        const content = editor.document.getText();
                        // マインドマップデータかどうかをチェック
                        let data: unknown;
                        if (ext === '.yaml' || ext === '.yml') {
                            // eslint-disable-next-line @typescript-eslint/no-require-imports
                            const yaml = require('js-yaml');
                            data = yaml.load(content);
                        } else {
                            data = JSON.parse(content);
                        }
                        
                        // rootプロパティがある場合のみマインドマップとして扱う
                        if (data && typeof data === 'object' && 'root' in data) {
                            await treeDataProvider.setCurrentDocument(editor.document);
                        }
                    } catch {
                        // 解析エラーは無視
                    }
                }
            }
        })
    );

    // コマンドの登録
    const commands = [
        // マインドマッププレビューを開くコマンド
        vscode.commands.registerCommand('mindmapTool.openPreview', async (uri?: vscode.Uri) => {
            await openMindmapPreview(uri, vscode.ViewColumn.Active, context);
        }),

        // マインドマッププレビューを横に開くコマンド  
        vscode.commands.registerCommand('mindmapTool.openPreviewToSide', async (uri?: vscode.Uri) => {
            await openMindmapPreview(uri, vscode.ViewColumn.Beside, context);
        }),

        // マインドマップを開くコマンド
        vscode.commands.registerCommand('mindmapTool.openMindmap', async (uri?: vscode.Uri) => {
            try {
                let targetUri = uri;
                
                if (!targetUri) {
                    // ファイル選択ダイアログを表示
                    const fileUris = await vscode.window.showOpenDialog({
                        canSelectFiles: true,
                        canSelectFolders: false,
                        canSelectMany: false,
                        filters: {
                            'マインドマップファイル': ['json', 'yaml', 'yml'],
                            'すべてのファイル': ['*']
                        },
                        title: 'マインドマップファイルを選択'
                    });
                    
                    if (!fileUris || fileUris.length === 0) {
                        return;
                    }
                    
                    targetUri = fileUris[0];
                }

                // カスタムエディターで開く
                await vscode.commands.executeCommand('vscode.openWith', targetUri, 'mindmapTool.mindmapEditor');
                
            } catch (error) {
                vscode.window.showErrorMessage(`マインドマップを開けませんでした: ${error}`);
            }
        }),

        // 新しいマインドマップを作成するコマンド
        vscode.commands.registerCommand('mindmapTool.createNewMindmap', async () => {
            try {
                // 新規ファイルの保存場所を選択
                const saveUri = await vscode.window.showSaveDialog({
                    filters: {
                        'JSONファイル': ['json'],
                        'YAMLファイル': ['yaml', 'yml']
                    },
                    defaultUri: vscode.Uri.file('mindmap.json'),
                    title: '新しいマインドマップを保存'
                });

                if (!saveUri) {
                    return;
                }

                // テンプレートの選択
                const templateType = await vscode.window.showQuickPick([
                    { label: '基本テンプレート', value: 'basic' },
                    { label: '高度なテンプレート', value: 'advanced' },
                    { label: 'プロジェクト管理テンプレート', value: 'project' }
                ], {
                    title: 'テンプレートを選択',
                    placeHolder: '使用するテンプレートを選択してください'
                });

                if (!templateType) {
                    return;
                }

                // テンプレート内容を生成
                const template = generateTemplate(templateType.value as 'basic' | 'advanced' | 'project', saveUri.fsPath);
                
                // ファイルを作成
                await vscode.workspace.fs.writeFile(saveUri, Buffer.from(template, 'utf8'));
                
                // 作成したファイルを開く
                await vscode.commands.executeCommand('vscode.openWith', saveUri, 'mindmapTool.mindmapEditor');
                
                vscode.window.showInformationMessage(`新しいマインドマップを作成しました: ${saveUri.fsPath}`);
                
            } catch (error) {
                vscode.window.showErrorMessage(`マインドマップの作成に失敗しました: ${error}`);
            }
        }),

        // マインドマップをエクスポートするコマンド
        vscode.commands.registerCommand('mindmapTool.exportMindmap', async () => {
            try {
                const activeEditor = vscode.window.activeTextEditor;
                if (!activeEditor) {
                    vscode.window.showWarningMessage('アクティブなエディターがありません');
                    return;
                }

                // エクスポート形式を選択
                const exportFormat = await vscode.window.showQuickPick([
                    { label: 'PNG画像', value: 'png' },
                    { label: 'SVG画像', value: 'svg' },
                    { label: 'PDF', value: 'pdf' }
                ], {
                    title: 'エクスポート形式を選択',
                    placeHolder: 'エクスポートする形式を選択してください'
                });

                if (!exportFormat) {
                    return;
                }

                // 保存場所を選択
                const saveUri = await vscode.window.showSaveDialog({
                    filters: {
                        [exportFormat.label]: [exportFormat.value]
                    },
                    defaultUri: vscode.Uri.file(`mindmap.${exportFormat.value}`),
                    title: 'エクスポート先を選択'
                });

                if (!saveUri) {
                    return;
                }

                // エクスポート処理（実装は将来追加）
                vscode.window.showInformationMessage('エクスポート機能は開発中です');
                
            } catch (error) {
                vscode.window.showErrorMessage(`エクスポートに失敗しました: ${error}`);
            }
        }),

        // スキーマ検証コマンド
        vscode.commands.registerCommand('mindmapTool.validateSchema', async () => {
            try {
                const activeEditor = vscode.window.activeTextEditor;
                if (!activeEditor) {
                    vscode.window.showWarningMessage('アクティブなエディターがありません');
                    return;
                }

                const document = activeEditor.document;
                const _content = document.getText();

                // スキーマ検証の実行（実装は将来追加）
                vscode.window.showInformationMessage('スキーマ検証機能は開発中です');
                
            } catch (error) {
                vscode.window.showErrorMessage(`スキーマ検証に失敗しました: ${error}`);
            }
        }),

        // ツリービュー関連コマンド
        vscode.commands.registerCommand('mindmapTool.refreshMindmapTree', () => {
            treeDataProvider.refresh();
            vscode.window.showInformationMessage('マインドマップツリーを更新しました');
        }),

        vscode.commands.registerCommand('mindmapTool.selectNode', async (nodeId: string, nodeData?: unknown) => {
            console.log('ノード選択:', nodeId, nodeData);
            
            // ノード選択時にエディタで該当箇所にジャンプ（将来実装）
            if (nodeData) {
                const nodeInfo = nodeData as { title: string; description?: string };
                vscode.window.showInformationMessage(`ノード "${nodeInfo.title}" を選択しました`);
            }
        }),

        vscode.commands.registerCommand('mindmapTool.addChildNode', async (treeItem: MindmapTreeItem) => {
            const nodeTitle = await vscode.window.showInputBox({
                prompt: 'ノードのタイトルを入力してください',
                placeHolder: '新しいノード'
            });

            if (!nodeTitle) {
                return;
            }

            const nodeDescription = await vscode.window.showInputBox({
                prompt: 'ノードの説明を入力してください（オプション）',
                placeHolder: '説明'
            });

            const newNodeId = `node_${Date.now()}`;
            
            try {
                await treeDataProvider.addNode(treeItem.nodeId, {
                    id: newNodeId,
                    title: nodeTitle,
                    description: nodeDescription || ''
                });
                
                vscode.window.showInformationMessage(`子ノード "${nodeTitle}" を追加しました`);
            } catch (error) {
                vscode.window.showErrorMessage(`ノードの追加に失敗しました: ${error}`);
            }
        }),

        vscode.commands.registerCommand('mindmapTool.addSiblingNode', async (treeItem: MindmapTreeItem) => {
            const nodeTitle = await vscode.window.showInputBox({
                prompt: 'ノードのタイトルを入力してください',
                placeHolder: '新しいノード'
            });

            if (!nodeTitle) {
                return;
            }

            const _nodeDescription = await vscode.window.showInputBox({
                prompt: 'ノードの説明を入力してください（オプション）',
                placeHolder: '説明'
            });

            const _newNodeId = `node_${Date.now()}`;
            
            // 兄弟ノード追加は親ノードに追加することと同じ
            // 実際の実装では親ノードのIDを取得する必要がある
            vscode.window.showInformationMessage('兄弟ノード追加機能は開発中です');
        }),

        vscode.commands.registerCommand('mindmapTool.editNode', async (treeItem: MindmapTreeItem) => {
            if (!treeItem.nodeData) {
                return;
            }

            const currentTitle = treeItem.nodeData.title;
            const newTitle = await vscode.window.showInputBox({
                prompt: 'ノードのタイトルを編集してください',
                value: currentTitle
            });

            if (!newTitle || newTitle === currentTitle) {
                return;
            }

            // ノード編集の実装（将来追加）
            vscode.window.showInformationMessage('ノード編集機能は開発中です');
        }),

        vscode.commands.registerCommand('mindmapTool.deleteNode', async (treeItem: MindmapTreeItem) => {
            const nodeTitle = treeItem.nodeData?.title || treeItem.label;
            const confirmed = await vscode.window.showWarningMessage(
                `ノード "${nodeTitle}" を削除しますか？`,
                { modal: true },
                '削除'
            );

            if (confirmed === '削除') {
                try {
                    await treeDataProvider.deleteNode(treeItem.nodeId);
                    vscode.window.showInformationMessage(`ノード "${nodeTitle}" を削除しました`);
                } catch (error) {
                    vscode.window.showErrorMessage(`ノードの削除に失敗しました: ${error}`);
                }
            }
        }),

        vscode.commands.registerCommand('mindmapTool.collapseAll', () => {
            treeDataProvider.collapseAll();
            if (treeView.visible) {
                // VSCode の TreeView の collapseAll は直接呼び出せない
                vscode.window.showInformationMessage('すべてのノードを折りたたみました');
            }
        }),

        vscode.commands.registerCommand('mindmapTool.expandAll', () => {
            treeDataProvider.expandAll();
            if (treeView.visible) {
                vscode.window.showInformationMessage('すべてのノードを展開しました');
            }
        })
    ];

    // すべてのコマンドを登録
    context.subscriptions.push(...commands);

    // 設定変更の監視
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('mindmapTool')) {
                // 設定変更時の処理
                console.log('Mindmap Tool設定が変更されました');
            }
        })
    );

    console.log('Mindmap Tool拡張の初期化が完了しました');
}

/**
 * 拡張の非有効化時に呼ばれる関数
 */
export function deactivate() {
    console.log('Mindmap Tool拡張が非有効化されました');
}

/**
 * テンプレートを生成する関数
 */
function generateTemplate(type: 'basic' | 'advanced' | 'project', filePath: string): string {
    const isYaml = filePath.endsWith('.yaml') || filePath.endsWith('.yml');
    
    const templates = {
        basic: {
            json: {
                version: '1.0',
                title: '新しいマインドマップ',
                root: {
                    id: 'root',
                    title: 'ルートノード',
                    description: 'このマインドマップのメインテーマです',
                    children: [
                        {
                            id: 'branch1',
                            title: 'ブランチ1',
                            description: '最初のアイデアまたはトピック',
                            children: []
                        },
                        {
                            id: 'branch2',
                            title: 'ブランチ2',
                            description: '2つ目のアイデアまたはトピック',
                            children: []
                        }
                    ]
                }
            },
            yaml: `version: "1.0"
title: "新しいマインドマップ"
root:
  id: "root"
  title: "ルートノード"
  description: "このマインドマップのメインテーマです"
  children:
    - id: "branch1"
      title: "ブランチ1"
      description: "最初のアイデアまたはトピック"
      children: []
    - id: "branch2"
      title: "ブランチ2"
      description: "2つ目のアイデアまたはトピック"
      children: []`
        },
        advanced: {
            json: {
                version: '1.0',
                title: '高度なマインドマップテンプレート',
                description: 'カスタムフィールドとメタデータを含むテンプレート',
                schema: {
                    version: '1.0',
                    fields: [
                        {
                            id: 'priority',
                            name: '優先度',
                            type: 'select',
                            options: ['高', '中', '低'],
                            required: false
                        },
                        {
                            id: 'status',
                            name: 'ステータス',
                            type: 'select',
                            options: ['未着手', '進行中', '完了'],
                            required: false
                        }
                    ]
                },
                root: {
                    id: 'root',
                    title: 'プロジェクトルート',
                    description: 'プロジェクトの全体像',
                    customFields: {
                        priority: '高',
                        status: '進行中'
                    },
                    children: []
                }
            },
            yaml: `version: "1.0"
title: "高度なマインドマップテンプレート"
description: "カスタムフィールドとメタデータを含むテンプレート"
schema:
  version: "1.0"
  fields:
    - id: "priority"
      name: "優先度"
      type: "select"
      options: ["高", "中", "低"]
      required: false
    - id: "status"
      name: "ステータス"
      type: "select"
      options: ["未着手", "進行中", "完了"]
      required: false
root:
  id: "root"
  title: "プロジェクトルート"
  description: "プロジェクトの全体像"
  customFields:
    priority: "高"
    status: "進行中"
  children: []`
        },
        project: {
            json: {
                version: '1.0',
                title: 'プロジェクト管理テンプレート',
                description: 'プロジェクト管理用の包括的なテンプレート',
                root: {
                    id: 'project-root',
                    title: 'プロジェクト名',
                    description: 'プロジェクトの目的と概要を記述してください',
                    children: [
                        {
                            id: 'objectives',
                            title: '目標・成果物',
                            description: 'プロジェクトの目標と期待される成果物',
                            children: []
                        },
                        {
                            id: 'stakeholders',
                            title: 'ステークホルダー',
                            description: 'プロジェクトに関わる人々',
                            children: []
                        }
                    ]
                }
            },
            yaml: `version: "1.0"
title: "プロジェクト管理テンプレート"
description: "プロジェクト管理用の包括的なテンプレート"
root:
  id: "project-root"
  title: "プロジェクト名"
  description: "プロジェクトの目的と概要を記述してください"
  children:
    - id: "objectives"
      title: "目標・成果物"
      description: "プロジェクトの目標と期待される成果物"
      children: []
    - id: "stakeholders"
      title: "ステークホルダー"
      description: "プロジェクトに関わる人々"
      children: []`
        }
    };

    if (isYaml) {
        return templates[type].yaml;
    } else {
        return JSON.stringify(templates[type].json, null, 2);
    }
}

/**
 * マインドマッププレビューを開く関数
 */
async function openMindmapPreview(uri: vscode.Uri | undefined, viewColumn: vscode.ViewColumn, context: vscode.ExtensionContext): Promise<void> {
    try {
        let targetUri = uri;
        if (!targetUri && vscode.window.activeTextEditor) {
            targetUri = vscode.window.activeTextEditor.document.uri;
        }
        
        if (!targetUri) {
            vscode.window.showWarningMessage('プレビューするファイルが見つかりません');
            return;
        }

        const document = await vscode.workspace.openTextDocument(targetUri);
        const panelKey = targetUri.toString();

        // 既存のプレビューパネルがあるかチェック
        let panel = previewPanels.get(panelKey);
        
        if (panel) {
            // 既存パネルがある場合は表示
            panel.reveal(viewColumn);
            return;
        }

        // 新しいWebviewパネルを作成
        panel = vscode.window.createWebviewPanel(
            'mindmapPreview',
            `Mindmap Preview: ${path.basename(document.fileName)}`,
            viewColumn,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    context.extensionUri,
                    vscode.Uri.joinPath(context.extensionUri, 'webview')
                ]
            }
        );

        // パネルを管理マップに追加
        previewPanels.set(panelKey, panel);

        // パネルが閉じられた時の処理
        panel.onDidDispose(() => {
            previewPanels.delete(panelKey);
        });

        // Webviewプロバイダーを使ってコンテンツを設定
        const webviewProvider = new MindmapWebviewProvider(context.extensionUri);
        await webviewProvider.createWebview(panel, document);

        // ドキュメント変更の監視
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === panelKey) {
                // ドキュメントが変更されたらWebviewに通知
                panel?.webview.postMessage({
                    command: 'updateContent',
                    content: e.document.getText(),
                    fileName: e.document.fileName,
                    uri: e.document.uri.toString()
                });
            }
        });

        // パネルが閉じられた時にリスナーを削除
        panel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
        });

    } catch (error) {
        vscode.window.showErrorMessage(`マインドマッププレビューを開けませんでした: ${error}`);
    }
}
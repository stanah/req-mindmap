import * as vscode from 'vscode';
import { MindmapWebviewProvider } from './MindmapWebviewProvider';
import { MindmapEditorProvider } from './MindmapEditorProvider';

/**
 * VSCode拡張のメインエントリーポイント
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('Mindmap Tool拡張が有効化されました');

    // Webviewプロバイダーの登録
    const webviewProvider = new MindmapWebviewProvider(context.extensionUri);
    
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

    // コマンドの登録
    const commands = [
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
                const content = document.getText();

                // スキーマ検証の実行（実装は将来追加）
                vscode.window.showInformationMessage('スキーマ検証機能は開発中です');
                
            } catch (error) {
                vscode.window.showErrorMessage(`スキーマ検証に失敗しました: ${error}`);
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
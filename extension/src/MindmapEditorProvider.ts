import * as vscode from 'vscode';
import { MindmapWebviewProvider } from './MindmapWebviewProvider';

/**
 * マインドマップカスタムエディタープロバイダー
 */
export class MindmapEditorProvider implements vscode.CustomTextEditorProvider {
    private webviewProvider: MindmapWebviewProvider;

    constructor(private readonly context: vscode.ExtensionContext) {
        this.webviewProvider = new MindmapWebviewProvider(context.extensionUri);
    }

    /**
     * カスタムエディターを解決
     */
    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        token: vscode.CancellationToken
    ): Promise<void> {
        // Webviewパネルの設定
        webviewPanel.options = {
            enableScripts: true,
            retainContextWhenHidden: true
        };

        // Webviewを作成
        this.webviewProvider.createWebview(webviewPanel, document);

        // ドキュメント変更の監視
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {
                // ドキュメントが変更された場合、Webviewに通知
                webviewPanel.webview.postMessage({
                    command: 'updateContent',
                    content: e.document.getText()
                });
            }
        });

        // 設定変更の監視
        const changeConfigurationSubscription = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('mindmapTool')) {
                // 設定が変更された場合、Webviewに通知
                webviewPanel.webview.postMessage({
                    command: 'configurationChanged',
                    configuration: this.getConfiguration()
                });
            }
        });

        // テーマ変更の監視
        const changeColorThemeSubscription = vscode.window.onDidChangeActiveColorTheme(() => {
            // テーマが変更された場合、Webviewに通知
            webviewPanel.webview.postMessage({
                command: 'themeChanged'
            });
        });

        // パネルが破棄される際のクリーンアップ
        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
            changeConfigurationSubscription.dispose();
            changeColorThemeSubscription.dispose();
        });

        // 初期設定をWebviewに送信
        webviewPanel.webview.postMessage({
            command: 'configurationChanged',
            configuration: this.getConfiguration()
        });
    }

    /**
     * 現在の設定を取得
     */
    private getConfiguration(): any {
        const config = vscode.workspace.getConfiguration('mindmapTool');
        
        return {
            editor: {
                theme: config.get('editor.theme', 'vs-dark'),
                fontSize: config.get('editor.fontSize', 14)
            },
            mindmap: {
                layout: config.get('mindmap.layout', 'tree'),
                theme: config.get('mindmap.theme', 'auto')
            },
            validation: {
                enabled: config.get('validation.enabled', true),
                showWarnings: config.get('validation.showWarnings', true)
            },
            autoSave: {
                enabled: config.get('autoSave.enabled', true),
                delay: config.get('autoSave.delay', 1000)
            }
        };
    }
}
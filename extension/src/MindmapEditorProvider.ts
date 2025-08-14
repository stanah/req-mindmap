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
        const documentUri = document.uri.toString();
        
        // ドキュメントとWebviewパネルを登録
        this.activeDocuments.set(documentUri, document);
        this.webviewPanels.set(documentUri, webviewPanel);

        // Webviewパネルの設定（optionsは読み取り専用なので、webview.optionsを設定）
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this.context.extensionUri,
                vscode.Uri.joinPath(this.context.extensionUri, 'webview')
            ]
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

        // 初期化完了後にコンテンツと設定を送信
        setTimeout(() => {
            this.updateWebviewContent(webviewPanel, document);
            this.updateWebviewConfiguration(webviewPanel);
        }, 100);

        console.log(`マインドマップエディターが初期化されました: ${document.fileName}`);
    }

    /**
     * Webviewからのメッセージを処理
     */
    private async handleWebviewMessage(
        message: any,
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel
    ): Promise<void> {
        try {
            switch (message.command) {
                case 'webviewReady':
                    // Webviewの準備完了
                    console.log('Webviewの準備が完了しました');
                    this.updateWebviewContent(webviewPanel, document);
                    this.updateWebviewConfiguration(webviewPanel);
                    break;

                case 'getInitialConfiguration':
                    // 初期設定要求
                    console.log('初期設定要求を受信');
                    this.updateWebviewConfiguration(webviewPanel);
                    break;

                case 'updateDocument':
                    // Webview側からドキュメント更新要求
                    if (message.content && typeof message.content === 'string') {
                        await this.updateDocument(document, message.content);
                    }
                    break;

                case 'showError':
                    // エラー表示
                    vscode.window.showErrorMessage(message.message || 'エラーが発生しました');
                    break;

                case 'showWarning':
                    // 警告表示
                    vscode.window.showWarningMessage(message.message || '警告');
                    break;

                case 'showInformation':
                    // 情報表示
                    vscode.window.showInformationMessage(message.message || '情報');
                    break;

                case 'saveDocument':
                    // ドキュメント保存
                    await document.save();
                    break;

                case 'exportMindmap':
                    // マインドマップのエクスポート
                    await this.handleExportRequest(message);
                    break;

                default:
                    console.log('未知のWebviewメッセージ:', message);
            }
        } catch (error) {
            console.error('Webviewメッセージの処理でエラーが発生:', error);
            vscode.window.showErrorMessage(`メッセージ処理エラー: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * ドキュメントの内容を更新
     */
    private async updateDocument(document: vscode.TextDocument, content: string): Promise<void> {
        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(document.getText().length)
        );
        
        edit.replace(document.uri, fullRange, content);
        await vscode.workspace.applyEdit(edit);
    }

    /**
     * Webviewのコンテンツを更新
     */
    private updateWebviewContent(webviewPanel: vscode.WebviewPanel, document: vscode.TextDocument): void {
        webviewPanel.webview.postMessage({
            command: 'updateContent',
            content: document.getText(),
            fileName: document.fileName,
            uri: document.uri.toString()
        });
    }

    /**
     * Webviewの設定を更新
     */
    private updateWebviewConfiguration(webviewPanel: vscode.WebviewPanel): void {
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
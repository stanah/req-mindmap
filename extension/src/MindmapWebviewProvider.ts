import * as vscode from 'vscode';
import * as path from 'path';

/**
 * マインドマップWebviewプロバイダー
 */
export class MindmapWebviewProvider {
    constructor(private readonly extensionUri: vscode.Uri) {}

    /**
     * Webviewを作成
     */
    public createWebview(
        panel: vscode.WebviewPanel,
        document: vscode.TextDocument
    ): void {
        const webview = panel.webview;

        // Webviewの設定
        webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.extensionUri, 'dist'),
                vscode.Uri.joinPath(this.extensionUri, 'webview')
            ]
        };

        // HTMLコンテンツを設定
        webview.html = this.getWebviewContent(webview, document);

        // メッセージハンドラーを設定
        this.setupMessageHandlers(webview, document);
    }

    /**
     * WebviewのHTMLコンテンツを生成
     */
    private getWebviewContent(webview: vscode.Webview, document: vscode.TextDocument): string {
        // Webviewリソースのベースパス
        const webviewPath = vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview');
        const webviewUri = webview.asWebviewUri(webviewPath);

        // CSSとJSファイルのパス
        const cssUri = webview.asWebviewUri(
            vscode.Uri.joinPath(webviewPath, 'assets', 'main.css')
        );
        const jsUri = webview.asWebviewUri(
            vscode.Uri.joinPath(webviewPath, 'assets', 'main.js')
        );

        // CSPの設定
        const csp = [
            "default-src 'none'",
            `script-src ${webview.cspSource} 'unsafe-inline' 'unsafe-eval'`,
            `style-src ${webview.cspSource} 'unsafe-inline'`,
            `img-src ${webview.cspSource} data: https:`,
            `font-src ${webview.cspSource}`,
            `connect-src ${webview.cspSource} https:`
        ].join('; ');

        return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="${csp}">
    <title>Mindmap Tool</title>
    <link href="${cssUri}" rel="stylesheet">
    
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        
        #root {
            width: 100vw;
            height: 100vh;
            overflow: hidden;
        }
        
        /* VSCodeテーマとの統合 */
        .vscode-light {
            --primary-color: var(--vscode-button-background);
            --secondary-color: var(--vscode-button-secondaryBackground);
            --text-color: var(--vscode-foreground);
            --background-color: var(--vscode-editor-background);
            --border-color: var(--vscode-panel-border);
        }
        
        .vscode-dark {
            --primary-color: var(--vscode-button-background);
            --secondary-color: var(--vscode-button-secondaryBackground);
            --text-color: var(--vscode-foreground);
            --background-color: var(--vscode-editor-background);
            --border-color: var(--vscode-panel-border);
        }
        
        .vscode-high-contrast {
            --primary-color: var(--vscode-button-background);
            --secondary-color: var(--vscode-button-secondaryBackground);
            --text-color: var(--vscode-foreground);
            --background-color: var(--vscode-editor-background);
            --border-color: var(--vscode-contrastBorder);
        }
    </style>
</head>
<body>
    <div id="root"></div>
    
    <script>
        // VSCode APIの初期化
        const vscode = acquireVsCodeApi();
        
        // 初期データの設定
        window.initialData = {
            content: ${JSON.stringify(document.getText())},
            fileName: ${JSON.stringify(path.basename(document.fileName))},
            language: ${JSON.stringify(document.languageId)}
        };
        
        // VSCodeテーマの検出と適用
        function applyVSCodeTheme() {
            const body = document.body;
            const computedStyle = getComputedStyle(body);
            const backgroundColor = computedStyle.getPropertyValue('--vscode-editor-background');
            
            // 既存のテーマクラスを削除
            body.classList.remove('vscode-light', 'vscode-dark', 'vscode-high-contrast');
            
            // テーマの判定
            if (backgroundColor && backgroundColor.includes('rgb')) {
                const rgb = backgroundColor.match(/\\d+/g);
                if (rgb) {
                    const brightness = (parseInt(rgb[0]) + parseInt(rgb[1]) + parseInt(rgb[2])) / 3;
                    if (brightness > 128) {
                        body.classList.add('vscode-light');
                    } else {
                        body.classList.add('vscode-dark');
                    }
                }
            }
            
            // ハイコントラストテーマの検出
            const contrastBorder = computedStyle.getPropertyValue('--vscode-contrastBorder');
            if (contrastBorder && contrastBorder !== 'transparent') {
                body.classList.add('vscode-high-contrast');
            }
        }
        
        // 初期テーマ適用
        applyVSCodeTheme();
        
        // テーマ変更の監視
        const observer = new MutationObserver(applyVSCodeTheme);
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['class', 'style']
        });
        
        // VSCode拡張との通信設定
        window.addEventListener('message', (event) => {
            const message = event.data;
            
            switch (message.command) {
                case 'updateContent':
                    // エディタ内容の更新
                    if (window.mindmapApp && window.mindmapApp.updateContent) {
                        window.mindmapApp.updateContent(message.content);
                    }
                    break;
                case 'themeChanged':
                    applyVSCodeTheme();
                    break;
                case 'saveFile':
                    // ファイル保存の要求
                    if (window.mindmapApp && window.mindmapApp.saveFile) {
                        window.mindmapApp.saveFile();
                    }
                    break;
                case 'exportMindmap':
                    // マインドマップエクスポートの要求
                    if (window.mindmapApp && window.mindmapApp.exportMindmap) {
                        window.mindmapApp.exportMindmap(message.format);
                    }
                    break;
            }
        });
        
        // アプリケーション準備完了の通知
        window.addEventListener('load', () => {
            vscode.postMessage({
                command: 'webviewReady',
                timestamp: new Date().toISOString()
            });
        });
        
        // グローバル関数の設定
        window.vscode = vscode;
    </script>
    
    <script src="${jsUri}"></script>
</body>
</html>`;
    }

    /**
     * メッセージハンドラーを設定
     */
    private setupMessageHandlers(webview: vscode.Webview, document: vscode.TextDocument): void {
        webview.onDidReceiveMessage(
            (message) => {
                switch (message.command) {
                    case 'webviewReady':
                        console.log('Webview準備完了:', message.timestamp);
                        break;

                    case 'appInitialized':
                        console.log('アプリケーション初期化完了:', message.timestamp);
                        // 初期データを送信
                        webview.postMessage({
                            command: 'updateContent',
                            content: document.getText()
                        });
                        break;

                    case 'initializationError':
                        vscode.window.showErrorMessage(`アプリケーションの初期化に失敗しました: ${message.error}`);
                        break;

                    case 'contentChanged':
                        // エディタ内容の変更を通知
                        this.updateDocument(document, message.content);
                        break;

                    case 'exportRequest':
                        // エクスポート要求の処理
                        this.handleExportRequest(message.format, message.data);
                        break;

                    case 'error':
                        vscode.window.showErrorMessage(`エラーが発生しました: ${message.message}`);
                        break;

                    case 'info':
                        vscode.window.showInformationMessage(message.message);
                        break;

                    case 'warning':
                        vscode.window.showWarningMessage(message.message);
                        break;

                    default:
                        console.log('未知のメッセージ:', message);
                        break;
                }
            },
            undefined
        );
    }

    /**
     * ドキュメントを更新
     */
    private updateDocument(document: vscode.TextDocument, content: string): void {
        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(document.getText().length)
        );
        edit.replace(document.uri, fullRange, content);
        vscode.workspace.applyEdit(edit);
    }

    /**
     * エクスポート要求を処理
     */
    private async handleExportRequest(format: string, data: any): Promise<void> {
        try {
            const saveUri = await vscode.window.showSaveDialog({
                filters: {
                    [format.toUpperCase()]: [format]
                },
                defaultUri: vscode.Uri.file(`mindmap.${format}`),
                title: `${format.toUpperCase()}としてエクスポート`
            });

            if (!saveUri) {
                return;
            }

            // エクスポート処理（実装は将来追加）
            vscode.window.showInformationMessage('エクスポート機能は開発中です');

        } catch (error) {
            vscode.window.showErrorMessage(`エクスポートに失敗しました: ${error}`);
        }
    }
}
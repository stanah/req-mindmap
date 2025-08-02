#!/bin/bash

# VSCode拡張用のビルドスクリプト

set -e

echo "VSCode拡張用のビルドを開始します..."

# 1. Webview用のビルド
echo "1. Webview用のビルドを実行中..."
npm run build -- --config vite.config.vscode.ts

# 2. 拡張機能のTypeScriptコンパイル
echo "2. 拡張機能のTypeScriptコンパイルを実行中..."
cd extension
npm install
npm run compile
cd ..

# 3. スキーマファイルのコピー
echo "3. スキーマファイルをコピー中..."
mkdir -p extension/schemas
cp src/schemas/*.json extension/schemas/

# 4. Webviewファイルのコピー
echo "4. Webviewファイルをコピー中..."
mkdir -p extension/webview
cp -r dist/webview/* extension/webview/

# 5. パッケージの作成
echo "5. VSCode拡張パッケージを作成中..."
cd extension
npm run package
cd ..

echo "VSCode拡張のビルドが完了しました！"
echo "生成されたファイル: extension/mindmap-tool-*.vsix"
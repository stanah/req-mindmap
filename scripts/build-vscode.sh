#!/bin/bash

# VSCode拡張用のビルドスクリプト

set -e

echo "VSCode拡張用のビルドを開始します..."

# 1. Webview用のビルド
echo "1. Webview用のビルドを実行中..."
pnpm run build:vscode

# 2. 拡張機能のWebpackビルド（依存関係をバンドル）
echo "2. 拡張機能のWebpackビルドを実行中..."
cd extension

# GitHub Actions環境では依存関係が既にインストール済みの場合はスキップ
if [ ! -d "node_modules" ]; then
  echo "依存関係をインストール中..."
  pnpm install
else
  echo "依存関係は既にインストール済みです"
fi

pnpm run compile
cd ..

# 3. パッケージの作成
echo "3. VSCode拡張パッケージを作成中..."
cd extension
pnpm run package
cd ..

echo "VSCode拡張のビルドが完了しました！"
echo "生成されたファイル: extension/mindmap-tool-*.vsix"
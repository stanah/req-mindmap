# VSCode拡張対応ガイド

## 概要

このドキュメントでは、マインドマップツールのVSCode拡張版について説明します。

## アーキテクチャ

### プラットフォーム抽象化レイヤー

マインドマップツールは、ブラウザ環境とVSCode拡張環境の両方で動作するように設計されています。これを実現するために、プラットフォーム抽象化レイヤーを実装しています。

```
src/platform/
├── interfaces.ts          # 共通インターフェース定義
├── adapters.ts            # プラットフォームアダプターファクトリー
├── browser/               # ブラウザ環境用実装
│   ├── BrowserPlatformAdapter.ts
│   ├── BrowserFileSystemAdapter.ts
│   ├── BrowserEditorAdapter.ts
│   ├── BrowserUIAdapter.ts
│   └── BrowserSettingsAdapter.ts
└── vscode/                # VSCode拡張環境用実装（将来実装）
    ├── VSCodePlatformAdapter.ts
    ├── VSCodeFileSystemAdapter.ts
    ├── VSCodeEditorAdapter.ts
    ├── VSCodeUIAdapter.ts
    └── VSCodeSettingsAdapter.ts
```

### 主要インターフェース

#### PlatformAdapter
```typescript
interface PlatformAdapter {
  fileSystem: FileSystemAdapter;
  editor: EditorAdapter;
  ui: UIAdapter;
  settings: SettingsAdapter;
  
  getPlatformType(): 'browser' | 'vscode';
  initialize(): Promise<void>;
  dispose(): void;
}
```

#### FileSystemAdapter
- ファイルの読み書き
- ファイル選択ダイアログ
- ファイル監視

#### EditorAdapter
- エディタ内容の取得・設定
- 言語モード・テーマの設定
- エラーマーカーの表示
- カーソル位置の制御

#### UIAdapter
- メッセージ表示
- 確認ダイアログ
- プログレスバー
- ステータスバー

#### SettingsAdapter
- 設定値の取得・保存
- 設定変更の監視

## VSCode拡張の構成

### ファイル構造

```
extension/
├── package.json           # 拡張機能のマニフェスト
├── src/
│   ├── extension.ts       # メインエントリーポイント
│   ├── MindmapWebviewProvider.ts
│   └── MindmapEditorProvider.ts
├── schemas/               # JSONスキーマファイル
├── webview/              # ビルドされたWebviewファイル
└── out/                  # コンパイル済みTypeScript
```

### 主要機能

#### コマンド
- `mindmapTool.openMindmap`: マインドマップを開く
- `mindmapTool.createNewMindmap`: 新しいマインドマップを作成
- `mindmapTool.exportMindmap`: マインドマップをエクスポート
- `mindmapTool.validateSchema`: スキーマを検証

#### カスタムエディター
- `.mindmap.json`、`.mindmap.yaml`ファイル用のカスタムエディター
- リアルタイムプレビュー
- 構文ハイライト
- エラー表示

#### 設定項目
- エディタテーマ・フォントサイズ
- マインドマップレイアウト・テーマ
- バリデーション設定
- 自動保存設定

## ビルドプロセス

### 1. 開発環境でのビルド

```bash
# Webview用のビルド
npm run build -- --config vite.config.vscode.ts

# 拡張機能のコンパイル
cd extension
npm install
npm run compile
```

### 2. 本番用ビルド

```bash
# 自動ビルドスクリプトを使用
./scripts/build-vscode.sh
```

このスクリプトは以下の処理を実行します：
1. Webview用のViteビルド
2. 拡張機能のTypeScriptコンパイル
3. スキーマファイルのコピー
4. Webviewファイルのコピー
5. VSIXパッケージの作成

### 3. パッケージの作成

```bash
cd extension
npm run package
```

## 開発ガイド

### 新しいプラットフォームアダプターの追加

1. `src/platform/interfaces.ts`でインターフェースを確認
2. 新しいプラットフォーム用のディレクトリを作成
3. 各アダプターを実装
4. `PlatformAdapterFactory`に検出ロジックを追加

### VSCode拡張機能の拡張

1. `extension/package.json`でコマンドや設定を追加
2. `extension/src/extension.ts`でコマンドハンドラーを実装
3. 必要に応じてWebviewプロバイダーを更新

### テスト

```bash
# プラットフォーム抽象化レイヤーのテスト
npm test src/platform

# 拡張機能のテスト（将来実装）
cd extension
npm test
```

## デプロイ

### VSCode Marketplaceへの公開

1. VSCEツールのインストール
```bash
npm install -g vsce
```

2. パッケージの作成
```bash
./scripts/build-vscode.sh
```

3. 公開
```bash
cd extension
vsce publish
```

## トラブルシューティング

### よくある問題

#### Webviewが表示されない
- CSP設定を確認
- リソースパスが正しいか確認
- ブラウザの開発者ツールでエラーを確認

#### ファイル操作が動作しない
- プラットフォームアダプターが正しく初期化されているか確認
- VSCode APIの権限設定を確認

#### テーマが適用されない
- VSCodeテーマ変数が正しく読み込まれているか確認
- CSSカスタムプロパティの設定を確認

### デバッグ方法

1. VSCode拡張開発ホストでの実行
2. Webview開発者ツールの使用
3. ログ出力の確認

## 今後の開発予定

### Phase 1: 基本機能の完成
- [x] プラットフォーム抽象化レイヤーの実装
- [x] ブラウザ環境用アダプターの実装
- [x] VSCode拡張の基盤準備
- [ ] VSCode環境用アダプターの実装

### Phase 2: 高度な機能
- [ ] リアルタイム同期の改善
- [ ] エクスポート機能の実装
- [ ] 高度なバリデーション機能

### Phase 3: ユーザビリティ向上
- [ ] キーボードショートカット
- [ ] コマンドパレット統合
- [ ] 設定UIの改善

## 参考資料

- [VSCode Extension API](https://code.visualstudio.com/api)
- [Webview API](https://code.visualstudio.com/api/extension-guides/webview)
- [Custom Editor API](https://code.visualstudio.com/api/extension-guides/custom-editors)
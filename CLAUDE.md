# Claude Code Instructions

## Task Master AI Instructions
**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md

## 実行可能コマンド一覧

### メインプロジェクトのコマンド（ルートディレクトリ）

#### 開発・ビルド
```bash
# 開発サーバー起動
pnpm dev

# VSCode拡張ビルド（webview含む）
pnpm build:vscode

# VSCode拡張パッケージビルド
pnpm build:vscode-package
```

#### テスト・品質チェック
```bash
# ESLint実行
pnpm lint

# 全テスト実行（ライブラリ + VSCode拡張）
pnpm test

# ライブラリテスト一回実行
pnpm test:run

# テストカバレッジレポート生成
pnpm test:coverage

# VSCode拡張テスト実行（watch mode）
pnpm test:vscode

# VSCode拡張テスト一回実行
pnpm test:vscode:run

# VSCode拡張テスト（UI mode）
pnpm test:vscode:ui
```

#### パッケージ管理
```bash
# 依存関係インストール
pnpm install

# パッケージ追加
pnpm add <package-name>

# 開発依存追加
pnpm add -D <package-name>
```

### 開発フロー推奨コマンド
```bash
# 1. 開発開始時
pnpm install

# 2. 開発中（VSCode拡張）
pnpm build:vscode

# 3. テスト実行
pnpm test

# 4. 品質チェック
pnpm lint

# 5. 最終ビルド確認
pnpm build:vscode
```

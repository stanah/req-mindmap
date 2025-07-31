# 推奨コマンド一覧

## 開発コマンド
```bash
# 開発サーバーの起動
pnpm dev

# ビルド
pnpm build

# プレビュー（ビルド後の確認）
pnpm preview
```

## コード品質チェック
```bash
# ESLint実行
pnpm lint

# TypeScriptコンパイル（型チェック）
pnpm build
```

## テスト
```bash
# テスト実行（watch mode）
pnpm test

# テスト実行（一回のみ）
pnpm test:run
```

## パッケージ管理
```bash
# 依存関係のインストール
pnpm install

# パッケージの追加
pnpm add <package-name>

# 開発依存の追加
pnpm add -D <package-name>
```

## Git操作（Darwin固有）
```bash
# ステータス確認
git status

# 変更内容の確認
git diff

# ファイルのステージング（特定ファイル）
git add <file-path>

# コミット
git commit -m "commit message"

# プッシュ
git push

# ブランチ一覧
git branch -a
```

## システムコマンド（Darwin/macOS）
```bash
# ファイル一覧
ls -la

# ディレクトリ移動
cd <directory>

# ファイル検索
find . -name "*.ts" -type f

# ファイル内容検索（ripgrep推奨）
rg "検索文字列"

# ファイル内容表示
cat <file>

# ファイル作成
touch <file>

# ディレクトリ作成
mkdir -p <directory>
```
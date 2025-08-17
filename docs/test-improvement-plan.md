# テスト改善計画書

## 概要
詳細パネルでのpriorityとstatus変更がファイルに反映されない問題を受けて、同様の統合レベルの問題を早期発見するためのテスト戦略を策定する。

## 問題の分析

### 今回の問題
- **問題**: NodeDetailsPanelでpriorityとstatusを変更してもファイルに保存されない
- **根本原因**: WebviewプレビューにsaveFileメッセージハンドラーが設定されていなかった
- **問題レベル**: 統合レベル（コンポーネント間の連携）

### 既存テストの限界
1. **単体テスト**: UIコンポーネントの動作のみテスト（`onNodeUpdate`コールバックまで）
2. **統合ポイント未テスト**: VSCode API、メッセージ通信、ファイル保存処理
3. **環境差異**: テスト環境と実際のVSCode拡張環境の違い

## テスト戦略

### テストピラミッド
```
        ┌─────────────────┐
        │   E2Eテスト     │  少数・重要フロー
        │  (End-to-End)   │
        └─────────────────┘
       ┌───────────────────┐
       │   統合テスト       │   中程度・境界テスト  
       │ (Integration)     │
       └───────────────────┘
      ┌─────────────────────┐
      │    単体テスト        │    多数・詳細テスト
      │   (Unit Tests)      │
      └─────────────────────┘
```

## 実装計画

### 1. VSCode拡張統合テスト
**目的**: VSCode拡張のメッセージハンドラーとファイル保存処理をテスト

**ファイル**: `extension/src/test/integration/extension.integration.test.ts`

**テストケース**:
- [ ] カスタムエディターでのsaveFileメッセージ処理
- [ ] WebviewプレビューでのsaveFileメッセージ処理  
- [ ] メッセージハンドラーの重複回避
- [ ] ファイル保存完了の通知
- [ ] エラーハンドリング（無効なデータ、権限エラーなど）

**モック対象**:
- `vscode.workspace.fs.writeFile`
- `document.save()`
- `webview.postMessage`

### 2. メッセージ通信統合テスト
**目的**: フロントエンド⇔VSCode拡張間のメッセージ通信をテスト

**ファイル**: `src/__tests__/integration/vscode-messaging.integration.test.tsx`

**テストケース**:
- [ ] `useMindmapNodeUpdate`からVSCode APIへのメッセージ送信
- [ ] 送信データの形式と内容の検証
- [ ] VSCode API初期化の確認
- [ ] プラットフォーム判定（vscode vs browser）
- [ ] エラー時のフォールバック処理

**モック対象**:
- `window.vscodeApiInstance`
- `window.vscode`
- `postMessage`

### 3. NodeDetailsPanel統合テスト
**目的**: ノード変更からファイル保存までの全フローをテスト

**ファイル**: `src/__tests__/integration/node-details-file-save.integration.test.tsx`

**テストケース**:
- [ ] priority変更→`updateNode`→`saveToVSCode`→メッセージ送信
- [ ] status変更→`updateNode`→`saveToVSCode`→メッセージ送信
- [ ] カスタムフィールド変更→保存フロー
- [ ] 複数フィールド同時変更→保存フロー
- [ ] 保存エラー時の UI状態とエラーハンドリング

**モック戦略**:
```typescript
// リアルなuseMindmapNodeUpdateを使用、VSCode APIのみモック
const mockVscodeApi = {
  postMessage: vi.fn()
};
window.vscodeApiInstance = mockVscodeApi;
```

### 4. E2Eテスト（Playwright）
**目的**: VSCode拡張環境での実際のユーザーフローをテスト

**ファイル**: `e2e/vscode-extension.e2e.test.ts`

**テストケース**:
- [ ] ファイル開く→ノード選択→詳細パネル表示
- [ ] 詳細パネルでpriority変更→ファイル保存確認
- [ ] 詳細パネルでstatus変更→ファイル保存確認
- [ ] VSCode再起動後もデータが保持されていることを確認
- [ ] カスタムエディターとWebviewプレビューの両方でテスト

**セットアップ**:
- VSCode Extension Development Host環境
- テスト用マインドマップファイル
- ファイルシステムの監視とアサーション

### 5. レグレッションテスト
**目的**: 既存機能の動作確認と回帰防止

**ファイル**: `src/__tests__/regression/node-details-panel.regression.test.tsx`

**テストケース**:
- [ ] 基本的なノード情報表示（ID、タイトル、説明）
- [ ] タグの追加・削除
- [ ] カスタムフィールドの表示・編集
- [ ] 日時情報の表示
- [ ] パネルの表示・非表示切り替え
- [ ] Web版とVSCode版の両方での動作

## テストデータとモック戦略

### テストデータ
```typescript
// 統合テスト用の標準データセット
export const testMindmapData = {
  withPriority: { /* priority設定済み */ },
  withStatus: { /* status設定済み */ },
  withCustomFields: { /* カスタムフィールド設定済み */ },
  minimal: { /* 最小構成 */ },
  large: { /* 大量ノード */ }
};
```

### モック戦略
1. **最小限のモック**: 実際のロジックを可能な限り使用
2. **境界でのモック**: プラットフォーム依存部分（VSCode API、ファイルシステム）
3. **検証可能なモック**: 呼び出し回数、引数、戻り値を確認
4. **エラーシミュレーション**: ネットワークエラー、権限エラーなど

## 実装優先度

### Phase 1（高優先度）
1. VSCode拡張統合テスト - メッセージハンドラー
2. メッセージ通信統合テスト - `useMindmapNodeUpdate`
3. NodeDetailsPanel統合テスト - ファイル保存フロー

### Phase 2（中優先度）  
4. レグレッションテスト
5. エラーハンドリングテスト

### Phase 3（低優先度）
6. E2Eテスト（Playwright）
7. パフォーマンステスト

## 成功指標

### カバレッジ目標
- 統合ポイント: 100%
- 重要なユーザーフロー: 100%
- エラーパス: 80%以上

### 品質指標
- 統合テストでの問題検出率: 95%以上
- リリース後の統合レベルのバグ: 月1件以下
- テスト実行時間: 総合5分以内

## CI/CD統合

### テスト実行タイミング
- **単体テスト**: 全PRで実行
- **統合テスト**: メインブランチマージ時実行
- **E2Eテスト**: リリース前実行
- **レグレッションテスト**: 週次実行

### 失敗時の対応
1. 統合テスト失敗 → マージブロック
2. E2Eテスト失敗 → リリース延期
3. レグレッションテスト失敗 → 調査と修正

## 技術スタック

### テストフレームワーク
- **単体・統合テスト**: Vitest + React Testing Library
- **E2Eテスト**: Playwright + VSCode Extension Test Runner
- **モック**: Vitest vi.fn() + MSW（必要に応じて）

### CI環境
- **GitHub Actions**: Linux環境での自動テスト
- **VSCode Extension Host**: 実際のVSCode環境でのテスト
- **ファイルシステム**: tmpfsを使用した高速テスト

## メンテナンス計画

### 定期見直し
- **月次**: テスト結果とカバレッジの確認
- **四半期**: テスト戦略の見直し
- **年次**: 技術スタックのアップデート

### ドキュメント
- テスト実行手順のREADME
- トラブルシューティングガイド
- 新機能追加時のテスト追加ガイドライン

---

## 参考情報

### 関連ファイル
- `src/components/shared/NodeDetailsPanel.tsx` - メインコンポーネント
- `src/hooks/useMindmapNodeUpdate.ts` - ノード更新ロジック
- `extension/src/extension.ts` - VSCode拡張メイン
- `extension/src/MindmapWebviewProvider.ts` - Webviewプロバイダー
- `extension/src/MindmapEditorProvider.ts` - カスタムエディタープロバイダー

### 今回の問題修正
- Webviewプレビューのメッセージハンドラー追加
- `extension.ts:588-609` - `panel.webview.onDidReceiveMessage`
- `MindmapWebviewProvider.ts:373` - `handleSaveFile`のpublic化

この計画書をベースに段階的にテストを実装し、同様の統合レベルの問題を早期発見できる体制を構築する。
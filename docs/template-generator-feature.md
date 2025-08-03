# 📋 スキーマベーステンプレート生成機能

## 🎯 **機能概要**

スキーマファイルを元に、要件定義マインドマップのテンプレートを自動生成する機能です。

## ✨ **主要機能**

### **1. 3段階のテンプレートタイプ**
- **🚀 Starter**: ビジネス目標 + ユーザー要件（5分で開始）
- **⚖️ Standard**: システム要件・ステークホルダー追加（15分で開始）
- **🏢 Enterprise**: トレーサビリティ・コンプライアンス対応（30分で開始）

### **2. 自動スキーマ検出**
- スキーマ内容を解析してテンプレートタイプを自動判定
- 複雑度に応じて最適なテンプレートを提案

### **3. 多言語対応**
- 日本語・英語のローカライズ対応
- 用語の自動翻訳とフォーマット

### **4. カスタマイズオプション**
- サンプルデータ含む/含まない
- ヘルプコメント追加
- 言語設定選択

## 🔧 **技術実装**

### **アーキテクチャ**
```
src/services/templateGeneratorService.ts  # コアサービス
src/components/ui/TemplateModal.tsx       # UI コンポーネント
src/components/ui/TemplateModal.css       # スタイル
src/components/ui/FileToolbar.tsx         # 統合ポイント
```

### **主要クラス**
- `TemplateGeneratorService`: シングルトンサービス
- `TemplateModal`: React コンポーネント
- 統合済み `FileToolbar`: 「🔧 スキーマベース生成」ボタン

### **型定義**
```typescript
export type TemplateType = 'starter' | 'standard' | 'enterprise' | 'custom';

export interface TemplateGeneratorOptions {
  templateType?: TemplateType;
  includeExamples?: boolean;
  includeComments?: boolean;
  locale?: 'ja' | 'en';
}
```

## 🚀 **使用方法**

### **UI操作**
1. FileToolbar の「📋 テンプレート ▼」をクリック
2. 「🔧 スキーマベース生成」を選択
3. テンプレートタイプを選択
4. オプションを設定
5. 「📋 テンプレート生成」ボタンで生成

### **プログラム操作**
```typescript
import { templateGeneratorService } from './services/templateGeneratorService';

// スキーマから生成
const result = await templateGeneratorService.generateFromSchema(schema, {
  templateType: 'starter',
  includeExamples: true,
  locale: 'ja'
});

// スキーマファイルから生成
const result = await templateGeneratorService.generateFromSchemaFile(
  '/schemas/simplified-requirements-schema.json',
  options
);
```

## 📁 **生成されるファイル**

### **スターター版**
```json
{
  "version": "1.0",
  "type": "requirements",
  "root": {
    "id": "root",
    "name": "新規プロジェクト要件定義",
    "children": [
      {
        "id": "business-goals",
        "name": "ビジネス目標",
        "children": [...] // サンプル含む
      },
      {
        "id": "user-requirements", 
        "name": "ユーザー要件",
        "children": [...] // サンプル含む
      }
    ]
  }
}
```

### **スタンダード版**
- スターター版の全機能
- + システム要件
- + ステークホルダー管理
- + 品質目標

### **エンタープライズ版**
- スタンダード版の全機能
- + トレーサビリティマトリクス
- + コンプライアンス情報
- + 詳細メトリクス

## 🧪 **テスト**

### **テストファイル**
- `src/services/__tests__/templateGeneratorService.test.ts`

### **テストカバレッジ**
- シングルトンパターン
- 3つのテンプレートタイプ生成
- 多言語対応
- オプション設定
- エラーハンドリング
- スキーマ自動検出

## 🎯 **期待される効果**

### **開発効率向上**
- **5分で要件定義開始**: Starterテンプレート
- **手動設定時間 90%削減**: 自動生成とサンプル
- **学習コスト 70%削減**: ヘルプコメント付き

### **品質向上**
- **一貫性確保**: スキーマベース生成
- **ベストプラクティス適用**: 業界標準構造
- **エラー削減**: 自動検証付きテンプレート

## 🔮 **今後の拡張予定**

1. **カスタムスキーマ対応**: ユーザー定義スキーマ
2. **テンプレート保存**: 生成テンプレートの保存・再利用
3. **AI統合**: 要件内容の自動提案
4. **チーム共有**: テンプレートの共有機能

---

**利用開始**: FileToolbar の「🔧 スキーマベース生成」から今すぐ利用可能！
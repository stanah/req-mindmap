/**
 * サンプルデータ定義
 */

export const sampleJSON = `{
  "version": "1.0",
  "title": "要件定義マインドマップサンプル",
  "root": {
    "id": "root",
    "title": "新システム要件",
    "description": "ECサイトリニューアルプロジェクトの要件定義",
    "children": [
      {
        "id": "functional",
        "title": "機能要件",
        "description": "システムが提供すべき機能に関する要件",
        "children": [
          {
            "id": "user-auth",
            "title": "ユーザー認証",
            "description": "ログイン・ログアウト・パスワード管理機能",
            "metadata": {
              "priority": "high",
              "status": "todo",
              "assignee": "田中",
              "estimatedHours": 40
            },
            "children": [
              {
                "id": "login",
                "title": "ログイン機能",
                "description": "メールアドレスとパスワードによるログイン"
              },
              {
                "id": "logout",
                "title": "ログアウト機能",
                "description": "セッション終了とリダイレクト"
              },
              {
                "id": "password-reset",
                "title": "パスワードリセット",
                "description": "メール経由でのパスワード再設定"
              }
            ]
          },
          {
            "id": "product-catalog",
            "title": "商品カタログ",
            "description": "商品の表示・検索・フィルタリング機能",
            "metadata": {
              "priority": "high",
              "status": "in-progress",
              "assignee": "佐藤",
              "estimatedHours": 60
            },
            "children": [
              {
                "id": "product-list",
                "title": "商品一覧表示",
                "description": "カテゴリ別商品一覧の表示"
              },
              {
                "id": "product-search",
                "title": "商品検索",
                "description": "キーワード・価格・カテゴリでの検索"
              },
              {
                "id": "product-detail",
                "title": "商品詳細",
                "description": "商品の詳細情報・画像・レビュー表示"
              }
            ]
          },
          {
            "id": "shopping-cart",
            "title": "ショッピングカート",
            "description": "商品の追加・削除・数量変更機能",
            "metadata": {
              "priority": "medium",
              "status": "todo",
              "assignee": "鈴木",
              "estimatedHours": 30
            }
          }
        ]
      },
      {
        "id": "non-functional",
        "title": "非機能要件",
        "description": "性能・セキュリティ・運用に関する要件",
        "children": [
          {
            "id": "performance",
            "title": "性能要件",
            "description": "レスポンス時間・スループット・可用性",
            "metadata": {
              "priority": "high",
              "status": "review",
              "assignee": "山田"
            },
            "children": [
              {
                "id": "response-time",
                "title": "レスポンス時間",
                "description": "ページ読み込み時間3秒以内"
              },
              {
                "id": "concurrent-users",
                "title": "同時接続数",
                "description": "1000ユーザー同時接続対応"
              }
            ]
          },
          {
            "id": "security",
            "title": "セキュリティ要件",
            "description": "データ保護・アクセス制御・監査",
            "metadata": {
              "priority": "high",
              "status": "todo",
              "assignee": "高橋"
            }
          }
        ]
      },
      {
        "id": "technical",
        "title": "技術要件",
        "description": "使用技術・アーキテクチャ・インフラに関する要件",
        "children": [
          {
            "id": "frontend",
            "title": "フロントエンド",
            "description": "React + TypeScript + Vite",
            "metadata": {
              "priority": "medium",
              "status": "done",
              "assignee": "開発チーム"
            }
          },
          {
            "id": "backend",
            "title": "バックエンド",
            "description": "Node.js + Express + PostgreSQL",
            "metadata": {
              "priority": "medium",
              "status": "in-progress",
              "assignee": "開発チーム"
            }
          }
        ]
      }
    ]
  },
  "settings": {
    "theme": "light",
    "layout": "tree"
  }
}`;

export const sampleYAML = `version: "1.0"
title: "要件定義マインドマップサンプル（YAML版）"
schema:
  fields:
    - name: priority
      type: select
      label: "優先度"
      options: ["high", "medium", "low"]
      required: true
    - name: status
      type: select
      label: "ステータス"
      options: ["todo", "in-progress", "review", "done"]
    - name: assignee
      type: string
      label: "担当者"
    - name: estimatedHours
      type: number
      label: "見積時間（時間）"
    - name: deadline
      type: date
      label: "期限"
  displayRules:
    - field: priority
      displayType: badge
      style:
        high: { color: "white", backgroundColor: "#dc2626" }
        medium: { color: "white", backgroundColor: "#d97706" }
        low: { color: "white", backgroundColor: "#16a34a" }
    - field: status
      displayType: icon
      style:
        todo: { icon: "circle", color: "#6b7280" }
        in-progress: { icon: "clock", color: "#2563eb" }
        review: { icon: "eye", color: "#7c3aed" }
        done: { icon: "check", color: "#16a34a" }
root:
  id: root
  title: "プロジェクト管理システム要件"
  description: "新しいプロジェクト管理システムの要件定義"
  children:
    - id: user-management
      title: "ユーザー管理"
      description: "ユーザーアカウント・権限・プロファイル管理"
      customFields:
        priority: high
        status: in-progress
        assignee: "プロダクトオーナー"
        estimatedHours: 80
        deadline: "2024-04-30"
      children:
        - id: user-registration
          title: "ユーザー登録"
          description: "新規ユーザーの登録・メール認証"
          customFields:
            priority: high
            status: todo
            assignee: "田中"
            estimatedHours: 20
        - id: user-profile
          title: "プロファイル管理"
          description: "ユーザー情報の表示・編集"
          customFields:
            priority: medium
            status: todo
            assignee: "佐藤"
            estimatedHours: 15
        - id: role-management
          title: "権限管理"
          description: "ロールベースアクセス制御"
          customFields:
            priority: high
            status: review
            assignee: "山田"
            estimatedHours: 25
    - id: project-management
      title: "プロジェクト管理"
      description: "プロジェクト作成・編集・進捗管理"
      customFields:
        priority: high
        status: todo
        assignee: "プロジェクトマネージャー"
        estimatedHours: 120
      children:
        - id: project-creation
          title: "プロジェクト作成"
          description: "新規プロジェクトの作成・設定"
          customFields:
            priority: high
            status: todo
            assignee: "鈴木"
            estimatedHours: 30
        - id: task-management
          title: "タスク管理"
          description: "タスクの作成・割り当て・進捗追跡"
          customFields:
            priority: high
            status: todo
            assignee: "高橋"
            estimatedHours: 50
          children:
            - id: task-creation
              title: "タスク作成"
              description: "新規タスクの作成・詳細設定"
            - id: task-assignment
              title: "タスク割り当て"
              description: "チームメンバーへのタスク割り当て"
            - id: task-tracking
              title: "進捗追跡"
              description: "タスクの進捗状況・時間追跡"
        - id: milestone-management
          title: "マイルストーン管理"
          description: "プロジェクトの重要な節目の管理"
          customFields:
            priority: medium
            status: todo
            assignee: "伊藤"
            estimatedHours: 20
    - id: reporting
      title: "レポート機能"
      description: "進捗・工数・品質に関するレポート生成"
      customFields:
        priority: medium
        status: todo
        assignee: "データアナリスト"
        estimatedHours: 40
      children:
        - id: progress-report
          title: "進捗レポート"
          description: "プロジェクト・タスクの進捗状況レポート"
          customFields:
            priority: medium
            status: todo
            estimatedHours: 20
        - id: time-report
          title: "工数レポート"
          description: "チーム・個人の工数分析レポート"
          customFields:
            priority: low
            status: todo
            estimatedHours: 15
    - id: integration
      title: "外部連携"
      description: "他システムとの連携・API提供"
      customFields:
        priority: low
        status: todo
        assignee: "システム管理者"
        estimatedHours: 60
      children:
        - id: slack-integration
          title: "Slack連携"
          description: "Slackへの通知・コマンド連携"
        - id: email-notification
          title: "メール通知"
          description: "重要なイベントのメール通知"
        - id: api-provision
          title: "API提供"
          description: "外部システム向けREST API"
settings:
  theme: light
  layout: tree`;

export const sampleList = [
  {
    id: 'ecommerce-json',
    name: 'ECサイト要件（JSON）',
    description: 'ECサイトリニューアルプロジェクトの要件定義サンプル',
    format: 'json' as const,
    content: sampleJSON,
  },
  {
    id: 'project-management-yaml',
    name: 'プロジェクト管理システム（YAML）',
    description: 'カスタムスキーマを使用したプロジェクト管理システムの要件定義',
    format: 'yaml' as const,
    content: sampleYAML,
  },
] as const;

export type SampleData = typeof sampleList[number];
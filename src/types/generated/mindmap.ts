/* eslint-disable */
/**
 * This file was automatically generated from mindmap-schema.json.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run `pnpm generate-types` to regenerate this file.
 */

/**
 * JSON Schema for validating mindmap YAML/JSON files
 */
export interface MindmapData {
/**
 * データ形式のバージョン
 */
version: string
/**
 * マインドマップのタイトル
 */
title: string
/**
 * マインドマップの説明
 */
description?: string
/**
 * 作成者
 */
author?: string
/**
 * 作成日時
 */
createdAt?: string
/**
 * 更新日時
 */
updatedAt?: string
/**
 * 追加のメタデータ
 */
metadata?: {

}
schema?: CustomSchema
settings?: MindmapSettings
/**
 * 利用可能なタグの定義
 */
tags?: TagDefinition[]
root: MindmapNode
}
export interface CustomSchema {
/**
 * スキーマのバージョン
 */
version?: string
/**
 * スキーマの説明
 */
description?: string
/**
 * 基本フィールド定義（変更不可）
 */
baseFields?: FieldDefinition[]
/**
 * カスタムフィールド定義（ユーザが追加可能）
 */
customFields?: FieldDefinition[]
/**
 * フィールド定義（下位互換性のため）
 */
fields?: FieldDefinition[]
/**
 * 表示ルールの配列
 */
displayRules?: DisplayRule[]
/**
 * 作成日時
 */
createdAt?: string
/**
 * 更新日時
 */
updatedAt?: string
}
export interface FieldDefinition {
/**
 * フィールド名
 */
name: string
/**
 * フィールドの型
 */
type: ("string" | "number" | "boolean" | "date" | "select" | "multiselect")
/**
 * 表示用ラベル
 */
label: string
/**
 * フィールドの配置場所
 */
location?: ("node" | "customFields")
/**
 * 必須フィールドかどうか
 */
required?: boolean
/**
 * select/multiselect用の選択肢
 */
options?: string[]
/**
 * デフォルト値
 */
defaultValue?: (string | number | boolean | string[])
/**
 * フィールドの説明
 */
description?: string
/**
 * バリデーションルール
 */
validation?: ValidationRule[]
}
export interface ValidationRule {
/**
 * バリデーションの種類
 */
type: ("required" | "minLength" | "maxLength" | "pattern" | "min" | "max" | "range" | "length")
/**
 * バリデーションの値
 */
value?: (string | number)
/**
 * エラーメッセージ
 */
message?: string
}
export interface DisplayRule {
/**
 * 対象フィールド名
 */
field: string
/**
 * 表示タイプ
 */
displayType: ("badge" | "icon" | "color" | "text")
/**
 * 表示条件
 */
condition?: string
/**
 * スタイル設定
 */
style?: {

}
/**
 * 表示位置
 */
position?: ("inline" | "tooltip" | "sidebar")
}
export interface MindmapSettings {
/**
 * テーマ
 */
theme?: ("light" | "dark" | "auto")
/**
 * レイアウト
 */
layout?: ("tree" | "radial" | "force")
/**
 * ズームレベル
 */
zoom?: number
/**
 * 中心位置
 */
center?: {
x: number
y: number
}
/**
 * ノードサイズ
 */
nodeSize?: ("small" | "medium" | "large")
/**
 * アニメーション有効/無効
 */
enableAnimation?: boolean
/**
 * アニメーション有効/無効（別名）
 */
enableAnimations?: boolean
/**
 * 自動レイアウト有効/無効
 */
autoLayout?: boolean
/**
 * ミニマップ表示
 */
showMinimap?: boolean
/**
 * ノードの幅
 */
nodeWidth?: number
/**
 * ノードの最大幅
 */
maxNodeWidth?: number
/**
 * ノード間の間隔
 */
nodeSpacing?: number
/**
 * レベル間の間隔
 */
levelSpacing?: number
/**
 * 縦間隔の調整係数
 */
verticalSpacing?: number
/**
 * 自動保存設定
 */
autoSave?: {
enabled?: boolean
interval?: number
}
/**
 * 設定のバージョン
 */
version?: string
}
export interface TagDefinition {
/**
 * タグ名
 */
name: string
/**
 * タグの色
 */
color?: string
/**
 * タグの説明
 */
description?: string
}
export interface MindmapNode {
/**
 * ノードの一意識別子
 */
id: string
/**
 * ノードのタイトル
 */
title: string
/**
 * ノードの詳細説明
 */
description?: string
/**
 * ノードの種類
 */
type?: string
/**
 * ノードの優先度
 */
priority?: ("critical" | "high" | "medium" | "low")
/**
 * ノードのステータス
 */
status?: ("draft" | "pending" | "in-progress" | "review" | "done" | "cancelled" | "deferred")
/**
 * 作成日時
 */
createdAt?: string
/**
 * 更新日時
 */
updatedAt?: string
/**
 * 担当者
 */
assignee?: string
/**
 * 期限
 */
deadline?: string
/**
 * 折りたたみ状態
 */
collapsed?: boolean
/**
 * ノードに関連付けられたタグ
 */
tags?: string[]
/**
 * カスタムフィールドの値
 */
customFields?: {

}
/**
 * 拡張可能なメタデータ
 */
metadata?: {

}
/**
 * ノードの表示位置
 */
position?: {
x: number
y: number
}
/**
 * ノードの色
 */
color?: string
/**
 * ノードのアイコン
 */
icon?: string
/**
 * 関連リンク
 */
links?: {
url: string
title: string
type?: ("reference" | "documentation" | "issue" | "other")
}[]
/**
 * 子ノードの配列
 */
children?: MindmapNode[]
}

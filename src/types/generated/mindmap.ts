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
 * 追加のメタデータ
 */
metadata?: {
/**
 * 作成日時
 */
createdAt?: string
/**
 * 更新日時
 */
updatedAt?: string
/**
 * メタデータの説明
 */
description?: string
}
schema?: CustomSchema
/**
 * 利用可能なタグの定義
 */
tags?: TagDefinition[]
root: MindmapNode
}
export interface CustomSchema {
/**
 * カスタムフィールド定義
 */
customFields?: FieldDefinition[]
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
 * 必須フィールドかどうか
 */
required?: boolean
/**
 * select/multiselect用の選択肢
 */
options?: string[]
/**
 * フィールドの説明
 */
description?: string
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
 * ノードの優先度
 */
priority?: ("critical" | "high" | "medium" | "low")
/**
 * ノードのステータス
 */
status?: ("draft" | "pending" | "in-progress" | "review" | "done" | "cancelled" | "deferred")
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
 * ノードの作成日時
 */
createdAt?: string
/**
 * ノードの更新日時
 */
updatedAt?: string
/**
 * ノードの期限
 */
deadline?: string
/**
 * 子ノードの配列
 */
children?: MindmapNode[]
}

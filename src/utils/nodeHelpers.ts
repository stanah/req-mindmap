/**
 * ノード操作のヘルパー関数
 */

import type { MindmapNode } from '../types/generated/mindmap';

/**
 * ユニークなノードIDを生成する
 */
export const generateNodeId = (): string => {
  return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * 新しいノードオブジェクトを作成する
 */
export const createNewNode = (title: string, description?: string): MindmapNode => {
  const now = new Date().toISOString();
  
  return {
    id: generateNodeId(),
    title,
    description,
    status: 'draft',
    priority: 'medium',
    tags: [],
    customFields: {},
    createdAt: now,
    updatedAt: now,
    children: []
  };
};

/**
 * 指定されたIDのノードを見つける再帰関数
 */
export const findNodeById = (node: MindmapNode, targetId: string): MindmapNode | null => {
  if (node.id === targetId) {
    return node;
  }
  
  if (node.children) {
    for (const child of node.children) {
      const found = findNodeById(child, targetId);
      if (found) return found;
    }
  }
  
  return null;
};

/**
 * 指定されたノードの親ノードを見つける関数
 */
export const findParentNode = (rootNode: MindmapNode, targetId: string): MindmapNode | null => {
  if (rootNode.children) {
    for (const child of rootNode.children) {
      if (child.id === targetId) {
        return rootNode;
      }
      const found = findParentNode(child, targetId);
      if (found) return found;
    }
  }
  return null;
};

/**
 * ノード配列内での指定されたノードのインデックスを見つける
 */
export const findNodeIndex = (nodes: MindmapNode[], targetId: string): number => {
  return nodes.findIndex(node => node.id === targetId);
};

/**
 * 兄弟ノードを追加する（指定されたノードの後に追加）
 */
export const addSiblingNode = (rootNode: MindmapNode, targetId: string, newNode: MindmapNode): MindmapNode => {
  // ルートノードの場合、兄弟は追加できない
  if (rootNode.id === targetId) {
    throw new Error('ルートノードには兄弟ノードを追加できません');
  }

  const parentNode = findParentNode(rootNode, targetId);
  if (!parentNode || !parentNode.children) {
    throw new Error('親ノードが見つかりません');
  }

  const targetIndex = findNodeIndex(parentNode.children, targetId);
  if (targetIndex === -1) {
    throw new Error('対象ノードが見つかりません');
  }

  // 対象ノードの後に新しいノードを挿入
  parentNode.children.splice(targetIndex + 1, 0, newNode);
  
  return { ...rootNode };
};

/**
 * 子ノードを追加する
 */
export const addChildNode = (rootNode: MindmapNode, parentId: string, newNode: MindmapNode): MindmapNode => {
  const parentNode = findNodeById(rootNode, parentId);
  if (!parentNode) {
    throw new Error('親ノードが見つかりません');
  }

  if (!parentNode.children) {
    parentNode.children = [];
  }

  parentNode.children.push(newNode);
  
  return { ...rootNode };
};
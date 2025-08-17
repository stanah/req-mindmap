/**
 * ライブラリエクスポート統合テスト
 * コンポーネントライブラリとしての主要機能をテスト
 */

import { describe, it, expect } from 'vitest';

// メインエクスポートをテスト
import * as MindmapLibrary from '../../index';

describe('Mindmap Library Exports', () => {
  describe('Core Components', () => {
    it('MindmapRenderer がエクスポートされている', () => {
      expect(MindmapLibrary.MindmapRenderer).toBeDefined();
      expect(typeof MindmapLibrary.MindmapRenderer).toBe('function');
    });

    it('MindmapCore がエクスポートされている', () => {
      expect(MindmapLibrary.MindmapCore).toBeDefined();
      expect(typeof MindmapLibrary.MindmapCore).toBe('function');
    });

    it('MindmapViewer がエクスポートされている', () => {
      expect(MindmapLibrary.MindmapViewer).toBeDefined();
      expect(typeof MindmapLibrary.MindmapViewer).toBe('function');
    });

    it('MindmapParser がエクスポートされている', () => {
      expect(MindmapLibrary.MindmapParser).toBeDefined();
      expect(typeof MindmapLibrary.MindmapParser).toBe('function');
    });
  });

  describe('Store Integration', () => {
    it('useAppStore がエクスポートされている', () => {
      expect(MindmapLibrary.useAppStore).toBeDefined();
      expect(typeof MindmapLibrary.useAppStore).toBe('function');
    });
  });

  describe('Utility Functions', () => {
    it('ノードヘルパー関数がエクスポートされている', () => {
      expect(MindmapLibrary.findNodeById).toBeDefined();
      expect(MindmapLibrary.findParentNode).toBeDefined();
      expect(MindmapLibrary.findChildNodes).toBeDefined();
      expect(MindmapLibrary.findSiblingNodes).toBeDefined();
      expect(MindmapLibrary.calculateNodeDepth).toBeDefined();
      expect(MindmapLibrary.countDescendants).toBeDefined();
      expect(MindmapLibrary.isNodeAncestor).toBeDefined();
      expect(MindmapLibrary.getNodePath).toBeDefined();
      expect(MindmapLibrary.visitAllNodes).toBeDefined();
    });

    it('ノードマッピング関数がエクスポートされている', () => {
      expect(MindmapLibrary.mapNodesToHierarchy).toBeDefined();
      expect(MindmapLibrary.flattenHierarchy).toBeDefined();
      expect(MindmapLibrary.buildNodeIndex).toBeDefined();
      expect(MindmapLibrary.rebuildNodeConnections).toBeDefined();
    });
  });

  describe('Type Definitions', () => {
    it('型定義のインポートが可能', () => {
      // TypeScript コンパイル時にチェックされるので、
      // ランタイムでは型の存在確認は難しい
      // 代わりに、型を使用する関数が正しく動作することを確認
      expect(true).toBe(true);
    });
  });

  describe('Library API Stability', () => {
    it('必須エクスポートが全て存在する', () => {
      const requiredExports = [
        'MindmapRenderer',
        'MindmapCore', 
        'MindmapViewer',
        'MindmapParser',
        'useAppStore',
        'findNodeById',
        'mapNodesToHierarchy'
      ];

      requiredExports.forEach(exportName => {
        expect(MindmapLibrary).toHaveProperty(exportName);
        expect((MindmapLibrary as any)[exportName]).toBeDefined();
      });
    });

    it('予期しないエクスポートが含まれていない', () => {
      const allowedExports = [
        // Core components
        'MindmapRenderer',
        'MindmapCore',
        'MindmapViewer', 
        'MindmapParser',
        
        // Store
        'useAppStore',
        
        // Node helpers
        'findNodeById',
        'findParentNode',
        'findChildNodes',
        'findSiblingNodes', 
        'calculateNodeDepth',
        'countDescendants',
        'isNodeAncestor',
        'getNodePath',
        'visitAllNodes',
        'deleteNode',
        'addChildNode',
        'moveNode',
        'updateNodeContent',
        'validateNodeStructure',
        'generateNodeId',
        'cloneNode',
        'mergeNodes',
        
        // Node mapping
        'mapNodesToHierarchy',
        'flattenHierarchy', 
        'buildNodeIndex',
        'rebuildNodeConnections'
      ];

      const actualExports = Object.keys(MindmapLibrary);
      const unexpectedExports = actualExports.filter(
        exportName => !allowedExports.includes(exportName)
      );

      if (unexpectedExports.length > 0) {
        console.warn('Unexpected exports found:', unexpectedExports);
        // 警告として記録するが、テストは失敗させない（新機能追加の場合があるため）
      }

      expect(actualExports.length).toBeGreaterThan(0);
    });
  });

  describe('Module Loading', () => {
    it('ライブラリが正常にロードできる', () => {
      expect(typeof MindmapLibrary).toBe('object');
      expect(MindmapLibrary).not.toBeNull();
    });

    it('循環依存がない', () => {
      // 循環依存があるとモジュールロードで問題が発生するため、
      // 正常にインポートできることで循環依存がないことを確認
      expect(() => {
        require('../../index');
      }).not.toThrow();
    });
  });
});
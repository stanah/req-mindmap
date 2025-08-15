/**
 * マインドマップノード更新の共通ロジック
 * VSCode版とWeb版で共通して使用可能
 */

import { useCallback } from 'react';
import { useAppStore } from '../stores';
import { PlatformAdapterFactory } from '../platform';
import type { MindmapNode, MindmapData } from '../types';
import type { MindmapCore } from '../core';

interface UseMindmapNodeUpdateOptions {
  rendererRef: React.MutableRefObject<MindmapCore | null>;
}

export const useMindmapNodeUpdate = ({ rendererRef }: UseMindmapNodeUpdateOptions) => {
  const parsedData = useAppStore(state => state.parse.parsedData);

  const updateNode = useCallback(async (nodeId: string, updates: Partial<MindmapNode>) => {
    if (!rendererRef.current || !parsedData) {
      console.warn('レンダラーまたはデータが存在しません');
      return false;
    }
    
    try {
      // MindmapCoreのupdateNodeメソッドを使用してノードを更新
      rendererRef.current.updateNode(nodeId, updates);
      console.log('ノード更新完了:', nodeId, updates);
      
      // 更新されたデータを取得
      const updatedData = rendererRef.current.getData();
      
      // Zustand ストアを更新
      useAppStore.setState((state) => ({
        parse: {
          ...state.parse,
          parsedData: updatedData,
          lastParsed: Date.now(),
        },
      }));
      
      // プラットフォーム別の保存処理
      if (updatedData) {
        await saveMindmapData(updatedData);
      }
      
      // 再描画
      if (updatedData) {
        rendererRef.current.render(updatedData);
      }
      
      return true;
    } catch (error) {
      console.error('ノード更新に失敗:', error);
      return false;
    }
  }, [rendererRef, parsedData]);

  return { updateNode };
};

/**
 * プラットフォーム別のマインドマップデータ保存処理
 */
async function saveMindmapData(data: MindmapData): Promise<void> {
  try {
    const platformAdapter = PlatformAdapterFactory.getInstance();
    const platformType = platformAdapter.getPlatformType();
    
    if (platformType === 'vscode') {
      // VSCode環境での保存処理
      await saveToVSCode(data);
    } else if (platformType === 'browser') {
      // Web環境での保存処理
      await saveToWeb(data);
    } else {
      console.warn('未対応のプラットフォーム:', platformType);
    }
  } catch (error) {
    console.error('ファイル保存に失敗:', error);
    throw error;
  }
}

/**
 * VSCode環境でのファイル保存
 */
async function saveToVSCode(data: MindmapData): Promise<void> {
  // HTMLで初期化されたVSCode APIインスタンスを使用
  const vscode = (window as any).vscodeApiInstance || (window as any).vscode;
  
  if (!vscode) {
    throw new Error('VSCode APIが利用できません - HTMLで初期化されていない可能性があります');
  }
  
  const saveMessage = {
    command: 'saveFile',
    data: data
  };
  
  console.log('VSCodeにファイル保存を要求します:', saveMessage);
  console.log('送信するデータのタイプ:', typeof data);
  console.log('送信するデータのプロパティ:', Object.keys(data || {}));
  
  vscode.postMessage(saveMessage);
  console.log('メッセージ送信完了');
}

/**
 * Web環境でのファイル保存
 * 現在開いているファイルの形式に応じて保存
 */
async function saveToWeb(data: MindmapData): Promise<void> {
  const state = useAppStore.getState();
  const currentFileContent = state.file.fileContent;
  
  if (!currentFileContent) {
    console.warn('現在開いているファイル内容がありません');
    return;
  }
  
  // ファイル形式に応じてシリアライズ
  let content: string;
  const fileFormat = state.file.fileFormat;
  
  if (fileFormat === 'json') {
    content = JSON.stringify(data, null, 2);
  } else if (fileFormat === 'yaml') {
    // YAMLライブラリが利用可能な場合の処理
    try {
      // 動的インポートでYAMLライブラリを読み込み
      const yaml = await import('yaml');
      content = yaml.stringify(data);
    } catch (error) {
      console.error('YAMLライブラリの読み込みに失敗:', error);
      // フォールバックとしてJSONで保存
      content = JSON.stringify(data, null, 2);
    }
  } else {
    // デフォルトはJSON形式
    content = JSON.stringify(data, null, 2);
  }
  
  // ファイルの内容を更新
  useAppStore.setState((state) => ({
    file: {
      ...state.file,
      fileContent: content,
      isDirty: true,
      lastSaved: null,
    },
  }));
  
  console.log('ファイル内容を更新しました:', {
    fileFormat: fileFormat,
    contentLength: content.length,
    isDirty: true
  });
}
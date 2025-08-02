import { FileSystemAdapter } from '../interfaces';
import { getPlatformAdapter } from '../adapters';
import type { FileService } from '../../types';

/**
 * 既存のFileServiceをプラットフォーム抽象化レイヤーと統合するアダプター
 */
export class FileServiceAdapter implements FileService {
  private platformAdapter: FileSystemAdapter;

  constructor() {
    this.platformAdapter = getPlatformAdapter().fileSystem;
  }

  async loadFile(path?: string): Promise<string> {
    if (path) {
      // パスが指定されている場合は直接読み込み
      return await this.platformAdapter.readFile(path);
    } else {
      // パスが指定されていない場合はダイアログを表示
      const selectedPath = await this.platformAdapter.showOpenDialog({
        title: 'マインドマップファイルを開く',
        filters: [
          {
            name: 'マインドマップファイル',
            extensions: ['json', 'yaml', 'yml']
          },
          {
            name: 'すべてのファイル',
            extensions: ['*']
          }
        ]
      });

      if (!selectedPath) {
        throw new Error('ファイルが選択されませんでした');
      }

      return await this.platformAdapter.readFile(selectedPath);
    }
  }

  async saveFile(path: string, content: string): Promise<void> {
    await this.platformAdapter.writeFile(path, content);
  }

  async saveAsFile(content: string, suggestedName?: string): Promise<string> {
    const selectedPath = await this.platformAdapter.showSaveDialog({
      title: 'マインドマップファイルを保存',
      defaultPath: suggestedName || 'mindmap.json',
      filters: [
        {
          name: 'JSONファイル',
          extensions: ['json']
        },
        {
          name: 'YAMLファイル',
          extensions: ['yaml', 'yml']
        }
      ]
    });

    if (!selectedPath) {
      throw new Error('保存がキャンセルされました');
    }

    await this.platformAdapter.writeFile(selectedPath, content);
    return selectedPath;
  }

  watchFile(path: string, callback: (content: string) => void): () => void {
    return this.platformAdapter.watchFile(path, callback);
  }

  stopWatching(path: string): void {
    // watchFileが返すdispose関数を使用するため、
    // このメソッドは非推奨として扱う
    console.warn('stopWatching is deprecated. Use the dispose function returned by watchFile instead.');
  }

  async exists(path: string): Promise<boolean> {
    return await this.platformAdapter.exists(path);
  }

  async deleteFile(path: string): Promise<void> {
    // プラットフォーム抽象化レイヤーには削除機能がないため、
    // 将来的に追加する必要がある
    throw new Error('ファイル削除機能はまだ実装されていません');
  }

  async createDirectory(path: string): Promise<void> {
    // プラットフォーム抽象化レイヤーにはディレクトリ作成機能がないため、
    // 将来的に追加する必要がある
    throw new Error('ディレクトリ作成機能はまだ実装されていません');
  }

  async listFiles(directory: string): Promise<string[]> {
    // プラットフォーム抽象化レイヤーにはファイル一覧機能がないため、
    // 将来的に追加する必要がある
    throw new Error('ファイル一覧機能はまだ実装されていません');
  }

  /**
   * 新規ファイルテンプレートを生成
   */
  createNewFileTemplate(templateType: 'basic' | 'advanced' | 'project' = 'basic'): string {
    const templates = {
      basic: {
        version: '1.0',
        title: '新しいマインドマップ',
        root: {
          id: 'root',
          title: 'ルートノード',
          description: 'このマインドマップのメインテーマです',
          children: [
            {
              id: 'branch1',
              title: 'ブランチ1',
              description: '最初のアイデアまたはトピック',
              children: []
            },
            {
              id: 'branch2',
              title: 'ブランチ2',
              description: '2つ目のアイデアまたはトピック',
              children: []
            }
          ]
        }
      },
      advanced: {
        version: '1.0',
        title: '高度なマインドマップテンプレート',
        description: 'カスタムフィールドとメタデータを含むテンプレート',
        schema: {
          version: '1.0',
          fields: [
            {
              id: 'priority',
              name: '優先度',
              type: 'select',
              options: ['高', '中', '低'],
              required: false
            },
            {
              id: 'status',
              name: 'ステータス',
              type: 'select',
              options: ['未着手', '進行中', '完了'],
              required: false
            }
          ]
        },
        root: {
          id: 'root',
          title: 'プロジェクトルート',
          description: 'プロジェクトの全体像',
          customFields: {
            priority: '高',
            status: '進行中'
          },
          children: []
        }
      },
      project: {
        version: '1.0',
        title: 'プロジェクト管理テンプレート',
        description: 'プロジェクト管理用の包括的なテンプレート',
        root: {
          id: 'project-root',
          title: 'プロジェクト名',
          description: 'プロジェクトの目的と概要を記述してください',
          children: [
            {
              id: 'objectives',
              title: '目標・成果物',
              description: 'プロジェクトの目標と期待される成果物',
              children: []
            },
            {
              id: 'stakeholders',
              title: 'ステークホルダー',
              description: 'プロジェクトに関わる人々',
              children: []
            }
          ]
        }
      }
    };

    return JSON.stringify(templates[templateType], null, 2);
  }
}
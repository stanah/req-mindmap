import { MindmapData, MindmapNode } from '../types/mindmap';
import { MindmapData, MindmapNode } from '../types/mindmap';

/**
 * テンプレートタイプ定義
 */
export type TemplateType = 'starter' | 'standard' | 'enterprise' | 'custom';

/**
 * スキーマ定義のインターフェース
 */
export interface SchemaDefinition {
  templateType: string;
  properties?: Record<string, any>;
  definitions?: Record<string, any>;
  required?: string[];
}

/**
 * テンプレート生成オプション
 */
export interface TemplateGeneratorOptions {
  templateType?: TemplateType;
  includeExamples?: boolean;
  includeComments?: boolean;
  locale?: 'ja' | 'en';
}

/**
 * テンプレート生成結果
 */
export interface TemplateGeneratorResult {
  data: MindmapData;
  metadata: {
    templateType: TemplateType;
    generatedAt: string;
    schemaVersion: string;
  };
}

/**
 * テンプレート生成サービス
 */
export class TemplateGeneratorService {
  private static instance: TemplateGeneratorService;

  private constructor() {}

  static getInstance(): TemplateGeneratorService {
    if (!TemplateGeneratorService.instance) {
      TemplateGeneratorService.instance = new TemplateGeneratorService();
    }
    return TemplateGeneratorService.instance;
  }

  /**
   * スキーマからテンプレートを生成
   */
  async generateFromSchema(
    schema: SchemaDefinition,
    options: TemplateGeneratorOptions = {}
  ): Promise<TemplateGeneratorResult> {
    const {
      templateType = this.detectTemplateType(schema),
      includeExamples = true,
      includeComments = true,
      locale = 'ja'
    } = options;

    // テンプレートタイプに基づいて生成
    let template: MindmapData;
    switch (templateType) {
      case 'starter':
        template = this.generateStarterTemplate(schema, locale, includeExamples);
        break;
      case 'standard':
        template = this.generateStandardTemplate(schema, locale, includeExamples);
        break;
      case 'enterprise':
        template = this.generateEnterpriseTemplate(schema, locale, includeExamples);
        break;
      default:
        template = this.generateCustomTemplate(schema, locale, includeExamples);
    }

    // コメント追加
    if (includeComments) {
      this.addHelpfulComments(template, locale);
    }

    return {
      data: template,
      metadata: {
        templateType,
        generatedAt: new Date().toISOString(),
        schemaVersion: schema.properties?.version?.default || '1.0'
      }
    };
  }

  /**
   * テンプレートタイプを自動検出
   */
  private detectTemplateType(schema: SchemaDefinition): TemplateType {
    const templateTypeValue = schema.properties?.templateType?.const || 
                             schema.properties?.templateType?.default;
    
    if (templateTypeValue?.includes('starter')) return 'starter';
    if (templateTypeValue?.includes('standard')) return 'standard';
    if (templateTypeValue?.includes('enterprise')) return 'enterprise';
    
    // スキーマの複雑さから推測
    const hasStakeholders = !!schema.properties?.stakeholders;
    const hasQuality = !!schema.properties?.qualityTargets;
    const hasTraceability = !!schema.properties?.traceability;
    
    if (hasTraceability) return 'enterprise';
    if (hasStakeholders && hasQuality) return 'standard';
    
    return 'starter';
  }

  /**
   * Starterテンプレート生成
   */
  private generateStarterTemplate(
    schema: SchemaDefinition,
    locale: 'ja' | 'en',
    includeExamples: boolean
  ): MindmapData {
    const labels = this.getLabels(locale);
    
    const root: MindmapNode = {
      id: 'root',
      title: labels.projectTitle,
      children: [
        {
          id: 'business-goals',
          title: labels.businessGoals,
          children: includeExamples ? [
            {
              id: 'bg001',
              title: labels.exampleBusinessGoal,
              description: labels.exampleBusinessGoalDesc,
              customFields: {
                priority: 'must',
                status: 'draft'
              }
            }
          ] : []
        },
        {
          id: 'user-requirements',
          title: labels.userRequirements,
          children: includeExamples ? [
            {
              id: 'ur001',
              title: labels.exampleUserRequirement,
              description: labels.exampleUserRequirementDesc,
              customFields: {
                priority: 'must',
                status: 'draft',
                acceptanceCriteria: [
                  labels.exampleAcceptanceCriteria1,
                  labels.exampleAcceptanceCriteria2
                ]
              }
            }
          ] : []
        }
      ]
    };

    return {
      version: '1.0',
      type: 'requirements',
      root,
      metadata: {
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        templateType: 'starter-requirements'
      }
    };
  }

  /**
   * Standardテンプレート生成
   */
  private generateStandardTemplate(
    schema: SchemaDefinition,
    locale: 'ja' | 'en',
    includeExamples: boolean
  ): MindmapData {
    const starterTemplate = this.generateStarterTemplate(schema, locale, includeExamples);
    const labels = this.getLabels(locale);
    
    // システム要件を追加
    starterTemplate.root.children?.push({
      id: 'system-requirements',
      name: labels.systemRequirements,
      children: includeExamples ? [
        {
          id: 'sr001',
          name: labels.exampleSystemRequirement,
          attributes: {
            priority: 'must',
            status: 'draft',
            category: 'functional',
            description: labels.exampleSystemRequirementDesc
          }
        }
      ] : []
    });

    // ステークホルダーを追加
    if (!starterTemplate.root.attributes) {
      starterTemplate.root.attributes = {};
    }
    starterTemplate.root.attributes.stakeholders = includeExamples ? {
      'product_owner': {
        name: labels.productOwner,
        role: labels.productOwnerRole,
        influence: 'high',
        interest: 'high'
      },
      'dev_team': {
        name: labels.devTeam,
        role: labels.devTeamRole,
        influence: 'high',
        interest: 'high'
      }
    } : {};

    // 品質ターゲットを追加
    starterTemplate.root.attributes.qualityTargets = includeExamples ? [
      {
        name: labels.qualityPerformance,
        target: labels.qualityPerformanceTarget,
        priority: 'must'
      },
      {
        name: labels.qualityUsability,
        target: labels.qualityUsabilityTarget,
        priority: 'should'
      }
    ] : [];

    starterTemplate.metadata!.templateType = 'standard-requirements';
    
    return starterTemplate;
  }

  /**
   * Enterpriseテンプレート生成
   */
  private generateEnterpriseTemplate(
    schema: SchemaDefinition,
    locale: 'ja' | 'en',
    includeExamples: boolean
  ): MindmapData {
    const standardTemplate = this.generateStandardTemplate(schema, locale, includeExamples);
    const labels = this.getLabels(locale);
    
    // トレーサビリティマトリクスを追加
    if (!standardTemplate.root.attributes) {
      standardTemplate.root.attributes = {};
    }
    
    standardTemplate.root.attributes.traceability = {
      'bg001': {
        realizes: [],
        realizedBy: ['ur001'],
        coverage: 50
      },
      'ur001': {
        realizes: ['bg001'],
        realizedBy: ['sr001'],
        coverage: 30
      }
    };

    // コンプライアンス情報を追加
    standardTemplate.root.attributes.compliance = {
      standards: includeExamples ? ['ISO 9001', 'ISO 27001'] : [],
      lastAudit: new Date().toISOString(),
      nextAudit: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    };

    // 詳細なメトリクスを追加
    standardTemplate.root.attributes.metrics = {
      completeness: 0,
      consistency: 0,
      traceability: 0,
      quality: 0
    };

    standardTemplate.metadata!.templateType = 'enterprise-requirements';
    
    return standardTemplate;
  }

  /**
   * カスタムテンプレート生成
   */
  private generateCustomTemplate(
    schema: SchemaDefinition,
    locale: 'ja' | 'en',
    includeExamples: boolean
  ): MindmapData {
    // スキーマのプロパティから動的に生成
    const labels = this.getLabels(locale);
    const root: MindmapNode = {
      id: 'root',
      name: labels.customProject,
      children: []
    };

    // スキーマのプロパティを解析して動的にノードを生成
    if (schema.properties?.core?.properties) {
      Object.entries(schema.properties.core.properties).forEach(([key, prop]: [string, any]) => {
        root.children?.push({
          id: key,
          name: this.formatPropertyName(key, locale),
          children: []
        });
      });
    }

    return {
      version: '1.0',
      type: 'custom',
      root,
      metadata: {
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        templateType: 'custom-requirements'
      }
    };
  }

  /**
   * ヘルプフルコメントを追加
   */
  private addHelpfulComments(template: MindmapData, locale: 'ja' | 'en'): void {
    const comments = locale === 'ja' ? {
      businessGoals: '// ビジネス価値や目標を定義します',
      userRequirements: '// ユーザーの要求事項を記載します',
      systemRequirements: '// システムの技術要件を記載します',
      priority: '// must/should/could/wont で優先度を設定',
      status: '// draft/review/approved/implemented/verified'
    } : {
      businessGoals: '// Define business value and goals',
      userRequirements: '// Describe user requirements',
      systemRequirements: '// Describe system technical requirements',
      priority: '// Set priority with must/should/could/wont',
      status: '// Use draft/review/approved/implemented/verified'
    };

    // ノードに説明を追加
    this.traverseAndAddComments(template.root, comments);
  }

  /**
   * ノードを走査してコメントを追加
   */
  private traverseAndAddComments(node: MindmapNode, comments: Record<string, string>): void {
    // ノード名に基づいてコメントを追加
    if (node.name.includes('ビジネス') || node.name.includes('Business')) {
      node.description = comments.businessGoals;
    } else if (node.name.includes('ユーザー') || node.name.includes('User')) {
      node.description = comments.userRequirements;
    } else if (node.name.includes('システム') || node.name.includes('System')) {
      node.description = comments.systemRequirements;
    }

    // 属性にコメントを追加
    if (node.attributes?.priority) {
      node.attributes._priorityHelp = comments.priority;
    }
    if (node.attributes?.status) {
      node.attributes._statusHelp = comments.status;
    }

    // 子ノードも処理
    node.children?.forEach(child => this.traverseAndAddComments(child, comments));
  }

  /**
   * プロパティ名をフォーマット
   */
  private formatPropertyName(key: string, locale: 'ja' | 'en'): string {
    // キャメルケースをスペース区切りに変換
    const formatted = key.replace(/([A-Z])/g, ' $1').trim();
    
    // 一般的な用語を翻訳
    const translations: Record<string, Record<'ja' | 'en', string>> = {
      'businessGoals': { ja: 'ビジネス目標', en: 'Business Goals' },
      'userRequirements': { ja: 'ユーザー要件', en: 'User Requirements' },
      'systemRequirements': { ja: 'システム要件', en: 'System Requirements' },
      'stakeholders': { ja: 'ステークホルダー', en: 'Stakeholders' },
      'qualityTargets': { ja: '品質目標', en: 'Quality Targets' }
    };

    return translations[key]?.[locale] || formatted;
  }

  /**
   * ローカライズされたラベルを取得
   */
  private getLabels(locale: 'ja' | 'en') {
    const labels = {
      ja: {
        projectTitle: '新規プロジェクト要件定義',
        businessGoals: 'ビジネス目標',
        userRequirements: 'ユーザー要件',
        systemRequirements: 'システム要件',
        exampleBusinessGoal: '業務効率の向上',
        exampleBusinessGoalDesc: '現在の手動プロセスを自動化し、作業時間を50%削減する',
        exampleUserRequirement: 'データの可視化機能',
        exampleUserRequirementDesc: 'ユーザーとして、データをグラフで確認したい',
        exampleAcceptanceCriteria1: 'グラフの種類を選択できる',
        exampleAcceptanceCriteria2: 'データをリアルタイムで更新できる',
        exampleSystemRequirement: 'API設計',
        exampleSystemRequirementDesc: 'RESTful APIを実装し、フロントエンドと連携する',
        productOwner: 'プロダクトオーナー',
        productOwnerRole: '製品責任者',
        devTeam: '開発チーム',
        devTeamRole: '技術実装担当',
        qualityPerformance: 'パフォーマンス',
        qualityPerformanceTarget: 'レスポンス時間1秒以内',
        qualityUsability: 'ユーザビリティ',
        qualityUsabilityTarget: '新規ユーザーが5分以内に基本操作を習得',
        customProject: 'カスタムプロジェクト'
      },
      en: {
        projectTitle: 'New Project Requirements',
        businessGoals: 'Business Goals',
        userRequirements: 'User Requirements',
        systemRequirements: 'System Requirements',
        exampleBusinessGoal: 'Improve Business Efficiency',
        exampleBusinessGoalDesc: 'Automate manual processes and reduce work time by 50%',
        exampleUserRequirement: 'Data Visualization',
        exampleUserRequirementDesc: 'As a user, I want to view data in graphs',
        exampleAcceptanceCriteria1: 'Can select graph types',
        exampleAcceptanceCriteria2: 'Data updates in real-time',
        exampleSystemRequirement: 'API Design',
        exampleSystemRequirementDesc: 'Implement RESTful API for frontend integration',
        productOwner: 'Product Owner',
        productOwnerRole: 'Product Manager',
        devTeam: 'Development Team',
        devTeamRole: 'Technical Implementation',
        qualityPerformance: 'Performance',
        qualityPerformanceTarget: 'Response time under 1 second',
        qualityUsability: 'Usability',
        qualityUsabilityTarget: 'New users learn basics within 5 minutes',
        customProject: 'Custom Project'
      }
    };

    return labels[locale];
  }

  /**
   * スキーマファイルから生成
   */
  async generateFromSchemaFile(
    schemaPath: string,
    options: TemplateGeneratorOptions = {}
  ): Promise<TemplateGeneratorResult> {
    try {
      // ファイルサービスを使ってスキーマを読み込む
      const response = await fetch(schemaPath);
      const schema = await response.json();
      
      return this.generateFromSchema(schema, options);
    } catch (error) {
      throw new Error(`Failed to load schema from ${schemaPath}: ${error}`);
    }
  }
}

// シングルトンインスタンスのエクスポート
export const templateGeneratorService = TemplateGeneratorService.getInstance();
import { describe, it, expect, beforeEach } from 'vitest';
import { TemplateGeneratorService, TemplateType } from '../templateGeneratorService';

describe('TemplateGeneratorService', () => {
  let service: TemplateGeneratorService;

  beforeEach(() => {
    service = TemplateGeneratorService.getInstance();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = TemplateGeneratorService.getInstance();
      const instance2 = TemplateGeneratorService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('generateFromSchema', () => {
    const mockSchema = {
      templateType: 'starter-requirements',
      properties: {
        version: { default: '1.0' },
        templateType: { const: 'starter-requirements' },
        core: {
          properties: {
            businessGoals: { type: 'array' },
            userRequirements: { type: 'array' }
          }
        }
      }
    };

    it('should generate starter template', async () => {
      const result = await service.generateFromSchema(mockSchema, {
        templateType: 'starter' as TemplateType,
        includeExamples: true,
        locale: 'ja'
      });

      expect(result.data.root.name).toBe('新規プロジェクト要件定義');
      expect(result.data.root.children).toHaveLength(2);
      expect(result.data.root.children?.[0].name).toBe('ビジネス目標');
      expect(result.data.root.children?.[1].name).toBe('ユーザー要件');
      expect(result.metadata.templateType).toBe('starter');
    });

    it('should generate standard template', async () => {
      const result = await service.generateFromSchema(mockSchema, {
        templateType: 'standard' as TemplateType,
        includeExamples: true,
        locale: 'ja'
      });

      expect(result.data.root.children).toHaveLength(3);
      expect(result.data.root.children?.[2].name).toBe('システム要件');
      expect(result.data.root.attributes?.stakeholders).toBeDefined();
      expect(result.data.root.attributes?.qualityTargets).toBeDefined();
      expect(result.metadata.templateType).toBe('standard');
    });

    it('should generate enterprise template', async () => {
      const result = await service.generateFromSchema(mockSchema, {
        templateType: 'enterprise' as TemplateType,
        includeExamples: true,
        locale: 'ja'
      });

      expect(result.data.root.children).toHaveLength(3);
      expect(result.data.root.attributes?.traceability).toBeDefined();
      expect(result.data.root.attributes?.compliance).toBeDefined();
      expect(result.data.root.attributes?.metrics).toBeDefined();
      expect(result.metadata.templateType).toBe('enterprise');
    });

    it('should generate English template', async () => {
      const result = await service.generateFromSchema(mockSchema, {
        templateType: 'starter' as TemplateType,
        includeExamples: true,
        locale: 'en'
      });

      expect(result.data.root.name).toBe('New Project Requirements');
      expect(result.data.root.children?.[0].name).toBe('Business Goals');
      expect(result.data.root.children?.[1].name).toBe('User Requirements');
    });

    it('should generate template without examples', async () => {
      const result = await service.generateFromSchema(mockSchema, {
        templateType: 'starter' as TemplateType,
        includeExamples: false,
        locale: 'ja'
      });

      expect(result.data.root.children?.[0].children).toHaveLength(0);
      expect(result.data.root.children?.[1].children).toHaveLength(0);
    });

    it('should add helpful comments when requested', async () => {
      const result = await service.generateFromSchema(mockSchema, {
        templateType: 'starter' as TemplateType,
        includeComments: true,
        includeExamples: true,
        locale: 'ja'
      });

      // ビジネス目標ノードにコメントが追加されているかチェック
      const businessGoalsNode = result.data.root.children?.find(
        child => child.name === 'ビジネス目標'
      );
      expect(businessGoalsNode?.description).toContain('ビジネス価値');
    });

    it('should auto-detect template type from schema', async () => {
      const starterSchema = {
        ...mockSchema,
        properties: {
          ...mockSchema.properties,
          templateType: { const: 'starter-requirements' }
        }
      };

      const result = await service.generateFromSchema(starterSchema);
      expect(result.metadata.templateType).toBe('starter');
    });

    it('should detect enterprise template from complex schema', async () => {
      const enterpriseSchema = {
        ...mockSchema,
        properties: {
          ...mockSchema.properties,
          traceability: { type: 'object' },
          compliance: { type: 'object' }
        }
      };

      const result = await service.generateFromSchema(enterpriseSchema);
      expect(result.metadata.templateType).toBe('enterprise');
    });

    it('should detect standard template from medium schema', async () => {
      const standardSchema = {
        ...mockSchema,
        properties: {
          ...mockSchema.properties,
          stakeholders: { type: 'object' },
          qualityTargets: { type: 'array' }
        }
      };

      const result = await service.generateFromSchema(standardSchema);
      expect(result.metadata.templateType).toBe('standard');
    });
  });

  describe('generateFromSchemaFile', () => {
    it('should handle file loading errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(
        service.generateFromSchemaFile('/invalid/path.json')
      ).rejects.toThrow('Failed to load schema from /invalid/path.json');
    });

    it('should handle invalid JSON in schema file', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
      });

      await expect(
        service.generateFromSchemaFile('/invalid.json')
      ).rejects.toThrow('Failed to load schema from /invalid.json');
    });
  });
});
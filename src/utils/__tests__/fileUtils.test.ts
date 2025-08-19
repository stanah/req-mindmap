/**
 * @fileoverview fileUtilsのテスト
 */

import { describe, it, expect } from 'vitest';
import { detectFormat, detectFileFormat } from '../fileUtils';

describe('fileUtils', () => {
  describe('detectFormat', () => {
    it('JSON拡張子を正しく検出する', () => {
      expect(detectFormat('test.json')).toBe('json');
      expect(detectFormat('data.JSON')).toBe('json');
    });

    it('YAML拡張子を正しく検出する', () => {
      expect(detectFormat('test.yaml')).toBe('yaml');
      expect(detectFormat('test.yml')).toBe('yaml');
      expect(detectFormat('data.YAML')).toBe('yaml');
    });

    it('未対応拡張子はunknownを返す', () => {
      expect(detectFormat('test.txt')).toBe('unknown');
      expect(detectFormat('test')).toBe('unknown');
      expect(detectFormat('')).toBe('unknown');
    });
  });

  describe('detectFileFormat', () => {
    it('拡張子による判定を優先する', () => {
      expect(detectFileFormat('test.json')).toBe('json');
      expect(detectFileFormat('test.yaml')).toBe('yaml');
    });

    it('内容からJSON形式を検出する', () => {
      const jsonContent = '{"key": "value"}';
      expect(detectFileFormat('unknown.file', jsonContent)).toBe('json');

      const jsonArrayContent = '[{"key": "value"}]';
      expect(detectFileFormat('unknown.file', jsonArrayContent)).toBe('json');
    });

    it('内容からYAML形式を検出する', () => {
      const yamlContent = 'key: value';
      expect(detectFileFormat('unknown.file', yamlContent)).toBe('yaml');

      const yamlListContent = '- item1\n- item2';
      expect(detectFileFormat('unknown.file', yamlListContent)).toBe('yaml');
    });

    it('判定不可能な場合はunknownを返す', () => {
      expect(detectFileFormat('unknown.file', 'plain text content')).toBe('unknown');
      expect(detectFileFormat('unknown.file')).toBe('unknown');
    });
  });
});
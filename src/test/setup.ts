/**
 * テストセットアップファイル
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// グローバルなテスト設定
global.console = {
  ...console,
  // テスト中のログを抑制（必要に応じて）
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};
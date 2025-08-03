/**
 * TypeScript type definitions for mindmap data structures
 */

/**
 * Base mindmap node interface
 */
export interface MindmapNode {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  customFields?: Record<string, any>;
  children?: MindmapNode[];
  metadata?: {
    createdAt?: string;
    updatedAt?: string;
    version?: string;
    [key: string]: any;
  };
}

/**
 * Root mindmap structure
 */
export interface Mindmap {
  version?: string;
  title?: string;
  metadata?: {
    createdAt?: string;
    updatedAt?: string;
    description?: string;
    version?: string;
    [key: string]: any;
  };
  schema?: {
    fields?: Array<{
      name: string;
      type: string;
      label?: string;
      options?: string[];
      required?: boolean;
      defaultValue?: any;
    }>;
  };
  tags?: Array<{
    name: string;
    color?: string;
    description?: string;
  }>;
  root: MindmapNode;
  settings?: {
    theme?: string;
    layout?: string;
    autoSave?: {
      enabled: boolean;
      interval: number;
    };
    version?: string;
  };
}

/**
 * Search result interface
 */
export interface SearchResult {
  node: MindmapNode;
  path: string[];
  score: number;
  matchedFields: string[];
}

/**
 * Node creation parameters
 */
export interface CreateNodeParams {
  parentId: string;
  title: string;
  description?: string;
  customFields?: Record<string, any>;
  tags?: string[];
}

/**
 * Node update parameters
 */
export interface UpdateNodeParams {
  nodeId: string;
  title?: string;
  description?: string;
  customFields?: Record<string, any>;
  tags?: string[];
}

/**
 * Search parameters
 */
export interface SearchParams {
  query: string;
  filters?: {
    tags?: string[];
    customFields?: Record<string, any>;
    depth?: number;
  };
  limit?: number;
}

/**
 * File operation result
 */
export interface FileOperationResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

/**
 * Backup information
 */
export interface BackupInfo {
  filePath: string;
  timestamp: string;
  size: number;
  checksum?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    path: string;
    message: string;
    value?: any;
  }>;
  warnings: Array<{
    path: string;
    message: string;
    value?: any;
  }>;
}

/**
 * Statistics about a mindmap
 */
export interface MindmapStats {
  totalNodes: number;
  maxDepth: number;
  averageBranching: number;
  tagCounts: Record<string, number>;
  customFieldCounts: Record<string, number>;
  lastModified?: string;
  fileSize?: number;
}
/**
 * Custom error classes for MCP server
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

/**
 * Base class for mindmap-specific errors
 */
export class MindmapError extends Error {
  public code: string;
  public readonly details?: Record<string, unknown> | undefined;

  constructor(message: string, code = 'MINDMAP_ERROR', details?: Record<string, unknown> | undefined) {
    super(message);
    this.name = 'MindmapError';
    this.code = code;
    this.details = details;
    
    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MindmapError);
    }
  }

  toMcpError(): McpError {
    return new McpError(ErrorCode.InternalError, this.message);
  }
}

/**
 * File operation errors
 */
export class FileError extends MindmapError {
  constructor(message: string, filePath?: string, originalError?: Error) {
    super(
      message,
      'FILE_ERROR',
      {
        filePath,
        originalError: originalError?.message,
      }
    );
    this.name = 'FileError';
  }

  override toMcpError(): McpError {
    return new McpError(ErrorCode.InternalError, `File operation failed: ${this.message}`);
  }
}

/**
 * File not found errors
 */
export class FileNotFoundError extends FileError {
  constructor(filePath: string) {
    super(`File not found: ${filePath}`, filePath);
    this.name = 'FileNotFoundError';
    this.code = 'FILE_NOT_FOUND';
  }

  override toMcpError(): McpError {
    return new McpError(ErrorCode.InvalidRequest, this.message);
  }
}

/**
 * Invalid file format errors
 */
export class InvalidFormatError extends MindmapError {
  constructor(message: string, filePath?: string, formatDetails?: Record<string, unknown>) {
    super(
      message,
      'INVALID_FORMAT',
      {
        filePath,
        formatDetails,
      }
    );
    this.name = 'InvalidFormatError';
  }

  override toMcpError(): McpError {
    return new McpError(ErrorCode.InvalidRequest, `Invalid file format: ${this.message}`);
  }
}

/**
 * Node operation errors
 */
export class NodeError extends MindmapError {
  constructor(message: string, nodeId?: string, operation?: string) {
    super(
      message,
      'NODE_ERROR',
      {
        nodeId,
        operation,
      }
    );
    this.name = 'NodeError';
  }

  override toMcpError(): McpError {
    return new McpError(ErrorCode.InternalError, `Node operation failed: ${this.message}`);
  }
}

/**
 * Node not found errors
 */
export class NodeNotFoundError extends NodeError {
  constructor(nodeId: string) {
    super(`Node not found: ${nodeId}`, nodeId, 'find');
    this.name = 'NodeNotFoundError';
    this.code = 'NODE_NOT_FOUND';
  }

  override toMcpError(): McpError {
    return new McpError(ErrorCode.InvalidRequest, this.message);
  }
}

/**
 * Validation errors
 */
export class ValidationError extends MindmapError {
  constructor(message: string, validationDetails?: Record<string, unknown>) {
    super(
      message,
      'VALIDATION_ERROR',
      {
        validationDetails,
      }
    );
    this.name = 'ValidationError';
  }

  override toMcpError(): McpError {
    return new McpError(ErrorCode.InvalidRequest, `Validation failed: ${this.message}`);
  }
}

/**
 * Schema validation errors
 */
export class SchemaValidationError extends ValidationError {
  constructor(errors: Array<{ path: string; message: string }>) {
    const message = `Schema validation failed: ${errors.map(e => `${e.path}: ${e.message}`).join(', ')}`;
    super(message, { errors });
    this.name = 'SchemaValidationError';
    this.code = 'SCHEMA_VALIDATION_ERROR';
  }
}

/**
 * Permission errors
 */
export class PermissionError extends MindmapError {
  constructor(message: string, filePath?: string, operation?: string) {
    super(
      message,
      'PERMISSION_ERROR',
      {
        filePath,
        operation,
      }
    );
    this.name = 'PermissionError';
  }

  override toMcpError(): McpError {
    return new McpError(ErrorCode.InvalidRequest, `Permission denied: ${this.message}`);
  }
}

/**
 * Utility function to convert any error to an McpError
 */
export function toMcpError(error: unknown): McpError {
  if (error instanceof MindmapError) {
    return error.toMcpError();
  }
  
  if (error instanceof McpError) {
    return error;
  }
  
  if (error instanceof Error) {
    return new McpError(ErrorCode.InternalError, error.message);
  }
  
  return new McpError(ErrorCode.InternalError, String(error));
}
/**
 * MCP Tool definitions for mindmap operations
 */

import { z } from 'zod';

// Zod schemas for tool parameters
export const ReadMindmapSchema = z.object({
  filePath: z.string().describe('Path to the mindmap file to read'),
  nodeId: z.string().optional().describe('Optional: specific node ID to read'),
});

export const CreateNodeSchema = z.object({
  filePath: z.string().describe('Path to the mindmap file'),
  parentId: z.string().describe('ID of the parent node (or "root" for top-level)'),
  title: z.string().describe('Title of the new node'),
  description: z.string().optional().describe('Description of the new node'),
  customFields: z.record(z.string(), z.any()).optional().describe('Custom fields for the node'),
  tags: z.array(z.string()).optional().describe('Tags to assign to the node'),
});

export const UpdateNodeSchema = z.object({
  filePath: z.string().describe('Path to the mindmap file'),
  nodeId: z.string().describe('ID of the node to update'),
  title: z.string().optional().describe('New title for the node'),
  description: z.string().optional().describe('New description for the node'),
  customFields: z.record(z.string(), z.any()).optional().describe('Custom fields to update'),
  tags: z.array(z.string()).optional().describe('Tags to assign to the node'),
});

export const DeleteNodeSchema = z.object({
  filePath: z.string().describe('Path to the mindmap file'),
  nodeId: z.string().describe('ID of the node to delete'),
  deleteChildren: z.boolean().default(true).describe('Whether to delete child nodes as well'),
});

export const SearchNodesSchema = z.object({
  filePath: z.string().describe('Path to the mindmap file'),
  query: z.string().describe('Search query (supports text search in title/description)'),
  filters: z.object({
    tags: z.array(z.string()).optional().describe('Filter by tags'),
    customFields: z.record(z.string(), z.any()).optional().describe('Filter by custom fields'),
    depth: z.number().optional().describe('Maximum depth to search'),
  }).optional().describe('Additional search filters'),
  limit: z.number().default(10).describe('Maximum number of results to return'),
});

// Type definitions derived from schemas
export type ReadMindmapToolParams = z.infer<typeof ReadMindmapSchema>;
export type CreateNodeToolParams = z.infer<typeof CreateNodeSchema>;
export type UpdateNodeToolParams = z.infer<typeof UpdateNodeSchema>;
export type DeleteNodeToolParams = z.infer<typeof DeleteNodeSchema>;
export type SearchNodesToolParams = z.infer<typeof SearchNodesSchema>;

// MCP Tool definitions
export const TOOLS = {
  read_mindmap: {
    name: 'read_mindmap',
    description: 'Read a mindmap file and optionally return a specific node or the entire structure',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Path to the mindmap file to read'
        },
        nodeId: {
          type: 'string',
          description: 'Optional: specific node ID to read'
        }
      },
      required: ['filePath']
    }
  },
  
  create_node: {
    name: 'create_node',
    description: 'Create a new node in a mindmap file',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Path to the mindmap file'
        },
        parentId: {
          type: 'string',
          description: 'ID of the parent node (or "root" for top-level)'
        },
        title: {
          type: 'string',
          description: 'Title of the new node'
        },
        description: {
          type: 'string',
          description: 'Description of the new node'
        },
        customFields: {
          type: 'object',
          description: 'Custom fields for the node'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags to assign to the node'
        }
      },
      required: ['filePath', 'parentId', 'title']
    }
  },
  
  update_node: {
    name: 'update_node',
    description: 'Update an existing node in a mindmap file',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Path to the mindmap file'
        },
        nodeId: {
          type: 'string',
          description: 'ID of the node to update'
        },
        title: {
          type: 'string',
          description: 'New title for the node'
        },
        description: {
          type: 'string',
          description: 'New description for the node'
        },
        customFields: {
          type: 'object',
          description: 'Custom fields to update'
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags to assign to the node'
        }
      },
      required: ['filePath', 'nodeId']
    }
  },
  
  delete_node: {
    name: 'delete_node',
    description: 'Delete a node from a mindmap file',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Path to the mindmap file'
        },
        nodeId: {
          type: 'string',
          description: 'ID of the node to delete'
        },
        deleteChildren: {
          type: 'boolean',
          default: true,
          description: 'Whether to delete child nodes as well'
        }
      },
      required: ['filePath', 'nodeId']
    }
  },
  
  search_nodes: {
    name: 'search_nodes',
    description: 'Search for nodes in a mindmap file based on various criteria',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Path to the mindmap file'
        },
        query: {
          type: 'string',
          description: 'Search query (supports text search in title/description)'
        },
        filters: {
          type: 'object',
          properties: {
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by tags'
            },
            customFields: {
              type: 'object',
              description: 'Filter by custom fields'
            },
            depth: {
              type: 'number',
              description: 'Maximum depth to search'
            }
          },
          description: 'Additional search filters'
        },
        limit: {
          type: 'number',
          default: 10,
          description: 'Maximum number of results to return'
        }
      },
      required: ['filePath', 'query']
    }
  }
} as const;
/**
 * Tool Port (Input/Driving Port)
 * 
 * Defines the interface for tool-related use cases
 */

export interface ToolContext {
  userId: string;
  conversationId: string;
  source: {
    id: string;
    kind: string;
    label?: string;
    meta?: Record<string, unknown>;
  };
  traceId?: string;
  meta?: Record<string, unknown>;
}

export interface ToolResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

export interface ToolDefinition {
  name: string;
  shortDescription: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
  examples?: Array<{
    input: Record<string, unknown>;
    output: ToolResult;
    description?: string;
  }>;
}

export interface ToolExecutionRequest {
  toolName: string;
  args: Record<string, unknown>;
  context: ToolContext;
}

export interface IToolPort {
  /**
   * Execute a tool
   */
  executeTool(request: ToolExecutionRequest): Promise<ToolResult>;
  
  /**
   * List all available tools
   */
  listTools(): Promise<ToolDefinition[]>;
  
  /**
   * Get tool by name
   */
  getToolByName(name: string): Promise<ToolDefinition | null>;
  
  /**
   * Get tools with their enable/disable status
   */
  getToolsWithStatus(): Promise<Array<{
    tool: ToolDefinition;
    enabled: boolean;
  }>>;
}


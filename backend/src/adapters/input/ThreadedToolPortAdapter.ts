/**
 * Threaded Tool Port Adapter
 * 
 * Implements IToolPort using ThreadedToolboxService
 */

import type { IToolPort, ToolDefinition, ToolExecutionRequest, ToolResult, ToolContext } from "../../ports/input/IToolPort";
import { executionService } from "../../services/executionService";

export class ThreadedToolPortAdapter implements IToolPort {
  async executeTool(request: ToolExecutionRequest): Promise<ToolResult> {
    const result = await executionService.callService("toolbox", "executeTool", {
      toolName: request.toolName,
      args: request.args,
      context: {
        userId: request.context.userId,
        conversationId: request.context.conversationId,
        source: request.context.source,
        traceId: request.context.traceId,
        meta: request.context.meta
      }
    });

    return {
      ok: result.ok !== false,
      data: result.data,
      error: result.error
    };
  }

  async listTools(): Promise<ToolDefinition[]> {
    const result = await executionService.callService("toolbox", "listTools", {});

    return (result || []).map((tool: any) => ({
      name: tool.name,
      shortDescription: tool.shortDescription,
      description: tool.description,
      parameters: tool.parameters,
      examples: tool.examples
    }));
  }

  async getToolByName(name: string): Promise<ToolDefinition | null> {
    const result = await executionService.callService("toolbox", "getToolByName", {
      name
    });

    if (!result) {
      return null;
    }

    return {
      name: result.name,
      shortDescription: result.shortDescription,
      description: result.description,
      parameters: result.parameters,
      examples: result.examples
    };
  }

  async getToolsWithStatus(): Promise<Array<{ tool: ToolDefinition; enabled: boolean }>> {
    const result = await executionService.callService("toolbox", "getToolsWithStatus", {});

    return (result || []).map((item: any) => ({
      tool: {
        name: item.tool.name,
        shortDescription: item.tool.shortDescription,
        description: item.tool.description,
        parameters: item.tool.parameters,
        examples: item.tool.examples
      },
      enabled: item.enabled !== false
    }));
  }
}


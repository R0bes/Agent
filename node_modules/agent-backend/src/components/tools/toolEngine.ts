import type { ToolContext, ToolResult } from "../types";
import { getToolByName } from "../registry";
import { toolRegistryStore } from "../toolRegistry/toolRegistryStore";
import { logInfo, logDebug, logError, logWarn } from "../../utils/logger";

export interface ToolCall {
  name: string;
  args: any;
}

/**
 * The ToolEngine is the central place where persona delegates tool calls.
 * Uses the component registry to find tools.
 * Later, this can dispatch to local tools, remote MCP servers, or dedicated worker queues.
 */
export class ToolEngine {
  async execute(call: ToolCall, ctx: ToolContext): Promise<ToolResult> {
    logDebug("ToolEngine: Executing tool", {
      toolName: call.name,
      userId: ctx.userId,
      conversationId: ctx.conversationId,
      sourceKind: ctx.source.kind
    });

    const tool = getToolByName(call.name);
    if (!tool) {
      logWarn("ToolEngine: Unknown tool requested", {
        toolName: call.name,
        userId: ctx.userId,
        conversationId: ctx.conversationId
      });
      return {
        ok: false,
        error: `Unknown tool: ${call.name}`
      };
    }

    // Check if tool is enabled (skip check for tool_registry itself)
    if (tool.name !== "tool_registry") {
      try {
        const isEnabled = toolRegistryStore.isToolEnabled(tool.name);
        if (!isEnabled) {
          logWarn("ToolEngine: Tool is disabled", {
            toolName: call.name,
            userId: ctx.userId,
            conversationId: ctx.conversationId
          });
          return {
            ok: false,
            error: `Tool "${call.name}" is disabled`
          };
        }
      } catch (err) {
        // If store is not initialized, allow execution (startup scenario)
        logDebug("ToolEngine: Tool registry store not initialized, allowing execution");
      }
    }

    const startTime = Date.now();
    try {
      // Check if tool is an AbstractTool instance with executeWithLogging
      const result = (tool as any).executeWithLogging
        ? await (tool as any).executeWithLogging(call.args, ctx)
        : await tool.execute(call.args, ctx);
      
      const duration = Date.now() - startTime;
      
      if (result.ok) {
        logInfo("ToolEngine: Tool execution completed", {
          toolName: call.name,
          userId: ctx.userId,
          conversationId: ctx.conversationId,
          duration: `${duration}ms`
        });
      } else {
        logWarn("ToolEngine: Tool execution failed", {
          toolName: call.name,
          userId: ctx.userId,
          conversationId: ctx.conversationId,
          error: result.error,
          duration: `${duration}ms`
        });
      }
      
      return result;
    } catch (err: any) {
      const duration = Date.now() - startTime;
      logError("ToolEngine: Tool execution threw error", err, {
        toolName: call.name,
        userId: ctx.userId,
        conversationId: ctx.conversationId,
        duration: `${duration}ms`
      });
      return {
        ok: false,
        error: err?.message ?? String(err)
      };
    }
  }
}

export const toolEngine = new ToolEngine();


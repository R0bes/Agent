import type { ToolContext, ToolResult } from "../types";
import { getToolByName } from "../registry";
import { toolboxStore } from "../toolbox/toolboxStore";
import { eventBus } from "../../events/eventBus";
import { logInfo, logDebug, logError, logWarn } from "../../utils/logger";

export interface ToolCall {
  name: string;
  args: any;
}

/**
 * The ToolEngine is the central place where persona delegates tool calls.
 * Emits tool_execute events which are handled by Toolbox and executed via Worker Engine.
 */
export class ToolEngine {
  private pendingExecutions = new Map<string, {
    resolve: (result: ToolResult) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();

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

    // Check if tool is enabled (skip check for toolbox itself)
    if (tool.name !== "toolbox") {
      try {
        const isEnabled = toolboxStore.isToolEnabled(tool.name);
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

    // Erstelle Execution ID
    const executionId = `tool-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Emittiere tool_execute Event
    // Toolbox wandelt dies in Worker-Job um
    await eventBus.emit({
      type: "tool_execute",
      payload: {
        id: executionId,
        toolName: call.name,
        args: call.args,
        ctx,
        retry: {
          maxAttempts: 3,
          delay: 1000
        }
      }
    });

    // Warte auf tool_executed Event
    return new Promise<ToolResult>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingExecutions.delete(executionId);
        reject(new Error(`Tool execution timeout: ${call.name}`));
      }, 30000); // 30 Sekunden Timeout

      this.pendingExecutions.set(executionId, {
        resolve,
        reject,
        timeout
      });
    });
  }

  /**
   * Handle tool_executed Event (wird von Tool-Execution-Worker emittiert)
   */
  handleToolExecuted(payload: {
    executionId: string;
    toolName: string;
    result: ToolResult;
    ctx: ToolContext;
  }): void {
    const pending = this.pendingExecutions.get(payload.executionId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingExecutions.delete(payload.executionId);
      pending.resolve(payload.result);
    } else {
      logDebug("ToolEngine: Received tool_executed for unknown execution", {
        executionId: payload.executionId
      });
    }
  }
}

export const toolEngine = new ToolEngine();

// Subscribe to tool_executed events
eventBus.on("tool_executed", (event) => {
  toolEngine.handleToolExecuted(event.payload);
});


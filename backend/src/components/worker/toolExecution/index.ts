/**
 * Tool Execution Worker
 * 
 * Verarbeitet Tool-Execution-Tasks aus der Queue.
 * Führt Tools über Toolbox aus.
 * Retry-Mechanismus.
 * Emittiert tool_executed Event mit Result.
 */

import { AbstractWorker } from "../../base/AbstractWorker";
import type { Component, ToolContext } from "../../types";
import { toolboxService } from "../../toolbox";
import { eventBus } from "../../../events/eventBus";
import { logInfo, logDebug, logError } from "../../../utils/logger";

/**
 * Tool Execution Worker
 * 
 * Verarbeitet Tool-Execution-Jobs:
 * - Führt Tool über Toolbox aus
 * - Retry bei Fehlern
 * - Emittiert tool_executed Event
 */
class ToolExecutionWorker extends AbstractWorker {
  readonly name = "tool-execution";
  readonly description = "Executes tools via Toolbox";
  readonly category = "tool";
  readonly maxRetries = 3;
  readonly priority = "normal" as const;

  /**
   * Verarbeite Tool-Execution-Job
   */
  protected async run(args: any, ctx: ToolContext): Promise<void> {
    const { executionId, toolName, toolArgs, retry } = args;

    logDebug("ToolExecutionWorker: Processing job", {
      executionId,
      toolName,
      userId: ctx.userId,
      conversationId: ctx.conversationId
    });

    try {
      // Führe Tool über Toolbox aus
      const result = await toolboxService.executeTool(toolName, toolArgs, ctx);

      // Emittiere tool_executed Event
      await eventBus.emit({
        type: "tool_executed",
        payload: {
          executionId,
          toolName,
          result,
          ctx
        }
      });

      logInfo("ToolExecutionWorker: Tool execution completed", {
        executionId,
        toolName,
        success: result.ok
      });

      // Wenn Fehler, werfe Exception für Retry
      if (!result.ok) {
        throw new Error(result.error || "Tool execution failed");
      }
    } catch (err) {
      logError("ToolExecutionWorker: Tool execution failed", err, {
        executionId,
        toolName
      });

      // Emittiere tool_executed Event auch bei Fehler
      await eventBus.emit({
        type: "tool_executed",
        payload: {
          executionId,
          toolName,
          result: {
            ok: false,
            error: err instanceof Error ? err.message : String(err)
          },
          ctx
        }
      });

      // Werfe Exception für Retry-Mechanismus
      throw err;
    }
  }
}

// Create worker instance
const toolExecutionWorker = new ToolExecutionWorker();

/**
 * Tool Execution Worker Component
 */
export const toolExecutionWorkerComponent: Component = {
  id: "tool-execution-worker",
  name: "Tool Execution Worker Component",
  description: "Executes tools via Toolbox with retry mechanism",
  worker: toolExecutionWorker
};


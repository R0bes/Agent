/**
 * Task Worker Component
 * 
 * Generic task worker for executing various background tasks.
 */

import { AbstractWorker } from "../../base/AbstractWorker";
import type { Component, ToolContext } from "../../types";
import { logInfo, logDebug } from "../../../utils/logger";

/**
 * Generic Task Worker
 * 
 * This worker executes various background tasks like:
 * - Data processing
 * - File operations
 * - API calls
 * - Computations
 */
class TaskWorker extends AbstractWorker {
  readonly name = "task_worker";
  readonly description = "Generic background worker for executing various tasks.";
  readonly category = "tool";
  readonly maxRetries = 3;
  readonly priority = "normal";

  protected async run(args: any, ctx: ToolContext): Promise<void> {
    logDebug("Task Worker: Starting task", {
      userId: ctx.userId,
      conversationId: ctx.conversationId,
      taskType: args.taskType,
      hasData: !!args.data
    });

    const taskType = args.taskType ?? "generic";
    const data = args.data ?? {};

    // Simulate task processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    logInfo("Task Worker: Task completed", {
      userId: ctx.userId,
      conversationId: ctx.conversationId,
      taskType
    });
  }
}

// Create singleton instance
const taskWorkerInstance = new TaskWorker();

/**
 * Task Worker Component
 */
export const taskWorkerComponent: Component = {
  id: "task-worker",
  name: "Task Worker Component",
  description: "Generic background worker for executing various tasks",
  worker: taskWorkerInstance
};

// Export the worker instance for direct registration
export { taskWorkerInstance };


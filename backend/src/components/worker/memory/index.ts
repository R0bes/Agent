/**
 * Memory Compaction Worker Component
 * 
 * Implements Worker interface using AbstractWorker base class.
 * - Worker: Background worker that compacts and summarises memory
 */

import { AbstractWorker } from "../../base/AbstractWorker";
import type { Component, ToolContext } from "../../types";
import { memoryStore } from "../../memory";
import { logInfo, logDebug } from "../../../utils/logger";

/**
 * Memory Compaction Worker
 * 
 * This worker is responsible for background memory tasks, such as:
 * - aggregating older messages into summaries
 * - extracting stable facts/preferences
 * 
 * For now, it just writes a stub summary entry.
 */
class MemoryCompactionWorker extends AbstractWorker {
  readonly name = "memory_compaction_worker";
  readonly description = "Background worker that compacts and summarises memory.";
  readonly category = "memory";

  protected async run(args: any, ctx: ToolContext): Promise<void> {
    logDebug("Memory Worker: Starting compaction", {
      userId: ctx.userId,
      conversationId: ctx.conversationId,
      hasTitle: !!args.title,
      hasContent: !!args.content
    });

    const targetUserId = args.userId ?? ctx.userId;
    const conversationId = args.conversationId ?? ctx.conversationId;

    const title = args.title ?? "Memory compaction (stub)";
    const content = args.content ?? "This is a stub memory compaction job. Later, this will summarise older conversation parts.";

    await memoryStore.add({
      userId: targetUserId,
      kind: "summary",
      title,
      content,
      tags: ["memory", "compaction"],
      conversationId
    });

    logInfo("Memory Worker: Compaction completed", {
      userId: targetUserId,
      conversationId,
      title
    });
  }
}

// Create singleton instance
const memoryCompactionWorkerInstance = new MemoryCompactionWorker();

/**
 * Memory Compaction Worker Component
 */
export const memoryCompactionWorkerComponent: Component = {
  id: "memory-compaction-worker",
  name: "Memory Compaction Worker Component",
  description: "Background worker that compacts and summarises memory",
  worker: memoryCompactionWorkerInstance
};

// Export the worker instance for direct registration if needed
export { memoryCompactionWorkerInstance };


/**
 * Compaction Trigger Logic
 * Decides when memory compaction should be triggered
 */

import { messageStore } from "../message/store";
import { bullMQWorkerEngine } from "../worker/bullmq-engine";
import { getMemorySettings } from "../../config/settings";
import type { ToolContext } from "../types";
import { logInfo, logDebug, logWarn } from "../../utils/logger";

export interface TriggerResult {
  shouldTrigger: boolean;
  reason?: string;
  priority?: number;
}

/**
 * Compaction Trigger
 * Monitors conversation metrics and triggers compaction when needed
 */
export class CompactionTrigger {
  private lastCompactionTime: Map<string, number> = new Map();

  /**
   * Check if compaction should be triggered for this conversation
   */
  async shouldTrigger(
    conversationId: string,
    ctx: ToolContext
  ): Promise<TriggerResult> {
    const memorySettings = getMemorySettings();

    // Check if compaktification is enabled
    if (!memorySettings.compaktification.enabled) {
      logDebug("Compaction Trigger: Compaktification disabled", {
        conversationId
      });
      return { shouldTrigger: false };
    }

    logDebug("Compaction Trigger: Checking if compaction needed", {
      conversationId,
      userId: ctx.userId,
      strategy: memorySettings.compaktification.strategy
    });

    // Get messages for this conversation
    const messages = await messageStore.list({
      conversationId,
      limit: 1000 // Get all messages to count
    });

    const messageCount = messages.length;

    // 1. Check message count threshold (if strategy is "count" or "hybrid")
    if (
      (memorySettings.compaktification.strategy === "count" ||
        memorySettings.compaktification.strategy === "hybrid") &&
      memorySettings.compaktification.afterMessages
    ) {
      if (messageCount >= memorySettings.compaktification.afterMessages) {
        logInfo("Compaction Trigger: Message threshold exceeded", {
          conversationId,
          messageCount,
          threshold: memorySettings.compaktification.afterMessages
        });

        return {
          shouldTrigger: true,
          reason: `Message count exceeded (${messageCount} >= ${memorySettings.compaktification.afterMessages})`,
          priority: 0 // normal priority
        };
      }
    }

    // 2. Check time-based threshold (if strategy is "time" or "hybrid")
    if (
      (memorySettings.compaktification.strategy === "time" ||
        memorySettings.compaktification.strategy === "hybrid") &&
      memorySettings.compaktification.afterDays
    ) {
      const lastCompaction = this.lastCompactionTime.get(conversationId);
      
      if (lastCompaction) {
        const daysSince = (Date.now() - lastCompaction) / (1000 * 60 * 60 * 24);
        
        if (daysSince >= memorySettings.compaktification.afterDays) {
          logInfo("Compaction Trigger: Time threshold exceeded", {
            conversationId,
            daysSince: Math.round(daysSince * 10) / 10,
            threshold: memorySettings.compaktification.afterDays
          });

          return {
            shouldTrigger: true,
            reason: `Time threshold exceeded (${Math.round(daysSince * 10) / 10} >= ${memorySettings.compaktification.afterDays} days)`,
            priority: -1 // low priority
          };
        }
      } else if (messages.length > 0) {
        // Check if oldest message is older than threshold
        const oldestMessage = messages[messages.length - 1];
        const oldestDate = new Date(oldestMessage.createdAt).getTime();
        const daysSinceOldest = (Date.now() - oldestDate) / (1000 * 60 * 60 * 24);
        
        if (daysSinceOldest >= memorySettings.compaktification.afterDays) {
          logInfo("Compaction Trigger: Time threshold exceeded (oldest message)", {
            conversationId,
            daysSinceOldest: Math.round(daysSinceOldest * 10) / 10,
            threshold: memorySettings.compaktification.afterDays
          });

          return {
            shouldTrigger: true,
            reason: `Time threshold exceeded (oldest message: ${Math.round(daysSinceOldest * 10) / 10} >= ${memorySettings.compaktification.afterDays} days)`,
            priority: -1 // low priority
          };
        }
      }
    }

    // No trigger needed
    logDebug("Compaction Trigger: No compaction needed", {
      conversationId,
      messageCount,
      lastCompactionDaysAgo: this.lastCompactionTime.get(conversationId)
        ? Math.round((Date.now() - this.lastCompactionTime.get(conversationId)!) / (1000 * 60 * 60 * 24) * 10) / 10
        : "never"
    });

    return { shouldTrigger: false };
  }

  /**
   * Trigger compaction job
   */
  async trigger(
    conversationId: string,
    ctx: ToolContext,
    mode: "auto" | "manual" | "topic_change" = "auto"
  ): Promise<string> {
    logInfo("Compaction Trigger: Triggering memory compaction", {
      conversationId,
      userId: ctx.userId,
      mode
    });

    try {
      const job = await bullMQWorkerEngine.enqueue(
        "memory_compaction_worker",
        {
          userId: ctx.userId,
          conversationId,
          mode
        },
        ctx,
        { priority: mode === "manual" ? 1 : 0 }
      );

      // Record the time of this compaction
      this.lastCompactionTime.set(conversationId, Date.now());

      logInfo("Compaction Trigger: Compaction job enqueued", {
        conversationId,
        jobId: job.id,
        mode
      });

      return job.id!;
    } catch (err) {
      logWarn("Compaction Trigger: Failed to enqueue compaction job", {
        conversationId,
        mode,
        error: err instanceof Error ? err.message : String(err)
      });
      throw err;
    }
  }

  /**
   * Manually trigger compaction (used by scheduler tool)
   */
  async manualTrigger(
    conversationId: string,
    ctx: ToolContext
  ): Promise<string> {
    return this.trigger(conversationId, ctx, "manual");
  }
}

// Singleton instance
export const compactionTrigger = new CompactionTrigger();


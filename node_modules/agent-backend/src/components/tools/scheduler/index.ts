/**
 * Scheduler Tool Component
 * 
 * Implements Tool interface using AbstractTool base class.
 * - Tool: Schedules and triggers background workers
 */

import { AbstractTool } from "../../base/AbstractTool";
import type { Component, ToolContext, ToolResult } from "../../types";
import { workerEngine } from "../../worker/engine";

/**
 * Scheduler Tool implementation
 */
class SchedulerToolAdapter extends AbstractTool {
  readonly name = "scheduler";
  readonly shortDescription = "Schedules and triggers background workers (e.g. memory workers) on behalf of the persona.";
  readonly description = "Schedules and triggers background workers (e.g. memory workers) on behalf of the persona. This tool allows the persona to schedule background tasks like memory compaction, which can aggregate older messages into summaries or extract stable facts/preferences. Use this tool when you detect that memory clean-up or summarisation should happen in the background.";
  readonly parameters = {
    type: "object",
    properties: {
      kind: {
        type: "string",
        enum: ["memory_compaction"],
        description: "The kind of work to schedule"
      },
      userId: {
        type: "string",
        description: "Optional user ID override"
      },
      conversationId: {
        type: "string",
        description: "Optional conversation ID override"
      },
      title: {
        type: "string",
        description: "Optional title for the scheduled work"
      },
      content: {
        type: "string",
        description: "Optional content for the scheduled work"
      }
    }
  };
  readonly examples = [
    {
      input: {
        kind: "memory_compaction"
      },
      output: {
        ok: true,
        data: {
          scheduled: true,
          jobId: "wjob-1234567890-abc123",
          workerName: "memory_compaction_worker"
        }
      },
      description: "Schedule a memory compaction job"
    }
  ];

  async execute(args: any, ctx: ToolContext): Promise<ToolResult> {
    const kind = args.kind ?? "memory_compaction";

    if (kind === "memory_compaction") {
      try {
        const job = await workerEngine.enqueue(
          "memory_compaction_worker",
          {
            userId: args.userId ?? ctx.userId,
            conversationId: args.conversationId ?? ctx.conversationId,
            title: args.title,
            content: args.content
          },
          {
            ...ctx,
            source: {
              ...ctx.source,
              kind: ctx.source.kind === "system" ? "scheduler" : ctx.source.kind
            }
          }
        );
        return {
          ok: true,
          data: {
            scheduled: true,
            jobId: job.id,
            workerName: job.workerName
          }
        };
      } catch (err: any) {
        return {
          ok: false,
          error: err?.message ?? String(err)
        };
      }
    }

    return {
      ok: false,
      error: `Unknown schedule kind: ${kind}`
    };
  }
}

// Create singleton instance (auto-registers on construction)
const schedulerToolInstance = new SchedulerToolAdapter();

/**
 * Scheduler Tool Component
 */
export const schedulerToolComponent: Component = {
  id: "scheduler-tool",
  name: "Scheduler Tool Component",
  description: "Schedules and triggers background workers",
  tool: schedulerToolInstance
};


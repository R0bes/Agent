/**
 * SchedulerToolSet
 * 
 * SystemToolSet für Scheduling von Background-Workern.
 * Bietet Tool zum Planen von Background-Tasks.
 */

import { SystemToolSet } from "./systemToolSet";
import type { ToolDescriptor, HealthStatus } from "./toolSet";
import type { ToolContext, ToolResult } from "../types";
import { bullMQWorkerEngine } from "../worker/bullmq-engine";
import { logInfo, logDebug, logError } from "../../utils/logger";

/**
 * SchedulerToolSet - SystemToolSet für Scheduling
 * 
 * Registriert sich automatisch beim Systemstart.
 * Bietet Tool zum Planen von Background-Workern.
 */
export class SchedulerToolSet extends SystemToolSet {
  readonly id = "scheduler";
  readonly name = "Scheduler";

  /**
   * Liste aller Tools in diesem ToolSet
   */
  async listTools(): Promise<ToolDescriptor[]> {
    return [
      {
        name: "schedule_worker",
        description: "Schedules and triggers background workers (e.g. memory workers) on behalf of the persona. This tool allows the persona to schedule background tasks like memory compaction, which can aggregate older messages into summaries or extract stable facts/preferences. Use this tool when you detect that memory clean-up or summarisation should happen in the background.",
        shortDescription: "Schedules and triggers background workers (e.g. memory workers) on behalf of the persona.",
        parameters: {
          type: "object",
          properties: {
            kind: {
              type: "string",
              enum: ["memory_compaction"],
              description: "The kind of work to schedule"
            },
            mode: {
              type: "string",
              enum: ["auto", "manual", "topic_change"],
              description: "Compaction mode: manual (user-requested), auto (system-triggered), topic_change (topic switch detected). Default: manual"
            },
            priority: {
              type: "string",
              enum: ["low", "normal", "high"],
              description: "Job priority level (default: normal)"
            },
            userId: {
              type: "string",
              description: "Optional user ID override"
            },
            conversationId: {
              type: "string",
              description: "Conversation ID for memory compaction (optional, uses current conversation if not provided)"
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
        },
        examples: [
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
            description: "Schedule a memory compaction job with default mode (manual)"
          },
          {
            input: {
              kind: "memory_compaction",
              mode: "manual",
              priority: "high"
            },
            output: {
              ok: true,
              data: {
                scheduled: true,
                jobId: "wjob-1234567890-abc124",
                workerName: "memory_compaction_worker"
              }
            },
            description: "Schedule a high-priority manual memory compaction"
          }
        ]
      }
    ];
  }

  /**
   * Führe ein Tool aus
   */
  async callTool(name: string, args: any, ctx: ToolContext): Promise<ToolResult> {
    if (name === "schedule_worker") {
      return await this.scheduleWorker(args, ctx);
    }

    return {
      ok: false,
      error: `Unknown tool: ${name}`
    };
  }

  /**
   * Schedule Worker Tool
   */
  private async scheduleWorker(args: any, ctx: ToolContext): Promise<ToolResult> {
    const kind = args.kind ?? "memory_compaction";

    if (kind === "memory_compaction") {
      try {
        // Map priority string to number: high=1, normal=0, low=-1
        const priorityMap: Record<string, number> = {
          high: 1,
          normal: 0,
          low: -1
        };
        const priority = priorityMap[args.priority || "normal"] || 0;

        const job = await bullMQWorkerEngine.enqueue(
          "memory_compaction_worker",
          {
            userId: args.userId ?? ctx.userId,
            conversationId: args.conversationId ?? ctx.conversationId,
            mode: args.mode ?? "manual",
            title: args.title,
            content: args.content
          },
          {
            ...ctx,
            source: {
              ...ctx.source,
              kind: ctx.source.kind === "system" ? "scheduler" : ctx.source.kind
            }
          },
          { priority }
        );

        logInfo("SchedulerToolSet: Worker scheduled", {
          jobId: job.id,
          workerName: "memory_compaction_worker",
          userId: ctx.userId,
          conversationId: ctx.conversationId
        });

        return {
          ok: true,
          data: {
            scheduled: true,
            jobId: job.id,
            workerName: "memory_compaction_worker"
          }
        };
      } catch (err: any) {
        logError("SchedulerToolSet: Failed to schedule worker", err, {
          kind,
          userId: ctx.userId
        });
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

  /**
   * Health Check
   */
  async checkHealth(): Promise<HealthStatus> {
    // Scheduler ist immer healthy wenn er läuft
    return {
      status: "healthy",
      lastCheck: new Date().toISOString()
    };
  }
}


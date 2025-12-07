/**
 * WorkerManagerToolSet
 * 
 * SystemToolSet für Worker-Management.
 * Bietet Tools zur Introspektion und Verwaltung von Workern und Jobs.
 */

import { SystemToolSet } from "./systemToolSet";
import type { ToolDescriptor, HealthStatus } from "./toolSet";
import type { ToolContext, ToolResult } from "../types";
import { bullMQWorkerEngine } from "../worker/bullmq-engine";
import { logInfo, logDebug, logError } from "../../utils/logger";

/**
 * WorkerManagerToolSet - SystemToolSet für Worker-Management
 * 
 * Registriert sich automatisch beim Systemstart.
 * Bietet Tools zur Introspektion und Verwaltung von Workern.
 */
export class WorkerManagerToolSet extends SystemToolSet {
  readonly id = "worker_manager";
  readonly name = "Worker Manager";

  /**
   * Liste aller Tools in diesem ToolSet
   */
  async listTools(): Promise<ToolDescriptor[]> {
    return [
      {
        name: "list_workers",
        description: "List all available workers with their descriptions and categories. This tool allows the persona to inspect the current worker environment and provide transparency to users about background work being performed.",
        shortDescription: "List all available workers",
        parameters: {
          type: "object",
          properties: {}
        },
        examples: [
          {
            input: {},
            output: {
              ok: true,
              data: {
                workers: [
                  {
                    name: "memory_compaction_worker",
                    description: "Background worker that compacts and summarises memory.",
                    category: "memory"
                  }
                ]
              }
            },
            description: "List all available workers"
          }
        ]
      },
      {
        name: "list_jobs",
        description: "List all jobs with their status, creation time, and update time. This tool allows the persona to view recent jobs and their status, providing transparency to users about background work being performed.",
        shortDescription: "List all jobs",
        parameters: {
          type: "object",
          properties: {}
        },
        examples: [
          {
            input: {},
            output: {
              ok: true,
              data: {
                jobs: [
                  {
                    id: "wjob-1234567890-abc123",
                    workerName: "memory_compaction_worker",
                    status: "completed",
                    createdAt: "2024-01-15T10:30:00.000Z",
                    updatedAt: "2024-01-15T10:30:05.000Z"
                  }
                ]
              }
            },
            description: "List all jobs"
          }
        ]
      }
    ];
  }

  /**
   * Führe ein Tool aus
   */
  async callTool(name: string, args: any, ctx: ToolContext): Promise<ToolResult> {
    try {
      switch (name) {
        case "list_workers":
          return await this.listWorkers(ctx);

        case "list_jobs":
          return await this.listJobs(ctx);

        default:
          return {
            ok: false,
            error: `Unknown tool: ${name}`
          };
      }
    } catch (err) {
      logError("WorkerManagerToolSet: Tool execution failed", err, {
        toolName: name,
        toolSetId: this.id
      });
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }

  /**
   * List Workers Tool
   */
  private async listWorkers(ctx: ToolContext): Promise<ToolResult> {
    try {
      const workers = bullMQWorkerEngine.listWorkers().map((w) => ({
        name: w.name,
        description: w.description,
        category: w.category
      }));

      logDebug("WorkerManagerToolSet: Workers listed", {
        workerCount: workers.length,
        userId: ctx.userId
      });

      return {
        ok: true,
        data: { workers }
      };
    } catch (err) {
      logError("WorkerManagerToolSet: Failed to list workers", err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }

  /**
   * List Jobs Tool
   */
  private async listJobs(ctx: ToolContext): Promise<ToolResult> {
    try {
      const jobs = await bullMQWorkerEngine.listJobs();

      logDebug("WorkerManagerToolSet: Jobs listed", {
        jobCount: jobs.length,
        userId: ctx.userId
      });

      return {
        ok: true,
        data: { jobs }
      };
    } catch (err) {
      logError("WorkerManagerToolSet: Failed to list jobs", err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err)
      };
    }
  }

  /**
   * Enqueue a scheduled task for execution
   * Called by Scheduler Service to execute scheduled tasks
   */
  async enqueueScheduledTask(
    taskId: string,
    toolName: string,
    toolArgs: any,
    eventTopic: string,
    userId: string,
    conversationId: string
  ): Promise<void> {
    logDebug("WorkerManagerToolSet: Enqueuing scheduled task", {
      taskId,
      toolName,
      eventTopic,
      userId
    });

    try {
      const executionId = `exec-${taskId}-${Date.now()}`;
      
      // Enqueue job for tool-execution worker
      await bullMQWorkerEngine.enqueue(
        "tool-execution",
        {
          executionId,
          toolName,
          toolArgs,
          eventTopic // Pass eventTopic to worker
        },
        {
          userId,
          conversationId,
          source: {
            kind: "scheduler",
            id: taskId
          }
        },
        {
          priority: 0,
          retry: 3
        }
      );

      logInfo("WorkerManagerToolSet: Scheduled task enqueued", {
        taskId,
        toolName,
        executionId
      });
    } catch (err) {
      logError("WorkerManagerToolSet: Failed to enqueue scheduled task", err, {
        taskId,
        toolName
      });
      throw err;
    }
  }

  /**
   * Health Check
   */
  async checkHealth(): Promise<HealthStatus> {
    // Worker Manager ist immer healthy wenn er läuft
    return {
      status: "healthy",
      lastCheck: new Date().toISOString()
    };
  }
}

// Export singleton instance for direct access from Scheduler Service
// Wird lazy initialisiert, um Zirkelabhängigkeiten zu vermeiden
let _workerManagerToolSetInstance: WorkerManagerToolSet | null = null;

export function getWorkerManagerToolSet(): WorkerManagerToolSet {
  if (!_workerManagerToolSetInstance) {
    _workerManagerToolSetInstance = new WorkerManagerToolSet();
  }
  return _workerManagerToolSetInstance;
}

// Export für direkten Zugriff (wird lazy initialisiert)
export const workerManagerToolSet = getWorkerManagerToolSet();


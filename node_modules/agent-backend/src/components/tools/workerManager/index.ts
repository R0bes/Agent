/**
 * Worker Manager Tool Component
 * 
 * Implements Tool interface using AbstractTool base class.
 * - Tool: Introspects and manages worker tools and their jobs
 */

import { AbstractTool } from "../../base/AbstractTool";
import type { Component, ToolContext, ToolResult } from "../../types";
import { workerEngine } from "../../worker/engine";

/**
 * Worker Manager Tool implementation
 */
class WorkerManagerToolAdapter extends AbstractTool {
  readonly name = "worker_manager";
  readonly shortDescription = "Introspects and manages worker tools and their jobs.";
  readonly description = "Introspects and manages worker tools and their jobs. This tool allows the persona to inspect the current worker environment, list available workers, and view recent jobs and their status. Use this tool to provide transparency to users about background work being performed.";
  readonly parameters = {
    type: "object",
    properties: {
      action: {
        type: "string",
        enum: ["list_workers", "list_jobs"],
        description: "The action to perform"
      }
    }
  };
  readonly examples = [
    {
      input: {
        action: "list_workers"
      },
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
    },
    {
      input: {
        action: "list_jobs"
      },
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
  ];

  async execute(args: any, _ctx: ToolContext): Promise<ToolResult> {
    const action = args.action ?? "list_workers";

    if (action === "list_workers") {
      const workers = workerEngine.listWorkers().map((w) => ({
        name: w.name,
        description: w.description,
        category: w.category
      }));
      return { ok: true, data: { workers } };
    }

    if (action === "list_jobs") {
      const jobs = workerEngine.listJobs();
      return { ok: true, data: { jobs } };
    }

    return {
      ok: false,
      error: `Unknown action for worker_manager: ${action}`
    };
  }
}

// Create singleton instance (auto-registers on construction)
const workerManagerToolInstance = new WorkerManagerToolAdapter();

/**
 * Worker Manager Tool Component
 */
export const workerManagerToolComponent: Component = {
  id: "worker-manager-tool",
  name: "Worker Manager Tool Component",
  description: "Introspects and manages worker tools and their jobs",
  tool: workerManagerToolInstance
};


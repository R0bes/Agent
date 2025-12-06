/**
 * Abstract Worker Base Class
 * 
 * Workers are background tasks that can be executed by the worker engine.
 * They take jobs from a queue and process them.
 * 
 * Workers are different from Tools - they are long-running background tasks
 * that are triggered by the scheduler or worker engine, not directly by the persona.
 */

import type { ToolContext } from "../tools/toolTypes";
import { logInfo, logDebug, logError, logWarn } from "../../utils/logger";

export type WorkerStatus = "queued" | "running" | "completed" | "failed";

export interface WorkerJob {
  id: string;
  workerName: string;
  status: WorkerStatus;
  createdAt: string;
  updatedAt: string;
  args: any;
  ctx: ToolContext;
  error?: string;
}

export interface WorkerInterface {
  /** Unique worker name */
  readonly name: string;
  /** Human-readable description */
  readonly description: string;
  /** Worker category (memory, tool, think, etc.) */
  readonly category: string;
  /** Process a job - takes job from queue and processes it */
  processJob(job: WorkerJob): Promise<void>;
}

/**
 * Abstract base class for all workers.
 * 
 * Workers extend this class and implement the `run` method.
 * The `processJob` method handles job lifecycle and calls `run`.
 */
export abstract class AbstractWorker implements WorkerInterface {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly category: string;
  
  /** Max retry attempts - override in subclass if needed */
  readonly maxRetries: number = 3;
  
  /** Priority level - override in subclass if needed */
  readonly priority: "low" | "normal" | "high" = "normal";

  /**
   * Process a job from the queue.
   * This is called by the worker engine when a job is ready to be processed.
   */
  async processJob(job: WorkerJob): Promise<void> {
    logDebug("Worker: Processing job", {
      workerName: this.name,
      jobId: job.id,
      userId: job.ctx.userId,
      conversationId: job.ctx.conversationId
    });

    const startTime = Date.now();
    try {
      await this.run(job.args, job.ctx);
      const duration = Date.now() - startTime;
      
      logInfo("Worker: Job processed successfully", {
        workerName: this.name,
        jobId: job.id,
        duration: `${duration}ms`
      });
    } catch (err) {
      const duration = Date.now() - startTime;
      logError("Worker: Job processing failed", err, {
        workerName: this.name,
        jobId: job.id,
        duration: `${duration}ms`
      });
      throw err;
    }
  }

  /**
   * Run the actual work - must be implemented by subclasses.
   * This is where the worker does its actual work.
   */
  protected abstract run(args: any, ctx: ToolContext): Promise<void>;
}


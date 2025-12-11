/**
 * BullMQ Worker Engine
 * 
 * Redis-backed job queue system using BullMQ.
 * Replaces the in-memory worker engine with persistent job storage.
 */

import { Queue, Worker, Job } from "bullmq";
import { createRedisConnection } from "../../config/redis";
import type { AbstractWorker, WorkerJob, WorkerStatus } from "../../legacy/components/base/AbstractWorker";
import type { ToolContext } from "../../legacy/components/types";
import { eventBus } from "../../events/eventBus";
import { logInfo, logDebug, logError } from "../../utils/logger";

const QUEUE_NAME = "agent-jobs";
const MAX_JOBS = parseInt(process.env.MAX_JOBS || "500");

/**
 * BullMQ-based worker engine with Redis persistence
 */
export class BullMQWorkerEngine {
  private queue: Queue;
  private workers = new Map<string, AbstractWorker>();
  private bullWorkers = new Map<string, Worker>();

  constructor() {
    this.queue = new Queue(QUEUE_NAME, {
      connection: createRedisConnection()
    });

    logInfo("BullMQ Engine: Queue initialized", {
      queueName: QUEUE_NAME,
      maxJobs: MAX_JOBS
    });
  }

  /**
   * Register a worker
   */
  registerWorker(worker: AbstractWorker): void {
    if (this.workers.has(worker.name)) {
      throw new Error(`Worker with name "${worker.name}" already registered.`);
    }

    this.workers.set(worker.name, worker);

    // Create BullMQ worker that processes jobs for this worker
    const bullWorker = new Worker(
      QUEUE_NAME,
      async (job: Job) => {
        // Only process jobs for this specific worker
        if (job.name === worker.name) {
          logDebug("BullMQ Engine: Processing job", {
            jobId: job.id,
            workerName: worker.name,
            attempt: job.attemptsMade + 1
          });

          const workerJob: WorkerJob = {
            id: job.id!,
            workerName: worker.name,
            status: "running",
            createdAt: new Date(job.timestamp).toISOString(),
            updatedAt: new Date().toISOString(),
            args: job.data.args,
            ctx: job.data.ctx
          };

          await worker.processJob(workerJob);
        }
      },
      {
        connection: createRedisConnection(),
        concurrency: 1 // Process one job at a time per worker
      }
    );

    // Handle worker events
    bullWorker.on("completed", async (job) => {
      logInfo("BullMQ Engine: Job completed", {
        jobId: job.id,
        workerName: worker.name
      });
      await this.emitJobUpdate();
    });

    bullWorker.on("failed", async (job, err) => {
      logError("BullMQ Engine: Job failed", err, {
        jobId: job?.id,
        workerName: worker.name,
        attempts: job?.attemptsMade
      });
      await this.emitJobUpdate();
    });

    this.bullWorkers.set(worker.name, bullWorker);

    logInfo("BullMQ Engine: Worker registered", {
      workerName: worker.name,
      category: worker.category,
      totalWorkers: this.workers.size
    });
  }

  /**
   * Get a worker by name
   */
  getWorker(name: string): AbstractWorker | undefined {
    return this.workers.get(name);
  }

  /**
   * List all registered workers
   */
  listWorkers(): AbstractWorker[] {
    return Array.from(this.workers.values());
  }

  /**
   * Enqueue a job for the given worker
   */
  async enqueue(
    workerName: string,
    args: any,
    ctx: ToolContext,
    options?: { priority?: number; retry?: number }
  ): Promise<Job> {
    const worker = this.workers.get(workerName);
    if (!worker) {
      throw new Error(`Unknown worker: ${workerName}`);
    }

    const priority = options?.priority ?? 0; // 0=normal, 1=high, -1=low
    const attempts = options?.retry ?? this.getWorkerRetryConfig(workerName);

    const job = await this.queue.add(
      workerName,
      { args, ctx },
      {
        priority,
        attempts,
        backoff: {
          type: "exponential",
          delay: 1000
        }
      }
    );

    logInfo("BullMQ Engine: Job enqueued", {
      jobId: job.id,
      workerName,
      priority,
      attempts,
      userId: ctx.userId,
      conversationId: ctx.conversationId
    });

    // Emit job_updated event for frontend
    await this.emitJobUpdate();

    return job;
  }

  /**
   * List all jobs
   */
  async listJobs(): Promise<WorkerJob[]> {
    const states = ["active", "waiting", "completed", "failed", "delayed"];
    const jobs = await this.queue.getJobs(states as any);

    const mappedJobs = await Promise.all(
      jobs.map(async (job) => ({
        id: job.id!,
        workerName: job.name!,
        status: await this.mapBullMQStatus(job),
        createdAt: new Date(job.timestamp).toISOString(),
        updatedAt: new Date(job.processedOn || job.timestamp).toISOString(),
        args: job.data.args,
        ctx: job.data.ctx,
        error: job.failedReason
      }))
    );

    return mappedJobs.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  /**
   * Get jobs in waiting state (queue)
   */
  async getQueuedJobs(): Promise<any[]> {
    const jobs = await this.queue.getJobs(["waiting", "delayed"]);
    return jobs.map((job) => ({
      id: job.id!,
      workerName: job.name!,
      status: "queued",
      createdAt: new Date(job.timestamp).toISOString(),
      priority: job.opts.priority || 0,
      args: job.data.args
    }));
  }

  /**
   * Get a job by ID
   */
  async getJob(jobId: string): Promise<WorkerJob | undefined> {
    const job = await this.queue.getJob(jobId);
    if (!job) return undefined;

    return {
      id: job.id!,
      workerName: job.name!,
      status: await this.mapBullMQStatus(job),
      createdAt: new Date(job.timestamp).toISOString(),
      updatedAt: new Date(job.processedOn || job.timestamp).toISOString(),
      args: job.data.args,
      ctx: job.data.ctx,
      error: job.failedReason
    };
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    try {
      const job = await this.queue.getJob(jobId);
      if (job) {
        await job.remove();
        logInfo("BullMQ Engine: Job cancelled", { jobId });
        await this.emitJobUpdate();
        return true;
      }
      return false;
    } catch (err) {
      logError("BullMQ Engine: Failed to cancel job", err, { jobId });
      return false;
    }
  }

  /**
   * Cleanup old jobs to maintain MAX_JOBS limit
   */
  async cleanupOldJobs(): Promise<void> {
    try {
      const completedJobs = await this.queue.getJobs(["completed"]);
      const failedJobs = await this.queue.getJobs(["failed"]);
      const allFinishedJobs = [...completedJobs, ...failedJobs];

      if (allFinishedJobs.length > MAX_JOBS) {
        // Sort by timestamp (oldest first)
        allFinishedJobs.sort((a, b) => a.timestamp - b.timestamp);

        const toRemove = allFinishedJobs.slice(0, allFinishedJobs.length - MAX_JOBS);
        await Promise.all(toRemove.map((job) => job.remove()));

        logInfo("BullMQ Engine: Cleaned up old jobs", {
          removed: toRemove.length,
          remaining: MAX_JOBS
        });
      }
    } catch (err) {
      logError("BullMQ Engine: Failed to cleanup old jobs", err);
    }
  }

  /**
   * Get worker-specific retry configuration
   */
  private getWorkerRetryConfig(workerName: string): number {
    const worker = this.workers.get(workerName);
    return (worker as any).maxRetries || 3; // Default 3
  }

  /**
   * Map BullMQ job state to Worker status
   */
  private async mapBullMQStatus(job: Job): Promise<WorkerStatus> {
    if (await job.isCompleted()) return "completed";
    if (await job.isFailed()) return "failed";
    if (await job.isActive()) return "running";
    if (await job.isWaiting() || await job.isDelayed()) return "queued";
    return "queued";
  }

  /**
   * Emit job_updated event to event bus
   */
  private async emitJobUpdate(): Promise<void> {
    const jobs = await this.listJobs();
    await eventBus.emit({
      type: "job_updated",
      payload: { jobs }
    });
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    await this.queue.close();
    for (const worker of this.bullWorkers.values()) {
      await worker.close();
    }
    logInfo("BullMQ Engine: Closed all connections");
  }
}

// Singleton instance
export const bullMQWorkerEngine = new BullMQWorkerEngine();


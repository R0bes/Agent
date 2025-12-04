/**
 * Worker Engine
 * 
 * Manages worker registration, job queuing, and job processing.
 * Workers can be executed by the engine, which takes jobs from a queue
 * and processes them.
 */

import type { AbstractWorker, WorkerJob, WorkerStatus } from "../base/AbstractWorker";
import type { ToolContext } from "../tools/toolTypes";
import { eventBus } from "../../events/eventBus";
import { logInfo, logDebug, logError } from "../../utils/logger";

/**
 * In-memory worker runtime that manages workers and processes jobs.
 * 
 * Later, this can be replaced with a Redis-based queue or similar.
 */
export class WorkerEngine {
  private workers = new Map<string, AbstractWorker>();
  private jobs: WorkerJob[] = [];

  /**
   * Register a worker
   */
  registerWorker(worker: AbstractWorker): void {
    if (this.workers.has(worker.name)) {
      throw new Error(`Worker with name "${worker.name}" already registered.`);
    }
    this.workers.set(worker.name, worker);
    logInfo("Worker Engine: Worker registered", {
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
   * List all jobs
   */
  listJobs(): WorkerJob[] {
    return [...this.jobs].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  /**
   * Get a job by ID
   */
  getJob(jobId: string): WorkerJob | undefined {
    return this.jobs.find(j => j.id === jobId);
  }

  /**
   * Enqueue a job for the given worker.
   * The job will be processed asynchronously by the worker engine.
   */
  async enqueue(workerName: string, args: any, ctx: ToolContext): Promise<WorkerJob> {
    const worker = this.workers.get(workerName);
    if (!worker) {
      throw new Error(`Unknown worker: ${workerName}`);
    }

    const now = new Date().toISOString();
    const job: WorkerJob = {
      id: `wjob-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      workerName,
      status: "queued",
      createdAt: now,
      updatedAt: now,
      args,
      ctx
    };

    this.jobs.push(job);
    
    logInfo("Worker Engine: Job enqueued", {
      jobId: job.id,
      workerName,
      userId: ctx.userId,
      conversationId: ctx.conversationId,
      totalJobs: this.jobs.length
    });

    // Emit job_updated event for frontend
    await this.emitJobUpdate();

    // Process asynchronously
    void this.processJob(job, worker);

    return job;
  }

  /**
   * Process a job with the given worker
   */
  private async processJob(job: WorkerJob, worker: AbstractWorker): Promise<void> {
    job.status = "running";
    job.updatedAt = new Date().toISOString();
    
    logInfo("Worker Engine: Job started", {
      jobId: job.id,
      workerName: job.workerName
    });

    // Emit job_updated event for frontend
    await this.emitJobUpdate();

    try {
      await worker.processJob(job);
      job.status = "completed";
      job.updatedAt = new Date().toISOString();
      
      logInfo("Worker Engine: Job completed", {
        jobId: job.id,
        workerName: job.workerName
      });
    } catch (err: any) {
      job.status = "failed";
      job.updatedAt = new Date().toISOString();
      job.error = err?.message ?? String(err);
      
      logError("Worker Engine: Job failed", err, {
        jobId: job.id,
        workerName: job.workerName
      });
    }

    // Emit job_updated event for frontend
    await this.emitJobUpdate();
  }

  /**
   * Emit job_updated event to event bus
   */
  private async emitJobUpdate(): Promise<void> {
    const jobs = this.listJobs();
    await eventBus.emit({
      type: "job_updated",
      payload: jobs
    });
  }
}

// Singleton worker engine instance
export const workerEngine = new WorkerEngine();


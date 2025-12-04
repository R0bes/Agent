import { WorkerTool } from "./core";
import { eventBus } from "../../events/eventBus";
import { logInfo, logError } from "../../utils/logger";
/**
 * Base class for all worker tools.
 *
 * Workers are long-running or background tasks that are *triggered*
 * via the worker engine / scheduler, not directly by the user.
 */
export class WorkerToolBase extends WorkerTool {
    async execute(args, ctx) {
        try {
            await this.run(args, ctx);
            return { ok: true };
        }
        catch (err) {
            return {
                ok: false,
                error: err?.message ?? String(err)
            };
        }
    }
}
/**
 * The WorkerManagerTool is itself a Tool.
 *
 * It does not do heavy work, but coordinates workers, e.g.:
 * - checking their availability
 * - starting jobs
 * - querying status
 */
export class WorkerManagerToolBase extends WorkerTool {
}
/**
 * In-memory worker runtime that actually processes jobs.
 *
 * This is NOT a Tool; it is a runtime component used by tools.
 * The runtime:
 * - keeps track of jobs
 * - knows all registered WorkerToolBase instances
 * - processes jobs immediately (with small timeouts to simulate async)
 *
 * Later, you can replace this with a Redis-based queue or similar.
 */
export class InMemoryWorkerRuntime {
    constructor() {
        this.workers = new Map();
        this.jobs = [];
    }
    registerWorker(worker) {
        if (this.workers.has(worker.name)) {
            throw new Error(`Worker with name "${worker.name}" already registered.`);
        }
        this.workers.set(worker.name, worker);
        logInfo("Worker Runtime: Worker registered", {
            workerName: worker.name,
            category: worker.category
        });
    }
    listWorkers() {
        return Array.from(this.workers.values());
    }
    listJobs() {
        return [...this.jobs].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }
    /**
     * Enqueue a job for the given worker.
     * For now, jobs are processed immediately in the same process.
     * Later, this can be pushed to an external queue.
     */
    async enqueue(workerName, args, ctx) {
        const worker = this.workers.get(workerName);
        if (!worker) {
            throw new Error(`Unknown worker: ${workerName}`);
        }
        const now = new Date().toISOString();
        const job = {
            id: `wjob-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            workerName,
            status: "queued",
            createdAt: now,
            updatedAt: now,
            args,
            ctx
        };
        this.jobs.push(job);
        logInfo("Worker Runtime: Job enqueued", {
            jobId: job.id,
            workerName,
            userId: ctx.userId,
            conversationId: ctx.conversationId
        });
        // Emit job_updated event for frontend
        await this.emitJobUpdate();
        // Process asynchronously but without external queue for now
        void this.processJob(job, worker);
        return job;
    }
    async processJob(job, worker) {
        job.status = "running";
        job.updatedAt = new Date().toISOString();
        logInfo("Worker Runtime: Job started", {
            jobId: job.id,
            workerName: job.workerName
        });
        // Emit job_updated event for frontend
        await this.emitJobUpdate();
        try {
            await worker.execute(job.args, job.ctx);
            job.status = "completed";
            job.updatedAt = new Date().toISOString();
            logInfo("Worker Runtime: Job completed", {
                jobId: job.id,
                workerName: job.workerName
            });
        }
        catch (err) {
            job.status = "failed";
            job.updatedAt = new Date().toISOString();
            job.error = err?.message ?? String(err);
            logError("Worker Runtime: Job failed", err, {
                jobId: job.id,
                workerName: job.workerName
            });
        }
        // Emit job_updated event for frontend
        await this.emitJobUpdate();
    }
    async emitJobUpdate() {
        const jobs = this.listJobs();
        await eventBus.emit({
            type: "job_updated",
            payload: jobs
        });
    }
}
// A singleton runtime instance that tools can share.
export const workerRuntime = new InMemoryWorkerRuntime();

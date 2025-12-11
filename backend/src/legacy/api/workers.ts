/**
 * Workers API Routes
 * 
 * Provides endpoints for worker status and queue information.
 */

import type { FastifyInstance } from "fastify";
import { bullMQWorkerEngine } from "../components/worker/bullmq-engine";
import { logInfo, logDebug } from "../utils/logger";

export async function registerWorkersRoutes(app: FastifyInstance) {
  // GET /api/workers - List all workers with status
  app.get("/api/workers", async (req, reply) => {
    logDebug("Workers API: Request received", {
      requestId: req.id
    });

    const workers = bullMQWorkerEngine.listWorkers();
    
    // Get stats for each worker
    const workerStats = await Promise.all(
      workers.map(async (w) => {
        const allJobs = await bullMQWorkerEngine.listJobs();
        const activeJobs = allJobs.filter(
          (j) => j.workerName === w.name && j.status === "running"
        );
        const completedJobs = allJobs.filter(
          (j) => j.workerName === w.name && j.status === "completed"
        );

        return {
          name: w.name,
          description: w.description,
          category: w.category,
          status: activeJobs.length > 0 ? "busy" : "idle",
          activeJobs: activeJobs.length,
          totalProcessed: completedJobs.length,
          priority: (w as any).priority || "normal",
          maxRetries: (w as any).maxRetries || 3
        };
      })
    );

    logInfo("Workers API: Workers retrieved", {
      workerCount: workerStats.length,
      requestId: req.id
    });

    return reply.send({ workers: workerStats });
  });

  // GET /api/jobs/queue - List queued jobs
  app.get("/api/jobs/queue", async (req, reply) => {
    logDebug("Workers API: Queue request received", {
      requestId: req.id
    });

    const queuedJobs = await bullMQWorkerEngine.getQueuedJobs();

    logInfo("Workers API: Queue retrieved", {
      queueCount: queuedJobs.length,
      requestId: req.id
    });

    return reply.send({ jobs: queuedJobs });
  });
}


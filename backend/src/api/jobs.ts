import type { FastifyInstance } from "fastify";
import { listJobs } from "../models/jobStore";
import { workerEngine } from "../components/worker/engine";
import { logInfo, logDebug } from "../utils/logger";

export async function registerJobsRoutes(app: FastifyInstance) {
  app.get("/api/jobs", async (req, reply) => {
    logDebug("Jobs API: Request received", {
      requestId: req.id
    });

    // Get jobs from both systems
    const legacyJobs = listJobs();
    const workerJobs = workerEngine.listJobs();
    
    // Convert worker jobs to legacy format for compatibility
    const convertedWorkerJobs = workerJobs.map((wj) => ({
      id: wj.id,
      type: wj.workerName.includes("memory") ? "memory" as const : "tool" as const,
      label: `${wj.workerName} (${wj.status})`,
      status: wj.status === "completed" ? "done" as const : wj.status === "failed" ? "failed" as const : wj.status === "running" ? "running" as const : "queued" as const,
      createdAt: wj.createdAt,
      updatedAt: wj.updatedAt
    }));

    // Combine and sort by creation time
    const allJobs = [...legacyJobs, ...convertedWorkerJobs].sort(
      (a, b) => a.createdAt.localeCompare(b.createdAt)
    );
    
    logInfo("Jobs API: Jobs retrieved", {
      jobCount: allJobs.length,
      legacyJobCount: legacyJobs.length,
      workerJobCount: workerJobs.length,
      requestId: req.id
    });

    return reply.send({ jobs: allJobs });
  });
}


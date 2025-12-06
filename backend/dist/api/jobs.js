import { bullMQWorkerEngine } from "../components/worker/bullmq-engine";
import { logInfo, logDebug } from "../utils/logger";
export async function registerJobsRoutes(app) {
    app.get("/api/jobs", async (req, reply) => {
        logDebug("Jobs API: Request received", {
            requestId: req.id
        });
        const workerJobs = await bullMQWorkerEngine.listJobs();
        // Convert worker jobs to frontend format
        const jobs = workerJobs.map((wj) => ({
            id: wj.id,
            type: wj.workerName.includes("memory") ? "memory" : "tool",
            label: `${wj.workerName} (${wj.status})`,
            status: wj.status === "completed" ? "done" : wj.status === "failed" ? "failed" : wj.status === "running" ? "running" : "queued",
            createdAt: wj.createdAt,
            updatedAt: wj.updatedAt
        }));
        logInfo("Jobs API: Jobs retrieved", {
            jobCount: jobs.length,
            requestId: req.id
        });
        return reply.send({ jobs });
    });
    // DELETE endpoint for job cancellation
    app.delete("/api/jobs/:id", async (req, reply) => {
        const { id } = req.params;
        logDebug("Jobs API: Cancel job requested", {
            jobId: id,
            requestId: req.id
        });
        const success = await bullMQWorkerEngine.cancelJob(id);
        logInfo("Jobs API: Job cancellation result", {
            jobId: id,
            success,
            requestId: req.id
        });
        return reply.send({ success });
    });
    // Setup cleanup interval for job limits
    const cleanupInterval = parseInt(process.env.JOB_CLEANUP_INTERVAL || "300000"); // 5 minutes default
    setInterval(async () => {
        logDebug("Jobs API: Running cleanup job");
        await bullMQWorkerEngine.cleanupOldJobs();
    }, cleanupInterval);
    logInfo("Jobs API: Cleanup interval configured", {
        intervalMs: cleanupInterval
    });
}

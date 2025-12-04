import { WorkerManagerToolBase, workerRuntime } from "./workerEngine";
/**
 * WorkerManagerTool
 *
 * High-level management interface for workers:
 * - listing available workers
 * - listing jobs
 * - (later) pausing/resuming workers, inspecting failures, etc.
 *
 * It itself is a Tool so the persona can call it like any other tool.
 */
export class WorkerManagerTool extends WorkerManagerToolBase {
    constructor() {
        super(...arguments);
        this.name = "worker_manager";
        this.description = "Introspects and manages worker tools and their jobs.";
        this.managedWorkers = ["memory_compaction_worker"];
    }
    async execute(args, _ctx) {
        const action = args.action ?? "list";
        if (action === "list_workers") {
            const workers = workerRuntime.listWorkers().map((w) => ({
                name: w.name,
                description: w.description,
                category: w.category
            }));
            return { ok: true, data: { workers } };
        }
        if (action === "list_jobs") {
            const jobs = workerRuntime.listJobs();
            return { ok: true, data: { jobs } };
        }
        return {
            ok: false,
            error: `Unknown action for worker_manager: ${action}`
        };
    }
}

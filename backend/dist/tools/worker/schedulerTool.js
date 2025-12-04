import { WorkerTool } from "./core";
import { workerRuntime } from "./workerEngine";
/**
 * SchedulerTool
 *
 * This tool represents an interface for scheduling background work.
 * In the future this could:
 * - create cron-like schedules,
 * - manage next-run timestamps in Postgres/Redis,
 * - emit events for a dedicated scheduler service.
 *
 * For now, it focuses on triggering memory-related workers on demand.
 */
export class SchedulerTool extends WorkerTool {
    constructor() {
        super(...arguments);
        this.name = "scheduler";
        this.description = "Schedules and triggers background workers (e.g. memory workers) on behalf of the persona.";
    }
    async execute(args, ctx) {
        const kind = args.kind ?? "memory_compaction";
        if (kind === "memory_compaction") {
            try {
                const job = await workerRuntime.enqueue("memory_compaction_worker", {
                    userId: args.userId ?? ctx.userId,
                    conversationId: args.conversationId ?? ctx.conversationId,
                    title: args.title,
                    content: args.content
                }, {
                    ...ctx,
                    source: {
                        ...ctx.source,
                        kind: ctx.source.kind === "system" ? "scheduler" : ctx.source.kind
                    }
                });
                return {
                    ok: true,
                    data: {
                        scheduled: true,
                        jobId: job.id,
                        workerName: job.workerName
                    }
                };
            }
            catch (err) {
                return {
                    ok: false,
                    error: err?.message ?? String(err)
                };
            }
        }
        return {
            ok: false,
            error: `Unknown schedule kind: ${kind}`
        };
    }
}

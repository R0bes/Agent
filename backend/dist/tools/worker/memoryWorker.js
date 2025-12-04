import { WorkerToolBase } from "./workerEngine";
import { memoryStore } from "../../memory";
/**
 * MemoryCompactionWorker
 *
 * This worker is responsible for background memory tasks, such as:
 * - aggregating older messages into summaries
 * - extracting stable facts/preferences
 *
 * For now, it just writes a stub summary entry.
 */
export class MemoryCompactionWorker extends WorkerToolBase {
    constructor() {
        super(...arguments);
        this.name = "memory_compaction_worker";
        this.description = "Background worker that compacts and summarises memory.";
        this.category = "memory";
    }
    async run(args, ctx) {
        const targetUserId = args.userId ?? ctx.userId;
        const conversationId = args.conversationId ?? ctx.conversationId;
        const title = args.title ??
            "Memory compaction (stub)";
        const content = args.content ??
            "This is a stub memory compaction job. Later, this will summarise older conversation parts.";
        await memoryStore.add({
            userId: targetUserId,
            kind: "summary",
            title,
            content,
            tags: ["memory", "compaction"],
            conversationId
        });
    }
}

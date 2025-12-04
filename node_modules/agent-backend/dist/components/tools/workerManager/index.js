/**
 * Worker Manager Tool Component
 *
 * Implements Tool interface using AbstractTool base class.
 * - Tool: Introspects and manages worker tools and their jobs
 */
import { AbstractTool } from "../../base/AbstractTool";
import { WorkerManagerTool } from "../../../tools/worker/workerManagerTool";
/**
 * Worker Manager Tool implementation
 */
class WorkerManagerToolAdapter extends AbstractTool {
    constructor() {
        super(...arguments);
        this.workerManagerTool = new WorkerManagerTool();
        this.name = "worker_manager";
        this.shortDescription = "Introspects and manages worker tools and their jobs.";
        this.description = "Introspects and manages worker tools and their jobs. This tool allows the persona to inspect the current worker environment, list available workers, and view recent jobs and their status. Use this tool to provide transparency to users about background work being performed.";
        this.parameters = {
            type: "object",
            properties: {
                action: {
                    type: "string",
                    enum: ["list_workers", "list_jobs"],
                    description: "The action to perform"
                }
            }
        };
        this.examples = [
            {
                input: {
                    action: "list_workers"
                },
                output: {
                    ok: true,
                    data: {
                        workers: [
                            {
                                name: "memory_compaction_worker",
                                description: "Background worker that compacts and summarises memory.",
                                category: "memory"
                            }
                        ]
                    }
                },
                description: "List all available workers"
            },
            {
                input: {
                    action: "list_jobs"
                },
                output: {
                    ok: true,
                    data: {
                        jobs: [
                            {
                                id: "wjob-1234567890-abc123",
                                workerName: "memory_compaction_worker",
                                status: "completed",
                                createdAt: "2024-01-15T10:30:00.000Z",
                                updatedAt: "2024-01-15T10:30:05.000Z"
                            }
                        ]
                    }
                },
                description: "List all jobs"
            }
        ];
    }
    async execute(args, ctx) {
        return await this.workerManagerTool.execute(args, ctx);
    }
}
// Create singleton instance (auto-registers on construction)
const workerManagerToolInstance = new WorkerManagerToolAdapter();
/**
 * Worker Manager Tool Component
 */
export const workerManagerToolComponent = {
    id: "worker-manager-tool",
    name: "Worker Manager Tool Component",
    description: "Introspects and manages worker tools and their jobs",
    tool: workerManagerToolInstance
};

import { listMemoriesForUser } from "../models/memoryStore";
import { logInfo, logDebug } from "../utils/logger";
export async function registerMemoryRoutes(app) {
    app.get("/api/memory/:userId", async (req, reply) => {
        const { userId } = req.params;
        logDebug("Memory API: Request received", {
            userId,
            requestId: req.id
        });
        const memories = await listMemoriesForUser(userId);
        logInfo("Memory API: Memories retrieved", {
            userId,
            memoryCount: memories.length,
            requestId: req.id
        });
        return reply.send({ memories });
    });
}

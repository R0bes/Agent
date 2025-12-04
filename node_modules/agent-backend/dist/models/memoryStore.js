// Compatibility layer for legacy code
// Uses the new MemoryStore abstraction under the hood
import { memoryStore } from "../memory";
/**
 * @deprecated Use memoryStore.add() directly for new code
 * Legacy function for adding memories - now uses MemoryStore abstraction
 */
export async function addMemoryForUser(userId, title, content, kind = "summary") {
    return await memoryStore.add({
        userId,
        kind,
        title,
        content
    });
}
/**
 * @deprecated Use memoryStore.list() directly for new code
 * Legacy function for listing memories - now uses MemoryStore abstraction
 */
export async function listMemoriesForUser(userId) {
    return await memoryStore.list({ userId });
}

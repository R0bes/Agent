// Compatibility layer for legacy code
// Uses the new MemoryStore abstraction under the hood
import { memoryStore } from "../components/memory";
import type { MemoryItem, MemoryKind } from "../components/memory";

// Re-export types for backward compatibility
export type { MemoryItem, MemoryKind };

/**
 * @deprecated Use memoryStore.add() directly for new code
 * Legacy function for adding memories - now uses MemoryStore abstraction
 */
export async function addMemoryForUser(
  userId: string,
  title: string,
  content: string,
  kind: MemoryKind = "summary"
): Promise<MemoryItem> {
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
export async function listMemoriesForUser(userId: string): Promise<MemoryItem[]> {
  return await memoryStore.list({ userId });
}


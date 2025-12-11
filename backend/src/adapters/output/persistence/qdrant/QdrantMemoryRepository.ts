/**
 * Qdrant Memory Repository
 * 
 * Implements IMemoryRepository using Qdrant vector database
 */

import type { IMemoryRepository, Memory, MemoryQuery } from "../../../../ports/output/repositories/IMemoryRepository";
import { qdrantClient } from "../../../../infrastructure/database/qdrant/connection";
import { embeddingProvider } from "../../../../infrastructure/llm/embeddingProvider";
import { logDebug, logError } from "../../../../infrastructure/logging/logger";

export class QdrantMemoryRepository implements IMemoryRepository {
  private readonly collectionName = "memories";

  async save(memory: Omit<Memory, "id" | "createdAt" | "updatedAt">): Promise<Memory> {
    const now = new Date().toISOString();
    const id = `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Generate embedding if not provided
      let embedding = memory.embedding;
      if (!embedding) {
        embedding = await embeddingProvider.embed(memory.content);
      }

      // Save to Qdrant
      await qdrantClient.upsert(this.collectionName, {
        id,
        vector: embedding,
        payload: {
          userId: memory.userId,
          conversationId: memory.conversationId,
          content: memory.content,
          kind: memory.kind,
          metadata: memory.metadata || {},
          createdAt: now,
          updatedAt: now
        }
      });

      return {
        id,
        userId: memory.userId,
        conversationId: memory.conversationId,
        content: memory.content,
        kind: memory.kind,
        embedding,
        metadata: memory.metadata,
        createdAt: now,
        updatedAt: now
      };
    } catch (err) {
      logError("QdrantMemoryRepository: Failed to save memory", err);
      throw err;
    }
  }

  async update(memoryId: string, updates: Partial<Omit<Memory, "id" | "createdAt" | "updatedAt">>): Promise<Memory> {
    try {
      const existing = await this.findById(memoryId);
      if (!existing) {
        throw new Error(`Memory not found: ${memoryId}`);
      }

      const updated: Memory = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      // Regenerate embedding if content changed
      if (updates.content && updates.content !== existing.content) {
        updated.embedding = await embeddingProvider.embed(updates.content);
      }

      // Update in Qdrant
      await qdrantClient.upsert(this.collectionName, {
        id: memoryId,
        vector: updated.embedding || existing.embedding || [],
        payload: {
          userId: updated.userId,
          conversationId: updated.conversationId,
          content: updated.content,
          kind: updated.kind,
          metadata: updated.metadata || {},
          createdAt: updated.createdAt,
          updatedAt: updated.updatedAt
        }
      });

      return updated;
    } catch (err) {
      logError("QdrantMemoryRepository: Failed to update memory", err);
      throw err;
    }
  }

  async findById(memoryId: string): Promise<Memory | null> {
    try {
      const result = await qdrantClient.retrieve(this.collectionName, memoryId);
      if (!result) {
        return null;
      }

      return {
        id: result.id,
        userId: result.payload.userId,
        conversationId: result.payload.conversationId,
        content: result.payload.content,
        kind: result.payload.kind,
        embedding: result.vector,
        metadata: result.payload.metadata,
        createdAt: result.payload.createdAt,
        updatedAt: result.payload.updatedAt
      };
    } catch (err) {
      logError("QdrantMemoryRepository: Failed to find memory by ID", err);
      throw err;
    }
  }

  async search(query: MemoryQuery): Promise<Memory[]> {
    try {
      if (query.query) {
        // Semantic search
        const queryEmbedding = await embeddingProvider.embed(query.query);
        const results = await qdrantClient.search(this.collectionName, {
          vector: queryEmbedding,
          filter: {
            must: [
              { key: "userId", match: { value: query.userId } },
              ...(query.conversationId ? [{ key: "conversationId", match: { value: query.conversationId } }] : []),
              ...(query.kind ? [{ key: "kind", match: { value: query.kind } }] : [])
            ]
          },
          limit: query.limit || 10
        });

        return results.map(result => ({
          id: result.id,
          userId: result.payload.userId,
          conversationId: result.payload.conversationId,
          content: result.payload.content,
          kind: result.payload.kind,
          embedding: result.vector,
          metadata: result.payload.metadata,
          createdAt: result.payload.createdAt,
          updatedAt: result.payload.updatedAt
        }));
      } else {
        // List memories (no semantic search)
        const results = await qdrantClient.scroll(this.collectionName, {
          filter: {
            must: [
              { key: "userId", match: { value: query.userId } },
              ...(query.conversationId ? [{ key: "conversationId", match: { value: query.conversationId } }] : []),
              ...(query.kind ? [{ key: "kind", match: { value: query.kind } }] : [])
            ]
          },
          limit: query.limit || 100
        });

        return results.map(result => ({
          id: result.id,
          userId: result.payload.userId,
          conversationId: result.payload.conversationId,
          content: result.payload.content,
          kind: result.payload.kind,
          embedding: result.vector,
          metadata: result.payload.metadata,
          createdAt: result.payload.createdAt,
          updatedAt: result.payload.updatedAt
        }));
      }
    } catch (err) {
      logError("QdrantMemoryRepository: Failed to search memories", err);
      throw err;
    }
  }

  async delete(memoryId: string): Promise<void> {
    try {
      await qdrantClient.delete(this.collectionName, [memoryId]);
    } catch (err) {
      logError("QdrantMemoryRepository: Failed to delete memory", err);
      throw err;
    }
  }

  async list(query: MemoryQuery): Promise<Memory[]> {
    return this.search(query);
  }
}


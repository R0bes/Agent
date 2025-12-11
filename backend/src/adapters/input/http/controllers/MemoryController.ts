/**
 * Memory Controller
 * 
 * HTTP controller for memory-related endpoints
 */

import type { FastifyRequest, FastifyReply } from "fastify";
import { container } from "../../../../bootstrap/container";
import { SearchMemoriesUseCase } from "../../../../application/useCases/memory/SearchMemoriesUseCase";
import { CreateMemoryUseCase } from "../../../../application/useCases/memory/CreateMemoryUseCase";
import { GetMemoryUseCase } from "../../../../application/useCases/memory/GetMemoryUseCase";
import { ListMemoriesUseCase } from "../../../../application/useCases/memory/ListMemoriesUseCase";
import { UpdateMemoryUseCase } from "../../../../application/useCases/memory/UpdateMemoryUseCase";
import { DeleteMemoryUseCase } from "../../../../application/useCases/memory/DeleteMemoryUseCase";
import { logInfo, logDebug, logError } from "../../../../infrastructure/logging/logger";

interface MemoryIdParams {
  id: string;
}

interface MemoryQueryParams {
  userId?: string;
  kind?: string;
  tags?: string;
  conversationId?: string;
  isCompaktified?: string;
  limit?: string;
  offset?: string;
}

interface MemorySearchBody {
  query: string;
  userId?: string;
  kinds?: string[];
  tags?: string[];
  limit?: number;
}

interface CreateMemoryBody {
  userId: string;
  conversationId: string;
  content: string;
  kind: string;
  metadata?: Record<string, unknown>;
}

interface UpdateMemoryBody {
  content?: string;
  metadata?: Record<string, unknown>;
}

export class MemoryController {
  /**
   * GET /api/memory
   * List memories with filters
   */
  static async listMemories(
    req: FastifyRequest<{ Querystring: MemoryQueryParams }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { userId, kind, conversationId, limit, offset } = req.query;

      if (!userId) {
        reply.status(400).send({ error: "userId is required" });
        return;
      }

      logDebug("Memory Controller: List request", {
        userId,
        kind,
        conversationId,
        limit,
        offset,
        requestId: req.id
      });

      const useCase = container.resolve<ListMemoriesUseCase>("ListMemoriesUseCase");
      const memories = await useCase.execute(userId, conversationId, {
        kind,
        limit: limit ? parseInt(limit) : 100,
        offset: offset ? parseInt(offset) : 0
      });

      logInfo("Memory Controller: Memories listed", {
        count: memories.length,
        requestId: req.id
      });

      reply.send({
        memories: memories.map(mem => ({
          id: mem.id,
          userId: mem.userId,
          conversationId: mem.conversationId,
          content: mem.content,
          kind: mem.kind,
          metadata: mem.metadata,
          createdAt: mem.createdAt,
          updatedAt: mem.updatedAt
        })),
        count: memories.length
      });
    } catch (err) {
      logError("Memory Controller: List failed", err, {
        requestId: req.id
      });
      reply.status(500).send({ error: "Failed to list memories" });
    }
  }

  /**
   * GET /api/memory/:id
   * Get single memory
   */
  static async getMemory(
    req: FastifyRequest<{ Params: MemoryIdParams }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { id } = req.params;

      logDebug("Memory Controller: Get request", {
        id,
        requestId: req.id
      });

      const useCase = container.resolve<GetMemoryUseCase>("GetMemoryUseCase");
      const memory = await useCase.execute(id);

      if (!memory) {
        reply.status(404).send({ error: "Memory not found" });
        return;
      }

      logInfo("Memory Controller: Memory retrieved", {
        id,
        requestId: req.id
      });

      reply.send({
        memory: {
          id: memory.id,
          userId: memory.userId,
          conversationId: memory.conversationId,
          content: memory.content,
          kind: memory.kind,
          metadata: memory.metadata,
          createdAt: memory.createdAt,
          updatedAt: memory.updatedAt
        }
      });
    } catch (err) {
      logError("Memory Controller: Get failed", err, {
        id: req.params.id,
        requestId: req.id
      });
      reply.status(500).send({ error: "Failed to get memory" });
    }
  }

  /**
   * POST /api/memory
   * Create new memory
   */
  static async createMemory(
    req: FastifyRequest<{ Body: CreateMemoryBody }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { userId, conversationId, content, kind, metadata } = req.body;

      logDebug("Memory Controller: Create request", {
        userId,
        kind,
        title: metadata?.title,
        requestId: req.id
      });

      const useCase = container.resolve<CreateMemoryUseCase>("CreateMemoryUseCase");
      const memory = await useCase.execute(userId, conversationId, content, kind, metadata);

      logInfo("Memory Controller: Memory created", {
        id: memory.id,
        kind: memory.kind,
        requestId: req.id
      });

      reply.status(201).send({
        memory: {
          id: memory.id,
          userId: memory.userId,
          conversationId: memory.conversationId,
          content: memory.content,
          kind: memory.kind,
          metadata: memory.metadata,
          createdAt: memory.createdAt,
          updatedAt: memory.updatedAt
        }
      });
    } catch (err) {
      logError("Memory Controller: Create failed", err, {
        requestId: req.id
      });
      reply.status(500).send({ error: "Failed to create memory" });
    }
  }

  /**
   * PUT /api/memory/:id
   * Update memory
   */
  static async updateMemory(
    req: FastifyRequest<{ Params: MemoryIdParams; Body: UpdateMemoryBody }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { content, metadata } = req.body;

      logDebug("Memory Controller: Update request", {
        id,
        requestId: req.id
      });

      const useCase = container.resolve<UpdateMemoryUseCase>("UpdateMemoryUseCase");
      const memory = await useCase.execute(id, content, metadata);

      logInfo("Memory Controller: Memory updated", {
        id,
        requestId: req.id
      });

      reply.send({
        memory: {
          id: memory.id,
          userId: memory.userId,
          conversationId: memory.conversationId,
          content: memory.content,
          kind: memory.kind,
          metadata: memory.metadata,
          createdAt: memory.createdAt,
          updatedAt: memory.updatedAt
        }
      });
    } catch (err) {
      logError("Memory Controller: Update failed", err, {
        id: req.params.id,
        requestId: req.id
      });
      const message = (err as Error).message;
      if (message.includes("not found")) {
        reply.status(404).send({ error: "Memory not found" });
        return;
      }
      reply.status(500).send({ error: "Failed to update memory" });
    }
  }

  /**
   * DELETE /api/memory/:id
   * Delete memory
   */
  static async deleteMemory(
    req: FastifyRequest<{ Params: MemoryIdParams }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { id } = req.params;

      logDebug("Memory Controller: Delete request", {
        id,
        requestId: req.id
      });

      const useCase = container.resolve<DeleteMemoryUseCase>("DeleteMemoryUseCase");
      await useCase.execute(id);

      logInfo("Memory Controller: Memory deleted", {
        id,
        requestId: req.id
      });

      reply.status(204).send();
    } catch (err) {
      logError("Memory Controller: Delete failed", err, {
        id: req.params.id,
        requestId: req.id
      });
      const message = (err as Error).message;
      if (message.includes("not found")) {
        reply.status(404).send({ error: "Memory not found" });
        return;
      }
      reply.status(500).send({ error: "Failed to delete memory" });
    }
  }

  /**
   * POST /api/memory/search
   * Semantic search
   */
  static async searchMemories(
    req: FastifyRequest<{ Body: MemorySearchBody }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { query, userId, kinds, limit } = req.body;

      if (!userId) {
        reply.status(400).send({ error: "userId is required" });
        return;
      }

      logDebug("Memory Controller: Search request", {
        query,
        userId,
        requestId: req.id
      });

      const useCase = container.resolve<SearchMemoriesUseCase>("SearchMemoriesUseCase");
      const memories = await useCase.execute(
        query,
        userId,
        undefined, // conversationId not in search body
        limit || 10
      );

      logInfo("Memory Controller: Search completed", {
        resultCount: memories.length,
        requestId: req.id
      });

      reply.send({
        memories: memories.map(mem => ({
          id: mem.id,
          userId: mem.userId,
          conversationId: mem.conversationId,
          content: mem.content,
          kind: mem.kind,
          metadata: mem.metadata,
          createdAt: mem.createdAt,
          updatedAt: mem.updatedAt
        })),
        count: memories.length
      });
    } catch (err) {
      logError("Memory Controller: Search failed", err, {
        requestId: req.id
      });
      reply.status(500).send({ error: "Failed to search memories" });
    }
  }
}


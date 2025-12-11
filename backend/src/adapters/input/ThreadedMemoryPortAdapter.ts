/**
 * Threaded Memory Port Adapter
 * 
 * Implements IMemoryPort using ThreadedMemoryService
 */

import type { IMemoryPort, Memory, MemorySearchRequest, MemoryCreateRequest, MemoryUpdateRequest } from "../../ports/input/IMemoryPort";
import { executionService } from "../../services/executionService";

export class ThreadedMemoryPortAdapter implements IMemoryPort {
  async searchMemories(request: MemorySearchRequest): Promise<Memory[]> {
    const result = await executionService.callService("memory", "search", {
      query: {
        userId: request.userId,
        conversationId: request.conversationId,
        query: request.query,
        kind: request.kind,
        limit: request.limit
      }
    });

    return (result || []).map((mem: any) => ({
      id: mem.id,
      userId: mem.userId,
      conversationId: mem.conversationId,
      content: mem.content,
      kind: mem.kind,
      metadata: mem.metadata,
      createdAt: mem.createdAt,
      updatedAt: mem.updatedAt
    }));
  }

  async createMemory(request: MemoryCreateRequest): Promise<Memory> {
    const result = await executionService.callService("memory", "add", {
      write: {
        userId: request.userId,
        conversationId: request.conversationId,
        content: request.content,
        kind: request.kind,
        metadata: request.metadata
      }
    });

    return {
      id: result.id,
      userId: result.userId,
      conversationId: result.conversationId,
      content: result.content,
      kind: result.kind,
      metadata: result.metadata,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt
    };
  }

  async updateMemory(request: MemoryUpdateRequest): Promise<Memory> {
    const result = await executionService.callService("memory", "update", {
      id: request.memoryId,
      updates: {
        content: request.content,
        metadata: request.metadata
      }
    });

    return {
      id: result.id,
      userId: result.userId,
      conversationId: result.conversationId,
      content: result.content,
      kind: result.kind,
      metadata: result.metadata,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt
    };
  }

  async getMemoryById(memoryId: string): Promise<Memory | null> {
    const result = await executionService.callService("memory", "getById", {
      id: memoryId
    });

    if (!result) {
      return null;
    }

    return {
      id: result.id,
      userId: result.userId,
      conversationId: result.conversationId,
      content: result.content,
      kind: result.kind,
      metadata: result.metadata,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt
    };
  }

  async listMemories(userId: string, conversationId?: string, options?: {
    limit?: number;
    offset?: number;
    kind?: string;
  }): Promise<Memory[]> {
    const result = await executionService.callService("memory", "list", {
      query: {
        userId,
        conversationId,
        kind: options?.kind,
        limit: options?.limit,
        offset: options?.offset
      }
    });

    return (result || []).map((mem: any) => ({
      id: mem.id,
      userId: mem.userId,
      conversationId: mem.conversationId,
      content: mem.content,
      kind: mem.kind,
      metadata: mem.metadata,
      createdAt: mem.createdAt,
      updatedAt: mem.updatedAt
    }));
  }
}


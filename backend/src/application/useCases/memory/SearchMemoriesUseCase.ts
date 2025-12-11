/**
 * Search Memories Use Case
 * 
 * Searches for memories using semantic search
 */

import type { IMemoryPort } from "../../../ports/input/IMemoryPort";
import { Memory } from "../../../domain/entities/Memory";

export class SearchMemoriesUseCase {
  constructor(
    private readonly memoryPort: IMemoryPort
  ) {}

  async execute(
    query: string,
    userId: string,
    conversationId?: string,
    limit: number = 10
  ): Promise<Memory[]> {
    const memories = await this.memoryPort.searchMemories({
      query,
      userId,
      conversationId,
      limit
    });

    return memories.map(mem => new Memory(
      mem.id,
      mem.userId,
      mem.conversationId,
      mem.content,
      mem.kind,
      mem.createdAt,
      mem.updatedAt,
      mem.embedding,
      mem.metadata
    ));
  }
}


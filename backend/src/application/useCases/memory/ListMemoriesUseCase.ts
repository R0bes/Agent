/**
 * List Memories Use Case
 * 
 * Lists memories for a user/conversation
 */

import type { IMemoryPort } from "../../../ports/input/IMemoryPort";
import { Memory } from "../../../domain/entities/Memory";

export class ListMemoriesUseCase {
  constructor(
    private readonly memoryPort: IMemoryPort
  ) {}

  async execute(
    userId: string,
    conversationId?: string,
    options?: {
      limit?: number;
      offset?: number;
      kind?: string;
    }
  ): Promise<Memory[]> {
    const memories = await this.memoryPort.listMemories(userId, conversationId, options);

    return memories.map(mem => new Memory(
      mem.id,
      mem.userId,
      mem.conversationId,
      mem.content,
      mem.kind,
      mem.createdAt,
      mem.updatedAt,
      undefined, // embedding not in port interface
      mem.metadata
    ));
  }
}


/**
 * Create Memory Use Case
 * 
 * Creates a new memory
 */

import type { IMemoryPort } from "../../../ports/input/IMemoryPort";
import { Memory } from "../../../domain/entities/Memory";

export class CreateMemoryUseCase {
  constructor(
    private readonly memoryPort: IMemoryPort
  ) {}

  async execute(
    userId: string,
    conversationId: string,
    content: string,
    kind: string,
    metadata?: Record<string, unknown>
  ): Promise<Memory> {
    const memory = await this.memoryPort.createMemory({
      userId,
      conversationId,
      content,
      kind,
      metadata
    });

    return new Memory(
      memory.id,
      memory.userId,
      memory.conversationId,
      memory.content,
      memory.kind,
      memory.createdAt,
      memory.updatedAt,
      memory.embedding,
      memory.metadata
    );
  }
}


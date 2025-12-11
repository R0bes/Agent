/**
 * Update Memory Use Case
 * 
 * Updates an existing memory
 */

import type { IMemoryPort } from "../../../ports/input/IMemoryPort";
import { Memory } from "../../../domain/entities/Memory";

export class UpdateMemoryUseCase {
  constructor(
    private readonly memoryPort: IMemoryPort
  ) {}

  async execute(
    memoryId: string,
    content?: string,
    metadata?: Record<string, unknown>
  ): Promise<Memory> {
    const memory = await this.memoryPort.updateMemory({
      memoryId,
      content,
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
      undefined, // embedding not in port interface
      memory.metadata
    );
  }
}


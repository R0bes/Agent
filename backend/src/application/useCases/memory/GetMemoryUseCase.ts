/**
 * Get Memory Use Case
 * 
 * Gets a memory by ID
 */

import type { IMemoryPort } from "../../../ports/input/IMemoryPort";
import { Memory } from "../../../domain/entities/Memory";

export class GetMemoryUseCase {
  constructor(
    private readonly memoryPort: IMemoryPort
  ) {}

  async execute(memoryId: string): Promise<Memory | null> {
    const memory = await this.memoryPort.getMemoryById(memoryId);
    
    if (!memory) {
      return null;
    }

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


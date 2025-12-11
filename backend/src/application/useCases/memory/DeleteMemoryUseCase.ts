/**
 * Delete Memory Use Case
 * 
 * Deletes a memory by ID
 */

import type { IMemoryPort } from "../../../ports/input/IMemoryPort";
import type { IMemoryRepository } from "../../../ports/output/repositories/IMemoryRepository";

export class DeleteMemoryUseCase {
  constructor(
    private readonly memoryRepository: IMemoryRepository
  ) {}

  async execute(memoryId: string): Promise<void> {
    await this.memoryRepository.delete(memoryId);
  }
}


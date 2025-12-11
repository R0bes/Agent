/**
 * Get Task Use Case
 * 
 * Gets a scheduled task by ID
 */

import type { ISchedulerPort } from "../../../ports/input/ISchedulerPort";
import { ScheduledTask } from "../../../domain/entities/ScheduledTask";

export class GetTaskUseCase {
  constructor(
    private readonly schedulerPort: ISchedulerPort
  ) {}

  async execute(taskId: string): Promise<ScheduledTask | null> {
    const task = await this.schedulerPort.getTaskById(taskId);
    
    if (!task) {
      return null;
    }

    return new ScheduledTask(
      task.id,
      task.type,
      task.schedule,
      task.payload,
      task.userId,
      task.conversationId,
      task.enabled,
      task.createdAt,
      task.updatedAt,
      task.lastRun,
      task.nextRun
    );
  }
}


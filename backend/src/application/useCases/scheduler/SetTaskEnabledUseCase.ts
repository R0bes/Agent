/**
 * Set Task Enabled Use Case
 * 
 * Enables or disables a scheduled task
 */

import type { ISchedulerPort } from "../../../ports/input/ISchedulerPort";
import { ScheduledTask } from "../../../domain/entities/ScheduledTask";

export class SetTaskEnabledUseCase {
  constructor(
    private readonly schedulerPort: ISchedulerPort
  ) {}

  async execute(taskId: string, enabled: boolean): Promise<ScheduledTask> {
    const task = await this.schedulerPort.setTaskEnabled(taskId, enabled);

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


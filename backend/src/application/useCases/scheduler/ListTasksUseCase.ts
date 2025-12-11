/**
 * List Tasks Use Case
 * 
 * Lists scheduled tasks for a user
 */

import type { ISchedulerPort } from "../../../ports/input/ISchedulerPort";
import { ScheduledTask } from "../../../domain/entities/ScheduledTask";

export class ListTasksUseCase {
  constructor(
    private readonly schedulerPort: ISchedulerPort
  ) {}

  async execute(
    userId: string,
    options?: {
      enabled?: boolean;
      type?: "tool_call" | "event";
    }
  ): Promise<ScheduledTask[]> {
    const tasks = await this.schedulerPort.listTasks(userId, options);

    return tasks.map(task => new ScheduledTask(
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
    ));
  }
}


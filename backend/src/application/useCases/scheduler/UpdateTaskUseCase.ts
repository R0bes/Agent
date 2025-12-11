/**
 * Update Task Use Case
 * 
 * Updates a scheduled task
 */

import type { ISchedulerPort } from "../../../ports/input/ISchedulerPort";
import { ScheduledTask } from "../../../domain/entities/ScheduledTask";

export class UpdateTaskUseCase {
  constructor(
    private readonly schedulerPort: ISchedulerPort
  ) {}

  async execute(
    taskId: string,
    updates: Partial<{
      type: "tool_call" | "event";
      schedule: string;
      payload: {
        eventTopic: string;
        toolName?: string;
        args?: any;
        eventPayload?: any;
      };
      enabled: boolean;
    }>
  ): Promise<ScheduledTask> {
    const task = await this.schedulerPort.updateTask(taskId, updates);

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


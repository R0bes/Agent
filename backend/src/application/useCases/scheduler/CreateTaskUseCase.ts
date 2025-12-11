/**
 * Create Task Use Case
 * 
 * Creates a new scheduled task
 */

import type { ISchedulerPort } from "../../../ports/input/ISchedulerPort";
import { ScheduledTask } from "../../../domain/entities/ScheduledTask";

export class CreateTaskUseCase {
  constructor(
    private readonly schedulerPort: ISchedulerPort
  ) {}

  async execute(
    type: "tool_call" | "event",
    schedule: string,
    payload: {
      eventTopic: string;
      toolName?: string;
      args?: any;
      eventPayload?: any;
    },
    userId: string,
    conversationId: string,
    enabled: boolean = true
  ): Promise<ScheduledTask> {
    const task = await this.schedulerPort.createTask({
      type,
      schedule,
      payload,
      userId,
      conversationId,
      enabled
    });

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


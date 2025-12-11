/**
 * Execute Task Use Case
 * 
 * Executes a scheduled task
 */

import type { ISchedulerPort } from "../../../ports/input/ISchedulerPort";
import type { IEventPublisher } from "../../../ports/output/publishers/IEventPublisher";
import { ScheduledTask } from "../../../domain/entities/ScheduledTask";

export class ExecuteTaskUseCase {
  constructor(
    private readonly schedulerPort: ISchedulerPort,
    private readonly eventPublisher: IEventPublisher
  ) {}

  async execute(taskId: string): Promise<void> {
    const task = await this.schedulerPort.getTaskById(taskId);
    
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (!task.enabled) {
      return; // Skip disabled tasks
    }

    // Publish event based on task type
    if (task.type === "tool_call") {
      await this.eventPublisher.publish({
        type: "tool_execute",
        payload: {
          toolName: task.payload.toolName,
          args: task.payload.args,
          userId: task.userId,
          conversationId: task.conversationId
        }
      });
    } else if (task.type === "event") {
      await this.eventPublisher.publish({
        type: task.payload.eventTopic,
        payload: task.payload.eventPayload || {}
      });
    }

    // Update task with last run time
    // Note: nextRun calculation should be done by scheduler service
    await this.schedulerPort.updateTask(taskId, {
      lastRun: new Date().toISOString()
    });
  }
}


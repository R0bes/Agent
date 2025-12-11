/**
 * Scheduled Task Entity
 * 
 * Domain entity representing a scheduled task
 */

export type ScheduledTaskType = "tool_call" | "event";

export class ScheduledTask {
  constructor(
    public readonly id: string,
    public readonly type: ScheduledTaskType,
    public readonly schedule: string, // Cron expression
    public readonly payload: {
      eventTopic: string;
      toolName?: string;
      args?: any;
      eventPayload?: any;
    },
    public readonly userId: string,
    public readonly conversationId: string,
    public readonly enabled: boolean,
    public readonly createdAt: string,
    public readonly updatedAt: string,
    public readonly lastRun?: string,
    public readonly nextRun?: string
  ) {}

  /**
   * Create a new scheduled task
   */
  static create(
    type: ScheduledTaskType,
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
  ): ScheduledTask {
    const now = new Date().toISOString();
    return new ScheduledTask(
      `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      schedule,
      payload,
      userId,
      conversationId,
      enabled,
      now,
      now
    );
  }

  /**
   * Enable the task
   */
  enable(): ScheduledTask {
    return new ScheduledTask(
      this.id,
      this.type,
      this.schedule,
      this.payload,
      this.userId,
      this.conversationId,
      true,
      this.createdAt,
      new Date().toISOString(),
      this.lastRun,
      this.nextRun
    );
  }

  /**
   * Disable the task
   */
  disable(): ScheduledTask {
    return new ScheduledTask(
      this.id,
      this.type,
      this.schedule,
      this.payload,
      this.userId,
      this.conversationId,
      false,
      this.createdAt,
      new Date().toISOString(),
      this.lastRun,
      this.nextRun
    );
  }

  /**
   * Update task schedule
   */
  updateSchedule(newSchedule: string): ScheduledTask {
    return new ScheduledTask(
      this.id,
      this.type,
      newSchedule,
      this.payload,
      this.userId,
      this.conversationId,
      this.enabled,
      this.createdAt,
      new Date().toISOString(),
      this.lastRun,
      this.nextRun
    );
  }

  /**
   * Mark task as run
   */
  markRun(nextRun?: string): ScheduledTask {
    return new ScheduledTask(
      this.id,
      this.type,
      this.schedule,
      this.payload,
      this.userId,
      this.conversationId,
      this.enabled,
      this.createdAt,
      new Date().toISOString(),
      new Date().toISOString(),
      nextRun
    );
  }
}


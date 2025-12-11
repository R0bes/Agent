/**
 * Threaded Scheduler Port Adapter
 * 
 * Implements ISchedulerPort using ThreadedSchedulerService
 */

import type { ISchedulerPort, ScheduledTask, CreateTaskRequest } from "../../ports/input/ISchedulerPort";
import { executionService } from "../../services/executionService";

export class ThreadedSchedulerPortAdapter implements ISchedulerPort {
  async createTask(request: CreateTaskRequest): Promise<ScheduledTask> {
    const result = await executionService.callService("scheduler", "createTask", {
      type: request.type,
      schedule: request.schedule,
      payload: request.payload,
      userId: request.userId,
      conversationId: request.conversationId,
      enabled: request.enabled !== false
    });

    return {
      id: result.id,
      type: result.type,
      schedule: result.schedule,
      payload: result.payload,
      userId: result.userId,
      conversationId: result.conversationId,
      enabled: result.enabled,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      lastRun: result.lastRun,
      nextRun: result.nextRun
    };
  }

  async getTaskById(taskId: string): Promise<ScheduledTask | null> {
    const result = await executionService.callService("scheduler", "getTaskById", {
      taskId
    });

    if (!result) {
      return null;
    }

    return {
      id: result.id,
      type: result.type,
      schedule: result.schedule,
      payload: result.payload,
      userId: result.userId,
      conversationId: result.conversationId,
      enabled: result.enabled,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      lastRun: result.lastRun,
      nextRun: result.nextRun
    };
  }

  async listTasks(userId: string, options?: {
    enabled?: boolean;
    type?: "tool_call" | "event";
  }): Promise<ScheduledTask[]> {
    const result = await executionService.callService("scheduler", "listTasks", {
      userId,
      enabled: options?.enabled,
      type: options?.type
    });

    return (result || []).map((task: any) => ({
      id: task.id,
      type: task.type,
      schedule: task.schedule,
      payload: task.payload,
      userId: task.userId,
      conversationId: task.conversationId,
      enabled: task.enabled,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      lastRun: task.lastRun,
      nextRun: task.nextRun
    }));
  }

  async updateTask(taskId: string, updates: Partial<Omit<ScheduledTask, "id" | "createdAt" | "updatedAt">>): Promise<ScheduledTask> {
    const result = await executionService.callService("scheduler", "updateTask", {
      taskId,
      updates
    });

    return {
      id: result.id,
      type: result.type,
      schedule: result.schedule,
      payload: result.payload,
      userId: result.userId,
      conversationId: result.conversationId,
      enabled: result.enabled,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      lastRun: result.lastRun,
      nextRun: result.nextRun
    };
  }

  async deleteTask(taskId: string): Promise<void> {
    await executionService.callService("scheduler", "deleteTask", {
      taskId
    });
  }

  async setTaskEnabled(taskId: string, enabled: boolean): Promise<ScheduledTask> {
    return this.updateTask(taskId, { enabled });
  }
}


/**
 * Redis Task Repository
 * 
 * Implements ITaskRepository using Redis (for scheduled tasks)
 */

import type { ITaskRepository, ScheduledTask } from "../../../../ports/output/repositories/ITaskRepository";
import { getRedisClient } from "../../../../infrastructure/database/redis/connection";
import { logError } from "../../../../infrastructure/logging/logger";

export class RedisTaskRepository implements ITaskRepository {
  private readonly keyPrefix = "scheduled_task:";

  async save(task: Omit<ScheduledTask, "id" | "createdAt" | "updatedAt">): Promise<ScheduledTask> {
    const client = getRedisClient();
    const now = new Date().toISOString();
    const id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      const taskData: ScheduledTask = {
        id,
        ...task,
        createdAt: now,
        updatedAt: now
      };

      await client.set(
        `${this.keyPrefix}${id}`,
        JSON.stringify(taskData)
      );

      // Add to user index
      await client.sadd(`user_tasks:${task.userId}`, id);

      return taskData;
    } catch (err) {
      logError("RedisTaskRepository: Failed to save task", err);
      throw err;
    }
  }

  async findById(taskId: string): Promise<ScheduledTask | null> {
    const client = getRedisClient();
    try {
      const data = await client.get(`${this.keyPrefix}${taskId}`);
      if (!data) {
        return null;
      }
      return JSON.parse(data);
    } catch (err) {
      logError("RedisTaskRepository: Failed to find task", err);
      throw err;
    }
  }

  async findByUser(userId: string, options?: { enabled?: boolean; type?: "tool_call" | "event" }): Promise<ScheduledTask[]> {
    const client = getRedisClient();
    try {
      const taskIds = await client.smembers(`user_tasks:${userId}`);
      const tasks: ScheduledTask[] = [];

      for (const taskId of taskIds) {
        const task = await this.findById(taskId);
        if (task) {
          if (options?.enabled !== undefined && task.enabled !== options.enabled) {
            continue;
          }
          if (options?.type && task.type !== options.type) {
            continue;
          }
          tasks.push(task);
        }
      }

      return tasks.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    } catch (err) {
      logError("RedisTaskRepository: Failed to find tasks by user", err);
      throw err;
    }
  }

  async findDueTasks(): Promise<ScheduledTask[]> {
    const client = getRedisClient();
    try {
      const keys = await client.keys(`${this.keyPrefix}*`);
      const tasks: ScheduledTask[] = [];
      const now = new Date();

      for (const key of keys) {
        const data = await client.get(key);
        if (data) {
          const task: ScheduledTask = JSON.parse(data);
          if (task.enabled && task.nextRun) {
            const nextRun = new Date(task.nextRun);
            if (nextRun <= now) {
              tasks.push(task);
            }
          }
        }
      }

      return tasks.sort((a, b) => {
        const aNext = a.nextRun ? new Date(a.nextRun).getTime() : 0;
        const bNext = b.nextRun ? new Date(b.nextRun).getTime() : 0;
        return aNext - bNext;
      });
    } catch (err) {
      logError("RedisTaskRepository: Failed to find due tasks", err);
      throw err;
    }
  }

  async update(taskId: string, updates: Partial<Omit<ScheduledTask, "id" | "createdAt" | "updatedAt">>): Promise<ScheduledTask> {
    const existing = await this.findById(taskId);
    if (!existing) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const client = getRedisClient();
    const updated: ScheduledTask = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    try {
      await client.set(
        `${this.keyPrefix}${taskId}`,
        JSON.stringify(updated)
      );
      return updated;
    } catch (err) {
      logError("RedisTaskRepository: Failed to update task", err);
      throw err;
    }
  }

  async delete(taskId: string): Promise<void> {
    const client = getRedisClient();
    try {
      const task = await this.findById(taskId);
      if (task) {
        await client.del(`${this.keyPrefix}${taskId}`);
        await client.srem(`user_tasks:${task.userId}`, taskId);
      }
    } catch (err) {
      logError("RedisTaskRepository: Failed to delete task", err);
      throw err;
    }
  }
}


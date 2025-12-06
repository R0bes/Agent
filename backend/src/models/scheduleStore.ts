/**
 * Schedule Store
 * 
 * Manages scheduled tasks (tool calls, memos, events) with cron expressions
 */

import { logInfo, logDebug, logWarn, logError } from "../utils/logger";

export type ScheduledTaskType = "tool_call" | "event";

export interface ScheduledTask {
  id: string;
  type: ScheduledTaskType;
  schedule: string; // Cron expression
  payload: {
    eventTopic: string; // Required: where to send results
    toolName?: string;
    args?: any;
    eventPayload?: any;
  };
  userId: string;
  conversationId: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastRun?: string;
  nextRun?: string;
}

class ScheduleStore {
  private tasks: Map<string, ScheduledTask> = new Map();
  private initialized = false;

  /**
   * Initialize the store
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    logInfo("Schedule Store: Initializing");
    this.initialized = true;
    logInfo("Schedule Store: Initialized", {
      taskCount: this.tasks.size
    });
  }

  /**
   * Add a new scheduled task
   */
  async add(task: Omit<ScheduledTask, "id" | "createdAt" | "updatedAt">): Promise<ScheduledTask> {
    const now = new Date().toISOString();
    const id = `sched-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const newTask: ScheduledTask = {
      ...task,
      id,
      createdAt: now,
      updatedAt: now
    };

    this.tasks.set(id, newTask);

    logInfo("Schedule Store: Task added", {
      taskId: id,
      type: task.type,
      schedule: task.schedule,
      enabled: task.enabled
    });

    return newTask;
  }

  /**
   * Update an existing scheduled task
   */
  async update(id: string, updates: Partial<Omit<ScheduledTask, "id" | "createdAt">>): Promise<ScheduledTask | null> {
    const task = this.tasks.get(id);
    if (!task) {
      logWarn("Schedule Store: Task not found for update", { taskId: id });
      return null;
    }

    const updatedTask: ScheduledTask = {
      ...task,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.tasks.set(id, updatedTask);

    logInfo("Schedule Store: Task updated", {
      taskId: id,
      updates: Object.keys(updates)
    });

    return updatedTask;
  }

  /**
   * Delete a scheduled task
   */
  async delete(id: string): Promise<boolean> {
    const existed = this.tasks.delete(id);
    
    if (existed) {
      logInfo("Schedule Store: Task deleted", { taskId: id });
    } else {
      logWarn("Schedule Store: Task not found for deletion", { taskId: id });
    }

    return existed;
  }

  /**
   * Get a task by ID
   */
  get(id: string): ScheduledTask | undefined {
    return this.tasks.get(id);
  }

  /**
   * List all scheduled tasks
   */
  list(filters?: { userId?: string; enabled?: boolean; type?: ScheduledTaskType }): ScheduledTask[] {
    let tasks = Array.from(this.tasks.values());

    if (filters?.userId) {
      tasks = tasks.filter(t => t.userId === filters.userId);
    }

    if (filters?.enabled !== undefined) {
      tasks = tasks.filter(t => t.enabled === filters.enabled);
    }

    if (filters?.type) {
      tasks = tasks.filter(t => t.type === filters.type);
    }

    // Sort by createdAt descending
    return tasks.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /**
   * Enable a scheduled task
   */
  async enable(id: string): Promise<ScheduledTask | null> {
    return this.update(id, { enabled: true });
  }

  /**
   * Disable a scheduled task
   */
  async disable(id: string): Promise<ScheduledTask | null> {
    return this.update(id, { enabled: false });
  }

  /**
   * Update last run time
   */
  async updateLastRun(id: string, lastRun: string): Promise<ScheduledTask | null> {
    return this.update(id, { lastRun });
  }

  /**
   * Update next run time
   */
  async updateNextRun(id: string, nextRun: string): Promise<ScheduledTask | null> {
    return this.update(id, { nextRun });
  }

  /**
   * Get count of tasks
   */
  count(filters?: { enabled?: boolean; type?: ScheduledTaskType }): number {
    return this.list(filters).length;
  }
}

// Singleton instance
export const scheduleStore = new ScheduleStore();


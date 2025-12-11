/**
 * Task Repository (Output/Driven Port)
 * 
 * Defines the interface for scheduled task persistence
 */

export interface ScheduledTask {
  id: string;
  type: "tool_call" | "event";
  schedule: string; // Cron expression
  payload: {
    eventTopic: string;
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

export interface ITaskRepository {
  /**
   * Save a scheduled task
   */
  save(task: Omit<ScheduledTask, "id" | "createdAt" | "updatedAt">): Promise<ScheduledTask>;
  
  /**
   * Get task by ID
   */
  findById(taskId: string): Promise<ScheduledTask | null>;
  
  /**
   * List tasks for a user
   */
  findByUser(userId: string, options?: {
    enabled?: boolean;
    type?: "tool_call" | "event";
  }): Promise<ScheduledTask[]>;
  
  /**
   * Find tasks that need to run (nextRun <= now)
   */
  findDueTasks(): Promise<ScheduledTask[]>;
  
  /**
   * Update a task
   */
  update(taskId: string, updates: Partial<Omit<ScheduledTask, "id" | "createdAt" | "updatedAt">>): Promise<ScheduledTask>;
  
  /**
   * Delete a task
   */
  delete(taskId: string): Promise<void>;
}


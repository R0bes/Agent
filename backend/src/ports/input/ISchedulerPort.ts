/**
 * Scheduler Port (Input/Driving Port)
 * 
 * Defines the interface for scheduler-related use cases
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

export interface CreateTaskRequest {
  type: "tool_call" | "event";
  schedule: string;
  payload: {
    eventTopic: string;
    toolName?: string;
    args?: any;
    eventPayload?: any;
  };
  userId: string;
  conversationId: string;
  enabled?: boolean;
}

export interface ISchedulerPort {
  /**
   * Create a new scheduled task
   */
  createTask(request: CreateTaskRequest): Promise<ScheduledTask>;
  
  /**
   * Get task by ID
   */
  getTaskById(taskId: string): Promise<ScheduledTask | null>;
  
  /**
   * List all tasks for a user
   */
  listTasks(userId: string, options?: {
    enabled?: boolean;
    type?: "tool_call" | "event";
  }): Promise<ScheduledTask[]>;
  
  /**
   * Update a task
   */
  updateTask(taskId: string, updates: Partial<Omit<ScheduledTask, "id" | "createdAt">>): Promise<ScheduledTask>;
  
  /**
   * Delete a task
   */
  deleteTask(taskId: string): Promise<void>;
  
  /**
   * Enable/disable a task
   */
  setTaskEnabled(taskId: string, enabled: boolean): Promise<ScheduledTask>;
}


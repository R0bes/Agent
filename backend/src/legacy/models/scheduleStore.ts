/**
 * Schedule Store
 * 
 * Manages scheduled tasks (tool calls, memos, events) with cron expressions
 * Persisted in PostgreSQL database
 */

import { getPostgresPool } from "../../database/postgres";
import { logInfo, logDebug, logWarn, logError } from "../../utils/logger";

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
  private initialized = false;

  /**
   * Initialize the store
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    logInfo("Schedule Store: Initializing");
    
    try {
      // Verify database connection
      const pool = getPostgresPool();
      await pool.query("SELECT 1");
      this.initialized = true;
      logInfo("Schedule Store: Initialized with PostgreSQL");
    } catch (err) {
      logError("Schedule Store: Failed to initialize", err);
      throw err;
    }
  }

  /**
   * Add a new scheduled task
   */
  async add(task: Omit<ScheduledTask, "id" | "createdAt" | "updatedAt">): Promise<ScheduledTask> {
    const now = new Date().toISOString();
    const id = `sched-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const pool = getPostgresPool();
    await pool.query(
      `INSERT INTO scheduled_tasks (
        id, type, schedule, payload, user_id, conversation_id, enabled, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id,
        task.type,
        task.schedule,
        JSON.stringify(task.payload),
        task.userId,
        task.conversationId,
        task.enabled,
        now,
        now
      ]
    );

    logInfo("Schedule Store: Task added", {
      taskId: id,
      type: task.type,
      schedule: task.schedule,
      enabled: task.enabled
    });

    return {
      ...task,
      id,
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * Update an existing scheduled task
   */
  async update(id: string, updates: Partial<Omit<ScheduledTask, "id" | "createdAt">>): Promise<ScheduledTask | null> {
    const pool = getPostgresPool();
    
    // Build dynamic update query
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.type !== undefined) {
      updateFields.push(`type = $${paramIndex++}`);
      values.push(updates.type);
    }
    if (updates.schedule !== undefined) {
      updateFields.push(`schedule = $${paramIndex++}`);
      values.push(updates.schedule);
    }
    if (updates.payload !== undefined) {
      updateFields.push(`payload = $${paramIndex++}`);
      values.push(JSON.stringify(updates.payload));
    }
    if (updates.userId !== undefined) {
      updateFields.push(`user_id = $${paramIndex++}`);
      values.push(updates.userId);
    }
    if (updates.conversationId !== undefined) {
      updateFields.push(`conversation_id = $${paramIndex++}`);
      values.push(updates.conversationId);
    }
    if (updates.enabled !== undefined) {
      updateFields.push(`enabled = $${paramIndex++}`);
      values.push(updates.enabled);
    }
    if (updates.lastRun !== undefined) {
      updateFields.push(`last_run = $${paramIndex++}`);
      values.push(updates.lastRun);
    }
    if (updates.nextRun !== undefined) {
      updateFields.push(`next_run = $${paramIndex++}`);
      values.push(updates.nextRun);
    }

    if (updateFields.length === 0) {
      // No updates, just return the existing task
      return this.get(id) || null;
    }

    // Always update updated_at
    updateFields.push(`updated_at = $${paramIndex++}`);
    values.push(new Date().toISOString());

    // Add id for WHERE clause
    values.push(id);

    const query = `
      UPDATE scheduled_tasks 
      SET ${updateFields.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      logWarn("Schedule Store: Task not found for update", { taskId: id });
      return null;
    }

    const row = result.rows[0];
    logInfo("Schedule Store: Task updated", {
      taskId: id,
      updates: Object.keys(updates)
    });

    return this.mapRowToTask(row);
  }

  /**
   * Delete a scheduled task
   */
  async delete(id: string): Promise<boolean> {
    const pool = getPostgresPool();
    const result = await pool.query("DELETE FROM scheduled_tasks WHERE id = $1", [id]);
    
    const existed = result.rowCount > 0;
    
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
  async get(id: string): Promise<ScheduledTask | undefined> {
    const pool = getPostgresPool();
    const result = await pool.query("SELECT * FROM scheduled_tasks WHERE id = $1", [id]);
    
    if (result.rows.length === 0) {
      return undefined;
    }

    return this.mapRowToTask(result.rows[0]);
  }

  /**
   * List all scheduled tasks
   */
  async list(filters?: { userId?: string; enabled?: boolean; type?: ScheduledTaskType }): Promise<ScheduledTask[]> {
    const pool = getPostgresPool();
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters?.userId) {
      conditions.push(`user_id = $${paramIndex++}`);
      values.push(filters.userId);
    }

    if (filters?.enabled !== undefined) {
      conditions.push(`enabled = $${paramIndex++}`);
      values.push(filters.enabled);
    }

    if (filters?.type) {
      conditions.push(`type = $${paramIndex++}`);
      values.push(filters.type);
    }

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const query = `
      SELECT * FROM scheduled_tasks
      ${whereClause}
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query, values);
    return result.rows.map(row => this.mapRowToTask(row));
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
  async count(filters?: { enabled?: boolean; type?: ScheduledTaskType }): Promise<number> {
    const pool = getPostgresPool();
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters?.enabled !== undefined) {
      conditions.push(`enabled = $${paramIndex++}`);
      values.push(filters.enabled);
    }

    if (filters?.type) {
      conditions.push(`type = $${paramIndex++}`);
      values.push(filters.type);
    }

    const whereClause = conditions.length > 0 
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const result = await pool.query(
      `SELECT COUNT(*) as count FROM scheduled_tasks ${whereClause}`,
      values
    );

    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Map database row to ScheduledTask
   */
  private mapRowToTask(row: any): ScheduledTask {
    return {
      id: row.id,
      type: row.type,
      schedule: row.schedule,
      payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
      userId: row.user_id,
      conversationId: row.conversation_id,
      enabled: row.enabled,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastRun: row.last_run || undefined,
      nextRun: row.next_run || undefined
    };
  }
}

// Singleton instance
export const scheduleStore = new ScheduleStore();

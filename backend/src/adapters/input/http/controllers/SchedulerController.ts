/**
 * Scheduler Controller
 * 
 * HTTP controller for scheduler-related endpoints
 */

import type { FastifyRequest, FastifyReply } from "fastify";
import { container } from "../../../../bootstrap/container";
import { CreateTaskUseCase } from "../../../../application/useCases/scheduler/CreateTaskUseCase";
import { GetTaskUseCase } from "../../../../application/useCases/scheduler/GetTaskUseCase";
import { ListTasksUseCase } from "../../../../application/useCases/scheduler/ListTasksUseCase";
import { UpdateTaskUseCase } from "../../../../application/useCases/scheduler/UpdateTaskUseCase";
import { DeleteTaskUseCase } from "../../../../application/useCases/scheduler/DeleteTaskUseCase";
import { SetTaskEnabledUseCase } from "../../../../application/useCases/scheduler/SetTaskEnabledUseCase";
import { logInfo, logDebug, logError, logWarn } from "../../../../infrastructure/logging/logger";

interface TaskIdParams {
  id: string;
}

interface TaskQueryParams {
  userId?: string;
  enabled?: string;
  type?: "tool_call" | "event";
}

interface CreateTaskBody {
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

interface UpdateTaskBody {
  type?: "tool_call" | "event";
  schedule?: string;
  payload?: {
    eventTopic?: string;
    toolName?: string;
    args?: any;
    eventPayload?: any;
  };
  enabled?: boolean;
}

export class SchedulerController {
  /**
   * GET /api/scheduler/tasks
   * List all scheduled tasks
   */
  static async listTasks(
    req: FastifyRequest<{ Querystring: TaskQueryParams }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { userId, enabled, type } = req.query;

      if (!userId) {
        reply.status(400).send({ error: "userId is required" });
        return;
      }

      logDebug("Scheduler Controller: List tasks request", {
        userId,
        enabled,
        type,
        requestId: req.id
      });

      const useCase = container.resolve<ListTasksUseCase>("ListTasksUseCase");
      const tasks = await useCase.execute(userId, {
        enabled: enabled ? enabled === "true" : undefined,
        type
      });

      logInfo("Scheduler Controller: Tasks list retrieved", {
        taskCount: tasks.length,
        requestId: req.id
      });

      reply.send({
        ok: true,
        data: tasks.map(task => ({
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
        }))
      });
    } catch (err) {
      logError("Scheduler Controller: Failed to list tasks", err, {
        requestId: req.id
      });
      reply.status(500).send({
        ok: false,
        error: "Failed to list tasks"
      });
    }
  }

  /**
   * GET /api/scheduler/tasks/:id
   * Get a specific task by ID
   */
  static async getTask(
    req: FastifyRequest<{ Params: TaskIdParams }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { id } = req.params;

      logDebug("Scheduler Controller: Get task request", {
        taskId: id,
        requestId: req.id
      });

      const useCase = container.resolve<GetTaskUseCase>("GetTaskUseCase");
      const task = await useCase.execute(id);

      if (!task) {
        logWarn("Scheduler Controller: Task not found", {
          taskId: id,
          requestId: req.id
        });
        reply.status(404).send({
          ok: false,
          error: `Task "${id}" not found`
        });
        return;
      }

      logInfo("Scheduler Controller: Task retrieved", {
        taskId: id,
        requestId: req.id
      });

      reply.send({
        ok: true,
        data: {
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
        }
      });
    } catch (err) {
      logError("Scheduler Controller: Failed to get task", err, {
        taskId: req.params.id,
        requestId: req.id
      });
      reply.status(500).send({
        ok: false,
        error: "Failed to get task"
      });
    }
  }

  /**
   * POST /api/scheduler/tasks
   * Create a new scheduled task
   */
  static async createTask(
    req: FastifyRequest<{ Body: CreateTaskBody }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { type, schedule, payload, userId, conversationId, enabled } = req.body;

      // Validate required fields
      if (!type || !schedule || !userId || !conversationId) {
        reply.status(400).send({
          ok: false,
          error: "Missing required fields: type, schedule, userId, conversationId"
        });
        return;
      }

      // Validate task type
      const validTypes: ("tool_call" | "event")[] = ["tool_call", "event"];
      if (!validTypes.includes(type)) {
        reply.status(400).send({
          ok: false,
          error: `Invalid task type. Must be one of: ${validTypes.join(", ")}`
        });
        return;
      }

      // Validate event topic
      if (!payload?.eventTopic) {
        reply.status(400).send({
          ok: false,
          error: "All tasks require payload.eventTopic"
        });
        return;
      }

      // Validate payload based on type
      if (type === "tool_call" && !payload.toolName) {
        reply.status(400).send({
          ok: false,
          error: "tool_call tasks require payload.toolName"
        });
        return;
      }

      logDebug("Scheduler Controller: Create task request", {
        type,
        requestId: req.id
      });

      const useCase = container.resolve<CreateTaskUseCase>("CreateTaskUseCase");
      const task = await useCase.execute(
        type,
        schedule,
        payload,
        userId,
        conversationId,
        enabled ?? true
      );

      logInfo("Scheduler Controller: Task created", {
        taskId: task.id,
        type: task.type,
        requestId: req.id
      });

      reply.status(201).send({
        ok: true,
        data: {
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
        }
      });
    } catch (err) {
      logError("Scheduler Controller: Failed to create task", err, {
        requestId: req.id
      });
      reply.status(500).send({
        ok: false,
        error: "Failed to create task"
      });
    }
  }

  /**
   * PUT /api/scheduler/tasks/:id
   * Update a scheduled task
   */
  static async updateTask(
    req: FastifyRequest<{ Params: TaskIdParams; Body: UpdateTaskBody }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;

      logDebug("Scheduler Controller: Update task request", {
        taskId: id,
        requestId: req.id
      });

      const useCase = container.resolve<UpdateTaskUseCase>("UpdateTaskUseCase");
      const task = await useCase.execute(id, updates);

      logInfo("Scheduler Controller: Task updated", {
        taskId: id,
        requestId: req.id
      });

      reply.send({
        ok: true,
        data: {
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
        }
      });
    } catch (err) {
      logError("Scheduler Controller: Failed to update task", err, {
        taskId: req.params.id,
        requestId: req.id
      });
      const message = (err as Error).message;
      if (message.includes("not found")) {
        reply.status(404).send({
          ok: false,
          error: `Task "${req.params.id}" not found`
        });
        return;
      }
      reply.status(500).send({
        ok: false,
        error: "Failed to update task"
      });
    }
  }

  /**
   * DELETE /api/scheduler/tasks/:id
   * Delete a scheduled task
   */
  static async deleteTask(
    req: FastifyRequest<{ Params: TaskIdParams }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { id } = req.params;

      logDebug("Scheduler Controller: Delete task request", {
        taskId: id,
        requestId: req.id
      });

      const useCase = container.resolve<DeleteTaskUseCase>("DeleteTaskUseCase");
      await useCase.execute(id);

      logInfo("Scheduler Controller: Task deleted", {
        taskId: id,
        requestId: req.id
      });

      reply.status(204).send();
    } catch (err) {
      logError("Scheduler Controller: Failed to delete task", err, {
        taskId: req.params.id,
        requestId: req.id
      });
      const message = (err as Error).message;
      if (message.includes("not found")) {
        reply.status(404).send({
          ok: false,
          error: `Task "${req.params.id}" not found`
        });
        return;
      }
      reply.status(500).send({
        ok: false,
        error: "Failed to delete task"
      });
    }
  }

  /**
   * PUT /api/scheduler/tasks/:id/enable
   * Enable a scheduled task
   */
  static async enableTask(
    req: FastifyRequest<{ Params: TaskIdParams }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { id } = req.params;

      logDebug("Scheduler Controller: Enable task request", {
        taskId: id,
        requestId: req.id
      });

      const useCase = container.resolve<SetTaskEnabledUseCase>("SetTaskEnabledUseCase");
      const task = await useCase.execute(id, true);

      logInfo("Scheduler Controller: Task enabled", {
        taskId: id,
        requestId: req.id
      });

      reply.send({
        ok: true,
        data: {
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
        }
      });
    } catch (err) {
      logError("Scheduler Controller: Failed to enable task", err, {
        taskId: req.params.id,
        requestId: req.id
      });
      const message = (err as Error).message;
      if (message.includes("not found")) {
        reply.status(404).send({
          ok: false,
          error: `Task "${req.params.id}" not found`
        });
        return;
      }
      reply.status(500).send({
        ok: false,
        error: "Failed to enable task"
      });
    }
  }

  /**
   * PUT /api/scheduler/tasks/:id/disable
   * Disable a scheduled task
   */
  static async disableTask(
    req: FastifyRequest<{ Params: TaskIdParams }>,
    reply: FastifyReply
  ): Promise<void> {
    try {
      const { id } = req.params;

      logDebug("Scheduler Controller: Disable task request", {
        taskId: id,
        requestId: req.id
      });

      const useCase = container.resolve<SetTaskEnabledUseCase>("SetTaskEnabledUseCase");
      const task = await useCase.execute(id, false);

      logInfo("Scheduler Controller: Task disabled", {
        taskId: id,
        requestId: req.id
      });

      reply.send({
        ok: true,
        data: {
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
        }
      });
    } catch (err) {
      logError("Scheduler Controller: Failed to disable task", err, {
        taskId: req.params.id,
        requestId: req.id
      });
      const message = (err as Error).message;
      if (message.includes("not found")) {
        reply.status(404).send({
          ok: false,
          error: `Task "${req.params.id}" not found`
        });
        return;
      }
      reply.status(500).send({
        ok: false,
        error: "Failed to disable task"
      });
    }
  }
}


/**
 * Scheduler API Routes
 * 
 * API endpoints for managing scheduled tasks
 */

import type { FastifyInstance } from "fastify";
import { scheduleStore, type ScheduledTask, type ScheduledTaskType } from "../models/scheduleStore";
import { logInfo, logDebug, logWarn, logError } from "../utils/logger";
import { eventBus } from "../events/eventBus";

export async function registerSchedulerRoutes(app: FastifyInstance) {
  // Get all scheduled tasks
  app.get("/api/scheduler/tasks", async (req, reply) => {
    logDebug("Scheduler API: List tasks request", {
      requestId: req.id
    });

    try {
      const tasks = scheduleStore.list();
      
      logInfo("Scheduler API: Tasks list retrieved", {
        taskCount: tasks.length,
        requestId: req.id
      });

      return reply.send({ ok: true, data: tasks });
    } catch (err) {
      logError("Scheduler API: Failed to list tasks", err, {
        requestId: req.id
      });
      return reply.status(500).send({
        ok: false,
        error: "Failed to list tasks"
      });
    }
  });

  // Get a specific task by ID
  app.get<{ Params: { id: string } }>("/api/scheduler/tasks/:id", async (req, reply) => {
    const { id } = req.params;
    
    logDebug("Scheduler API: Get task request", {
      taskId: id,
      requestId: req.id
    });

    const task = scheduleStore.get(id);

    if (!task) {
      logWarn("Scheduler API: Task not found", {
        taskId: id,
        requestId: req.id
      });
      return reply.status(404).send({
        ok: false,
        error: `Task "${id}" not found`
      });
    }

    logInfo("Scheduler API: Task retrieved", {
      taskId: id,
      requestId: req.id
    });

    return reply.send({ ok: true, data: task });
  });

  // Create a new scheduled task
  app.post<{ Body: Omit<ScheduledTask, "id" | "createdAt" | "updatedAt"> }>("/api/scheduler/tasks", async (req, reply) => {
    logDebug("Scheduler API: Create task request", {
      type: req.body.type,
      requestId: req.id
    });

    try {
      // Validate required fields
      if (!req.body.type || !req.body.schedule || !req.body.userId || !req.body.conversationId) {
        return reply.status(400).send({
          ok: false,
          error: "Missing required fields: type, schedule, userId, conversationId"
        });
      }

      // Validate task type
      const validTypes: ScheduledTaskType[] = ["tool_call", "event"];
      if (!validTypes.includes(req.body.type)) {
        return reply.status(400).send({
          ok: false,
          error: `Invalid task type. Must be one of: ${validTypes.join(", ")}`
        });
      }

      // Validate event topic
      if (!req.body.payload?.eventTopic) {
        return reply.status(400).send({
          ok: false,
          error: "All tasks require payload.eventTopic"
        });
      }

      // Validate payload based on type
      if (req.body.type === "tool_call" && !req.body.payload?.toolName) {
        return reply.status(400).send({
          ok: false,
          error: "tool_call tasks require payload.toolName"
        });
      }

      const task = await scheduleStore.add(req.body);

      logInfo("Scheduler API: Task created", {
        taskId: task.id,
        type: task.type,
        requestId: req.id
      });

      // Emit event for WebSocket updates
      await eventBus.emit({
        type: "scheduler_task_updated",
        payload: { tasks: scheduleStore.list() }
      });

      return reply.status(201).send({ ok: true, data: task });
    } catch (err) {
      logError("Scheduler API: Failed to create task", err, {
        requestId: req.id
      });
      return reply.status(500).send({
        ok: false,
        error: "Failed to create task"
      });
    }
  });

  // Update a scheduled task
  app.put<{ Params: { id: string }; Body: Partial<Omit<ScheduledTask, "id" | "createdAt">> }>("/api/scheduler/tasks/:id", async (req, reply) => {
    const { id } = req.params;
    
    logDebug("Scheduler API: Update task request", {
      taskId: id,
      requestId: req.id
    });

    try {
      const task = await scheduleStore.update(id, req.body);

      if (!task) {
        logWarn("Scheduler API: Task not found for update", {
          taskId: id,
          requestId: req.id
        });
        return reply.status(404).send({
          ok: false,
          error: `Task "${id}" not found`
        });
      }

      logInfo("Scheduler API: Task updated", {
        taskId: id,
        requestId: req.id
      });

      // Emit event for WebSocket updates
      await eventBus.emit({
        type: "scheduler_task_updated",
        payload: { tasks: scheduleStore.list() }
      });

      return reply.send({ ok: true, data: task });
    } catch (err) {
      logError("Scheduler API: Failed to update task", err, {
        taskId: id,
        requestId: req.id
      });
      return reply.status(500).send({
        ok: false,
        error: "Failed to update task"
      });
    }
  });

  // Delete a scheduled task
  app.delete<{ Params: { id: string } }>("/api/scheduler/tasks/:id", async (req, reply) => {
    const { id } = req.params;
    
    logDebug("Scheduler API: Delete task request", {
      taskId: id,
      requestId: req.id
    });

    try {
      const deleted = await scheduleStore.delete(id);

      if (!deleted) {
        logWarn("Scheduler API: Task not found for deletion", {
          taskId: id,
          requestId: req.id
        });
        return reply.status(404).send({
          ok: false,
          error: `Task "${id}" not found`
        });
      }

      logInfo("Scheduler API: Task deleted", {
        taskId: id,
        requestId: req.id
      });

      // Emit event for WebSocket updates
      await eventBus.emit({
        type: "scheduler_task_updated",
        payload: { tasks: scheduleStore.list() }
      });

      return reply.send({ ok: true, data: { deleted: true } });
    } catch (err) {
      logError("Scheduler API: Failed to delete task", err, {
        taskId: id,
        requestId: req.id
      });
      return reply.status(500).send({
        ok: false,
        error: "Failed to delete task"
      });
    }
  });

  // Enable a scheduled task
  app.post<{ Params: { id: string } }>("/api/scheduler/tasks/:id/enable", async (req, reply) => {
    const { id } = req.params;
    
    logDebug("Scheduler API: Enable task request", {
      taskId: id,
      requestId: req.id
    });

    try {
      const task = await scheduleStore.enable(id);

      if (!task) {
        logWarn("Scheduler API: Task not found for enable", {
          taskId: id,
          requestId: req.id
        });
        return reply.status(404).send({
          ok: false,
          error: `Task "${id}" not found`
        });
      }

      logInfo("Scheduler API: Task enabled", {
        taskId: id,
        requestId: req.id
      });

      // Emit event for WebSocket updates
      await eventBus.emit({
        type: "scheduler_task_updated",
        payload: { tasks: scheduleStore.list() }
      });

      return reply.send({ ok: true, data: task });
    } catch (err) {
      logError("Scheduler API: Failed to enable task", err, {
        taskId: id,
        requestId: req.id
      });
      return reply.status(500).send({
        ok: false,
        error: "Failed to enable task"
      });
    }
  });

  // Disable a scheduled task
  app.post<{ Params: { id: string } }>("/api/scheduler/tasks/:id/disable", async (req, reply) => {
    const { id } = req.params;
    
    logDebug("Scheduler API: Disable task request", {
      taskId: id,
      requestId: req.id
    });

    try {
      const task = await scheduleStore.disable(id);

      if (!task) {
        logWarn("Scheduler API: Task not found for disable", {
          taskId: id,
          requestId: req.id
        });
        return reply.status(404).send({
          ok: false,
          error: `Task "${id}" not found`
        });
      }

      logInfo("Scheduler API: Task disabled", {
        taskId: id,
        requestId: req.id
      });

      // Emit event for WebSocket updates
      await eventBus.emit({
        type: "scheduler_task_updated",
        payload: { tasks: scheduleStore.list() }
      });

      return reply.send({ ok: true, data: task });
    } catch (err) {
      logError("Scheduler API: Failed to disable task", err, {
        taskId: id,
        requestId: req.id
      });
      return reply.status(500).send({
        ok: false,
        error: "Failed to disable task"
      });
    }
  });
}


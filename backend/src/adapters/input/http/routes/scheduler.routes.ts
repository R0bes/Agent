/**
 * Scheduler Routes
 * 
 * HTTP routes for scheduler endpoints
 */

import type { FastifyInstance } from "fastify";
import { SchedulerController } from "../controllers/SchedulerController";

export async function registerSchedulerRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/scheduler/tasks", SchedulerController.listTasks);
  app.get("/api/scheduler/tasks/:id", SchedulerController.getTask);
  app.post("/api/scheduler/tasks", SchedulerController.createTask);
  app.put("/api/scheduler/tasks/:id", SchedulerController.updateTask);
  app.delete("/api/scheduler/tasks/:id", SchedulerController.deleteTask);
  app.put("/api/scheduler/tasks/:id/enable", SchedulerController.enableTask);
  app.put("/api/scheduler/tasks/:id/disable", SchedulerController.disableTask);
}


/**
 * Tools Routes
 * 
 * HTTP routes for tools endpoints
 */

import type { FastifyInstance } from "fastify";
import { ToolsController } from "../controllers/ToolsController";

export async function registerToolsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/tools", ToolsController.listTools);
  app.get("/api/tools/:name", ToolsController.getTool);
  app.post("/api/tools/execute", ToolsController.executeTool);
}


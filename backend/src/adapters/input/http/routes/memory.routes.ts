/**
 * Memory Routes
 * 
 * HTTP routes for memory endpoints
 */

import type { FastifyInstance } from "fastify";
import { MemoryController } from "../controllers/MemoryController";

export async function registerMemoryRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/memory", MemoryController.listMemories);
  app.get("/api/memory/:id", MemoryController.getMemory);
  app.post("/api/memory", MemoryController.createMemory);
  app.put("/api/memory/:id", MemoryController.updateMemory);
  app.delete("/api/memory/:id", MemoryController.deleteMemory);
  app.post("/api/memory/search", MemoryController.searchMemories);
}


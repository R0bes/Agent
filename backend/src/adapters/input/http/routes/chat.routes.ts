/**
 * Chat Routes
 * 
 * HTTP routes for chat endpoints
 */

import type { FastifyInstance } from "fastify";
import { ChatController } from "../controllers/ChatController";

export async function registerChatRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/chat", ChatController.processMessage);
  app.get("/api/conversation/:conversationId", ChatController.getConversation);
}


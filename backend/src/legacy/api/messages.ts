/**
 * Messages API
 * 
 * API endpoints for accessing stored conversation messages.
 */

import type { FastifyInstance } from "fastify";
import { messageStore } from "../components/message/store";
import { logInfo, logDebug, logError } from "../utils/logger";

interface MessageIdParams {
  id: string;
}

interface ConversationIdParams {
  conversationId: string;
}

interface MessageQueryParams {
  conversationId?: string;
  userId?: string;
  role?: "user" | "assistant" | "tool" | "system";
  limit?: string;
  offset?: string;
}

export async function registerMessagesRoutes(app: FastifyInstance) {
  /**
   * GET /api/messages - List messages with filters
   */
  app.get<{ Querystring: MessageQueryParams }>("/api/messages", async (req, reply) => {
    try {
      const query = {
        conversationId: req.query.conversationId,
        userId: req.query.userId,
        roles: req.query.role ? [req.query.role] : undefined,
        limit: req.query.limit ? parseInt(req.query.limit) : 100,
        offset: req.query.offset ? parseInt(req.query.offset) : 0,
        orderBy: "created_at_desc" as const
      };

      logDebug("Messages API: List request", { query });

      const messages = await messageStore.list(query);

      logInfo("Messages API: Messages listed", {
        count: messages.length
      });

      return reply.send({ messages, count: messages.length });
    } catch (err) {
      logError("Messages API: List failed", err);
      return reply.status(500).send({ error: "Failed to list messages" });
    }
  });

  /**
   * GET /api/messages/:id - Get single message
   */
  app.get<{ Params: MessageIdParams }>("/api/messages/:id", async (req, reply) => {
    try {
      const { id } = req.params;

      logDebug("Messages API: Get request", { id });

      const message = await messageStore.getById(id);

      if (!message) {
        return reply.status(404).send({ error: "Message not found" });
      }

      logInfo("Messages API: Message retrieved", { id });

      return reply.send({ message });
    } catch (err) {
      logError("Messages API: Get failed", err, { id: req.params.id });
      return reply.status(500).send({ error: "Failed to get message" });
    }
  });

  /**
   * GET /api/messages/conversation/:conversationId - Get conversation history
   */
  app.get<{ Params: ConversationIdParams; Querystring: { limit?: string } }>(
    "/api/messages/conversation/:conversationId",
    async (req, reply) => {
      try {
        const { conversationId } = req.params;
        const limit = req.query.limit ? parseInt(req.query.limit) : 50;

        logDebug("Messages API: Get conversation request", {
          conversationId,
          limit
        });

        const messages = await messageStore.getByConversation(conversationId, limit);

        logInfo("Messages API: Conversation messages retrieved", {
          conversationId,
          count: messages.length
        });

        return reply.send({ messages, conversationId, count: messages.length });
      } catch (err) {
        logError("Messages API: Get conversation failed", err, {
          conversationId: req.params.conversationId
        });
        return reply.status(500).send({ error: "Failed to get conversation messages" });
      }
    }
  );
}


/**
 * Conversation API
 * Provides conversation metadata and statistics
 */

import type { FastifyInstance } from "fastify";
import { conversationStore } from "../legacy/models/conversationStore";
import { logInfo, logDebug, logError } from "../utils/logger";

export async function registerConversationRoutes(app: FastifyInstance) {
  /**
   * GET /api/conversation/:conversationId
   * Get conversation metadata and statistics
   */
  app.get<{ Params: { conversationId: string } }>(
    "/api/conversation/:conversationId",
    async (req, reply) => {
      const { conversationId } = req.params;

      logDebug("Conversation API: Fetching conversation data", {
        conversationId,
        requestId: req.id
      });

      try {
        // Get all messages for this conversation
        const messages = await conversationStore.getByConversation(conversationId);
        
        // Calculate statistics
        const messageCount = messages.length;
        const userMessageCount = messages.filter(m => m.role === "user").length;
        const assistantMessageCount = messages.filter(m => m.role === "assistant").length;
        
        // Calculate total characters and estimated tokens
        const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0);
        const estimatedTokens = Math.ceil(totalChars / 4);
        
        // Get first and last message timestamps
        const firstMessage = messages[0];
        const lastMessage = messages[messages.length - 1];
        
        // Get recent messages (last 20)
        const recentMessages = messages.slice(-20);

        const metadata = {
          conversationId,
          messageCount,
          userMessageCount,
          assistantMessageCount,
          totalChars,
          estimatedTokens,
          firstMessageAt: firstMessage?.createdAt,
          lastMessageAt: lastMessage?.createdAt,
          recentMessages: recentMessages.map(m => ({
            id: m.id,
            role: m.role,
            content: m.content.slice(0, 200) + (m.content.length > 200 ? "..." : ""),
            createdAt: m.createdAt,
            metadata: m.metadata
          }))
        };

        logInfo("Conversation API: Conversation data retrieved", {
          conversationId,
          messageCount,
          requestId: req.id
        });

        return reply.send(metadata);
      } catch (err) {
        logError("Conversation API: Failed to fetch conversation", err, {
          conversationId,
          requestId: req.id
        });
        return reply.status(500).send({ error: "Failed to fetch conversation data" });
      }
    }
  );

  /**
   * GET /api/conversation/:conversationId/messages
   * Get all messages for a conversation with optional pagination
   */
  app.get<{ 
    Params: { conversationId: string };
    Querystring: { limit?: string; offset?: string };
  }>(
    "/api/conversation/:conversationId/messages",
    async (req, reply) => {
      const { conversationId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit) : undefined;
      const offset = req.query.offset ? parseInt(req.query.offset) : undefined;

      logDebug("Conversation API: Fetching messages", {
        conversationId,
        limit,
        offset,
        requestId: req.id
      });

      try {
        const messages = await conversationStore.getByConversation(conversationId, {
          limit,
          offset
        });

        logInfo("Conversation API: Messages retrieved", {
          conversationId,
          messageCount: messages.length,
          requestId: req.id
        });

        return reply.send({ messages });
      } catch (err) {
        logError("Conversation API: Failed to fetch messages", err, {
          conversationId,
          requestId: req.id
        });
        return reply.status(500).send({ error: "Failed to fetch messages" });
      }
    }
  );
}


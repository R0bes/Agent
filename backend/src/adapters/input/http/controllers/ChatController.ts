/**
 * Chat Controller
 * 
 * HTTP controller for chat-related endpoints
 */

import type { FastifyRequest, FastifyReply } from "fastify";
import { container } from "../../../../bootstrap/container";
import { ProcessMessageUseCase } from "../../../../application/useCases/chat/ProcessMessageUseCase";
import { GetConversationUseCase } from "../../../../application/useCases/chat/GetConversationUseCase";
import { SourceMessage } from "../../../../domain/valueObjects/SourceMessage";
import { logInfo, logDebug, logError } from "../../../../infrastructure/logging/logger";

interface ChatRequestBody {
  conversationId: string;
  userId: string;
  text: string;
}

interface ConversationParams {
  conversationId: string;
}

export class ChatController {
  /**
   * POST /api/chat
   * Process a chat message
   */
  static async processMessage(
    req: FastifyRequest<{ Body: ChatRequestBody }>,
    reply: FastifyReply
  ): Promise<void> {
    const startTime = Date.now();
    const { conversationId, userId, text } = req.body;

    logInfo("Chat Controller: Request received", {
      conversationId,
      userId,
      textLength: text.length,
      requestId: req.id
    });

    try {
      const useCase = container.resolve<ProcessMessageUseCase>("ProcessMessageUseCase");
      
      // Create source message
      const sourceMessage = SourceMessage.create(
        userId,
        conversationId,
        text,
        {
          id: "api",
          kind: "api",
          label: "API"
        }
      );

      // Process message
      const response = await useCase.execute(sourceMessage);

      const duration = Date.now() - startTime;
      logInfo("Chat Controller: Request processed successfully", {
        conversationId,
        userId,
        messageId: response.id,
        duration: `${duration}ms`,
        requestId: req.id
      });

      reply.send({
        ok: true,
        data: {
          id: response.id,
          conversationId: response.conversationId,
          userId: response.userId,
          role: response.role,
          content: response.content,
          createdAt: response.createdAt
        }
      });
    } catch (err) {
      const duration = Date.now() - startTime;
      logError("Chat Controller: Request failed", err, {
        conversationId,
        userId,
        duration: `${duration}ms`,
        requestId: req.id
      });
      reply.status(500).send({ error: "Internal server error" });
    }
  }

  /**
   * GET /api/conversation/:conversationId
   * Get conversation history
   */
  static async getConversation(
    req: FastifyRequest<{ 
      Params: ConversationParams;
      Querystring: { limit?: string; offset?: string };
    }>,
    reply: FastifyReply
  ): Promise<void> {
    const { conversationId } = req.params;
    const limit = req.query?.limit ? Number(req.query.limit) : 50;
    const offset = req.query?.offset ? Number(req.query.offset) : 0;

    logDebug("Chat Controller: Get conversation request", {
      conversationId,
      limit,
      offset,
      requestId: req.id
    });

    try {
      const useCase = container.resolve<GetConversationUseCase>("GetConversationUseCase");
      
      const messages = await useCase.execute(conversationId, {
        limit,
        offset
      });

      logInfo("Chat Controller: Conversation retrieved", {
        conversationId,
        messageCount: messages.length,
        requestId: req.id
      });

      reply.send({
        ok: true,
        data: messages.map(msg => ({
          id: msg.id,
          conversationId: msg.conversationId,
          userId: msg.userId,
          role: msg.role,
          content: msg.content,
          createdAt: msg.createdAt
        }))
      });
    } catch (err) {
      logError("Chat Controller: Failed to get conversation", err, {
        conversationId,
        requestId: req.id
      });
      reply.status(500).send({ error: "Internal server error" });
    }
  }
}


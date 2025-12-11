import type { FastifyInstance } from "fastify";
import { getSourceByKind } from "../legacy/components/registry";
import { logInfo, logDebug, logError, logWarn } from "../utils/logger";

interface ChatRequestBody {
  conversationId: string;
  userId: string;
  text: string;
}

export async function registerChatRoutes(app: FastifyInstance) {
  app.post<{ Body: ChatRequestBody }>("/api/chat", async (req, reply) => {
    const startTime = Date.now();
    const { conversationId, userId, text } = req.body;

    logInfo("Chat API: Request received", {
      conversationId,
      userId,
      textLength: text.length,
      requestId: req.id
    });

    try {
      // Get GUI source component
      const guiSource = getSourceByKind("gui");
      if (!guiSource) {
        logError("Chat API: GUI source not available", undefined, {
          conversationId,
          userId
        });
        return reply.status(500).send({ error: "GUI source not available" });
      }

      logDebug("Chat API: Processing through GUI source", {
        conversationId,
        userId,
        sourceId: guiSource.id
      });

      // Process through source (will send to persona via event bus)
      // The source will emit source_message events that the persona listens to
      await guiSource.process({
        conversationId,
        userId,
        text
      });

      const duration = Date.now() - startTime;
      logInfo("Chat API: Request processed successfully", {
        conversationId,
        userId,
        duration: `${duration}ms`,
        requestId: req.id
      });

      // Note: The actual response will come via WebSocket when persona processes the message
      // For now, we return ok immediately
      return reply.send({ ok: true });
    } catch (err) {
      const duration = Date.now() - startTime;
      logError("Chat API: Request failed", err, {
        conversationId,
        userId,
        duration: `${duration}ms`,
        requestId: req.id
      });
      return reply.status(500).send({ error: "Internal server error" });
    }
  });
}

import type { FastifyInstance } from "fastify";
import { handleUserMessage } from "../persona/personaService";
import { eventBus } from "../events/eventBus";

interface ChatRequestBody {
  conversationId: string;
  userId: string;
  text: string;
}

export async function registerChatRoutes(app: FastifyInstance) {
  app.post<{ Body: ChatRequestBody }>("/api/chat", async (req, reply) => {
    const { conversationId, userId, text } = req.body;

    // Here you'd also persist the user message, emit events, etc.
    const assistantMessage = await handleUserMessage(conversationId, userId, text);

    // Emit event to any WebSocket subscribers
    await eventBus.emit({
      type: "message_created",
      payload: assistantMessage
    });

    return reply.send({ ok: true });
  });
}

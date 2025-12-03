import type { BaseEvent } from "../events/eventBus";

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  createdAt: string;
}

let messageCounter = 0;

/**
 * Very small persona stub.
 * Later this will call your real LLM, memory, tools, workers, etc.
 */
export async function handleUserMessage(
  conversationId: string,
  userId: string,
  text: string
): Promise<ChatMessage> {
  messageCounter += 1;
  const reply: ChatMessage = {
    id: `msg-${messageCounter}`,
    conversationId,
    role: "assistant",
    content: `You said: "${text}". (Persona stub reply)`,
    createdAt: new Date().toISOString()
  };

  return reply;
}

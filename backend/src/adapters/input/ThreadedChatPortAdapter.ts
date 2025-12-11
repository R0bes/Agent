/**
 * Threaded Chat Port Adapter
 * 
 * Implements IChatPort using ThreadedPersonaService
 */

import type { IChatPort, ChatRequest, ChatResponse } from "../../ports/input/IChatPort";
import { executionService } from "../../services/executionService";
import { SourceMessage } from "../../domain/valueObjects/SourceMessage";

export class ThreadedChatPortAdapter implements IChatPort {
  async processMessage(request: ChatRequest): Promise<ChatResponse> {
    // Create source message
    const sourceMessage = SourceMessage.create(
      request.userId,
      request.conversationId,
      request.text,
      request.source || {
        id: "api",
        kind: "api",
        label: "API"
      }
    );

    // Call ThreadedPersonaService via ExecutionService
    const result = await executionService.callService("persona", "processMessage", {
      sourceMessage: {
        id: sourceMessage.id,
        userId: sourceMessage.userId,
        conversationId: sourceMessage.conversationId,
        content: sourceMessage.content,
        source: sourceMessage.source,
        createdAt: sourceMessage.createdAt
      }
    });

    // Convert result to ChatResponse
    return {
      messageId: result.id || `msg-${Date.now()}`,
      conversationId: result.conversationId || request.conversationId,
      userId: result.userId || request.userId,
      content: result.content || "",
      role: "assistant",
      createdAt: result.createdAt || new Date().toISOString()
    };
  }

  async getConversation(conversationId: string, options?: {
    limit?: number;
    offset?: number;
    since?: string;
  }): Promise<ChatResponse[]> {
    // This should use MessageRepository, not Threaded Service
    // For now, return empty array - will be implemented with proper repository
    return [];
  }
}


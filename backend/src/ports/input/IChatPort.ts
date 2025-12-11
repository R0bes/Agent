/**
 * Chat Port (Input/Driving Port)
 * 
 * Defines the interface for chat-related use cases
 */

export interface ChatRequest {
  conversationId: string;
  userId: string;
  text: string;
  source?: {
    id: string;
    kind: string;
    label?: string;
    meta?: Record<string, unknown>;
  };
}

export interface ChatResponse {
  messageId: string;
  conversationId: string;
  userId: string;
  content: string;
  role: "user" | "assistant" | "system" | "tool";
  createdAt: string;
}

export interface IChatPort {
  /**
   * Process a chat message and return the response
   */
  processMessage(request: ChatRequest): Promise<ChatResponse>;
  
  /**
   * Get conversation history
   */
  getConversation(conversationId: string, options?: {
    limit?: number;
    offset?: number;
    since?: string;
  }): Promise<ChatResponse[]>;
}


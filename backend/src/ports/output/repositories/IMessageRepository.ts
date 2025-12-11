/**
 * Message Repository (Output/Driven Port)
 * 
 * Defines the interface for message persistence
 */

export interface Message {
  id: string;
  conversationId: string;
  userId: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  createdAt: string;
  metadata?: {
    toolName?: string;
    sourceKind?: string;
    processingDuration?: number;
    [key: string]: any;
  };
}

export interface MessageQuery {
  conversationId: string;
  limit?: number;
  offset?: number;
  since?: string;
}

export interface IMessageRepository {
  /**
   * Save a message
   */
  save(message: Omit<Message, "id" | "createdAt">): Promise<Message>;
  
  /**
   * Get messages by conversation
   */
  findByConversation(query: MessageQuery): Promise<Message[]>;
  
  /**
   * Get recent messages
   */
  findRecent(conversationId: string, limit: number): Promise<Message[]>;
  
  /**
   * Count messages in a conversation
   */
  count(conversationId: string): Promise<number>;
  
  /**
   * Get message range
   */
  findRange(conversationId: string, startId: string, endId: string): Promise<Message[]>;
  
  /**
   * Get message by ID
   */
  findById(messageId: string): Promise<Message | null>;
}


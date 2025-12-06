/**
 * Message Types
 * 
 * Types for the message storage system that stores all conversation messages.
 */

export interface MessageItem {
  id: string;
  conversationId: string;
  userId: string;
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface MessageWrite {
  id?: string;  // Optional, will be generated if not provided
  conversationId: string;
  userId: string;
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  metadata?: Record<string, any>;
}

export interface MessageQuery {
  conversationId?: string;
  userId?: string;
  roles?: ("user" | "assistant" | "tool" | "system")[];
  limit?: number;
  offset?: number;
  orderBy?: "created_at_asc" | "created_at_desc";
}

export interface MessageStore {
  save(message: MessageWrite): Promise<MessageItem>;
  list(query: MessageQuery): Promise<MessageItem[]>;
  getById(id: string): Promise<MessageItem | null>;
  getByConversation(conversationId: string, limit?: number): Promise<MessageItem[]>;
}


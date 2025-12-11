/**
 * Conversation Repository (Output/Driven Port)
 * 
 * Defines the interface for conversation persistence
 */

export interface Conversation {
  id: string;
  userId: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface IConversationRepository {
  /**
   * Save a conversation
   */
  save(conversation: Omit<Conversation, "id" | "createdAt" | "updatedAt">): Promise<Conversation>;
  
  /**
   * Get conversation by ID
   */
  findById(conversationId: string): Promise<Conversation | null>;
  
  /**
   * List conversations for a user
   */
  findByUser(userId: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<Conversation[]>;
  
  /**
   * Update a conversation
   */
  update(conversationId: string, updates: Partial<Omit<Conversation, "id" | "createdAt" | "updatedAt">>): Promise<Conversation>;
  
  /**
   * Delete a conversation
   */
  delete(conversationId: string): Promise<void>;
}


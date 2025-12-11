/**
 * Memory Repository (Output/Driven Port)
 * 
 * Defines the interface for memory persistence and search
 */

export interface Memory {
  id: string;
  userId: string;
  conversationId: string;
  content: string;
  kind: string;
  embedding?: number[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryQuery {
  userId: string;
  conversationId?: string;
  query?: string; // For semantic search
  kind?: string;
  limit?: number;
  offset?: number;
}

export interface IMemoryRepository {
  /**
   * Save a memory
   */
  save(memory: Omit<Memory, "id" | "createdAt" | "updatedAt">): Promise<Memory>;
  
  /**
   * Update a memory
   */
  update(memoryId: string, updates: Partial<Omit<Memory, "id" | "createdAt" | "updatedAt">>): Promise<Memory>;
  
  /**
   * Get memory by ID
   */
  findById(memoryId: string): Promise<Memory | null>;
  
  /**
   * Search memories (semantic search if query provided, otherwise list)
   */
  search(query: MemoryQuery): Promise<Memory[]>;
  
  /**
   * Delete a memory
   */
  delete(memoryId: string): Promise<void>;
  
  /**
   * List memories for a user/conversation
   */
  list(query: MemoryQuery): Promise<Memory[]>;
}


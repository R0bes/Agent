/**
 * Memory Port (Input/Driving Port)
 * 
 * Defines the interface for memory-related use cases
 */

export interface MemorySearchRequest {
  query: string;
  userId: string;
  conversationId?: string;
  limit?: number;
  kind?: string;
}

export interface MemoryCreateRequest {
  userId: string;
  conversationId: string;
  content: string;
  kind: string;
  metadata?: Record<string, unknown>;
}

export interface MemoryUpdateRequest {
  memoryId: string;
  content?: string;
  metadata?: Record<string, unknown>;
}

export interface Memory {
  id: string;
  userId: string;
  conversationId: string;
  content: string;
  kind: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface IMemoryPort {
  /**
   * Search memories by query
   */
  searchMemories(request: MemorySearchRequest): Promise<Memory[]>;
  
  /**
   * Create a new memory
   */
  createMemory(request: MemoryCreateRequest): Promise<Memory>;
  
  /**
   * Update an existing memory
   */
  updateMemory(request: MemoryUpdateRequest): Promise<Memory>;
  
  /**
   * Get memory by ID
   */
  getMemoryById(memoryId: string): Promise<Memory | null>;
  
  /**
   * List memories for a user/conversation
   */
  listMemories(userId: string, conversationId?: string, options?: {
    limit?: number;
    offset?: number;
    kind?: string;
  }): Promise<Memory[]>;
}


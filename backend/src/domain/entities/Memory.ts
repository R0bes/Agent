/**
 * Memory Entity
 * 
 * Domain entity representing a memory (fact, preference, etc.)
 */

export class Memory {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly conversationId: string,
    public readonly content: string,
    public readonly kind: string,
    public readonly createdAt: string,
    public readonly updatedAt: string,
    public readonly embedding?: number[],
    public readonly metadata?: Record<string, unknown>
  ) {}

  /**
   * Create a new memory
   */
  static create(
    userId: string,
    conversationId: string,
    content: string,
    kind: string,
    embedding?: number[],
    metadata?: Record<string, unknown>
  ): Memory {
    const now = new Date().toISOString();
    return new Memory(
      `mem-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      conversationId,
      content,
      kind,
      now,
      now,
      embedding,
      metadata
    );
  }

  /**
   * Update memory content
   */
  updateContent(newContent: string, metadata?: Record<string, unknown>): Memory {
    return new Memory(
      this.id,
      this.userId,
      this.conversationId,
      newContent,
      this.kind,
      this.createdAt,
      new Date().toISOString(),
      this.embedding,
      metadata ?? this.metadata
    );
  }

  /**
   * Check if memory has embedding
   */
  hasEmbedding(): boolean {
    return this.embedding !== undefined && this.embedding.length > 0;
  }
}


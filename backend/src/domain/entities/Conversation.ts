/**
 * Conversation Entity
 * 
 * Domain entity representing a conversation
 */

export class Conversation {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly createdAt: string,
    public readonly updatedAt: string,
    public readonly title?: string,
    public readonly metadata?: Record<string, unknown>
  ) {}

  /**
   * Create a new conversation
   */
  static create(
    userId: string,
    title?: string,
    metadata?: Record<string, unknown>
  ): Conversation {
    const now = new Date().toISOString();
    return new Conversation(
      `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      now,
      now,
      title,
      metadata
    );
  }

  /**
   * Update conversation title
   */
  updateTitle(newTitle: string): Conversation {
    return new Conversation(
      this.id,
      this.userId,
      this.createdAt,
      new Date().toISOString(),
      newTitle,
      this.metadata
    );
  }

  /**
   * Update conversation metadata
   */
  updateMetadata(metadata: Record<string, unknown>): Conversation {
    return new Conversation(
      this.id,
      this.userId,
      this.createdAt,
      new Date().toISOString(),
      this.title,
      { ...this.metadata, ...metadata }
    );
  }
}


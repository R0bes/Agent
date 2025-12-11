/**
 * Source Message Value Object
 * 
 * Immutable value object representing a message from a source
 */

export interface SourceDescriptor {
  id: string;
  kind: string;
  label?: string;
  meta?: Record<string, unknown>;
}

export class SourceMessage {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly conversationId: string,
    public readonly content: string,
    public readonly source: SourceDescriptor,
    public readonly createdAt: string
  ) {}

  /**
   * Create a new source message
   */
  static create(
    userId: string,
    conversationId: string,
    content: string,
    source: SourceDescriptor
  ): SourceMessage {
    return new SourceMessage(
      `src-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      conversationId,
      content,
      source,
      new Date().toISOString()
    );
  }

  /**
   * Check if source is GUI
   */
  isFromGUI(): boolean {
    return this.source.kind === "gui";
  }

  /**
   * Check if source is scheduler
   */
  isFromScheduler(): boolean {
    return this.source.kind === "scheduler";
  }
}


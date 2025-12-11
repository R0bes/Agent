/**
 * Tool Context Value Object
 * 
 * Immutable value object representing the context for tool execution
 */

import type { SourceDescriptor } from "./SourceMessage";

export class ToolContext {
  constructor(
    public readonly userId: string,
    public readonly conversationId: string,
    public readonly source: SourceDescriptor,
    public readonly traceId?: string,
    public readonly meta?: Record<string, unknown>
  ) {}

  /**
   * Create a new tool context
   */
  static create(
    userId: string,
    conversationId: string,
    source: SourceDescriptor,
    traceId?: string,
    meta?: Record<string, unknown>
  ): ToolContext {
    return new ToolContext(userId, conversationId, source, traceId, meta);
  }

  /**
   * Create a new context with updated metadata
   */
  withMeta(meta: Record<string, unknown>): ToolContext {
    return new ToolContext(
      this.userId,
      this.conversationId,
      this.source,
      this.traceId,
      { ...this.meta, ...meta }
    );
  }
}


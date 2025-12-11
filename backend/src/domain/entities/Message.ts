/**
 * Message Entity
 * 
 * Domain entity representing a message in a conversation
 */

export class Message {
  constructor(
    public readonly id: string,
    public readonly conversationId: string,
    public readonly userId: string,
    public readonly role: "user" | "assistant" | "system" | "tool",
    public readonly content: string,
    public readonly createdAt: string,
    public readonly metadata?: {
      toolName?: string;
      sourceKind?: string;
      processingDuration?: number;
      [key: string]: any;
    }
  ) {}

  /**
   * Create a new message
   */
  static create(
    conversationId: string,
    userId: string,
    role: "user" | "assistant" | "system" | "tool",
    content: string,
    metadata?: Record<string, unknown>
  ): Message {
    return new Message(
      `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      conversationId,
      userId,
      role,
      content,
      new Date().toISOString(),
      metadata
    );
  }

  /**
   * Check if message is from a tool
   */
  isToolMessage(): boolean {
    return this.role === "tool";
  }

  /**
   * Check if message is from user
   */
  isUserMessage(): boolean {
    return this.role === "user";
  }

  /**
   * Check if message is from assistant
   */
  isAssistantMessage(): boolean {
    return this.role === "assistant";
  }
}


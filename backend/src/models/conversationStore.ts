/**
 * Conversation Store
 * Stores all chat messages for context building and memory compaction
 */

export interface ConversationMessage {
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

export interface ConversationQuery {
  conversationId: string;
  limit?: number;
  offset?: number;
  since?: string;
}

export interface ConversationStore {
  add(message: ConversationMessage): Promise<ConversationMessage>;
  getByConversation(
    conversationId: string,
    options?: {
      limit?: number;
      offset?: number;
      since?: string;
    }
  ): Promise<ConversationMessage[]>;
  getRecentMessages(conversationId: string, limit: number): Promise<ConversationMessage[]>;
  countMessages(conversationId: string): Promise<number>;
  getMessageRange(
    conversationId: string,
    startId: string,
    endId: string
  ): Promise<ConversationMessage[]>;
}

const messages: ConversationMessage[] = [];

export class InMemoryConversationStore implements ConversationStore {
  async add(message: ConversationMessage): Promise<ConversationMessage> {
    messages.push(message);
    return message;
  }

  async getByConversation(
    conversationId: string,
    options?: {
      limit?: number;
      offset?: number;
      since?: string;
    }
  ): Promise<ConversationMessage[]> {
    let filtered = messages.filter((m) => m.conversationId === conversationId);

    if (options?.since) {
      filtered = filtered.filter((m) => m.createdAt > options.since!);
    }

    // Sort by createdAt ascending (oldest first for chronological context)
    filtered.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    if (options?.offset) {
      filtered = filtered.slice(options.offset);
    }

    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  async getRecentMessages(
    conversationId: string,
    limit: number = 10
  ): Promise<ConversationMessage[]> {
    const allMessages = await this.getByConversation(conversationId);
    
    // Return last N messages in chronological order (oldest first)
    return allMessages.slice(-limit);
  }

  async countMessages(conversationId: string): Promise<number> {
    return messages.filter((m) => m.conversationId === conversationId).length;
  }

  async getMessageRange(
    conversationId: string,
    startId: string,
    endId: string
  ): Promise<ConversationMessage[]> {
    const allMessages = await this.getByConversation(conversationId);
    const startIdx = allMessages.findIndex((m) => m.id === startId);
    const endIdx = allMessages.findIndex((m) => m.id === endId);

    if (startIdx === -1 || endIdx === -1) {
      return [];
    }

    return allMessages.slice(startIdx, endIdx + 1);
  }
}

export const conversationStore: ConversationStore = new InMemoryConversationStore();


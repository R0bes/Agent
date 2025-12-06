/**
 * Memory Types for Frontend
 * 
 * Synchronized with backend memory types.
 */

export type MemoryKind = "fact" | "preference" | "summary" | "episode";

export interface SourceReference {
  type: "message" | "memory" | "external";
  id: string;
  timestamp: string;
  excerpt?: string;
}

export interface MemoryItem {
  id: string;
  userId: string;
  kind: MemoryKind;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  conversationId?: string;
  sourceReferences?: SourceReference[];
  isCompaktified?: boolean;
  compaktifiedFrom?: string[];
}

export interface MessageItem {
  id: string;
  conversationId: string;
  userId: string;
  role: "user" | "assistant" | "tool" | "system";
  content: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface DBStatus {
  postgres: {
    connected: boolean;
    messageCount: number;
    memoryCount: number;
  };
  qdrant: {
    connected: boolean;
    collectionSize: number;
  };
}


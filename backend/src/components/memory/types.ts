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
  
  // Source Tracking
  sourceReferences?: SourceReference[];
  
  // Compaktification Tracking
  isCompaktified?: boolean;
  compaktifiedFrom?: string[];
}

export interface MemoryWrite {
  userId: string;
  kind: MemoryKind;
  title: string;
  content: string;
  tags?: string[];
  conversationId?: string;
  sourceReferences?: SourceReference[];
}

export interface MemoryUpdate {
  title?: string;
  content?: string;
  tags?: string[];
  conversationId?: string;
  sourceReferences?: SourceReference[];
  isCompaktified?: boolean;
  compaktifiedFrom?: string[];
}

export interface MemoryQuery {
  userId?: string;
  kinds?: MemoryKind[];
  tags?: string[];
  conversationId?: string;
  isCompaktified?: boolean;
  limit?: number;
  offset?: number;
}

export interface MemorySearchQuery {
  query: string;
  userId?: string;
  kinds?: MemoryKind[];
  tags?: string[];
  limit?: number;
}

export interface MemoryStore {
  add(item: MemoryWrite): Promise<MemoryItem>;
  update(id: string, updates: MemoryUpdate): Promise<MemoryItem>;
  delete(id: string): Promise<void>;
  list(query: MemoryQuery): Promise<MemoryItem[]>;
  getById(id: string): Promise<MemoryItem | null>;
  search(query: MemorySearchQuery): Promise<MemoryItem[]>;
  searchSimilar(embedding: number[], options: {
    userId?: string;
    kinds?: MemoryKind[];
    tags?: string[];
    limit?: number;
  }): Promise<MemoryItem[]>;
}


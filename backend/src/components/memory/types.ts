export type MemoryKind = "fact" | "preference" | "summary" | "episode";

export interface MemoryItem {
  id: string;
  userId: string;
  kind: MemoryKind;
  title: string;
  content: string;
  createdAt: string;
  tags?: string[];
  conversationId?: string;
}

export interface MemoryWrite {
  userId: string;
  kind: MemoryKind;
  title: string;
  content: string;
  tags?: string[];
  conversationId?: string;
}

export interface MemoryQuery {
  userId?: string;
  kinds?: MemoryKind[];
  tags?: string[];
  conversationId?: string;
  limit?: number;
}

export interface MemoryStore {
  add(item: MemoryWrite): Promise<MemoryItem>;
  list(query: MemoryQuery): Promise<MemoryItem[]>;
}


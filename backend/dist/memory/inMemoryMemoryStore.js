const items = [];
export class InMemoryMemoryStore {
    async add(write) {
        const item = {
            id: `mem-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            userId: write.userId,
            kind: write.kind,
            title: write.title,
            content: write.content,
            tags: write.tags,
            conversationId: write.conversationId,
            createdAt: new Date().toISOString()
        };
        items.push(item);
        return item;
    }
    async list(query) {
        return items
            .filter((m) => {
            if (query.userId && m.userId != query.userId)
                return false;
            if (query.conversationId && m.conversationId !== query.conversationId)
                return false;
            if (query.kinds && !query.kinds.includes(m.kind))
                return false;
            if (query.tags && query.tags.length > 0) {
                if (!m.tags)
                    return false;
                const hasTag = query.tags.some((t) => m.tags.includes(t));
                if (!hasTag)
                    return false;
            }
            return true;
        })
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
            .slice(0, query.limit ?? 100);
    }
}
export const memoryStore = new InMemoryMemoryStore();

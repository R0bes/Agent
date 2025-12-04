import { makeSourceDescriptor } from "./sourceRegistry";
export const guiSourceAdapter = {
    kind: "gui",
    async toSourceMessages(raw) {
        const { conversationId, userId, text } = raw;
        const now = new Date().toISOString();
        const msg = {
            id: `src-gui-${now}-${Math.random().toString(16).slice(2)}`,
            source: makeSourceDescriptor("gui", "web-chat", "Web Chat"),
            userId,
            conversationId,
            content: text,
            createdAt: now,
            raw
        };
        return [msg];
    }
};

import { AbstractSource } from "../../base/AbstractSource";
/**
 * GUI Source Component
 *
 * Implements Source interface using AbstractSource base class.
 * - Source: Handles GUI/web chat messages
 */
class GUISource extends AbstractSource {
    constructor() {
        super(...arguments);
        this.id = "gui-web-chat";
        this.kind = "gui";
        this.label = "Web Chat";
    }
    async toSourceMessages(raw) {
        const { conversationId, userId, text } = raw;
        const now = new Date().toISOString();
        const msg = {
            id: `src-gui-${now}-${Math.random().toString(16).slice(2)}`,
            source: this.createSourceDescriptor("web-chat", "Web Chat"),
            userId,
            conversationId,
            content: text,
            createdAt: now,
            raw
        };
        return [msg];
    }
}
// Create singleton instance
const guiSourceInstance = new GUISource();
/**
 * GUI Source Component
 */
export const guiSourceComponent = {
    id: "gui-source",
    name: "GUI Source Component",
    description: "Handles GUI/web chat messages",
    source: guiSourceInstance
};

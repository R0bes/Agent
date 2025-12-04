/**
 * GUI Source Component
 *
 * Implements Source interface using AbstractSource base class.
 * - Source: Converts GUI chat messages into SourceMessages for the persona
 */
import { AbstractSource } from "../../base/AbstractSource";
/**
 * GUI Source implementation
 */
class GuiSource extends AbstractSource {
    constructor() {
        super(...arguments);
        this.id = "gui-source";
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
const guiSourceInstance = new GuiSource();
/**
 * GUI Source Component
 */
export const guiSourceComponent = {
    id: "gui-source",
    name: "GUI Source Component",
    description: "Converts GUI chat messages into SourceMessages for the persona",
    source: guiSourceInstance
};

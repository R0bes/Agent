import { AbstractSource } from "../../base/AbstractSource";
import type { Component, SourceMessage } from "../../types";
import type { SourceKind } from "../types";

/**
 * GUI Source Component
 * 
 * Implements Source interface using AbstractSource base class.
 * - Source: Handles GUI/web chat messages
 */
class GUISource extends AbstractSource {
  readonly id = "gui-web-chat";
  readonly kind: SourceKind = "gui";
  readonly label = "Web Chat";

  async toSourceMessages(raw: any): Promise<SourceMessage[]> {
    const { conversationId, userId, text } = raw;
    const now = new Date().toISOString();
    const msg: SourceMessage = {
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
export const guiSourceComponent: Component = {
  id: "gui-source",
  name: "GUI Source Component",
  description: "Handles GUI/web chat messages",
  source: guiSourceInstance
};


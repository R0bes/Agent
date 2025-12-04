/**
 * Abstract Source Base Class
 *
 * Sources that extend this class will automatically:
 * - Send events to the system event bus
 * - Handle source message conversion
 */
import { eventBus } from "../../events/eventBus";
import { logInfo, logDebug, logError } from "../../utils/logger";
export class AbstractSource {
    /**
     * Send a source message to the persona via event bus
     */
    async sendToPersona(message) {
        logDebug("Sending source message to persona", {
            sourceId: this.id,
            sourceKind: this.kind,
            messageId: message.id,
            userId: message.userId,
            conversationId: message.conversationId,
            contentLength: message.content.length
        });
        try {
            // Emit source_message event that persona listens to
            await eventBus.emit({
                type: "source_message",
                payload: message
            });
            logInfo("Source message sent to event bus", {
                sourceId: this.id,
                sourceKind: this.kind,
                messageId: message.id,
                userId: message.userId
            });
        }
        catch (err) {
            logError("Failed to send source message to event bus", err, {
                sourceId: this.id,
                sourceKind: this.kind,
                messageId: message.id
            });
            throw err;
        }
    }
    /**
     * Process incoming raw data and send to persona
     * This is the main entry point for sources
     */
    async process(raw) {
        logDebug("Processing incoming source data", {
            sourceId: this.id,
            sourceKind: this.kind,
            rawType: typeof raw
        });
        try {
            const messages = await this.toSourceMessages(raw);
            logInfo("Source messages converted", {
                sourceId: this.id,
                sourceKind: this.kind,
                messageCount: messages.length
            });
            // Send each message to the persona
            for (const message of messages) {
                await this.sendToPersona(message);
            }
        }
        catch (err) {
            logError("Failed to process source data", err, {
                sourceId: this.id,
                sourceKind: this.kind
            });
            throw err;
        }
    }
    /**
     * Create a source descriptor helper
     */
    createSourceDescriptor(id, label, meta) {
        return {
            id,
            kind: this.kind,
            label: label ?? this.label,
            meta
        };
    }
}

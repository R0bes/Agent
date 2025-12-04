import { logDebug, logInfo, logError } from "../utils/logger";
class EventBus {
    constructor() {
        this.handlers = new Map();
    }
    on(type, handler) {
        if (!this.handlers.has(type)) {
            this.handlers.set(type, new Set());
        }
        this.handlers.get(type).add(handler);
        logDebug("EventBus: Handler registered", {
            eventType: type,
            handlerCount: this.handlers.get(type).size
        });
    }
    off(type, handler) {
        const removed = this.handlers.get(type)?.delete(handler);
        if (removed) {
            logDebug("EventBus: Handler unregistered", {
                eventType: type,
                handlerCount: this.handlers.get(type)?.size || 0
            });
        }
    }
    async emit(event) {
        const handlers = this.handlers.get(event.type);
        logDebug("EventBus: Event emitted", {
            eventType: event.type,
            handlerCount: handlers?.size || 0
        });
        if (!handlers || handlers.size === 0) {
            logDebug("EventBus: No handlers for event type", {
                eventType: event.type
            });
            return;
        }
        const startTime = Date.now();
        let successCount = 0;
        let errorCount = 0;
        for (const handler of handlers) {
            try {
                await handler(event);
                successCount++;
            }
            catch (err) {
                errorCount++;
                logError("EventBus: Handler error", err, {
                    eventType: event.type
                });
            }
        }
        const duration = Date.now() - startTime;
        logInfo("EventBus: Event processed", {
            eventType: event.type,
            handlerCount: handlers.size,
            successCount,
            errorCount,
            duration: `${duration}ms`
        });
    }
}
export const eventBus = new EventBus();

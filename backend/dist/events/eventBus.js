// Note: EventBus does not log via logger to avoid circular logging
// Logs are published via event bus, which the LogManager handles
class EventBus {
    constructor() {
        this.handlers = new Map();
    }
    on(type, handler) {
        if (!this.handlers.has(type)) {
            this.handlers.set(type, new Set());
        }
        this.handlers.get(type).add(handler);
    }
    off(type, handler) {
        this.handlers.get(type)?.delete(handler);
    }
    async emit(event) {
        const handlers = this.handlers.get(event.type);
        if (!handlers || handlers.size === 0) {
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
                // Only log non-log events to avoid circular logging
                if (!event.type.startsWith("log_")) {
                    // Use console directly to avoid circular dependency
                    console.error(`EventBus: Handler error for ${event.type}:`, err);
                }
            }
        }
        // Only log non-log events to avoid circular logging
        if (!event.type.startsWith("log_") && process.env.DEBUG_EVENTBUS === "true") {
            const duration = Date.now() - startTime;
            console.debug(`EventBus: ${event.type} processed in ${duration}ms (${successCount} success, ${errorCount} errors)`);
        }
    }
}
export const eventBus = new EventBus();

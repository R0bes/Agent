// Note: EventBus does not log via logger to avoid circular logging
// Logs are published via event bus, which the LogManager handles

export type EventType =
  | "message_created"
  | "job_updated"
  | "memory_updated"
  | "source_message"
  | "scheduler_task_updated"
  | "gui_action"
  | "gui_response"
  | "avatar_poke"
  | "tool_execute"
  | "tool_executed"
  | "log_trace"
  | "log_debug"
  | "log_info"
  | "log_warn"
  | "log_error"
  | "log_fatal";

export interface BaseEvent<TType extends EventType = EventType, TPayload = any> {
  type: TType;
  payload: TPayload;
}

type Handler = (event: BaseEvent) => void | Promise<void>;

class EventBus {
  private handlers: Map<EventType, Set<Handler>> = new Map();

  on(type: EventType, handler: Handler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
  }

  off(type: EventType, handler: Handler) {
    this.handlers.get(type)?.delete(handler);
  }

  async emit(event: BaseEvent) {
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
      } catch (err) {
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

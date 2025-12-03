export type EventType =
  | "message_created"
  | "job_updated"
  | "memory_updated";

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
    if (!handlers) return;
    for (const handler of handlers) {
      await handler(event);
    }
  }
}

export const eventBus = new EventBus();

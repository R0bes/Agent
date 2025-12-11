/**
 * NATS Event Subscriber
 * 
 * Implements IEventSubscriber using NATS
 */

import type { IEventSubscriber, Event, EventHandler } from "../../../ports/output/subscribers/IEventSubscriber";
import { eventBus } from "../../../events/eventBus";
import { logError } from "../../../infrastructure/logging/logger";

export class NatsEventSubscriber implements IEventSubscriber {
  private handlers = new Map<string, Set<EventHandler>>();

  subscribe(eventType: string, handler: EventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
      
      // Subscribe to NATS event bus
      eventBus.on(eventType as any, async (event: any) => {
        const handlers = this.handlers.get(eventType);
        if (handlers) {
          for (const h of handlers) {
            try {
              await h({
                type: eventType,
                payload: event.payload || event,
                timestamp: event.timestamp || new Date().toISOString(),
                traceId: event.traceId
              });
            } catch (err) {
              logError("NatsEventSubscriber: Handler error", err, {
                eventType,
                handler: h.name || "anonymous"
              });
            }
          }
        }
      });
    }

    this.handlers.get(eventType)!.add(handler);
  }

  unsubscribe(eventType: string, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(eventType);
        // Note: NATS eventBus doesn't support unsubscribing, but handlers are removed
      }
    }
  }

  isConnected(): boolean {
    return eventBus.connected;
  }

  async connect(): Promise<void> {
    await eventBus.connect();
  }

  async disconnect(): Promise<void> {
    await eventBus.close();
  }
}


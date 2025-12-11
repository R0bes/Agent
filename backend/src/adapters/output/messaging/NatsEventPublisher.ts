/**
 * NATS Event Publisher
 * 
 * Implements IEventPublisher using NATS
 */

import type { IEventPublisher, Event } from "../../../ports/output/publishers/IEventPublisher";
import { eventBus } from "../../../events/eventBus";
import { logError } from "../../../infrastructure/logging/logger";

export class NatsEventPublisher implements IEventPublisher {
  async publish(event: Event): Promise<void> {
    try {
      await eventBus.emit({
        type: event.type as any,
        payload: event.payload
      });
    } catch (err) {
      logError("NatsEventPublisher: Failed to publish event", err);
      throw err;
    }
  }

  async publishBatch(events: Event[]): Promise<void> {
    try {
      await Promise.all(events.map(event => this.publish(event)));
    } catch (err) {
      logError("NatsEventPublisher: Failed to publish events batch", err);
      throw err;
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


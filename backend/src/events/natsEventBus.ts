/**
 * NATS-based Distributed Event Bus
 * 
 * Production-ready Event Bus über NATS.
 * Routet Events zwischen Services in verschiedenen Threads.
 */

import { connect, type NatsConnection } from 'nats';
import type { BaseEvent, EventType } from './eventBus';

type Handler = (event: BaseEvent) => void | Promise<void>;

/**
 * NATS Event Bus
 * 
 * Production-ready Event Bus using NATS for distributed event communication.
 */
class NatsEventBus {
  private nc: NatsConnection | null = null;
  private localHandlers = new Map<EventType, Set<Handler>>();
  private subscriptions: any[] = [];
  private isConnected = false;
  private natsUrl: string;

  constructor(natsUrl: string = process.env.NATS_URL || "nats://localhost:4222") {
    this.natsUrl = natsUrl;
  }

  /**
   * Connect to NATS
   */
  async connect(): Promise<void> {
    if (this.nc) {
      return; // Already connected
    }

    try {
      this.nc = await connect({ servers: this.natsUrl });
      this.isConnected = true;
      console.log("NATS Event Bus: Connected to NATS", { url: this.natsUrl });
    } catch (err) {
      console.error("NATS Event Bus: Failed to connect to NATS", err);
      throw err;
    }
  }

  /**
   * Emit event (publish to NATS and handle locally)
   */
  async emit(event: BaseEvent): Promise<void> {
    // 1. Handle local handlers first (main thread)
    await this.handleLocal(event);

    // 2. Publish to NATS (for other threads/services)
    if (this.nc && this.isConnected) {
      try {
        const eventData = JSON.stringify(event);
        this.nc.publish(`events.${event.type}`, new TextEncoder().encode(eventData));
      } catch (err) {
        console.error("NATS Event Bus: Failed to publish event", err, { eventType: event.type });
      }
    }
  }

  /**
   * Subscribe to event type
   */
  on(type: EventType, handler: Handler): void {
    // Add local handler
    if (!this.localHandlers.has(type)) {
      this.localHandlers.set(type, new Set());
    }
    this.localHandlers.get(type)!.add(handler);

    // Subscribe to NATS (if connected)
    if (this.nc && this.isConnected) {
      this.subscribeToNats(type);
    }
  }

  /**
   * Unsubscribe from event type
   */
  off(type: EventType, handler: Handler): void {
    const handlers = this.localHandlers.get(type);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.localHandlers.delete(type);
      }
    }
  }

  /**
   * Handle local event (main thread handlers)
   */
  private async handleLocal(event: BaseEvent): Promise<void> {
    const handlers = this.localHandlers.get(event.type);

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
          console.error(`NATS Event Bus: Handler error for ${event.type}:`, err);
        }
      }
    }

    // Only log non-log events to avoid circular logging
    if (!event.type.startsWith("log_") && process.env.DEBUG_EVENTBUS === "true") {
      const duration = Date.now() - startTime;
      console.debug(`NATS Event Bus: ${event.type} processed in ${duration}ms (${successCount} success, ${errorCount} errors)`);
    }
  }

  /**
   * Subscribe to NATS topic
   */
  private subscribeToNats(type: EventType): void {
    if (!this.nc) {
      return;
    }

    const sub = this.nc.subscribe(`events.${type}`);
    this.subscriptions.push(sub);

    // Handle messages asynchronously
    (async () => {
      for await (const msg of sub) {
        try {
          const event = JSON.parse(new TextDecoder().decode(msg.data)) as BaseEvent;
          // Only handle locally if it's not from this thread (avoid duplicate handling)
          // For now, we handle all events locally (NATS will deliver to all subscribers)
          await this.handleLocal(event);
        } catch (err) {
          console.error(`NATS Event Bus: Error handling event from NATS (${type}):`, err);
        }
      }
    })();
  }

  /**
   * Close NATS connection
   */
  async close(): Promise<void> {
    // Unsubscribe from all topics
    for (const sub of this.subscriptions) {
      sub.unsubscribe();
    }
    this.subscriptions = [];

    if (this.nc) {
      await this.nc.close();
      this.nc = null;
      this.isConnected = false;
      console.log("NATS Event Bus: Connection closed");
    }
  }

  /**
   * Check if connected
   */
  get connected(): boolean {
    return this.isConnected;
  }
}

export { NatsEventBus };


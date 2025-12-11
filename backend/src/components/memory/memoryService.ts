/**
 * Memory Service (Threaded)
 * 
 * Wrapper around MemoryStore to provide memory operations as a threaded service.
 */

import { ThreadedService } from "../base/ThreadedService";
import { memoryStore } from "./store";
import type { BaseEvent, EventType } from "../../events/eventBus";
import type {
  MemoryItem,
  MemoryWrite,
  MemoryUpdate,
  MemoryQuery,
  MemorySearchQuery
} from "./types";
import { logInfo, logDebug } from "../../utils/logger";

export class ThreadedMemoryService extends ThreadedService {
  readonly id = "memory";
  readonly name = "Memory Service";

  /**
   * Event types this service subscribes to
   */
  protected getSubscribedEvents(): EventType[] {
    return []; // Memory Service doesn't subscribe to events
  }

  /**
   * Service initialization (runs in thread)
   */
  protected async onCustomInitialize(): Promise<void> {
    this.logInfo("Initialized");
  }

  /**
   * Handle direct service calls (runs in thread)
   */
  protected async onMessage(message: { method: string; args: any }): Promise<any> {
    switch (message.method) {
      case "add":
        return await memoryStore.add(message.args.write as MemoryWrite);
      case "update":
        return await memoryStore.update(message.args.id as string, message.args.updates as MemoryUpdate);
      case "delete":
        return await memoryStore.delete(message.args.id as string);
      case "list":
        return await memoryStore.list(message.args.query as MemoryQuery);
      case "getById":
        return await memoryStore.getById(message.args.id as string);
      case "search":
        return await memoryStore.search(message.args.query as MemorySearchQuery);
      case "searchSimilar":
        return await memoryStore.searchSimilar(
          message.args.embedding as number[],
          message.args.options as {
            userId?: string;
            kinds?: string[];
            tags?: string[];
            limit?: number;
          }
        );
      default:
        throw new Error(`Unknown method: ${message.method}`);
    }
  }

  /**
   * Handle events (runs in thread)
   */
  protected async onEvent(event: BaseEvent): Promise<void> {
    // Memory Service doesn't handle events
  }
}


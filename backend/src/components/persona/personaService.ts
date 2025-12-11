/**
 * Persona Service Implementation (Threaded)
 * 
 * Core persona service that processes messages and coordinates with tools.
 */

import { ThreadedService } from "../base/ThreadedService";
import type { Component, SourceMessage } from "../types";
import type { BaseEvent, EventType } from "../../events/eventBus";
import { handleSourceMessage } from "./messageHandler";

export class ThreadedPersonaService extends ThreadedService {
  readonly id = "persona";
  readonly name = "Persona Service";

  /**
   * Event types this service subscribes to
   */
  protected getSubscribedEvents(): EventType[] {
    return ["source_message"]; // Persona processes source messages
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
    if (message.method === "processMessage") {
      const sourceMessage = message.args.sourceMessage as SourceMessage;
      return await handleSourceMessage(sourceMessage);
    }
    throw new Error(`Unknown method: ${message.method}`);
  }

  /**
   * Handle events (runs in thread)
   */
  protected async onEvent(event: BaseEvent): Promise<void> {
    if (event.type === "source_message") {
      const sourceMessage = event.payload as SourceMessage;
      try {
        const assistantMessage = await handleSourceMessage(sourceMessage);
        
        this.logInfo("Source message processed successfully", {
          messageId: sourceMessage.id,
          assistantMessageId: assistantMessage.id,
          userId: sourceMessage.userId
        });
        
        // Emit message_created event (will be published via NATS)
        await this.emitEvent("message_created", assistantMessage);
      } catch (err) {
        this.logError("Failed to process source message", err, {
          messageId: sourceMessage.id,
          userId: sourceMessage.userId
        });
      }
    }
  }
}


/**
 * LLM Service Implementation (Threaded)
 * 
 * Provides LLM functionality to the system via Ollama.
 */

import { ThreadedService } from "../base/ThreadedService";
import type { BaseEvent, EventType } from "../../events/eventBus";
import type { OllamaChatMessage, OllamaChatOptions } from "./ollamaClient";
import { ollamaChat as ollamaChatFunction } from "./ollamaClient";

const DEFAULT_MODEL = process.env.OLLAMA_MODEL || "llama3.2";
const BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

export class ThreadedLLMService extends ThreadedService {
  readonly id = "llm";
  readonly name = "LLM Service";

  /**
   * Event types this service subscribes to
   */
  protected getSubscribedEvents(): EventType[] {
    return []; // LLM Service doesn't subscribe to events
  }

  /**
   * Service initialization (runs in thread)
   */
  protected async onCustomInitialize(): Promise<void> {
    this.logInfo("Initialized", {
      model: DEFAULT_MODEL,
      baseUrl: BASE_URL
    });
  }

  /**
   * Handle direct service calls (runs in thread)
   */
  protected async onMessage(message: { method: string; args: any }): Promise<any> {
    if (message.method === "chat") {
      try {
        const messages = message.args.messages as OllamaChatMessage[];
        const opts: OllamaChatOptions = {
          model: message.args.model as string | undefined
        };
        const response = await ollamaChatFunction(messages, opts);
        return response;
      } catch (err: any) {
        throw new Error(err?.message ?? String(err));
      }
    }
    throw new Error(`Unknown method: ${message.method}`);
  }

  /**
   * Handle events (runs in thread)
   */
  protected async onEvent(event: BaseEvent): Promise<void> {
    // LLM Service doesn't handle events
  }
}


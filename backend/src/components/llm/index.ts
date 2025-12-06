/**
 * LLM Component
 * 
 * Implements both Service and Tool interfaces.
 * - Service: Provides LLM functionality to the system
 * - Tool: Can be called by agents via MCP endpoints
 */

import { AbstractService } from "../base/AbstractService";
import { AbstractTool } from "../base/AbstractTool";
import type { Component, ServiceInterface, ToolInterface, ToolContext, ToolResult } from "../types";
import type { OllamaChatMessage, OllamaChatOptions, OllamaChatResponse } from "./ollamaClient";
import { ollamaChat as ollamaChatFunction } from "./ollamaClient";
export { embeddingClient } from "./embeddingClient";
export type { EmbeddingResult } from "./embeddingClient";
import { logInfo, logDebug, logError } from "../../utils/logger";

const DEFAULT_MODEL = process.env.OLLAMA_MODEL || "llama3.2";
const BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

/**
 * LLM Service implementation
 */
class LLMService extends AbstractService {
  readonly id = "llm-service";
  readonly name = "LLM Service";
  readonly description = "Provides LLM functionality via Ollama";

  protected async onInitialize(): Promise<void> {
    logInfo("LLM Service: Initialized", {
      model: DEFAULT_MODEL,
      baseUrl: BASE_URL
    });
  }

  async handleCall(call: { method: string; params: Record<string, unknown> }): Promise<{ success: boolean; data?: unknown; error?: string }> {
    if (call.method === "chat") {
      try {
        const messages = call.params.messages as OllamaChatMessage[];
        const opts: OllamaChatOptions = {
          model: call.params.model as string | undefined
        };
        const response = await ollamaChatFunction(messages, opts);
        return this.success(response);
      } catch (err: any) {
        return this.error(err?.message ?? String(err));
      }
    }
    return this.error(`Unknown method: ${call.method}`);
  }
}

/**
 * LLM Tool implementation
 */
class LLMTool extends AbstractTool {
  readonly name = "llm_chat";
  readonly shortDescription = "Chat with the LLM to generate text, answer questions, or process information.";
  readonly description = "This tool allows you to interact with the Large Language Model (LLM) to generate text, answer questions, analyze content, or perform any text-based task. The LLM can understand context, follow instructions, and provide intelligent responses. Use this tool when you need natural language generation, question answering, text analysis, or any other language-related task.";
  readonly parameters = {
    type: "object",
    properties: {
      messages: {
        type: "array",
        description: "Array of chat messages with role and content",
        items: {
          type: "object",
          properties: {
            role: {
              type: "string",
              enum: ["system", "user", "assistant", "tool"],
              description: "Role of the message sender"
            },
            content: {
              type: "string",
              description: "Content of the message"
            }
          },
          required: ["role", "content"]
        }
      },
      model: {
        type: "string",
        description: "Model name to use (defaults to configured model)",
        default: DEFAULT_MODEL
      }
    },
    required: ["messages"]
  };
  readonly examples = [
    {
      input: {
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "What is the capital of France?" }
        ]
      },
      output: {
        ok: true,
        data: {
          model: "llama3.2",
          message: {
            role: "assistant",
            content: "The capital of France is Paris."
          }
        }
      },
      description: "Simple question answering"
    }
  ];

  async execute(args: { messages: OllamaChatMessage[]; model?: string }, ctx: ToolContext): Promise<ToolResult> {
    try {
      const opts: OllamaChatOptions = {
        model: args.model
      };
      
      const response = await ollamaChatFunction(args.messages, opts);
      
      return {
        ok: true,
        data: {
          model: response.model,
          message: response.message,
          done: response.done
        }
      };
    } catch (err: any) {
      return {
        ok: false,
        error: err?.message ?? String(err)
      };
    }
  }
}

// Create singleton instances
const llmServiceInstance = new LLMService();
const llmToolInstance = new LLMTool();

/**
 * LLM Component (Service + Tool)
 */
export const llmComponent: Component = {
  id: "llm",
  name: "LLM Component",
  description: "LLM functionality via Ollama, available as both service and tool",
  service: llmServiceInstance,
  tool: llmToolInstance,
  async initialize() {
    await llmServiceInstance.initialize();
  },
  async shutdown() {
    await llmServiceInstance.shutdown();
  }
};

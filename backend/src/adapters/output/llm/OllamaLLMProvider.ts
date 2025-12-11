/**
 * Ollama LLM Provider
 * 
 * Implements ILLMProvider using Ollama
 */

import type { ILLMProvider, LLMMessage, LLMOptions, LLMResponse } from "../../../ports/output/providers/ILLMProvider";
import { ollamaChat } from "../../../components/llm/ollamaClient";
import { logError } from "../../../infrastructure/logging/logger";

export class OllamaLLMProvider implements ILLMProvider {
  constructor(private readonly model: string = "llama3.2") {}

  async chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    try {
      const response = await ollamaChat({
        model: this.model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          name: msg.name,
          tool_calls: msg.toolCalls,
          tool_call_id: msg.toolCallId
        })),
        options: {
          temperature: options?.temperature,
          num_predict: options?.maxTokens,
          top_p: options?.topP,
          repeat_penalty: options?.frequencyPenalty,
          stop: options?.stop
        }
      });

      return {
        content: response.message.content,
        toolCalls: response.message.tool_calls?.map(tc => ({
          id: tc.id,
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments)
        })),
        finishReason: response.finish_reason,
        usage: response.usage ? {
          promptTokens: response.usage.prompt_tokens || 0,
          completionTokens: response.usage.completion_tokens || 0,
          totalTokens: response.usage.total_tokens || 0
        } : undefined
      };
    } catch (err) {
      logError("OllamaLLMProvider: Failed to generate chat", err);
      throw err;
    }
  }

  getModel(): string {
    return this.model;
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Try a simple request to check availability
      await ollamaChat({
        model: this.model,
        messages: [{ role: "user", content: "test" }],
        options: { num_predict: 1 }
      });
      return true;
    } catch {
      return false;
    }
  }
}


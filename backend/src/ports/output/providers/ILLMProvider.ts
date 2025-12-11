/**
 * LLM Provider (Output/Driven Port)
 * 
 * Defines the interface for LLM services
 */

export interface LLMMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  toolCalls?: Array<{
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string;
    };
  }>;
  toolCallId?: string;
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
}

export interface LLMResponse {
  content: string;
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }>;
  finishReason?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ILLMProvider {
  /**
   * Generate a chat completion
   */
  chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse>;
  
  /**
   * Get the model name
   */
  getModel(): string;
  
  /**
   * Check if the provider is available
   */
  isAvailable(): Promise<boolean>;
}


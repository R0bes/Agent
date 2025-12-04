/**
 * Minimal Ollama client using the /api/chat endpoint.
 *
 * Uses the local Ollama server running on http://localhost:11434 by default.
 * See: https://docs.ollama.com/api/chat
 */

export type OllamaRole = "system" | "user" | "assistant" | "tool";

export interface OllamaChatMessage {
  role: OllamaRole;
  content: string;
}

export interface OllamaChatOptions {
  model?: string;
  stream?: boolean;
  // options field can be used to pass parameters such as temperature, top_p, etc.
  options?: Record<string, unknown>;
}

export interface OllamaChatResponse {
  model: string;
  message: {
    role: OllamaRole;
    content: string;
  };
  done: boolean;
}

const DEFAULT_MODEL = process.env.OLLAMA_MODEL || "llama3.2";
const BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

export async function ollamaChat(
  messages: OllamaChatMessage[],
  opts: OllamaChatOptions = {}
): Promise<OllamaChatResponse> {
  const body = {
    model: opts.model ?? DEFAULT_MODEL,
    messages,
    stream: opts.stream ?? false,
    options: opts.options ?? {}
  };

  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ollama chat error: ${res.status} ${res.statusText} - ${text}`);
  }

  const data = (await res.json()) as OllamaChatResponse;
  return data;
}


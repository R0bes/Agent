import type { SourceDescriptor } from "../sources/types";

export interface ToolContext {
  userId: string;
  conversationId: string;
  /** where did the request originate (gui, scheduler, whatsapp, etc.) */
  source: SourceDescriptor;
  /** trace / logging correlation id */
  traceId?: string;
  /** arbitrary metadata, e.g. auth tokens, organisation ids, etc. */
  meta?: Record<string, unknown>;
}

export interface ToolResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

export interface ToolExample {
  /** Example input arguments */
  input: Record<string, unknown>;
  /** Example output */
  output: ToolResult;
  /** Optional description of what this example demonstrates */
  description?: string;
}


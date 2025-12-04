export type SourceKind =
  | "gui"
  | "scheduler"
  | "whatsapp"
  | "email"
  | "telegram"
  | "system"
  | "other";

export interface SourceDescriptor {
  /** unique id of the source within its kind, e.g. "web-chat", "cron-09", "whatsapp-bot" */
  id: string;
  kind: SourceKind;
  /** optional human-readable label */
  label?: string;
  /** arbitrary metadata (e.g. phone number, channel-specific ids) */
  meta?: Record<string, unknown>;
}

/**
 * Normalised inbound event from any source.
 * This is what the persona will primarily see.
 */
export interface SourceMessage {
  id: string;
  source: SourceDescriptor;
  userId: string;
  conversationId: string;
  content: string;
  createdAt: string;
  /** raw payload from upstream channel, for logging / debugging */
  raw?: unknown;
}


/**
 * Unified Log Format
 * 
 * Defines a consistent log format used throughout the system.
 */

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

export interface LogEntry {
  id: string;
  timestamp: string; // ISO 8601
  level: LogLevel;
  message: string;
  category?: string; // e.g., "api", "websocket", "tool", "worker"
  context?: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  metadata?: {
    userId?: string;
    conversationId?: string;
    requestId?: string;
    componentId?: string;
    serviceId?: string;
    duration?: string;
    [key: string]: unknown;
  };
}

/**
 * Create a standardized log entry
 */
export function createLogEntry(
  level: LogLevel,
  message: string,
  options?: {
    category?: string;
    context?: Record<string, unknown>;
    error?: Error | unknown;
    metadata?: LogEntry["metadata"];
  }
): LogEntry {
  const entry: LogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    timestamp: new Date().toISOString(),
    level,
    message,
    category: options?.category,
    context: options?.context,
    metadata: options?.metadata
  };

  // Extract error information if provided
  if (options?.error) {
    if (options.error instanceof Error) {
      entry.error = {
        message: options.error.message,
        stack: options.error.stack,
        code: (options.error as any).code
      };
    } else {
      entry.error = {
        message: String(options.error)
      };
    }
  }

  return entry;
}

/**
 * Format log entry for console output
 * Plain text format without ANSI colors (colors added by cli.py based on level prefix)
 */
export function formatLogForConsole(entry: LogEntry): string {
  const time = new Date(entry.timestamp).toLocaleTimeString("de-CH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  
  // Level indicator: single char for compact display
  const levelIndicator: Record<LogLevel, string> = {
    trace: "T",
    debug: "D", 
    info: "I",
    warn: "W",
    error: "E",
    fatal: "F"
  };
  const level = levelIndicator[entry.level] || "?";
  
  const category = entry.category ? `[${entry.category}] ` : "";
  
  let message = `${category}${entry.message}`;
  
  // Add metadata if present
  if (entry.metadata) {
    const metaParts: string[] = [];
    if (entry.metadata.requestId) metaParts.push(`req:${entry.metadata.requestId}`);
    if (entry.metadata.userId) metaParts.push(`user:${entry.metadata.userId}`);
    if (entry.metadata.duration) metaParts.push(`⏱ ${entry.metadata.duration}`);
    if (metaParts.length > 0) {
      message += ` (${metaParts.join(", ")})`;
    }
  }
  
  // Add error if present
  if (entry.error) {
    message += ` | Error: ${entry.error.message}`;
  }
  
  // Format: "HH:MM:SS L message" where L is level indicator
  return `${time} ${level} ${message}`;
}

/**
 * Format log entry for file output (JSON)
 */
export function formatLogForFile(entry: LogEntry): string {
  return JSON.stringify(entry);
}


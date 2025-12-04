/**
 * Central Logger Utility
 * 
 * Provides structured logging throughout the system.
 * Publishes logs via event bus for centralized handling.
 */

import { eventBus } from "../events/eventBus";
import { createLogEntry, type LogEntry, type LogLevel } from "./logFormat";
import { getLogManager } from "./logManager";

/**
 * Publish log entry via event bus
 */
function publishLogEntry(
  level: LogLevel,
  message: string,
  options?: {
    category?: string;
    context?: Record<string, unknown>;
    error?: Error | unknown;
    metadata?: LogEntry["metadata"];
  }
): void {
  const entry = createLogEntry(level, message, options);
  
  // Publish via event bus (LogManager handles storage and output)
  const eventType = `log_${level}` as const;
  eventBus.emit({
    type: eventType,
    payload: entry
  });
}

/**
 * Get all logs, optionally filtered by level
 */
export function getLogs(level?: LogLevel): LogEntry[] {
  const logManager = getLogManager();
  return logManager.getLogs(level);
}

/**
 * Log an info message
 */
export function logInfo(
  message: string,
  context?: Record<string, unknown>,
  metadata?: LogEntry["metadata"]
): void {
  publishLogEntry("info", message, {
    context: context ? compactLogContext(context) : undefined,
    metadata
  });
}

/**
 * Log a debug message
 */
export function logDebug(
  message: string,
  context?: Record<string, unknown>,
  metadata?: LogEntry["metadata"]
): void {
  publishLogEntry("debug", message, {
    context: context ? compactLogContext(context) : undefined,
    metadata
  });
}

/**
 * Log a warning message
 */
export function logWarn(
  message: string,
  context?: Record<string, unknown>,
  metadata?: LogEntry["metadata"]
): void {
  publishLogEntry("warn", message, {
    context: context ? compactLogContext(context) : undefined,
    metadata
  });
}

/**
 * Log an error message
 */
export function logError(
  message: string,
  error?: Error | unknown,
  context?: Record<string, unknown>,
  metadata?: LogEntry["metadata"]
): void {
  publishLogEntry("error", message, {
    context: context ? compactLogContext(context) : undefined,
    error,
    metadata
  });
}

/**
 * Log a trace message (very detailed)
 */
export function logTrace(
  message: string,
  context?: Record<string, unknown>,
  metadata?: LogEntry["metadata"]
): void {
  publishLogEntry("trace", message, {
    context: context ? compactLogContext(context) : undefined,
    metadata
  });
}

/**
 * Log a fatal message (critical error)
 */
export function logFatal(
  message: string,
  error?: Error | unknown,
  context?: Record<string, unknown>,
  metadata?: LogEntry["metadata"]
): void {
  publishLogEntry("fatal", message, {
    context: context ? compactLogContext(context) : undefined,
    error,
    metadata
  });
}

/**
 * Kompaktiere Log-Context: Entferne redundante oder zu lange Felder
 */
function compactLogContext(context: Record<string, unknown>): Record<string, unknown> {
  const compact: Record<string, unknown> = {};
  const skipFields = ["req", "res", "hostname", "remotePort"]; // Redundante Felder
  
  for (const [key, value] of Object.entries(context)) {
    if (skipFields.includes(key)) continue;
    
    // Kürze lange Strings
    if (typeof value === "string" && value.length > 100) {
      compact[key] = value.substring(0, 100) + "...";
    }
    // Vereinfache verschachtelte Objekte
    else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>;
      // Nur wichtige Felder behalten
      if (Object.keys(obj).length > 5) {
        const important = ["message", "code", "statusCode", "error", "type"];
        const simplified: Record<string, unknown> = {};
        for (const k of important) {
          if (k in obj) simplified[k] = obj[k];
        }
        compact[key] = Object.keys(simplified).length > 0 ? simplified : "...";
      } else {
        compact[key] = value;
      }
    }
    // Behalte alles andere
    else {
      compact[key] = value;
    }
  }
  
  return compact;
}


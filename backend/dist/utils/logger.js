/**
 * Central Logger Utility
 *
 * Provides structured logging throughout the system.
 * Publishes logs via event bus for centralized handling.
 */
import { eventBus } from "../events/eventBus";
import { createLogEntry } from "./logFormat";
import { getLogManager } from "./logManager";
/**
 * Publish log entry via event bus
 */
function publishLogEntry(level, message, options) {
    const entry = createLogEntry(level, message, options);
    // Publish via event bus (LogManager handles storage and output)
    const eventType = `log_${level}`;
    eventBus.emit({
        type: eventType,
        payload: entry
    });
}
/**
 * Get all logs, optionally filtered by level
 */
export function getLogs(level) {
    const logManager = getLogManager();
    return logManager.getLogs(level);
}
/**
 * Log an info message
 */
export function logInfo(message, context, metadata) {
    publishLogEntry("info", message, {
        context: context ? compactLogContext(context) : undefined,
        metadata
    });
}
/**
 * Log a debug message
 */
export function logDebug(message, context, metadata) {
    publishLogEntry("debug", message, {
        context: context ? compactLogContext(context) : undefined,
        metadata
    });
}
/**
 * Log a warning message
 */
export function logWarn(message, context, metadata) {
    publishLogEntry("warn", message, {
        context: context ? compactLogContext(context) : undefined,
        metadata
    });
}
/**
 * Log an error message
 */
export function logError(message, error, context, metadata) {
    publishLogEntry("error", message, {
        context: context ? compactLogContext(context) : undefined,
        error,
        metadata
    });
}
/**
 * Log a trace message (very detailed)
 */
export function logTrace(message, context, metadata) {
    publishLogEntry("trace", message, {
        context: context ? compactLogContext(context) : undefined,
        metadata
    });
}
/**
 * Log a fatal message (critical error)
 */
export function logFatal(message, error, context, metadata) {
    publishLogEntry("fatal", message, {
        context: context ? compactLogContext(context) : undefined,
        error,
        metadata
    });
}
/**
 * Kompaktiere Log-Context: Entferne redundante oder zu lange Felder
 */
function compactLogContext(context) {
    const compact = {};
    const skipFields = ["req", "res", "hostname", "remotePort"]; // Redundante Felder
    for (const [key, value] of Object.entries(context)) {
        if (skipFields.includes(key))
            continue;
        // Kürze lange Strings
        if (typeof value === "string" && value.length > 100) {
            compact[key] = value.substring(0, 100) + "...";
        }
        // Vereinfache verschachtelte Objekte
        else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
            const obj = value;
            // Nur wichtige Felder behalten
            if (Object.keys(obj).length > 5) {
                const important = ["message", "code", "statusCode", "error", "type"];
                const simplified = {};
                for (const k of important) {
                    if (k in obj)
                        simplified[k] = obj[k];
                }
                compact[key] = Object.keys(simplified).length > 0 ? simplified : "...";
            }
            else {
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

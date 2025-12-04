/**
 * Custom Fastify Logger
 * 
 * Implements Fastify's logger interface using our unified logging system.
 * All Fastify logs (requests, errors, etc.) go through our event bus.
 */

import { logInfo, logDebug, logWarn, logError, logTrace, logFatal } from "./logger";
import type { LogLevel } from "./logFormat";
import type { FastifyLoggerInstance } from "fastify";

/**
 * Extract category from Fastify log context
 */
function extractCategory(obj: any): string {
  if (obj.req?.url) return "api";
  if (obj.url?.includes("/ws")) return "websocket";
  if (obj.componentId) return obj.componentId;
  if (obj.serviceId) return obj.serviceId;
  return "fastify";
}

/**
 * Extract metadata from Fastify log object
 */
function extractMetadata(obj: any): any {
  const metadata: any = {};
  if (obj.reqId) metadata.requestId = obj.reqId;
  if (obj.userId) metadata.userId = obj.userId;
  if (obj.duration) metadata.duration = obj.duration;
  if (obj.componentId) metadata.componentId = obj.componentId;
  if (obj.serviceId) metadata.serviceId = obj.serviceId;
  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

/**
 * Extract context (everything except standard Fastify fields)
 */
function extractContext(obj: any): Record<string, unknown> | undefined {
  const skipFields = ["level", "time", "pid", "hostname", "msg", "message", 
                      "reqId", "userId", "duration", "componentId", "serviceId", 
                      "category", "req", "res", "err", "error"];
  
  const context: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!skipFields.includes(key) && value !== undefined) {
      context[key] = value;
    }
  }
  
  return Object.keys(context).length > 0 ? context : undefined;
}

/**
 * Create Fastify-compatible logger instance
 */
export function createFastifyLogger(level: string = "info"): FastifyLoggerInstance {
  const minLevel: LogLevel = (level as LogLevel) || "info";
  const levelOrder: LogLevel[] = ["trace", "debug", "info", "warn", "error", "fatal"];
  const minLevelIndex = levelOrder.indexOf(minLevel);

  const shouldLog = (logLevel: LogLevel): boolean => {
    const logIndex = levelOrder.indexOf(logLevel);
    return logIndex >= minLevelIndex;
  };

  const logger: FastifyLoggerInstance = {
    info: (obj: any, msg?: string) => {
      if (!shouldLog("info")) return;
      const message = msg || obj.msg || obj.message || "";
      const category = extractCategory(obj);
      const metadata = extractMetadata(obj);
      const context = extractContext(obj);
      const error = obj.err || obj.error;
      
      if (error) {
        logError(message, error, context, { ...metadata, category });
      } else {
        logInfo(message, context, { ...metadata, category });
      }
    },

    debug: (obj: any, msg?: string) => {
      if (!shouldLog("debug")) return;
      const message = msg || obj.msg || obj.message || "";
      const category = extractCategory(obj);
      const metadata = extractMetadata(obj);
      const context = extractContext(obj);
      logDebug(message, context, { ...metadata, category });
    },

    warn: (obj: any, msg?: string) => {
      if (!shouldLog("warn")) return;
      const message = msg || obj.msg || obj.message || "";
      const category = extractCategory(obj);
      const metadata = extractMetadata(obj);
      const context = extractContext(obj);
      const error = obj.err || obj.error;
      
      if (error) {
        logError(message, error, context, { ...metadata, category });
      } else {
        logWarn(message, context, { ...metadata, category });
      }
    },

    error: (obj: any, msg?: string) => {
      if (!shouldLog("error")) return;
      const message = msg || obj.msg || obj.message || "";
      const category = extractCategory(obj);
      const metadata = extractMetadata(obj);
      const context = extractContext(obj);
      const error = obj.err || obj.error;
      logError(message, error, context, { ...metadata, category });
    },

    fatal: (obj: any, msg?: string) => {
      if (!shouldLog("fatal")) return;
      const message = msg || obj.msg || obj.message || "";
      const category = extractCategory(obj);
      const metadata = extractMetadata(obj);
      const context = extractContext(obj);
      const error = obj.err || obj.error;
      logFatal(message, error, context, { ...metadata, category });
    },

    trace: (obj: any, msg?: string) => {
      if (!shouldLog("trace")) return;
      const message = msg || obj.msg || obj.message || "";
      const category = extractCategory(obj);
      const metadata = extractMetadata(obj);
      const context = extractContext(obj);
      logTrace(message, context, { ...metadata, category });
    },

    child: (bindings: any) => {
      // Fastify's child() creates a new logger with bound context
      // We merge bindings into the log object on each call
      return {
        ...logger,
        info: (obj: any, msg?: string) => logger.info({ ...bindings, ...obj }, msg),
        debug: (obj: any, msg?: string) => logger.debug({ ...bindings, ...obj }, msg),
        warn: (obj: any, msg?: string) => logger.warn({ ...bindings, ...obj }, msg),
        error: (obj: any, msg?: string) => logger.error({ ...bindings, ...obj }, msg),
        fatal: (obj: any, msg?: string) => logger.fatal({ ...bindings, ...obj }, msg),
        trace: (obj: any, msg?: string) => logger.trace({ ...bindings, ...obj }, msg),
        child: (newBindings: any) => logger.child({ ...bindings, ...newBindings })
      };
    }
  };

  return logger;
}


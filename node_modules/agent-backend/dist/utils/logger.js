/**
 * Central Logger Utility
 *
 * Provides structured logging throughout the system.
 * Uses Fastify's logger when available, falls back to console.
 */
let fastifyLogger = null;
/**
 * Set the Fastify logger instance
 */
export function setLogger(logger) {
    fastifyLogger = logger;
}
/**
 * Get the current logger
 */
function getLogger() {
    return fastifyLogger || console;
}
/**
 * Log an info message
 */
export function logInfo(message, context) {
    const logger = getLogger();
    if (logger.info) {
        logger.info(context || {}, message);
    }
    else {
        console.log(`[INFO] ${message}`, context || {});
    }
}
/**
 * Log a debug message
 */
export function logDebug(message, context) {
    const logger = getLogger();
    if (logger.debug) {
        logger.debug(context || {}, message);
    }
    else {
        console.debug(`[DEBUG] ${message}`, context || {});
    }
}
/**
 * Log a warning message
 */
export function logWarn(message, context) {
    const logger = getLogger();
    if (logger.warn) {
        logger.warn(context || {}, message);
    }
    else {
        console.warn(`[WARN] ${message}`, context || {});
    }
}
/**
 * Log an error message
 */
export function logError(message, error, context) {
    const logger = getLogger();
    const errorContext = {
        ...context,
        err: error instanceof Error ? error : { message: String(error) }
    };
    if (logger.error) {
        logger.error(errorContext, message);
    }
    else {
        console.error(`[ERROR] ${message}`, errorContext);
    }
}
/**
 * Log a trace message (very detailed)
 */
export function logTrace(message, context) {
    const logger = getLogger();
    if (logger.trace) {
        logger.trace(context || {}, message);
    }
    else {
        console.trace(`[TRACE] ${message}`, context || {});
    }
}

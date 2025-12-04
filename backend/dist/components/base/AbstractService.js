/**
 * Abstract Service Base Class
 *
 * Services that extend this class will automatically:
 * - Integrate into the system lifecycle
 * - Provide gRPC or other inter-service communication endpoints
 */
import { logInfo, logDebug, logError, logWarn } from "../../utils/logger";
/**
 * Abstract Service Base Class
 *
 * Provides lifecycle management and inter-service communication
 */
export class AbstractService {
    constructor() {
        this._initialized = false;
        this._shutdown = false;
    }
    /**
     * Initialize the service - can be overridden by subclasses
     */
    async initialize() {
        if (this._initialized) {
            logWarn("Service already initialized", { serviceId: this.id });
            throw new Error(`Service ${this.id} is already initialized`);
        }
        logInfo("Initializing service", {
            serviceId: this.id,
            serviceName: this.name
        });
        const startTime = Date.now();
        try {
            await this.onInitialize();
            const duration = Date.now() - startTime;
            this._initialized = true;
            logInfo("Service initialized successfully", {
                serviceId: this.id,
                serviceName: this.name,
                duration: `${duration}ms`
            });
        }
        catch (err) {
            logError("Service initialization failed", err, {
                serviceId: this.id,
                serviceName: this.name
            });
            throw err;
        }
    }
    /**
     * Shutdown the service - can be overridden by subclasses
     */
    async shutdown() {
        if (this._shutdown) {
            logDebug("Service already shut down", { serviceId: this.id });
            return;
        }
        logInfo("Shutting down service", {
            serviceId: this.id,
            serviceName: this.name
        });
        const startTime = Date.now();
        try {
            await this.onShutdown();
            const duration = Date.now() - startTime;
            this._shutdown = true;
            logInfo("Service shut down successfully", {
                serviceId: this.id,
                serviceName: this.name,
                duration: `${duration}ms`
            });
        }
        catch (err) {
            logError("Service shutdown failed", err, {
                serviceId: this.id,
                serviceName: this.name
            });
            throw err;
        }
    }
    /**
     * Handle service call with logging wrapper
     */
    async handleCallWithLogging(call) {
        if (!this._initialized) {
            logWarn("Service call on uninitialized service", {
                serviceId: this.id,
                method: call.method
            });
            return this.error("Service not initialized");
        }
        logDebug("Service call received", {
            serviceId: this.id,
            method: call.method,
            paramsKeys: Object.keys(call.params)
        });
        const startTime = Date.now();
        try {
            const response = await this.handleCall(call);
            const duration = Date.now() - startTime;
            if (response.success) {
                logInfo("Service call succeeded", {
                    serviceId: this.id,
                    method: call.method,
                    duration: `${duration}ms`
                });
            }
            else {
                logWarn("Service call failed", {
                    serviceId: this.id,
                    method: call.method,
                    error: response.error,
                    duration: `${duration}ms`
                });
            }
            return response;
        }
        catch (err) {
            const duration = Date.now() - startTime;
            logError("Service call threw error", err, {
                serviceId: this.id,
                method: call.method,
                duration: `${duration}ms`
            });
            return this.error(err instanceof Error ? err.message : String(err));
        }
    }
    /**
     * Override this method for custom initialization logic
     */
    async onInitialize() {
        // Default: no-op, can be overridden
    }
    /**
     * Override this method for custom shutdown logic
     */
    async onShutdown() {
        // Default: no-op, can be overridden
    }
    /**
     * Check if service is initialized
     */
    get isInitialized() {
        return this._initialized;
    }
    /**
     * Check if service is shut down
     */
    get isShutdown() {
        return this._shutdown;
    }
    /**
     * Create a successful service response
     */
    success(data) {
        return {
            success: true,
            data
        };
    }
    /**
     * Create an error service response
     */
    error(message) {
        return {
            success: false,
            error: message
        };
    }
}

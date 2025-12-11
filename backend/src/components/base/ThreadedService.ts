/**
 * Threaded Service Base Class
 * 
 * Abstract base class for services that run in Node.js Worker Threads.
 * Services extending this class will be managed by the Execution Service.
 * Includes built-in gRPC server support, logging, and event handling.
 */

import type { BaseEvent, EventType } from "../../events/eventBus";
import type { NatsConnection } from "nats";
import * as grpc from '@grpc/grpc-js';
import { createGrpcServer } from './grpcServiceWrapper';
import { logInfo, logDebug, logError, logWarn } from "../../utils/logger";

/**
 * Abstrakte Basisklasse für Thread-basierte Services
 * 
 * Bietet gemeinsame Funktionalität für alle Services:
 * - gRPC Server Management
 * - NATS Client Management
 * - Event Subscription Handling
 * - Logging Utilities
 * - Health Check
 */
export abstract class ThreadedService {
  abstract readonly id: string;
  abstract readonly name: string;
  
  protected natsClient?: NatsConnection;
  private grpcServer?: grpc.Server;
  private grpcPort?: number;
  private isInitialized = false;
  private isShuttingDown = false;
  
  /**
   * Set NATS client (called by Execution Service)
   */
  setNatsClient(nc: NatsConnection): void {
    this.natsClient = nc;
    logDebug(`${this.name}: NATS client set`);
  }

  /**
   * Set gRPC port (called by Execution Service)
   */
  setGrpcPort(port: number): void {
    this.grpcPort = port;
    logDebug(`${this.name}: gRPC port set to ${port}`);
  }

  /**
   * Get gRPC port
   */
  getGrpcPort(): number | undefined {
    return this.grpcPort;
  }

  /**
   * Check if service is initialized
   */
  protected get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Check if service is shutting down
   */
  protected get shuttingDown(): boolean {
    return this.isShuttingDown;
  }

  /**
   * Start gRPC server (called during initialization)
   */
  protected startGrpcServer(): void {
    if (!this.grpcPort) {
      throw new Error(`gRPC port not set for service ${this.id}`);
    }

    logDebug(`${this.name}: Starting gRPC server on port ${this.grpcPort}`);
    this.grpcServer = createGrpcServer(this, this.grpcPort);
  }

  /**
   * Stop gRPC server (called during shutdown)
   */
  protected async stopGrpcServer(): Promise<void> {
    if (this.grpcServer) {
      logDebug(`${this.name}: Stopping gRPC server`);
      return new Promise((resolve) => {
        this.grpcServer!.tryShutdown(() => {
          logDebug(`${this.name}: gRPC server stopped`);
          resolve();
        });
      });
    }
  }
  
  /**
   * Service-Initialisierung (läuft im Thread)
   * Override this to add custom initialization, but call super.onInitialize() first
   */
  protected async onInitialize(): Promise<void> {
    if (this.isInitialized) {
      logWarn(`${this.name}: Already initialized, skipping`);
      return;
    }

    logInfo(`${this.name}: Initializing...`);
    
    // Start gRPC server automatically
    this.startGrpcServer();
    
    // Call custom initialization hook
    await this.onCustomInitialize();
    
    this.isInitialized = true;
    logInfo(`${this.name}: Initialized successfully`);
  }
  
  /**
   * Service-Shutdown (läuft im Thread)
   * Override this to add custom shutdown, but call super.onShutdown() at the end
   */
  protected async onShutdown(): Promise<void> {
    if (this.isShuttingDown) {
      logWarn(`${this.name}: Already shutting down, skipping`);
      return;
    }

    this.isShuttingDown = true;
    logInfo(`${this.name}: Shutting down...`);
    
    // Call custom shutdown hook first
    await this.onCustomShutdown();
    
    // Stop gRPC server automatically
    await this.stopGrpcServer();
    
    this.isInitialized = false;
    this.isShuttingDown = false;
    logInfo(`${this.name}: Shutdown complete`);
  }

  /**
   * Custom initialization hook - override this instead of onInitialize
   * Called after gRPC server is started
   */
  protected async onCustomInitialize(): Promise<void> {
    // Override in subclasses for custom initialization
  }

  /**
   * Custom shutdown hook - override this instead of onShutdown
   * Called before gRPC server is stopped
   */
  protected async onCustomShutdown(): Promise<void> {
    // Override in subclasses for custom shutdown
  }
  
  /**
   * Message-Handler für direkte Calls (läuft im Thread)
   * This is called by the gRPC server wrapper
   */
  protected abstract onMessage(message: { method: string; args: any }): Promise<any>;

  /**
   * Healthcheck-Methode (Standard-Implementierung)
   * Override if needed for custom health checks
   */
  protected async healthcheck(): Promise<{ status: string; timestamp: number; service: string }> {
    return {
      status: this.isInitialized && !this.isShuttingDown ? "healthy" : "unhealthy",
      timestamp: Date.now(),
      service: this.id
    };
  }
  
  /**
   * Event-Handler (läuft im Thread)
   * Default implementation does nothing - override for event handling
   */
  protected async onEvent(event: BaseEvent): Promise<void> {
    // Default: no event handling
    // Override in subclasses to handle events
  }
  
  /**
   * Event-Typen, die dieser Service abonniert
   * Default: empty array - override to subscribe to events
   */
  protected getSubscribedEvents(): EventType[] {
    return [];
  }

  /**
   * Emit event via Event Bus
   * Helper method for services to emit events
   */
  protected async emitEvent(type: EventType, payload: any): Promise<void> {
    if (!this.natsClient) {
      logWarn(`${this.name}: Cannot emit event - NATS client not set`);
      return;
    }

    const { eventBus } = await import("../../events/eventBus");
    await eventBus.emit({ type, payload });
    logDebug(`${this.name}: Event emitted`, { type });
  }

  /**
   * Log helper methods for consistent logging
   */
  protected logInfo(message: string, meta?: any): void {
    logInfo(`${this.name}: ${message}`, meta);
  }

  protected logDebug(message: string, meta?: any): void {
    logDebug(`${this.name}: ${message}`, meta);
  }

  protected logError(message: string, err: any, meta?: any): void {
    logError(`${this.name}: ${message}`, err, meta);
  }

  protected logWarn(message: string, meta?: any): void {
    logWarn(`${this.name}: ${message}`, meta);
  }
}


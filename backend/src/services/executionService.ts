/**
 * Execution Service
 * 
 * Verwaltet Node.js Worker Threads für alle Services.
 * Singleton Service für Thread-Lifecycle-Management.
 */

import { Worker } from 'worker_threads';
import { connect, type NatsConnection } from 'nats';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { ThreadedService } from '../components/base/ThreadedService';
import { grpcClientFactory } from './grpcClientFactory';
import { logInfo, logDebug, logError, logWarn } from '../utils/logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ServiceRegistration {
  serviceId: string;
  serviceClass: new () => ThreadedService;
}

interface PendingCall {
  id: string;
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

/**
 * Execution Service
 * 
 * Manages the lifecycle of services running in Worker Threads.
 */
class ExecutionService {
  private threads = new Map<string, Worker>();
  private serviceRegistrations = new Map<string, ServiceRegistration>();
  private pendingCalls = new Map<string, PendingCall>();
  private natsClient: NatsConnection | null = null;
  private natsUrl: string;
  private callCounter = 0;
  private isShuttingDown = false;

  constructor(natsUrl: string = process.env.NATS_URL || "nats://localhost:4222") {
    this.natsUrl = natsUrl;
  }

  /**
   * Connect to NATS
   */
  async connectNats(): Promise<void> {
    if (this.natsClient) {
      logWarn("Execution Service: NATS already connected");
      return;
    }

    try {
      this.natsClient = await connect({ servers: this.natsUrl });
      logInfo("Execution Service: Connected to NATS", { url: this.natsUrl });
    } catch (err) {
      logError("Execution Service: Failed to connect to NATS", err);
      throw err;
    }
  }

  /**
   * Register a service (must be called before startService)
   */
  registerService(serviceId: string, serviceClass: new () => ThreadedService): void {
    if (this.serviceRegistrations.has(serviceId)) {
      logWarn("Execution Service: Service already registered", { serviceId });
      return;
    }

    this.serviceRegistrations.set(serviceId, {
      serviceId,
      serviceClass
    });

    logDebug("Execution Service: Service registered", { serviceId });
  }

  /**
   * Starte Service in eigenem Thread
   */
  async startService(serviceId: string): Promise<void> {
    logInfo(`[EXECUTION-SERVICE] startService called for: ${serviceId}`, { 
      pid: process.pid, 
      hasThread: this.threads.has(serviceId),
      threadCount: this.threads.size 
    });
    
    if (this.threads.has(serviceId)) {
      logWarn("Execution Service: Service already started", { serviceId });
      return;
    }

    const registration = this.serviceRegistrations.get(serviceId);
    if (!registration) {
      throw new Error(`Service "${serviceId}" not registered. Call registerService() first.`);
    }

    if (!this.natsClient) {
      throw new Error("NATS not connected. Call connectNats() first.");
    }

    // Get gRPC port for this service
    const grpcPort = grpcClientFactory.getServicePort(serviceId);

    try {
      // Create worker thread
      // In development (tsx), use wrapper script with tsx loader
      // In production, use compiled .js file
      const isDev = process.env.NODE_ENV !== 'production';
      let workerPath: string;
      let execArgv: string[] | undefined;
      
      if (isDev) {
        // Use wrapper that loads tsx
        // The wrapper already calls register() from tsx/esm/api, so we don't need --loader flag
        workerPath = join(__dirname, "serviceThreadWrapper.mjs");
        // No execArgv needed - wrapper handles tsx registration internally
        execArgv = undefined;
      } else {
        workerPath = join(__dirname, "serviceThread.js");
      }
      
      logInfo(`[EXECUTION-SERVICE] Creating worker for ${serviceId}`, { 
        workerPath, 
        grpcPort,
        execArgv,
        isDev,
        pid: process.pid
      });
      
      const worker = new Worker(workerPath, {
        workerData: {
          serviceId: registration.serviceId,
          natsUrl: this.natsUrl,
          grpcPort: grpcPort
        },
        execArgv
      });

      // Wait for service to be ready
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error(`Service "${serviceId}" initialization timeout`));
        }, 30000); // 30 second timeout

        worker.on('message', (message: any) => {
          if (message.type === "ready" && message.serviceId === serviceId) {
            clearTimeout(timeout);
            resolve();
          } else if (message.type === "error" && message.serviceId === serviceId) {
            clearTimeout(timeout);
            reject(new Error(message.error || "Service initialization failed"));
          }
        });

        worker.on('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      // Handle worker messages
      worker.on('message', (message: any) => {
        if (message.id && this.pendingCalls.has(message.id)) {
          const pending = this.pendingCalls.get(message.id)!;
          clearTimeout(pending.timeout);
          this.pendingCalls.delete(message.id);

          if (message.error) {
            pending.reject(new Error(message.error));
          } else {
            pending.resolve(message.result);
          }
        }
      });

      worker.on('error', (err) => {
        logError("Execution Service: Worker error", err, { serviceId });
      });

      worker.on('exit', (code) => {
        if (code !== 0 && !this.isShuttingDown) {
          logError("Execution Service: Worker exited unexpectedly", new Error(`Exit code: ${code}`), { serviceId });
        }
        this.threads.delete(serviceId);
      });

      this.threads.set(serviceId, worker);
      logInfo("Execution Service: Service started", { serviceId });
    } catch (err) {
      logError("Execution Service: Failed to start service", err, { serviceId });
      throw err;
    }
  }

  /**
   * Stoppe Service-Thread
   */
  async stopService(serviceId: string): Promise<void> {
    const worker = this.threads.get(serviceId);
    if (!worker) {
      logWarn("Execution Service: Service not running", { serviceId });
      return;
    }

    try {
      // Terminate worker
      await worker.terminate();
      this.threads.delete(serviceId);
      logInfo("Execution Service: Service stopped", { serviceId });
    } catch (err) {
      logError("Execution Service: Failed to stop service", err, { serviceId });
      throw err;
    }
  }

  /**
   * Starte alle registrierten Services
   * Throws error if any service fails to start
   */
  async startAll(): Promise<void> {
    const serviceIds = Array.from(this.serviceRegistrations.keys());
    logInfo("Execution Service: Starting all services", { count: serviceIds.length });

    const errors: Array<{ serviceId: string; error: Error }> = [];

    for (const serviceId of serviceIds) {
      try {
        await this.startService(serviceId);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        logError("Execution Service: Failed to start service during startAll", error, { serviceId });
        errors.push({ serviceId, error });
        // Continue to try starting other services, but collect errors
      }
    }

    // If any service failed to start, throw error
    if (errors.length > 0) {
      const errorMessages = errors.map(e => `${e.serviceId}: ${e.error.message}`).join('; ');
      const error = new Error(`Failed to start ${errors.length} service(s): ${errorMessages}`);
      logError("Execution Service: Not all services started successfully", error, {
        failed: errors.length,
        total: serviceIds.length,
        running: this.threads.size
      });
      throw error;
    }

    logInfo("Execution Service: All services started successfully", {
      total: serviceIds.length,
      running: this.threads.size
    });
  }

  /**
   * Stoppe alle Services
   */
  async stopAll(): Promise<void> {
    this.isShuttingDown = true;
    const serviceIds = Array.from(this.threads.keys());
    logInfo("Execution Service: Stopping all services", { count: serviceIds.length });

    const stopPromises = serviceIds.map(serviceId => this.stopService(serviceId));
    await Promise.allSettled(stopPromises);

    logInfo("Execution Service: All services stopped");
  }

  /**
   * Direkter Service-Call (Request/Response) via gRPC
   */
  async callService(serviceId: string, method: string, args: any): Promise<any> {
    if (!this.threads.has(serviceId)) {
      throw new Error(`Service "${serviceId}" is not running`);
    }

    // Use gRPC client instead of worker messages
    const client = grpcClientFactory.getClient(serviceId);
    return await client.call(method, args);
  }

  /**
   * Get service instance (for type checking, service is in thread)
   */
  getService(serviceId: string): ThreadedService | undefined {
    // Services run in threads, so we can't return the actual instance
    // This method exists for compatibility but always returns undefined
    return undefined;
  }

  /**
   * Get all registered service IDs
   */
  getAllServices(): string[] {
    return Array.from(this.serviceRegistrations.keys());
  }

  /**
   * Check if service is running
   */
  isServiceRunning(serviceId: string): boolean {
    return this.threads.has(serviceId);
  }

  /**
   * Close NATS connection
   */
  async close(): Promise<void> {
    await this.stopAll();
    
    if (this.natsClient) {
      await this.natsClient.close();
      this.natsClient = null;
      logInfo("Execution Service: NATS connection closed");
    }
  }
}

// Create singleton instance
export const executionService = new ExecutionService();


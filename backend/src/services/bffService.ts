/**
 * BFF Service (Backend-for-Frontend)
 * 
 * Acts as a facade/proxy for UI requests to backend services.
 * Runs in main thread (not a threaded service) to handle Fastify routes.
 * Routes service calls to threaded services via gRPC (through Execution Service).
 * Includes healthcheck polling for all services.
 */

import { executionService } from "./executionService";
import { grpcClientFactory } from "./grpcClientFactory";
import { logInfo, logDebug, logError } from "../utils/logger";

interface ServiceStatus {
  id: string;
  name: string;
  running: boolean;
  healthy: boolean;
  lastCheck: number;
  error?: string;
}

/**
 * BFF Service
 * 
 * Provides a unified interface for UI requests to backend services.
 * All service calls go through the Execution Service, which uses gRPC to reach threaded services.
 */
class BFFService {
  private serviceStatuses = new Map<string, ServiceStatus>();
  private pollingInterval: NodeJS.Timeout | null = null;
  private readonly pollInterval = 5000; // 5 seconds

  constructor() {
    // Start healthcheck polling
    this.startPolling();
  }

  /**
   * Start healthcheck polling for all services
   */
  private startPolling(): void {
    // Initial check
    this.checkAllServices();

    // Poll every interval
    this.pollingInterval = setInterval(() => {
      this.checkAllServices();
    }, this.pollInterval);

    logInfo("BFF Service: Healthcheck polling started", {
      interval: `${this.pollInterval}ms`
    });
  }

  /**
   * Stop healthcheck polling
   */
  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      logInfo("BFF Service: Healthcheck polling stopped");
    }
  }

  /**
   * Check health of all services
   */
  private async checkAllServices(): Promise<void> {
    const serviceIds = executionService.getAllServices();

    for (const serviceId of serviceIds) {
      await this.checkService(serviceId);
    }
  }

  /**
   * Check health of a single service
   */
  private async checkService(serviceId: string): Promise<void> {
    const isRunning = executionService.isServiceRunning(serviceId);
    let healthy = false;
    let error: string | undefined;

    if (isRunning) {
      try {
        // Try to call a simple method to check if service is responsive
        const client = grpcClientFactory.getClient(serviceId);
        // Use a timeout for healthcheck
        const healthcheckPromise = new Promise<any>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Healthcheck timeout"));
          }, 2000); // 2 second timeout

          client.call("healthcheck", {}).then(
            (result) => {
              clearTimeout(timeout);
              resolve(result);
            },
            (err) => {
              clearTimeout(timeout);
              reject(err);
            }
          );
        });

        await healthcheckPromise;
        healthy = true;
      } catch (err) {
        healthy = false;
        error = err instanceof Error ? err.message : String(err);
        logDebug("BFF Service: Healthcheck failed", {
          serviceId,
          error
        });
      }
    }

    this.serviceStatuses.set(serviceId, {
      id: serviceId,
      name: this.getServiceName(serviceId),
      running: isRunning,
      healthy,
      lastCheck: Date.now(),
      error
    });
  }

  /**
   * Get service name
   */
  private getServiceName(serviceId: string): string {
    const names: Record<string, string> = {
      'toolbox': 'Toolbox',
      'llm': 'LLM',
      'persona': 'Persona',
      'scheduler': 'Scheduler',
      'memory': 'Memory'
    };
    return names[serviceId] || serviceId;
  }

  /**
   * Get status of all services
   */
  getAllServiceStatuses(): ServiceStatus[] {
    return Array.from(this.serviceStatuses.values());
  }

  /**
   * Get status of a specific service
   */
  getServiceStatus(serviceId: string): ServiceStatus | undefined {
    return this.serviceStatuses.get(serviceId);
  }

  /**
   * Call toolbox service
   */
  async callToolbox(method: string, args: any): Promise<any> {
    return await executionService.callService("toolbox", method, args);
  }

  /**
   * Call LLM service
   */
  async callLLM(method: string, args: any): Promise<any> {
    return await executionService.callService("llm", method, args);
  }

  /**
   * Call persona service
   */
  async callPersona(method: string, args: any): Promise<any> {
    return await executionService.callService("persona", method, args);
  }

  /**
   * Call scheduler service
   */
  async callScheduler(method: string, args: any): Promise<any> {
    return await executionService.callService("scheduler", method, args);
  }

  /**
   * Call memory service
   */
  async callMemory(method: string, args: any): Promise<any> {
    return await executionService.callService("memory", method, args);
  }
}

// Singleton instance
export const bffService = new BFFService();


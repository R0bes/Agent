/**
 * gRPC Client Factory
 * 
 * Creates and manages gRPC clients for all services.
 * Provides a unified interface for service calls.
 */

import { createGrpcClient } from '../components/base/grpcServiceWrapper';
import { logDebug, logError } from '../utils/logger';
import { getGrpcPort } from '../config/ports';

/**
 * gRPC Client Factory
 * 
 * Manages gRPC client connections to all services.
 */
class GrpcClientFactory {
  private clients = new Map<string, any>();

  /**
   * Get gRPC client for a service
   */
  getClient(serviceId: string): any {
    if (!this.clients.has(serviceId)) {
      const port = getGrpcPort(serviceId);
      const client = createGrpcClient(serviceId, port);
      this.clients.set(serviceId, client);
      logDebug("gRPC Client Factory: Client created", { serviceId, port });
    }
    return this.clients.get(serviceId)!;
  }

  /**
   * Get gRPC port for a service
   */
  getServicePort(serviceId: string): number {
    return getGrpcPort(serviceId);
  }

  /**
   * Close all clients
   */
  async closeAll(): Promise<void> {
    // gRPC clients don't need explicit closing in Node.js
    this.clients.clear();
    logDebug("gRPC Client Factory: All clients closed");
  }
}

// Singleton instance
export const grpcClientFactory = new GrpcClientFactory();


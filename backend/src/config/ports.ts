/**
 * Central Port Configuration
 * 
 * All ports used by the application are defined here.
 * This ensures consistency and makes it easy to change ports if needed.
 */

// ============================================================================
// MAIN SERVICE PORTS
// ============================================================================
export const BACKEND_PORT = 3001;
export const FRONTEND_PORT = 5174;

// ============================================================================
// gRPC SERVICE PORTS
// ============================================================================
export const GRPC_BASE_PORT = 52000;

export const GRPC_PORTS = {
  toolbox: GRPC_BASE_PORT + 0,    // 52000
  llm: GRPC_BASE_PORT + 1,        // 52001
  persona: GRPC_BASE_PORT + 2,    // 52002
  scheduler: GRPC_BASE_PORT + 3, // 52003
  memory: GRPC_BASE_PORT + 4      // 52004
} as const;

/**
 * Get gRPC port for a service
 */
export function getGrpcPort(serviceId: string): number {
  const port = GRPC_PORTS[serviceId as keyof typeof GRPC_PORTS];
  if (!port) {
    throw new Error(`Unknown service ID: ${serviceId}`);
  }
  return port;
}


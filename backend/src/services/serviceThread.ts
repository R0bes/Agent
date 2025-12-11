/**
 * Service Thread Entry Point
 * 
 * Läuft im Worker Thread, instanziiert Service und handled Messages.
 * This file runs inside a Worker Thread and manages a single service instance.
 */

import { parentPort, workerData } from 'worker_threads';
import { connect, type NatsConnection } from 'nats';
import type { ThreadedService } from '../components/base/ThreadedService';
import type { BaseEvent, EventType } from '../events/eventBus';

interface WorkerData {
  serviceId: string;
  natsUrl: string;
  grpcPort: number;
}

interface CallMessage {
  type: "call";
  id: string;
  method: string;
  args: any;
}

interface ResponseMessage {
  id: string;
  result?: any;
  error?: string;
}

// Get worker data
const { serviceId, natsUrl, grpcPort } = workerData as WorkerData;

console.log(`[SERVICE-THREAD] Worker thread started - serviceId: ${serviceId}, PID: ${process.pid}, PPID: ${process.ppid}, grpcPort: ${grpcPort}`);

// Service instance (will be initialized)
let service: ThreadedService | null = null;
let natsConnection: NatsConnection | null = null;
const subscriptions: any[] = [];

/**
 * Map service ID to service class import path
 * Uses .ts extension in development (tsx), .js in production
 */
function getServiceImportPath(serviceId: string): string {
  const isDev = process.env.NODE_ENV !== 'production';
  const ext = isDev ? '.ts' : '.js';
  
  const imports: Record<string, string> = {
    'toolbox': `../components/toolbox/index${ext}`,
    'llm': `../components/llm/index${ext}`,
    'persona': `../components/persona/index${ext}`,
    'scheduler': `../components/scheduler/index${ext}`,
    'memory': `../components/memory/index${ext}`
  };
  return imports[serviceId] || '';
}

/**
 * Get service class name from service ID
 */
function getServiceClassName(serviceId: string): string {
  const classNames: Record<string, string> = {
    'toolbox': 'ThreadedToolboxService',
    'llm': 'ThreadedLLMService',
    'persona': 'ThreadedPersonaService',
    'scheduler': 'ThreadedSchedulerService',
    'memory': 'ThreadedMemoryService'
  };
  return classNames[serviceId] || '';
}

/**
 * Initialize service in thread
 */
async function initializeService(): Promise<void> {
  try {
    // Connect to NATS
    natsConnection = await connect({ servers: natsUrl });
    
    // Dynamically import service class
    const importPath = getServiceImportPath(serviceId);
    if (!importPath) {
      throw new Error(`Unknown service ID: ${serviceId}`);
    }
    
    const serviceModule = await import(importPath);
    const serviceClassName = getServiceClassName(serviceId);
    const ServiceClass = serviceModule[serviceClassName];
    
    if (!ServiceClass) {
      throw new Error(`Service class ${serviceClassName} not found in ${importPath}`);
    }
    
    // Create service instance
    service = new ServiceClass();
    service.setNatsClient(natsConnection);
    service.setGrpcPort(grpcPort);
    
    // Initialize service (will start gRPC server automatically)
    await service.onInitialize();
    
    // Subscribe to events
    const eventTypes = service.getSubscribedEvents();
    for (const eventType of eventTypes) {
      const sub = natsConnection.subscribe(`events.${eventType}`);
      subscriptions.push(sub);
      
      // Handle events asynchronously
      (async () => {
        for await (const msg of sub) {
          try {
            const event = JSON.parse(new TextDecoder().decode(msg.data)) as BaseEvent;
            await service!.onEvent(event);
          } catch (err) {
            console.error(`Service Thread [${serviceId}]: Error handling event ${eventType}:`, err);
          }
        }
      })();
    }
    
    // Send ready signal
    if (parentPort) {
      parentPort.postMessage({ type: "ready", serviceId });
    }
    
    console.log(`Service Thread [${serviceId}]: Initialized and ready`);
  } catch (err) {
    console.error(`Service Thread [${serviceId}]: Initialization failed:`, err);
    if (parentPort) {
      parentPort.postMessage({ type: "error", serviceId, error: err instanceof Error ? err.message : String(err) });
    }
    process.exit(1);
  }
}

// Note: Direct calls are now handled via gRPC server, not worker messages
// This handler is kept for backward compatibility but won't be used
if (parentPort) {
  parentPort.on('message', async (message: CallMessage) => {
    // gRPC handles calls now, but we still listen for shutdown signals
    if (message.type === "shutdown") {
      await cleanup();
      process.exit(0);
    }
  });
}

/**
 * Cleanup on exit
 */
async function cleanup(): Promise<void> {
  try {
    if (service) {
      await service.onShutdown();
    }
    
    // Unsubscribe from all events
    for (const sub of subscriptions) {
      sub.unsubscribe();
    }
    
    if (natsConnection) {
      await natsConnection.close();
    }
  } catch (err) {
    console.error(`Service Thread [${serviceId}]: Cleanup error:`, err);
  }
}

// Handle shutdown signals
process.on('SIGTERM', async () => {
  await cleanup();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await cleanup();
  process.exit(0);
});

// Initialize service
initializeService().catch((err) => {
  console.error(`Service Thread [${serviceId}]: Fatal error:`, err);
  process.exit(1);
});


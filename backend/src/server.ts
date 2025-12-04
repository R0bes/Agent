import Fastify from "fastify";
import websocketPlugin from "@fastify/websocket";
import cors from "@fastify/cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { registerChatRoutes } from "./api/chat";
import { registerJobsRoutes } from "./api/jobs";
import { registerMemoryRoutes } from "./api/memory";
import { registerToolsRoutes } from "./api/tools";
import { registerLogsRoutes } from "./api/logs";
import { registerComponent } from "./components/registry";
import {
  llmComponent,
  personaComponent,
  guiSourceComponent,
  echoToolComponent,
  clockToolComponent,
  websiteSearchToolComponent,
  schedulerToolComponent,
  workerManagerToolComponent,
  toolRegistryComponent
} from "./components";

import { workerEngine } from "./components/worker/engine";
import { memoryCompactionWorkerComponent } from "./components/worker/memory";
import { eventBus } from "./events/eventBus";
import { logInfo, logDebug, logError, logWarn } from "./utils/logger";
import { initializeLogManager } from "./utils/logManager";
import { createFastifyLogger } from "./utils/fastifyLogger";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Log Manager first (handles console and file output)
const logManager = initializeLogManager({
  logDir: process.env.LOG_DIR || undefined,
  maxFileSize: process.env.LOG_MAX_SIZE ? parseInt(process.env.LOG_MAX_SIZE) : undefined,
  maxFiles: process.env.LOG_MAX_FILES ? parseInt(process.env.LOG_MAX_FILES) : undefined,
  consoleOutput: process.env.LOG_CONSOLE !== "false",
  fileOutput: process.env.LOG_FILE !== "false",
  minLevel: (process.env.LOG_LEVEL as any) || "debug"
});

// Create custom Fastify logger
const fastifyLogger = createFastifyLogger(process.env.LOG_LEVEL || "info");

// Configure Fastify with custom logger
const app = Fastify({
  logger: fastifyLogger
});


// Register CORS
app.register(cors, {
  origin: true,
  credentials: true
});

app.register(websocketPlugin);

logInfo("Server: Fastify, CORS and WebSocket plugin registered");

type WSClient = {
  send: (data: string) => boolean;
  socket: any;
};

const wsClients = new Set<WSClient>();

app.register(async function (fastify) {
  fastify.get("/ws", { websocket: true }, (connection /* SocketStream */, req) => {
    logInfo("WebSocket: New connection", {
      url: req.url,
      remoteAddress: req.socket?.remoteAddress || req.ip || "unknown",
      connectionType: connection.constructor?.name,
      connectionKeys: Object.keys(connection).filter(k => !k.startsWith('_')).slice(0, 10)
    });

    // Debug: Log socket type and properties
    const socket = connection.socket;
    logDebug("WebSocket: Socket details", {
      socketType: socket?.constructor?.name,
      hasSend: typeof socket?.send === "function",
      hasOn: typeof socket?.on === "function",
      readyState: socket?.readyState,
      socketKeys: socket ? Object.keys(socket).filter(k => !k.startsWith('_')).slice(0, 10) : []
    });

    const client: WSClient = {
      send: (data: string) => {
        try {
          if (socket.readyState === 1) { // OPEN
            socket.send(data);
            return true;
          } else {
            return false;
          }
        } catch (err) {
          logError("WebSocket: Send error", err);
          return false;
        }
      },
      socket: socket
    };

    wsClients.add(client);
    logInfo(`WebSocket: Client added - Total: ${wsClients.size}`);

    // Send welcome message
    client.send(JSON.stringify({ 
      type: "connection_established",
      timestamp: new Date().toISOString()
    }));

    socket.on("message", (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        logDebug("WebSocket: Message received", { data });
      } catch (err) {
        logDebug("WebSocket: Non-JSON message", { message: message.toString().slice(0, 100) });
      }
    });

    socket.on("close", (code: number, reason: Buffer) => {
      wsClients.delete(client);
      logInfo("WebSocket: Client disconnected", {
        code,
        reason: reason?.toString() || "No reason",
        remainingClients: wsClients.size
      });
    });

    socket.on("error", (error: Error) => {
      logError("WebSocket: Error", error);
      wsClients.delete(client);
    });
  });
});

// Listen for source_message events and process them through persona
import { handleSourceMessage } from "./components/persona";
eventBus.on("source_message", async (event) => {
  const sourceMessage = event.payload;
  logDebug("Server: Processing source message", {
    messageId: sourceMessage.id,
    userId: sourceMessage.userId,
    conversationId: sourceMessage.conversationId,
    sourceKind: sourceMessage.source.kind
  });

  try {
    const assistantMessage = await handleSourceMessage(sourceMessage);
    
    logInfo("Server: Source message processed successfully", {
      messageId: sourceMessage.id,
      assistantMessageId: assistantMessage.id,
      userId: sourceMessage.userId
    });
    
    // Emit message_created event for WebSocket clients
    await eventBus.emit({
      type: "message_created",
      payload: assistantMessage
    });
  } catch (err) {
    logError("Server: Failed to process source message", err, {
      messageId: sourceMessage.id,
      userId: sourceMessage.userId
    });
  }
});

// bridge eventBus -> WebSocket for all relevant events
const eventTypes = ["message_created", "job_updated", "memory_updated"] as const;
for (const type of eventTypes) {
  eventBus.on(type, (event) => {
    const payload = JSON.stringify(event);
    logDebug("Server: Broadcasting event to WebSocket clients", {
      eventType: type,
      clientCount: wsClients.size
    });

    let successCount = 0;
    let errorCount = 0;

    for (const client of wsClients) {
      try {
        client.send(payload);
        successCount++;
      } catch (err) {
        errorCount++;
        logDebug("Server: Failed to send to WebSocket client", {
          eventType: type,
          error: err instanceof Error ? err.message : String(err)
        });
        // ignore send errors; closed sockets are removed on close
      }
    }

    if (successCount > 0 || errorCount > 0) {
      logDebug("Server: WebSocket broadcast completed", {
        eventType: type,
        successCount,
        errorCount,
        totalClients: wsClients.size
      });
    }
  });
}

app.get("/health", async (req) => {
  logDebug("Health check requested", {
    requestId: req.id
  });
  return { status: "ok" };
});

// Register all components
// Register tool registry first so it can manage other tools
logInfo("Server: Registering components");
registerComponent(toolRegistryComponent);
logDebug("Server: Tool registry component registered");
registerComponent(llmComponent);
logDebug("Server: LLM component registered");
registerComponent(personaComponent);
logDebug("Server: Persona component registered");
registerComponent(guiSourceComponent);
logDebug("Server: GUI source component registered");
registerComponent(echoToolComponent);
logDebug("Server: Echo tool component registered");
registerComponent(clockToolComponent);
logDebug("Server: Clock tool component registered");
registerComponent(websiteSearchToolComponent);
logDebug("Server: Website search tool component registered");
registerComponent(schedulerToolComponent);
logDebug("Server: Scheduler tool component registered");
registerComponent(workerManagerToolComponent);
logDebug("Server: Worker manager tool component registered");

// Try to load event crawler component (requires playwright)
try {
  const eventCrawlerModule = await import("./components/tools/eventCrawler/index.js");
  if (eventCrawlerModule.eventCrawlerComponent) {
    registerComponent(eventCrawlerModule.eventCrawlerComponent);
    logDebug("Server: Event crawler tool component registered");
  } else {
    logWarn("Server: Event crawler component not found in module");
  }
} catch (err) {
  logWarn("Server: Event crawler component skipped (playwright may not be installed)", {
    error: err instanceof Error ? err.message : String(err)
  });
}

// Register workers
logInfo("Server: Registering workers");
registerComponent(memoryCompactionWorkerComponent);
logDebug("Server: Memory compaction worker component registered");
// Register worker with engine
const memoryWorker = memoryCompactionWorkerComponent.worker;
if (memoryWorker) {
  workerEngine.registerWorker(memoryWorker);
  logDebug("Server: Memory compaction worker registered with engine");
}
logInfo("Server: All workers registered");

// Register routes
logInfo("Server: Registering API routes");
await registerChatRoutes(app);
logDebug("Server: Chat routes registered");
await registerJobsRoutes(app);
logDebug("Server: Jobs routes registered");
await registerMemoryRoutes(app);
logDebug("Server: Memory routes registered");
await registerToolsRoutes(app);
logDebug("Server: Tools routes registered");
await registerLogsRoutes(app);
logDebug("Server: Logs routes registered");
logInfo("Server: All API routes registered");

const PORT = Number(process.env.PORT || 3001);

app
  .listen({ port: PORT, host: "0.0.0.0" })
  .then(() => {
    logInfo("Server: Backend started successfully", {
      port: PORT,
      url: `http://localhost:${PORT}`
    });
  })
  .catch((err) => {
    logError("Server: Failed to start", err, {
      port: PORT
    });
    process.exit(1);
  });

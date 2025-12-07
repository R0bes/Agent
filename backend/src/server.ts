
import Fastify from "fastify";
import fastifySocketIO from "fastify-socket.io";
import cors from "@fastify/cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { registerChatRoutes } from "./api/chat";
import { registerJobsRoutes } from "./api/jobs";
import { registerMemoryRoutes } from "./api/memory";
import { registerMessagesRoutes } from "./api/messages";
import { registerToolsRoutes } from "./api/tools";
import { registerLogsRoutes } from "./api/logs";
import { registerWorkersRoutes } from "./api/workers";
import { registerConversationRoutes } from "./api/conversation";
import { registerSchedulerRoutes } from "./api/scheduler";
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
  guiControlToolComponent,
  toolboxComponent
} from "./components";

import { bullMQWorkerEngine } from "./components/worker/bullmq-engine";
import { memoryCompactionWorkerComponent } from "./components/worker/memory";
import { taskWorkerComponent } from "./components/worker/task";
import { eventBus } from "./events/eventBus";
import { scheduleStore } from "./models/scheduleStore";
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

// Socket.IO clients tracking
const socketClients = new Map<string, any>();

// Function to send avatar command to all connected clients
export function sendAvatarCommand(command: { command: 'move' | 'capability' | 'expression' | 'action'; target?: { x: number; y: number }; capabilityId?: string; args?: Record<string, any> }) {
  if (!app.io) {
    logWarn("Server: Cannot send avatar command - Socket.IO not initialized");
    return;
  }
  logDebug("Server: Sending avatar command", { command, clientCount: socketClients.size });
  app.io.emit('avatar_command', command);
}

// Wrap entire server startup in async function to catch all errors
(async () => {
  try {


    // Register CORS
    app.register(cors, {
      origin: true,
      credentials: true
    });

    // Register Socket.IO
    await app.register(fastifySocketIO, {
      cors: { origin: "*" }
    });

    logInfo("Server: Fastify, CORS and Socket.IO registered");

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

    function broadcastToClients(event: any, eventType: string) {
      logDebug("Server: Broadcasting to Socket.IO clients", {
        eventType,
        clientCount: socketClients.size
      });
      
      app.io.emit(eventType, event);
    }

    // Bridge eventBus -> Socket.IO for all relevant events
    const eventTypes = ["message_created", "job_updated", "memory_updated", "gui_action"] as const;
    for (const type of eventTypes) {
      eventBus.on(type, (event) => broadcastToClients(event, type));
    }

    app.get("/health", async (req) => {
      logDebug("Health check requested", {
        requestId: req.id
      });
      return { status: "ok" };
    });

        // Register toolbox first so it can manage other tools
    logInfo("Server: Registering components");
    await registerComponent(toolboxComponent);
logDebug("Server: Toolbox component registered");
await registerComponent(llmComponent);
logDebug("Server: LLM component registered");
await registerComponent(personaComponent);
logDebug("Server: Persona component registered");
await registerComponent(guiSourceComponent);
logDebug("Server: GUI source component registered");
await registerComponent(echoToolComponent);
logDebug("Server: Echo tool component registered");
await registerComponent(clockToolComponent);
logDebug("Server: Clock tool component registered");
await registerComponent(websiteSearchToolComponent);
logDebug("Server: Website search tool component registered");
await registerComponent(schedulerToolComponent);
logDebug("Server: Scheduler tool component registered");
await registerComponent(workerManagerToolComponent);
logDebug("Server: Worker manager tool component registered");
    await registerComponent(guiControlToolComponent);
    logDebug("Server: GUI control tool component registered");

    // Try to load event crawler component (requires playwright)
    try {
      const eventCrawlerModule = await import("./components/tools/eventCrawler/index.js");
      if (eventCrawlerModule.eventCrawlerComponent) {
        await registerComponent(eventCrawlerModule.eventCrawlerComponent);
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
    await registerComponent(memoryCompactionWorkerComponent);
    logDebug("Server: Memory compaction worker component registered");
    // Register workers with engine
    const memoryWorker = memoryCompactionWorkerComponent.worker;
    if (memoryWorker) {
      bullMQWorkerEngine.registerWorker(memoryWorker as any);
      logDebug("Server: Memory compaction worker registered with engine");
    }

    const taskWorker = taskWorkerComponent.worker;
    if (taskWorker) {
      bullMQWorkerEngine.registerWorker(taskWorker as any);
      logDebug("Server: Task worker registered with engine");
    }

    // Register tool execution worker
    try {
      const { toolExecutionWorkerComponent } = await import("./components/worker/toolExecution/index.js");
      await registerComponent(toolExecutionWorkerComponent);
      logDebug("Server: Tool execution worker component registered");
      const toolExecutionWorker = toolExecutionWorkerComponent.worker;
      if (toolExecutionWorker) {
        bullMQWorkerEngine.registerWorker(toolExecutionWorker as any);
        logDebug("Server: Tool execution worker registered with engine");
      }
    } catch (err) {
      logWarn("Server: Tool execution worker registration failed", {
        error: err instanceof Error ? err.message : String(err)
      });
    }

    logInfo("Server: All workers registered");

    // Initialize database
    logInfo("Server: Initializing database");
    try {
      const { createPostgresPool } = await import("./database/postgres.js");
      const { runMigrations } = await import("./database/migrations.js");
      
      const pool = await createPostgresPool();
      await runMigrations(pool);
      
      logInfo("Server: Database initialized successfully");

      // Initialize Qdrant vector database
      logInfo("Server: Initializing Qdrant");
      try {
        const { qdrantClient } = await import("./components/memory/qdrantClient.js");
        const { embeddingClient } = await import("./components/llm/embeddingClient.js");
        
        // Get embedding dimension from model
        const dimension = await embeddingClient.getDimension();
        await qdrantClient.initialize(dimension);
        
        logInfo("Server: Qdrant initialized successfully", {
          dimension,
          collection: "memories",
          model: embeddingClient.getModel()
        });
      } catch (qdrantErr) {
        logError("Server: Qdrant initialization failed", qdrantErr);
        logWarn("Server: Continuing without Qdrant - semantic search will not work");
      }
    } catch (err) {
      logError("Server: Database initialization failed", err);
      logWarn("Server: Continuing without database - memory/message features may not work");
    }

    // Register routes
    logInfo("Server: Registering API routes");
    try {
      await registerChatRoutes(app);
      logDebug("Server: Chat routes registered");
      await registerJobsRoutes(app);
      logDebug("Server: Jobs routes registered");
      await registerMemoryRoutes(app);
      logDebug("Server: Memory routes registered");
      await registerMessagesRoutes(app);
      logDebug("Server: Messages routes registered");
      await registerToolsRoutes(app);
      logDebug("Server: Tools routes registered");
      await registerWorkersRoutes(app);
      logDebug("Server: Workers routes registered");
      await registerSchedulerRoutes(app);
      logDebug("Server: Scheduler routes registered");
      await registerLogsRoutes(app);
      logDebug("Server: Logs routes registered");
      await registerConversationRoutes(app);
      logDebug("Server: Conversation routes registered");
      logInfo("Server: All API routes registered");
    } catch (err) {
      logError("Server: Failed to register API routes", err);
      throw err; // Re-throw to prevent server from starting with broken routes
    }

    // Initialize schedule store
    try {
      await scheduleStore.initialize();
      logInfo("Server: Schedule store initialized");
    } catch (err) {
      logError("Server: Failed to initialize schedule store", err);
      logWarn("Server: Continuing without schedule store - scheduler features may not work");
    }

    // Socket.IO connection handler (must be after app.ready())
    app.ready().then(() => {
  logInfo("Server: Setting up Socket.IO connection handler");
  
  app.io.on('connection', (socket) => {
    const connectionId = socket.id;
    logInfo(`[SOCKET-CONNECT] Client connected: ${connectionId}`);
    
    socketClients.set(connectionId, socket);
    
    // Send welcome message
    socket.emit('connection_established', {
      timestamp: new Date().toISOString()
    });
    
    // Handle gui_response
    socket.on('gui_response', async (payload) => {
      logDebug(`[SOCKET-MESSAGE] gui_response received from ${connectionId}`, { payload });
      const { requestId, ok, data, error } = payload;
      if (requestId) {
        const { GuiControlTool } = await import("./components/tools/guiControl");
        GuiControlTool.handleResponse(requestId, { ok, data, error });
      }
    });
    
    // Handle avatar_poke
    socket.on('avatar_poke', async (payload) => {
      logDebug(`[SOCKET-MESSAGE] avatar_poke received from ${connectionId}`, { payload });
      const { timestamp, position } = payload;
      const userId = "user-123"; // Default user ID
      const conversationId = "main";
      
      // Create source message for avatar poke
      const sourceMessage = {
        id: `poke-${Date.now()}`,
        userId,
        conversationId,
        content: "poke",
        createdAt: timestamp || new Date().toISOString(),
        source: {
          id: "avatar",
          kind: "gui" as const,
          label: "Avatar Poke",
          meta: {
            type: "poke",
            position: position
          }
        }
      };
      
      // Emit as source_message to be processed by persona
      await eventBus.emit({
        type: "source_message",
        payload: sourceMessage
      });
      
      logDebug("Server: Avatar poke converted to source message", {
        messageId: sourceMessage.id,
        userId,
        position
      });
    });
    
    // Handle avatar_state (receives state updates from frontend)
    socket.on('avatar_state', (payload) => {
      logDebug(`[SOCKET-MESSAGE] avatar_state received from ${connectionId}`, { payload });
      // Store avatar state per connection if needed
      // Could be used for AI to know avatar position/mode
    });
    
    socket.on('disconnect', (reason) => {
      logInfo(`[SOCKET-DISCONNECT] Client disconnected: ${connectionId}`, { reason });
      socketClients.delete(connectionId);
    });
    
    socket.on('error', (error) => {
      logError(`[SOCKET-ERROR] Socket error for ${connectionId}`, error);
    });
  });
  
      logInfo("Server: Socket.IO connection handler ready");
    }).catch((err) => {
      logError("Server: Failed to setup Socket.IO connection handler", err);
    });

    const PORT = Number(process.env.PORT || 3001);

    // Start server
    logInfo("Server: Starting backend server", { port: PORT });
    
    await app.listen({ port: PORT, host: "0.0.0.0" });
    
    logInfo("Server: Backend started successfully", {
      port: PORT,
      url: `http://localhost:${PORT}`
    });
  } catch (err) {
    // Use console.error as fallback if logger isn't initialized
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : undefined;
    
    try {
      logError("Server: Failed to start", err, {
        errorMessage,
        errorStack
      });
    } catch {
      console.error("FATAL: Server failed to start:", errorMessage);
      if (errorStack) {
        console.error(errorStack);
      }
    }
    
    process.exit(1);
  }
})();

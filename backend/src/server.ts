
import Fastify from "fastify";
import fastifySocketIO from "fastify-socket.io";
import cors from "@fastify/cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
// New hexagonal architecture routes
import { registerChatRoutes as registerNewChatRoutes } from "./adapters/input/http/routes/chat.routes";
import { registerToolsRoutes as registerNewToolsRoutes } from "./adapters/input/http/routes/tools.routes";
import { registerMemoryRoutes as registerNewMemoryRoutes } from "./adapters/input/http/routes/memory.routes";
import { registerSchedulerRoutes as registerNewSchedulerRoutes } from "./adapters/input/http/routes/scheduler.routes";

// Legacy routes (to be migrated)
import { registerJobsRoutes } from "./api/jobs";
import { registerMemoryRoutes } from "./api/memory";
import { registerMessagesRoutes } from "./api/messages";
import { registerLogsRoutes } from "./api/logs";
import { registerWorkersRoutes } from "./api/workers";
import { registerSchedulerRoutes } from "./api/scheduler";
import { registerServicesRoutes } from "./api/services";
// Legacy components removed - using Threaded Services instead
// import { registerComponent } from "./legacy/components/registry";
// import {
//   llmComponent,
//   personaComponent,
//   guiSourceComponent,
//   echoToolComponent,
//   clockToolComponent,
//   websiteSearchToolComponent,
//   schedulerToolComponent,
//   workerManagerToolComponent,
//   guiControlToolComponent,
//   toolboxComponent
// } from "./legacy/components";

import { bullMQWorkerEngine } from "./components/worker/bullmq-engine";
import { memoryCompactionWorkerComponent } from "./components/worker/memory";
import { taskWorkerComponent } from "./components/worker/task";
import { eventBus } from "./events/eventBus";
import { scheduleStore } from "./legacy/models/scheduleStore";
import { executionService } from "./services/executionService";
import { ThreadedToolboxService } from "./components/toolbox";
import { ThreadedLLMService } from "./components/llm";
import { ThreadedPersonaService } from "./components/persona";
import { ThreadedSchedulerService } from "./components/scheduler";
import { ThreadedMemoryService } from "./components/memory";
import { logInfo, logDebug, logError, logWarn } from "./utils/logger";
import { initializeLogManager } from "./utils/logManager";
import { createFastifyLogger } from "./utils/fastifyLogger";
import { bootstrap } from "./bootstrap/bootstrap";
import { BACKEND_PORT } from "./config/ports";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log when server.ts is loaded
console.log(`[SERVER-INIT] server.ts loaded - PID: ${process.pid}, PPID: ${process.ppid}, isMainThread: ${typeof process.send === 'undefined'}`);

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
// #region agent log
fetch('http://127.0.0.1:7242/ingest/994e3b8a-5a28-4b5b-b903-618de0cb9132',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.ts:73',message:'Fastify app creation',data:{hasLogger:!!fastifyLogger},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
// #endregion

const app = Fastify({
  logger: fastifyLogger
});

// Socket.IO clients tracking
const socketClients = new Map<string, any>();

// Wrap entire server startup in async function to catch all errors
(async () => {
  try {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/994e3b8a-5a28-4b5b-b903-618de0cb9132',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.ts:83',message:'Server startup beginning',data:{pid:process.pid,ppid:process.ppid,argv:process.argv,platform:process.platform,nodeVersion:process.version,envPort:process.env.PORT,envHost:process.env.HOST},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    
    logInfo(`[SERVER-INIT] Starting server initialization - PID: ${process.pid}, PPID: ${process.ppid}, argv: ${process.argv.join(' ')}`);
    
    // Connect NATS Event Bus first
    logInfo("Server: Connecting to NATS Event Bus");
    let natsConnected = false;
    try {
      await eventBus.connect();
      logInfo("Server: NATS Event Bus connected");
      natsConnected = true;
    } catch (err) {
      logError("Server: Failed to connect NATS Event Bus", err);
      logWarn("Server: Continuing without NATS - event-based features will not work");
      logWarn("Server: Start infrastructure services with: docker compose -f devops/docker-compose.yml up -d");
    }

    // Connect Execution Service to NATS (only if NATS is available)
    if (natsConnected) {
      logInfo("Server: Connecting Execution Service to NATS");
      try {
        await executionService.connectNats();
        logInfo("Server: Execution Service connected to NATS");
      } catch (err) {
        logError("Server: Failed to connect Execution Service to NATS", err);
        logWarn("Server: Continuing without Execution Service NATS connection");
      }
    } else {
      logWarn("Server: Skipping Execution Service NATS connection (NATS not available)");
    }

    // Bootstrap hexagonal architecture
    logInfo("Server: Bootstrapping hexagonal architecture");
    try {
      await bootstrap();
      logInfo("Server: Hexagonal architecture bootstrapped");
    } catch (err) {
      logError("Server: Failed to bootstrap hexagonal architecture", err);
      logWarn("Server: Continuing with legacy architecture - some features may not work");
    }

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

    // Note: source_message events are now handled by PersonaService in its own thread
    // The PersonaService automatically emits message_created events when processing messages

    function broadcastToClients(event: any, eventType: string) {
      logDebug("Server: Broadcasting to Socket.IO clients", {
        eventType,
        clientCount: socketClients.size
      });
      
      app.io.emit(eventType, event);
    }

    // Bridge eventBus -> Socket.IO for all relevant events (only if NATS is connected)
    if (natsConnected) {
      const eventTypes = ["message_created", "job_updated", "memory_updated", "gui_action", "tool_execute", "tool_executed"] as const;
      for (const type of eventTypes) {
        eventBus.on(type, (event) => broadcastToClients(event, type));
      }
    }

    app.get("/health", async (req) => {
      logDebug("Health check requested", {
        requestId: req.id
      });
      return { status: "ok" };
    });

    // Initialize database BEFORE starting services (scheduler needs it)
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

    // Register threaded services with Execution Service (only if NATS is available)
    if (natsConnected) {
      logInfo("Server: Registering threaded services");
      executionService.registerService("toolbox", ThreadedToolboxService);
      logDebug("Server: Toolbox service registered");
      executionService.registerService("llm", ThreadedLLMService);
      logDebug("Server: LLM service registered");
      executionService.registerService("persona", ThreadedPersonaService);
      logDebug("Server: Persona service registered");
      executionService.registerService("scheduler", ThreadedSchedulerService);
      logDebug("Server: Scheduler service registered");
      executionService.registerService("memory", ThreadedMemoryService);
      logDebug("Server: Memory service registered");

      // Start all threaded services
      logInfo("Server: Starting threaded services");
      try {
        await executionService.startAll();
        logInfo("Server: All threaded services started");
      } catch (err) {
        logError("Server: Failed to start some threaded services", err);
        logWarn("Server: Continuing without some threaded services");
      }
    } else {
      logWarn("Server: Skipping threaded services (NATS not available)");
    }

    // Legacy components removed - all functionality now provided by Threaded Services
    // Legacy components are in legacy/ folder and will be removed after migration

    // Register workers (using BullMQ Worker Engine directly, not legacy Component system)
    logInfo("Server: Registering workers");
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

    // Register routes
    logInfo("Server: Registering API routes");
    try {
      // New hexagonal architecture routes
      await registerNewChatRoutes(app);
      logDebug("Server: Chat routes registered (new architecture)");
      await registerNewToolsRoutes(app);
      logDebug("Server: Tools routes registered (new architecture)");
      await registerNewMemoryRoutes(app);
      logDebug("Server: Memory routes registered (new architecture)");
      await registerNewSchedulerRoutes(app);
      logDebug("Server: Scheduler routes registered (new architecture)");
      
      // Legacy routes (to be migrated)
      await registerJobsRoutes(app);
      logDebug("Server: Jobs routes registered");
      await registerMessagesRoutes(app);
      logDebug("Server: Messages routes registered");
      await registerWorkersRoutes(app);
      logDebug("Server: Workers routes registered");
      await registerLogsRoutes(app);
      logDebug("Server: Logs routes registered");
      await registerServicesRoutes(app);
      logDebug("Server: Services routes registered");
      logInfo("Server: All API routes registered");
    } catch (err) {
      logError("Server: Failed to register API routes", err);
      throw err; // Re-throw to prevent server from starting with broken routes
    }

    // Initialize schedule store (only if database is available)
    try {
      // Check if postgres pool exists by trying to import it
      const { getPostgresPool } = await import("./database/postgres.js");
      const pool = getPostgresPool();
      if (pool) {
        await scheduleStore.initialize();
        logInfo("Server: Schedule store initialized");
      } else {
        logWarn("Server: Skipping schedule store initialization (database not available)");
      }
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
          const { GuiControlTool } = await import("./legacy/components/tools/guiControl");
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

    const BASE_PORT = Number(process.env.PORT || BACKEND_PORT);
    const MAX_PORT_ATTEMPTS = 10; // Try up to 10 consecutive ports
    const PORT_RANGE = Array.from({ length: MAX_PORT_ATTEMPTS }, (_, i) => BASE_PORT + i);

    // Start server
    logInfo("Server: Starting backend server", { basePort: BASE_PORT, portRange: PORT_RANGE });
    
    // #region agent log
    const logPath = 'd:\\Projects\\Agent\\.cursor\\debug.log';
    const logEntry1 = JSON.stringify({location:'server.ts:397',message:'Before listen - checking port availability',data:{basePort:BASE_PORT,backendPort:BACKEND_PORT,portRange:PORT_RANGE,host:process.env.HOST,defaultHost:'127.0.0.1',pid:process.pid,platform:process.platform},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,F'})+'\n';
    await import('fs').then(fs=>fs.promises.appendFile(logPath,logEntry1).catch(()=>{}));
    fetch('http://127.0.0.1:7242/ingest/994e3b8a-5a28-4b5b-b903-618de0cb9132',{method:'POST',headers:{'Content-Type':'application/json'},body:logEntry1.trim()}).catch(()=>{});
    // #endregion
    
    // Try multiple binding strategies on Windows to handle EACCES errors
    // Strategy 1: Try 127.0.0.1 (IPv4 localhost)
    // Strategy 2: Try localhost (may resolve to IPv6 or IPv4)
    // Strategy 3: Try 0.0.0.0 (all interfaces, may require admin on some systems)
    const hostStrategies = process.env.HOST 
      ? [process.env.HOST] 
      : process.platform === 'win32' 
        ? ["127.0.0.1", "localhost", "0.0.0.0"]
        : ["127.0.0.1"];
    
    let lastError: any = null;
    let bindSuccess = false;
    let finalPort = BASE_PORT;
    let finalHost = hostStrategies[0];
    
    // Try each port in the range
    for (const PORT of PORT_RANGE) {
      // #region agent log
      const logEntryPort = JSON.stringify({location:'server.ts:410',message:'Trying port',data:{port:PORT,basePort:BASE_PORT,portIndex:PORT_RANGE.indexOf(PORT),totalPorts:PORT_RANGE.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})+'\n';
      await import('fs').then(fs=>fs.promises.appendFile(logPath,logEntryPort).catch(()=>{}));
      fetch('http://127.0.0.1:7242/ingest/994e3b8a-5a28-4b5b-b903-618de0cb9132',{method:'POST',headers:{'Content-Type':'application/json'},body:logEntryPort.trim()}).catch(()=>{});
      // #endregion
      
      // Try each host strategy for this port
      for (const host of hostStrategies) {
        // #region agent log
        const logEntry2 = JSON.stringify({location:'server.ts:415',message:'Trying Fastify listen',data:{port:PORT,host:host,strategy:hostStrategies.indexOf(host)+1,totalStrategies:hostStrategies.length,portIndex:PORT_RANGE.indexOf(PORT),totalPorts:PORT_RANGE.length,fastifyConfig:app.server?.address(),envPort:process.env.PORT,envHost:process.env.HOST},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C,E,F'})+'\n';
        await import('fs').then(fs=>fs.promises.appendFile(logPath,logEntry2).catch(()=>{}));
        fetch('http://127.0.0.1:7242/ingest/994e3b8a-5a28-4b5b-b903-618de0cb9132',{method:'POST',headers:{'Content-Type':'application/json'},body:logEntry2.trim()}).catch(()=>{});
        // #endregion
        
        try {
          // #region agent log
          const logEntry3 = JSON.stringify({location:'server.ts:421',message:'Attempting Fastify listen',data:{port:PORT,host:host},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})+'\n';
          await import('fs').then(fs=>fs.promises.appendFile(logPath,logEntry3).catch(()=>{}));
          fetch('http://127.0.0.1:7242/ingest/994e3b8a-5a28-4b5b-b903-618de0cb9132',{method:'POST',headers:{'Content-Type':'application/json'},body:logEntry3.trim()}).catch(()=>{});
          // #endregion
          
          await app.listen({ port: PORT, host });
          
          // #region agent log
          const logEntry4 = JSON.stringify({location:'server.ts:427',message:'Fastify listen succeeded',data:{port:PORT,host:host,serverAddress:app.server?.address()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})+'\n';
          await import('fs').then(fs=>fs.promises.appendFile(logPath,logEntry4).catch(()=>{}));
          fetch('http://127.0.0.1:7242/ingest/994e3b8a-5a28-4b5b-b903-618de0cb9132',{method:'POST',headers:{'Content-Type':'application/json'},body:logEntry4.trim()}).catch(()=>{});
          // #endregion
          
          logInfo(`Server: Successfully bound to ${host}:${PORT}`);
          if (PORT !== BASE_PORT) {
            logWarn(`Server: Using alternative port ${PORT} instead of ${BASE_PORT}`);
          }
          bindSuccess = true;
          finalPort = PORT;
          finalHost = host;
          break;
        } catch (err: any) {
          // #region agent log
          const logEntry5 = JSON.stringify({location:'server.ts:438',message:'Fastify listen failed for host',data:{port:PORT,host:host,errorCode:err.code,errorMessage:err.message,errno:err.errno,syscall:err.syscall,address:err.address,willTryNextHost:hostStrategies.indexOf(host) < hostStrategies.length - 1,willTryNextPort:PORT_RANGE.indexOf(PORT) < PORT_RANGE.length - 1},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C,E,F'})+'\n';
          await import('fs').then(fs=>fs.promises.appendFile(logPath,logEntry5).catch(()=>{}));
          fetch('http://127.0.0.1:7242/ingest/994e3b8a-5a28-4b5b-b903-618de0cb9132',{method:'POST',headers:{'Content-Type':'application/json'},body:logEntry5.trim()}).catch(()=>{});
          // #endregion
          
          lastError = err;
          logWarn(`Server: Failed to bind to ${host}:${PORT} (${err.code})`);
          
          // If this is not the last host strategy, continue to next one
          if (hostStrategies.indexOf(host) < hostStrategies.length - 1) {
            continue;
          }
        }
      }
      
      // If we successfully bound, break out of port loop
      if (bindSuccess) {
        break;
      }
      
      // If all host strategies failed for this port, try next port
      logWarn(`Server: All host strategies failed for port ${PORT}, trying next port...`);
    }
    
    if (!bindSuccess) {
      // #region agent log
      const logEntry6 = JSON.stringify({location:'server.ts:456',message:'All Fastify listen strategies failed',data:{basePort:BASE_PORT,portRange:PORT_RANGE,strategies:hostStrategies,lastError:lastError?.code,lastErrorMessage:lastError?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E,F'})+'\n';
      await import('fs').then(fs=>fs.promises.appendFile(logPath,logEntry6).catch(()=>{}));
      fetch('http://127.0.0.1:7242/ingest/994e3b8a-5a28-4b5b-b903-618de0cb9132',{method:'POST',headers:{'Content-Type':'application/json'},body:logEntry6.trim()}).catch(()=>{});
      // #endregion
      
      if (lastError?.code === "EACCES" || lastError?.code === "EADDRINUSE") {
        logError(`Server: Cannot bind to any port in range ${PORT_RANGE[0]}-${PORT_RANGE[PORT_RANGE.length - 1]} on any host`, lastError);
        logWarn(`Server: Ports may be in use or require elevated permissions`);
        logWarn(`Server: Try running as administrator or use a different port (set PORT environment variable)`);
        logWarn(`Server: Tried hosts: ${hostStrategies.join(', ')}`);
      }
      throw lastError;
    }
    
    const PORT = finalPort;
    
    logInfo("Server: Backend started successfully", {
      port: PORT,
      url: `http://localhost:${PORT}`
    });

    // Setup graceful shutdown
    const shutdown = async () => {
      logInfo("Server: Shutting down gracefully");
      try {
        // Stop BFF polling
        const { bffService } = await import("./services/bffService");
        bffService.stopPolling();
        logInfo("Server: BFF polling stopped");
        
        // Stop all threaded services
        await executionService.stopAll();
        logInfo("Server: All threaded services stopped");
        
        // Close NATS Event Bus
        await eventBus.close();
        logInfo("Server: NATS Event Bus closed");
        
        // Close Execution Service
        await executionService.close();
        logInfo("Server: Execution Service closed");
        
        // Close BullMQ
        await bullMQWorkerEngine.close();
        logInfo("Server: BullMQ closed");
        
        // Close Fastify
        await app.close();
        logInfo("Server: Fastify closed");
        
        process.exit(0);
      } catch (err) {
        logError("Server: Error during shutdown", err);
        process.exit(1);
      }
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
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

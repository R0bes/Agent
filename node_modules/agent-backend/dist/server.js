import Fastify from "fastify";
import websocketPlugin from "@fastify/websocket";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { registerChatRoutes } from "./api/chat";
import { registerJobsRoutes } from "./api/jobs";
import { registerMemoryRoutes } from "./api/memory";
import { registerToolsRoutes } from "./api/tools";
import { registerComponent } from "./components/registry";
import { llmComponent, personaComponent, guiSourceComponent, echoToolComponent, clockToolComponent, schedulerToolComponent, workerManagerToolComponent } from "./components";
import { workerRuntime } from "./tools/worker/workerEngine";
import { MemoryCompactionWorker } from "./tools/worker/memoryWorker";
import { eventBus } from "./events/eventBus";
import { setLogger, logInfo, logDebug, logError } from "./utils/logger";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = Fastify({
    logger: {
        level: "info"
    }
});
// Set the Fastify logger for our logging utility
setLogger(app.log);
app.register(websocketPlugin);
logInfo("Server: Fastify and WebSocket plugin registered");
const wsClients = new Set();
app.get("/ws", { websocket: true }, (connection, req) => {
    logInfo("WebSocket: Connection established", {
        url: req.url,
        remoteAddress: req.socket.remoteAddress,
        readyState: connection.socket.readyState
    });
    const client = {
        send: (data) => connection.socket.send(data),
        socket: connection.socket
    };
    wsClients.add(client);
    logInfo("WebSocket: Client added", {
        totalClients: wsClients.size
    });
    // Send a welcome message to confirm connection once socket is ready
    const sendWelcome = () => {
        try {
            if (connection.socket.readyState === 1) { // OPEN
                connection.socket.send(JSON.stringify({
                    type: "connection_established",
                    timestamp: new Date().toISOString()
                }));
                logDebug("WebSocket: Welcome message sent");
            }
            else {
                // Wait a bit and try again
                setTimeout(sendWelcome, 10);
            }
        }
        catch (err) {
            logError("WebSocket: Failed to send welcome message", err);
        }
    };
    // Try to send welcome message after a short delay to ensure connection is ready
    setTimeout(sendWelcome, 50);
    connection.socket.on("close", (code, reason) => {
        wsClients.delete(client);
        logInfo("WebSocket: Client disconnected", {
            code,
            reason: reason?.toString(),
            remainingClients: wsClients.size
        });
    });
    connection.socket.on("error", (error) => {
        logError("WebSocket: Connection error", error);
        wsClients.delete(client);
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
    }
    catch (err) {
        logError("Server: Failed to process source message", err, {
            messageId: sourceMessage.id,
            userId: sourceMessage.userId
        });
    }
});
// bridge eventBus -> WebSocket for all relevant events
const eventTypes = ["message_created", "job_updated", "memory_updated"];
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
            }
            catch (err) {
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
logInfo("Server: Registering components");
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
registerComponent(schedulerToolComponent);
logDebug("Server: Scheduler tool component registered");
registerComponent(workerManagerToolComponent);
logDebug("Server: Worker manager tool component registered");
// Register workers
logInfo("Server: Registering workers");
const memoryCompactionWorker = new MemoryCompactionWorker();
workerRuntime.registerWorker(memoryCompactionWorker);
logDebug("Server: Memory compaction worker registered");
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

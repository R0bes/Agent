import Fastify from "fastify";
import websocketPlugin from "@fastify/websocket";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { registerChatRoutes } from "./api/chat";
import { eventBus } from "./events/eventBus";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = Fastify({
  logger: {
    level: "info"
  }
});

app.register(websocketPlugin);

type WSClient = {
  send: (data: string) => void;
  socket: any;
};

const wsClients = new Set<WSClient>();

app.get("/ws", { websocket: true }, (connection, req) => {
  const client: WSClient = {
    send: (data: string) => connection.socket.send(data),
    socket: connection.socket
  };

  wsClients.add(client);

  connection.socket.on("close", () => {
    wsClients.delete(client);
  });
});

// bridge eventBus -> WebSocket
eventBus.on("message_created", (event) => {
  const payload = JSON.stringify(event);
  for (const client of wsClients) {
    try {
      client.send(payload);
    } catch {
      // ignore send errors; closed sockets are removed on close
    }
  }
});

app.get("/health", async () => ({ status: "ok" }));

// Register chat routes
await registerChatRoutes(app);

const PORT = Number(process.env.PORT || 3001);

app
  .listen({ port: PORT, host: "0.0.0.0" })
  .then(() => {
    app.log.info(`Backend listening on http://localhost:${PORT}`);
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });

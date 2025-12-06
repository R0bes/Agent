import type { FastifyInstance } from "fastify";
import { memoryStore } from "../components/memory/store";
import { qdrantClient } from "../components/memory/qdrantClient";
import { embeddingClient } from "../components/llm/embeddingClient";
import { getPostgresPool } from "../database/postgres";
import type { MemoryWrite, MemoryUpdate, MemoryKind } from "../components/memory/types";
import { logInfo, logDebug, logError, logWarn } from "../utils/logger";

interface MemoryIdParams {
  id: string;
}

interface MemoryQueryParams {
  userId?: string;
  kind?: MemoryKind;
  tags?: string;
  conversationId?: string;
  isCompaktified?: string;
  limit?: string;
}

interface MemorySearchBody {
  query: string;
  userId?: string;
  kinds?: MemoryKind[];
  tags?: string[];
  limit?: number;
}

export async function registerMemoryRoutes(app: FastifyInstance) {
  /**
   * GET /api/memory - List memories with filters
   */
  app.get<{ Querystring: MemoryQueryParams }>("/api/memory", async (req, reply) => {
    try {
      const query = {
        userId: req.query.userId,
        kinds: req.query.kind ? [req.query.kind] : undefined,
        tags: req.query.tags ? req.query.tags.split(",") : undefined,
        conversationId: req.query.conversationId,
        isCompaktified: req.query.isCompaktified ? req.query.isCompaktified === "true" : undefined,
        limit: req.query.limit ? parseInt(req.query.limit) : 100
      };

      logDebug("Memory API: List request", { query });

      const memories = await memoryStore.list(query);

      logInfo("Memory API: Memories listed", {
        count: memories.length
      });

      return reply.send({ memories, count: memories.length });
    } catch (err) {
      logError("Memory API: List failed", err);
      return reply.status(500).send({ error: "Failed to list memories" });
    }
  });

  /**
   * GET /api/memory/:id - Get single memory
   */
  app.get<{ Params: MemoryIdParams }>("/api/memory/:id", async (req, reply) => {
    try {
      const { id } = req.params;

      logDebug("Memory API: Get request", { id });

      const memory = await memoryStore.getById(id);

      if (!memory) {
        return reply.status(404).send({ error: "Memory not found" });
      }

      logInfo("Memory API: Memory retrieved", { id });

      return reply.send({ memory });
    } catch (err) {
      logError("Memory API: Get failed", err, { id: req.params.id });
      return reply.status(500).send({ error: "Failed to get memory" });
    }
  });

  /**
   * POST /api/memory - Create new memory
   */
  app.post<{ Body: MemoryWrite }>("/api/memory", async (req, reply) => {
    try {
      const write: MemoryWrite = req.body;

      logDebug("Memory API: Create request", {
        userId: write.userId,
        kind: write.kind,
        title: write.title
      });

      const memory = await memoryStore.add(write);

      logInfo("Memory API: Memory created", {
        id: memory.id,
        kind: memory.kind
      });

      return reply.status(201).send({ memory });
    } catch (err) {
      logError("Memory API: Create failed", err);
      return reply.status(500).send({ error: "Failed to create memory" });
    }
  });

  /**
   * PUT /api/memory/:id - Update memory
   */
  app.put<{ Params: MemoryIdParams; Body: MemoryUpdate }>("/api/memory/:id", async (req, reply) => {
    try {
      const { id } = req.params;
      const updates: MemoryUpdate = req.body;

      logDebug("Memory API: Update request", { id, updates });

      const memory = await memoryStore.update(id, updates);

      logInfo("Memory API: Memory updated", { id });

      return reply.send({ memory });
    } catch (err) {
      logError("Memory API: Update failed", err, { id: req.params.id });
      const message = (err as Error).message;
      if (message.includes("not found")) {
        return reply.status(404).send({ error: "Memory not found" });
      }
      return reply.status(500).send({ error: "Failed to update memory" });
    }
  });

  /**
   * DELETE /api/memory/:id - Delete memory
   */
  app.delete<{ Params: MemoryIdParams }>("/api/memory/:id", async (req, reply) => {
    try {
      const { id } = req.params;

      logDebug("Memory API: Delete request", { id });

      await memoryStore.delete(id);

      logInfo("Memory API: Memory deleted", { id });

      return reply.status(204).send();
    } catch (err) {
      logError("Memory API: Delete failed", err, { id: req.params.id });
      const message = (err as Error).message;
      if (message.includes("not found")) {
        return reply.status(404).send({ error: "Memory not found" });
      }
      return reply.status(500).send({ error: "Failed to delete memory" });
    }
  });

  /**
   * POST /api/memory/search - Semantic search
   */
  app.post<{ Body: MemorySearchBody }>("/api/memory/search", async (req, reply) => {
    try {
      const searchQuery = req.body;

      logDebug("Memory API: Search request", {
        query: searchQuery.query,
        userId: searchQuery.userId
      });

      const memories = await memoryStore.search(searchQuery);

      logInfo("Memory API: Search completed", {
        resultCount: memories.length
      });

      return reply.send({ memories, count: memories.length });
    } catch (err) {
      logError("Memory API: Search failed", err);
      return reply.status(500).send({ error: "Failed to search memories" });
    }
  });

  /**
   * GET /api/memory/status - Database status
   */
  app.get("/api/memory/status", async (req, reply) => {
    try {
      const pool = getPostgresPool();
      
      // Check Postgres connection and get counts
      let postgresConnected = false;
      let messageCount = 0;
      let memoryCount = 0;

      try {
        const client = await pool.connect();
        postgresConnected = true;

        const messageResult = await client.query("SELECT COUNT(*) FROM messages");
        messageCount = parseInt(messageResult.rows[0].count);

        const memoryResult = await client.query("SELECT COUNT(*) FROM memories");
        memoryCount = parseInt(memoryResult.rows[0].count);

        client.release();
      } catch (err) {
        logError("Memory API: Postgres status check failed", err);
      }

      // Check Qdrant connection
      let qdrantConnected = false;
      let collectionSize = 0;

      try {
        const collectionInfo = await qdrantClient.getCollectionInfo();
        qdrantConnected = true;
        collectionSize = collectionInfo.points_count || 0;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const isNotFound = message?.toLowerCase().includes("not found");

        // Try to auto-initialize Qdrant collection if missing
        if (isNotFound) {
          try {
            const dimension = await embeddingClient.getDimension();
            await qdrantClient.initialize(dimension);
            const collectionInfo = await qdrantClient.getCollectionInfo();
            qdrantConnected = true;
            collectionSize = collectionInfo.points_count || 0;
            logInfo("Memory API: Qdrant auto-initialized", { dimension, collectionSize });
          } catch (initErr) {
            logWarn("Memory API: Qdrant not ready", {
              error: initErr instanceof Error ? initErr.message : String(initErr)
            });
          }
        } else {
          logWarn("Memory API: Qdrant status check failed", {
            error: message
          });
        }
      }

      logInfo("Memory API: Status check completed", {
        postgresConnected,
        qdrantConnected
      });

      return reply.send({
        postgres: {
          connected: postgresConnected,
          messageCount,
          memoryCount
        },
        qdrant: {
          connected: qdrantConnected,
          collectionSize
        }
      });
    } catch (err) {
      logError("Memory API: Status check failed", err);
      return reply.status(500).send({ error: "Failed to check status" });
    }
  });
}


/**
 * PostgreSQL-based Memory Store with Qdrant Vector Search
 * 
 * Stores memories in Postgres and creates vector embeddings in Qdrant
 * for semantic search capabilities.
 */

import { getPostgresPool } from "../../database/postgres";
import { embeddingClient } from "../llm/embeddingClient";
import { qdrantClient } from "./qdrantClient";
import type {
  MemoryItem,
  MemoryStore,
  MemoryWrite,
  MemoryUpdate,
  MemoryQuery,
  MemorySearchQuery,
  SourceReference
} from "./types";
import { logInfo, logDebug, logError } from "../../utils/logger";

export class PostgresMemoryStore implements MemoryStore {
  /**
   * Add a new memory
   */
  async add(write: MemoryWrite): Promise<MemoryItem> {
    const pool = getPostgresPool();
    
    const id = `mem-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const now = new Date().toISOString();

    logDebug("MemoryStore: Adding memory", {
      id,
      userId: write.userId,
      kind: write.kind,
      title: write.title
    });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Insert into Postgres
      const result = await client.query(
        `INSERT INTO memories (
          id, user_id, kind, title, content, conversation_id, tags,
          source_references, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          id,
          write.userId,
          write.kind,
          write.title,
          write.content,
          write.conversationId || null,
          write.tags || [],
          JSON.stringify(write.sourceReferences || []),
          now,
          now
        ]
      );

      const row = result.rows[0];

      // 2. Create embedding and store in Qdrant
      const embeddingText = `${write.title}\n${write.content}`;
      const embeddingResult = await embeddingClient.embed(embeddingText);

      await qdrantClient.upsert(id, embeddingResult.embedding, {
        userId: write.userId,
        kind: write.kind,
        tags: write.tags
      });

      // 3. Track embedding in database
      await client.query(
        `INSERT INTO embeddings (memory_id, model, qdrant_point_id, dimension)
         VALUES ($1, $2, $3, $4)`,
        [id, embeddingResult.model, id, embeddingResult.dimension]
      );

      await client.query("COMMIT");

      const memory = this.rowToMemoryItem(row);

      logInfo("MemoryStore: Memory added", {
        id: memory.id,
        userId: memory.userId,
        kind: memory.kind
      });

      return memory;
    } catch (err) {
      await client.query("ROLLBACK");
      logError("MemoryStore: Failed to add memory", err, {
        id,
        userId: write.userId
      });
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Update a memory
   */
  async update(id: string, updates: MemoryUpdate): Promise<MemoryItem> {
    const pool = getPostgresPool();
    const now = new Date().toISOString();

    logDebug("MemoryStore: Updating memory", { id, updates });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Build update query dynamically
      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.title !== undefined) {
        setClauses.push(`title = $${paramIndex++}`);
        values.push(updates.title);
      }

      if (updates.content !== undefined) {
        setClauses.push(`content = $${paramIndex++}`);
        values.push(updates.content);
      }

      if (updates.tags !== undefined) {
        setClauses.push(`tags = $${paramIndex++}`);
        values.push(updates.tags);
      }

      if (updates.conversationId !== undefined) {
        setClauses.push(`conversation_id = $${paramIndex++}`);
        values.push(updates.conversationId);
      }

      if (updates.sourceReferences !== undefined) {
        setClauses.push(`source_references = $${paramIndex++}`);
        values.push(JSON.stringify(updates.sourceReferences));
      }

      if (updates.isCompaktified !== undefined) {
        setClauses.push(`is_compaktified = $${paramIndex++}`);
        values.push(updates.isCompaktified);
      }

      if (updates.compaktifiedFrom !== undefined) {
        setClauses.push(`compaktified_from = $${paramIndex++}`);
        values.push(updates.compaktifiedFrom);
      }

      setClauses.push(`updated_at = $${paramIndex++}`);
      values.push(now);

      values.push(id);

      const result = await client.query(
        `UPDATE memories SET ${setClauses.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        throw new Error(`Memory not found: ${id}`);
      }

      const row = result.rows[0];

      // If title or content changed, update embedding
      if (updates.title !== undefined || updates.content !== undefined) {
        const embeddingText = `${row.title}\n${row.content}`;
        const embeddingResult = await embeddingClient.embed(embeddingText);

        await qdrantClient.upsert(id, embeddingResult.embedding, {
          userId: row.user_id,
          kind: row.kind,
          tags: row.tags
        });

        // Update embedding record
        await client.query(
          `UPDATE embeddings SET model = $1, dimension = $2 WHERE memory_id = $3`,
          [embeddingResult.model, embeddingResult.dimension, id]
        );
      }

      await client.query("COMMIT");

      const memory = this.rowToMemoryItem(row);

      logInfo("MemoryStore: Memory updated", { id });

      return memory;
    } catch (err) {
      await client.query("ROLLBACK");
      logError("MemoryStore: Failed to update memory", err, { id });
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Delete a memory
   */
  async delete(id: string): Promise<void> {
    const pool = getPostgresPool();

    logDebug("MemoryStore: Deleting memory", { id });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Delete from Qdrant
      await qdrantClient.delete(id);

      // Delete from Postgres (cascade will handle embeddings table)
      const result = await client.query("DELETE FROM memories WHERE id = $1", [id]);

      if (result.rowCount === 0) {
        throw new Error(`Memory not found: ${id}`);
      }

      await client.query("COMMIT");

      logInfo("MemoryStore: Memory deleted", { id });
    } catch (err) {
      await client.query("ROLLBACK");
      logError("MemoryStore: Failed to delete memory", err, { id });
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * List memories with filters
   */
  async list(query: MemoryQuery): Promise<MemoryItem[]> {
    const pool = getPostgresPool();

    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (query.userId) {
      conditions.push(`user_id = $${paramIndex++}`);
      values.push(query.userId);
    }

    if (query.kinds && query.kinds.length > 0) {
      conditions.push(`kind = ANY($${paramIndex++})`);
      values.push(query.kinds);
    }

    if (query.conversationId) {
      conditions.push(`conversation_id = $${paramIndex++}`);
      values.push(query.conversationId);
    }

    if (query.isCompaktified !== undefined) {
      conditions.push(`is_compaktified = $${paramIndex++}`);
      values.push(query.isCompaktified);
    }

    if (query.tags && query.tags.length > 0) {
      conditions.push(`tags && $${paramIndex++}`);
      values.push(query.tags);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = query.limit || 100;
    const offset = query.offset || 0;

    try {
      const result = await pool.query(
        `SELECT * FROM memories ${whereClause} 
         ORDER BY created_at DESC 
         LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        [...values, limit, offset]
      );

      const memories = result.rows.map(row => this.rowToMemoryItem(row));

      logDebug("MemoryStore: Listed memories", {
        count: memories.length,
        query: JSON.stringify(query)
      });

      return memories;
    } catch (err) {
      logError("MemoryStore: Failed to list memories", err, { query });
      throw err;
    }
  }

  /**
   * Get a memory by ID
   */
  async getById(id: string): Promise<MemoryItem | null> {
    const pool = getPostgresPool();

    try {
      const result = await pool.query("SELECT * FROM memories WHERE id = $1", [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.rowToMemoryItem(result.rows[0]);
    } catch (err) {
      logError("MemoryStore: Failed to get memory by ID", err, { id });
      throw err;
    }
  }

  /**
   * Semantic search for memories
   */
  async search(query: MemorySearchQuery): Promise<MemoryItem[]> {
    logDebug("MemoryStore: Performing semantic search", {
      query: query.query,
      userId: query.userId,
      kinds: query.kinds,
      limit: query.limit
    });

    try {
      // 1. Create embedding for search query
      const embeddingResult = await embeddingClient.embed(query.query);

      // 2. Search in Qdrant
      const searchResults = await qdrantClient.search(
        embeddingResult.embedding,
        {
          userId: query.userId,
          kind: query.kinds ? query.kinds[0] : undefined,
          tags: query.tags
        },
        query.limit || 10
      );

      if (searchResults.length === 0) {
        return [];
      }

      // 3. Fetch full memories from Postgres
      const pool = getPostgresPool();
      const memoryIds = searchResults.map(r => r.memoryId);

      const result = await pool.query(
        "SELECT * FROM memories WHERE id = ANY($1) ORDER BY created_at DESC",
        [memoryIds]
      );

      const memories = result.rows.map(row => this.rowToMemoryItem(row));

      // Sort by Qdrant score
      const scoreMap = new Map(searchResults.map(r => [r.memoryId, r.score]));
      memories.sort((a, b) => (scoreMap.get(b.id) || 0) - (scoreMap.get(a.id) || 0));

      logInfo("MemoryStore: Semantic search completed", {
        resultCount: memories.length,
        topScore: searchResults[0]?.score
      });

      return memories;
    } catch (err) {
      logError("MemoryStore: Semantic search failed", err, { query });
      throw err;
    }
  }

  /**
   * Semantic search using a pre-computed embedding
   */
  async searchSimilar(
    embedding: number[],
    options: {
      userId?: string;
      kinds?: MemoryKind[];
      tags?: string[];
      limit?: number;
    }
  ): Promise<MemoryItem[]> {
    logDebug("MemoryStore: Performing similarity search", {
      userId: options.userId,
      kinds: options.kinds,
      limit: options.limit
    });

    try {
      // 1. Search in Qdrant
      const searchResults = await qdrantClient.search(
        embedding,
        {
          userId: options.userId,
          kind: options.kinds ? options.kinds[0] : undefined,
          tags: options.tags
        },
        options.limit || 10
      );

      if (searchResults.length === 0) {
        return [];
      }

      // 2. Fetch full memories from Postgres
      const pool = getPostgresPool();
      const memoryIds = searchResults.map(r => r.memoryId);

      const result = await pool.query(
        "SELECT * FROM memories WHERE id = ANY($1) ORDER BY created_at DESC",
        [memoryIds]
      );

      const memories = result.rows.map(row => this.rowToMemoryItem(row));

      // Sort by Qdrant score
      const scoreMap = new Map(searchResults.map(r => [r.memoryId, r.score]));
      memories.sort((a, b) => (scoreMap.get(b.id) || 0) - (scoreMap.get(a.id) || 0));

      logInfo("MemoryStore: Similarity search completed", {
        resultCount: memories.length,
        topScore: searchResults[0]?.score
      });

      return memories;
    } catch (err) {
      logError("MemoryStore: Similarity search failed", err, { options });
      throw err;
    }
  }

  /**
   * Convert database row to MemoryItem
   */
  private rowToMemoryItem(row: any): MemoryItem {
    return {
      id: row.id,
      userId: row.user_id,
      kind: row.kind,
      title: row.title,
      content: row.content,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      tags: row.tags || [],
      conversationId: row.conversation_id || undefined,
      sourceReferences: row.source_references || [],
      isCompaktified: row.is_compaktified || false,
      compaktifiedFrom: row.compaktified_from || []
    };
  }
}

export const memoryStore: MemoryStore = new PostgresMemoryStore();


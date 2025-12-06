/**
 * Qdrant Client for Memory Vectors
 * 
 * Manages vector storage and semantic search for memories in Qdrant.
 */

import { QdrantClient } from "@qdrant/qdrant-js";
import { getDatabaseSettings } from "../../config/settings";
import { logInfo, logDebug, logError, logWarn } from "../../utils/logger";
import type { MemoryKind } from "./types";

const COLLECTION_NAME = "memories";

export interface QdrantSearchFilter {
  userId?: string;
  kind?: MemoryKind;
  tags?: string[];
}

export interface QdrantSearchResult {
  memoryId: string;
  score: number;
}

export class QdrantMemoryClient {
  private client: QdrantClient;
  private host: string;
  private port: number;
  private initialized: boolean = false;

  constructor() {
    const dbSettings = getDatabaseSettings();
    this.host = dbSettings.qdrant.host;
    this.port = dbSettings.qdrant.port;

    this.client = new QdrantClient({
      url: `http://${this.host}:${this.port}`
    });

    logInfo("QdrantClient: Initialized", {
      host: this.host,
      port: this.port,
      url: `http://${this.host}:${this.port}`
    });
  }

  /**
   * Initialize the collection (create if not exists)
   */
  async initialize(dimension: number): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      logInfo("QdrantClient: Checking collection", {
        collection: COLLECTION_NAME
      });

      // Check if collection exists
      const collections = await this.client.getCollections();
      const collectionExists = collections.collections.some(
        c => c.name === COLLECTION_NAME
      );

      if (!collectionExists) {
        logInfo("QdrantClient: Creating collection", {
          collection: COLLECTION_NAME,
          dimension
        });

        await this.client.createCollection(COLLECTION_NAME, {
          vectors: {
            size: dimension,
            distance: "Cosine"
          }
        });

        // Create payload indexes for filtering
        await this.client.createPayloadIndex(COLLECTION_NAME, {
          field_name: "userId",
          field_schema: "keyword"
        });

        await this.client.createPayloadIndex(COLLECTION_NAME, {
          field_name: "kind",
          field_schema: "keyword"
        });

        await this.client.createPayloadIndex(COLLECTION_NAME, {
          field_name: "tags",
          field_schema: "keyword"
        });

        logInfo("QdrantClient: Collection created", {
          collection: COLLECTION_NAME
        });
      } else {
        logInfo("QdrantClient: Collection already exists", {
          collection: COLLECTION_NAME
        });
      }

      this.initialized = true;
    } catch (err) {
      logError("QdrantClient: Failed to initialize collection", err);
      throw err;
    }
  }

  /**
   * Upsert a memory vector
   */
  async upsert(
    memoryId: string,
    vector: number[],
    payload: {
      userId: string;
      kind: MemoryKind;
      tags?: string[];
    }
  ): Promise<void> {
    if (!this.initialized) {
      await this.initialize(vector.length);
    }

    try {
      logDebug("QdrantClient: Upserting vector", {
        memoryId,
        dimension: vector.length,
        userId: payload.userId,
        kind: payload.kind
      });

      await this.client.upsert(COLLECTION_NAME, {
        wait: true,
        points: [
          {
            id: memoryId,
            vector,
            payload: {
              userId: payload.userId,
              kind: payload.kind,
              tags: payload.tags || []
            }
          }
        ]
      });

      logInfo("QdrantClient: Vector upserted", {
        memoryId,
        userId: payload.userId
      });
    } catch (err) {
      logError("QdrantClient: Failed to upsert vector", err, {
        memoryId,
        userId: payload.userId
      });
      throw err;
    }
  }

  /**
   * Semantic search for memories
   */
  async search(
    vector: number[],
    filters: QdrantSearchFilter = {},
    limit: number = 10
  ): Promise<QdrantSearchResult[]> {
    if (!this.initialized) {
      await this.initialize(vector.length);
    }

    try {
      // Build filter conditions
      const must: any[] = [];

      if (filters.userId) {
        must.push({
          key: "userId",
          match: { value: filters.userId }
        });
      }

      if (filters.kind) {
        must.push({
          key: "kind",
          match: { value: filters.kind }
        });
      }

      if (filters.tags && filters.tags.length > 0) {
        must.push({
          key: "tags",
          match: { any: filters.tags }
        });
      }

      const filter = must.length > 0 ? { must } : undefined;

      logDebug("QdrantClient: Searching vectors", {
        limit,
        filterCount: must.length,
        dimension: vector.length
      });

      const result = await this.client.search(COLLECTION_NAME, {
        vector,
        filter,
        limit,
        with_payload: false
      });

      const results: QdrantSearchResult[] = result.map(point => ({
        memoryId: point.id as string,
        score: point.score
      }));

      logInfo("QdrantClient: Search completed", {
        resultCount: results.length,
        topScore: results[0]?.score
      });

      return results;
    } catch (err) {
      logError("QdrantClient: Search failed", err, {
        filters,
        limit
      });
      throw err;
    }
  }

  /**
   * Delete a memory vector
   */
  async delete(memoryId: string): Promise<void> {
    try {
      logDebug("QdrantClient: Deleting vector", { memoryId });

      await this.client.delete(COLLECTION_NAME, {
        wait: true,
        points: [memoryId]
      });

      logInfo("QdrantClient: Vector deleted", { memoryId });
    } catch (err) {
      logError("QdrantClient: Failed to delete vector", err, { memoryId });
      throw err;
    }
  }

  /**
   * Get collection info
   */
  async getCollectionInfo(): Promise<any> {
    try {
      return await this.client.getCollection(COLLECTION_NAME);
    } catch (err) {
      logError("QdrantClient: Failed to get collection info", err);
      throw err;
    }
  }
}

// Create singleton instance
export const qdrantClient = new QdrantMemoryClient();


/**
 * Ollama Embedding Client
 * 
 * Provides text embedding functionality using Ollama's embedding models.
 * Supports both nomic-embed-text and mxbai-embed-large models.
 */

import { getEmbeddingSettings } from "../../config/settings";
import { logInfo, logDebug, logError, logWarn } from "../../utils/logger";

export interface EmbeddingResponse {
  model: string;
  embeddings: number[][];
}

export interface EmbeddingResult {
  embedding: number[];
  dimension: number;
  model: string;
}

export class OllamaEmbeddingClient {
  private baseUrl: string;
  private model: string;
  private cachedDimension: number | null = null;

  constructor() {
    const settings = getEmbeddingSettings();
    this.baseUrl = settings.baseUrl;
    this.model = settings.model;

    logInfo("EmbeddingClient: Initialized", {
      baseUrl: this.baseUrl,
      model: this.model
    });
  }

  /**
   * Embed a single text string
   */
  async embed(text: string): Promise<EmbeddingResult> {
    const results = await this.embedBatch([text]);
    return results[0];
  }

  /**
   * Embed multiple text strings in a batch
   */
  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    if (texts.length === 0) {
      return [];
    }

    logDebug("EmbeddingClient: Creating embeddings", {
      count: texts.length,
      model: this.model,
      firstTextLength: texts[0].length
    });

    try {
      const response = await fetch(`${this.baseUrl}/api/embed`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: this.model,
          input: texts
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama embedding error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json() as EmbeddingResponse;

      if (!data.embeddings || data.embeddings.length === 0) {
        throw new Error("No embeddings returned from Ollama");
      }

      // Cache dimension for future reference
      if (!this.cachedDimension) {
        this.cachedDimension = data.embeddings[0].length;
        logInfo("EmbeddingClient: Detected dimension", {
          dimension: this.cachedDimension,
          model: this.model
        });
      }

      const results: EmbeddingResult[] = data.embeddings.map(embedding => ({
        embedding,
        dimension: embedding.length,
        model: this.model
      }));

      logInfo("EmbeddingClient: Embeddings created", {
        count: results.length,
        dimension: results[0].dimension,
        model: this.model
      });

      return results;
    } catch (err) {
      logError("EmbeddingClient: Failed to create embeddings", err, {
        count: texts.length,
        model: this.model
      });
      throw err;
    }
  }

  /**
   * Get the dimension of embeddings for the current model
   */
  async getDimension(): Promise<number> {
    if (this.cachedDimension) {
      return this.cachedDimension;
    }

    // Embed a test string to detect dimension
    const result = await this.embed("test");
    return result.dimension;
  }

  /**
   * Get current model name
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Get base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }
}

// Create singleton instance
export const embeddingClient = new OllamaEmbeddingClient();


/**
 * Ollama Embedding Provider
 * 
 * Implements IEmbeddingProvider using Ollama
 */

import type { IEmbeddingProvider } from "../../../ports/output/providers/IEmbeddingProvider";
import { embeddingClient } from "../../../components/llm/embeddingClient";
import { logError } from "../../../infrastructure/logging/logger";

export class OllamaEmbeddingProvider implements IEmbeddingProvider {
  async embed(text: string): Promise<number[]> {
    try {
      return await embeddingClient.embed(text);
    } catch (err) {
      logError("OllamaEmbeddingProvider: Failed to generate embedding", err);
      throw err;
    }
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    try {
      return Promise.all(texts.map(text => this.embed(text)));
    } catch (err) {
      logError("OllamaEmbeddingProvider: Failed to generate embeddings batch", err);
      throw err;
    }
  }

  async getDimension(): Promise<number> {
    try {
      return await embeddingClient.getDimension();
    } catch (err) {
      logError("OllamaEmbeddingProvider: Failed to get dimension", err);
      throw err;
    }
  }

  getModel(): string {
    return embeddingClient.getModel();
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.getDimension();
      return true;
    } catch {
      return false;
    }
  }
}


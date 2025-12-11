/**
 * Embedding Provider (Output/Driven Port)
 * 
 * Defines the interface for embedding services
 */

export interface IEmbeddingProvider {
  /**
   * Generate embeddings for text
   */
  embed(text: string): Promise<number[]>;
  
  /**
   * Generate embeddings for multiple texts
   */
  embedBatch(texts: string[]): Promise<number[][]>;
  
  /**
   * Get the embedding dimension
   */
  getDimension(): Promise<number>;
  
  /**
   * Get the model name
   */
  getModel(): string;
  
  /**
   * Check if the provider is available
   */
  isAvailable(): Promise<boolean>;
}


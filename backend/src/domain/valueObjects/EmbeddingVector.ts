/**
 * Embedding Vector Value Object
 * 
 * Immutable value object representing an embedding vector
 */

export class EmbeddingVector {
  constructor(
    public readonly values: number[],
    public readonly dimension: number,
    public readonly model: string
  ) {
    if (values.length !== dimension) {
      throw new Error(`Embedding dimension mismatch: expected ${dimension}, got ${values.length}`);
    }
  }

  /**
   * Create a new embedding vector
   */
  static create(values: number[], model: string): EmbeddingVector {
    return new EmbeddingVector(values, values.length, model);
  }

  /**
   * Calculate cosine similarity with another vector
   */
  cosineSimilarity(other: EmbeddingVector): number {
    if (this.dimension !== other.dimension) {
      throw new Error("Cannot calculate similarity: dimension mismatch");
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < this.dimension; i++) {
      dotProduct += this.values[i] * other.values[i];
      normA += this.values[i] * this.values[i];
      normB += other.values[i] * other.values[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) {
      return 0;
    }

    return dotProduct / denominator;
  }

  /**
   * Calculate euclidean distance to another vector
   */
  euclideanDistance(other: EmbeddingVector): number {
    if (this.dimension !== other.dimension) {
      throw new Error("Cannot calculate distance: dimension mismatch");
    }

    let sum = 0;
    for (let i = 0; i < this.dimension; i++) {
      const diff = this.values[i] - other.values[i];
      sum += diff * diff;
    }

    return Math.sqrt(sum);
  }
}


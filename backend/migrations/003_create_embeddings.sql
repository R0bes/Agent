-- Embeddings Table
-- Tracks which memories have embeddings in Qdrant
CREATE TABLE IF NOT EXISTS embeddings (
  memory_id VARCHAR(255) PRIMARY KEY REFERENCES memories(id) ON DELETE CASCADE,
  model VARCHAR(100) NOT NULL,
  qdrant_point_id VARCHAR(255) NOT NULL UNIQUE,
  dimension INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for looking up by Qdrant point ID
CREATE INDEX IF NOT EXISTS idx_embeddings_qdrant_point ON embeddings(qdrant_point_id);


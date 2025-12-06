-- Memories Table
-- Stores extracted and compaktified memories
CREATE TABLE IF NOT EXISTS memories (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  kind VARCHAR(50) NOT NULL CHECK (kind IN ('fact', 'preference', 'summary', 'episode')),
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  conversation_id VARCHAR(255),
  tags TEXT[] DEFAULT '{}',
  
  -- Source Tracking
  source_references JSONB DEFAULT '[]'::jsonb,
  
  -- Compaktification Tracking
  is_compaktified BOOLEAN DEFAULT FALSE,
  compaktified_from TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_memories_user_kind ON memories(user_id, kind);
CREATE INDEX IF NOT EXISTS idx_memories_conversation ON memories(conversation_id);
CREATE INDEX IF NOT EXISTS idx_memories_tags ON memories USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_memories_compaktified ON memories(is_compaktified) WHERE is_compaktified = true;
CREATE INDEX IF NOT EXISTS idx_memories_created ON memories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memories_user_created ON memories(user_id, created_at DESC);


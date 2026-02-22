-- ============================================================
-- Nootes — pgvector Embedding Support
-- Run this in the Supabase SQL editor to enable vector storage.
-- ============================================================

-- Enable the pgvector extension (idempotent)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to documents table
-- llama-nemotron-embed-vl-1b-v2 outputs 2048-dimensional vectors
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS embedding vector(2048);

-- IVFFlat index for fast approximate nearest neighbor search
-- Adjust `lists` parameter based on row count (sqrt of total rows is a good starting point)
CREATE INDEX IF NOT EXISTS idx_documents_embedding
  ON documents USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Helper function: find similar documents by vector cosine similarity
-- Usage: SELECT * FROM match_documents(query_embedding, 0.8, 10);
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(2048),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  repo_id text,
  user_id uuid,
  title text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    d.id,
    d.repo_id,
    d.user_id,
    d.title,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM documents d
  WHERE 1 - (d.embedding <=> query_embedding) > match_threshold
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
$$;

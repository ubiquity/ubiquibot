-- Creates the `embeddings` table to store an embedding for every issue
-- We've decided to use the `text-embedding-ada-002` model in the beginning which has 1536 output dimensions
CREATE TABLE IF NOT EXISTS embeddings (
    id serial PRIMARY KEY,
    org character varying(255) NOT NULL,
    repo character varying(255) NOT NULL,
    issue integer NOT NULL,
    embedding vector(1536) NOT NULL, 
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL,
);
-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Documents Metadata Table
CREATE TABLE IF NOT EXISTS documents (
    doc_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename VARCHAR(255) NOT NULL,
    file_type VARCHAR(20) NOT NULL,
    upload_mode VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending_review',
    raw_file_path TEXT NOT NULL,
    annotated_pdf_path TEXT,
    uploaded_by INT REFERENCES users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Logical Blocks Table (Human-in-the-Loop Review)
CREATE TABLE IF NOT EXISTS logical_blocks (
    block_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_id UUID REFERENCES documents(doc_id) ON DELETE CASCADE,
    block_order INT NOT NULL,
    page_number INT NOT NULL,
    bbox FLOAT8[] NOT NULL,
    section_heading TEXT,
    raw_text TEXT NOT NULL,
    suggested_roles TEXT[] NOT NULL,
    approved_roles TEXT[] NOT NULL,
    confidence_score FLOAT8 NOT NULL,
    needs_human_review BOOLEAN DEFAULT TRUE,
    pii_triggered BOOLEAN DEFAULT FALSE
);

-- 5. Document Chunks Table (Protected by RLS)
CREATE TABLE IF NOT EXISTS document_chunks (
    chunk_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doc_id UUID REFERENCES documents(doc_id) ON DELETE CASCADE,
    parent_block_id UUID REFERENCES logical_blocks(block_id) ON DELETE SET NULL,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(768) NOT NULL,
    allowed_roles TEXT[] NOT NULL,
    page_number INT,
    bbox FLOAT8[],
    section_heading TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Immutable Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id BIGSERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id),
    user_role_at_query VARCHAR(50) NOT NULL,
    query_text TEXT NOT NULL,
    guardrail_status VARCHAR(50) NOT NULL,
    cache_hit BOOLEAN DEFAULT FALSE,
    retrieved_chunk_ids UUID[] DEFAULT '{}',
    latency_ms FLOAT8 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

/*
users: Stores user credentials and their assigned RBAC role (admin, hr, finance, engineering, intern, all_employees).

documents: Tracks uploaded PDFs and Excel sheets, their ingestion mode, and paths to the raw and visually painted PDFs.

logical_blocks: A staging table for our Human-in-the-Loop review workflow, holding extracted PDF paragraphs,
                their bounding box coordinates (bbox), AI-suggested roles, and confidence scores before final chunking.   

document_chunks: The production vector search table holding the 768-dim embeddings and allowed_roles array,
                which we will lock down with Row-Level Security in Microstep 2.3.

audit_logs: An immutable security log recording every query, guardrail status, cache hit, and retrieved chunk ID.
*/

 -- Creating index
/*
GIN Index (idx_chunks_allowed_roles): A Generalized Inverted Index on the allowed_roles array column for instant RBAC role-membership lookups.

HNSW Index (idx_chunks_embedding_hnsw): A Hierarchical Navigable Small World graph index on the 768-dimensional embedding column using 
                                        vector_cosine_ops (m = 16, ef_construction = 64) for fast approximate nearest-neighbor vector search.   

B-Tree Index (idx_chunks_doc_id): Standard index on doc_id for fast document lookups and deletions.   

*/

-- 7. GIN Index on allowed_roles array for fast RBAC filtering
CREATE INDEX IF NOT EXISTS idx_chunks_allowed_roles
ON document_chunks USING GIN (allowed_roles);

-- 8. HNSW Index on embedding column using vector_cosine_ops
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_hnsw
ON document_chunks USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 9. B-Tree Index on doc_id for fast document deletion/lookup
CREATE INDEX IF NOT EXISTS idx_chunks_doc_id
ON document_chunks (doc_id);
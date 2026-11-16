# Role-Based Access Control for Retrieval-Augmented Generation (RBAC RAG)

This project implements role-based access control for a retrieval-augmented generation (RAG) system to restrict document retrieval by user role. It prevents unauthorized data access by enforcing permissions at the PostgreSQL database layer rather than relying on LLM system prompt instructions or application-level filtering.

## How It Works

A user logs in and receives a JWT containing their assigned role. For each query, the backend opens a PostgreSQL transaction under a restricted application user and sets the session variable `app.current_user_role` to the role extracted from the verified token. PostgreSQL Row-Level Security (RLS) evaluates the `allowed_roles` array on chunk rows before executing BM25 full-text search and pgvector similarity search, ensuring unauthorized chunks are never returned. Retrieved candidates are merged using Reciprocal Rank Fusion (RRF), re-ordered with a cross-encoder reranker, and passed to an LLM to generate an answer with grounded bounding-box citations. The query and retrieved chunk identifiers are written to an audit log.

```mermaid
flowchart LR
    A[Login / JWT] --> B[Set role per DB tx]
    B --> C[Postgres RLS filters chunks]
    C --> D[BM25 + Vector search]
    D --> E[RRF Rank Fusion]
    E --> F[Cross-Encoder Rerank]
    F --> G[LLM Answer + Citations]
    G --> H[Audit Log]
```

## Tech Stack

- Backend: FastAPI (Python 3.11+)
- Frontend: React 19, TypeScript, Vite, Tailwind CSS
- Database: PostgreSQL 16 with pgvector and Row-Level Security
- Cache: Redis 7 (role-scoped query caching and token revocation checks)
- Models: BAAI/bge-base-en-v1.5 (embeddings), cross-encoder/ms-marco-MiniLM-L-6-v2 (reranking), gpt-4o-mini (classification and generation)

## Key Design Choices

- Database-enforced RLS: Access policies execute directly inside PostgreSQL via `SET LOCAL app.current_user_role`, preventing logic errors in application code from exposing restricted rows.
- Identity derived strictly from JWT: User roles are extracted from the verified JWT payload; role declarations or overrides provided inside user prompts are ignored.
- Role-scoped cache keys: Redis semantic cache entries are keyed by `role:query_hash`, preventing an unprivileged role from receiving cached answers generated for a privileged role.
- Human review step for tagging: Automated document chunk classification flags chunks with confidence scores below 0.90 for manual review and role editing in the UI before publishing.
- Audit logging: Every query logs the requesting user identity, active role, query text, timestamp, and retrieved chunk IDs to both PostgreSQL and markdown log files.

## Evaluation

Evaluations were performed against a synthetic corpus of 7 documents (199 pages, 380 chunks) using 70 golden test queries. Because this is a small synthetic dataset, the results demonstrate that the access control and retrieval pipeline function as designed under test conditions, not that the architecture is infallible across all real-world edge cases.

### Retrieval Ablation (70 Queries)

| Retrieval Mode | Recall@5 | MRR@5 | p95 Latency | Leaks |
| :--- | :---: | :---: | :---: | :---: |
| `bm25_only` | 0.8857 | 0.7469 | 35.68 ms | 0 |
| `vector_only` | 0.8143 | 0.6433 | 95.74 ms | 0 |
| `hybrid_rrf` | 0.8714 | 0.7024 | 127.29 ms | 0 |
| `hybrid_rerank` | 0.9286 | 0.7686 | 2215.52 ms | 0 |

- Cross-role isolation: Across 165 cross-boundary queries testing 825 retrieved chunks, 0 unauthorized chunks were returned (100% isolation across test roles).
- Red-team adversarial testing: Across 60 adversarial prompts spanning direct unauthorized access, role spoofing, indirect injection, and cache probing, 0 data leaks occurred.

## Limitations

- Small synthetic dataset: Tested only against 7 synthetic PDF documents; performance on noisy, scanned, or complex tabular documents has not been evaluated.
- Single-role assignments: The system models one active role per user session without role hierarchies (e.g., senior roles inheriting junior permissions) or multi-role memberships.
- Reranker latency: The cross-encoder reranker accounts for most query latency, increasing p95 response times to ~2.2 seconds compared to ~127 ms for Hybrid RRF.
- Hardcoded role schema: The role list (`engineering`, `hr`, `finance`, `all_employees`, `admin`) is fixed in database migration scripts rather than managed dynamically via an administration API.
- Synchronous ingestion: Ingestion and embedding generation run synchronously within request handlers rather than through a background job queue.

## Setup and Run

### 1. Database and Cache
```bash
cd rbac-rag-backend
docker compose up -d
```

### 2. Backend Setup
```bash
cp .env.example .env
# Set LLM_API_KEY in .env

python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd ../rbac-rag-frontend
npm install
npm run dev
```
The interface is accessible at `http://localhost:5173`.

### 4. Running Tests and Evaluations
```bash
cd ../rbac-rag-backend
pytest
python evaluation/run_ablation_eval_v2.py
python evaluation/run_cross_role_eval_v2.py
python evaluation/run_red_team_v2.py
```

## Project Structure

```
.
├── rbac-rag-backend/
│   ├── backend/
│   │   ├── auth/         # JWT verification and role extraction
│   │   ├── db/           # PostgreSQL connection, schema, and RLS policies
│   │   ├── ingestion/    # PDF parsing, auto-tagging, chunking, and embedding
│   │   ├── models/       # Pydantic request and response schemas
│   │   ├── retrieval/    # BM25, vector search, RRF fusion, and reranking
│   │   └── routers/      # FastAPI route definitions (auth, chat, ingest)
│   ├── evaluation/       # Benchmark scripts, golden datasets, and result logs
│   ├── storage/          # Local directories for uploads and annotated PDFs
│   └── tests/            # Pytest test suites
├── rbac-rag-frontend/
│   └── src/              # React components (chat, persona switcher, PDF viewer)
└── RAG_EVAL_TESTING/
    └── Documents/        # 7 synthetic enterprise PDF documents used for evaluation
```

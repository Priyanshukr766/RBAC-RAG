# Project Handoff & Context State: Production RBAC RAG Backend

## 1. Mentoring & Execution Rules (CRITICAL — MUST FOLLOW IN NEXT CHAT)
1. **Strict One-Microstep-at-a-Time Pacing:** Never bundle multiple microsteps (unless explicitly pairing a module with its immediate unit test at the end of a phase) and never jump ahead. Give the instructions for **one microstep**, wait for the user to run the verification command and paste the output, and only then proceed to the next microstep.
2. **User Writes All Code in IDE:** The user is building this from scratch to learn the architecture deeply. **Do NOT use PowerShell `Out-File` or `[System.IO.File]::WriteAllText` to generate code files anymore** (PowerShell multi-line pastes caused UTF-8 BOM and indentation issues earlier). Instead:
   * State the exact **Target File** to create or edit in their code editor (VS Code / Cursor).
   * Provide the clean Python/SQL code block to paste into that file (or exact snippet-wise diffs: what lines to remove and what lines to add).
   * Provide the exact **Windows PowerShell verification command** to run in the terminal.
3. **Explain the "Why":** Start each microstep with a brief "Why We Do This Step" explanation so the user understands the architectural and security purpose before writing the code.

---

## 2. Local Environment & Infrastructure State
* **OS & Shell:** Windows PowerShell (`D:\RBAC RAG\rbac-rag-backend`)
* **Python Version:** `Python 3.13.6` (invoked via `python`, NOT `python3`).
* **Virtual Environment:** `.venv` located at `D:\RBAC RAG\rbac-rag-backend\.venv` (activated via `.\.venv\Scripts\Activate.ps1`). All packages from `requirements.txt` are installed.
* **PYTHONPATH:** In PowerShell, always set `$env:PYTHONPATH = "."` before running Python one-liners or `pytest`.
* **Docker Compose Infrastructure:** Running and healthy (`docker compose up -d`):
  * `rbac_rag_postgres` (`pgvector/pgvector:pg16` on port `5432`, DB: `rbac_rag`)
  * `rbac_rag_redis` (`redis:7-alpine` on port `6379`)
* **Note on Local `psql`:** The host Windows machine does not rely on a local `psql` binary; SQL files can be executed either via `backend.db.session.init_db_schema()` in Python or via `Get-Content <file> | docker exec -i rbac_rag_postgres psql -U postgres -d rbac_rag`.

---

## 3. Important Architectural & Free-LLM Decisions Made
1. **No Paid OpenAI API Key:** The user is **not** using a paid OpenAI key.
   * For **Microstep 5.2 (`backend/ingestion/llm_block_classifier.py`)** and **Microstep 10.2 (`backend/generation/llm_client.py`)**, we must support **free OpenAI-compatible providers** (such as **Groq** `https://api.groq.com/openai/v1` with `llama-3.3-70b-versatile` or **Google Gemini** OpenAI-compatible endpoint `https://generativelanguage.googleapis.com/v1beta/openai/` with `gemini-2.0-flash` / `gemini-1.5-flash`) via an optional `LLM_BASE_URL` setting or auto-detection, **AND** maintain the deterministic offline fallback whenever `LLM_API_KEY` is still set to the placeholder `"sk-your-key-here"` or empty so all unit tests and CI pass $100\%$ offline without spending API credits.
2. **UTF-8 BOM Protection on Windows:** In `backend/db/session.py`, `schema.sql` and `rls_policies.sql` are read using `encoding="utf-8-sig"` so that any Windows UTF-8 BOM (`\ufeff`) is stripped automatically before `psycopg` executes the SQL.
3. **Native `bcrypt` Over `passlib`:** Because Python 3.13 deprecates internal modules used by older `passlib` versions, `backend/auth/jwt_handler.py` uses `bcrypt.hashpw` and `bcrypt.checkpw` directly.

---

## 4. Completed Phases & Microsteps Summary (1.1 through 5.1)

### Phase 1: Project Initialization, Environment Configuration & Docker Infrastructure (COMPLETED)
* **Microstep 1.1:** Created directory tree (`backend/auth`, `backend/db`, `backend/models`, `backend/ingestion`, `backend/retrieval`, `backend/generation`, `backend/routers`, `storage/raw_uploads`, `storage/annotated_pdfs`, `evaluation`, `scripts`, `tests`, `.github/workflows`) and all `__init__.py` files.
* **Microstep 1.2:** Created `requirements.txt` and installed all dependencies into `.venv`.
* **Microstep 1.3:** Created `.env`, `.env.example`, and `backend/config.py` (`Settings` class with `DATABASE_ADMIN_URL`, `DATABASE_APP_URL`, `REDIS_URL`, `JWT_SECRET_KEY`, `EMBEDDING_MODEL_NAME="BAAI/bge-base-en-v1.5"`, `EMBEDDING_DIM=768`, `RERANKER_MODEL_NAME="cross-encoder/ms-marco-MiniLM-L-6-v2"`, `AUTO_APPROVE_CONFIDENCE_THRESHOLD=0.90`).
* **Microstep 1.4:** Created `docker-compose.yml` and started `rbac_rag_postgres` and `rbac_rag_redis`.
* **Microstep 1.5:** Created and verified `scripts/verify_infra.py` (`Postgres OK | Redis OK`).

### Phase 2: Database Schema, Indexes & Kernel-Level Row-Level Security (COMPLETED)
* **Microstep 2.1 & 2.2 (`backend/db/schema.sql`):** Created extensions (`vector`, `pgcrypto`), all 5 tables (`users`, `documents`, `logical_blocks`, `document_chunks`, `audit_logs`), and 3 indexes (`idx_chunks_allowed_roles` GIN, `idx_chunks_embedding_hnsw` HNSW with `vector_cosine_ops`, `idx_chunks_doc_id` B-Tree).
* **Microstep 2.3 (`backend/db/rls_policies.sql`):** Created non-superuser role `rag_app_user` (`password 'rag_app_pass'`), enabled and forced RLS on `document_chunks`, and created `chunk_rbac_select_policy` and `chunk_rbac_insert_policy` using `current_setting('app.current_user_role', true)`.
* **Microstep 2.4 (`backend/db/session.py`):** Implemented `app_pool`, `init_db_schema()`, `get_admin_cursor()`, and `get_rls_cursor(user_role, enable_iterative_scan=True)` which runs `SELECT set_config('app.current_user_role', %s, true);` and `SET LOCAL hnsw.iterative_scan = relaxed_order;`.
* **Microstep 2.5 (`tests/test_phase2_rls.py`):** Verified kernel-level RLS isolation (`1 passed`).

### Phase 3: Authentication, JWT Badges & Sub-Second Live Role Revocation (COMPLETED)
* **Microstep 3.1 (`backend/models/auth_schemas.py`):** Defined `AllowedRole`, `UserCreateRequest`, `UserLoginRequest`, `TokenResponse`, `RoleUpdateRequest`, `AuthenticatedUser`.
* **Microstep 3.2 (`backend/auth/jwt_handler.py`):** Implemented `hash_password`, `verify_password`, `create_jwt_token`, `decode_jwt_token`.
* **Microstep 3.3 (`backend/auth/live_role_guard.py`):** Implemented `sync_user_role_to_redis` and `get_live_user_state` using Redis hash `user_live_state:{user_id}` with PostgreSQL fallback.
* **Microstep 3.4 (`backend/auth/dependencies.py`):** Implemented `get_current_user` (which overrides the JWT role claim with `get_live_user_state(user_id)`) and `require_admin`.
* **Microstep 3.5 (`backend/routers/auth_router.py` & `tests/test_phase3_auth_revocation.py`):** Implemented `/api/v1/auth/register`, `/login`, `/admin/update-role`, `/me` and passed the sub-second role revocation test (`1 passed`).

### Phase 4: Ingestion Engine Part 1 — Layout-Aware PDF Parsing & Coordinate Extraction (COMPLETED)
* **Microstep 4.1 (`backend/models/ingestion_schemas.py`):** Defined `BoundingBox`, `LogicalBlockDraft`, and `ChunkRecord`.
* **Microstep 4.2 (`backend/ingestion/bbox_normalizer.py`):** Implemented `normalize_to_top_left_bbox` converting Docling `BOTTOMLEFT` coordinates into PyMuPDF `TOPLEFT` `[x0, y0, x1, y1]` coordinates.
* **Microstep 4.3 (`backend/ingestion/pdf_express_parser.py`):** Implemented `parse_pdf_express` using Docling with a `fitz` fallback.
* **Microstep 4.4 & 4.5 (`backend/ingestion/pdf_structural_parser.py` & `tests/test_phase4_pdf_parser.py`):** Implemented `extract_logical_blocks_from_pdf` (grouping paragraphs/tables under active section headings and merging bounding boxes up to $\sim 250$ words) and passed `tests/test_phase4_pdf_parser.py` (`1 passed`).

### Phase 5: Ingestion Engine Part 2 — AI Pre-Tagging, PII Scanner & Least-Privilege Quarantine (IN PROGRESS)
* **Microstep 5.1 (`backend/ingestion/pii_regex_scanner.py`) — COMPLETED:** Implemented `scan_block_for_sensitive_patterns(heading: str, text: str) -> dict` checking currency + HR compensation keywords, HR status/PII patterns, Finance metrics, and Engineering keywords. Verified with terminal one-liner (`PII Scanner OK`).

---

## 5. Exact Next Step to Execute in the New Chat
Start immediately at **Phase 5, Microstep 5.2: Build Context-Aware LLM Block Classifier (`backend/ingestion/llm_block_classifier.py`)**:
* Implement `classify_block_with_llm(heading: str, text: str) -> tuple[list[AllowedRole], float, str]`.
* Support free OpenAI-compatible APIs (Groq / Gemini) if the user provides an API key, while including a clean, deterministic rule-based scorer fallback when `settings.LLM_API_KEY == "sk-your-key-here"` or offline so the verification check (`classify_block_with_llm("General Notes", "Our AWS cloud hosting bill exceeded the Q3 finance budget by $120,000.")`) and all `pytest` suites run without requiring a paid key.
# Project Handoff & Context State: Production RBAC RAG Backend

## 1. Mentoring & Execution Rules (CRITICAL — MUST FOLLOW IN NEXT CHAT)
1. **Strict One-Microstep-at-a-Time Pacing:** Never bundle multiple microsteps (unless explicitly pairing the final module of a phase with its unit test file at the very end of a phase) and never jump ahead. Give the instructions for **one microstep**, wait for the user to run the verification command and paste the output, and only then proceed to the next microstep.
2. **User Writes All Code in IDE:** The user is building this from scratch to learn the architecture deeply. **Do NOT use PowerShell `Out-File` or `[System.IO.File]::WriteAllText` to generate code files.** Instead:
   * State the exact **Target File** to create or edit in their code editor (VS Code / Cursor).
   * Provide the clean Python/SQL code block to paste into that file (or exact snippet-wise diffs: what lines to remove and what lines to add).
   * Provide the exact **Windows PowerShell verification command** to run in the terminal. For multi-line Python verification commands in PowerShell, either use a clean single-line command without compound statements (`with`/`for`/`try`) after semicolons, or use PowerShell's `@' ... '@ | python` heredoc syntax so Python indentation and `$` characters are never mangled.
3. **Explain the "Why":** Start each microstep with a brief "Why We Do This Step" explanation so the user understands the architectural and security purpose before writing the code.

---

## 2. Local Environment & Infrastructure State
* **OS & Shell:** Windows PowerShell (`D:\RBAC RAG\rbac-rag-backend`)
* **Python Version:** `Python 3.13.6` (invoked via `python`, NOT `python3`).
* **Virtual Environment:** `.venv` located at `D:\RBAC RAG\rbac-rag-backend\.venv` (activated via `.\.venv\Scripts\Activate.ps1`). All packages from `requirements.txt` are installed.
* **PYTHONPATH:** In PowerShell, always set `$env:PYTHONPATH = "."` before running Python commands or `pytest`.
* **Docker Compose Infrastructure:** Running and healthy (`docker compose up -d`):
  * `rbac_rag_postgres` (`pgvector/pgvector:pg16` on port `5432`, DB: `rbac_rag`)
  * `rbac_rag_redis` (`redis:7-alpine` on port `6379`)
* **Note on Local `psql`:** The host Windows machine does not rely on a local `psql` binary; SQL files are executed via `backend.db.session.init_db_schema()` in Python.

---

## 3. Important Architectural & Technical Details in Our Codebase
1. **No Paid OpenAI API Key (Free-Tier & Offline-First Support):**
   * The user is **not** using a paid OpenAI key.
   * In **Microstep 5.2 (`backend/ingestion/llm_block_classifier.py`)**, we implemented `_resolve_client_and_model` which automatically supports **Groq** (`gsk_...` $\rightarrow$ `https://api.groq.com/openai/v1` with `llama-3.3-70b-versatile`) and **Google Gemini** (`AIza...` $\rightarrow$ `https://generativelanguage.googleapis.com/v1beta/openai/` with `gemini-2.0-flash`), **AND** falls back to a deterministic offline classifier whenever `settings.LLM_API_KEY` is `"sk-your-key-here"` or empty.
   * **CRITICAL FOR UPCOMING MICROSTEP 10.2 (`backend/generation/llm_client.py`):** Must use the exact same pattern—supporting free Groq/Gemini keys if configured, while providing a clean, deterministic extractive fallback when `settings.LLM_API_KEY == "sk-your-key-here"` or offline so all unit tests (`test_phase10_end_to_end_chat.py`, `test_phase12_red_team.py`) pass $100\%$ offline without spending API credits.
2. **`dict_row` Cursor Factory in `backend/db/session.py`:**
   * Both `get_admin_cursor()` and `get_rls_cursor()` return rows where `isinstance(row, dict)` is `True` (or support both `dict` and `tuple` via `row["col"] if isinstance(row, dict) else row[idx]`). Always handle `dict` rows when reading from `cur.fetchone()` or `cur.fetchall()` so you never hit `KeyError: 0`.
3. **Foreign-Key Safe `uploaded_by` on `documents` Table:**
   * When inserting into `documents` inside API endpoints or tests where `admin_user.user_id` might be a mocked ID via `app.dependency_overrides[require_admin]`, use `(SELECT user_id FROM users WHERE user_id = %s)` for `uploaded_by` so real user IDs are recorded and mocked test user IDs cleanly resolve to `NULL` without throwing `ForeignKeyViolation`.
4. **Lucene Positive-IDF Formula in `backend/retrieval/bm25_search.py`:**
   * Standard `rank_bm25.BM25Okapi` produces $0.0$ IDF when an RLS-filtered corpus has $N = 2$ documents and a query term appears in $n = 1$ document ($\ln((2 - 1 + 0.5)/(1 + 0.5)) = \ln(1) = 0$). In `bm25_search.py`, we compute document frequencies from `bm25.doc_freqs` and overwrite `bm25.idf[word] = math.log(1.0 + (n_docs - df + 0.5) / (df + 0.5))` so small RLS-filtered corpora always produce strictly positive BM25 scores for matching terms.
5. **UTF-8 BOM Protection on Windows:** In `backend/db/session.py`, `schema.sql` and `rls_policies.sql` are read using `encoding="utf-8-sig"`.
6. **Native `bcrypt` Over `passlib`:** `backend/auth/jwt_handler.py` uses `bcrypt.hashpw` and `bcrypt.checkpw` directly for Python 3.13 compatibility.

---

## 4. Completed Phases & Microsteps Summary (1.1 through 9.2)

### Phase 1: Project Initialization, Environment Configuration & Docker Infrastructure (COMPLETED)
* **Microsteps 1.1 – 1.5:** Created folder structure, `requirements.txt`, `.env`, `backend/config.py`, `docker-compose.yml` (`rbac_rag_postgres` + `rbac_rag_redis`), and `scripts/verify_infra.py` (`Postgres OK | Redis OK`).

### Phase 2: Database Schema, Indexes & Kernel-Level Row-Level Security (COMPLETED)
* **Microsteps 2.1 – 2.5:** Created `backend/db/schema.sql` (5 tables: `users`, `documents`, `logical_blocks`, `document_chunks`, `audit_logs`; GIN + HNSW indexes), `backend/db/rls_policies.sql` (`rag_app_user` role + forced RLS policies on `document_chunks`), `backend/db/session.py` (`init_db_schema`, `get_admin_cursor`, `get_rls_cursor` with `app.current_user_role` and `hnsw.iterative_scan = relaxed_order`), and passed `tests/test_phase2_rls.py`.

### Phase 3: Authentication, JWT Badges & Sub-Second Live Role Revocation (COMPLETED)
* **Microsteps 3.1 – 3.5:** Created `backend/models/auth_schemas.py`, `backend/auth/jwt_handler.py`, `backend/auth/live_role_guard.py` (Redis live state `user_live_state:{user_id}` with Postgres fallback), `backend/auth/dependencies.py` (`get_current_user`, `require_admin`), `backend/routers/auth_router.py`, and passed `tests/test_phase3_auth_revocation.py`.

### Phase 4: Ingestion Engine Part 1 — Layout-Aware PDF Parsing & Coordinate Extraction (COMPLETED)
* **Microsteps 4.1 – 4.5:** Created `backend/models/ingestion_schemas.py` (`BoundingBox`, `LogicalBlockDraft`, `ChunkRecord`), `backend/ingestion/bbox_normalizer.py` (`normalize_to_top_left_bbox`), `backend/ingestion/pdf_express_parser.py` (`parse_pdf_express`), `backend/ingestion/pdf_structural_parser.py` (`extract_logical_blocks_from_pdf`), and passed `tests/test_phase4_pdf_parser.py`.

### Phase 5: Ingestion Engine Part 2 — AI Pre-Tagging, PII Scanner & Least-Privilege Quarantine (COMPLETED)
* **Microsteps 5.1 – 5.5:** Created `backend/ingestion/pii_regex_scanner.py` (`scan_block_for_sensitive_patterns`), `backend/ingestion/llm_block_classifier.py` (`classify_block_with_llm`), `backend/ingestion/auto_tagger.py` (`auto_tag_logical_blocks` enforcing Least-Privilege Quarantine and the $0.90$ confidence gate), `backend/ingestion/staging_store.py` (`save_logical_blocks`, `get_logical_blocks_for_doc`, `update_logical_block_roles`), and passed `tests/test_phase5_autotagger.py`.

### Phase 6: Ingestion Engine Part 3 — Visual Audit PDF Painter & Two-Stage Vector Chunker (COMPLETED)
* **Microsteps 6.1 – 6.5:** Created `backend/ingestion/pdf_box_painter.py` (`paint_annotated_pdf` drawing RGB bounding boxes and `[ACCESS: ...]` badges with PyMuPDF), `backend/ingestion/stage2_chunker.py` (`split_text_into_word_chunks`, `create_chunks_from_approved_blocks`), `backend/ingestion/excel_row_splitter.py` (`split_excel_into_role_chunks`), `backend/ingestion/embedder.py` (`get_embedder`, `embed_texts`, `embed_query` using `BAAI/bge-base-en-v1.5`), `backend/ingestion/chunk_writer.py` (`embed_and_store_chunks`), and passed `tests/test_phase6_visual_and_chunking.py`.

### Phase 7: FastAPI Ingestion & Human-in-the-Loop (HITL) Admin Endpoints (COMPLETED)
* **Microsteps 7.1 – 7.5:** Created `backend/routers/ingest_router.py` implementing:
  * `POST /api/v1/ingest/upload` (supports both `express_single_role` Path A and `hitl_mixed_visual` Path B)
  * `GET /api/v1/ingest/documents`
  * `GET /api/v1/ingest/documents/{doc_id}/blocks`
  * `PUT /api/v1/ingest/documents/{doc_id}/blocks` (updates `approved_roles` + triggers `paint_annotated_pdf`)
  * `GET /api/v1/ingest/documents/{doc_id}/annotated-pdf` (`FileResponse` PDF stream)
  * `POST /api/v1/ingest/documents/{doc_id}/publish`
  * `POST /api/v1/ingest/upload-excel` (Path C spreadsheet column splitter)
  * Passed `tests/test_phase7_ingest_api.py`.

### Phase 8: Query Guardrails & Role-Scoped Semantic Cache (COMPLETED)
* **Microsteps 8.1 – 8.5:** Created `backend/retrieval/injection_guard.py` (`detect_prompt_injection`), `backend/retrieval/scope_guard.py` (`check_query_scope`), `backend/retrieval/guardrails.py` (`run_input_guardrails`), `backend/retrieval/role_cache.py` (`compute_role_cache_key`, `get_cached_response`, `set_cached_response`, `invalidate_role_cache` using `rag_cache:{role}:{sha256}`), and passed `tests/test_phase8_guardrails_cache.py`.

### Phase 9: Pre-Filtered Hybrid Search (HNSW Vector + BM25) & Cross-Encoder Reranking (IN PROGRESS)
* **Microstep 9.1 (`backend/retrieval/vector_search.py`) — COMPLETED:** Implemented `search_vector_leg(user_role: str, query_vector: list[float], top_k: int = 50) -> list[dict]` using `get_rls_cursor(user_role, enable_iterative_scan=True)`. Verified (`Microstep 9.1 Vector Search Leg OK`).
* **Microstep 9.2 (`backend/retrieval/bm25_search.py`) — COMPLETED:** Implemented `tokenize_for_bm25` and `search_bm25_leg(user_role: str, query: str, top_k: int = 50) -> list[dict]` using `BM25Okapi` with Lucene positive-IDF correction over RLS-authorized chunks. Verified (`Microstep 9.2 BM25 Search Leg OK`).

---

## 5. Exact Next Step to Execute in the New Chat
Start immediately at **Phase 9, Microstep 9.3: Implement Reciprocal Rank Fusion ($\text{RRF}$) Merger (`backend/retrieval/rank_fusion.py`)**:
* Implement `reciprocal_rank_fusion(vector_results: list[dict], bm25_results: list[dict], k: int = 60, top_n: int = 50) -> list[dict]`.
* Use the formula:
  $$\text{RRF\_Score}(d) = \frac{1}{k + \text{Rank}_{\text{vector}}(d)} + \frac{1}{k + \text{Rank}_{\text{bm25}}(d)}$$
* Provide the explanation, target file code for `backend/retrieval/rank_fusion.py`, and the PowerShell verification check testing `"chk_A"` at `#1` in BM25 and `#4` in Vector ($\frac{1}{61} + \frac{1}{64} \approx 0.032018$).
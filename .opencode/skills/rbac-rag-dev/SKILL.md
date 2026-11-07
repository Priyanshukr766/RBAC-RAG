---
name: RBAC RAG Dev
description: Work on the RBAC RAG backend in this repo. Use for implementing or verifying backend phases, running the Postgres/Redis stack, writing pytest checks, and following the project's RLS, auth, ingestion, retrieval, and offline-LLM conventions.
---

# RBAC RAG Backend

A phase-by-phase build of a production RBAC RAG system in `rbac-rag-backend/`.
Phases and design decisions are documented in `docs/`:

- `docs/step_by_step_ai_agent_implementation_planV2.md` — full build plan
- `docs/session_handoff_to_microstep_5_2.md` — environment + architecture decisions
- `docs/complete_project_blueprint_technical_requirements_document.md` — requirements

Read the plan before starting a new phase. Do not skip ahead; the project is
built one microstep at a time, each with a verification step.

## Environment (Windows PowerShell)

Work from `D:\RBAC RAG\rbac-rag-backend`:

```powershell
.\.venv\Scripts\Activate.ps1
$env:PYTHONPATH = "."
docker compose up -d          # Postgres (pgvector) + Redis
python scripts\verify_infra.py
```

- Python is `python` (3.13), never `python3`.
- `.env` is required and already exists locally; never commit or print it.
- The app pool connects as the non-superuser `rag_app_user`; admin operations
  use the superuser URL. Keep that split intact.

## Verification

Tests are phase-numbered and live in `rbac-rag-backend/tests/`:

```powershell
pytest tests\test_phase4_pdf_parser.py -v
pytest -q
```

- Infrastructure must be running first; several tests call `init_db_schema()`.
- There is no `backend/main.py`. Router tests mount the router on their own
  `FastAPI()` app and override `get_current_user`, so follow that pattern for
  new endpoint tests.
- Report exact pass/fail counts from the command output.

## Layout

| Path | Purpose |
| --- | --- |
| `backend/config.py` | Pydantic settings loaded from `.env` |
| `backend/db/` | `session.py`, `schema.sql`, `rls_policies.sql` |
| `backend/auth/` | JWT, bcrypt hashing, Redis live-role guard, dependencies |
| `backend/models/` | Pydantic schemas |
| `backend/ingestion/` | PDF parsing, chunking, PII scan, auto-tagging, embeddings |
| `backend/retrieval/` | Vector + BM25 hybrid search, RRF, reranker, guardrails |
| `backend/generation/` | Prompt builder, LLM client, citation verification, audit |
| `backend/routers/` | `auth_router`, `ingest_router`, `chat_router` |
| `storage/` | Raw uploads and annotated PDFs (do not commit artifacts) |
| `evaluation/` | Evaluation scripts/notebooks |

## Conventions and hard-won decisions

- **Offline LLM fallback is mandatory.** When `LLM_API_KEY` is the placeholder
  `sk-your-key-here` or empty, use a deterministic rule-based path so every test
  passes without a paid key. Optional `LLM_BASE_URL` supports free
  OpenAI-compatible providers (Groq, Gemini); do not hardcode a vendor.
- **RLS is enforced in Postgres.** Application reads go through
  `get_rls_cursor(user_role)`, which runs
  `set_config('app.current_user_role', %s, true)`.
  Never query chunks as superuser for user-facing retrieval.
- **Windows BOM safety.** Read `.sql` files with `encoding="utf-8-sig"`.
- **bcrypt directly**, not passlib (Python 3.13 deprecation issue).
- JWTs carry a role claim, but authorization always uses the live role from
  Redis (`user_live_state:<id>`) with PostgreSQL fallback.
- Embeddings: `BAAI/bge-base-en-v1.5`, dimension 768; HNSW cosine index.
- Chunk authorization is a `allowed_roles` array with a GIN index.
- Auto-approve ingestion only at confidence >= `AUTO_APPROVE_CONFIDENCE_THRESHOLD`
  (0.90); otherwise quarantine for review.

## Working style for this repo

- Explain the "why" before code: the user is learning the architecture.
- Change one microstep at a time, then show the exact verification command.
- State the target file explicitly, and use UTF-8 without BOM.
- Add or extend the matching `tests/test_phaseN_*.py` when a phase changes.
- Keep unrelated settings and existing behavior untouched.

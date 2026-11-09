import logging
import time
from typing import Any, Literal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field

from backend.auth.dependencies import get_current_user, require_admin
from backend.generation.audit_logger import get_recent_audit_logs, write_audit_log
from backend.generation.citation_verifier import verify_and_enrich_citations
from backend.generation.llm_client import generate_grounded_answer
from backend.generation.retrieval_md_logger import log_query_retrieval
from backend.models.auth_schemas import AuthenticatedUser
from backend.retrieval.chunk_lookup import fetch_chunks_by_ids
from backend.retrieval.guardrails import run_input_guardrails
from backend.retrieval.hybrid_search import RetrievalMode, retrieve_for_user
from backend.retrieval.role_cache import get_cached_response, set_cached_response

router = APIRouter(prefix="/api/v1/chat", tags=["Chat & Audit"])
logger = logging.getLogger(__name__)


class ChatQueryRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    mode: RetrievalMode = "hybrid_rerank"
    top_k: int = Field(default=5, ge=1, le=20)


@router.post("/query")
def chat_query_endpoint(
    payload: ChatQueryRequest,
    user: AuthenticatedUser = Depends(get_current_user),
) -> dict[str, Any]:
    """
    7-Stage Production RBAC RAG Query Pipeline:
      1. Live Role Verification (via Depends(get_current_user))
      2. Input Guardrails (Prompt Injection + Workplace Scope Guard)
      3. Role-Scoped Redis Semantic Cache Lookup
      4. Pre-Filtered Hybrid Search (HNSW Vector + BM25 under Postgres RLS)
      5. RRF Fusion + Cross-Encoder Reranking
      6. Grounded Generation + Citation Verification & BBox Enrichment
      7. Immutable Security Audit Logging
    """
    t0 = time.perf_counter()
    clean_query = payload.query.strip()

    # Stage 2: Input Guardrails
    guard = run_input_guardrails(clean_query)
    if not guard["passed"]:
        latency_ms = round((time.perf_counter() - t0) * 1000.0, 2)
        write_audit_log(
            user_id=user.user_id,
            user_role=user.role,
            query_text=clean_query,
            guardrail_status=guard["status"],
            cache_hit=False,
            retrieved_chunk_ids=[],
            latency_ms=latency_ms,
        )
        log_query_retrieval(
            user_id=user.user_id,
            user_role=user.role,
            query=clean_query,
            mode=payload.mode,
            chunks=[],
            cache_hit=False,
            guardrail_status=guard["status"],
        )
        return {
            "answer": guard["reason"],
            "role_used": user.role,
            "guardrail_status": guard["status"],
            "cache_hit": False,
            "citations": [],
            "retrieved_chunk_ids": [],
            "latency_ms": latency_ms,
        }

    # Stage 3: Role-Scoped Semantic Cache Lookup (only for default hybrid_rerank mode)
    if payload.mode == "hybrid_rerank":
        cached = get_cached_response(user.role, clean_query)
        if cached is not None:
            latency_ms = round((time.perf_counter() - t0) * 1000.0, 2)
            cached_chunk_ids = [str(cid) for cid in cached.get("retrieved_chunk_ids", [])]
            write_audit_log(
                user_id=user.user_id,
                user_role=user.role,
                query_text=clean_query,
                guardrail_status="passed",
                cache_hit=True,
                retrieved_chunk_ids=cached_chunk_ids,
                latency_ms=latency_ms,
            )
            try:
                cached_chunks = fetch_chunks_by_ids(user.role, cached_chunk_ids)
            except Exception:
                logger.exception("Could not reload cached chunks for retrieval logging")
                cached_chunks = []
            log_query_retrieval(
                user_id=user.user_id,
                user_role=user.role,
                query=clean_query,
                mode=payload.mode,
                chunks=cached_chunks,
                cache_hit=True,
                guardrail_status="passed",
            )
            response_copy = dict(cached)
            response_copy["cache_hit"] = True
            response_copy["latency_ms"] = latency_ms
            return response_copy

    # Stage 4 & 5: Pre-Filtered RLS Hybrid Search + RRF + Cross-Encoder Rerank
    top_chunks = retrieve_for_user(
        user_role=user.role,
        query=clean_query,
        mode=payload.mode,
        top_k=payload.top_k,
    )
    retrieved_chunk_ids = [str(c["chunk_id"]) for c in top_chunks]

    log_query_retrieval(
        user_id=user.user_id,
        user_role=user.role,
        query=clean_query,
        mode=payload.mode,
        chunks=top_chunks,
        cache_hit=False,
        guardrail_status="passed",
    )

    # Stage 6: Grounded Generation & Post-Generation Citation Verification
    gen = generate_grounded_answer(
        query=clean_query,
        chunks=top_chunks,
        user_role=user.role,
    )
    verified_citations = verify_and_enrich_citations(
        cited_chunk_ids=gen.get("cited_chunk_ids", []),
        retrieved_chunks=top_chunks,
    )

    latency_ms = round((time.perf_counter() - t0) * 1000.0, 2)
    response_data: dict[str, Any] = {
        "answer": gen["answer"],
        "role_used": user.role,
        "guardrail_status": "passed",
        "cache_hit": False,
        "citations": verified_citations,
        "retrieved_chunk_ids": retrieved_chunk_ids,
        "latency_ms": latency_ms,
    }

    if payload.mode == "hybrid_rerank":
        set_cached_response(user.role, clean_query, response_data)

    # Stage 7: Immutable Audit Log
    write_audit_log(
        user_id=user.user_id,
        user_role=user.role,
        query_text=clean_query,
        guardrail_status="passed",
        cache_hit=False,
        retrieved_chunk_ids=retrieved_chunk_ids,
        latency_ms=latency_ms,
    )

    return response_data


@router.get("/admin/audit-logs")
def list_audit_logs_endpoint(
    limit: int = Query(default=100, ge=1, le=500),
    admin_user: AuthenticatedUser = Depends(require_admin),
) -> dict[str, Any]:
    """
    Admin-only endpoint returning recent security and query audit logs.
    """
    logs = get_recent_audit_logs(limit=limit)
    return {
        "total": len(logs),
        "logs": logs,
    }
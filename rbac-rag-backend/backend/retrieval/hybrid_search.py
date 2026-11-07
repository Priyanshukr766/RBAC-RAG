from typing import Any, Literal

from backend.ingestion.embedder import embed_query
from backend.retrieval.bm25_search import search_bm25_leg
from backend.retrieval.rank_fusion import reciprocal_rank_fusion
from backend.retrieval.reranker import rerank_chunks
from backend.retrieval.vector_search import search_vector_leg

RetrievalMode = Literal["bm25_only", "vector_only", "hybrid_rrf", "hybrid_rerank"]


def retrieve_for_user(
    user_role: str,
    query: str,
    mode: RetrievalMode = "hybrid_rerank",
    top_k: int = 5,
) -> list[dict[str, Any]]:
    """
    Master retrieval orchestrator supporting all 4 ablation modes while strictly
    enforcing PostgreSQL Row-Level Security (RLS) on every underlying leg.
    """
    clean_query = query.strip()
    if not clean_query:
        return []

    if mode == "bm25_only":
        return search_bm25_leg(user_role=user_role, query=clean_query, top_k=top_k)

    if mode == "vector_only":
        q_vec = embed_query(clean_query)
        return search_vector_leg(user_role=user_role, query_vector=q_vec, top_k=top_k)

    if mode in ("hybrid_rrf", "hybrid_rerank"):
        candidate_pool_size = max(50, top_k)
        q_vec = embed_query(clean_query)

        vec_results = search_vector_leg(
            user_role=user_role,
            query_vector=q_vec,
            top_k=candidate_pool_size,
        )
        bm25_results = search_bm25_leg(
            user_role=user_role,
            query=clean_query,
            top_k=candidate_pool_size,
        )

        fused_candidates = reciprocal_rank_fusion(
            vector_results=vec_results,
            bm25_results=bm25_results,
            k=60,
            top_n=candidate_pool_size,
        )

        if mode == "hybrid_rrf":
            return fused_candidates[:top_k]

        return rerank_chunks(
            query=clean_query,
            candidate_chunks=fused_candidates,
            top_k=top_k,
        )

    raise ValueError(f"Unsupported retrieval mode: {mode}")
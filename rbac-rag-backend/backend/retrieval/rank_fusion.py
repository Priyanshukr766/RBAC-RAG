from typing import Any


def reciprocal_rank_fusion(
    vector_results: list[dict[str, Any]],
    bm25_results: list[dict[str, Any]],
    k: int = 60,
    top_n: int = 50,
) -> list[dict[str, Any]]:
    """
    Merges pre-filtered Vector Search results and BM25 Search results using
    Reciprocal Rank Fusion (RRF):
        RRF_Score(d) = 1 / (k + rank_vector(d)) + 1 / (k + rank_bm25(d))
    """
    fused_map: dict[str, dict[str, Any]] = {}

    # 1. Accumulate RRF contributions from the dense vector search leg
    for idx, item in enumerate(vector_results):
        cid = str(item["chunk_id"])
        rank_v = int(item.get("vector_rank", idx + 1))
        rrf_contrib = 1.0 / (k + rank_v)

        if cid not in fused_map:
            entry = dict(item)
            entry["vector_rank"] = rank_v
            entry.setdefault("bm25_rank", None)
            entry.setdefault("bm25_score", 0.0)
            entry["rrf_score"] = rrf_contrib
            fused_map[cid] = entry
        else:
            fused_map[cid]["vector_rank"] = rank_v
            fused_map[cid]["vector_score"] = item.get("vector_score")
            fused_map[cid]["rrf_score"] += rrf_contrib

    # 2. Accumulate RRF contributions from the BM25 lexical search leg
    for idx, item in enumerate(bm25_results):
        cid = str(item["chunk_id"])
        rank_b = int(item.get("bm25_rank", idx + 1))
        rrf_contrib = 1.0 / (k + rank_b)

        if cid not in fused_map:
            entry = dict(item)
            entry.setdefault("vector_rank", None)
            entry.setdefault("vector_score", 0.0)
            entry["bm25_rank"] = rank_b
            entry["rrf_score"] = rrf_contrib
            fused_map[cid] = entry
        else:
            fused_map[cid]["bm25_rank"] = rank_b
            fused_map[cid]["bm25_score"] = item.get("bm25_score", 0.0)
            fused_map[cid]["rrf_score"] += rrf_contrib

    # 3. Sort descending by rrf_score and assign 1-based rrf_rank
    sorted_chunks = sorted(
        fused_map.values(),
        key=lambda x: x["rrf_score"],
        reverse=True,
    )[:top_n]

    for idx, chunk in enumerate(sorted_chunks):
        chunk["rrf_rank"] = idx + 1

    return sorted_chunks

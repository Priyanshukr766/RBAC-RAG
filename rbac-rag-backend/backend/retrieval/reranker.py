from functools import lru_cache
from typing import Any

from sentence_transformers import CrossEncoder

from backend.config import get_settings


@lru_cache(maxsize=1)
def get_reranker() -> CrossEncoder:
    """
    Loads the Cross-Encoder reranker model once into memory as a singleton.
    """
    settings = get_settings()
    return CrossEncoder(settings.RERANKER_MODEL_NAME)


def rerank_chunks(
    query: str,
    candidate_chunks: list[dict[str, Any]],
    top_k: int = 5,
) -> list[dict[str, Any]]:
    """
    Scores (query, chunk['content']) pairs using the Cross-Encoder and returns
    the top_k highest-scoring chunks sorted descending by rerank_score.
    """
    if not candidate_chunks:
        return []

    model = get_reranker()
    pairs = [[query, str(c.get("content", ""))] for c in candidate_chunks]
    scores = model.predict(pairs)

    reranked: list[dict[str, Any]] = []
    for chunk, score in zip(candidate_chunks, scores):
        item = dict(chunk)
        item["rerank_score"] = float(score)
        reranked.append(item)

    reranked.sort(key=lambda x: x["rerank_score"], reverse=True)
    top_results = reranked[:top_k]

    for idx, item in enumerate(top_results):
        item["rerank_rank"] = idx + 1

    return top_results
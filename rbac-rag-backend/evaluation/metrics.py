import math


def compute_recall_at_k(retrieved_ids: list[str], target_id: str, k: int = 5) -> float:
    """
    Returns 1.0 if target_id is present within the top k retrieved_ids, else 0.0.
    """
    if not retrieved_ids or not target_id or k <= 0:
        return 0.0
    top_k_ids = [str(cid) for cid in retrieved_ids[:k]]
    return 1.0 if str(target_id) in top_k_ids else 0.0


def compute_reciprocal_rank(retrieved_ids: list[str], target_id: str, k: int = 5) -> float:
    """
    Returns 1 / rank (1-indexed) if target_id is within the top k retrieved_ids, else 0.0.
    """
    if not retrieved_ids or not target_id or k <= 0:
        return 0.0
    target_str = str(target_id)
    for idx, cid in enumerate(retrieved_ids[:k]):
        if str(cid) == target_str:
            return 1.0 / float(idx + 1)
    return 0.0


def compute_p95_latency(latencies_ms: list[float]) -> float:
    """
    Computes the 95th percentile latency in milliseconds from a list of timings.
    """
    if not latencies_ms:
        return 0.0
    sorted_vals = sorted(float(x) for x in latencies_ms)
    n = len(sorted_vals)
    idx = max(0, min(n - 1, math.ceil(0.95 * n) - 1))
    return round(sorted_vals[idx], 2)
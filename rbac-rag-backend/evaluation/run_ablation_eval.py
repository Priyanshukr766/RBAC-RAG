import json
import time
from pathlib import Path
from typing import Any

from backend.ingestion.embedder import get_embedder
from backend.retrieval.hybrid_search import RetrievalMode, retrieve_for_user
from backend.retrieval.reranker import get_reranker
from evaluation.metrics import (
    compute_p95_latency,
    compute_recall_at_k,
    compute_reciprocal_rank,
)

ABLATION_MODES: list[RetrievalMode] = [
    "bm25_only",
    "vector_only",
    "hybrid_rrf",
    "hybrid_rerank",
]


def run_ablation_benchmark(
    golden_path: str = "evaluation/golden_dataset.json",
    output_md_path: str = "evaluation/ablation_results.md",
    k: int = 5,
) -> dict[str, dict[str, float]]:
    """
    Runs all 60 golden questions across all 4 retrieval modes, computes
    Recall@5, MRR@5, and p95 latency (ms), and writes evaluation/ablation_results.md.
    """
    dataset_file = Path(golden_path)
    if not dataset_file.exists():
        raise FileNotFoundError(
            f"{golden_path} not found. Run evaluation/generate_synthetic_data.py first."
        )

    with open(dataset_file, "r", encoding="utf-8") as f:
        golden_questions: list[dict[str, Any]] = json.load(f)

    # Warm up singleton Bi-Encoder and Cross-Encoder models once before timing
    get_embedder()
    get_reranker()

    summary_metrics: dict[str, dict[str, float]] = {}

    for mode in ABLATION_MODES:
        recalls: list[float] = []
        rrs: list[float] = []
        latencies_ms: list[float] = []
        rls_violations = 0

        for item in golden_questions:
            role = item["role"]
            question = item["question"]
            target_id = str(item["ground_truth_chunk_id"])

            t0 = time.perf_counter()
            results = retrieve_for_user(
                user_role=role,
                query=question,
                mode=mode,
                top_k=k,
            )
            elapsed_ms = (time.perf_counter() - t0) * 1000.0
            latencies_ms.append(elapsed_ms)

            # Verify strict RLS compliance on every returned chunk
            for r in results:
                allowed = r.get("allowed_roles", [])
                if role != "admin" and role not in allowed and "all_employees" not in allowed:
                    rls_violations += 1

            retrieved_ids = [str(r["chunk_id"]) for r in results]
            recalls.append(compute_recall_at_k(retrieved_ids, target_id, k=k))
            rrs.append(compute_reciprocal_rank(retrieved_ids, target_id, k=k))

        n = len(golden_questions)
        avg_recall = round(sum(recalls) / n, 4) if n else 0.0
        avg_mrr = round(sum(rrs) / n, 4) if n else 0.0
        p95_ms = compute_p95_latency(latencies_ms)

        summary_metrics[mode] = {
            "recall_at_5": avg_recall,
            "mrr_at_5": avg_mrr,
            "p95_latency_ms": p95_ms,
            "rls_violations": float(rls_violations),
        }

    md_lines = [
        "# 4-Way Retrieval Ablation Study Results (60 Golden Enterprise Questions)",
        "",
        "| Retrieval Mode | Recall@5 | MRR@5 | p95 Latency (ms) | Unauthorized RLS Leaks |",
        "| :--- | :---: | :---: | :---: | :---: |",
    ]

    for mode in ABLATION_MODES:
        m = summary_metrics[mode]
        md_lines.append(
            f"| `{mode}` | {m['recall_at_5']:.4f} | {m['mrr_at_5']:.4f} | "
            f"{m['p95_latency_ms']:.2f} ms | {int(m['rls_violations'])} |"
        )

    md_content = "\n".join(md_lines) + "\n"
    out_path = Path(output_md_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(md_content)

    print("\n" + md_content)
    return summary_metrics


if __name__ == "__main__":
    metrics = run_ablation_benchmark()
    rerank_recall = metrics["hybrid_rerank"]["recall_at_5"]
    rerank_mrr = metrics["hybrid_rerank"]["mrr_at_5"]
    assert metrics["hybrid_rerank"]["rls_violations"] == 0
    print(
        f"Ablation Eval Complete | hybrid_rerank Recall@5: {rerank_recall:.4f} | "
        f"MRR@5: {rerank_mrr:.4f} | Microstep 11.4 OK"
    )
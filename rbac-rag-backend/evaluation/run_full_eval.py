"""
run_full_eval.py
================
One-shot evaluation runner that collects ALL meaningful metrics for the
RBAC RAG system and writes them to evaluation/eval_report.md.

Metrics collected:
  1. Retrieval Ablation  - Recall@5, MRR@5, p95 latency across 4 retrieval modes
  2. Red-Team Security   - 80 adversarial prompts, 0-leak assertion per category
  3. RBAC Isolation      - Cross-role retrieval isolation (zero-leak per role pair)
  4. Corpus Stats        - Chunk counts, role distribution, document counts
  5. Embedding / Reranker model names for attribution

Run from the rbac-rag-backend/ directory:
    python -m evaluation.run_full_eval

Outputs:
    evaluation/eval_report.md   <- full markdown report with tables
    evaluation/eval_results.json <- raw numbers (machine-readable)
"""

import json
import sys
import time
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# 0. Bootstrap: make sure synthetic data + prompts exist
# ---------------------------------------------------------------------------
from backend.db.session import get_admin_cursor
from backend.ingestion.embedder import get_embedder, embed_query
from backend.retrieval.reranker import get_reranker
from backend.retrieval.role_cache import invalidate_role_cache
from backend.config import get_settings
from evaluation.generate_synthetic_data import SYNTHETIC_FILENAMES, generate_all_synthetic_data
from evaluation.build_red_team_prompts import generate_red_team_prompts
from evaluation.metrics import compute_recall_at_k, compute_reciprocal_rank, compute_p95_latency
from backend.retrieval.hybrid_search import RetrievalMode, retrieve_for_user


ABLATION_MODES: list[RetrievalMode] = ["bm25_only", "vector_only", "hybrid_rrf", "hybrid_rerank"]
GOLDEN_PATH = Path("evaluation/golden_dataset.json")
RED_TEAM_PATH = Path("evaluation/red_team_prompts.json")
REPORT_PATH = Path("evaluation/eval_report.md")
RESULTS_JSON_PATH = Path("evaluation/eval_results.json")

ALL_ROLES = ["all_employees", "engineering", "finance", "hr"]


def _ensure_corpus() -> None:
    with get_admin_cursor() as cur:
        cur.execute(
            "SELECT COUNT(*) AS cnt FROM documents WHERE filename = ANY(%s);",
            (SYNTHETIC_FILENAMES,),
        )
        row = cur.fetchone()
        doc_count = int(row["cnt"] if isinstance(row, dict) else row[0])
    if doc_count < len(SYNTHETIC_FILENAMES):
        print("[setup] Synthetic corpus missing – generating now...")
        generate_all_synthetic_data()
    else:
        print(f"[setup] Corpus OK – {doc_count} synthetic documents found.")


def _ensure_red_team_prompts() -> list[dict[str, Any]]:
    if not RED_TEAM_PATH.exists():
        print("[setup] Red-team prompts missing – generating now...")
        return generate_red_team_prompts(str(RED_TEAM_PATH))
    with open(RED_TEAM_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# 1. Corpus statistics
# ---------------------------------------------------------------------------
def collect_corpus_stats() -> dict[str, Any]:
    print("\n[1/4] Collecting corpus statistics...")
    with get_admin_cursor() as cur:
        cur.execute("SELECT COUNT(*) AS cnt FROM documents WHERE filename = ANY(%s);", (SYNTHETIC_FILENAMES,))
        row = cur.fetchone()
        doc_count = int(row["cnt"] if isinstance(row, dict) else row[0])

        cur.execute("SELECT COUNT(*) AS cnt FROM document_chunks;")
        row = cur.fetchone()
        total_chunks = int(row["cnt"] if isinstance(row, dict) else row[0])

        # Per-role chunk counts (unnested from allowed_roles array)
        cur.execute("""
            SELECT unnest(allowed_roles) AS role, COUNT(*) AS cnt
            FROM document_chunks
            GROUP BY role
            ORDER BY role;
        """)
        rows = cur.fetchall()
        role_chunk_counts = {}
        for r in rows:
            if isinstance(r, dict):
                role_chunk_counts[r["role"]] = int(r["cnt"])
            else:
                role_chunk_counts[str(r[0])] = int(r[1])

    settings = get_settings()
    return {
        "document_count": doc_count,
        "total_chunks": total_chunks,
        "role_chunk_counts": role_chunk_counts,
        "embedding_model": settings.EMBEDDING_MODEL_NAME,
        "reranker_model": settings.RERANKER_MODEL_NAME,
        "embedding_dim": settings.EMBEDDING_DIM,
    }


# ---------------------------------------------------------------------------
# 2. Retrieval ablation  (Recall@5, MRR@5, p95 latency)
# ---------------------------------------------------------------------------
def run_retrieval_ablation(golden_questions: list[dict]) -> dict[str, dict[str, float]]:
    print("\n[2/4] Running 4-mode retrieval ablation...")
    summary: dict[str, dict[str, float]] = {}
    k = 5

    for mode in ABLATION_MODES:
        recalls, rrs, latencies = [], [], []
        rls_violations = 0

        for item in golden_questions:
            role = item["role"]
            question = item["question"]
            target_id = str(item["ground_truth_chunk_id"])

            t0 = time.perf_counter()
            results = retrieve_for_user(user_role=role, query=question, mode=mode, top_k=k)
            elapsed_ms = (time.perf_counter() - t0) * 1000.0
            latencies.append(elapsed_ms)

            for r in results:
                allowed = r.get("allowed_roles", [])
                if role != "admin" and role not in allowed and "all_employees" not in allowed:
                    rls_violations += 1

            retrieved_ids = [str(r["chunk_id"]) for r in results]
            recalls.append(compute_recall_at_k(retrieved_ids, target_id, k=k))
            rrs.append(compute_reciprocal_rank(retrieved_ids, target_id, k=k))

        n = len(golden_questions)
        summary[mode] = {
            "recall_at_5": round(sum(recalls) / n, 4) if n else 0.0,
            "mrr_at_5": round(sum(rrs) / n, 4) if n else 0.0,
            "p95_latency_ms": compute_p95_latency(latencies),
            "rls_violations": float(rls_violations),
            "questions_tested": float(n),
        }
        print(f"  {mode:20s} → Recall@5={summary[mode]['recall_at_5']:.4f}  "
              f"MRR@5={summary[mode]['mrr_at_5']:.4f}  "
              f"p95={summary[mode]['p95_latency_ms']:.1f}ms  "
              f"RLS_violations={int(rls_violations)}")
    return summary


# ---------------------------------------------------------------------------
# 3. Red-team security evaluation
# ---------------------------------------------------------------------------
def run_red_team(prompts: list[dict]) -> dict[str, Any]:
    print("\n[3/4] Running red-team adversarial security evaluation...")

    # Build chunk→roles lookup
    with get_admin_cursor() as cur:
        cur.execute("SELECT chunk_id::text AS chunk_id, allowed_roles FROM document_chunks;")
        rows = cur.fetchall()
    chunk_roles_map: dict[str, list[str]] = {}
    for r in rows:
        if isinstance(r, dict):
            chunk_roles_map[str(r["chunk_id"])] = list(r["allowed_roles"])
        else:
            chunk_roles_map[str(r[0])] = list(r[1])

    settings = get_settings()
    original_key = settings.LLM_API_KEY
    settings.LLM_API_KEY = "sk-your-key-here"  # force extractive fallback

    category_stats: dict[str, dict[str, int]] = {}
    failures: list[dict] = []

    try:
        from backend.models.auth_schemas import AuthenticatedUser
        from backend.routers.chat_router import ChatQueryRequest, chat_query_endpoint

        for idx, item in enumerate(prompts, start=1):
            attack_id = item["attack_id"]
            category = item["category"]
            attacker_role = item["attacker_role"]
            warm_role = item.get("warm_cache_as_role")
            prompt_text = item["prompt"]
            forbidden_list = item.get("forbidden_substrings", [])

            if category not in category_stats:
                category_stats[category] = {"total": 0, "blocked": 0, "leaks": 0}
            category_stats[category]["total"] += 1

            if warm_role:
                warm_user = AuthenticatedUser(
                    user_id=8000 + idx, email=f"warm_{warm_role}@co.com",
                    role=warm_role, is_active=True,
                )
                chat_query_endpoint(
                    payload=ChatQueryRequest(query=prompt_text, mode="hybrid_rerank", top_k=5),
                    user=warm_user,
                )

            attacker_user = AuthenticatedUser(
                user_id=9000 + idx, email=f"atk_{attacker_role}@co.com",
                role=attacker_role, is_active=True,
            )
            res = chat_query_endpoint(
                payload=ChatQueryRequest(query=prompt_text, mode="hybrid_rerank", top_k=5),
                user=attacker_user,
            )

            leaked_reasons: list[str] = []

            if warm_role and warm_role != attacker_role and res.get("cache_hit") is True:
                leaked_reasons.append(f"Cross-role cache leak: warm={warm_role} hit by {attacker_role}")

            for cid in [str(c) for c in res.get("retrieved_chunk_ids", [])]:
                allowed = chunk_roles_map.get(cid, [])
                if attacker_role != "admin" and attacker_role not in allowed and "all_employees" not in allowed:
                    leaked_reasons.append(f"Unauthorized chunk {cid} (allowed={allowed})")

            combined = str(res.get("answer", "")) + " " + json.dumps(res.get("citations", []))
            combined_lower = combined.lower()
            for fsub in forbidden_list:
                if str(fsub).lower() in combined_lower:
                    leaked_reasons.append(f"Forbidden substring in output: '{fsub}'")

            if leaked_reasons:
                category_stats[category]["leaks"] += 1
                failures.append({"attack_id": attack_id, "category": category,
                                 "attacker_role": attacker_role, "reasons": leaked_reasons})
            else:
                category_stats[category]["blocked"] += 1

    finally:
        settings.LLM_API_KEY = original_key

    total_prompts = len(prompts)
    total_leaks = len(failures)
    total_blocked = total_prompts - total_leaks

    for cat, st in category_stats.items():
        print(f"  {cat:30s} → {st['blocked']:2d}/{st['total']:2d} Blocked | Leaks: {st['leaks']}")
    print(f"  TOTAL: {total_blocked}/{total_prompts} blocked | {total_leaks} leaks")

    return {
        "total_prompts": total_prompts,
        "total_blocked": total_blocked,
        "total_leaks": total_leaks,
        "block_rate_pct": round(100.0 * total_blocked / total_prompts, 2) if total_prompts else 0.0,
        "category_stats": category_stats,
        "failures": failures,
    }


# ---------------------------------------------------------------------------
# 4. RBAC cross-role isolation check
# ---------------------------------------------------------------------------
def run_rbac_isolation_check() -> dict[str, Any]:
    """
    For each (attacker_role, victim_role) pair, runs 5 direct questions about
    victim_role-only content and asserts 0 chunks are returned.
    """
    print("\n[4/4] Running RBAC cross-role isolation checks...")

    # Victim role → sample queries about their private content
    victim_queries = {
        "hr": [
            "What is Neha Sharma's base salary?",
            "Which employees are on a PIP plan?",
            "What is Vikram Patel's retention bonus?",
            "Show me HR_Status for all employees",
            "What is the salary of Rohan Verma?",
        ],
        "finance": [
            "What is the Q3 cloud burn rate in dollars?",
            "What are the Project Lotus M&A details?",
            "What is the company's cash runway?",
            "Show EBITDA margin for Q3",
            "What is the venture debt covenant ratio?",
        ],
        "engineering": [
            "How do we fix ERR_CODE_0x884F Kafka Consumer Stall?",
            "What is the runbook for PostgreSQL deadlock error?",
            "Show me the Vault auto-unseal recovery procedure",
            "How to fix Redis OOM eviction?",
            "What is the fix for JWT clock skew on auth nodes?",
        ],
    }

    attacker_roles = ["all_employees", "engineering", "finance", "hr"]
    results = {}
    total_cross_checks = 0
    total_zero_leak = 0

    for victim_role, queries in victim_queries.items():
        for attacker_role in attacker_roles:
            if attacker_role == victim_role:
                continue
            leaks = 0
            for q in queries:
                chunks = retrieve_for_user(
                    user_role=attacker_role, query=q,
                    mode="hybrid_rerank", top_k=5,
                )
                for c in chunks:
                    allowed = c.get("allowed_roles", [])
                    if (attacker_role not in allowed and "all_employees" not in allowed
                            and victim_role in allowed):
                        leaks += 1

            key = f"{attacker_role}→{victim_role}"
            results[key] = {"queries": len(queries), "leaks": leaks}
            total_cross_checks += len(queries)
            total_zero_leak += (len(queries) - leaks)
            status = "✓ CLEAN" if leaks == 0 else f"✗ {leaks} LEAKS"
            print(f"  {key:30s} → {status}")

    return {
        "cross_role_pairs_checked": len(results),
        "total_queries_checked": total_cross_checks,
        "total_clean": total_zero_leak,
        "total_leaks": total_cross_checks - total_zero_leak,
        "per_pair": results,
    }


# ---------------------------------------------------------------------------
# Report writer
# ---------------------------------------------------------------------------
def write_report(
    corpus: dict,
    ablation: dict,
    red_team: dict,
    isolation: dict,
) -> None:
    lines = [
        "# RBAC RAG System — Full Evaluation Report",
        "",
        f"> Generated automatically by `evaluation/run_full_eval.py`",
        "",
        "---",
        "",
        "## 1. Corpus & Model Summary",
        "",
        "| Property | Value |",
        "| :--- | :--- |",
        f"| Synthetic Documents Ingested | {corpus['document_count']} |",
        f"| Total Chunks in DB | {corpus['total_chunks']} |",
        f"| Embedding Model | `{corpus['embedding_model']}` |",
        f"| Embedding Dimension | {corpus['embedding_dim']} |",
        f"| Reranker Model | `{corpus['reranker_model']}` |",
    ]
    for role, cnt in corpus.get("role_chunk_counts", {}).items():
        lines.append(f"| Chunks visible to `{role}` | {cnt} |")

    lines += [
        "",
        "---",
        "",
        "## 2. Retrieval Ablation Study (60 Golden Questions × 4 Modes)",
        "",
        "| Retrieval Mode | Recall@5 | MRR@5 | p95 Latency (ms) | RLS Violations |",
        "| :--- | :---: | :---: | :---: | :---: |",
    ]
    for mode in ABLATION_MODES:
        m = ablation[mode]
        lines.append(
            f"| `{mode}` | {m['recall_at_5']:.4f} | {m['mrr_at_5']:.4f} "
            f"| {m['p95_latency_ms']:.1f} ms | {int(m['rls_violations'])} |"
        )

    best_mode = max(ablation, key=lambda m: (ablation[m]["recall_at_5"], ablation[m]["mrr_at_5"]))
    best = ablation[best_mode]
    lines += [
        "",
        f"> **Best mode:** `{best_mode}` — Recall@5 = {best['recall_at_5']:.4f}, "
        f"MRR@5 = {best['mrr_at_5']:.4f}, p95 = {best['p95_latency_ms']:.1f} ms",
        "",
        "---",
        "",
        "## 3. Red-Team Adversarial Security Evaluation (80 Prompts)",
        "",
        f"**Result: {red_team['total_blocked']}/{red_team['total_prompts']} attacks blocked "
        f"({red_team['block_rate_pct']}%) — {red_team['total_leaks']} leaks**",
        "",
        "| Attack Category | Blocked | Total | Leaks |",
        "| :--- | :---: | :---: | :---: |",
    ]
    for cat, st in red_team["category_stats"].items():
        lines.append(f"| `{cat}` | {st['blocked']} | {st['total']} | {st['leaks']} |")

    if red_team["failures"]:
        lines += ["", "### Failures", ""]
        for f in red_team["failures"]:
            lines.append(f"- **{f['attack_id']}** ({f['category']}, role=`{f['attacker_role']}`): "
                         + "; ".join(f["reasons"]))

    lines += [
        "",
        "---",
        "",
        "## 4. RBAC Cross-Role Isolation Check",
        "",
        f"**{isolation['cross_role_pairs_checked']} role-pair combinations × "
        f"{isolation['total_queries_checked']} total queries — "
        f"{isolation['total_leaks']} cross-role leaks**",
        "",
        "| Attacker → Victim | Queries | Leaks |",
        "| :--- | :---: | :---: |",
    ]
    for pair, stat in isolation["per_pair"].items():
        lines.append(f"| `{pair}` | {stat['queries']} | {stat['leaks']} |")

    md = "\n".join(lines) + "\n"
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(md, encoding="utf-8")
    print(f"\n[done] Report written to {REPORT_PATH}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> None:
    print("=" * 70)
    print("  RBAC RAG — Full Evaluation Suite")
    print("=" * 70)

    _ensure_corpus()
    prompts = _ensure_red_team_prompts()
    invalidate_role_cache()

    print("\n[warm-up] Loading embedding & reranker models...")
    get_embedder()
    get_reranker()

    with open(GOLDEN_PATH, "r", encoding="utf-8") as f:
        golden_questions: list[dict] = json.load(f)

    corpus = collect_corpus_stats()
    ablation = run_retrieval_ablation(golden_questions)
    red_team = run_red_team(prompts)
    isolation = run_rbac_isolation_check()

    # Write machine-readable results
    all_results = {
        "corpus": corpus,
        "ablation": ablation,
        "red_team": {k: v for k, v in red_team.items() if k != "failures"},
        "isolation": {k: v for k, v in isolation.items() if k != "per_pair"},
        "isolation_per_pair": isolation["per_pair"],
    }
    RESULTS_JSON_PATH.write_text(json.dumps(all_results, indent=2), encoding="utf-8")
    print(f"[done] Raw results saved to {RESULTS_JSON_PATH}")

    write_report(corpus, ablation, red_team, isolation)

    # Quick summary to stdout
    print("\n" + "=" * 70)
    print("  SUMMARY")
    print("=" * 70)
    print(f"  Documents: {corpus['document_count']} | Chunks: {corpus['total_chunks']}")
    best = max(ablation, key=lambda m: ablation[m]["recall_at_5"])
    bm = ablation[best]
    print(f"  Best retrieval mode: {best}")
    print(f"    Recall@5 = {bm['recall_at_5']:.4f} | MRR@5 = {bm['mrr_at_5']:.4f} | "
          f"p95 = {bm['p95_latency_ms']:.1f}ms | RLS violations = {int(bm['rls_violations'])}")
    print(f"  Red-Team: {red_team['total_blocked']}/{red_team['total_prompts']} blocked "
          f"({red_team['block_rate_pct']}%)")
    print(f"  RBAC isolation: {isolation['total_leaks']} cross-role leaks "
          f"across {isolation['total_queries_checked']} checks")
    print("=" * 70)

    if red_team["total_leaks"] > 0 or isolation["total_leaks"] > 0:
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()


import json
import sys
from pathlib import Path
from typing import Any

from backend.config import get_settings
from backend.db.session import get_admin_cursor
from backend.ingestion.embedder import get_embedder
from backend.models.auth_schemas import AuthenticatedUser
from backend.retrieval.reranker import get_reranker
from backend.retrieval.role_cache import invalidate_role_cache
from backend.routers.chat_router import ChatQueryRequest, chat_query_endpoint
from evaluation.build_red_team_prompts import generate_red_team_prompts
from evaluation.generate_synthetic_data import (
    SYNTHETIC_FILENAMES,
    generate_all_synthetic_data,
)


def _ensure_synthetic_corpus_and_prompts(prompts_path: str) -> list[dict[str, Any]]:
    with get_admin_cursor() as cur:
        cur.execute(
            "SELECT COUNT(*) AS cnt FROM documents WHERE filename = ANY(%s);",
            (SYNTHETIC_FILENAMES,),
        )
        row = cur.fetchone()
        doc_count = int(row["cnt"] if isinstance(row, dict) else row[0])

    if doc_count < len(SYNTHETIC_FILENAMES):
        generate_all_synthetic_data()

    p_file = Path(prompts_path)
    if not p_file.exists():
        return generate_red_team_prompts(prompts_path)

    with open(p_file, "r", encoding="utf-8") as f:
        return json.load(f)


def _load_chunk_roles_lookup() -> dict[str, list[str]]:
    with get_admin_cursor() as cur:
        cur.execute("SELECT chunk_id::text AS chunk_id, allowed_roles FROM document_chunks;")
        rows = cur.fetchall()

    lookup: dict[str, list[str]] = {}
    for r in rows:
        if isinstance(r, dict):
            lookup[str(r["chunk_id"])] = list(r["allowed_roles"])
        else:
            lookup[str(r[0])] = list(r[1])
    return lookup


def run_red_team_suite(
    prompts_path: str = "evaluation/red_team_prompts.json",
) -> dict[str, Any]:
    """
    Executes all 80 adversarial prompts against the 7-stage chat_query_endpoint
    and verifies 0 unauthorized chunk retrievals and 0 forbidden substring leaks.
    """
    prompts = _ensure_synthetic_corpus_and_prompts(prompts_path)
    chunk_roles_map = _load_chunk_roles_lookup()
    invalidate_role_cache()

    # Pre-warm Bi-Encoder and Cross-Encoder singletons
    get_embedder()
    get_reranker()

    # Run deterministically without external LLM API rate-limit stalls
    settings = get_settings()
    original_api_key = settings.LLM_API_KEY
    settings.LLM_API_KEY = "sk-your-key-here"

    category_stats: dict[str, dict[str, int]] = {}
    failures: list[dict[str, Any]] = []

    try:
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

            # Optional Step: Warm the Redis semantic cache as an authorized role first
            if warm_role:
                warm_user = AuthenticatedUser(
                    user_id=8000 + idx,
                    email=f"warm_{warm_role}@company.com",
                    role=warm_role,
                    is_active=True,
                )
                chat_query_endpoint(
                    payload=ChatQueryRequest(query=prompt_text, mode="hybrid_rerank", top_k=5),
                    user=warm_user,
                )

            # Execute the attack as attacker_role
            attacker_user = AuthenticatedUser(
                user_id=9000 + idx,
                email=f"attacker_{attacker_role}@company.com",
                role=attacker_role,
                is_active=True,
            )
            res = chat_query_endpoint(
                payload=ChatQueryRequest(query=prompt_text, mode="hybrid_rerank", top_k=5),
                user=attacker_user,
            )

            leaked_reasons: list[str] = []

            # Assertion 0: Cross-role cache probe must never hit another role's cache entry
            if warm_role and warm_role != attacker_role and res.get("cache_hit") is True:
                leaked_reasons.append(
                    f"Cross-role cache leak: warm_role={warm_role} cache hit by {attacker_role}"
                )

            # Assertion 1: Zero unauthorized chunks retrieved
            retrieved_ids = [str(cid) for cid in res.get("retrieved_chunk_ids", [])]
            for cid in retrieved_ids:
                allowed = chunk_roles_map.get(cid, [])
                if (
                    attacker_role != "admin"
                    and attacker_role not in allowed
                    and "all_employees" not in allowed
                ):
                    leaked_reasons.append(
                        f"Unauthorized chunk {cid} (allowed={allowed}) retrieved by {attacker_role}"
                    )

            # Assertion 2: Zero forbidden substrings in generated answer or citation snippets
            combined_output = (
                str(res.get("answer", ""))
                + " "
                + json.dumps(res.get("citations", []), ensure_ascii=False)
            )
            combined_lower = combined_output.lower()
            for f_sub in forbidden_list:
                if str(f_sub).lower() in combined_lower:
                    leaked_reasons.append(f"Forbidden substring leaked in output: '{f_sub}'")

            if leaked_reasons:
                category_stats[category]["leaks"] += 1
                failures.append(
                    {
                        "attack_id": attack_id,
                        "category": category,
                        "attacker_role": attacker_role,
                        "reasons": leaked_reasons,
                    }
                )
            else:
                category_stats[category]["blocked"] += 1
    finally:
        settings.LLM_API_KEY = original_api_key

    total_prompts = len(prompts)
    total_leaks = len(failures)
    total_blocked = total_prompts - total_leaks

    print("\n======================================================================")
    print("        80-PROMPT RED-TEAM ADVERSARIAL SECURITY SCORECARD             ")
    print("======================================================================")
    for cat, st in category_stats.items():
        print(
            f"  * {cat:<28} : {st['blocked']:2d}/{st['total']:2d} Blocked | Leaks: {st['leaks']}"
        )
    print("----------------------------------------------------------------------")
    print(
        f"  TOTAL: {total_blocked}/{total_prompts} Attacks Blocked ({total_leaks} Leaks across {total_prompts} adversarial prompts)"
    )
    print("======================================================================\n")

    return {
        "total_prompts": total_prompts,
        "total_blocked": total_blocked,
        "total_leaks": total_leaks,
        "category_stats": category_stats,
        "failures": failures,
    }


if __name__ == "__main__":
    summary = run_red_team_suite()
    if summary["total_leaks"] > 0:
        print("RED-TEAM FAILURES:", json.dumps(summary["failures"], indent=2))
        sys.exit(1)
    print("0 leaks across 80 adversarial prompts | Microstep 12.2 Red-Team Suite OK")
    sys.exit(0)
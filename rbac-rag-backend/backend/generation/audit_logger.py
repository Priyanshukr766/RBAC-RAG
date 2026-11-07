from typing import Any, Optional
from backend.db.session import get_admin_cursor


def write_audit_log(
    user_id: Optional[int],
    user_role: str,
    query_text: str,
    guardrail_status: str,
    cache_hit: bool,
    retrieved_chunk_ids: list[str],
    latency_ms: float,
) -> int:
    """
    Writes an immutable security and performance audit record into audit_logs.
    Uses a subquery lookup for user_id so mocked test user IDs safely resolve
    to NULL without violating the users(user_id) foreign key constraint.
    """
    clean_chunk_ids = [str(cid) for cid in (retrieved_chunk_ids or []) if cid]

    with get_admin_cursor() as cur:
        cur.execute(
            """
            INSERT INTO audit_logs (
                user_id,
                user_role_at_query,
                query_text,
                guardrail_status,
                cache_hit,
                retrieved_chunk_ids,
                latency_ms
            )
            VALUES (
                (SELECT user_id FROM users WHERE user_id = %s),
                %s,
                %s,
                %s,
                %s,
                %s::uuid[],
                %s
            )
            RETURNING log_id;
            """,
            (
                user_id,
                user_role,
                query_text,
                guardrail_status,
                cache_hit,
                clean_chunk_ids,
                round(float(latency_ms), 2),
            ),
        )
        row = cur.fetchone()
        if isinstance(row, dict):
            return int(row["log_id"])
        return int(row[0])


def get_recent_audit_logs(limit: int = 100) -> list[dict[str, Any]]:
    """
    Returns the most recent audit log entries (joined with users for email/name
    when available) ordered newest-first for the Admin Security Audit UI.
    """
    with get_admin_cursor() as cur:
        cur.execute(
            """
            SELECT
                a.log_id,
                a.user_id,
                u.email AS user_email,
                u.full_name AS user_full_name,
                a.user_role_at_query,
                a.query_text,
                a.guardrail_status,
                a.cache_hit,
                a.retrieved_chunk_ids::text[] AS retrieved_chunk_ids,
                a.latency_ms,
                a.created_at
            FROM audit_logs a
            LEFT JOIN users u ON a.user_id = u.user_id
            ORDER BY a.created_at DESC, a.log_id DESC
            LIMIT %s;
            """,
            (limit,),
        )
        rows = cur.fetchall()

    results: list[dict[str, Any]] = []
    for r in rows:
        if isinstance(r, dict):
            item = dict(r)
        else:
            item = {
                "log_id": r[0],
                "user_id": r[1],
                "user_email": r[2],
                "user_full_name": r[3],
                "user_role_at_query": r[4],
                "query_text": r[5],
                "guardrail_status": r[6],
                "cache_hit": r[7],
                "retrieved_chunk_ids": r[8],
                "latency_ms": r[9],
                "created_at": r[10],
            }
        if item.get("created_at") is not None and hasattr(item["created_at"], "isoformat"):
            item["created_at"] = item["created_at"].isoformat()
        results.append(item)

    return results

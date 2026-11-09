from typing import Any

from backend.db.session import get_rls_cursor


def fetch_chunks_by_ids(
    user_role: str,
    chunk_ids: list[str],
) -> list[dict[str, Any]]:
    """
    Re-reads authorized chunks by ID under PostgreSQL RLS, preserving the input
    order. Used to recover full chunk text for cache-hit retrieval logging
    without re-running embeddings, BM25 or reranking.
    """
    clean_ids = [str(cid) for cid in (chunk_ids or []) if cid]
    if not clean_ids:
        return []

    with get_rls_cursor(user_role, enable_iterative_scan=False) as cur:
        cur.execute(
            """
            SELECT
                c.chunk_id::text,
                c.doc_id::text,
                d.filename,
                c.content,
                c.page_number,
                c.section_heading
            FROM document_chunks c
            JOIN documents d ON c.doc_id = d.doc_id
            WHERE c.chunk_id = ANY(%s::uuid[]);
            """,
            (clean_ids,),
        )
        rows = cur.fetchall()

    by_id: dict[str, dict[str, Any]] = {}
    for row in rows:
        if isinstance(row, dict):
            item = {
                "chunk_id": str(row["chunk_id"]),
                "doc_id": str(row["doc_id"]),
                "filename": row["filename"],
                "content": row["content"],
                "page_number": row["page_number"],
                "section_heading": row["section_heading"],
            }
        else:
            item = {
                "chunk_id": str(row[0]),
                "doc_id": str(row[1]),
                "filename": row[2],
                "content": row[3],
                "page_number": row[4],
                "section_heading": row[5],
            }
        by_id[item["chunk_id"]] = item

    # Preserve the ranking order that was originally returned to the user.
    return [by_id[cid] for cid in clean_ids if cid in by_id]

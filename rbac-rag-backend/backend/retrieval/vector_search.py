from typing import List, Dict, Any
from backend.db.session import get_rls_cursor


def search_vector_leg(
    user_role: str,
    query_vector: List[float],
    top_k: int = 50,
) -> List[Dict[str, Any]]:
    """
    Executes pre-filtered HNSW cosine similarity search inside an RLS-enforced
    transaction with hnsw.iterative_scan = relaxed_order enabled.
    Returns up to top_k authorized candidate chunks with 1-indexed 'vector_rank'.
    """
    candidates: List[Dict[str, Any]] = []

    with get_rls_cursor(user_role, enable_iterative_scan=True) as cur:
        cur.execute(
            """
            SELECT
                c.chunk_id::text,
                c.doc_id::text,
                d.filename,
                c.content,
                c.allowed_roles,
                c.page_number,
                c.bbox,
                c.section_heading,
                1 - (c.embedding <=> %s::vector) AS vector_score
            FROM document_chunks c
            JOIN documents d ON c.doc_id = d.doc_id
            ORDER BY c.embedding <=> %s::vector
            LIMIT %s;
            """,
            (query_vector, query_vector, top_k),
        )
        rows = cur.fetchall()

        for idx, r in enumerate(rows):
            if isinstance(r, dict):
                candidates.append(
                    {
                        "chunk_id": str(r["chunk_id"]),
                        "doc_id": str(r["doc_id"]),
                        "filename": r["filename"],
                        "content": r["content"],
                        "allowed_roles": list(r["allowed_roles"]),
                        "page_number": r["page_number"],
                        "bbox": [float(x) for x in r["bbox"]] if r["bbox"] else None,
                        "section_heading": r["section_heading"],
                        "vector_score": float(r["vector_score"]),
                        "vector_rank": idx + 1,
                    }
                )
            else:
                candidates.append(
                    {
                        "chunk_id": str(r[0]),
                        "doc_id": str(r[1]),
                        "filename": r[2],
                        "content": r[3],
                        "allowed_roles": list(r[4]),
                        "page_number": r[5],
                        "bbox": [float(x) for x in r[6]] if r[6] else None,
                        "section_heading": r[7],
                        "vector_score": float(r[8]),
                        "vector_rank": idx + 1,
                    }
                )

    return candidates
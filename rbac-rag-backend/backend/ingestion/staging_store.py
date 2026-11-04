from typing import List, Dict, Any, Union
from backend.db.session import get_admin_cursor
from backend.models.ingestion_schemas import LogicalBlockDraft


def _row_to_block_dict(row: Union[Dict[str, Any], tuple]) -> Dict[str, Any]:
    """Helper to convert a logical_blocks table row (dict_row or tuple) into a clean dictionary."""
    if isinstance(row, dict):
        return {
            "block_id": str(row["block_id"]),
            "doc_id": str(row["doc_id"]),
            "block_order": int(row["block_order"]),
            "page_number": int(row["page_number"]),
            "bbox": [float(x) for x in row["bbox"]],
            "section_heading": row["section_heading"] or "",
            "raw_text": row["raw_text"],
            "suggested_roles": list(row["suggested_roles"]),
            "approved_roles": list(row["approved_roles"]),
            "confidence_score": float(row["confidence_score"]),
            "needs_human_review": bool(row["needs_human_review"]),
            "pii_triggered": bool(row["pii_triggered"]),
        }
    return {
        "block_id": str(row[0]),
        "doc_id": str(row[1]),
        "block_order": int(row[2]),
        "page_number": int(row[3]),
        "bbox": [float(x) for x in row[4]],
        "section_heading": row[5] or "",
        "raw_text": row[6],
        "suggested_roles": list(row[7]),
        "approved_roles": list(row[8]),
        "confidence_score": float(row[9]),
        "needs_human_review": bool(row[10]),
        "pii_triggered": bool(row[11]),
    }


def save_logical_blocks(doc_id: str, blocks: List[LogicalBlockDraft]) -> List[Dict[str, Any]]:
    """
    Replaces any existing staged blocks for doc_id and inserts the new LogicalBlockDraft items
    into the PostgreSQL logical_blocks table, returning the saved rows ordered by block_order ASC.
    """
    with get_admin_cursor() as cur:
        cur.execute("DELETE FROM logical_blocks WHERE doc_id = %s;", (doc_id,))

        for b in blocks:
            cur.execute(
                """
                INSERT INTO logical_blocks (
                    doc_id, block_order, page_number, bbox, section_heading,
                    raw_text, suggested_roles, approved_roles, confidence_score,
                    needs_human_review, pii_triggered
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
                """,
                (
                    doc_id,
                    b.block_order,
                    b.page_number,
                    b.bbox.to_list(),
                    b.section_heading,
                    b.raw_text,
                    b.suggested_roles,
                    b.approved_roles,
                    b.confidence_score,
                    b.needs_human_review,
                    b.pii_triggered,
                ),
            )

    return get_logical_blocks_for_doc(doc_id)


def get_logical_blocks_for_doc(doc_id: str) -> List[Dict[str, Any]]:
    """
    Retrieves all staged logical blocks for doc_id ordered by block_order ASC.
    """
    with get_admin_cursor() as cur:
        cur.execute(
            """
            SELECT
                block_id, doc_id, block_order, page_number, bbox,
                section_heading, raw_text, suggested_roles, approved_roles,
                confidence_score, needs_human_review, pii_triggered
            FROM logical_blocks
            WHERE doc_id = %s
            ORDER BY block_order ASC;
            """,
            (doc_id,),
        )
        rows = cur.fetchall()
        return [_row_to_block_dict(r) for r in rows]


def update_logical_block_roles(doc_id: str, updates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Updates approved_roles and marks needs_human_review = FALSE for the specified block_ids.
    Each item in updates is expected to have: {"block_id": str, "approved_roles": list[str]}.
    """
    with get_admin_cursor() as cur:
        for item in updates:
            block_id = item["block_id"]
            approved_roles = item["approved_roles"]
            cur.execute(
                """
                UPDATE logical_blocks
                SET approved_roles = %s,
                    needs_human_review = FALSE
                WHERE block_id = %s AND doc_id = %s;
                """,
                (approved_roles, block_id, doc_id),
            )

    return get_logical_blocks_for_doc(doc_id)
import os
from typing import List, Dict, Any, Tuple
import fitz  # PyMuPDF
from backend.db.session import get_admin_cursor

# RGB color palette (0.0 to 1.0 floats) ordered by sensitivity priority
ROLE_COLOR_MAP: Dict[str, Tuple[float, float, float]] = {
    "admin": (0.88, 0.15, 0.15),  # Red
    "hr": (0.88, 0.15, 0.15),  # Red
    "finance": (0.58, 0.20, 0.85),  # Purple
    "engineering": (0.10, 0.45, 0.88),  # Blue
    "intern": (0.12, 0.65, 0.30),  # Green
    "all_employees": (0.12, 0.65, 0.30),  # Green
}

SENSITIVITY_PRIORITY = [
    "admin",
    "hr",
    "finance",
    "engineering",
    "intern",
    "all_employees",
]


def _pick_color_for_roles(roles: List[str]) -> Tuple[float, float, float]:
    """Selects the highest-sensitivity RGB color tuple for a list of approved roles."""
    for priority_role in SENSITIVITY_PRIORITY:
        if priority_role in roles:
            return ROLE_COLOR_MAP[priority_role]
    return ROLE_COLOR_MAP["all_employees"]


def paint_annotated_pdf(
    raw_pdf_path: str,
    output_pdf_path: str,
    blocks: List[Dict[str, Any]],
) -> str:
    """
    Opens raw_pdf_path with PyMuPDF, draws colored bounding boxes and role badges
    around every block in blocks, saves to output_pdf_path, and updates documents status.
    """
    os.makedirs(os.path.dirname(os.path.abspath(output_pdf_path)), exist_ok=True)

    doc = fitz.open(raw_pdf_path)
    try:
        for block in blocks:
            page_idx = max(0, int(block.get("page_number", 1)) - 1)
            if page_idx >= len(doc):
                continue

            page = doc[page_idx]
            bbox = block.get("bbox", [0.0, 0.0, 0.0, 0.0])
            if not bbox or len(bbox) != 4:
                continue

            x0, y0, x1, y1 = [float(c) for c in bbox]
            approved_roles = block.get("approved_roles") or ["all_employees"]
            color = _pick_color_for_roles(approved_roles)

            # 1. Draw translucent fill + crisp colored border around the block
            rect = fitz.Rect(
                max(0.0, x0 - 2.0),
                max(0.0, y0 - 2.0),
                min(page.rect.width, x1 + 2.0),
                min(page.rect.height, y1 + 2.0),
            )
            page.draw_rect(
                rect,
                color=color,
                fill=color,
                width=1.5,
                fill_opacity=0.18,
                stroke_opacity=0.90,
                overlay=True,
            )

            # 2. Draw solid top-left role label banner just above the box
            roles_label = ", ".join(r.upper() for r in approved_roles)
            badge_text = f" ACCESS: {roles_label}"
            badge_width = max(
                165.0,
                min(page.rect.width - max(0.0, x0 - 2.0), len(badge_text) * 4.5 + 12.0),
            )
            tag_top = max(0.0, y0 - 13.0)
            tag_bottom = max(tag_top + 11.0, y0 - 2.0)

            tag_rect = fitz.Rect(
                max(0.0, x0 - 2.0),
                tag_top,
                min(page.rect.width, max(0.0, x0 - 2.0) + badge_width),
                tag_bottom,
            )
            page.draw_rect(
                tag_rect,
                color=color,
                fill=color,
                width=0.5,
                fill_opacity=0.90,
                stroke_opacity=0.90,
                overlay=True,
            )

            # Insert white bold badge text inside the banner
            page.insert_text(
                fitz.Point(tag_rect.x0 + 3.0, tag_rect.y1 - 2.5),
                badge_text,
                fontsize=7.0,
                fontname="helv",
                color=(1.0, 1.0, 1.0),
                overlay=True,
            )

        doc.save(output_pdf_path)
    finally:
        doc.close()

    # If the blocks belong to a persisted document in PostgreSQL, update its annotated path & status
    doc_id = blocks[0].get("doc_id") if blocks else None
    if doc_id:
        try:
            with get_admin_cursor() as cur:
                cur.execute(
                    """
                    UPDATE documents
                    SET annotated_pdf_path = %s,
                        status = 'preview_painted'
                    WHERE doc_id = %s;
                    """,
                    (output_pdf_path, doc_id),
                )
        except Exception:
            pass

    return output_pdf_path

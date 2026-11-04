import fitz

from backend.ingestion.bbox_normalizer import normalize_to_top_left_bbox
from backend.models.ingestion_schemas import BoundingBox, LogicalBlockDraft


def _is_heading_line(text: str, max_font_size: float = 11.0) -> bool:
    stripped = text.strip()
    if not stripped:
        return False
    lower = stripped.lower()
    if lower.startswith(("heading:", "section:", "#")):
        return True
    if max_font_size >= 13.5 and len(stripped.split()) <= 14:
        return True
    return False


def _clean_heading_prefix(text: str) -> str:
    stripped = text.strip().lstrip("#").strip()
    if stripped.lower().startswith("heading:"):
        return stripped[len("heading:") :].strip()
    return stripped


def _extract_with_fitz_blocks(pdf_path: str) -> list[LogicalBlockDraft]:
    drafts: list[LogicalBlockDraft] = []
    block_order = 0
    current_heading = "General Section"

    with fitz.open(pdf_path) as doc:
        for page_idx, page in enumerate(doc):
            page_no = page_idx + 1
            page_dict = page.get_text("dict")
            raw_blocks = page_dict.get("blocks", [])

            pending_text_parts: list[str] = []
            pending_bbox: BoundingBox | None = None
            pending_heading = current_heading

            def flush_pending() -> None:
                nonlocal block_order, pending_text_parts, pending_bbox
                if pending_text_parts and pending_bbox is not None:
                    combined_text = "\n".join(pending_text_parts).strip()
                    if combined_text:
                        drafts.append(
                            LogicalBlockDraft(
                                block_order=block_order,
                                page_number=page_no,
                                bbox=pending_bbox,
                                section_heading=pending_heading,
                                raw_text=combined_text,
                            )
                        )
                        block_order += 1
                pending_text_parts = []
                pending_bbox = None

            for b in raw_blocks:
                if b.get("type") != 0:
                    continue
                lines_text: list[str] = []
                max_size = 0.0
                for line in b.get("lines", []):
                    span_texts = []
                    for span in line.get("spans", []):
                        st = span.get("text", "").strip()
                        if st:
                            span_texts.append(st)
                            max_size = max(max_size, float(span.get("size", 11.0)))
                    if span_texts:
                        lines_text.append(" ".join(span_texts))

                block_text = "\n".join(lines_text).strip()
                if not block_text:
                    continue

                x0, y0, x1, y1 = b["bbox"]
                norm_bbox = BoundingBox(
                    x0=round(max(0.0, float(x0)), 2),
                    y0=round(max(0.0, float(y0)), 2),
                    x1=round(max(0.0, float(x1)), 2),
                    y1=round(max(0.0, float(y1)), 2),
                )

                first_line = lines_text[0]
                if _is_heading_line(first_line, max_font_size=max_size):
                    flush_pending()
                    current_heading = _clean_heading_prefix(first_line)
                    pending_heading = current_heading
                    remaining = "\n".join(lines_text[1:]).strip()
                    body_text = remaining if remaining else block_text
                    pending_text_parts.append(body_text)
                    pending_bbox = norm_bbox
                    continue

                current_words = sum(len(p.split()) for p in pending_text_parts)
                new_words = len(block_text.split())

                if (
                    pending_bbox is not None
                    and pending_heading == current_heading
                    and (current_words + new_words) <= 250
                ):
                    pending_text_parts.append(block_text)
                    pending_bbox = BoundingBox(
                        x0=min(pending_bbox.x0, norm_bbox.x0),
                        y0=min(pending_bbox.y0, norm_bbox.y0),
                        x1=max(pending_bbox.x1, norm_bbox.x1),
                        y1=max(pending_bbox.y1, norm_bbox.y1),
                    )
                else:
                    flush_pending()
                    pending_heading = current_heading
                    pending_text_parts.append(block_text)
                    pending_bbox = norm_bbox

            flush_pending()

    return drafts


def extract_logical_blocks_from_pdf(pdf_path: str) -> list[LogicalBlockDraft]:
    """
    Extracts logical blocks (paragraphs and tables grouped under their active section heading)
    along with normalized top-left [x0, y0, x1, y1] bounding boxes.
    """
    page_heights: dict[int, float] = {}
    with fitz.open(pdf_path) as doc:
        for idx, page in enumerate(doc):
            page_heights[idx + 1] = float(page.rect.height)

    try:
        from docling.document_converter import DocumentConverter

        converter = DocumentConverter()
        result = converter.convert(pdf_path)
        dl_doc = result.document

        raw_items: list[dict] = []
        current_heading = "General Section"

        for item, _level in dl_doc.iterate_items():
            label = str(getattr(item, "label", "")).lower()
            text = ""
            if hasattr(item, "export_to_markdown") and "table" in label:
                try:
                    text = item.export_to_markdown(doc=dl_doc).strip()
                except TypeError: #this except block not needed but still kept it for safety
                    text = item.export_to_markdown().strip()
            elif hasattr(item, "text") and item.text:
                text = item.text.strip()

            if not text:
                continue

            prov_list = getattr(item, "prov", None)
            if not prov_list or len(prov_list) == 0:
                continue

            prov = prov_list[0]
            page_no = int(prov.page_no)
            page_h = page_heights.get(page_no, 792.0)

            bbox_obj = prov.bbox
            origin_str = str(getattr(bbox_obj, "coord_origin", "BOTTOMLEFT"))
            norm_bbox = normalize_to_top_left_bbox(
                l=float(bbox_obj.l),
                t=float(bbox_obj.t),
                r=float(bbox_obj.r),
                b=float(bbox_obj.b),
                page_height=page_h,
                coord_origin=origin_str,
            )

            is_header = (
                "section_header" in label
                or "title" in label
                or _is_heading_line(text)
            )
            if is_header:
                current_heading = _clean_heading_prefix(text)

            raw_items.append(
                {
                    "page_number": page_no,
                    "heading": current_heading,
                    "text": text,
                    "bbox": norm_bbox,
                    "is_header": is_header,
                }
            )

        if raw_items:
            drafts: list[LogicalBlockDraft] = []
            block_order = 0
            pending: dict | None = None

            def flush_item() -> None:
                nonlocal block_order, pending
                if pending is not None and pending["text"].strip():
                    drafts.append(
                        LogicalBlockDraft(
                            block_order=block_order,
                            page_number=pending["page_number"],
                            bbox=pending["bbox"],
                            section_heading=pending["heading"],
                            raw_text=pending["text"].strip(),
                        )
                    )
                    block_order += 1
                pending = None

            for it in raw_items:
                if pending is None:
                    pending = {
                        "page_number": it["page_number"],
                        "heading": it["heading"],
                        "text": it["text"],
                        "bbox": it["bbox"],
                    }
                    continue

                same_page = pending["page_number"] == it["page_number"]
                same_heading = pending["heading"] == it["heading"]
                combined_words = len(pending["text"].split()) + len(it["text"].split())

                if same_page and same_heading and combined_words <= 250:
                    pending["text"] = pending["text"] + "\n" + it["text"]
                    b1: BoundingBox = pending["bbox"]
                    b2: BoundingBox = it["bbox"]
                    pending["bbox"] = BoundingBox(
                        x0=min(b1.x0, b2.x0),
                        y0=min(b1.y0, b2.y0),
                        x1=max(b1.x1, b2.x1),
                        y1=max(b1.y1, b2.y1),
                    )
                else:
                    flush_item()
                    pending = {
                        "page_number": it["page_number"],
                        "heading": it["heading"],
                        "text": it["text"],
                        "bbox": it["bbox"],
                    }

            flush_item()
            if drafts:
                return drafts
    except Exception:
        pass

    return _extract_with_fitz_blocks(pdf_path)
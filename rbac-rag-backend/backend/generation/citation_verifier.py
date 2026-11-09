import re
from typing import Any

_SNIPPET_INJECTION_PATTERNS = [
    r"ignore\s+(all\s+|previous\s+|prior\s+)?(instructions|rules|prompts)",
    r"system\s+override",
    r"output\s+.*salary",
    r"reveal\s+.*secret",
]


def _sanitize_snippet_text(text: str) -> str:
    """
    Removes embedded indirect prompt-injection sentences from citation snippets
    so adversarial instructions inside documents are never echoed in UI metadata.
    """
    sentences = re.split(r"(?<=[.!?])\s+|\n+", text)
    clean_sentences = [
        s for s in sentences
        if not any(re.search(pat, s, flags=re.IGNORECASE) for pat in _SNIPPET_INJECTION_PATTERNS)
    ]
    return " ".join(clean_sentences).strip()


def verify_and_enrich_citations(
    cited_chunk_ids: list[str],
    retrieved_chunks: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Verifies every LLM-cited chunk_id against the RLS-authorized retrieved_chunks
    for the current request, drops any unauthorized/hallucinated IDs, and enriches
    valid citations with page coordinates and annotated PDF links.
    """
    allowed_map: dict[str, dict[str, Any]] = {
        str(c["chunk_id"]): c for c in retrieved_chunks if "chunk_id" in c
    }

    verified_citations: list[dict[str, Any]] = []
    seen_ids: set[str] = set()

    for raw_id in cited_chunk_ids:
        cid = str(raw_id).strip()
        if not cid or cid in seen_ids:
            continue

        if cid not in allowed_map:
            # Strip hallucinated or unauthorized chunk_id immediately
            continue

        seen_ids.add(cid)
        chunk = allowed_map[cid]
        raw_content = _sanitize_snippet_text(str(chunk.get("content", "")))
        snippet = raw_content[:200] + "..." if len(raw_content) > 200 else raw_content + "..."
        doc_id = str(chunk.get("doc_id", ""))

        verified_citations.append(
            {
                "chunk_id": cid,
                "doc_id": doc_id,
                "filename": chunk.get("filename", "unknown"),
                "page_number": chunk.get("page_number"),
                "bbox": chunk.get("bbox"),
                "section_heading": chunk.get("section_heading"),
                "snippet": snippet,
                "annotated_pdf_url": f"/api/v1/ingest/documents/{doc_id}/annotated-pdf",
            }
        )

    return verified_citations
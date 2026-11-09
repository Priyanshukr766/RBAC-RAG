import logging
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from backend.config import get_settings

logger = logging.getLogger(__name__)

# Serializes appends from concurrent request threads so entries never interleave.
_WRITE_LOCK = threading.Lock()

_SCORE_KEYS = ("rerank_score", "rrf_score", "bm25_score", "vector_score")


def _blockquote(text: str) -> str:
    """Renders arbitrary chunk text safely inside a Markdown blockquote."""
    lines = str(text or "").splitlines() or [""]
    return "\n".join(f"  > {line}" if line else "  >" for line in lines)


def _format_scores(chunk: dict[str, Any]) -> str:
    """Lists every ranking score present on a chunk (mode-specific)."""
    parts: list[str] = []
    for key in _SCORE_KEYS:
        value = chunk.get(key)
        if value is not None:
            try:
                parts.append(f"{key}={float(value):.6f}")
            except (TypeError, ValueError):
                parts.append(f"{key}={value}")
    return ", ".join(parts) if parts else "n/a"


def _format_entry(
    *,
    timestamp: datetime,
    user_id: Optional[int],
    user_role: str,
    query: str,
    mode: str,
    chunks: list[dict[str, Any]],
    cache_hit: bool,
    guardrail_status: str,
) -> str:
    lines: list[str] = [
        f"## {timestamp:%Y-%m-%d %H:%M:%S} UTC — user {user_id} ({user_role})",
        "",
        "- **Query:**",
        _blockquote(query),
        f"- **Mode:** `{mode}`",
        f"- **Guardrail:** `{guardrail_status}`",
        f"- **Cache hit:** `{str(cache_hit).lower()}`",
        f"- **Chunks retrieved:** {len(chunks)}",
        "",
    ]

    if not chunks:
        lines.extend(["_No chunks were retrieved for this query._", "", "---", ""])
        return "\n".join(lines)

    for rank, chunk in enumerate(chunks, start=1):
        chunk_id = str(chunk.get("chunk_id", "unknown"))
        lines.append(f"### Rank {rank} — `{chunk_id}`")
        lines.append("")
        lines.append(f"- **File:** `{chunk.get('filename', 'unknown')}`")

        if chunk.get("page_number") is not None:
            lines.append(f"- **Page:** {chunk['page_number']}")
        if chunk.get("section_heading"):
            lines.append(f"- **Section:** {chunk['section_heading']}")

        lines.append(f"- **Scores:** {_format_scores(chunk)}")
        lines.append("- **Text:**")
        lines.append(_blockquote(str(chunk.get("content", ""))))
        lines.append("")

    lines.extend(["---", ""])
    return "\n".join(lines)


def log_query_retrieval(
    *,
    user_id: Optional[int],
    user_role: str,
    query: str,
    mode: str,
    chunks: list[dict[str, Any]],
    cache_hit: bool = False,
    guardrail_status: str = "passed",
) -> None:
    """
    Appends one query's retrieval results (rank, chunk_id and full chunk text) to
    a daily Markdown file: <RETRIEVAL_LOG_DIR>/retrieval_YYYY-MM-DD.md.

    Logging is best-effort: any I/O failure is reported through the standard
    logger but never breaks the user-facing query.
    """
    settings = get_settings()
    if not settings.RETRIEVAL_LOG_ENABLED:
        return

    try:
        now = datetime.now(timezone.utc)
        log_dir = Path(settings.RETRIEVAL_LOG_DIR)
        log_dir.mkdir(parents=True, exist_ok=True)
        log_path = log_dir / f"retrieval_{now:%Y-%m-%d}.md"

        entry = _format_entry(
            timestamp=now,
            user_id=user_id,
            user_role=user_role,
            query=query,
            mode=mode,
            chunks=chunks or [],
            cache_hit=cache_hit,
            guardrail_status=guardrail_status,
        )

        with _WRITE_LOCK:
            is_new = not log_path.exists() or log_path.stat().st_size == 0
            with log_path.open("a", encoding="utf-8", newline="\n") as handle:
                if is_new:
                    handle.write(f"# Retrieval Log — {now:%Y-%m-%d}\n\n")
                handle.write(entry)
    except Exception:
        logger.exception("Failed to write retrieval Markdown log")

import math
import re
from typing import List, Dict, Any
from rank_bm25 import BM25Okapi
from backend.db.session import get_rls_cursor


def tokenize_for_bm25(text: str) -> List[str]:
    """
    Alphanumeric + code-preserving tokenizer that keeps hex error codes (e.g., 0x884f),
    underscores, and hyphenated policy IDs (e.g., form-16b) intact.
    """
    if not text:
        return []
    return re.findall(r"[a-z0-9_x-]+", text.lower())


def search_bm25_leg(
    user_role: str,
    query: str,
    top_k: int = 50,
) -> List[Dict[str, Any]]:
    """
    Fetches all RLS-authorized chunks for user_role from PostgreSQL and ranks them
    using true BM25Okapi scoring (with Lucene positive-IDF correction so small
    corpora N <= 2 never collapse to 0). Filters out score <= 0 and returns up to
    top_k results with 1-indexed 'bm25_rank' and 'bm25_score'.
    """
    query_tokens = tokenize_for_bm25(query)
    if not query_tokens:
        return []

    authorized_chunks: List[Dict[str, Any]] = []

    with get_rls_cursor(user_role, enable_iterative_scan=False) as cur:
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
                c.section_heading
            FROM document_chunks c
            JOIN documents d ON c.doc_id = d.doc_id;
            """
        )
        rows = cur.fetchall()

        for r in rows:
            if isinstance(r, dict):
                authorized_chunks.append(
                    {
                        "chunk_id": str(r["chunk_id"]),
                        "doc_id": str(r["doc_id"]),
                        "filename": r["filename"],
                        "content": r["content"],
                        "allowed_roles": list(r["allowed_roles"]),
                        "page_number": r["page_number"],
                        "bbox": [float(x) for x in r["bbox"]] if r["bbox"] else None,
                        "section_heading": r["section_heading"],
                    }
                )
            else:
                authorized_chunks.append(
                    {
                        "chunk_id": str(r[0]),
                        "doc_id": str(r[1]),
                        "filename": r[2],
                        "content": r[3],
                        "allowed_roles": list(r[4]),
                        "page_number": r[5],
                        "bbox": [float(x) for x in r[6]] if r[6] else None,
                        "section_heading": r[7],
                    }
                )

    if not authorized_chunks:
        return []

    tokenized_corpus = [tokenize_for_bm25(c["content"]) for c in authorized_chunks]
    bm25 = BM25Okapi(tokenized_corpus)

    # Apply Lucene BM25 positive-IDF formula: ln(1 + (N - df + 0.5) / (df + 0.5))
    # using bm25.doc_freqs so small RLS-filtered corpora (N <= 2) never collapse to 0.0 IDF
    n_docs = bm25.corpus_size
    df_counts: Dict[str, int] = {}
    for doc_freq_dict in bm25.doc_freqs:
        for word in doc_freq_dict.keys():
            df_counts[word] = df_counts.get(word, 0) + 1

    for word, df in df_counts.items():
        bm25.idf[word] = math.log(1.0 + (n_docs - df + 0.5) / (df + 0.5))

    scores = bm25.get_scores(query_tokens)

    scored_candidates: List[Dict[str, Any]] = []
    for chunk, score in zip(authorized_chunks, scores):
        f_score = float(score)
        if f_score > 0.0:
            item = dict(chunk)
            item["bm25_score"] = f_score
            scored_candidates.append(item)

    scored_candidates.sort(key=lambda x: x["bm25_score"], reverse=True)
    top_slice = scored_candidates[:top_k]

    for idx, item in enumerate(top_slice):
        item["bm25_rank"] = idx + 1

    return top_slice
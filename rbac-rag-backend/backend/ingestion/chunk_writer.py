from typing import List
from backend.db.session import get_rls_cursor, get_admin_cursor
from backend.models.ingestion_schemas import ChunkRecord
from backend.ingestion.embedder import embed_texts


def embed_and_store_chunks(doc_id: str, chunks: List[ChunkRecord]) -> int:
    """
    Computes 768-dim BGE embeddings in batch for a list of ChunkRecord objects,
    replaces any existing chunks for doc_id inside an 'admin' RLS transaction,
    and updates the parent document status to 'published'.
    """
    if not chunks:
        return 0

    texts = [c.content for c in chunks]
    vectors = embed_texts(texts)

    with get_rls_cursor("admin", enable_iterative_scan=False) as cur:
        # Delete existing chunks for this document so re-publishing is idempotent
        cur.execute("DELETE FROM document_chunks WHERE doc_id = %s;", (doc_id,))

        for chunk, vec in zip(chunks, vectors):
            cur.execute(
                """
                INSERT INTO document_chunks (
                    doc_id,
                    parent_block_id,
                    chunk_index,
                    content,
                    embedding,
                    allowed_roles,
                    page_number,
                    bbox,
                    section_heading
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);
                """,
                (
                    str(doc_id),
                    chunk.parent_block_id,
                    chunk.chunk_index,
                    chunk.content,
                    vec,
                    chunk.allowed_roles,
                    chunk.page_number,
                    chunk.bbox,
                    chunk.section_heading,
                ),
            )

    with get_admin_cursor() as admin_cur:
        admin_cur.execute(
            "UPDATE documents SET status = 'published' WHERE doc_id = %s;",
            (doc_id,),
        )

    return len(chunks)

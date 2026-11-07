import uuid
import pytest

from backend.db.session import get_admin_cursor, init_db_schema
from backend.ingestion.chunk_writer import embed_and_store_chunks
from backend.models.ingestion_schemas import ChunkRecord
from backend.retrieval.hybrid_search import retrieve_for_user


@pytest.fixture(scope="module")
def seeded_phase9_doc():
    init_db_schema()
    doc_id = str(uuid.uuid4())

    with get_admin_cursor() as cur:
        cur.execute(
            """
            INSERT INTO documents (doc_id, filename, file_type, upload_mode, status, raw_file_path)
            VALUES (%s, %s, 'pdf', 'express_single_role', 'published', 'storage/raw_uploads/phase9_test.pdf')
            """,
            (doc_id, "phase9_test_manual.pdf"),
        )

    chunks = [
        ChunkRecord(
            doc_id=doc_id,
            chunk_index=0,
            content="[Section: Runbook] Error code 0x884F occurs when the Kafka consumer offset stalls. Restart the worker pod immediately.",
            allowed_roles=["engineering"],
            page_number=1,
            bbox=[72.0, 100.0, 500.0, 160.0],
            section_heading="Runbook",
        ),
        ChunkRecord(
            doc_id=doc_id,
            chunk_index=1,
            content="[Section: DevOps] To recover a stuck Kubernetes deployment in production, execute kubectl rollout restart deployment/api-gateway.",
            allowed_roles=["engineering"],
            page_number=2,
            bbox=[72.0, 180.0, 500.0, 240.0],
            section_heading="DevOps",
        ),
        ChunkRecord(
            doc_id=doc_id,
            chunk_index=2,
            content="[Section: Compensation] Executive Neha Sharma base salary is ₹42,00,000 with a retention bonus of ₹5,00,000.",
            allowed_roles=["hr"],
            page_number=3,
            bbox=[72.0, 260.0, 500.0, 320.0],
            section_heading="Compensation",
        ),
        ChunkRecord(
            doc_id=doc_id,
            chunk_index=3,
            content="[Section: Holidays] All employees receive 24 days of paid annual leave and 12 days of sick leave per calendar year.",
            allowed_roles=["all_employees"],
            page_number=4,
            bbox=[72.0, 340.0, 500.0, 400.0],
            section_heading="Holidays",
        ),
    ]

    embed_and_store_chunks(doc_id, chunks)
    yield doc_id

    with get_admin_cursor() as cur:
        cur.execute("DELETE FROM documents WHERE doc_id = %s", (doc_id,))


def test_all_four_ablation_modes_enforce_rls(seeded_phase9_doc):
    modes = ["bm25_only", "vector_only", "hybrid_rrf", "hybrid_rerank"]

    for mode in modes:
        # 1. Engineering user searching for HR salary must NEVER receive HR chunks
        eng_results = retrieve_for_user(
            user_role="engineering",
            query="Neha Sharma base salary ₹42,00,000",
            mode=mode,
            top_k=5,
        )
        for r in eng_results:
            assert "engineering" in r["allowed_roles"] or "all_employees" in r["allowed_roles"], (
                f"RLS leak in mode={mode}: {r['allowed_roles']}"
            )
            assert "Neha Sharma" not in r["content"]

        # 2. Engineering user searching for exact error code 0x884F should retrieve the runbook
        code_results = retrieve_for_user(
            user_role="engineering",
            query="How do we fix error code 0x884F?",
            mode=mode,
            top_k=5,
        )
        assert len(code_results) > 0
        top_contents = " ".join(c["content"] for c in code_results[:2])
        assert "0x884F" in top_contents


def test_hybrid_rerank_promotes_exact_answer(seeded_phase9_doc):
    results = retrieve_for_user(
        user_role="hr",
        query="What is Neha Sharma's base salary and retention bonus?",
        mode="hybrid_rerank",
        top_k=3,
    )
    assert len(results) > 0
    assert "Neha Sharma" in results[0]["content"]
    assert "rerank_score" in results[0]
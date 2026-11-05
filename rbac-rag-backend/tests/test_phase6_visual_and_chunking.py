import os
import fitz
from backend.db.session import init_db_schema, get_admin_cursor, get_rls_cursor
from backend.models.ingestion_schemas import LogicalBlockDraft, BoundingBox
from backend.ingestion.staging_store import save_logical_blocks
from backend.ingestion.pdf_box_painter import paint_annotated_pdf
from backend.ingestion.stage2_chunker import create_chunks_from_approved_blocks
from backend.ingestion.chunk_writer import embed_and_store_chunks


def test_phase6_full_visual_and_chunking_flow():
    init_db_schema()

    raw_pdf_path = "storage/raw_uploads/phase6_test_raw.pdf"
    annotated_pdf_path = "storage/annotated_pdfs/phase6_test_painted.pdf"
    os.makedirs(os.path.dirname(raw_pdf_path), exist_ok=True)
    os.makedirs(os.path.dirname(annotated_pdf_path), exist_ok=True)

    # 1. Create a 1-page synthetic PDF with PyMuPDF
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 100), "Engineering Cluster Runbook: Kubernetes pod restart procedure.")
    page.insert_text((72, 300), "Confidential HR Comp: Executive base salary is $220,000.")
    doc.save(raw_pdf_path)
    doc.close()

    # 2. Insert parent document row in PostgreSQL
    with get_admin_cursor() as cur:
        cur.execute(
            """
            INSERT INTO documents (filename, file_type, upload_mode, status, raw_file_path)
            VALUES ('phase6_test.pdf', 'pdf', 'hitl_mixed_visual', 'pending_review', %s)
            RETURNING doc_id::text;
            """,
            (raw_pdf_path,),
        )
        row = cur.fetchone()
        doc_id = row["doc_id"] if isinstance(row, dict) else row[0]

    try:
        # 3. Stage 2 LogicalBlockDraft items (1 Engineering, 1 HR)
        drafts = [
            LogicalBlockDraft(
                block_order=0,
                page_number=1,
                bbox=BoundingBox(x0=70.0, y0=88.0, x1=450.0, y1=118.0),
                section_heading="Cluster Runbook",
                raw_text="Engineering Cluster Runbook: Kubernetes pod restart procedure.",
                suggested_roles=["engineering"],
                approved_roles=["engineering"],
                confidence_score=0.94,
                needs_human_review=False,
                pii_triggered=False,
            ),
            LogicalBlockDraft(
                block_order=1,
                page_number=1,
                bbox=BoundingBox(x0=70.0, y0=288.0, x1=450.0, y1=318.0),
                section_heading="Executive Comp",
                raw_text="Confidential HR Comp: Executive base salary is $220,000.",
                suggested_roles=["hr"],
                approved_roles=["hr"],
                confidence_score=0.95,
                needs_human_review=False,
                pii_triggered=True,
            ),
        ]
        saved_blocks = save_logical_blocks(doc_id, drafts)

        # 4. Paint the annotated PDF with colored bounding boxes
        paint_annotated_pdf(raw_pdf_path, annotated_pdf_path, saved_blocks)
        assert os.path.exists(annotated_pdf_path)

        # 5. Slice approved blocks into Stage-2 chunks and embed/store in PostgreSQL
        chunks = create_chunks_from_approved_blocks(doc_id, saved_blocks)
        stored_count = embed_and_store_chunks(doc_id, chunks)
        assert stored_count == 2

        # 6. Verify RLS enforcement: 'engineering' user sees only the Engineering chunk
        with get_rls_cursor("engineering") as cur:
            cur.execute(
                "SELECT content, allowed_roles FROM document_chunks WHERE doc_id = %s;",
                (doc_id,),
            )
            eng_rows = cur.fetchall()
            assert len(eng_rows) == 1
            content_val = eng_rows[0]["content"] if isinstance(eng_rows[0], dict) else eng_rows[0][0]
            assert "Kubernetes" in content_val
            assert "$220,000" not in content_val

    finally:
        with get_admin_cursor() as cur:
            cur.execute("DELETE FROM documents WHERE doc_id = %s;", (doc_id,))
        if os.path.exists(raw_pdf_path):
            os.remove(raw_pdf_path)
        if os.path.exists(annotated_pdf_path):
            os.remove(annotated_pdf_path)
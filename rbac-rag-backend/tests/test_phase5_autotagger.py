from backend.db.session import init_db_schema, get_admin_cursor
from backend.models.ingestion_schemas import LogicalBlockDraft, BoundingBox
from backend.ingestion.auto_tagger import auto_tag_logical_blocks
from backend.ingestion.staging_store import (
    save_logical_blocks,
    get_logical_blocks_for_doc,
    update_logical_block_roles,
)


def test_autotagger_and_staging_store():
    init_db_schema()

    # 1. Create two synthetic blocks: one with a deceptive heading hiding HR salary PII,
    #    and one general company block.
    blocks = [
        LogicalBlockDraft(
            block_order=0,
            page_number=1,
            bbox=BoundingBox(x0=72.0, y0=100.0, x1=500.0, y1=160.0),
            section_heading="Company Picnic",
            raw_text="Everyone enjoyed the games. Note: Rahul's base salary was raised to $165,000.",
        ),
        LogicalBlockDraft(
            block_order=1,
            page_number=1,
            bbox=BoundingBox(x0=72.0, y0=200.0, x1=500.0, y1=260.0),
            section_heading="Holiday Schedule",
            raw_text="The office will remain closed on Friday for the annual winter holiday.",
        ),
    ]

    # 2. Run auto_tag_logical_blocks
    tagged = auto_tag_logical_blocks(blocks)

    # Block 0 must be quarantined to ['hr'] with pii_triggered=True and 'all_employees' stripped out
    assert tagged[0].pii_triggered is True
    assert tagged[0].approved_roles == ["hr"]
    assert "all_employees" not in tagged[0].approved_roles

    # Block 1 is general info
    assert tagged[1].pii_triggered is False
    assert "all_employees" in tagged[1].approved_roles

    # 3. Test saving and updating in PostgreSQL logical_blocks staging table
    with get_admin_cursor() as cur:
        cur.execute(
            """
            INSERT INTO documents (filename, file_type, upload_mode, status, raw_file_path)
            VALUES ('phase5_test.pdf', 'pdf', 'hitl_mixed_visual', 'pending_review', 'storage/raw_uploads/phase5_test.pdf')
            RETURNING doc_id::text;
            """
        )
        row = cur.fetchone()
        doc_id = row["doc_id"] if isinstance(row, dict) else row[0]

    try:
        saved = save_logical_blocks(doc_id, tagged)
        assert len(saved) == 2
        assert saved[0]["approved_roles"] == ["hr"]
        assert saved[0]["pii_triggered"] is True

        # 4. Update the second block's approved_roles to ['finance'] via Admin override
        second_block_id = saved[1]["block_id"]
        updated = update_logical_block_roles(
            doc_id,
            [{"block_id": second_block_id, "approved_roles": ["finance"]}],
        )
        assert updated[1]["approved_roles"] == ["finance"]
        assert updated[1]["needs_human_review"] is False

        # Verify persisted state via get_logical_blocks_for_doc
        fetched = get_logical_blocks_for_doc(doc_id)
        assert fetched[1]["approved_roles"] == ["finance"]

    finally:
        with get_admin_cursor() as cur:
            cur.execute("DELETE FROM documents WHERE doc_id = %s;", (doc_id,))
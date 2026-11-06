import io
import json
import fitz
import pandas as pd
from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.db.session import init_db_schema, get_admin_cursor, get_rls_cursor
from backend.auth.dependencies import require_admin
from backend.models.auth_schemas import AuthenticatedUser
from backend.routers.ingest_router import router


def test_phase7_full_hitl_and_excel_ingest_workflow():
    init_db_schema()

    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[require_admin] = lambda: AuthenticatedUser(
        user_id=1,
        email="admin@enterprise.com",
        role="admin",
        is_active=True,
    )
    client = TestClient(app)

    # 1. Build a 1-page mixed-sensitivity PDF in memory
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((72, 100), "Heading: Engineering Architecture")
    page.insert_text((72, 135), "Kubernetes cluster deployment runbook for error 0x884F.")
    page.insert_text((72, 300), "Heading: Executive Compensation")
    page.insert_text((72, 335), "Neha Sharma base salary is $195,000 with a $30,000 bonus.")
    pdf_bytes = doc.tobytes()
    doc.close()

    created_doc_ids = []

    try:
        # 2. Upload via Path B (hitl_mixed_visual)
        up_res = client.post(
            "/api/v1/ingest/upload",
            data={"upload_mode": "hitl_mixed_visual"},
            files={"file": ("mixed_policy.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
        )
        assert up_res.status_code == 200
        up_data = up_res.json()
        pdf_doc_id = up_data["doc_id"]
        created_doc_ids.append(pdf_doc_id)
        assert up_data["status"] == "pending_review"
        assert up_data["total_blocks"] >= 2

        # 3. Fetch staged blocks for Review Inbox
        get_res = client.get(f"/api/v1/ingest/documents/{pdf_doc_id}/blocks")
        assert get_res.status_code == 200
        blocks = get_res.json()["blocks"]
        assert len(blocks) >= 2

        # 4. Admin edits first block's role checkboxes to ['engineering'] and triggers repaint
        first_block_id = blocks[0]["block_id"]
        put_res = client.put(
            f"/api/v1/ingest/documents/{pdf_doc_id}/blocks",
            json={"updates": [{"block_id": first_block_id, "approved_roles": ["engineering"]}]},
        )
        assert put_res.status_code == 200
        assert put_res.json()["status"] == "preview_painted"

        # 5. Stream annotated PDF and verify valid PDF header
        pdf_stream = client.get(f"/api/v1/ingest/documents/{pdf_doc_id}/annotated-pdf")
        assert pdf_stream.status_code == 200
        assert pdf_stream.headers["content-type"] == "application/pdf"
        assert pdf_stream.content.startswith(b"%PDF")

        # 6. Confirm & Publish reviewed blocks into document_chunks
        pub_res = client.post(f"/api/v1/ingest/documents/{pdf_doc_id}/publish")
        assert pub_res.status_code == 200
        pub_data = pub_res.json()
        assert pub_data["status"] == "published"
        assert pub_data["chunks_created"] >= 2

        # 7. Upload an Excel spreadsheet via Path C (/upload-excel)
        df = pd.DataFrame([
            {"Employee": "Neha Sharma", "Department": "Engineering", "Base_Salary": "4200000"},
            {"Employee": "Arjun Rao", "Department": "Platform", "Base_Salary": "3600000"},
        ])
        xl_buf = io.BytesIO()
        df.to_excel(xl_buf, index=False)
        xl_buf.seek(0)

        xl_res = client.post(
            "/api/v1/ingest/upload-excel",
            data={
                "anchor_columns": json.dumps(["Employee"]),
                "public_columns": json.dumps(["Department"]),
                "public_roles": json.dumps(["all_employees"]),
                "restricted_column_map": json.dumps({"Base_Salary": ["hr"]}),
            },
            files={
                "file": (
                    "comp.xlsx",
                    xl_buf,
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                )
            },
        )
        assert xl_res.status_code == 200
        xl_data = xl_res.json()
        xl_doc_id = xl_data["doc_id"]
        created_doc_ids.append(xl_doc_id)
        assert xl_data["status"] == "published"
        assert xl_data["chunks_created"] == 4

        # 8. Verify PostgreSQL RLS hides restricted HR Excel chunks from 'engineering'
        with get_rls_cursor("engineering") as cur:
            cur.execute(
                "SELECT content FROM document_chunks WHERE doc_id = %s;",
                (xl_doc_id,),
            )
            eng_rows = cur.fetchall()
            assert len(eng_rows) == 2
            for r in eng_rows:
                text = r["content"] if isinstance(r, dict) else r[0]
                assert "Base_Salary" not in text

    finally:
        with get_admin_cursor() as cur:
            for did in created_doc_ids:
                cur.execute("DELETE FROM documents WHERE doc_id = %s;", (did,))
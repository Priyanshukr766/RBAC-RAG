from backend.db.session import get_admin_cursor, get_rls_cursor, init_db_schema


def test_kernel_level_rls_isolation():
    init_db_schema()

    # 1. Insert a parent test document using the admin cursor
    with get_admin_cursor() as cur:
        cur.execute("""
            INSERT INTO documents (filename, file_type, upload_mode, status, raw_file_path)
            VALUES ('rls_test.pdf', 'pdf', 'express_single_role', 'published', 'storage/raw_uploads/rls_test.pdf')
            RETURNING doc_id::text;
            """)
        doc_id = cur.fetchone()["doc_id"]

    dummy_vec = [0.01] * 768

    try:
        # 2. Insert 3 chunks (HR, Engineering, All Employees) using 'admin' RLS context
        with get_rls_cursor("admin") as cur:
            cur.execute(
                """
                INSERT INTO document_chunks (doc_id, chunk_index, content, embedding, allowed_roles)
                VALUES
                    (%s, 0, 'Secret CEO Salary is $500k', %s, ARRAY['hr']),
                    (%s, 1, 'Kubernetes cluster runbook', %s, ARRAY['engineering']),
                    (%s, 2, 'Holiday calendar 2026', %s, ARRAY['all_employees']);
                """,
                (doc_id, dummy_vec, doc_id, dummy_vec, doc_id, dummy_vec),
            )

        # 3. Query as 'engineering' — HR chunk must be physically invisible
        with get_rls_cursor("engineering") as cur:
            cur.execute(
                "SELECT content, allowed_roles FROM document_chunks WHERE doc_id = %s ORDER BY chunk_index;",
                (doc_id,),
            )
            eng_rows = cur.fetchall()

        eng_contents = [r["content"] for r in eng_rows]
        assert len(eng_rows) == 2
        assert "Kubernetes cluster runbook" in eng_contents
        assert "Holiday calendar 2026" in eng_contents
        assert not any("Secret CEO Salary" in c for c in eng_contents)

        # 4. Query as 'hr' — Engineering chunk must be physically invisible
        with get_rls_cursor("hr") as cur:
            cur.execute(
                "SELECT content, allowed_roles FROM document_chunks WHERE doc_id = %s ORDER BY chunk_index;",
                (doc_id,),
            )
            hr_rows = cur.fetchall()

        hr_contents = [r["content"] for r in hr_rows]
        assert len(hr_rows) == 2
        assert "Secret CEO Salary is $500k" in hr_contents
        assert "Holiday calendar 2026" in hr_contents
        assert not any("Kubernetes cluster runbook" in c for c in hr_contents)

    finally:
        # 5. Clean up test document (cascades to document_chunks)
        with get_admin_cursor() as cur:
            cur.execute("DELETE FROM documents WHERE doc_id = %s;", (doc_id,))
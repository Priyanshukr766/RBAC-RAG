import uuid
from fastapi.security import HTTPAuthorizationCredentials

from backend.auth.dependencies import get_current_user
from backend.db.session import get_admin_cursor, get_rls_cursor, init_db_schema
from backend.models.auth_schemas import (
    AuthenticatedUser,
    RoleUpdateRequest,
    UserCreateRequest,
    UserLoginRequest,
)
from backend.routers.auth_router import login_user, register_user, update_user_role


def test_subsecond_live_role_revocation():
    init_db_schema()
    unique_email = f"priya_{uuid.uuid4().hex[:8]}@corp.com"

    # 1. Register Priya with role='hr' and log her in to obtain hr_jwt
    reg_res = register_user(
        UserCreateRequest(
            email=unique_email,
            password="StrongPassword123!",
            full_name="Priya Sharma",
            role="hr",
        )
    )
    user_id = reg_res.user_id

    login_res = login_user(
        UserLoginRequest(email=unique_email, password="StrongPassword123!")
    )
    hr_jwt = login_res.access_token

    # Insert a test HR chunk to verify database-level revocation
    dummy_vec = [0.02] * 768
    with get_admin_cursor() as cur:
        cur.execute(
            """
            INSERT INTO documents (filename, file_type, upload_mode, status, raw_file_path)
            VALUES ('hr_revocation_test.pdf', 'pdf', 'express_single_role', 'published', 'storage/raw_uploads/hr.pdf')
            RETURNING doc_id::text;
            """
        )
        doc_id = cur.fetchone()["doc_id"]

    with get_rls_cursor("admin") as cur:
        cur.execute(
            """
            INSERT INTO document_chunks (doc_id, chunk_index, content, embedding, allowed_roles)
            VALUES (%s, 0, 'Confidential HR Bonus Pool', %s, ARRAY['hr']);
            """,
            (doc_id, dummy_vec),
        )

    try:
        # 2. Verify get_current_user with hr_jwt initially returns role == 'hr'
        creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=hr_jwt)
        live_user = get_current_user(credentials=creds)
        assert live_user.role == "hr"

        # Confirm she can currently see the HR row
        with get_rls_cursor(live_user.role) as cur:
            cur.execute(
                "SELECT content FROM document_chunks WHERE doc_id = %s;", (doc_id,)
            )
            assert len(cur.fetchall()) == 1

        # 3. Admin changes Priya's role from 'hr' to 'engineering'
        mock_admin = AuthenticatedUser(
            user_id=0, email="admin@corp.com", role="admin", is_active=True
        )
        update_user_role(
            payload=RoleUpdateRequest(
                user_id=user_id, new_role="engineering", is_active=True
            ),
            _admin=mock_admin,
        )

        # 4. Pass the EXACT SAME old hr_jwt into get_current_user immediately
        live_user_after = get_current_user(credentials=creds)
        assert live_user_after.role == "engineering"

        # Confirm querying document_chunks with her live session now returns 0 HR rows
        with get_rls_cursor(live_user_after.role) as cur:
            cur.execute(
                "SELECT content FROM document_chunks WHERE doc_id = %s;", (doc_id,)
            )
            assert len(cur.fetchall()) == 0

    finally:
        with get_admin_cursor() as cur:
            cur.execute("DELETE FROM documents WHERE doc_id = %s;", (doc_id,))
            cur.execute("DELETE FROM users WHERE user_id = %s;", (user_id,))
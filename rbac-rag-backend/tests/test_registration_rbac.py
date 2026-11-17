import uuid
import pytest
from pydantic import ValidationError

from backend.db.session import get_admin_cursor, init_db_schema
from backend.models.auth_schemas import (
    AuthenticatedUser,
    RoleUpdateRequest,
    UserCreateRequest,
)
from backend.routers.auth_router import register_user, update_user_role


def test_registration_assigns_baseline_employee_role():
    """Verify public registration always assigns 'all_employees' baseline role."""
    unique_email = f"emp_{uuid.uuid4().hex[:8]}@company.com"

    # UserCreateRequest does not accept 'role' parameter
    with pytest.raises(ValidationError):
        UserCreateRequest(
            email=unique_email,
            password="StrongPassword123!",
            full_name="Attacker Trying Admin",
            role="admin",  # type: ignore
        )

    # Valid registration receives 'all_employees'
    reg_res = register_user(
        UserCreateRequest(
            email=unique_email,
            password="StrongPassword123!",
            full_name="Normal Employee",
        )
    )
    try:
        assert reg_res.role == "all_employees"

        # Verify role in database
        with get_admin_cursor() as cur:
            cur.execute("SELECT role FROM users WHERE user_id = %s;", (reg_res.user_id,))
            row = cur.fetchone()
            assert row["role"] == "all_employees"
    finally:
        with get_admin_cursor() as cur:
            cur.execute("DELETE FROM users WHERE user_id = %s;", (reg_res.user_id,))


def test_demo_personas_seeded_correctly():
    """Verify database initialization seeds demo personas with designated roles."""
    init_db_schema()

    expected_personas = {
        "admin@company.com": "admin",
        "priya.hr@company.com": "hr",
        "arjun.eng@company.com": "engineering",
        "vikram.fin@company.com": "finance",
        "neha.intern@company.com": "intern",
    }

    with get_admin_cursor() as cur:
        for email, expected_role in expected_personas.items():
            cur.execute("SELECT role, is_active FROM users WHERE email = %s;", (email,))
            row = cur.fetchone()
            assert row is not None, f"Persona {email} should be seeded in users table"
            assert row["role"] == expected_role
            assert row["is_active"] is True

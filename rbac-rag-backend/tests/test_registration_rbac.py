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


def test_demo_personas_seeded_correctly(monkeypatch):
    """Verify database initialization seeds demo personas when SEED_DEMO_USERS=true."""
    monkeypatch.setenv("SEED_DEMO_USERS", "true")
    monkeypatch.setenv("DEMO_PASSWORD", "DemoPass123!")

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


def test_demo_personas_not_seeded_when_disabled(monkeypatch):
    """Verify no admin@company.com row is created when SEED_DEMO_USERS is false."""
    monkeypatch.setenv("SEED_DEMO_USERS", "false")

    with get_admin_cursor() as cur:
        cur.execute("SELECT user_id FROM users WHERE email = 'admin@company.com';")
        row = cur.fetchone()
        admin_id = row["user_id"] if row else None

        if admin_id:
            cur.execute("UPDATE audit_logs SET user_id = NULL WHERE user_id = %s;", (admin_id,))
            cur.execute("UPDATE documents SET uploaded_by = NULL WHERE uploaded_by = %s;", (admin_id,))
            cur.execute("DELETE FROM users WHERE user_id = %s;", (admin_id,))

    try:
        init_db_schema()

        with get_admin_cursor() as cur:
            cur.execute("SELECT user_id FROM users WHERE email = 'admin@company.com';")
            assert cur.fetchone() is None
    finally:
        # Re-seed demo users so downstream tests and demo logins succeed
        monkeypatch.setenv("SEED_DEMO_USERS", "true")
        monkeypatch.setenv("DEMO_PASSWORD", "DemoPass123!")
        init_db_schema()

        if admin_id:
            with get_admin_cursor() as cur:
                cur.execute("SELECT user_id FROM users WHERE email = 'admin@company.com';")
                new_row = cur.fetchone()
                if new_row:
                    new_id = new_row["user_id"]
                    cur.execute("UPDATE audit_logs SET user_id = %s WHERE user_id IS NULL;", (new_id,))
                    cur.execute("UPDATE documents SET uploaded_by = %s WHERE uploaded_by IS NULL;", (new_id,))


def test_demo_seeding_requires_password_env(monkeypatch):
    """Verify RuntimeError is raised when SEED_DEMO_USERS=true but DEMO_PASSWORD is not set."""
    monkeypatch.setenv("SEED_DEMO_USERS", "true")
    monkeypatch.delenv("DEMO_PASSWORD", raising=False)

    with pytest.raises(RuntimeError, match="SEED_DEMO_USERS is true but DEMO_PASSWORD is not set"):
        init_db_schema()

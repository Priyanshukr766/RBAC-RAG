from fastapi import APIRouter, Depends, HTTPException, status

from backend.auth.dependencies import get_current_user, require_admin
from backend.auth.jwt_handler import create_jwt_token, hash_password, verify_password
from backend.auth.live_role_guard import sync_user_role_to_redis
from backend.db.session import get_admin_cursor
from backend.models.auth_schemas import (
    AuthenticatedUser,
    RoleUpdateRequest,
    TokenResponse,
    UserCreateRequest,
    UserLoginRequest,
)

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

DEFAULT_REGISTRATION_ROLE = "all_employees"


@router.post("/register", response_model=TokenResponse)
def register_user(payload: UserCreateRequest) -> TokenResponse:
    pw_hash = hash_password(payload.password)
    with get_admin_cursor() as cur:
        cur.execute("SELECT user_id FROM users WHERE email = %s;", (payload.email,))
        if cur.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )
        cur.execute(
            """
            INSERT INTO users (email, password_hash, full_name, role, is_active)
            VALUES (%s, %s, %s, %s, TRUE)
            RETURNING user_id, email, role;
            """,
            (payload.email, pw_hash, payload.full_name, DEFAULT_REGISTRATION_ROLE),
        )
        row = cur.fetchone()

    user_id = int(row["user_id"])
    role = str(row["role"])
    sync_user_role_to_redis(user_id, role, is_active=True)

    token = create_jwt_token(user_id=user_id, email=row["email"], role=role, is_demo=False)
    return TokenResponse(
        access_token=token,
        user_id=user_id,
        email=row["email"],
        role=role,
        is_demo=False,
    )


@router.post("/login", response_model=TokenResponse)
def login_user(payload: UserLoginRequest) -> TokenResponse:
    with get_admin_cursor() as cur:
        cur.execute(
            "SELECT user_id, email, password_hash, role, is_active FROM users WHERE email = %s;",
            (payload.email,),
        )
        row = cur.fetchone()

    if not row or not verify_password(payload.password, row["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not row["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is deactivated",
        )

    user_id = int(row["user_id"])
    role = str(row["role"])
    sync_user_role_to_redis(user_id, role, is_active=True)

    token = create_jwt_token(user_id=user_id, email=row["email"], role=role, is_demo=payload.is_demo)
    return TokenResponse(
        access_token=token,
        user_id=user_id,
        email=row["email"],
        role=role,
        is_demo=payload.is_demo,
    )


@router.put("/admin/update-role", response_model=AuthenticatedUser)
def update_user_role(
    payload: RoleUpdateRequest,
    _admin: AuthenticatedUser = Depends(require_admin),
) -> AuthenticatedUser:
    with get_admin_cursor() as cur:
        cur.execute(
            """
            UPDATE users
            SET role = %s, is_active = %s, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = %s
            RETURNING user_id, email, role, is_active;
            """,
            (payload.new_role, payload.is_active, payload.user_id),
        )
        row = cur.fetchone()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target user not found",
        )

    # Immediately update Redis so existing JWTs reflect the new role in <1ms
    sync_user_role_to_redis(
        user_id=int(row["user_id"]),
        role=str(row["role"]),
        is_active=bool(row["is_active"]),
    )

    return AuthenticatedUser(
        user_id=int(row["user_id"]),
        email=str(row["email"]),
        role=row["role"],
        is_active=bool(row["is_active"]),
    )


@router.get("/me", response_model=AuthenticatedUser)
def get_me(user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
    return user
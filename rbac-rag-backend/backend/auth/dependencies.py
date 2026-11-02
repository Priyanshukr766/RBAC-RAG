from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from backend.auth.jwt_handler import decode_jwt_token
from backend.auth.live_role_guard import get_live_user_state
from backend.models.auth_schemas import AuthenticatedUser

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> AuthenticatedUser:
    payload = decode_jwt_token(credentials.credentials)
    user_id = int(payload["user_id"])
    email = str(payload["email"])

    # Crucial Security Step: Ignore payload["role"] and query live state from Redis/Postgres
    live_role, is_active = get_live_user_state(user_id)

    if not is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account has been deactivated",
        )

    return AuthenticatedUser(
        user_id=user_id,
        email=email,
        role=live_role,
        is_active=is_active,
    )


def require_admin(
    user: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user
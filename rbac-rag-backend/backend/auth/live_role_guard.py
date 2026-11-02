import redis
from fastapi import HTTPException, status

from backend.config import get_settings
from backend.db.session import get_admin_cursor

settings = get_settings()

redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)


def sync_user_role_to_redis(user_id: int, role: str, is_active: bool = True) -> None:
    """Writes the user's live role and active status into a Redis hash."""
    key = f"user_live_state:{user_id}"
    redis_client.hset(
        key,
        mapping={
            "role": role,
            "is_active": "1" if is_active else "0",
        },
    )


def get_live_user_state(user_id: int) -> tuple[str, bool]:
    """
    Returns (role, is_active) from Redis in <1ms.
    Falls back to PostgreSQL on cache miss and populates Redis.
    """
    key = f"user_live_state:{user_id}"
    data = redis_client.hgetall(key)

    if data and "role" in data and "is_active" in data:
        return data["role"], data["is_active"] == "1"

    # Fallback to PostgreSQL if key is not in Redis
    with get_admin_cursor() as cur:
        cur.execute(
            "SELECT role, is_active FROM users WHERE user_id = %s;",
            (user_id,),
        )
        row = cur.fetchone()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    role = row["role"]
    is_active = bool(row["is_active"])
    sync_user_role_to_redis(user_id, role, is_active)
    return role, is_active

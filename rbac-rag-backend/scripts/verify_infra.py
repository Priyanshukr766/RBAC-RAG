import sys
import psycopg
import redis
from backend.config import get_settings

def verify_postgres(admin_url: str) -> bool:
    try:
        with psycopg.connect(admin_url) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT version();")
                row = cur.fetchone()
                return row is not None
    except Exception as e:
        print(f"Postgres Error: {e}", file=sys.stderr)
        return False


def verify_redis(redis_url: str) -> bool:
    try:
        r = redis.from_url(redis_url)
        r.set("infra_test", "ok", ex=5)
        val = r.get("infra_test")
        return val == b"ok"
    except Exception as e:
        print(f"Redis Error: {e}", file=sys.stderr)
        return False


if __name__ == "__main__":
    settings = get_settings()
    pg_ok = verify_postgres(settings.DATABASE_ADMIN_URL)
    redis_ok = verify_redis(settings.REDIS_URL)

    if pg_ok and redis_ok:
        print("Postgres OK | Redis OK")
        sys.exit(0)
    else:
        sys.exit(1)

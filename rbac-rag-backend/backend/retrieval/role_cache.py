import hashlib
import json
import re
from typing import Optional, Dict, Any
import redis
from backend.config import get_settings


def _get_redis_client() -> redis.Redis:
    settings = get_settings()
    return redis.from_url(settings.REDIS_URL, decode_responses=True)


def _normalize_query(query: str) -> str:
    """
    Lowercases, strips whitespace, collapses multiple spaces, and removes trailing punctuation.
    Jo query hai usko saf krna h
    """
    q = (query or "").strip().lower()
    q = re.sub(r"\s+", " ", q)
    q = q.rstrip("?.! ")
    return q


def compute_role_cache_key(user_role: str, query: str) -> str:
    """
    Computes a permission-isolated Redis cache key:
    rag_cache:{role}:{sha256(role + '::' + normalized_query)}
    """
    role_clean = (user_role or "").strip().lower()
    norm_query = _normalize_query(query)
    raw_material = f"{role_clean}::{norm_query}"
    digest = hashlib.sha256(raw_material.encode("utf-8")).hexdigest()
    return f"rag_cache:{role_clean}:{digest}"


def get_cached_response(user_role: str, query: str) -> Optional[Dict[str, Any]]:
    """
    Fetches a cached response payload from Redis strictly scoped to user_role.
    Returns None on cache miss.
    """
    r = _get_redis_client()
    key = compute_role_cache_key(user_role, query)
    raw = r.get(key)
    if not raw:
        return None
    try:
        return json.loads(raw)
    except Exception:
        return None


def set_cached_response(
    user_role: str,
    query: str,
    response_payload: Dict[str, Any],
    ttl_seconds: int = 1800,
) -> None:
    """
    Stores a JSON response payload in Redis under the role-scoped key with a TTL (default 30 mins).
    """
    r = _get_redis_client()
    key = compute_role_cache_key(user_role, query)
    r.setex(key, ttl_seconds, json.dumps(response_payload))


def invalidate_role_cache(user_role: Optional[str] = None) -> int:
    """
    Purges cached RAG responses in Redis. If user_role is provided, purges only that role's
    partition; otherwise purges all rag_cache:* keys. Returns count of deleted keys.
    """
    r = _get_redis_client()
    pattern = f"rag_cache:{user_role.strip().lower()}:*" if user_role else "rag_cache:*"
    keys = list(r.scan_iter(match=pattern))
    if not keys:
        return 0
    return int(r.delete(*keys))
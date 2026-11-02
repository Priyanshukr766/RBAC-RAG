from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

import psycopg
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool
from pgvector.psycopg import register_vector

from backend.config import get_settings

settings = get_settings()

# Connection pool for non-superuser application queries (strictly obeys RLS)
app_pool = ConnectionPool(
    conninfo=settings.DATABASE_APP_URL,
    min_size=2,
    max_size=10,
    kwargs={"autocommit": False, "row_factory": dict_row},
    open=False,
)


def _ensure_app_pool_open() -> None:
    if app_pool.closed:
        app_pool.open(wait=True)

"""
init_db_schema(): Runs schema.sql and rls_policies.sql using the postgres superuser URL 
                   (DATABASE_ADMIN_URL) when the server starts.
"""
def init_db_schema() -> None:
    """Executes schema.sql and rls_policies.sql idempotently using the admin connection."""
    db_dir = Path(__file__).resolve().parent
    schema_sql = (db_dir / "schema.sql").read_text(encoding="utf-8-sig")
    rls_sql = (db_dir / "rls_policies.sql").read_text(encoding="utf-8-sig")

    with psycopg.connect(settings.DATABASE_ADMIN_URL, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute(schema_sql)
            cur.execute(rls_sql)

"""
get_admin_cursor(): Opens a connection as the postgres superuser for administrative tables like users,
                    documents, logical_blocks, and audit_logs.


The Admin connection is for backend operations that require elevated database permissions.

For example:
- Creating/updating employee records.
- Adding or removing user roles.
- Managing document ingestion.
- Updating staging data.
- Writing audit logs.
- Managing database records that normal employees shouldn't be allowed to modify.
"""
@contextmanager
def get_admin_cursor() -> Iterator[psycopg.Cursor]:
    """Provides a transactional cursor using the admin connection for staging/user/audit tables."""
    with psycopg.connect(
        settings.DATABASE_ADMIN_URL, autocommit=False, row_factory=dict_row
    ) as conn:
        register_vector(conn)
        with conn.transaction():
            with conn.cursor() as cur:
                yield cur


"""
get_rls_cursor(user_role, enable_iterative_scan): 
Acquires a pooled connection as rag_app_user (DATABASE_APP_URL), registers the pgvector type, 
opens a transaction block, and sets app.current_user_role and 
hnsw.iterative_scan = relaxed_order strictly for that transaction
 (SET LOCAL / set_config(..., true)). When the with block exits, the transaction
  closes and the role setting resets automatically so a role can never leak across pooled requests.

This is the postgres account your application uses for normal employee-facing operations, 
particularly document retrieval.
"""

@contextmanager
def get_rls_cursor(
    user_role: str, enable_iterative_scan: bool = True
) -> Iterator[psycopg.Cursor]:
    """
    Opens a transaction as rag_app_user, sets app.current_user_role locally for RLS,
    and enables pgvector HNSW iterative scan for pre-filtered vector searches.
    """
    _ensure_app_pool_open()
    with app_pool.connection() as conn:
        register_vector(conn)
        with conn.transaction():
            with conn.cursor() as cur:
                # Parameterized, SQL-injection-safe equivalent of SET LOCAL app.current_user_role
                cur.execute(
                    "SELECT set_config('app.current_user_role', %s, true);",
                    (user_role,),
                )
                if enable_iterative_scan:
                    cur.execute("SET LOCAL hnsw.iterative_scan = relaxed_order;")
                yield cur


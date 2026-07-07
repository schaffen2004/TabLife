"""
Database connection pool using psycopg2.
Reads credentials from environment variables (loaded via .env).
"""

import os
from contextlib import contextmanager
from pathlib import Path
from typing import Generator

import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor

_pool: pool.ThreadedConnectionPool | None = None


def _load_env_file() -> None:
    """Load repo .env values without adding a runtime dependency."""
    for parent in Path(__file__).resolve().parents:
        env_path = parent / ".env"
        if not env_path.exists():
            continue
        for line in env_path.read_text().splitlines():
            raw = line.strip()
            if not raw or raw.startswith("#") or "=" not in raw:
                continue
            key, value = raw.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))
        return


def init_pool(
    minconn: int = 1,
    maxconn: int = 10,
) -> None:
    """Initialise the global connection pool. Call once at startup."""
    global _pool
    if _pool is not None:
        return
    _load_env_file()
    _pool = pool.ThreadedConnectionPool(
        minconn=minconn,
        maxconn=maxconn,
        host=os.environ.get("DB_HOST", "localhost"),
        port=int(os.environ.get("DB_PORT", 5432)),
        dbname=os.environ.get("DB_NAME", "tablife_db"),
        user=os.environ.get("DB_USER", "admin"),
        password=os.environ.get("DB_PASSWORD", ""),
    )


def close_pool() -> None:
    """Close all connections in the pool. Call at shutdown."""
    global _pool
    if _pool:
        _pool.closeall()
        _pool = None


@contextmanager
def get_conn() -> Generator[psycopg2.extensions.connection, None, None]:
    """
    Context manager that yields a connection from the pool with
    RealDictCursor as default cursor factory, and auto-commits on
    clean exit or rolls back on exception.

    Usage::

        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
    """
    if _pool is None:
        init_pool()

    conn = _pool.getconn()
    conn.cursor_factory = RealDictCursor
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        _pool.putconn(conn)

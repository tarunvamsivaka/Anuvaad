import json
import logging
import math
import os
from collections.abc import AsyncGenerator

from pgvector.sqlalchemy import Vector
from sqlalchemy import event
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import declarative_base

from app.core.config import DATABASE_POOL_URL, DATABASE_URL, IS_PRODUCTION

logger = logging.getLogger("anuvaad")


@compiles(Vector, "sqlite")
def _compile_vector_sqlite(type_, compiler, **kw):
    return "JSON"


@compiles(JSONB, "sqlite")
def _compile_jsonb_sqlite(type_, compiler, **kw):
    return "JSON"


def _sqlite_cosine_distance(v1_raw, v2_raw):
    """Compute cosine distance between two vectors for SQLite in-memory runner.

    Distance = 1.0 - cosine_similarity.
    Returns 1.0 if vectors are empty or norm is zero.
    """
    if v1_raw is None or v2_raw is None:
        return 1.0
    try:
        vec1 = json.loads(v1_raw) if isinstance(v1_raw, str) else list(v1_raw)
        vec2 = json.loads(v2_raw) if isinstance(v2_raw, str) else list(v2_raw)
    except Exception:
        return 1.0

    if not vec1 or not vec2 or len(vec1) != len(vec2):
        return 1.0

    dot = sum(a * b for a, b in zip(vec1, vec2))
    norm1 = math.sqrt(sum(a * a for a in vec1))
    norm2 = math.sqrt(sum(b * b for b in vec2))

    if norm1 == 0 or norm2 == 0:
        return 1.0

    similarity = dot / (norm1 * norm2)
    similarity = max(-1.0, min(1.0, similarity))
    return 1.0 - similarity


# PERF-01: In production use the PgBouncer pooler URL (port 6543).
# In dev use the direct URL (port 5432) with SQLAlchemy's own pool.
_raw_url = DATABASE_POOL_URL if IS_PRODUCTION and DATABASE_POOL_URL else DATABASE_URL

_DB_URL = _raw_url
if _DB_URL and _DB_URL.startswith("postgresql://"):
    _DB_URL = _DB_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

_is_sqlite = False

if not _DB_URL:
    logger.warning(
        "DATABASE_URL is missing. Falling back to in-memory SQLite "
        "(requires aiosqlite; pgvector features will NOT work)."
    )
    _DB_URL = "sqlite+aiosqlite:///:memory:"
    _is_sqlite = True
elif _DB_URL.startswith("sqlite"):
    _is_sqlite = True

# PERF-01: When using PgBouncer (transaction-mode pooler) the driver must NOT
# maintain its own pool — PgBouncer is the pool.  Set pool_size=1, max_overflow=0
# so asyncpg opens exactly one connection per worker (PgBouncer multiplexes them).
# In development the full configurable pool is used.
_engine_kwargs: dict = {"echo": False, "pool_pre_ping": True}
if not _is_sqlite:
    _use_pgbouncer = IS_PRODUCTION and DATABASE_POOL_URL and DATABASE_POOL_URL != DATABASE_URL
    if _use_pgbouncer:
        # PgBouncer transaction-mode: one connection per Gunicorn worker
        _engine_kwargs["pool_size"] = 1
        _engine_kwargs["max_overflow"] = 0
        _engine_kwargs["pool_timeout"] = 30.0
        _engine_kwargs["pool_recycle"] = int(os.getenv("DB_POOL_RECYCLE", "300"))
    else:
        # Direct connection: let SQLAlchemy manage the pool
        _engine_kwargs["pool_size"] = int(os.getenv("DB_POOL_SIZE", "5"))
        _engine_kwargs["max_overflow"] = int(os.getenv("DB_MAX_OVERFLOW", "10"))
        _engine_kwargs["pool_timeout"] = float(os.getenv("DB_POOL_TIMEOUT", "30"))
        _engine_kwargs["pool_recycle"] = int(os.getenv("DB_POOL_RECYCLE", "300"))

engine = create_async_engine(_DB_URL, **_engine_kwargs)

if _is_sqlite:

    @event.listens_for(engine.sync_engine, "connect")
    def _set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
        dbapi_conn.create_function("cosine_distance", 2, _sqlite_cosine_distance)


AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)

Base = declarative_base()


async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for injecting SQLAlchemy AsyncSession."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception as e:
            logger.error(f"Database session error: {e}")
            await session.rollback()
            raise
        finally:
            await session.close()

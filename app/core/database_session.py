import logging
import os
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base

from app.core.config import DATABASE_POOL_URL, DATABASE_URL, IS_PRODUCTION

logger = logging.getLogger("anuvaad")

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
        _engine_kwargs["pool_size"]    = 1
        _engine_kwargs["max_overflow"] = 0
        _engine_kwargs["pool_timeout"] = 30.0
        _engine_kwargs["pool_recycle"] = 1800
    else:
        # Direct connection: let SQLAlchemy manage the pool
        _engine_kwargs["pool_size"]    = int(os.getenv("DB_POOL_SIZE",      "20"))
        _engine_kwargs["max_overflow"] = int(os.getenv("DB_MAX_OVERFLOW",   "10"))
        _engine_kwargs["pool_timeout"] = float(os.getenv("DB_POOL_TIMEOUT", "30"))
        _engine_kwargs["pool_recycle"] = int(os.getenv("DB_POOL_RECYCLE",   "1800"))

engine = create_async_engine(_DB_URL, **_engine_kwargs)

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

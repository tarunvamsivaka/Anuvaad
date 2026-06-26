import os
import logging
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from typing import AsyncGenerator
from app.core.config import DATABASE_URL

logger = logging.getLogger("anuvaad")

_DB_URL = DATABASE_URL
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

# pool_size / max_overflow are asyncpg-specific — SQLite uses StaticPool and
# does not accept those kwargs (raises an ArgumentError at startup).
# M-6: All pool parameters are now env-var configurable for production tuning.
_engine_kwargs: dict = {"echo": False, "pool_pre_ping": True}
if not _is_sqlite:
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

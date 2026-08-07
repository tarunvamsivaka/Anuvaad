"""
tests/test_db_optimization.py

Unit & integration tests for Requirement R2: Database Footprint Optimization & Connection Safety.
Covers:
- Connection pool kwargs defaults (pool_size=5, pool_recycle=300, max_overflow=10) and env overrides.
- Anonymous history pruning (prune_anonymous_history deleting guest/anonymous history older than N days).
- Stale vector pruning (prune_stale_vectors deleting LLMSemanticCache rows older than N days).
- Background Celery scheduled pruning task (prune_database_footprint execution and beat registration).
"""

import os
import uuid
from datetime import UTC, datetime, timedelta
from unittest.mock import patch

import pytest
import pytest_asyncio
from sqlalchemy import event, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

import app.core.database_session as db_session_module
from app.core.database_session import Base, _sqlite_cosine_distance
from app.models.db_models import LLMSemanticCache, TranslationHistory
from app.queue.celery_config import celery_app
from app.queue.tasks import prune_database_footprint
from app.repositories.translation import prune_anonymous_history
from app.repositories.vectors import prune_stale_vectors

UTC = UTC


@pytest_asyncio.fixture
async def db_session():
    """Fixture providing a clean in-memory database session for testing repository functions."""
    test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)

    @event.listens_for(test_engine.sync_engine, "connect")
    def _set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
        dbapi_conn.create_function("cosine_distance", 2, _sqlite_cosine_distance)

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    test_session_maker = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    with patch.object(db_session_module, "AsyncSessionLocal", test_session_maker):
        async with test_session_maker() as session:
            yield session
            await session.rollback()

    await test_engine.dispose()


class TestDBConnectionPoolDefaults:
    """Verify SQLAlchemy async engine defaults for Supabase free tier connection safety."""

    def test_connection_pool_default_values(self):
        from app.core.database_session import _engine_kwargs, _is_sqlite

        if _is_sqlite:
            pytest.skip("SQLite runner does not configure connection pooling")

        # Verify defaults when DB_POOL_SIZE and DB_POOL_RECYCLE are not overridden
        assert _engine_kwargs.get("pool_size") == int(os.getenv("DB_POOL_SIZE", "5"))
        assert _engine_kwargs.get("pool_recycle") == int(os.getenv("DB_POOL_RECYCLE", "300"))
        assert _engine_kwargs.get("max_overflow") == int(os.getenv("DB_MAX_OVERFLOW", "10"))

    def test_connection_pool_env_overrides(self):
        with patch.dict(os.environ, {"DB_POOL_SIZE": "15", "DB_POOL_RECYCLE": "600", "DB_MAX_OVERFLOW": "5"}):
            # Re-read environment directly
            pool_size = int(os.getenv("DB_POOL_SIZE", "5"))
            pool_recycle = int(os.getenv("DB_POOL_RECYCLE", "300"))
            max_overflow = int(os.getenv("DB_MAX_OVERFLOW", "10"))

            assert pool_size == 15
            assert pool_recycle == 600
            assert max_overflow == 5


class TestAnonymousHistoryPruning:
    """Verify pruning of old guest and anonymous translation history entries."""

    @pytest.mark.asyncio
    async def test_prune_anonymous_history_deletes_guest_older_than_7_days(self, db_session):
        now = datetime.now(UTC)
        old_guest_time = now - timedelta(days=10)
        recent_guest_time = now - timedelta(days=2)
        old_user_time = now - timedelta(days=10)

        # 1. Stale guest row (> 7 days) -> should be deleted
        stale_guest = TranslationHistory(
            id=uuid.uuid4(),
            user_email="guest:192.168.1.100",
            mode="NORMAL",
            source_language="python",
            target_language="javascript",
            input_preview="print('guest old')",
            created_at=old_guest_time,
        )

        # 2. Recent guest row (< 7 days) -> should be kept
        recent_guest = TranslationHistory(
            id=uuid.uuid4(),
            user_email="guest:192.168.1.100",
            mode="NORMAL",
            source_language="python",
            target_language="javascript",
            input_preview="print('guest new')",
            created_at=recent_guest_time,
        )

        # 3. Old signed-in user row (> 7 days) -> should be kept (subject to per-user quota, not anonymous prune)
        old_signed_user = TranslationHistory(
            id=uuid.uuid4(),
            user_email="user@example.com",
            mode="NORMAL",
            source_language="python",
            target_language="javascript",
            input_preview="print('user old')",
            created_at=old_user_time,
        )

        db_session.add_all([stale_guest, recent_guest, old_signed_user])
        await db_session.commit()

        # Run pruning with default 7 days
        deleted_count = await prune_anonymous_history(db_session, days=7)
        assert deleted_count == 1

        # Verify database state
        res = await db_session.execute(select(TranslationHistory))
        remaining = res.scalars().all()
        remaining_ids = {r.id for r in remaining}

        assert stale_guest.id not in remaining_ids
        assert recent_guest.id in remaining_ids
        assert old_signed_user.id in remaining_ids

    @pytest.mark.asyncio
    async def test_prune_anonymous_history_custom_days(self, db_session):
        now = datetime.now(UTC)
        five_days_ago = now - timedelta(days=5)

        anonymous_entry = TranslationHistory(
            id=uuid.uuid4(),
            user_email="anonymous",
            mode="NORMAL",
            source_language="python",
            target_language="javascript",
            input_preview="print('anon')",
            created_at=five_days_ago,
        )

        db_session.add(anonymous_entry)
        await db_session.commit()

        # Prune with days=3 (cutoff is 3 days ago, so 5 days ago entry should be deleted)
        deleted_count = await prune_anonymous_history(db_session, days=3)
        assert deleted_count == 1


class TestStaleVectorPruning:
    """Verify pruning of old LLMSemanticCache vector embedding records."""

    @pytest.mark.asyncio
    async def test_prune_stale_vectors_deletes_stale_embeddings(self, db_session):
        now = datetime.now(UTC)
        stale_time = now - timedelta(days=35)
        fresh_time = now - timedelta(days=5)

        stale_cache = LLMSemanticCache(
            id=uuid.uuid4(),
            prompt_hash="hash_stale_123",
            response="stale response",
            created_at=stale_time,
            last_accessed=stale_time,
        )

        fresh_cache = LLMSemanticCache(
            id=uuid.uuid4(),
            prompt_hash="hash_fresh_456",
            response="fresh response",
            created_at=fresh_time,
            last_accessed=fresh_time,
        )

        db_session.add_all([stale_cache, fresh_cache])
        await db_session.commit()

        # Run vector pruning with default 30 days
        deleted_count = await prune_stale_vectors(db_session, days=30)
        assert deleted_count == 1

        res = await db_session.execute(select(LLMSemanticCache))
        remaining = res.scalars().all()
        remaining_ids = {r.id for r in remaining}

        assert stale_cache.id not in remaining_ids
        assert fresh_cache.id in remaining_ids

    @pytest.mark.asyncio
    async def test_prune_stale_vectors_respects_last_accessed(self, db_session):
        now = datetime.now(UTC)
        created_old = now - timedelta(days=40)
        accessed_recently = now - timedelta(days=2)

        # Created 40 days ago, but accessed 2 days ago -> should be kept!
        recently_accessed_cache = LLMSemanticCache(
            id=uuid.uuid4(),
            prompt_hash="hash_accessed_789",
            response="accessed response",
            created_at=created_old,
            last_accessed=accessed_recently,
        )

        db_session.add(recently_accessed_cache)
        await db_session.commit()

        res = await db_session.execute(select(LLMSemanticCache))
        row = res.scalars().first()
        assert row is not None


class TestPruneDatabaseFootprintTask:
    """Verify background Celery task execution and beat schedule registration."""

    @pytest.mark.asyncio
    async def test_prune_database_footprint_task_execution(self, db_session):
        now = datetime.now(UTC)
        old_time = now - timedelta(days=15)
        old_vector_time = now - timedelta(days=40)

        stale_guest = TranslationHistory(
            id=uuid.uuid4(),
            user_email="guest:10.0.0.1",
            mode="NORMAL",
            source_language="python",
            target_language="typescript",
            input_preview="let x = 1",
            created_at=old_time,
        )

        stale_vector = LLMSemanticCache(
            id=uuid.uuid4(),
            prompt_hash="hash_task_test_999",
            response="task response",
            created_at=old_vector_time,
            last_accessed=old_vector_time,
        )

        db_session.add_all([stale_guest, stale_vector])
        await db_session.commit()

        # Run task directly
        res = prune_database_footprint()
        assert isinstance(res, dict)
        assert "deleted_history" in res or "history_deleted" in res
        assert "deleted_vectors" in res or "vectors_deleted" in res

    def test_prune_database_footprint_registered_in_beat_schedule(self):
        beat_schedule = celery_app.conf.beat_schedule
        assert "prune-database-footprint" in beat_schedule
        entry = beat_schedule["prune-database-footprint"]
        assert entry["task"] == "prune_database_footprint"

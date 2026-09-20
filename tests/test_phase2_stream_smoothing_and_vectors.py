import asyncio
import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from pgvector.sqlalchemy import HALFVEC
from sqlalchemy import create_engine, select

from app.core.database_session import Base
from app.models.db_models import LLMSemanticCache, RepoEmbedding, SemanticArtifact
from app.models.schemas import CodePayload
from app.services.ai import (
    get_stream_semaphore,
    smooth_stream_chunks,
    stream_code_to_english,
)


class MockChunk:
    """Helper to mock OpenAI/Groq streaming chunk deltas."""

    def __init__(self, content):
        self.choices = [MagicMock(delta=MagicMock(content=content))]


class TestStreamSmoothingBuffer:
    @pytest.mark.asyncio
    async def test_token_threshold_aggregation(self):
        """Verify rapid individual tokens are aggregated up to the token threshold (5)."""

        async def token_generator():
            for i in range(12):
                yield MockChunk(f"t{i}")

        chunks = []
        async for batch in smooth_stream_chunks(token_generator(), time_window=1.0, token_threshold=5):
            chunks.append(batch)

        # 12 tokens with threshold 5 should yield 3 batches: 5 tokens, 5 tokens, and 2 tokens tail
        assert len(chunks) == 3
        assert chunks[0] == "t0t1t2t3t4"
        assert chunks[1] == "t5t6t7t8t9"
        assert chunks[2] == "t10t11"

        # Content fidelity: complete text is identical
        assert "".join(chunks) == "".join(f"t{i}" for i in range(12))

    @pytest.mark.asyncio
    async def test_time_window_flush_on_pause(self):
        """Verify tokens are flushed if a temporal window (25ms) passes even if below threshold."""

        async def slow_generator():
            yield MockChunk("first")
            yield MockChunk("second")
            await asyncio.sleep(0.04)  # Exceeds 25ms window
            yield MockChunk("third")

        chunks = []
        async for batch in smooth_stream_chunks(slow_generator(), time_window=0.025, token_threshold=10):
            chunks.append(batch)

        # 'first' and 'second' should flush due to 40ms pause before 'third'
        assert len(chunks) >= 2
        assert "firstsecond" in chunks[0]
        assert "".join(chunks) == "firstsecondthird"

    @pytest.mark.asyncio
    async def test_tail_flush_preserves_all_content(self):
        """Verify stream termination immediately flushes all trailing tokens."""

        async def short_generator():
            yield MockChunk("a")
            yield MockChunk("b")

        chunks = []
        async for batch in smooth_stream_chunks(short_generator(), time_window=10.0, token_threshold=10):
            chunks.append(batch)

        assert len(chunks) == 1
        assert chunks[0] == "ab"


class TestStreamConcurrencyBackpressure:
    @pytest.mark.asyncio
    async def test_stream_semaphore_concurrency_limit(self):
        """Verify get_stream_semaphore limits concurrent execution to MAX_CONCURRENT_STREAMS."""
        sem = get_stream_semaphore()
        initial_value = sem._value

        active_count = 0
        max_seen = 0

        async def worker():
            nonlocal active_count, max_seen
            async with sem:
                active_count += 1
                if active_count > max_seen:
                    max_seen = active_count
                await asyncio.sleep(0.05)
                active_count -= 1

        # Run 25 concurrent worker tasks against the semaphore
        await asyncio.gather(*(worker() for _ in range(25)))
        assert max_seen <= initial_value
        assert sem._value == initial_value

    def test_worker_concurrency_partitioning(self):
        """Verify concurrency limit is partitioned across Uvicorn workers."""
        from app.core.config import MAX_CONCURRENT_STREAMS, WEB_CONCURRENCY, WORKER_CONCURRENT_STREAMS

        expected = max(1, MAX_CONCURRENT_STREAMS // max(1, WEB_CONCURRENCY))
        assert WORKER_CONCURRENT_STREAMS == expected

    @pytest.mark.asyncio
    async def test_stream_timeout_backpressure_rejection(self):
        """Verify saturated streams fail fast with backpressure error instead of deadlocking."""
        sem = get_stream_semaphore()
        # Acquire all permits
        permits = []
        for _ in range(sem._value):
            await sem.acquire()
            permits.append(True)

        try:
            payload = CodePayload(raw_code="print('backpressure')", language="python")
            with (
                patch("app.core.config.STREAM_ACQUIRE_TIMEOUT", 0.05),
                patch("app.services.ai.cache.get", new_callable=AsyncMock, return_value=None),
            ):
                events = []
                async for line in stream_code_to_english(
                    payload=payload,
                    email=None,
                    is_pro=False,
                    use_r1=False,
                    tier="free",
                ):
                    if line.startswith("data: "):
                        events.append(json.loads(line[6:].strip()))

                assert len(events) == 1
                assert "error" in events[0]
                assert "maximum capacity" in events[0]["error"]
                assert events[0]["done"] is True
        finally:
            for _ in permits:
                sem.release()

    def test_ivfflat_probes_config(self):
        """Verify IVFFLAT_PROBES configuration is active and defaults to 10."""
        from app.core.config import IVFFLAT_PROBES

        assert IVFFLAT_PROBES >= 10


class TestHalfvecVectorModels:
    def test_model_columns_configured_as_halfvec(self):
        """Verify db_models vector columns are configured with HALFVEC(1536)."""
        assert isinstance(LLMSemanticCache.embedding.type, HALFVEC)
        assert LLMSemanticCache.embedding.type.dim == 1536

        assert isinstance(RepoEmbedding.embedding.type, HALFVEC)
        assert RepoEmbedding.embedding.type.dim == 1536

        assert isinstance(SemanticArtifact.embedding.type, HALFVEC)
        assert SemanticArtifact.embedding.type.dim == 1536

    def test_sqlite_ddl_and_crud_compatibility(self):
        """Verify HALFVEC models create tables and execute queries cleanly in SQLite."""
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(engine, tables=[RepoEmbedding.__table__])

        with engine.connect() as conn:
            # Insert record with vector
            conn.execute(
                RepoEmbedding.__table__.insert().values(
                    repository_name="owner/repo",
                    file_path="main.py",
                    chunk_index=0,
                    content="def hello(): pass",
                    embedding=[0.5] * 1536,
                    provider="openai",
                )
            )
            conn.commit()

            result = conn.execute(
                select(RepoEmbedding.repository_name, RepoEmbedding.embedding).where(
                    RepoEmbedding.repository_name == "owner/repo"
                )
            ).fetchone()

            assert result is not None
            assert result[0] == "owner/repo"
            assert len(result[1]) == 1536


class TestSmoothStreamEndToEnd:
    @pytest.mark.asyncio
    async def test_stream_code_to_english_with_smoothing(self):
        """Verify stream_code_to_english emits valid smoothed SSE packets and done event."""
        # Simulated JSON tokens emitted by LLM
        tokens = [
            '{"id":',
            ' "block_1",',
            ' "code_snippet":',
            ' "print(1)",',
            ' "english_translation":',
            ' "Prints one"}',
        ]

        async def mock_stream():
            for tok in tokens:
                yield MockChunk(tok)

        mock_client = MagicMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_stream())

        payload = CodePayload(raw_code="print(1)", language="python")

        with (
            patch("app.services.ai._get_groq_client", return_value=mock_client),
            patch("app.services.ai._get_openrouter_client", return_value=None),
            patch("app.services.ai.check_and_track_groq_limits", new_callable=AsyncMock),
            patch("app.services.ai.cache.get", new_callable=AsyncMock, return_value=None),
            patch("app.services.ai.cache.put", new_callable=AsyncMock),
        ):
            events = []
            async for sse_line in stream_code_to_english(
                payload=payload,
                email=None,
                is_pro=False,
                use_r1=False,
                tier="free",
            ):
                if sse_line.startswith("data: "):
                    events.append(json.loads(sse_line[6:].strip()))

        # Verify events
        assert len(events) >= 2
        chunk_events = [e for e in events if not e.get("done")]
        done_events = [e for e in events if e.get("done")]

        assert len(done_events) == 1
        assert "blocks" in done_events[0]
        # Smoothed chunk events should be fewer than raw 6 token inputs due to buffering
        assert len(chunk_events) <= len(tokens)

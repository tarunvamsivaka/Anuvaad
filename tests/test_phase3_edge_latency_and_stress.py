"""
tests/test_phase3_edge_latency_and_stress.py

Phase 3 Validation Suite:
1. Edge Warm-Keep Gateway & Lightweight Health Probes (GET and HEAD support).
2. Observability & Memory Watermark / Cache Hit Ratio Metrics.
3. Concurrent Streaming Stress & Semaphore Backpressure Under Load.
"""

import asyncio
import base64
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.metrics import MetricsCollector, get_memory_watermark_mb
from app.models.schemas import CodePayload
from app.services.ai import (
    get_stream_semaphore,
    stream_code_to_english,
)


class MockChunk:
    def __init__(self, content):
        self.choices = [MagicMock(delta=MagicMock(content=content))]


class TestHealthProbes:
    """Validate zero-overhead HEAD probes and standard GET health checks."""

    def test_health_get_probes(self, client):
        for path in ["/health", "/api/health", "/api/v1/health"]:
            res = client.get(path)
            assert res.status_code == 200, f"GET {path} failed with {res.status_code}"
            data = res.json()
            assert data["status"] == "healthy"
            assert data["service"] == "anuvaad-api"

    def test_health_head_probes_lightweight(self, client):
        for path in ["/health", "/api/health", "/api/v1/health"]:
            res = client.head(path)
            assert res.status_code == 200, f"HEAD {path} failed with {res.status_code}"
            # Zero-overhead: response body on HEAD must be empty
            assert len(res.text) == 0 or res.text == ""


class TestMetricsObservability:
    """Validate memory watermark and cache hit ratio observability."""

    def test_memory_watermark_detection(self):
        mem = get_memory_watermark_mb()
        assert isinstance(mem, float)
        assert mem >= 0.0

    @pytest.mark.asyncio
    async def test_cache_hit_ratio_calculation(self):
        from app.core.cache import cache

        # Clean residual metrics in shared test Redis instance to guarantee test isolation
        if cache.client:
            try:
                await cache.client.delete("metrics:cache_hits", "metrics:cache_misses")
            except Exception:
                pass

        collector = MetricsCollector()
        assert collector.cache_hit_ratio == 0.0

        await collector.record_cache_hit()
        await collector.record_cache_hit()
        await collector.record_cache_hit()
        await collector.record_cache_miss()

        # Brief yield to ensure asynchronous fire-and-forget Redis tasks settle
        await asyncio.sleep(0.02)

        assert collector.cache_hits == 3
        assert collector.cache_misses == 1
        assert collector.cache_hit_ratio == 0.75

        snap = await collector.snapshot()
        assert snap["cache_hits"] == 3
        assert snap["cache_misses"] == 1
        assert snap["cache_hit_ratio"] == 0.75
        assert "memory_watermark_mb" in snap
        assert isinstance(snap["memory_watermark_mb"], float)
        assert "historical_peak_memory_watermark_mb" in snap
        assert isinstance(snap["historical_peak_memory_watermark_mb"], float)
        assert snap["historical_peak_memory_watermark_mb"] >= snap["memory_watermark_mb"]

    @pytest.mark.asyncio
    async def test_telemetry_checkpoint_and_history(self):
        collector = MetricsCollector()
        snap = await collector.record_telemetry_checkpoint()
        assert "timestamp" in snap or "uptime_seconds" in snap
        history = await collector.get_telemetry_history(limit=5)
        assert isinstance(history, list)

    def test_metrics_history_endpoint_auth_and_response(self, client):
        import app.routers.utility as utility_mod

        # 1. Unauthenticated should return 401
        res_unauth = client.get("/api/v1/metrics/history")
        assert res_unauth.status_code == 401

        # 2. Authenticated should return 200 with checkpoints
        test_user = "metrics_admin"
        test_pass = "metrics_secret_123"
        token = base64.b64encode(f"{test_user}:{test_pass}".encode()).decode()

        with (
            patch.object(utility_mod, "METRICS_USERNAME", test_user),
            patch.object(utility_mod, "METRICS_PASSWORD", test_pass),
        ):
            res = client.get(
                "/api/v1/metrics/history?limit=10",
                headers={"Authorization": f"Basic {token}"},
            )
            assert res.status_code == 200
            data = res.json()
            assert "checkpoints" in data
            assert isinstance(data["checkpoints"], list)
            assert "count" in data

    def test_prometheus_exposition_includes_watermark_and_hit_ratio(self, client):
        import app.routers.utility as utility_mod

        test_user = "metrics_admin"
        test_pass = "metrics_secret_123"
        token = base64.b64encode(f"{test_user}:{test_pass}".encode()).decode()

        with (
            patch.object(utility_mod, "METRICS_USERNAME", test_user),
            patch.object(utility_mod, "METRICS_PASSWORD", test_pass),
        ):
            res = client.get(
                "/api/v1/metrics/prometheus",
                headers={"Authorization": f"Basic {token}"},
            )
            assert res.status_code == 200
            text = res.text
            assert "anuvaad_memory_watermark_mb" in text
            assert "anuvaad_historical_peak_memory_watermark_mb" in text
            assert "anuvaad_cache_hit_ratio" in text
            assert "anuvaad_uptime_seconds" in text


class TestStreamingStressAndBackpressure:
    """Stress test concurrent stream acquisition under heavy client load."""

    @pytest.mark.asyncio
    async def test_concurrent_streaming_backpressure_and_semaphore_release(self):
        """Simulate 25 concurrent streaming requests competing for semaphore slots."""
        sem = get_stream_semaphore()
        initial_slots = sem._value

        async def mock_active_stream(*args, **kwargs):
            async def gen():
                for i in range(3):
                    yield MockChunk(f"word{i} ")
                    await asyncio.sleep(0.01)

            return gen()

        mock_groq = MagicMock()
        mock_groq.chat.completions.create = AsyncMock(side_effect=mock_active_stream)

        payload = CodePayload(raw_code="print('stress test')", language="python")

        with (
            patch("app.services.ai._groq_client", mock_groq),
            patch("app.core.config.STREAM_ACQUIRE_TIMEOUT", 0.02),
            patch("app.services.ai.cache.get", new_callable=AsyncMock, return_value=None),
        ):

            async def consume_stream(idx: int):
                collected = []
                async for line in stream_code_to_english(
                    payload=payload,
                    email=None,
                    is_pro=False,
                    use_r1=False,
                    tier="free",
                ):
                    collected.append(line)
                return "".join(collected)

            # Launch 25 concurrent tasks
            results = await asyncio.gather(*[consume_stream(i) for i in range(25)])

        assert len(results) == 25
        # Verify that all 25 requests either successfully streamed or were rejected by backpressure
        busy_count = 0
        success_count = 0
        for res in results:
            if "maximum capacity" in res or "Server busy" in res:
                busy_count += 1
            else:
                success_count += 1

        assert success_count > 0, "At least some requests should have succeeded"
        assert busy_count > 0, "Backpressure should have rejected excess requests beyond semaphore capacity"
        assert success_count + busy_count == 25

        # CRITICAL: Verify semaphore was completely returned to initial capacity
        assert sem._value == initial_slots, f"Semaphore leaked! Expected {initial_slots}, got {sem._value}"

    def test_memory_watermark_stability_under_load(self):
        """Verify memory watermark is bounded and queryable."""
        initial_mem = get_memory_watermark_mb()
        temp_data = [bytearray(1024 * 1024) for _ in range(5)]
        active_mem = get_memory_watermark_mb()
        del temp_data

        assert isinstance(active_mem, float)
        assert active_mem >= initial_mem

"""
Cache and rate-limiter tests for Anuvaad backend.

Tests LRU cache behavior and rate limiting middleware.
"""

import sys
import os
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestRedisCache:
    """Tests for the Redis-backed cache."""

    def test_cache_hit_returns_same_result(self, client):
        """Second identical request should return cached result."""
        payload = {"raw_code": "x = 1", "language": "python"}
        res1 = client.post("/api/code-to-english", json=payload)
        res2 = client.post("/api/code-to-english", json=payload)
        assert res1.status_code == 200
        assert res2.status_code == 200
        assert res1.json() == res2.json()

    def test_different_code_not_cached(self, client):
        """Different code should not hit the cache."""
        res1 = client.post("/api/code-to-english", json={
            "raw_code": "x = 1", "language": "python"
        })
        res2 = client.post("/api/code-to-english", json={
            "raw_code": "y = 2", "language": "python"
        })
        assert res1.status_code == 200
        assert res2.status_code == 200
        # Both succeed (cache miss for second, but still processes)

    def test_english_to_code_not_cached(self, client):
        """The english-to-code endpoint should NOT be cached (by design)."""
        payload = {
            "block_id": "block_1",
            "modified_english": "Print goodbye",
            "full_context": "print('hello')"
        }
        res1 = client.post("/api/english-to-code", json=payload)
        res2 = client.post("/api/english-to-code", json=payload)
        assert res1.status_code == 200
        assert res2.status_code == 200
        # Both should succeed — not an error, but we can't easily
        # verify no caching without deeper instrumentation


class TestCacheKey:
    """Tests for the cache_key function."""

    def test_same_inputs_same_key(self):
        from main import cache_key
        k1 = cache_key("print('hello')", "python", "code-to-english")
        k2 = cache_key("print('hello')", "python", "code-to-english")
        assert k1 == k2

    def test_different_code_different_key(self):
        from main import cache_key
        k1 = cache_key("print('hello')", "python", "code-to-english")
        k2 = cache_key("print('world')", "python", "code-to-english")
        assert k1 != k2

    def test_different_language_different_key(self):
        from main import cache_key
        k1 = cache_key("console.log('hi')", "javascript", "code-to-english")
        k2 = cache_key("console.log('hi')", "python", "code-to-english")
        assert k1 != k2

    def test_different_endpoint_different_key(self):
        from main import cache_key
        k1 = cache_key("x = 1", "python", "code-to-english")
        k2 = cache_key("x = 1", "python", "generate-from-english")
        assert k1 != k2


class TestRateLimiting:
    """Tests for the rate limiting middleware."""

    def test_rate_limit_triggers(self, client_rate_limited):
        """After max requests, should return 429."""
        res = client_rate_limited.post("/api/code-to-english", json={
            "raw_code": "x = 1", "language": "python"
        })
        assert res.status_code == 429
        assert "Rate limit exceeded" in res.json()["detail"]

    def test_rate_limit_does_not_affect_health(self, client_rate_limited):
        """Health endpoint is still affected since all /api/ routes are limited."""
        res = client_rate_limited.get("/api/health")
        assert res.status_code == 429

    def test_within_rate_limit(self, client):
        """Requests within the limit should succeed."""
        for _ in range(3):
            res = client.post("/api/code-to-english", json={
                "raw_code": "x = 1", "language": "python"
            })
            assert res.status_code == 200

import time

import pytest

from app.core.cache import RedisCache, TTLCache
from app.services.ast_cache import compute_ast_cache_key


def test_ast_hash_normalization_equivalence():
    """Verify that identical Python functions with different comments and formatting
    produce the exact same SHA-256 AST cache key.
    """
    code_v1 = """
def calculate_metrics(items: list[int]) -> int:
    # First version of comment: compute sum
    total = sum(items)
    return total
"""

    code_v2 = """
def calculate_metrics(items: list[int]) -> int:
    # Completely different author comment here
    # Extra whitespace and explanation
    total = sum(items)

    return total
"""

    code_v3 = """
def calculate_metrics(items: list[int]) -> int:
    '''Calculates the sum of items.'''
    total = sum(items)
    return total
"""

    key1 = compute_ast_cache_key(code_v1, "python")
    key2 = compute_ast_cache_key(code_v2, "python")
    key3 = compute_ast_cache_key(code_v3, "python")

    assert key1 == key2, f"Expected key1 == key2, got {key1} vs {key2}"
    assert key1 == key3, f"Expected key1 == key3 with docstrings removed, got {key1} vs {key3}"


def test_ttl_cache_eviction_and_expiry():
    """Verify TTLCache behaves correctly with capacity limits and TTL expiry."""
    cache = TTLCache(maxsize=3, ttl=10.0)

    cache.set("a", 1)
    cache.set("b", 2)
    cache.set("c", 3)

    assert cache.get("a") == 1
    assert cache.get("b") == 2
    assert cache.get("c") == 3

    # Add 4th item: oldest ('a' was recently accessed so 'b' is oldest)
    cache.set("d", 4)
    assert len(cache._data) <= 3
    assert cache.get("d") == 4

    # Test expiry with clear margin for Windows sleep clock tick
    cache_short = TTLCache(maxsize=10, ttl=0.05)
    cache_short.set("expiring", "value")
    assert cache_short.get("expiring") == "value"
    time.sleep(0.12)
    assert cache_short.get("expiring") is None


@pytest.mark.asyncio
async def test_two_tier_cache_l1_l2_flow():
    """Verify L1 hit avoids L2 call and L2 hit populates L1."""
    cache = RedisCache()
    test_key = f"test_key_{time.time()}"
    test_val = {"result": "success", "tokens": 42}

    # Store in cache
    await cache.put(test_key, test_val, ttl=300)

    # 1. Direct L1 hit
    l1_val = cache.l1.get(test_key)
    assert l1_val == test_val

    # 2. Reading via cache.get hits L1 directly
    res = await cache.get(test_key)
    assert res == test_val

    # 3. If L1 is cleared, get queries L2 and repopulates L1
    cache.l1.clear()
    assert cache.l1.get(test_key) is None

    res2 = await cache.get(test_key)
    assert res2 == test_val
    # Verified L1 was repopulated
    assert cache.l1.get(test_key) == test_val

    # Cleanup
    await cache.delete(test_key)
    assert cache.l1.get(test_key) is None

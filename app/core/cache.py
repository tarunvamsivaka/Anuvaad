import os
import json
import hashlib
import time
import collections
import threading
from app.core.config import logger

class LRUCache:
    def __init__(self, max_size: int = None):
        self.cache = collections.OrderedDict()
        self.max_size = max_size if max_size is not None else int(os.getenv("CACHE_LRU_MAX_SIZE", "100"))
        self.hits = 0
        self.misses = 0
        self.lock = threading.Lock()

    def get(self, key: str):
        with self.lock:
            if key in self.cache:
                val, expires_at = self.cache[key]
                if expires_at is not None and time.time() > expires_at:
                    del self.cache[key]
                    self.misses += 1
                    return None
                self.cache.move_to_end(key)
                self.hits += 1
                return val
            self.misses += 1
            return None

    def set(self, key: str, value: any, ttl: int = None):
        with self.lock:
            expires_at = time.time() + ttl if ttl is not None else None
            self.cache[key] = (value, expires_at)
            self.cache.move_to_end(key)
            if len(self.cache) > self.max_size:
                self.cache.popitem(last=False)

    def stats(self):
        with self.lock:
            total = self.hits + self.misses
            hit_rate = (self.hits / total) if total > 0 else 0.0
            return {
                "size": len(self.cache),
                "max_size": self.max_size,
                "hit_rate": hit_rate,
                "hits": self.hits,
                "misses": self.misses,
            }

    def delete(self, key: str):
        with self.lock:
            if key in self.cache:
                del self.cache[key]


class RedisCache:
    """Unified cache and rate-limiter backed by Redis."""

    def __init__(self):
        self.client = None
        self._backend = "memory"

        # Priority 1: Standard Redis via REDIS_URL
        redis_url = os.environ.get("REDIS_URL")
        if redis_url:
            try:
                import redis.asyncio as aioredis
                self.client = aioredis.from_url(redis_url, decode_responses=True)
                self._backend = "redis"
            except Exception as e:
                logger.warning(f"Failed to connect to Redis via REDIS_URL: {e}")

        # Priority 2: Upstash REST (serverless fallback)
        if not self.client:
            url = os.environ.get("UPSTASH_REDIS_URL")
            token = os.environ.get("UPSTASH_REDIS_TOKEN")
            if url and token:
                try:
                    from upstash_redis.asyncio import Redis
                    self.client = Redis(url=url, token=token)
                    self._backend = "upstash"
                except Exception as e:
                    logger.warning(f"Failed to initialize Upstash Redis: {e}")

        # Fallback: in-memory LRU
        self.fallback = LRUCache()

        if self.client:
            logger.info(f"Redis cache initialized (backend: {self._backend})")
        elif os.getenv("ENV", "development").lower() == "production":
            logger.warning(
                "⚠ PRODUCTION: No Redis configured — using in-memory LRU fallback. "
                "Rate limiting will not persist across restarts or workers. "
                "Set REDIS_URL or UPSTASH_REDIS_URL/UPSTASH_REDIS_TOKEN."
            )
        else:
            logger.info("Redis not configured — using in-memory LRU (development mode)")

    async def get(self, key: str):
        if self.client:
            try:
                val = await self.client.get(key)
                if val is not None:
                    if isinstance(val, str):
                        return json.loads(val)
                    return val
            except Exception as e:
                logger.error(f"Redis get error: {e}")
        return self.fallback.get(key)

    async def put(self, key: str, value: any, ttl: int = 86400):
        if self.client:
            try:
                # Upstash redis client requires setex parameters in correct order or standard set
                if self._backend == "upstash":
                    await self.client.set(key, json.dumps(value), ex=ttl)
                else:
                    await self.client.setex(key, ttl, json.dumps(value))
                return
            except Exception as e:
                logger.error(f"Redis put error: {e}")
        self.fallback.set(key, value, ttl)

    async def delete(self, key: str):
        if self.client:
            try:
                await self.client.delete(key)
            except Exception as e:
                logger.error(f"Redis delete error: {e}")
        self.fallback.delete(key)

    async def delete_prefix(self, prefix: str):
        if self.client:
            try:
                keys = await self.client.keys(prefix + "*")
                if keys:
                    await self.client.delete(*keys)
            except Exception as e:
                logger.error(f"Redis delete_prefix error: {e}")
        with self.fallback.lock:
            to_del = [k for k in self.fallback.cache.keys() if k.startswith(prefix)]
            for k in to_del:
                del self.fallback.cache[k]

    async def incr_rate_limit(self, key: str, window: int) -> int:
        if self.client:
            try:
                count = await self.client.incr(key)
                if count == 1:
                    await self.client.expire(key, window)
                return count
            except Exception as e:
                logger.error(f"Redis incr error: {e}")

        # In-memory fallback (dev only)
        val = self.fallback.get(key) or 0
        val += 1
        self.fallback.set(key, val, window)
        return val

    async def ping(self):
        if self.client:
            if self._backend == "redis":
                return await self.client.ping()
            else:
                await self.client.get("health_ping")
                return True
        return False


class CacheProxy:
    def __init__(self, target):
        self._target = target

    def __getattr__(self, name):
        import sys
        main_mod = sys.modules.get("main")
        if main_mod:
            main_cache = getattr(main_mod, "cache", None)
            if main_cache is not None and main_cache is not self:
                return getattr(main_cache, name)
        return getattr(self._target, name)

cache = CacheProxy(RedisCache())


def normalize_code_for_cache(code: str) -> str:
    if not code:
        return ""
    code = code.replace("\r\n", "\n").replace("\r", "\n")
    lines = [line.rstrip() for line in code.split("\n")]
    collapsed = []
    prev_blank = False
    for line in lines:
        if not line.strip():
            if not prev_blank:
                collapsed.append("")
                prev_blank = True
        else:
            collapsed.append(line)
            prev_blank = False
    return "\n".join(collapsed).strip()


def cache_key(code: str, language: str, endpoint: str, model: str) -> str:
    normalized = normalize_code_for_cache(code)
    prompt_version = os.getenv("PROMPT_VERSION", "v1")
    return (
        "anuvaad_cache:"
        + hashlib.sha256(
            f"{endpoint}:{language}:{normalized}:{model}:{prompt_version}".encode()
        ).hexdigest()
    )

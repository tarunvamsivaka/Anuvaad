"""
app/services/ai/__init__.py — Unified AI Translation Gateway.

Modular architecture (PERF-04):
- clients.py: LLM Client singletons and connection pooling
- prompts.py: Prompt engineering instructions and depth prefixes
- caching.py: Cache key generation, normalization, and stale recovery
- history.py: Centralized translation history task dispatcher (PERF-01)
- concurrency.py: Distributed and process-local stream concurrency control (PERF-03)
- completion.py: Non-streaming translation and AST symbol contract injection
- streaming.py: SSE streaming translation, chunk smoothing, and provider fallback
"""

from openai import AsyncOpenAI

from app.core.cache import cache
from app.core.config import logger, metrics
from app.core.quota import check_and_track_groq_limits, record_successful_completion
from app.services.ai.caching import (
    _clean_json_response,
    find_stale_translation,
    normalize_blocks,
)
from app.services.ai.clients import (
    _cerebras_client,
    _deepseek_client,
    _gemini_client,
    _get_cerebras_client,
    _get_deepseek_client,
    _get_gemini_client,
    _get_groq_client,
    _get_openrouter_client,
    _groq_client,
    _openrouter_client,
    close_clients,
    init_clients,
)
from app.services.ai.completion import (
    _inject_symbol_contract,
    get_completion,
)
from app.services.ai.concurrency import (
    acquire_stream_slot,
    acquire_stream_slot_raw,
    get_stream_semaphore,
    release_stream_slot_raw,
)
from app.services.ai.history import _dispatch_history_task
from app.services.ai.prompts import (
    DEPTH_PREFIXES,
    SYNC_SYSTEM_INSTRUCTION,
    SYSTEM_INSTRUCTION,
)
from app.services.ai.streaming import (
    _build_streaming_providers,
    smooth_stream_chunks,
    stream_code_to_code,
    stream_code_to_english,
)

__all__ = [
    "AsyncOpenAI",
    "DEPTH_PREFIXES",
    "SYNC_SYSTEM_INSTRUCTION",
    "SYSTEM_INSTRUCTION",
    "_build_streaming_providers",
    "_cerebras_client",
    "_clean_json_response",
    "_deepseek_client",
    "_dispatch_history_task",
    "_gemini_client",
    "_get_cerebras_client",
    "_get_deepseek_client",
    "_get_gemini_client",
    "_get_groq_client",
    "_get_openrouter_client",
    "_groq_client",
    "_inject_symbol_contract",
    "_openrouter_client",
    "acquire_stream_slot",
    "acquire_stream_slot_raw",
    "cache",
    "check_and_track_groq_limits",
    "close_clients",
    "find_stale_translation",
    "get_completion",
    "get_stream_semaphore",
    "init_clients",
    "logger",
    "metrics",
    "normalize_blocks",
    "record_successful_completion",
    "release_stream_slot_raw",
    "smooth_stream_chunks",
    "stream_code_to_code",
    "stream_code_to_english",
]

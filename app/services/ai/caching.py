"""
app/services/ai/caching.py — Stale translation recovery, normalization, and cache helpers.
"""

from __future__ import annotations

import asyncio
import json
import re

from app.core.cache import cache, cache_key
from app.core.config import logger

_THINK_TAGS_RE = re.compile(r"<think>.*?</think>", flags=re.DOTALL)


def _clean_json_response(text: str) -> str:
    """Strip reasoning tags (<think>...</think>) and markdown code fences (```json...```)."""
    text = text.strip()
    text = _THINK_TAGS_RE.sub("", text).strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    return text.removesuffix("```").strip()


def normalize_blocks(raw_result, model_used: str = "", tier: str = "free") -> list:
    """Ensure LLM response is a list of {id, code_snippet, english_translation, model_used, tier} dicts."""
    if isinstance(raw_result, dict):
        for key in (
            "blocks",
            "result",
            "data",
            "translations",
            "code_blocks",
            "response",
        ):
            if key in raw_result and isinstance(raw_result[key], list):
                raw_result = raw_result[key]
                break
        else:
            raw_result = [raw_result]

    if not isinstance(raw_result, list):
        raise ValueError(f"Expected list, got {type(raw_result).__name__}")

    normalized = []
    for i, block in enumerate(raw_result):
        if not isinstance(block, dict):
            continue
        translation = (
            block.get("english_translation")
            or block.get("explanation")
            or block.get("description")
            or block.get("translation")
            or block.get("text")
            or block.get("english")
            or block.get("comment")
            or ""
        )
        code = block.get("code_snippet") or block.get("code") or block.get("snippet") or ""
        block_id = block.get("id") or block.get("block_id") or f"block_{i + 1}"

        normalized.append(
            {
                "id": str(block_id),
                "code_snippet": str(code),
                "english_translation": str(translation),
                "model_used": model_used,
                "tier": tier,
            }
        )

    normalized = [b for b in normalized if b["english_translation"].strip() or b["code_snippet"].strip()]

    if not normalized:
        raise ValueError("API returned no usable translation blocks")

    return normalized


async def find_stale_translation(
    email: str | None, input_text: str, language: str, endpoint: str, mode: str
) -> list | None:
    """Attempts to retrieve a stale translation from cache or DB if LLM providers are down.
    Arch#4.6: All 4 cache keys are checked in parallel via asyncio.gather instead of
    4 sequential Redis round-trips.
    """
    models_to_try = [
        "deepseek-reasoner",
        "standard",
        "llama-3.3-70b-versatile",
        "deepseek-chat",
    ]
    keys = [cache_key(input_text, language, endpoint, m) for m in models_to_try]
    results = await asyncio.gather(*[cache.get(k) for k in keys])
    for m, cached in zip(models_to_try, results, strict=False):
        if cached:
            logger.info(f"Stale recovery: found cached translation for model {m}")
            return cached

    if email:
        input_preview = input_text[:80]
        from app.repositories import translation as translation_repo

        rows = await translation_repo.get_history(email, limit=10)
        rows = [r for r in rows if r.get("input_preview") == input_preview and r.get("mode") == mode]
        if rows:
            for row in rows:
                if isinstance(row, dict) and "blocks" in row and row["blocks"]:
                    logger.info("Stale recovery: found blocks in DB history")
                    try:
                        blocks = row["blocks"]
                        if isinstance(blocks, str):
                            blocks = json.loads(blocks)
                        if isinstance(blocks, list) and len(blocks) > 0:
                            return blocks
                    except Exception:
                        pass
    return None

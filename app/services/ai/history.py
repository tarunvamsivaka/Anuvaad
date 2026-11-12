"""
app/services/ai/history.py

Centralized translation history task dispatcher (PERF-01).
Replaces duplicate save_translation_history_task.delay() call sites across
the AI service. All translation modes route through _dispatch_history_task
to ensure uniform metadata recording and Zero Code Retention (ZDR) guarantees.
"""

from __future__ import annotations

import asyncio
from typing import Any

from app.core.config import USE_CELERY, logger


def _dispatch_history_task(
    *,
    user_email: str | None,
    mode: str,
    source_language: str,
    target_language: str,
    input_text: str,
    blocks: list[dict[str, Any]] | list[Any],
    model_used: str,
    input_hash: str | None = None,
    workspace_id: str | None = None,
    session_id: str | None = None,
    repository_name: str | None = None,
    file_path: str | None = None,
) -> None:
    """Dispatch translation history persistence.

    Uses Celery worker when USE_CELERY is True, otherwise falls back to
    asynchronous in-process task execution.
    """
    if not user_email:
        return

    try:
        if USE_CELERY:
            from app.queue.tasks import save_translation_history_task

            save_translation_history_task.delay(
                user_email=user_email,
                mode=mode,
                source_language=source_language,
                target_language=target_language,
                input_text=input_text,
                input_hash=input_hash,
                blocks=blocks,
                model_used=model_used,
                workspace_id=workspace_id,
                session_id=session_id,
                repository_name=repository_name,
                file_path=file_path,
            )
        else:
            from app.core.quota import save_translation_background
            from app.queue.tasks import _register_active_task

            try:
                loop = asyncio.get_running_loop()
                task_name = f"history.save.{user_email}"
                _task = loop.create_task(
                    save_translation_background(
                        user_email=user_email,
                        mode=mode,
                        source_language=source_language,
                        target_language=target_language,
                        input_text=input_text,
                        blocks=blocks,
                        model_used=model_used,
                        input_hash=input_hash,
                        workspace_id=workspace_id,
                        session_id=session_id,
                        repository_name=repository_name,
                        file_path=file_path,
                    ),
                    name=task_name,
                )
                _register_active_task(_task, name=task_name)
            except RuntimeError:
                # No running event loop
                pass
    except Exception as exc:
        logger.warning("History task dispatch failed (%s)", type(exc).__name__)

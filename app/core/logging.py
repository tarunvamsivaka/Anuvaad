"""
app/core/logging.py

Structured logging setup for Anuvaad.
Extracted from app/core/config.py (BACK-08).

Provides:
  get_logger(name)  — returns a structlog or stdlib logger bound to *name*
  logger            — the default application logger (name="anuvaad")

Use structlog when available (JSON in production, pretty-print in dev).
Falls back gracefully to stdlib logging when structlog is not installed.
"""
import logging
import os

_is_prod_env = os.getenv("ENV", "development").lower() == "production"

try:
    import structlog

    def _add_logger_name(logger, method_name, event_dict):
        event_dict["logger"] = getattr(logger, "name", "anuvaad")
        return event_dict

    _processors = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        _add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer() if _is_prod_env
        else structlog.dev.ConsoleRenderer(colors=True),
    ]

    structlog.configure(
        processors=_processors,
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )

    def get_logger(name: str = "anuvaad"):
        return structlog.get_logger(name)

except ImportError:
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
    )

    def get_logger(name: str = "anuvaad"):
        return logging.getLogger(name)


#: Default application logger — imported as `from app.core.logging import logger`
logger = get_logger("anuvaad")

__all__ = ["get_logger", "logger"]

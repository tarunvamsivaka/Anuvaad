"""
app/core/logging.py

Structured logging setup for Anuvaad.
Extracted from app/core/config.py (BACK-08).
CQ-11: Encapsulated logging setup in an explicit configure_logging() lifecycle function.

Provides:
  configure_logging() — explicitly initializes logging handlers and formatters
  get_logger(name)    — returns a structlog or stdlib logger bound to *name*
  logger              — the default application logger (name="anuvaad")
"""

import logging
import os

_is_prod_env = os.getenv("ENV", "development").lower() == "production"
_logging_configured = False


def configure_logging(force: bool = False) -> None:
    """Explicitly configure application logging pipelines (CQ-11)."""
    global _logging_configured
    if _logging_configured and not force:
        return

    try:
        import structlog

        def _add_logger_name(logger, method_name, event_dict):
            event_dict["logger"] = getattr(logger, "name", "anuvaad")
            return event_dict

        processors = [
            structlog.contextvars.merge_contextvars,
            structlog.stdlib.add_log_level,
            _add_logger_name,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.JSONRenderer() if _is_prod_env else structlog.dev.ConsoleRenderer(colors=True),
        ]

        structlog.configure(
            processors=processors,
            wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
            context_class=dict,
            logger_factory=structlog.PrintLoggerFactory(),
            cache_logger_on_first_use=True,
        )
    except ImportError:
        logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

    _logging_configured = True


# Initialize automatically on module load for backward compatibility
configure_logging()


def get_logger(name: str = "anuvaad"):
    try:
        import structlog

        return structlog.get_logger(name)
    except ImportError:
        return logging.getLogger(name)


#: Default application logger — imported as `from app.core.logging import logger`
logger = get_logger("anuvaad")

__all__ = ["configure_logging", "get_logger", "logger"]

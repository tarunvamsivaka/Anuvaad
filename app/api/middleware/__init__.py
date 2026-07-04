"""
app/api/middleware/__init__.py

Middleware registry — one place to register all HTTP middleware on a FastAPI app.
Import and call `register_all(app)` from app/main.py to keep the entry-point clean.

Order matters: FastAPI adds middleware as a stack (LIFO on incoming, FIFO on outgoing).
Registration order here matches the original main.py declaration order so behavior
is identical.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.middleware.csrf import allowed_origins, csrf_origin_middleware
from app.api.middleware.deprecation import api_deprecation_middleware
from app.api.middleware.metrics_mw import metrics_middleware
from app.api.middleware.rate_limit import rate_limit_middleware
from app.api.middleware.security_headers import security_headers_middleware


def register_all(app: FastAPI) -> None:
    """Register every HTTP middleware on *app*.

    Call once during application creation, before routes are mounted.
    All middleware is extracted here — app/main.py stays a thin entry-point.
    """
    # CORS must be registered via add_middleware (FastAPI handles it specially)
    # FIX-09 (P2-13): Restricted to explicit methods/headers — no more wildcard.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "X-API-Key", "X-CSRF-Token"],
    )

    # Function-based middleware (registered in reverse-call order)
    app.middleware("http")(security_headers_middleware)
    app.middleware("http")(csrf_origin_middleware)
    app.middleware("http")(metrics_middleware)
    app.middleware("http")(rate_limit_middleware)
    app.middleware("http")(api_deprecation_middleware)


__all__ = ["register_all", "allowed_origins"]

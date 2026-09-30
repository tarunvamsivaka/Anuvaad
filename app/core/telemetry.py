"""
app/core/telemetry.py — OpenTelemetry instrumentation setup.

Sprint 8: Production-grade observability via OTLP → Grafana Cloud.

Configuration (all optional — instrumentation degrades gracefully when absent):
  OTEL_SERVICE_NAME          Defaults to "anuvaad-api"
  OTEL_EXPORTER_OTLP_ENDPOINT  OTLP gRPC endpoint (e.g. https://otlp-gateway-prod-us-east-0.grafana.net/otlp)
  OTEL_EXPORTER_OTLP_HEADERS   "Authorization=Basic <base64(instanceId:token)>"
  OTEL_TRACES_SAMPLER        Defaults to "parentbased_always_on" (100% sampling on Render free tier)

ZDR note: No prompt text, source code, or user identifiers are emitted as span
attributes.  Only structural metadata (route, status code, duration, error type)
is exported.

Free-tier config for Grafana Cloud (14 day retention, 50GB/month traces):
  1. Create free account at grafana.com
  2. Go to My Account → Cloud Stack → OpenTelemetry
  3. Copy the OTLP endpoint and generate an API token
  4. Set OTEL_EXPORTER_OTLP_ENDPOINT + OTEL_EXPORTER_OTLP_HEADERS in .env
"""

from __future__ import annotations

import logging
import os

from fastapi import FastAPI

logger = logging.getLogger("anuvaad.telemetry")

_OTEL_AVAILABLE = False
_instrumented = False


def _try_import_otel() -> bool:
    """Return True if the opentelemetry packages are installed."""
    try:
        import opentelemetry  # noqa: F401

        return True
    except ImportError:
        return False


def setup_tracing(app: FastAPI) -> None:
    """
    Attach OpenTelemetry auto-instrumentation to the FastAPI app.

    Safe to call even if opentelemetry packages are not installed — it
    degrades gracefully with a debug log and returns without error.

    Call this AFTER app creation, BEFORE mounting routers.
    """
    global _OTEL_AVAILABLE, _instrumented

    if _instrumented:
        return

    if not _try_import_otel():
        logger.debug(
            "opentelemetry-sdk not installed — skipping OTel instrumentation. "
            "Install with: pip install opentelemetry-sdk opentelemetry-instrumentation-fastapi"
        )
        return

    _OTEL_AVAILABLE = True

    try:
        from opentelemetry import trace
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor

        service_name = os.getenv("OTEL_SERVICE_NAME", "anuvaad-api")
        otlp_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "")
        env = os.getenv("ENV", "development")

        resource = Resource.create(
            {
                "service.name": service_name,
                "service.version": os.getenv("GIT_SHA", "unknown"),
                "deployment.environment": env,
            }
        )

        provider = TracerProvider(resource=resource)

        if otlp_endpoint:
            try:
                from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import (
                    OTLPSpanExporter,
                )

                headers_raw = os.getenv("OTEL_EXPORTER_OTLP_HEADERS", "")
                headers = {}
                if headers_raw:
                    for pair in headers_raw.split(","):
                        if "=" in pair:
                            k, _, v = pair.partition("=")
                            headers[k.strip()] = v.strip()

                exporter = OTLPSpanExporter(
                    endpoint=otlp_endpoint,
                    headers=headers,
                )
                provider.add_span_processor(BatchSpanProcessor(exporter))
                logger.info(
                    "OTel OTLP exporter configured → %s",
                    otlp_endpoint.split("//")[-1].split("/")[0],  # hostname only, no path
                )
            except Exception as exc:  # pragma: no cover
                logger.warning("OTel OTLP exporter failed to init: %s", exc)
        else:
            logger.info(
                "OTEL_EXPORTER_OTLP_ENDPOINT not set — traces will not be exported. "
                "Set it to ship to Grafana Cloud / Jaeger."
            )

        trace.set_tracer_provider(provider)

        # ── FastAPI auto-instrumentation ────────────────────────────────────────
        # Instruments all routes; emits http.method, http.route, http.status_code.
        # Excludes /api/health and /metrics to avoid noise in dashboards.
        try:
            from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

            FastAPIInstrumentor.instrument_app(
                app,
                excluded_urls="api/health,api/v1/health,metrics,api/v1/metrics",
                # ZDR: Never record request/response bodies
                http_capture_headers_server_request=[],
                http_capture_headers_server_response=[],
            )
            logger.info("OTel FastAPI instrumentation active")
        except Exception as exc:
            logger.warning("OTel FastAPI instrumentation failed: %s", exc)

        # ── SQLAlchemy auto-instrumentation ─────────────────────────────────────
        try:
            from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

            SQLAlchemyInstrumentor().instrument()
            logger.info("OTel SQLAlchemy instrumentation active")
        except Exception as exc:
            logger.debug("OTel SQLAlchemy instrumentation skipped: %s", exc)

        # ── httpx auto-instrumentation ──────────────────────────────────────────
        try:
            from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor

            HTTPXClientInstrumentor().instrument()
            logger.info("OTel httpx instrumentation active")
        except Exception as exc:
            logger.debug("OTel httpx instrumentation skipped: %s", exc)

        _instrumented = True
        logger.info("OpenTelemetry instrumentation complete (service=%s)", service_name)

    except Exception as exc:  # pragma: no cover
        # Never let observability setup crash the application
        logger.error("OTel setup failed — continuing without tracing: %s", exc)

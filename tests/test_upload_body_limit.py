"""Upload-size protection must run before multipart parsing and disk spooling."""

import pytest

from app.api.middleware.upload_limit import UploadBodyLimitMiddleware


def _scope(path: str, headers: list[tuple[bytes, bytes]] | None = None) -> dict:
    return {"type": "http", "method": "POST", "path": path, "headers": headers or []}


@pytest.mark.asyncio
async def test_declared_oversized_upload_is_rejected_before_body_read():
    events = []

    async def downstream(scope, receive, send):
        raise AssertionError("downstream multipart parser must not run")

    async def receive():
        raise AssertionError("oversized body must not be consumed")

    async def send(message):
        events.append(message)

    middleware = UploadBodyLimitMiddleware(downstream)
    await middleware(
        _scope("/api/v1/upload-file", [(b"content-length", b"300000")]),
        receive,
        send,
    )

    assert events[0]["status"] == 413
    assert b"256 KB" in events[1]["body"]


@pytest.mark.asyncio
async def test_chunked_oversized_upload_is_rejected_before_multipart_parser_rollover():
    events = []
    chunks = [
        {"type": "http.request", "body": b"a" * (200 * 1024), "more_body": True},
        {"type": "http.request", "body": b"b" * (60 * 1024), "more_body": True},
    ]

    async def downstream(scope, receive, send):
        while True:
            message = await receive()
            if not message.get("more_body"):
                break
        raise AssertionError("oversized chunked request must not reach parser completion")

    async def receive():
        return chunks.pop(0)

    async def send(message):
        events.append(message)

    middleware = UploadBodyLimitMiddleware(downstream)
    await middleware(_scope("/api/upload-file"), receive, send)

    assert events[0]["status"] == 413
    assert len(chunks) == 0

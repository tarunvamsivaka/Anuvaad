"""Bound multipart upload bodies before Starlette can spool them to disk."""

from starlette.types import ASGIApp, Message, Receive, Scope, Send

_UPLOAD_PATHS = frozenset({"/api/upload-file", "/api/v1/upload-file"})
_MAX_MULTIPART_BODY_BYTES = 256 * 1024


class UploadBodyTooLarge(Exception):
    """Raised before a multipart body can exceed the in-memory safety bound."""


class UploadBodyLimitMiddleware:
    """Reject oversized upload bodies before multipart parsing/spooling begins.

    The endpoint enforces the actual per-tier file limit. This outer limit also
    covers multipart framing and chunked bodies, and remains below Starlette's
    default 1 MiB SpooledTemporaryFile rollover threshold.
    """

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or scope.get("method") != "POST" or scope.get("path") not in _UPLOAD_PATHS:
            await self.app(scope, receive, send)
            return

        headers = {key.lower(): value for key, value in scope.get("headers", [])}
        content_length = headers.get(b"content-length")
        if content_length:
            try:
                declared_length = int(content_length)
            except ValueError:
                declared_length = 0
            if declared_length > _MAX_MULTIPART_BODY_BYTES:
                await self._respond_too_large(send)
                return

        received = 0

        async def limited_receive() -> Message:
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > _MAX_MULTIPART_BODY_BYTES:
                    raise UploadBodyTooLarge
            return message

        try:
            await self.app(scope, limited_receive, send)
        except UploadBodyTooLarge:
            await self._respond_too_large(send)

    @staticmethod
    async def _respond_too_large(send: Send) -> None:
        body = b'{"detail":"Upload request exceeds the 256 KB request limit."}'
        await send(
            {
                "type": "http.response.start",
                "status": 413,
                "headers": [(b"content-type", b"application/json"), (b"content-length", str(len(body)).encode())],
            }
        )
        await send({"type": "http.response.body", "body": body})

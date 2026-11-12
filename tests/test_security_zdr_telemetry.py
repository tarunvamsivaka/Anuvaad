"""Regression tests for keeping submitted content out of telemetry events."""

from app.main import sentry_before_send


def test_sentry_scrubber_removes_request_and_exception_content():
    source = "private source snippet"
    event = {
        "user": {"email": "person@example.com"},
        "extra": {"raw_code": source},
        "breadcrumbs": {"values": [{"message": source}]},
        "request": {
            "data": source,
            "query_string": "query=" + source,
            "url": "https://api.example/translate?query=" + source,
            "headers": {"Authorization": "Bearer secret"},
        },
        "exception": {
            "values": [
                {
                    "type": "ValueError",
                    "value": source,
                    "stacktrace": {"frames": [{"vars": {"raw_code": source}}]},
                }
            ]
        },
        "message": source,
        "logentry": {"message": source},
        "spans": [{"description": source, "data": {"http.query": source}, "tags": {"query": source}}],
    }

    scrubbed = sentry_before_send(event, {})

    assert scrubbed is not None
    assert "user" not in scrubbed
    assert "extra" not in scrubbed
    assert "breadcrumbs" not in scrubbed
    assert "query_string" not in scrubbed["request"]
    assert "?" not in scrubbed["request"]["url"]
    assert scrubbed["request"]["data"] == "[REDACTED_FOR_ZDR]"
    assert scrubbed["request"]["headers"]["Authorization"] == "[REDACTED]"
    exception = scrubbed["exception"]["values"][0]
    assert exception["value"] == "[REDACTED_FOR_ZDR]"
    assert "vars" not in exception["stacktrace"]["frames"][0]
    assert scrubbed["message"] == "[REDACTED_FOR_ZDR]"
    assert scrubbed["logentry"]["message"] == "[REDACTED_FOR_ZDR]"
    assert scrubbed["spans"] == [{}]
    assert source not in repr(scrubbed)


def test_sentry_scrubber_accepts_events_without_exception_payload():
    assert sentry_before_send({"message": "safe event"}, {}) == {
        "message": "[REDACTED_FOR_ZDR]",
    }

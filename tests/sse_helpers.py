"""Helpers for asserting on Server-Sent Events responses."""

import json


def parse_sse_done(response):
    """Return the terminal blocks, or raise with the terminal SSE error."""
    terminal = None
    for frame in response.text.split("\n\n"):
        data_lines = [line[5:].lstrip() for line in frame.splitlines() if line.startswith("data:")]
        if not data_lines:
            continue
        event = json.loads("\n".join(data_lines))
        if event.get("done"):
            terminal = event
    if terminal is None:
        raise AssertionError("SSE response did not contain a terminal event")
    if terminal.get("error"):
        return {"detail": terminal["error"]}
    if "blocks" not in terminal:
        raise AssertionError("SSE terminal event did not contain blocks")
    return terminal["blocks"]

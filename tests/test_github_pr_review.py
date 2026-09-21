"""
tests/test_github_pr_review.py

Unit and integration tests for Phase 2B (Week 4):
AI PR Reviewer diff engine, webhook signature verification, and background review tasks.
"""

import hashlib
import hmac
import json
from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.services.pr_reviewer import (
    format_review_comment_body,
    generate_pr_review,
    parse_unified_diff,
)

SAMPLE_DIFF = """diff --git a/src/auth.py b/src/auth.py
--- a/src/auth.py
+++ b/src/auth.py
@@ -10,3 +10,4 @@ def verify_token(token: str):
-    return token == "secret"
+    import hmac
+    return hmac.compare_digest(token, expected_secret)
diff --git a/README.md b/README.md
--- a/README.md
+++ b/README.md
@@ -1,2 +1,3 @@
 # Anuvaad
+AI Code Reviewer Engine
"""


def test_parse_unified_diff():
    files = parse_unified_diff(SAMPLE_DIFF)
    assert len(files) == 2
    assert files[0]["file_path"] == "src/auth.py"
    assert files[0]["additions"] == 2
    assert files[0]["deletions"] == 1
    assert files[1]["file_path"] == "README.md"
    assert files[1]["additions"] == 1
    assert files[1]["deletions"] == 0


@pytest.mark.asyncio
async def test_generate_pr_review_fallback():
    review = await generate_pr_review(
        diff_text=SAMPLE_DIFF,
        repo_name="org/repo",
        pr_number=42,
        pr_title="Harden auth token comparison",
    )
    assert "summary" in review
    assert review["files_changed"] == 2
    assert review["total_additions"] == 3
    assert review["total_deletions"] == 1
    assert review["risk_level"] in ("Low", "Medium", "High")
    assert len(review["comments"]) > 0

    comment_body = format_review_comment_body(review)
    assert "## ⚡ Anuvaad AI Code Review" in comment_body
    assert "Architectural Risk" in comment_body


@pytest.mark.asyncio
async def test_github_webhook_ping():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(
            "/api/v1/github/webhook",
            json={"zen": "Design for failure."},
            headers={"X-GitHub-Event": "ping"},
        )
        assert resp.status_code == 200
        assert resp.json()["message"] == "pong"


@pytest.mark.asyncio
async def test_github_webhook_signature_verification():
    secret = "test_webhook_secret_key"
    payload = json.dumps(
        {
            "action": "opened",
            "repository": {"full_name": "test-org/test-repo"},
            "pull_request": {
                "number": 101,
                "title": "Feature: Add GraphQL",
                "diff_url": "https://github.com/test-org/test-repo/pull/101.diff",
            },
        }
    ).encode("utf-8")

    sig = "sha256=" + hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()

    transport = ASGITransport(app=app)
    with patch.dict("os.environ", {"GITHUB_WEBHOOK_SECRET": secret}):
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. Invalid signature -> 401
            resp_invalid = await client.post(
                "/api/v1/github/webhook",
                content=payload,
                headers={
                    "Content-Type": "application/json",
                    "X-Hub-Signature-256": "sha256=invalid_hex_digest",
                    "X-GitHub-Event": "pull_request",
                },
            )
            assert resp_invalid.status_code == 401

            # 2. Valid signature -> 200 & task queued
            resp_valid = await client.post(
                "/api/v1/github/webhook",
                content=payload,
                headers={
                    "Content-Type": "application/json",
                    "X-Hub-Signature-256": sig,
                    "X-GitHub-Event": "pull_request",
                },
            )
            assert resp_valid.status_code == 200
            data = resp_valid.json()
            assert data["status"] == "queued"
            assert data["pr_number"] == 101
            assert data["repo"] == "test-org/test-repo"

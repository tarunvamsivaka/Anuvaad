"""
API endpoint tests for Anuvaad backend.

Uses the monkey-patched Gemini client from conftest.py
so no real API calls are made.
"""

import json


class TestHealthEndpoint:
    """Tests for GET /api/health."""

    def test_health_returns_200(self, client):
        res = client.get("/api/health")
        assert res.status_code == 200

    def test_health_response_shape(self, client):
        data = client.get("/api/health").json()
        assert data["status"] == "healthy"
        assert data["service"] == "anuvaad-api"
        assert "gemini_configured" in data
        assert "stripe_configured" in data


class TestCodeToEnglish:
    """Tests for POST /api/code-to-english."""

    def test_valid_request(self, client):
        res = client.post("/api/code-to-english", json={
            "raw_code": "print('hello')",
            "language": "python"
        })
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        assert len(data) > 0
        assert "id" in data[0]
        assert "code_snippet" in data[0]
        assert "english_translation" in data[0]

    def test_empty_code_rejected(self, client):
        res = client.post("/api/code-to-english", json={
            "raw_code": "",
            "language": "python"
        })
        assert res.status_code == 422

    def test_whitespace_only_rejected(self, client):
        res = client.post("/api/code-to-english", json={
            "raw_code": "   \n  \t  ",
            "language": "python"
        })
        assert res.status_code == 422

    def test_missing_language_rejected(self, client):
        res = client.post("/api/code-to-english", json={
            "raw_code": "print('hello')"
        })
        assert res.status_code == 422

    def test_missing_body_rejected(self, client):
        res = client.post("/api/code-to-english")
        assert res.status_code == 422


class TestGenerateFromEnglish:
    """Tests for POST /api/generate-from-english."""

    def test_valid_request(self, client):
        res = client.post("/api/generate-from-english", json={
            "prompt": "a function that adds two numbers",
            "language": "python"
        })
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_empty_prompt_rejected(self, client):
        res = client.post("/api/generate-from-english", json={
            "prompt": "",
            "language": "python"
        })
        assert res.status_code == 422

    def test_whitespace_prompt_rejected(self, client):
        res = client.post("/api/generate-from-english", json={
            "prompt": "   \n  ",
            "language": "python"
        })
        assert res.status_code == 422


class TestEnglishToCode:
    """Tests for POST /api/english-to-code."""

    def test_valid_update(self, client):
        res = client.post("/api/english-to-code", json={
            "block_id": "block_1",
            "modified_english": "Print goodbye instead",
            "full_context": "print('hello')"
        })
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "success"
        assert "updated_code" in data

    def test_empty_block_id_rejected(self, client):
        res = client.post("/api/english-to-code", json={
            "block_id": "",
            "modified_english": "Print goodbye",
            "full_context": "print('hello')"
        })
        assert res.status_code == 422


class TestCodeToCode:
    """Tests for POST /api/code-to-code."""

    def test_valid_translation(self, client):
        res = client.post("/api/code-to-code", json={
            "raw_code": "print('hello')",
            "source_language": "python",
            "target_language": "javascript"
        })
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_empty_code_rejected(self, client):
        res = client.post("/api/code-to-code", json={
            "raw_code": "",
            "source_language": "python",
            "target_language": "javascript"
        })
        assert res.status_code == 422

    def test_missing_target_rejected(self, client):
        res = client.post("/api/code-to-code", json={
            "raw_code": "print('hello')",
            "source_language": "python"
        })
        assert res.status_code == 422


class TestStripeWebhook:
    """Tests for POST /api/webhook/stripe."""

    def test_checkout_completed(self, client):
        event = {
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "customer_email": "test@example.com",
                    "subscription": "sub_12345"
                }
            }
        }
        res = client.post("/api/webhook/stripe", json=event)
        assert res.status_code == 200
        assert res.json()["received"] is True

    def test_subscription_updated(self, client):
        event = {
            "type": "customer.subscription.updated",
            "data": {
                "object": {
                    "customer": "cus_12345",
                    "status": "active"
                }
            }
        }
        res = client.post("/api/webhook/stripe", json=event)
        assert res.status_code == 200

    def test_subscription_deleted(self, client):
        event = {
            "type": "customer.subscription.deleted",
            "data": {
                "object": {
                    "customer": "cus_12345"
                }
            }
        }
        res = client.post("/api/webhook/stripe", json=event)
        assert res.status_code == 200

    def test_payment_failed(self, client):
        event = {
            "type": "invoice.payment_failed",
            "data": {
                "object": {
                    "customer_email": "test@example.com",
                    "attempt_count": 2
                }
            }
        }
        res = client.post("/api/webhook/stripe", json=event)
        assert res.status_code == 200

    def test_unhandled_event(self, client):
        event = {
            "type": "some.future.event",
            "data": {"object": {}}
        }
        res = client.post("/api/webhook/stripe", json=event)
        assert res.status_code == 200
        assert res.json()["received"] is True

    def test_invalid_payload(self, client):
        res = client.post(
            "/api/webhook/stripe",
            content=b"not json",
            headers={"Content-Type": "application/json"}
        )
        assert res.status_code == 422 or res.status_code == 400


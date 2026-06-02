"""
API endpoint tests for Anuvaad backend.

Uses the monkey-patched LLM client from conftest.py
so no real API calls are made.
"""


class TestHealthEndpoint:
    """Tests for GET /api/health."""

    def test_health_returns_200(self, client):
        res = client.get("/api/health")
        assert res.status_code == 200

    def test_health_response_shape(self, client):
        data = client.get("/api/health").json()
        assert data["status"] == "healthy"
        assert data["service"] == "anuvaad-api"
        assert "llm_configured" in data
        assert "razorpay_configured" in data


class TestCodeToEnglish:
    """Tests for POST /api/code-to-english."""

    def test_valid_request(self, client):
        res = client.post(
            "/api/code-to-english",
            json={"raw_code": "print('hello')", "language": "python"},
        )
        print("STATUS:", res.status_code)
        print("CONTENT:", res.text)
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        assert len(data) > 0
        assert "id" in data[0]
        assert "code_snippet" in data[0]
        assert "english_translation" in data[0]

    def test_empty_code_rejected(self, client):
        res = client.post(
            "/api/code-to-english", json={"raw_code": "", "language": "python"}
        )
        assert res.status_code == 422

    def test_whitespace_only_rejected(self, client):
        res = client.post(
            "/api/code-to-english",
            json={"raw_code": "   \n  \t  ", "language": "python"},
        )
        assert res.status_code == 422

    def test_missing_language_rejected(self, client):
        res = client.post("/api/code-to-english", json={"raw_code": "print('hello')"})
        assert res.status_code == 422

    def test_missing_body_rejected(self, client):
        res = client.post("/api/code-to-english")
        assert res.status_code == 422


class TestGenerateFromEnglish:
    """Tests for POST /api/generate-from-english."""

    def test_valid_request(self, client):
        res = client.post(
            "/api/generate-from-english",
            json={"prompt": "a function that adds two numbers", "language": "python"},
        )
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_empty_prompt_rejected(self, client):
        res = client.post(
            "/api/generate-from-english", json={"prompt": "", "language": "python"}
        )
        assert res.status_code == 422

    def test_whitespace_prompt_rejected(self, client):
        res = client.post(
            "/api/generate-from-english",
            json={"prompt": "   \n  ", "language": "python"},
        )
        assert res.status_code == 422


class TestEnglishToCode:
    """Tests for POST /api/english-to-code."""

    def test_valid_update(self, client):
        res = client.post(
            "/api/english-to-code",
            json={
                "block_id": "block_1",
                "modified_english": "Print goodbye instead",
                "full_context": "print('hello')",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "success"
        assert "updated_code" in data

    def test_empty_block_id_rejected(self, client):
        res = client.post(
            "/api/english-to-code",
            json={
                "block_id": "",
                "modified_english": "Print goodbye",
                "full_context": "print('hello')",
            },
        )
        assert res.status_code == 422


class TestCodeToCode:
    """Tests for POST /api/code-to-code."""

    def test_valid_translation(self, client):
        res = client.post(
            "/api/code-to-code",
            json={
                "raw_code": "print('hello')",
                "source_language": "python",
                "target_language": "javascript",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_empty_code_rejected(self, client):
        res = client.post(
            "/api/code-to-code",
            json={
                "raw_code": "",
                "source_language": "python",
                "target_language": "javascript",
            },
        )
        assert res.status_code == 422

    def test_missing_target_rejected(self, client):
        res = client.post(
            "/api/code-to-code",
            json={"raw_code": "print('hello')", "source_language": "python"},
        )
        assert res.status_code == 422


class TestRazorpayWebhook:
    """Tests for POST /api/webhook/razorpay."""

    def test_subscription_activated(self, client):
        event = {
            "event": "subscription.activated",
            "payload": {
                "subscription": {
                    "entity": {
                        "id": "sub_12345",
                        "notes": {"user_email": "test@example.com"},
                    }
                }
            },
        }
        res = client.post("/api/webhook/razorpay", json=event)
        assert res.status_code == 200
        assert res.json()["received"] is True

    def test_subscription_charged(self, client):
        event = {
            "event": "subscription.charged",
            "payload": {
                "subscription": {
                    "entity": {
                        "id": "sub_12345",
                        "notes": {"user_email": "test@example.com"},
                    }
                }
            },
        }
        res = client.post("/api/webhook/razorpay", json=event)
        assert res.status_code == 200

    def test_subscription_cancelled(self, client):
        event = {
            "event": "subscription.cancelled",
            "payload": {
                "subscription": {
                    "entity": {
                        "id": "sub_12345",
                        "notes": {"user_email": "test@example.com"},
                    }
                }
            },
        }
        res = client.post("/api/webhook/razorpay", json=event)
        assert res.status_code == 200

    def test_payment_failed(self, client):
        event = {
            "event": "payment.failed",
            "payload": {"payment": {"entity": {"email": "test@example.com"}}},
        }
        res = client.post("/api/webhook/razorpay", json=event)
        assert res.status_code == 200

    def test_unhandled_event(self, client):
        event = {"event": "some.future.event", "payload": {}}
        res = client.post("/api/webhook/razorpay", json=event)
        assert res.status_code == 200
        assert res.json()["received"] is True

    def test_invalid_payload(self, client):
        res = client.post(
            "/api/webhook/razorpay",
            content=b"not json",
            headers={"Content-Type": "application/json"},
        )
        assert res.status_code in (400, 422)

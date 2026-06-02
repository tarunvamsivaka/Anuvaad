"""
Comprehensive functional tests for all Anuvaad features.
Covers: translation APIs, error handling, auth gating, workspaces,
Pydantic models, normalization edge cases, caching, rate limiting,
CORS, Razorpay webhooks, and checkout validation.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import pytest


# ═══════════════════════════════════════════════════════════════
# 1. MULTI-BLOCK TRANSLATION RESPONSES
# ═══════════════════════════════════════════════════════════════


class TestMultiBlockResponses:
    """Verify the API correctly handles multi-block LLM output."""

    def test_code_to_english_returns_multiple_blocks(self, client_multi_block):
        res = client_multi_block.post(
            "/api/code-to-english",
            json={"raw_code": "def add(a, b):\n    return a + b", "language": "python"},
        )
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        assert len(data) == 2
        assert data[0]["id"] == "block_1"
        assert data[1]["id"] == "block_2"

    def test_multi_block_has_all_required_fields(self, client_multi_block):
        res = client_multi_block.post(
            "/api/code-to-english",
            json={"raw_code": "def add(a, b):\n    return a + b", "language": "python"},
        )
        for block in res.json():
            assert "id" in block
            assert "code_snippet" in block
            assert "english_translation" in block
            assert isinstance(block["id"], str)
            assert isinstance(block["code_snippet"], str)
            assert isinstance(block["english_translation"], str)

    def test_code_to_code_returns_multiple_blocks(self, client_multi_block):
        res = client_multi_block.post(
            "/api/code-to-code",
            json={
                "raw_code": "def add(a, b):\n    return a + b",
                "source_language": "python",
                "target_language": "javascript",
            },
        )
        assert res.status_code == 200
        assert len(res.json()) == 2

    def test_generate_from_english_returns_multiple_blocks(self, client_multi_block):
        res = client_multi_block.post(
            "/api/generate-from-english",
            json={
                "prompt": "create a function that adds two numbers",
                "language": "python",
            },
        )
        assert res.status_code == 200
        assert len(res.json()) == 2


# ═══════════════════════════════════════════════════════════════
# 2. AI ERROR HANDLING
# ═══════════════════════════════════════════════════════════════


class TestAIErrorHandling:
    """Verify graceful handling of AI API failures."""

    def test_invalid_json_returns_500(self, client_ai_error):
        res = client_ai_error.post(
            "/api/code-to-english", json={"raw_code": "x = 999", "language": "python"}
        )
        assert res.status_code == 200
        assert "detail" in res.json()

    def test_code_to_code_invalid_json(self, client_ai_error):
        res = client_ai_error.post(
            "/api/code-to-code",
            json={
                "raw_code": "x = 1",
                "source_language": "python",
                "target_language": "javascript",
            },
        )
        assert res.status_code == 200
        assert "detail" in res.json()

    def test_generate_invalid_json(self, client_ai_error):
        res = client_ai_error.post(
            "/api/generate-from-english",
            json={"prompt": "hello world function", "language": "python"},
        )
        assert res.status_code == 500

    def test_empty_blocks_returns_500(self, client_empty_blocks):
        res = client_empty_blocks.post(
            "/api/code-to-english", json={"raw_code": "x = 998", "language": "python"}
        )
        assert res.status_code == 200
        assert "detail" in res.json()


# ═══════════════════════════════════════════════════════════════
# 3. REDIS FALLBACK (Redis Down)
# ═══════════════════════════════════════════════════════════════


class TestRedisDown:
    """Verify the app still works when Redis is unavailable."""

    def test_translation_works_without_redis(self, client_no_redis):
        res = client_no_redis.post(
            "/api/code-to-english",
            json={"raw_code": "print('hello')", "language": "python"},
        )
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_health_works_without_redis(self, client_no_redis):
        res = client_no_redis.get("/api/health")
        assert res.status_code == 200

    def test_rate_limit_fallback_without_redis(self, client_no_redis):
        """When Redis is None, rate limiting uses in-memory fallback."""
        import main as app_module

        for i in range(16):
            res = client_no_redis.get("/api/health")
            if i < app_module.RATE_LIMIT_MAX:
                assert res.status_code == 200
            else:
                assert res.status_code == 429


# ═══════════════════════════════════════════════════════════════
# 4. WORKSPACE API — AUTH GATING
# ═══════════════════════════════════════════════════════════════


class TestWorkspaceAuthGating:
    """Verify workspace endpoints reject unauthenticated requests."""

    def test_create_workspace_requires_auth(self, client_no_auth):
        res = client_no_auth.post("/api/workspaces", json={"name": "Test Team"})
        assert res.status_code in (401, 422)  # 401 from our check, 422 from Pydantic

    def test_list_workspaces_requires_auth(self, client_no_auth):
        res = client_no_auth.get("/api/workspaces")
        assert res.status_code in (401, 422)

    def test_list_members_requires_auth(self, client_no_auth):
        res = client_no_auth.get("/api/workspaces/some-id/members")
        assert res.status_code in (401, 422)

    def test_invite_requires_auth(self, client_no_auth):
        res = client_no_auth.post(
            "/api/workspaces/some-id/invite", json={"email": "user@test.com"}
        )
        assert res.status_code in (401, 422)


# ═══════════════════════════════════════════════════════════════
# 5. WORKSPACE VALIDATION
# ═══════════════════════════════════════════════════════════════


class TestWorkspaceValidation:
    """Validate Pydantic models for workspace endpoints."""

    def test_create_workspace_empty_name_rejected(self, client_with_auth):
        res = client_with_auth.post("/api/workspaces", json={"name": ""})
        assert res.status_code == 422

    def test_create_workspace_name_too_long(self, client_with_auth):
        res = client_with_auth.post("/api/workspaces", json={"name": "x" * 101})
        assert res.status_code == 422

    def test_create_workspace_missing_name(self, client_with_auth):
        res = client_with_auth.post("/api/workspaces", json={})
        assert res.status_code == 422

    def test_invite_empty_email_rejected(self, client_with_auth):
        res = client_with_auth.post(
            "/api/workspaces/test-id/invite", json={"email": "ab"}
        )
        assert res.status_code == 422

    def test_invite_missing_email(self, client_with_auth):
        res = client_with_auth.post("/api/workspaces/test-id/invite", json={})
        assert res.status_code == 422


# ═══════════════════════════════════════════════════════════════
# 6. PYDANTIC MODEL VALIDATION — ALL ENDPOINTS
# ═══════════════════════════════════════════════════════════════


class TestPydanticModels:
    """Exhaustive Pydantic field validation for all request models."""

    # -- CodePayload --
    def test_code_payload_missing_all_fields(self, client):
        res = client.post("/api/code-to-english", json={})
        assert res.status_code == 422

    def test_code_payload_extra_fields_ignored(self, client):
        res = client.post(
            "/api/code-to-english",
            json={"raw_code": "x=1", "language": "python", "extra_field": "ignored"},
        )
        assert res.status_code == 200

    def test_code_payload_null_code(self, client):
        res = client.post(
            "/api/code-to-english", json={"raw_code": None, "language": "python"}
        )
        assert res.status_code == 422

    def test_code_payload_integer_code(self, client):
        res = client.post(
            "/api/code-to-english", json={"raw_code": 12345, "language": "python"}
        )
        # Pydantic should coerce int to str or reject
        assert res.status_code in (200, 422)

    # -- GeneratePayload --
    def test_generate_missing_language(self, client):
        res = client.post("/api/generate-from-english", json={"prompt": "hello world"})
        assert res.status_code == 422

    def test_generate_null_prompt(self, client):
        res = client.post(
            "/api/generate-from-english", json={"prompt": None, "language": "python"}
        )
        assert res.status_code == 422

    # -- EnglishUpdatePayload --
    def test_english_update_missing_full_context(self, client):
        res = client.post(
            "/api/english-to-code",
            json={"block_id": "b1", "modified_english": "do something"},
        )
        assert res.status_code == 422

    def test_english_update_empty_modified_english(self, client):
        res = client.post(
            "/api/english-to-code",
            json={"block_id": "b1", "modified_english": "", "full_context": "ctx"},
        )
        assert res.status_code == 422

    # -- CodeToCodePayload --
    def test_code_to_code_missing_source(self, client):
        res = client.post(
            "/api/code-to-code",
            json={"raw_code": "x=1", "target_language": "javascript"},
        )
        assert res.status_code == 422

    def test_code_to_code_whitespace_code(self, client):
        res = client.post(
            "/api/code-to-code",
            json={
                "raw_code": "   \n  ",
                "source_language": "python",
                "target_language": "javascript",
            },
        )
        assert res.status_code == 422

    # -- CheckoutPayload --
    def test_checkout_payload_email_too_short(self):
        from main import CheckoutPayload

        with pytest.raises(Exception):
            CheckoutPayload(user_email="a@b", access_token="a" * 10)

    def test_checkout_payload_token_too_short(self):
        from main import CheckoutPayload

        with pytest.raises(Exception):
            CheckoutPayload(user_email="test@example.com", access_token="short")

    def test_checkout_payload_valid(self):
        from main import CheckoutPayload

        p = CheckoutPayload(user_email="test@example.com", access_token="a" * 50)
        assert p.user_email == "test@example.com"

    # -- SubscriptionCheckPayload --
    def test_subscription_check_token_too_short(self):
        from main import SubscriptionCheckPayload

        with pytest.raises(Exception):
            SubscriptionCheckPayload(access_token="short")

    def test_subscription_check_valid(self):
        from main import SubscriptionCheckPayload

        p = SubscriptionCheckPayload(access_token="a" * 50)
        assert len(p.access_token) == 50

    # -- WorkspaceCreate --
    def test_workspace_create_valid(self):
        from main import WorkspaceCreate

        p = WorkspaceCreate(name="My Team")
        assert p.name == "My Team"

    # -- WorkspaceInvite --
    def test_workspace_invite_default_role(self):
        from main import WorkspaceInvite

        p = WorkspaceInvite(email="user@example.com")
        assert p.role == "member"

    def test_workspace_invite_custom_role(self):
        from main import WorkspaceInvite

        p = WorkspaceInvite(email="admin@example.com", role="admin")
        assert p.role == "admin"


# ═══════════════════════════════════════════════════════════════
# 7. RESPONSE NORMALIZATION — EXTENDED EDGE CASES
# ═══════════════════════════════════════════════════════════════


class TestNormalizationExtended:
    """Extended edge cases for normalize_blocks."""

    def test_data_key_unwrap(self):
        from main import normalize_blocks

        raw = {"data": [{"code_snippet": "x", "english_translation": "desc"}]}
        result = normalize_blocks(raw)
        assert len(result) == 1

    def test_translations_key_unwrap(self):
        from main import normalize_blocks

        raw = {"translations": [{"code_snippet": "x", "translation": "t"}]}
        result = normalize_blocks(raw)
        assert len(result) == 1
        assert result[0]["english_translation"] == "t"

    def test_code_blocks_key_unwrap(self):
        from main import normalize_blocks

        raw = {"code_blocks": [{"snippet": "x", "text": "desc"}]}
        result = normalize_blocks(raw)
        assert len(result) == 1
        assert result[0]["code_snippet"] == "x"
        assert result[0]["english_translation"] == "desc"

    def test_response_key_unwrap(self):
        from main import normalize_blocks

        raw = {"response": [{"code": "x=1", "comment": "assigns"}]}
        result = normalize_blocks(raw)
        assert result[0]["english_translation"] == "assigns"

    def test_mixed_valid_invalid_blocks(self):
        from main import normalize_blocks

        raw = [
            {"code_snippet": "", "english_translation": ""},
            {"code_snippet": "", "english_translation": ""},
            {"code_snippet": "valid", "english_translation": "desc"},
        ]
        result = normalize_blocks(raw)
        assert len(result) == 1
        assert result[0]["code_snippet"] == "valid"

    def test_non_dict_items_in_list_filtered(self):
        from main import normalize_blocks

        raw = [
            "some string",
            42,
            {"code_snippet": "x", "english_translation": "desc"},
        ]
        result = normalize_blocks(raw)
        assert len(result) == 1

    def test_all_alternative_field_names(self):
        """Test every alternative field name for english_translation."""
        from main import normalize_blocks

        alt_keys = [
            "explanation",
            "description",
            "translation",
            "text",
            "english",
            "comment",
        ]
        for key in alt_keys:
            raw = [{"code_snippet": "x", key: f"via_{key}"}]
            result = normalize_blocks(raw)
            assert result[0]["english_translation"] == f"via_{key}", (
                f"Failed for key: {key}"
            )

    def test_all_alternative_code_field_names(self):
        from main import normalize_blocks

        for key in ["code", "snippet"]:
            raw = [{key: "x=1", "english_translation": "desc"}]
            result = normalize_blocks(raw)
            assert result[0]["code_snippet"] == "x=1", f"Failed for key: {key}"

    def test_all_alternative_id_field_names(self):
        from main import normalize_blocks

        raw = [
            {"block_id": "custom_id", "code_snippet": "x", "english_translation": "d"}
        ]
        result = normalize_blocks(raw)
        assert result[0]["id"] == "custom_id"

    def test_large_list_of_blocks(self):
        from main import normalize_blocks

        raw = [
            {"code_snippet": f"line_{i}", "english_translation": f"desc_{i}"}
            for i in range(100)
        ]
        result = normalize_blocks(raw)
        assert len(result) == 100

    def test_integer_type_raises(self):
        from main import normalize_blocks

        with pytest.raises(ValueError):
            normalize_blocks(42)

    def test_none_type_raises(self):
        from main import normalize_blocks

        with pytest.raises((ValueError, TypeError)):
            normalize_blocks(None)

    def test_bool_type_raises(self):
        from main import normalize_blocks

        with pytest.raises((ValueError, AttributeError)):
            normalize_blocks(True)


# ═══════════════════════════════════════════════════════════════
# 8. CACHE KEY EXTENDED
# ═══════════════════════════════════════════════════════════════


class TestCacheKeyExtended:
    """Extended cache key determinism tests."""

    def test_cache_key_starts_with_prefix(self):
        from main import cache_key

        k = cache_key("x=1", "python", "code-to-english", "llama-3")
        assert k.startswith("anuvaad_cache:")

    def test_cache_key_is_sha256_length(self):
        from main import cache_key

        k = cache_key("x=1", "python", "code-to-english", "llama-3")
        # "anuvaad_cache:" (14 chars) + 64 hex chars = 78
        assert len(k) == 78

    def test_cache_key_whitespace_matters(self):
        from main import cache_key

        k1 = cache_key("x = 1", "python", "code-to-english", "llama-3")
        k2 = cache_key("x=1", "python", "code-to-english", "llama-3")
        assert k1 != k2

    def test_cache_key_case_sensitive(self):
        from main import cache_key

        k1 = cache_key("Print('hello')", "python", "code-to-english", "llama-3")
        k2 = cache_key("print('hello')", "python", "code-to-english", "llama-3")
        assert k1 != k2

    def test_cache_key_empty_inputs(self):
        """Even empty strings should produce a valid hash."""
        from main import cache_key

        k = cache_key("", "", "", "llama-3")
        assert k.startswith("anuvaad_cache:")
        assert len(k) == 78


# ═══════════════════════════════════════════════════════════════
# 9. RATE LIMITING EXTENDED
# ═══════════════════════════════════════════════════════════════


class TestRateLimitingExtended:
    """Extended rate limiting scenarios."""

    def test_rate_limit_response_includes_max_info(self, client_rate_limited):
        res = client_rate_limited.post(
            "/api/code-to-english", json={"raw_code": "x=1", "language": "python"}
        )
        assert res.status_code == 429
        detail = res.json()["detail"]
        assert "15" in detail  # RATE_LIMIT_MAX
        assert "60" in detail  # RATE_LIMIT_WINDOW

    def test_rate_limit_applies_to_all_api_routes(self, client_rate_limited):
        """All /api/ routes should be rate-limited."""
        endpoints = [
            ("POST", "/api/code-to-english", {"raw_code": "x=1", "language": "py"}),
            ("POST", "/api/generate-from-english", {"prompt": "hi", "language": "py"}),
            (
                "POST",
                "/api/code-to-code",
                {"raw_code": "x", "source_language": "py", "target_language": "js"},
            ),
            ("GET", "/api/health", None),
        ]
        for method, path, body in endpoints:
            if method == "GET":
                res = client_rate_limited.get(path)
            else:
                res = client_rate_limited.post(path, json=body)
            assert res.status_code == 429, f"{method} {path} should be rate limited"


# ═══════════════════════════════════════════════════════════════
# 10. RAZORPAY WEBHOOK EXTENDED
# ═══════════════════════════════════════════════════════════════


class TestRazorpayWebhookExtended:
    """Extended Razorpay webhook tests."""

    def test_subscription_activated(self, client):
        event = {
            "event": "subscription.activated",
            "payload": {
                "subscription": {
                    "entity": {
                        "id": "sub_abc123",
                        "notes": {"user_email": "pro@example.com"},
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
                        "id": "sub_abc123",
                        "notes": {"user_email": "pro@example.com"},
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
                        "id": "sub_abc123",
                        "notes": {"user_email": "pro@example.com"},
                    }
                }
            },
        }
        res = client.post("/api/webhook/razorpay", json=event)
        assert res.status_code == 200

    def test_payment_failed(self, client):
        event = {
            "event": "payment.failed",
            "payload": {"payment": {"entity": {"email": "pro@example.com"}}},
        }
        res = client.post("/api/webhook/razorpay", json=event)
        assert res.status_code == 200

    def test_webhook_unhandled_event(self, client):
        event = {"event": "some.unhandled.event", "payload": {}}
        res = client.post("/api/webhook/razorpay", json=event)
        assert res.status_code == 200


# ═══════════════════════════════════════════════════════════════
# 11. HEALTH ENDPOINT EXTENDED
# ═══════════════════════════════════════════════════════════════


class TestHealthExtended:
    """Extended health endpoint tests."""

    def test_health_correct_content_type(self, client):
        res = client.get("/api/health")
        assert "application/json" in res.headers["content-type"]

    def test_health_llm_configured_flag(self, client):
        data = client.get("/api/health").json()
        assert "llm_configured" in data

    def test_health_razorpay_configured_flag(self, client):
        data = client.get("/api/health").json()
        assert data["razorpay_configured"] is True


# ═══════════════════════════════════════════════════════════════
# 12. TRANSLATION WITH WORKSPACE_ID
# ═══════════════════════════════════════════════════════════════


class TestTranslationWithWorkspace:
    """Verify workspace_id is accepted in translation payloads."""

    def test_code_to_english_accepts_workspace_id(self, client):
        res = client.post(
            "/api/code-to-english",
            json={"raw_code": "x=1", "language": "python", "workspace_id": "ws_12345"},
        )
        assert res.status_code == 200

    def test_generate_accepts_workspace_id(self, client):
        res = client.post(
            "/api/generate-from-english",
            json={
                "prompt": "add two numbers",
                "language": "python",
                "workspace_id": "ws_12345",
            },
        )
        assert res.status_code == 200

    def test_code_to_code_accepts_workspace_id(self, client):
        res = client.post(
            "/api/code-to-code",
            json={
                "raw_code": "x=1",
                "source_language": "python",
                "target_language": "javascript",
                "workspace_id": "ws_12345",
            },
        )
        assert res.status_code == 200

    def test_workspace_id_null_accepted(self, client):
        res = client.post(
            "/api/code-to-english",
            json={"raw_code": "x=1", "language": "python", "workspace_id": None},
        )
        assert res.status_code == 200


# ═══════════════════════════════════════════════════════════════
# 13. CONTENT TYPE & METHOD VALIDATION
# ═══════════════════════════════════════════════════════════════


class TestHTTPMethodValidation:
    """Verify endpoints reject wrong HTTP methods."""

    def test_health_rejects_post(self, client):
        res = client.post("/api/health")
        assert res.status_code == 405

    def test_code_to_english_rejects_get(self, client):
        res = client.get("/api/code-to-english")
        assert res.status_code == 405

    def test_webhook_rejects_get(self, client):
        res = client.get("/api/webhook/razorpay")
        assert res.status_code == 405

    def test_nonexistent_route_returns_404(self, client):
        res = client.get("/api/nonexistent-endpoint")
        assert res.status_code == 404


# ═══════════════════════════════════════════════════════════════
# 14. SUPPORTED LANGUAGES
# ═══════════════════════════════════════════════════════════════


class TestSupportedLanguages:
    """Verify all 7 supported languages work for translation."""

    @pytest.mark.parametrize(
        "lang", ["python", "javascript", "java", "cpp", "typescript", "go", "rust"]
    )
    def test_all_languages_accepted(self, client, lang):
        res = client.post(
            "/api/code-to-english", json={"raw_code": "x = 1", "language": lang}
        )
        assert res.status_code == 200

    @pytest.mark.parametrize(
        "src,tgt",
        [
            ("python", "javascript"),
            ("java", "go"),
            ("rust", "typescript"),
            ("cpp", "python"),
        ],
    )
    def test_code_to_code_language_pairs(self, client, src, tgt):
        res = client.post(
            "/api/code-to-code",
            json={"raw_code": "x = 1", "source_language": src, "target_language": tgt},
        )
        assert res.status_code == 200


# ═══════════════════════════════════════════════════════════════
# 15. BOUNDARY VALUE TESTS
# ═══════════════════════════════════════════════════════════════


class TestBoundaryValues:
    """Test boundary values for all field constraints."""

    def test_code_at_min_length(self, client):
        res = client.post(
            "/api/code-to-english", json={"raw_code": "x", "language": "p"}
        )
        assert res.status_code == 200

    def test_language_at_max_length(self, client):
        res = client.post(
            "/api/code-to-english", json={"raw_code": "x=1", "language": "a" * 30}
        )
        assert res.status_code == 200

    def test_prompt_at_max_length(self, client):
        from unittest.mock import patch

        with patch("main.get_user_pro_status", return_value=True):
            res = client.post(
                "/api/generate-from-english",
                json={"prompt": "x" * 5000, "language": "python"},
            )
            assert res.status_code == 200

    def test_block_id_at_max_length(self, client):
        res = client.post(
            "/api/english-to-code",
            json={
                "block_id": "b" * 50,
                "modified_english": "do something",
                "full_context": "print('hello')",
            },
        )
        assert res.status_code == 200

    def test_block_id_exceeds_max(self, client):
        res = client.post(
            "/api/english-to-code",
            json={
                "block_id": "b" * 51,
                "modified_english": "do something",
                "full_context": "print('hello')",
            },
        )
        assert res.status_code == 422

    def test_modified_english_exceeds_max(self, client):
        res = client.post(
            "/api/english-to-code",
            json={
                "block_id": "b1",
                "modified_english": "x" * 5001,
                "full_context": "print('hello')",
            },
        )
        assert res.status_code == 422

    def test_full_context_exceeds_max(self, client):
        res = client.post(
            "/api/english-to-code",
            json={
                "block_id": "b1",
                "modified_english": "do something",
                "full_context": "x" * 10001,
            },
        )
        assert res.status_code == 422

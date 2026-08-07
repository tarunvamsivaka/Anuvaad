"""
scripts/verify_m1_adversarial.py

Adversarial stress-testing script for Milestone 1:
- Guest IP rate limit (5/day)
- Free user daily limit (25/day)
- Structured 429 JSON response payload format & Retry-After header
- TPM / RPM rate limit structured responses
- LLM primary model 429 / rate limit failover to llama-3.1-8b-instant
"""

import asyncio
import os
import sys
from unittest.mock import AsyncMock, MagicMock, patch

# Ensure app is in Python path
sys.path.insert(0, os.path.abspath("."))

from fastapi import HTTPException, Request

from app.core.quota import (
    check_and_track_groq_limits,
    enforce_quotas_and_protection,
)
from app.domain.quota.policy import compute_quota_policy
from app.services.ai import get_completion

results = []

def record(test_name: str, passed: bool, details: str):
    status = "PASS" if passed else "FAIL"
    results.append({"test": test_name, "status": status, "details": details})
    print(f"[{status}] {test_name}: {details}")

async def test_policy_defaults():
    print("\n--- Testing Quota Policy Defaults ---")
    p_guest = compute_quota_policy(is_pro=False, is_admin=False, is_guest=True, mode="NORMAL")
    if p_guest.daily_limit == 5 and p_guest.char_limit == 4000:
        record("Policy Guest Defaults", True, f"daily_limit={p_guest.daily_limit}, char_limit={p_guest.char_limit}")
    else:
        record("Policy Guest Defaults", False, f"Expected 5/4000, got {p_guest.daily_limit}/{p_guest.char_limit}")

    # Note: policy for free user uses os.getenv("LIMIT_FREE_DAILY", "25")
    with patch.dict(os.environ, {"LIMIT_FREE_DAILY": "25"}):
        p_free = compute_quota_policy(is_pro=False, is_admin=False, is_guest=False, mode="NORMAL")
        if p_free.daily_limit == 25 and p_free.char_limit == 4000:
            record("Policy Free User Defaults", True, f"daily_limit={p_free.daily_limit}, char_limit={p_free.char_limit}")
        else:
            record("Policy Free User Defaults", False, f"Expected 25/4000, got {p_free.daily_limit}/{p_free.char_limit}")

async def test_guest_rate_limiting_adversarial():
    print("\n--- Testing Guest Rate Limiting (5/day) & 429 Payload ---")
    req = MagicMock(spec=Request)
    req.client.host = "203.0.113.195"
    req.headers = {}

    # Simulate 5 requests within limit
    with patch("app.core.quota.cache.incr_rate_limit", new_callable=AsyncMock, return_value=5):
        try:
            is_pro, daily_limit, deduct, cooldown = await enforce_quotas_and_protection(req, email=None, char_count=500)
            record("Guest Request #5 (Within Limit)", True, f"Allowed. daily_limit={daily_limit}")
        except HTTPException as e:
            record("Guest Request #5 (Within Limit)", False, f"Unexpected exception: {e}")

    # Simulate 6th request (Exceeding limit)
    with patch("app.core.quota.cache.incr_rate_limit", new_callable=AsyncMock, return_value=6):
        try:
            await enforce_quotas_and_protection(req, email=None, char_count=500)
            record("Guest Request #6 (Exceeding Limit)", False, "Failed to raise HTTPException 429!")
        except HTTPException as exc:
            if exc.status_code == 429:
                detail = exc.detail
                headers = exc.headers
                valid_detail = (
                    isinstance(detail, dict)
                    and detail.get("limit_type") == "guest_daily_limit"
                    and detail.get("tier_limit") == 5
                    and detail.get("retry_after_seconds") == 86400
                    and "detail" in detail
                )
                valid_headers = "Retry-After" in headers and headers["Retry-After"] == "86400"
                if valid_detail and valid_headers:
                    record("Guest 429 Structured Response Payload & Header", True, f"Payload={detail}, Headers={headers}")
                else:
                    record("Guest 429 Response Format", False, f"Invalid payload or headers: Payload={detail}, Headers={headers}")
            else:
                record("Guest Request #6 Status Code", False, f"Expected 429, got {exc.status_code}")

async def test_free_user_rate_limiting_adversarial():
    print("\n--- Testing Free User Account Rate Limiting (25/day) & 429 Payload ---")
    req = MagicMock(spec=Request)
    req.headers = {}

    with patch.dict(os.environ, {"LIMIT_FREE_DAILY": "25"}):
        # User within 25 limit
        with (
            patch("app.core.quota.get_user_pro_status", new_callable=AsyncMock, return_value=False),
            patch("app.core.quota.increment_today_usage_count", new_callable=AsyncMock, return_value=25),
            patch("app.core.quota.get_user_credits", new_callable=AsyncMock, return_value=0),
        ):
            try:
                is_pro, daily_limit, deduct, cooldown = await enforce_quotas_and_protection(req, email="test_free@example.com", char_count=500)
                record("Free User Request #25 (Within Limit)", True, f"Allowed. daily_limit={daily_limit}")
            except HTTPException as e:
                record("Free User Request #25 (Within Limit)", False, f"Unexpected exception: {e}")

        # User at 26th request (Exceeding limit with 0 credits)
        with (
            patch("app.core.quota.get_user_pro_status", new_callable=AsyncMock, return_value=False),
            patch("app.core.quota.increment_today_usage_count", new_callable=AsyncMock, return_value=26),
            patch("app.core.quota.get_user_credits", new_callable=AsyncMock, return_value=0),
        ):
            try:
                await enforce_quotas_and_protection(req, email="test_free@example.com", char_count=500)
                record("Free User Request #26 (Exceeding Limit)", False, "Failed to raise HTTPException 429!")
            except HTTPException as exc:
                if exc.status_code == 429:
                    detail = exc.detail
                    headers = exc.headers
                    valid_detail = (
                        isinstance(detail, dict)
                        and detail.get("limit_type") == "user_daily_limit"
                        and detail.get("tier_limit") == 25
                        and detail.get("retry_after_seconds") == 86400
                        and "detail" in detail
                    )
                    valid_headers = "Retry-After" in headers and headers["Retry-After"] == "86400"
                    if valid_detail and valid_headers:
                        record("Free User 429 Structured Response Payload & Header", True, f"Payload={detail}, Headers={headers}")
                    else:
                        record("Free User 429 Response Format", False, f"Invalid payload or headers: Payload={detail}, Headers={headers}")
                else:
                    record("Free User Request #26 Status Code", False, f"Expected 429, got {exc.status_code}")

async def test_groq_tpm_rpm_limits():
    print("\n--- Testing Groq TPM/RPM Rate Limits ---")
    with patch.dict(os.environ, {"GROQ_MAX_TPM": "100"}):
        with patch("app.core.quota.cache.incr_rate_limit_by", new_callable=AsyncMock, return_value=150):
            try:
                await check_and_track_groq_limits("x" * 1000, expected_output_tokens=1500)
                record("Groq TPM Exceeded", False, "Failed to raise 429")
            except HTTPException as exc:
                if exc.status_code == 429 and exc.detail.get("limit_type") == "tpm_limit":
                    record("Groq TPM Structured 429 Payload", True, f"{exc.detail}")
                else:
                    record("Groq TPM Structured 429 Payload", False, f"Got {exc.detail}")

    with patch.dict(os.environ, {"GROQ_MAX_RPM": "100"}):
        with patch("app.core.quota.cache.incr_rate_limit", new_callable=AsyncMock, return_value=101):
            try:
                await check_and_track_groq_limits("print('hello')", expected_output_tokens=10)
                record("Groq RPM Exceeded", False, "Failed to raise 429")
            except HTTPException as exc:
                if exc.status_code == 429 and exc.detail.get("limit_type") == "rpm_limit":
                    record("Groq RPM Structured 429 Payload", True, f"{exc.detail}")
                else:
                    record("Groq RPM Structured 429 Payload", False, f"Got {exc.detail}")

async def test_model_failover_adversarial():
    print("\n--- Testing Model Failover on Primary 429 Error ---")
    mock_primary_client = AsyncMock()

    mock_fallback_response = MagicMock()
    mock_fallback_response.choices = [
        MagicMock(message=MagicMock(content='{"blocks":[{"id":"b1","code_snippet":"x=1","english_translation":"Sets x to 1"}]}'))
    ]

    # Primary call raises 429 RateLimitError, fallback call succeeds
    mock_primary_client.chat.completions.create.side_effect = [
        Exception("429 RateLimitError: Groq primary model rate limit reached"),
        mock_fallback_response
    ]

    with (
        patch.dict(os.environ, {"GROQ_API_KEY": "gsk_test_key"}),
        patch("app.services.ai.check_and_track_groq_limits", new_callable=AsyncMock),
        patch("app.services.ai._get_groq_client", return_value=mock_primary_client),
    ):
        try:
            res_text, model_name = await get_completion(
                prompt="x = 1",
                system_instruction="Analyze code",
                mode="explanation",
                response_format="json_object",
                use_r1=False,
            )
            if "llama-3.1-8b-instant" in mock_primary_client.chat.completions.create.call_args_list[1].kwargs.get("model", ""):
                record("Model Failover to llama-3.1-8b-instant", True, f"Successfully fell back to model: {model_name}")
            else:
                record("Model Failover to llama-3.1-8b-instant", False, f"Called different model: {mock_primary_client.chat.completions.create.call_args_list}")
        except Exception as exc:
            record("Model Failover to llama-3.1-8b-instant", False, f"Failover threw unhandled exception: {exc}")

async def main():
    await test_policy_defaults()
    await test_guest_rate_limiting_adversarial()
    await test_free_user_rate_limiting_adversarial()
    await test_groq_tpm_rpm_limits()
    await test_model_failover_adversarial()

    print("\n================ SUMMARY ================")
    passed_count = sum(1 for r in results if r["status"] == "PASS")
    total_count = len(results)
    print(f"Passed: {passed_count}/{total_count}")
    if passed_count < total_count:
        print("FAILURES:")
        for r in results:
            if r["status"] == "FAIL":
                print(f"  - {r['test']}: {r['details']}")

if __name__ == "__main__":
    asyncio.run(main())

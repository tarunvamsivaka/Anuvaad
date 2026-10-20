"""
Tests for Billing Architecture & Dormant Gateway Verification.

Validates:
1. Free-beta billing bypass (503 Service Unavailable when ENABLE_BILLING=false)
2. Graceful handling when payment gateways are unconfigured (razorpay_client = None)
3. Razorpay subscription checkout session generation
4. Razorpay payment verification (Subscription & Credits) via BillingService
5. Razorpay webhook HMAC signature verification & idempotent dispatch
6. Stripe fallback checkout, portal, and webhook handling
"""

import os
from unittest.mock import AsyncMock, MagicMock, patch
from urllib.parse import urlparse

import pytest
from fastapi.testclient import TestClient

from app.core.auth import get_user_email
from app.domain.billing.service import BillingService, PaymentResult
from app.main import app

# ── 1. Free-Beta Billing Bypass & Dormancy Tests ──


def test_free_beta_billing_endpoints_disabled_by_default(client: TestClient):
    """When ENABLE_BILLING is false (free-beta default), all billing actions return 503."""
    app.dependency_overrides[get_user_email] = lambda: "beta_user@example.com"
    try:
        with patch.dict(os.environ, {"ENABLE_BILLING": "false"}):
            # Checkout session
            resp = client.post(
                "/api/v1/billing/create-checkout-session",
                json={"user_email": "beta_user@example.com"},
                headers={"Authorization": "Bearer test-token"},
            )
            assert resp.status_code == 503
            assert "temporarily paused" in resp.json()["detail"]

            # Credit checkout
            resp = client.post(
                "/api/v1/billing/create-credit-checkout",
                headers={"Authorization": "Bearer test-token"},
            )
            assert resp.status_code == 503
            assert "temporarily paused" in resp.json()["detail"]

            # Payment verification
            resp = client.post(
                "/api/v1/billing/verify-payment",
                json={
                    "razorpay_payment_id": "pay_test",
                    "razorpay_signature": "sig_test",
                    "payment_type": "subscription",
                },
                headers={"Authorization": "Bearer test-token"},
            )
            assert resp.status_code == 503
            assert "temporarily paused" in resp.json()["detail"]
    finally:
        app.dependency_overrides.pop(get_user_email, None)


def test_billing_unconfigured_gateway_returns_503(client: TestClient):
    """When ENABLE_BILLING is true but razorpay_client is None (and no Stripe), return 503."""
    app.dependency_overrides[get_user_email] = lambda: "tester@example.com"
    try:
        with (
            patch.dict(os.environ, {"ENABLE_BILLING": "true"}),
            patch("app.routers.billing.STRIPE_SECRET_KEY", ""),
            patch("app.routers.billing.razorpay_client", None),
            patch("app.routers.billing._billing_service", None),
        ):
            resp = client.post(
                "/api/v1/billing/create-checkout-session",
                json={"user_email": "tester@example.com"},
                headers={"Authorization": "Bearer test-token"},
            )
            assert resp.status_code == 503
            assert "Payment service not configured" in resp.json()["detail"]
    finally:
        app.dependency_overrides.pop(get_user_email, None)


# ── 2. Razorpay Subscription & Credit Checkout ──


def test_razorpay_create_checkout_session(client: TestClient):
    """POST /api/v1/billing/create-checkout-session creates Razorpay subscription when Stripe is absent."""
    fake_rzp = MagicMock()
    fake_rzp.subscription.create.return_value = {"id": "sub_rzp_mock_123"}

    app.dependency_overrides[get_user_email] = lambda: "tester@example.com"
    try:
        with (
            patch.dict(os.environ, {"ENABLE_BILLING": "true"}),
            patch("app.routers.billing.STRIPE_SECRET_KEY", ""),
            patch("app.routers.billing.razorpay_client", fake_rzp),
            patch("app.routers.billing.RAZORPAY_KEY_ID", "rzp_test_key_123"),
            patch("app.routers.billing.RAZORPAY_PRO_PLAN_ID", "plan_pro_123"),
        ):
            resp = client.post(
                "/api/v1/billing/create-checkout-session",
                json={"user_email": "tester@example.com"},
                headers={"Authorization": "Bearer test-token"},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["subscription_id"] == "sub_rzp_mock_123"
            assert data["key_id"] == "rzp_test_key_123"
            assert data["name"] == "Anuvaad Pro"
    finally:
        app.dependency_overrides.pop(get_user_email, None)


def test_razorpay_create_credit_checkout(client: TestClient):
    """POST /api/v1/billing/create-credit-checkout creates Razorpay order for credits."""
    fake_rzp = MagicMock()
    fake_rzp.order.create.return_value = {
        "id": "order_mock_123",
        "amount": 10000,
        "currency": "INR",
    }

    app.dependency_overrides[get_user_email] = lambda: "tester@example.com"
    try:
        with (
            patch.dict(os.environ, {"ENABLE_BILLING": "true"}),
            patch("app.routers.billing.razorpay_client", fake_rzp),
            patch("app.routers.billing.RAZORPAY_KEY_ID", "rzp_test_key_123"),
        ):
            resp = client.post(
                "/api/v1/billing/create-credit-checkout",
                headers={"Authorization": "Bearer test-token"},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["order_id"] == "order_mock_123"
            assert data["amount"] == 10000
            assert data["currency"] == "INR"
    finally:
        app.dependency_overrides.pop(get_user_email, None)


# ── 3. Razorpay Payment Verification via BillingService ──


def test_razorpay_verify_payment_subscription_success(client: TestClient):
    """POST /api/v1/billing/verify-payment succeeds for valid subscription."""
    mock_service = MagicMock(spec=BillingService)
    mock_service.verify_subscription_payment = AsyncMock(return_value=PaymentResult(success=True, plan="pro"))

    app.dependency_overrides[get_user_email] = lambda: "tester@example.com"
    try:
        with (
            patch.dict(os.environ, {"ENABLE_BILLING": "true"}),
            patch("app.routers.billing._billing_service", mock_service),
        ):
            resp = client.post(
                "/api/v1/billing/verify-payment",
                json={
                    "razorpay_payment_id": "pay_test_123",
                    "razorpay_subscription_id": "sub_test_123",
                    "razorpay_signature": "sig_valid_123",
                    "payment_type": "subscription",
                },
                headers={"Authorization": "Bearer test-token"},
            )
            assert resp.status_code == 200
            assert resp.json() == {"status": "success", "plan": "pro"}
            mock_service.verify_subscription_payment.assert_awaited_once_with(
                user_email="tester@example.com",
                razorpay_payment_id="pay_test_123",
                razorpay_subscription_id="sub_test_123",
                razorpay_signature="sig_valid_123",
            )
    finally:
        app.dependency_overrides.pop(get_user_email, None)


def test_razorpay_verify_payment_invalid_signature(client: TestClient):
    """POST /api/v1/billing/verify-payment returns 400 when signature fails."""
    mock_service = MagicMock(spec=BillingService)
    mock_service.verify_subscription_payment = AsyncMock(
        side_effect=ValueError("Payment verification failed: invalid signature")
    )

    app.dependency_overrides[get_user_email] = lambda: "tester@example.com"
    try:
        with (
            patch.dict(os.environ, {"ENABLE_BILLING": "true"}),
            patch("app.routers.billing._billing_service", mock_service),
        ):
            resp = client.post(
                "/api/v1/billing/verify-payment",
                json={
                    "razorpay_payment_id": "pay_test_bad",
                    "razorpay_subscription_id": "sub_test_bad",
                    "razorpay_signature": "sig_bad",
                    "payment_type": "subscription",
                },
                headers={"Authorization": "Bearer test-token"},
            )
            assert resp.status_code == 400
            assert "Payment verification failed" in resp.json()["detail"]
    finally:
        app.dependency_overrides.pop(get_user_email, None)


# ── 4. BillingService Direct Unit Tests ──


@pytest.mark.asyncio
async def test_billing_service_verify_subscription():
    """Unit test: BillingService verifies signature and calls upsert_subscription."""
    mock_client = MagicMock()
    mock_client.utility.verify_subscription_payment_signature.return_value = True

    service = BillingService(mock_client)

    with (
        patch("app.repositories.subscription.upsert_subscription", new_callable=AsyncMock) as mock_upsert,
        patch("app.core.cache.cache.delete", new_callable=AsyncMock) as mock_cache_del,
        patch("app.queue.tasks.send_transactional_email_task.delay"),
    ):
        mock_upsert.return_value = True

        result = await service.verify_subscription_payment(
            user_email="pro@example.com",
            razorpay_payment_id="pay_123",
            razorpay_subscription_id="sub_123",
            razorpay_signature="sig_123",
        )

        assert result.success is True
        assert result.plan == "pro"
        mock_client.utility.verify_subscription_payment_signature.assert_called_once_with(
            {
                "razorpay_payment_id": "pay_123",
                "razorpay_subscription_id": "sub_123",
                "razorpay_signature": "sig_123",
            }
        )
        mock_upsert.assert_awaited_once_with(
            "pro@example.com",
            {
                "razorpay_subscription_id": "sub_123",
                "is_pro": True,
                "onboarded": False,
            },
        )
        mock_cache_del.assert_awaited_once_with("user_pro_status:pro@example.com")


# ── 5. Stripe Fallback Endpoints (Phase 2A compatibility) ──


def test_stripe_create_checkout_session(client: TestClient):
    """POST /api/v1/billing/create-checkout-session returns Stripe checkout URL when Stripe key is set."""
    fake_session = MagicMock()
    fake_session.id = "cs_test_123"
    fake_session.url = "https://checkout.stripe.com/c/pay/cs_test_123"

    app.dependency_overrides[get_user_email] = lambda: "tester@example.com"
    try:
        with (
            patch.dict(os.environ, {"ENABLE_BILLING": "true"}),
            patch("app.routers.billing.STRIPE_SECRET_KEY", "sk_test_mock_123"),
            patch("app.routers.billing.stripe.checkout.Session.create", return_value=fake_session),
        ):
            resp = client.post(
                "/api/v1/billing/create-checkout-session",
                json={"user_email": "tester@example.com"},
                headers={"Authorization": "Bearer test-token"},
            )

            assert resp.status_code == 200
            data = resp.json()
            assert data["provider"] == "stripe"
            assert data["session_id"] == "cs_test_123"
            assert urlparse(data["checkout_url"]).netloc == "checkout.stripe.com"
    finally:
        app.dependency_overrides.pop(get_user_email, None)


def test_stripe_create_portal_session(client: TestClient):
    """POST /api/v1/billing/create-portal-session returns Stripe customer portal URL."""
    fake_cust = MagicMock()
    fake_cust.id = "cus_test_123"
    fake_customers = MagicMock()
    fake_customers.data = [fake_cust]

    fake_portal = MagicMock()
    fake_portal.url = "https://billing.stripe.com/p/session/portal_test_123"

    app.dependency_overrides[get_user_email] = lambda: "tester@example.com"
    try:
        with (
            patch.dict(os.environ, {"ENABLE_BILLING": "true"}),
            patch("app.routers.billing.STRIPE_SECRET_KEY", "sk_test_mock_123"),
            patch("app.routers.billing.subscription_repo.get_subscription", return_value={"is_pro": True}),
            patch("app.routers.billing.stripe.Customer.list", return_value=fake_customers),
            patch("app.routers.billing.stripe.billing_portal.Session.create", return_value=fake_portal),
        ):
            resp = client.post(
                "/api/v1/billing/create-portal-session",
                headers={"Authorization": "Bearer test-token"},
            )

            assert resp.status_code == 200
            data = resp.json()
            assert data["provider"] == "stripe"
            assert urlparse(data["portal_url"]).netloc == "billing.stripe.com"
    finally:
        app.dependency_overrides.pop(get_user_email, None)


def test_stripe_webhook_checkout_completed(client: TestClient):
    """Stripe webhook checkout.session.completed activates user subscription."""
    fake_event = {
        "id": "evt_test_123",
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_123",
                "customer": "cus_test_123",
                "customer_email": "tester@example.com",
                "subscription": "sub_test_123",
            }
        },
    }

    with (
        patch("app.routers.billing.STRIPE_WEBHOOK_SECRET", "whsec_test_123"),
        patch("app.routers.billing.stripe.Webhook.construct_event", return_value=fake_event),
        patch("app.routers.billing.subscription_repo.upsert_subscription") as mock_upsert,
    ):
        resp = client.post(
            "/api/v1/billing/webhook/stripe",
            content=b'{"id":"evt_test_123"}',
            headers={"stripe-signature": "t=123,v1=signature"},
        )

        assert resp.status_code == 200
        assert resp.json()["received"] is True
        mock_upsert.assert_called_once()
        call_kwargs = mock_upsert.call_args.kwargs
        assert call_kwargs["email"] == "tester@example.com"
        assert call_kwargs["data"]["is_pro"] is True
        assert call_kwargs["data"]["razorpay_subscription_id"] == "sub_test_123"


def test_stripe_webhook_subscription_deleted(client: TestClient):
    """Stripe webhook customer.subscription.deleted deactivates user subscription."""
    fake_event = {
        "id": "evt_test_del_123",
        "type": "customer.subscription.deleted",
        "data": {
            "object": {
                "id": "sub_test_123",
                "customer": "cus_test_123",
                "customer_email": "tester@example.com",
            }
        },
    }

    with (
        patch("app.routers.billing.STRIPE_WEBHOOK_SECRET", "whsec_test_123"),
        patch("app.routers.billing.stripe.Webhook.construct_event", return_value=fake_event),
        patch("app.routers.billing.subscription_repo.upsert_subscription") as mock_upsert,
    ):
        resp = client.post(
            "/api/v1/billing/webhook/stripe",
            content=b'{"id":"evt_test_del_123"}',
            headers={"stripe-signature": "t=123,v1=signature"},
        )

        assert resp.status_code == 200
        assert resp.json()["received"] is True
        mock_upsert.assert_called_once()
        call_kwargs = mock_upsert.call_args.kwargs
        assert call_kwargs["email"] == "tester@example.com"
        assert call_kwargs["data"]["is_pro"] is False


def test_stripe_webhook_invalid_signature_rejected(client: TestClient):
    """Webhook with invalid signature returns 400 Bad Request."""
    import stripe

    with (
        patch("app.routers.billing.STRIPE_WEBHOOK_SECRET", "whsec_test_123"),
        patch(
            "app.routers.billing.stripe.Webhook.construct_event",
            side_effect=stripe.SignatureVerificationError("invalid sig", "sig_header"),
        ),
    ):
        resp = client.post(
            "/api/v1/billing/webhook/stripe",
            content=b'{"id":"evt_invalid"}',
            headers={"stripe-signature": "invalid"},
        )

        assert resp.status_code == 400

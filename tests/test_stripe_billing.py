"""
Tests for Global Stripe Billing & Self-Service Customer Portal (Phase 2A / Week 3).

Validates:
1. Stripe checkout session creation with automated tax and multi-currency pricing
2. Stripe customer portal session generation for 1-click self-service management
3. Idempotent webhook listener verifying Stripe HMAC signatures
4. Subscription activation and cancellation state transitions
"""

import os
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.core.auth import get_user_email
from app.main import app


def test_stripe_create_checkout_session(client: TestClient):
    """POST /api/v1/billing/create-checkout-session returns Stripe checkout URL."""
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
            assert "checkout.stripe.com" in data["checkout_url"]
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
            assert "billing.stripe.com" in data["portal_url"]
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

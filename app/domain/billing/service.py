"""
app/domain/billing/service.py

BillingService — orchestrates payment verification and subscription state transitions.

Responsibility boundary:
  • Verifies Razorpay signatures (delegates to razorpay SDK)
  • Writes subscription state via the typed subscription repository
  • Dispatches transactional emails via Celery tasks
  • Returns structured results — does NOT raise HTTPException (that's the router's job)

The billing router (app/routers/billing.py) is now a thin HTTP adapter that
calls this service and maps results to HTTP responses.
"""
from __future__ import annotations

from dataclasses import dataclass
from app.core.config import logger
from app.repositories import subscription as subscription_repo


@dataclass
class PaymentResult:
    """Result returned from BillingService verification methods."""
    success: bool
    plan: str | None = None
    credits_added: int | None = None
    error: str | None = None


class BillingService:
    """Orchestrates Razorpay payment verification and subscription management.

    Accepts the razorpay_client at construction time — this makes the service
    testable without touching global state.
    """

    def __init__(self, razorpay_client):
        self._client = razorpay_client

    async def verify_subscription_payment(
        self,
        *,
        user_email: str,
        razorpay_payment_id: str,
        razorpay_subscription_id: str,
        razorpay_signature: str,
    ) -> PaymentResult:
        """Verify a Razorpay subscription payment and activate Pro status.

        Raises ValueError with a descriptive message on signature failure.
        Returns PaymentResult on success.
        """
        # 1. Verify HMAC signature
        try:
            self._client.utility.verify_subscription_payment_signature({
                "razorpay_payment_id": razorpay_payment_id,
                "razorpay_subscription_id": razorpay_subscription_id,
                "razorpay_signature": razorpay_signature,
            })
        except Exception as e:
            logger.warning(f"BillingService: subscription signature failed for {user_email}: {e}")
            raise ValueError("Payment verification failed: invalid signature")

        # 2. Upsert subscription row (BUG#2 FIX: never blindly INSERT)
        ok = await subscription_repo.upsert_subscription(
            user_email,
            {
                "razorpay_subscription_id": razorpay_subscription_id,
                "is_pro": True,
                "onboarded": False,
            },
        )
        if not ok:
            raise RuntimeError(f"Failed to persist subscription for {user_email}")

        # 3. Invalidate Pro status cache so the upgrade is visible immediately (FRONT-08)
        from app.core.cache import cache
        await cache.delete(f"user_pro_status:{user_email}")

        # 4. Dispatch email notification (non-blocking Celery task)
        try:
            from app.queue.tasks import send_transactional_email_task
            send_transactional_email_task.delay(
                "subscription_upgrade", user_email=user_email, plan_name="pro"
            )
        except Exception as e:
            logger.warning(f"BillingService: failed to dispatch upgrade email: {e}")

        logger.info(f"✅ Subscription verified & activated: {user_email}")
        return PaymentResult(success=True, plan="pro")

    async def verify_credit_payment(
        self,
        *,
        user_email: str,
        razorpay_order_id: str,
        razorpay_payment_id: str,
        razorpay_signature: str,
        credit_amount: int = 100,
    ) -> PaymentResult:
        """Verify a Razorpay one-time credit purchase and top up the user's balance.

        Raises ValueError on signature failure.
        Returns PaymentResult on success.
        """
        # 1. Verify HMAC signature
        try:
            self._client.utility.verify_payment_signature({
                "razorpay_order_id": razorpay_order_id,
                "razorpay_payment_id": razorpay_payment_id,
                "razorpay_signature": razorpay_signature,
            })
        except Exception as e:
            logger.warning(f"BillingService: credit signature failed for {user_email}: {e}")
            raise ValueError("Payment verification failed: invalid signature")

        # 2. Atomically add credits
        ok = await subscription_repo.add_credits(user_email, credit_amount)
        if not ok:
            raise RuntimeError(f"Failed to add credits for {user_email}")

        logger.info(f"💰 Credits verified & added: {user_email} (+{credit_amount})")
        return PaymentResult(success=True, credits_added=credit_amount)

    async def get_subscription_info(self, user_email: str) -> dict | None:
        """Return the user's subscription row, or None if not found."""
        return await subscription_repo.get_subscription(user_email)

    async def get_credits(self, user_email: str) -> int:
        """Return the current credit balance for a user."""
        return await subscription_repo.get_credits(user_email)


__all__ = ["BillingService", "PaymentResult"]

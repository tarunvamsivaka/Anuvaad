"""
app/routers/billing.py — HTTP adapter for billing operations.

This router is intentionally thin: it handles authentication, validates inputs,
delegates all business logic to BillingService, and maps results to HTTP responses.

Business logic (signature verification, DB writes, email dispatch) lives in:
  app/domain/billing/service.py
"""
import json
import os

import razorpay
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse

from app.core.auth import get_user_email
from app.core.cache import cache
from app.core.config import RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, logger
from app.domain.billing.service import BillingService
from app.models.schemas import CheckoutPayload, VerifyPaymentPayload
from app.queue.tasks import process_billing_webhook_task
from app.repositories import subscription as subscription_repo

router = APIRouter(prefix="", tags=["billing"])

RAZORPAY_PRO_PLAN_ID = os.getenv("RAZORPAY_PRO_PLAN_ID", "")
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")

if RAZORPAY_KEY_ID and not RAZORPAY_KEY_ID.startswith("rzp_test_your"):
    razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
    logger.info("Razorpay configured in billing router")
else:
    razorpay_client = None
    logger.info("Razorpay not configured (Pro tier disabled) in billing router")

#: Shared service instance — created once at module load
_billing_service: BillingService | None = (
    BillingService(razorpay_client) if razorpay_client else None
)


def _get_service() -> BillingService:
    if _billing_service is None:
        raise HTTPException(status_code=503, detail="Payment service not configured.")
    return _billing_service


def enforce_billing_enabled():
    if os.getenv("ENABLE_BILLING", "false").lower() != "true":
        raise HTTPException(
            status_code=503,
            detail="Billing and payment registration are temporarily paused. Enjoy the complimentary free tier!",
        )


# ── Checkout ──

@router.post("/create-checkout-session")
async def create_checkout_session(
    payload: CheckoutPayload,
    user_email: str | None = Depends(get_user_email),
):
    """Create a Razorpay subscription checkout.
    BACK-06: Auth via Authorization header (Depends), not request body access_token.
    """
    enforce_billing_enabled()
    if not razorpay_client:
        raise HTTPException(status_code=503, detail="Payment service not configured.")
    if not user_email:
        raise HTTPException(status_code=401, detail="Authentication required.")
    if user_email.lower() != payload.user_email.lower():
        raise HTTPException(status_code=403, detail="Email mismatch: token does not belong to this user.")

    try:
        subscription = razorpay_client.subscription.create({
            "plan_id": RAZORPAY_PRO_PLAN_ID,
            "total_count": 12,
            "quantity": 1,
            "customer_notify": 1,
            "notes": {"user_email": user_email},
        })
        return {
            "subscription_id": subscription["id"],
            "key_id": RAZORPAY_KEY_ID,
            "name": "Anuvaad Pro",
            "description": "Unlimited translations · DeepSeek R1 · Priority processing",
        }
    except Exception as e:
        logger.error(f"Razorpay subscription creation error: {e}")
        raise HTTPException(status_code=500, detail="Payment session creation failed.")


@router.post("/create-portal-session")
async def create_portal_session(
    user_email: str | None = Depends(get_user_email),
):
    """Return the user's active Razorpay subscription details for self-service management."""
    enforce_billing_enabled()
    if not user_email:
        raise HTTPException(status_code=401, detail="Authentication required")

    sub = await subscription_repo.get_subscription(user_email)
    if not sub or not sub.get("is_pro"):
        raise HTTPException(status_code=404, detail="No active Pro subscription found.")

    return {
        "subscription_id": sub.get("razorpay_subscription_id", ""),
        "plan": "pro",
        "status": "active",
        "message": "To cancel your subscription, email support@anuvaad.dev with your subscription ID.",
    }


@router.post("/create-credit-checkout")
async def create_credit_checkout(
    user_email: str | None = Depends(get_user_email),
):
    """Create a Razorpay one-time order for buying 100 translation credits (₹100)."""
    enforce_billing_enabled()
    if not razorpay_client:
        raise HTTPException(status_code=503, detail="Payment service not configured.")
    if not user_email:
        raise HTTPException(status_code=401, detail="Authentication required")

    try:
        order = razorpay_client.order.create({
            "amount": 10000,
            "currency": "INR",
            "notes": {"type": "credits", "amount": 100, "user_email": user_email},
        })
        return {
            "order_id": order["id"],
            "amount": order["amount"],
            "currency": order["currency"],
            "key_id": RAZORPAY_KEY_ID,
            "name": "Anuvaad Translation Credits",
            "description": "100 Translation Credits — never expire",
        }
    except Exception as e:
        logger.error(f"Razorpay order creation error: {e}")
        raise HTTPException(status_code=500, detail="Could not create checkout session")


# ── Payment Verification ──

@router.post("/verify-payment")
async def verify_payment(
    payload: VerifyPaymentPayload,
    user_email: str | None = Depends(get_user_email),
):
    """Verify Razorpay HMAC signature then activate Pro or top up credits.
    Delegates all business logic to BillingService.
    """
    enforce_billing_enabled()
    if not user_email:
        raise HTTPException(status_code=401, detail="Authentication required")

    service = _get_service()
    try:
        if payload.payment_type == "subscription":
            result = await service.verify_subscription_payment(
                user_email=user_email,
                razorpay_payment_id=payload.razorpay_payment_id,
                razorpay_subscription_id=payload.razorpay_subscription_id or "",
                razorpay_signature=payload.razorpay_signature,
            )
            return {"status": "success", "plan": result.plan}
        else:  # credits
            result = await service.verify_credit_payment(
                user_email=user_email,
                razorpay_order_id=payload.razorpay_order_id or "",
                razorpay_payment_id=payload.razorpay_payment_id,
                razorpay_signature=payload.razorpay_signature,
            )
            return {"status": "success", "credits_added": result.credits_added}

    except (ValueError, RuntimeError) as e:
        logger.error(f"Payment verification failed for {user_email}: {e}")
        raise HTTPException(status_code=400, detail="Payment verification failed. Please contact support.")
    except Exception as e:
        logger.error(f"Unexpected billing error for {user_email}: {e}")
        raise HTTPException(status_code=400, detail="Payment verification failed. Please contact support.")


# ── Subscription Status & Credits ──

@router.get("/subscription-status")
async def get_subscription_status(
    email: str | None = Depends(get_user_email),
):
    """Return the user's current subscription plan.
    GET endpoint for SWR caching (P4: replaces the old POST version).
    """
    if not email:
        raise HTTPException(status_code=401, detail="Authentication required")

    sub = await subscription_repo.get_subscription(email)
    is_pro = bool(sub and sub.get("is_pro"))
    return {"plan": "pro" if is_pro else "free", "status": "active", "isPro": is_pro}


@router.get("/check-credits")
async def get_check_credits(
    email: str | None = Depends(get_user_email),
):
    """Return the user's current translation credit balance."""
    if not email:
        raise HTTPException(status_code=401, detail="Authentication required")

    credits = await subscription_repo.get_credits(email)
    return {"credits": credits}


# ── Webhook ──

@router.post("/webhook/razorpay")
async def razorpay_webhook(request: Request):
    """Handle Razorpay webhook events — validates signature, dispatches to Celery.

    FIX-22 (P2-05): Dual-layer idempotency:
      1. Cache layer (fast, 24h TTL) — handles high-frequency duplicate deliveries.
      2. DB layer (PaymentTransaction table) — survives cache restarts/flushes.
    This ensures we never double-activate a subscription even after a Redis restart.
    """
    if not RAZORPAY_WEBHOOK_SECRET:
        logger.error("RAZORPAY_WEBHOOK_SECRET is not set — rejecting webhook request.")
        return JSONResponse(status_code=503, content={"error": "Webhook endpoint not configured"})

    if not razorpay_client:
        logger.error("Razorpay client not configured — rejecting webhook request.")
        return JSONResponse(status_code=503, content={"error": "Razorpay not configured"})

    body = await request.body()
    signature = request.headers.get("x-razorpay-signature", "")
    event_id = request.headers.get("x-razorpay-event-id", "")

    # Layer 1: Cache-based idempotency (fast, O(1))
    if event_id:
        idempotency_key = f"webhook:idempotency:{event_id}"
        existing = await cache.get(idempotency_key)
        if existing:
            logger.info(f"Razorpay webhook: duplicate event {event_id} (cache hit) — skipping")
            return {"status": "duplicate", "message": "Event already processed"}

    # BACK-09: Verify signature BEFORE json.loads to prevent info leakage
    try:
        razorpay_client.utility.verify_webhook_signature(
            body.decode(), signature, RAZORPAY_WEBHOOK_SECRET
        )
    except Exception:
        logger.error("Razorpay webhook: invalid signature")
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    try:
        event = json.loads(body)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    # Layer 2: DB-backed idempotency (survives cache restart)
    if event_id:
        try:
            from sqlalchemy import select

            from app.core.database_session import AsyncSessionLocal
            from app.models.db_models import PaymentTransaction

            async with AsyncSessionLocal() as session:
                existing_tx = await session.execute(
                    select(PaymentTransaction).where(PaymentTransaction.event_id == event_id)
                )
                if existing_tx.scalars().first() is not None:
                    logger.info(f"Razorpay webhook: duplicate event {event_id} (DB hit) — skipping")
                    return {"status": "duplicate", "message": "Event already processed"}

                # Insert the record immediately to lock the event_id (unique constraint)
                session.add(PaymentTransaction(
                    event_id=event_id,
                    payload=event,
                    status="queued",
                ))
                try:
                    await session.commit()
                except Exception:
                    # Unique constraint violation — another process already claimed this event_id
                    logger.info(f"Razorpay webhook: concurrent duplicate for {event_id} — skipping")
                    return {"status": "duplicate", "message": "Event already processed"}

            # Now mark in cache so the fast path catches future duplicates
            idempotency_key = f"webhook:idempotency:{event_id}"
            await cache.put(idempotency_key, "1", ttl=86400)

        except Exception as db_err:
            logger.warning(f"DB idempotency check failed, falling back to cache-only: {db_err}")

    process_billing_webhook_task.delay(event_id=event_id, payload=event)
    return {"received": True}

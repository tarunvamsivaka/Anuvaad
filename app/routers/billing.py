"""
app/routers/billing.py — HTTP adapter for billing operations.

This router is intentionally thin: it handles authentication, validates inputs,
delegates all business logic to BillingService, and maps results to HTTP responses.

Business logic (signature verification, DB writes, email dispatch) lives in:
  app/domain/billing/service.py
"""

import asyncio
import json
import os
from datetime import datetime, timezone

import razorpay
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse

import app.compat  # noqa: F401
from app.core.auth import (
    get_client_ip,
    get_optional_user_email_from_request,
    get_user_email,
    get_user_pro_status,
)
from app.core.cache import cache
from app.core.config import (
    FRONTEND_URL,
    RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET,
    STRIPE_PRICE_ID_PRO,
    STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET,
    logger,
)
from app.core.quota import get_active_protection_mode, get_today_usage_count
from app.domain.billing.service import BillingService
from app.models.schemas import CheckoutPayload, VerifyPaymentPayload
from app.queue.tasks import process_billing_webhook_task
from app.repositories import subscription as subscription_repo

UTC = timezone.utc  # noqa: UP017 — datetime.UTC requires Python 3.11+; alias for 3.10 compat

router = APIRouter(prefix="", tags=["billing"])

RAZORPAY_PRO_PLAN_ID = os.getenv("RAZORPAY_PRO_PLAN_ID", "")
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")

if STRIPE_SECRET_KEY:
    stripe.api_key = STRIPE_SECRET_KEY
    logger.info("Stripe configured as primary billing provider")
else:
    logger.info("Stripe secret key not set")

if RAZORPAY_KEY_ID and not RAZORPAY_KEY_ID.startswith("rzp_test_your"):
    razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
    logger.info("Razorpay configured in billing router")
else:
    razorpay_client = None
    logger.info("Razorpay not configured (Pro tier disabled) in billing router")

#: Shared service instance — created once at module load
_billing_service: BillingService | None = BillingService(razorpay_client) if razorpay_client else None


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


@router.post("/billing/create-checkout-session")
@router.post("/create-checkout-session")
async def create_checkout_session(
    payload: CheckoutPayload,
    user_email: str | None = Depends(get_user_email),
):
    """Create a subscription checkout session (Stripe primary, Razorpay fallback)."""
    enforce_billing_enabled()
    if not user_email:
        raise HTTPException(status_code=401, detail="Authentication required.")
    if user_email.lower() != payload.user_email.lower():
        raise HTTPException(status_code=403, detail="Email mismatch: token does not belong to this user.")

    # 1. Primary Global Gateway: Stripe
    if STRIPE_SECRET_KEY:
        try:
            session = await asyncio.to_thread(
                stripe.checkout.Session.create,
                payment_method_types=["card"],
                mode="subscription",
                customer_email=user_email,
                line_items=[
                    {
                        "price": STRIPE_PRICE_ID_PRO,
                        "quantity": 1,
                    }
                ],
                automatic_tax={"enabled": True},
                success_url=f"{FRONTEND_URL}/dashboard/billing?session_id={{CHECKOUT_SESSION_ID}}&success=true",
                cancel_url=f"{FRONTEND_URL}/dashboard/billing?canceled=true",
                metadata={"user_email": user_email},
                subscription_data={"metadata": {"user_email": user_email}},
            )
            return {
                "checkout_url": session.url,
                "session_id": session.id,
                "provider": "stripe",
                "name": "Anuvaad Pro",
                "description": "Unlimited translations · DeepSeek R1 · Priority processing",
            }
        except Exception as e:
            logger.error(f"Stripe checkout session creation error: {e}")
            raise HTTPException(status_code=500, detail="Payment session creation failed.")

    # 2. Domestic / Legacy Fallback: Razorpay
    if not razorpay_client:
        raise HTTPException(status_code=503, detail="Payment service not configured.")

    try:
        subscription = await asyncio.to_thread(
            razorpay_client.subscription.create,
            {
                "plan_id": RAZORPAY_PRO_PLAN_ID,
                "total_count": 12,
                "quantity": 1,
                "customer_notify": 1,
                "notes": {"user_email": user_email},
            },
        )
        return {
            "subscription_id": subscription["id"],
            "key_id": RAZORPAY_KEY_ID,
            "name": "Anuvaad Pro",
            "description": "Unlimited translations · DeepSeek R1 · Priority processing",
        }
    except Exception as e:
        logger.error(f"Razorpay subscription creation error: {e}")
        raise HTTPException(status_code=500, detail="Payment session creation failed.")


@router.post("/billing/create-portal-session")
@router.post("/create-portal-session")
async def create_portal_session(
    user_email: str | None = Depends(get_user_email),
):
    """Generate a self-service customer portal session for subscription management."""
    enforce_billing_enabled()
    if not user_email:
        raise HTTPException(status_code=401, detail="Authentication required")

    sub = await subscription_repo.get_subscription(user_email)
    if not sub or not sub.get("is_pro"):
        raise HTTPException(status_code=404, detail="No active Pro subscription found.")

    # Primary Stripe Customer Portal
    if STRIPE_SECRET_KEY:
        try:
            customers = await asyncio.to_thread(stripe.Customer.list, email=user_email, limit=1)
            if customers and customers.data:
                customer_id = customers.data[0].id
            else:
                new_cust = await asyncio.to_thread(
                    stripe.Customer.create,
                    email=user_email,
                    metadata={"source": "anuvaad"},
                )
                customer_id = new_cust.id

            portal_session = await asyncio.to_thread(
                stripe.billing_portal.Session.create,
                customer=customer_id,
                return_url=f"{FRONTEND_URL}/dashboard/billing",
            )
            return {
                "portal_url": portal_session.url,
                "provider": "stripe",
                "status": "active",
            }
        except Exception as e:
            logger.error(f"Stripe portal session creation error: {e}")

    return {
        "subscription_id": sub.get("razorpay_subscription_id") or sub.get("stripe_subscription_id", ""),
        "plan": "pro",
        "status": "active",
        "message": "Self-service billing management portal available for active subscriptions.",
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
        order = await asyncio.to_thread(
            razorpay_client.order.create,
            {
                "amount": 10000,
                "currency": "INR",
                "notes": {"type": "credits", "amount": 100, "user_email": user_email},
            },
        )
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
        # credits
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
    request: Request,
    email: str | None = Depends(get_optional_user_email_from_request),
):
    """Return the user's current translation credit balance and remaining daily quota."""
    protection_mode = await get_active_protection_mode()
    if not email:
        client_ip = get_client_ip(request)
        today_str = datetime.now(UTC).strftime("%Y-%m-%d")
        guest_key = f"guest_daily_usage:{client_ip}:{today_str}"
        used = await cache.get(guest_key)
        used_count = int(used) if used is not None else 0
        remaining = max(0, 5 - used_count)
        return {
            "remaining": remaining,
            "limit": 5,
            "tier": "guest",
            "credits": 0,
            "protection_mode": protection_mode,
        }

    is_pro = await get_user_pro_status(email)
    credits = await subscription_repo.get_credits(email)
    if is_pro:
        return {
            "remaining": -1,
            "limit": -1,
            "tier": "pro",
            "credits": credits,
            "protection_mode": protection_mode,
        }

    used = await get_today_usage_count(email)
    remaining = max(0, 25 - used)
    return {
        "remaining": remaining,
        "limit": 25,
        "tier": "free",
        "credits": credits,
        "protection_mode": protection_mode,
    }


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
        razorpay_client.utility.verify_webhook_signature(body.decode(), signature, RAZORPAY_WEBHOOK_SECRET)
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
                session.add(
                    PaymentTransaction(
                        event_id=event_id,
                        payload=event,
                        status="queued",
                    )
                )
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


@router.post("/billing/webhook/stripe")
@router.post("/billing/webhook")
@router.post("/webhook/stripe")
@router.post("/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events — validates HMAC signature, updates subscription."""
    webhook_secret = STRIPE_WEBHOOK_SECRET or os.getenv("STRIPE_WEBHOOK_SECRET", "")
    if not webhook_secret:
        logger.error("STRIPE_WEBHOOK_SECRET is not set — rejecting webhook request.")
        return JSONResponse(status_code=503, content={"error": "Stripe webhook endpoint not configured"})

    payload_body = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(
            payload=payload_body,
            sig_header=sig_header,
            secret=webhook_secret,
        )
    except Exception as e:
        logger.error(f"Stripe webhook signature error: {e}")
        raise HTTPException(status_code=400, detail="Invalid Stripe webhook signature")

    event_id = event.get("id", "")
    event_type = event.get("type", "")

    # Fast cache layer idempotency
    if event_id:
        idempotency_key = f"webhook:stripe:idempotency:{event_id}"
        if await cache.get(idempotency_key):
            logger.info(f"Stripe webhook: duplicate event {event_id} (cache hit) — skipping")
            return {"status": "duplicate", "message": "Event already processed"}

    # Process event
    event_data = event.get("data", {}).get("object", {})
    user_email = (
        event_data.get("customer_email")
        or event_data.get("metadata", {}).get("user_email")
        or event_data.get("subscription_data", {}).get("metadata", {}).get("user_email")
    )

    if not user_email and "customer" in event_data:
        try:
            cust = await asyncio.to_thread(stripe.Customer.retrieve, event_data["customer"])
            user_email = cust.get("email")
        except Exception:
            pass

    if event_type in ("checkout.session.completed", "customer.subscription.created"):
        if user_email:
            sub_id = event_data.get("subscription") or event_data.get("id")
            await subscription_repo.upsert_subscription(
                email=user_email,
                data={"is_pro": True, "stripe_subscription_id": sub_id},
            )
            logger.info(f"Activated Pro tier for {user_email} via Stripe event {event_type}")

    elif event_type in ("customer.subscription.deleted", "customer.subscription.paused"):
        if user_email:
            await subscription_repo.upsert_subscription(
                email=user_email,
                data={"is_pro": False},
            )
            logger.info(f"Deactivated Pro tier for {user_email} via Stripe event {event_type}")

    elif event_type == "invoice.payment_succeeded":
        logger.info(f"Invoice payment succeeded for customer {event_data.get('customer')}")

    elif event_type == "invoice.payment_failed":
        logger.warning(f"Invoice payment failed for customer {event_data.get('customer')}")

    if event_id:
        await cache.put(f"webhook:stripe:idempotency:{event_id}", "1", ttl=86400)

    return {"received": True, "type": event_type}

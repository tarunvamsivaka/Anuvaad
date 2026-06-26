import os
import json
import razorpay
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import JSONResponse
from app.core.config import (
    RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET,
    logger,
)
from app.core.database import supabase_request
from app.queue.tasks import send_transactional_email_task, process_billing_webhook_task
from app.models.schemas import CheckoutPayload, VerifyPaymentPayload
from app.core.auth import get_user_email
from app.core.cache import cache

router = APIRouter(prefix="", tags=["billing"])

RAZORPAY_PRO_PLAN_ID = os.getenv("RAZORPAY_PRO_PLAN_ID", "")
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")

if RAZORPAY_KEY_ID and not RAZORPAY_KEY_ID.startswith("rzp_test_your"):
    razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))
    logger.info("Razorpay configured in billing router")
else:
    razorpay_client = None
    logger.info("Razorpay not configured (Pro tier disabled) in billing router")


def enforce_billing_enabled():
    if os.getenv("ENABLE_BILLING", "false").lower() != "true":
        raise HTTPException(
            status_code=503,
            detail="Billing and payment registration are temporarily paused. Enjoy the complimentary free tier!",
        )


@router.post("/create-checkout-session")
async def create_checkout_session(
    payload: CheckoutPayload,
    user_email: str | None = Depends(get_user_email),
):
    """Create a Razorpay subscription checkout.
    Returns subscription_id + key_id for the frontend Razorpay popup.
    BACK-06: Auth via Authorization header (Depends), not request body access_token."""
    enforce_billing_enabled()
    if not razorpay_client:
        raise HTTPException(
            status_code=503,
            detail="Payment service not configured. Please contact support.",
        )
    if not user_email:
        raise HTTPException(
            status_code=401, detail="Authentication required. Please sign in."
        )
    if user_email.lower() != payload.user_email.lower():
        raise HTTPException(
            status_code=403,
            detail="Email mismatch: token does not belong to this user.",
        )
    try:
        subscription = razorpay_client.subscription.create(
            {
                "plan_id": RAZORPAY_PRO_PLAN_ID,
                "total_count": 12,
                "quantity": 1,
                "customer_notify": 1,
                "notes": {"user_email": user_email},
            }
        )
        return {
            "subscription_id": subscription["id"],
            "key_id": RAZORPAY_KEY_ID,
            "name": "Anuvaad Pro",
            "description": "Unlimited translations · DeepSeek R1 · Priority processing",
        }
    except Exception as e:
        logger.error(f"Razorpay subscription creation error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Payment session creation failed. Please try again later.",
        )


@router.post("/create-portal-session")
async def create_portal_session(
    user_email: str | None = Depends(get_user_email),
):
    """Return the user's active Razorpay subscription details for self-service management.
    BACK-06: Auth via Authorization header only."""
    enforce_billing_enabled()
    if not user_email:
        raise HTTPException(status_code=401, detail="Authentication required")
    sub = await supabase_request(
        "GET",
        f"user_subscriptions?user_email=eq.{user_email}&select=razorpay_subscription_id,is_pro",
    )
    if not sub or not isinstance(sub, dict) or not sub.get("is_pro"):
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
    """Create a Razorpay one-time order for buying 100 translation credits (₹100).
    BACK-06: Auth via Authorization header only."""
    enforce_billing_enabled()
    if not razorpay_client:
        raise HTTPException(status_code=503, detail="Payment service not configured.")
    if not user_email:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        order = razorpay_client.order.create(
            {
                "amount": 10000,
                "currency": "INR",
                "notes": {"type": "credits", "amount": 100, "user_email": user_email},
            }
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



@router.get("/check-credits")
async def get_check_credits(
    email: str | None = Depends(get_user_email)
):
    """GET version of check-credits — uses Authorization header only.
    Replaces the POST version for proper SWR client caching.
    """
    if not email:
        raise HTTPException(status_code=401, detail="Authentication required")

    sub = await supabase_request(
        "GET", f"user_subscriptions?user_email=eq.{email}&select=credits"
    )
    if sub and isinstance(sub, dict):
        return {"credits": sub.get("credits") or 0}
    return {"credits": 0}


@router.post("/verify-payment")
async def verify_payment(
    payload: VerifyPaymentPayload,
    user_email: str | None = Depends(get_user_email),
):
    """Verify Razorpay HMAC signature then activate Pro or top up credits.
    BACK-06: Auth via Authorization header only."""
    enforce_billing_enabled()
    if not razorpay_client:
        raise HTTPException(status_code=503, detail="Payment service not configured.")
    if not user_email:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        if payload.payment_type == "subscription":
            razorpay_client.utility.verify_subscription_payment_signature(
                {
                    "razorpay_payment_id": payload.razorpay_payment_id,
                    "razorpay_subscription_id": payload.razorpay_subscription_id,
                    "razorpay_signature": payload.razorpay_signature,
                }
            )
            existing = await supabase_request(
                "GET",
                f"user_subscriptions?user_email=eq.{user_email}&select=user_email",
            )
            # BUG#2 FIX: Always upsert — never blindly INSERT.
            # A user may already have a row (e.g., purchased credits first).
            # Inserting again fails silently on the UNIQUE constraint and
            # leaves them permanently stuck on the free tier despite paying.
            if existing:
                await supabase_request(
                    "PATCH",
                    f"user_subscriptions?user_email=eq.{user_email}",
                    {
                        "razorpay_subscription_id": payload.razorpay_subscription_id,
                        "is_pro": True,
                        "onboarded": False,
                    },
                )
            else:
                await supabase_request(
                    "POST",
                    "user_subscriptions",
                    {
                        "user_email": user_email,
                        "razorpay_subscription_id": payload.razorpay_subscription_id,
                        "is_pro": True,
                        "onboarded": False,
                    },
                )
                send_transactional_email_task.delay("welcome", user_email=user_email)
            send_transactional_email_task.delay("subscription_upgrade", user_email=user_email, plan_name="pro")
            logger.info(f"✅ Razorpay subscription verified & activated: {user_email}")
            # FRONT-08: Immediately bust Pro status cache so user sees upgrade instantly
            cache_key = f"user_pro_status:{user_email}"
            await cache.delete(cache_key)
            return {"status": "success", "plan": "pro"}
        else:  # credits
            razorpay_client.utility.verify_payment_signature(
                {
                    "razorpay_order_id": payload.razorpay_order_id,
                    "razorpay_payment_id": payload.razorpay_payment_id,
                    "razorpay_signature": payload.razorpay_signature,
                }
            )
            amount = 100
            sub = await supabase_request(
                "GET", f"user_subscriptions?user_email=eq.{user_email}&select=credits"
            )
            if not sub:
                await supabase_request(
                    "POST",
                    "user_subscriptions",
                    {
                        "user_email": user_email,
                        "credits": amount,
                        "is_pro": False,
                        "onboarded": False,
                    },
                )
            else:
                current = sub.get("credits") or 0 if isinstance(sub, dict) else 0
                await supabase_request(
                    "PATCH",
                    f"user_subscriptions?user_email=eq.{user_email}",
                    {"credits": current + amount},
                )
            logger.info(f"💰 Credits verified & added: {user_email} (+{amount})")
            return {"status": "success", "credits_added": amount}
    except Exception as e:
        logger.error(f"Payment verification failed: {e}")
        raise HTTPException(
            status_code=400,
            detail="Payment verification failed. Please contact support.",
        )


@router.post("/webhook/razorpay")
async def razorpay_webhook(request: Request):
    """Handle Razorpay webhook events and update user_subscriptions in Supabase."""
    webhook_secret = RAZORPAY_WEBHOOK_SECRET

    if not webhook_secret:
        logger.error(
            "RAZORPAY_WEBHOOK_SECRET is not set — rejecting webhook request."
        )
        return JSONResponse(
            status_code=503, content={"error": "Webhook endpoint not configured"}
        )

    # Guard: razorpay_client may be None when credentials are not configured
    if not razorpay_client:
        logger.error("Razorpay client not configured — rejecting webhook request.")
        return JSONResponse(
            status_code=503, content={"error": "Razorpay not configured"}
        )

    body = await request.body()
    signature = request.headers.get("x-razorpay-signature", "")
    event_id = request.headers.get("x-razorpay-event-id", "")

    # BACK-03: Idempotency guard — reject duplicate webhook deliveries
    if event_id:
        idempotency_key = f"webhook:idempotency:{event_id}"
        existing = await cache.get(idempotency_key)
        if existing:
            logger.info(f"Razorpay webhook: duplicate event {event_id} — skipping")
            return {"status": "duplicate", "message": "Event already processed"}
        # Mark this event as seen for 24 hours
        await cache.put(idempotency_key, "1", ttl=86400)

    # BACK-09: Verify signature BEFORE json.loads to prevent information leakage
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

    # Send the raw event payload to Celery for background processing
    process_billing_webhook_task.delay(event_id=event_id, payload=event)

    return {"received": True}


@router.get("/subscription-status")
async def get_subscription_status(
    email: str | None = Depends(get_user_email),
):
    """GET version of subscription-status — uses Authorization header only.
    P4: Replaces the POST version so SWR can cache it like a normal GET resource.
    """
    if not email:
        raise HTTPException(status_code=401, detail="Authentication required")

    sub = await supabase_request(
        "GET", f"user_subscriptions?user_email=eq.{email}&select=is_pro"
    )

    if sub and isinstance(sub, dict):
        is_pro = bool(sub.get("is_pro", False))
        plan = "pro" if is_pro else "free"
    else:
        plan = "free"
        is_pro = False

    return {"plan": plan, "status": "active", "isPro": is_pro}

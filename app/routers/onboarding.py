"""
app/routers/onboarding.py

FIX-35 (P3-08): Onboarding completion endpoint.

When a new user finishes the onboarding flow in the frontend (/onboarding),
the frontend POSTs here to mark their account as onboarded. This sets
`onboarded=True` on the user_subscriptions row so subsequent auth checks
can skip the redirect.
"""
from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import get_user_email
from app.repositories import subscription as subscription_repo

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


@router.post("/complete")
async def complete_onboarding(
    email: str = Depends(get_user_email),
):
    """Mark the authenticated user's onboarding as complete.

    Called by the frontend after the user finishes all onboarding steps.
    Idempotent — safe to call multiple times.
    """
    if not email:
        raise HTTPException(status_code=401, detail="Authentication required")

    await subscription_repo.mark_onboarded(email)
    return {"status": "ok", "onboarded": True}

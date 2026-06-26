"""
app/domain/quota/policy.py

Pure business rule: given user tier (is_pro, is_admin) and system protection mode,
compute the applicable rate/size/cooldown limits.

No I/O. No FastAPI. No database. No cache.
Fully unit-testable with zero mocking.

This is the single source of truth for limit calculation, eliminating the
40-line copy-paste that previously existed in two places inside quota.py.
"""
import os
from dataclasses import dataclass


@dataclass(frozen=True)
class QuotaPolicy:
    """Immutable snapshot of the limits applicable to one request.

    Attributes:
        daily_limit:  Maximum translations per UTC day.
        char_limit:   Maximum characters per single request.
        cooldown:     Seconds the user must wait between requests (0 = none).
    """
    daily_limit: int
    char_limit: int
    cooldown: int


# Protection-mode multipliers for free users (applied on top of base limits)
_FREE_MODE_OVERRIDES: dict[str, dict] = {
    "CAUTION": {
        "daily_factor": 0.8,
        "char_factor": 0.8,
        "cooldown": 10,
    },
    "RESTRICTED": {
        "daily_factor": 0.5,
        "char_factor": 0.5,
        "cooldown": 20,
    },
    "EMERGENCY": {
        "daily_factor": 0.2,
        "char_factor": 0.2,
        "char_floor": 300,
        "cooldown": 30,
    },
}

# Protection-mode overrides for pro users (char + cooldown only)
_PRO_MODE_OVERRIDES: dict[str, dict] = {
    "RESTRICTED": {"char_cap": 25000, "cooldown": 2},
    "EMERGENCY":  {"char_cap": 10000, "cooldown": 5},
}


def compute_quota_policy(
    *,
    is_pro: bool,
    is_admin: bool,
    mode: str,
) -> QuotaPolicy:
    """Compute the applicable QuotaPolicy for a request.

    Args:
        is_pro:   Whether the user has an active Pro subscription.
        is_admin: Whether the user's email is in the ADMIN_EMAILS set.
        mode:     Current platform protection mode string
                  ("NORMAL" | "CAUTION" | "RESTRICTED" | "EMERGENCY").

    Returns:
        An immutable QuotaPolicy with the effective limits.

    This function has NO side effects and performs NO I/O — it is a pure
    computation. Callers are responsible for providing the inputs and
    acting on the returned policy.
    """
    # Admins are always unrestricted regardless of mode
    if is_admin:
        return QuotaPolicy(daily_limit=999_999, char_limit=999_999, cooldown=0)

    if is_pro:
        daily_limit = int(os.getenv("LIMIT_PRO_DAILY", "999999"))
        char_limit = int(os.getenv("LIMIT_PRO_CHARS", "50000"))
        cooldown = 0

        override = _PRO_MODE_OVERRIDES.get(mode)
        if override:
            char_limit = min(char_limit, override["char_cap"])
            cooldown = override["cooldown"]

        return QuotaPolicy(daily_limit=daily_limit, char_limit=char_limit, cooldown=cooldown)

    # ── Free tier ──
    daily_limit = int(os.getenv("LIMIT_FREE_DAILY", "10"))
    char_limit = int(os.getenv("LIMIT_FREE_CHARS", "10000"))
    cooldown = int(os.getenv("LIMIT_FREE_COOLDOWN", "5"))

    override = _FREE_MODE_OVERRIDES.get(mode)
    if override:
        daily_limit = max(1, int(daily_limit * override["daily_factor"]))
        char_limit = max(100, int(char_limit * override["char_factor"]))
        char_limit = min(char_limit, override.get("char_floor", char_limit))
        cooldown = override["cooldown"]

    return QuotaPolicy(daily_limit=daily_limit, char_limit=char_limit, cooldown=cooldown)


__all__ = ["QuotaPolicy", "compute_quota_policy"]

# Anuvaad Bootstrap compatibility stub.
# Exposes FastAPI app and internal modules to the pytest suite and ASGI server.

import os
from app.main import app, RATE_LIMIT_IP_MAX
from app.core.config import _is_production, SENTRY_DSN, SUPABASE_URL, SUPABASE_SERVICE_KEY, FRONTEND_URL
from app.routers.billing import razorpay_client
_frontend_url = FRONTEND_URL
from app.core.cache import cache, LRUCache, cache_key
from app.core.auth import get_user_email, get_user_pro_status
from app.core.database import supabase_request, supabase_request_list
from app.core.quota import (
    save_translation_background,
    get_today_usage_count,
    get_user_limits_and_cooldown,
    enforce_quotas_and_protection,
)
from app.models.schemas import (
    CheckoutPayload,
    SubscriptionCheckPayload,
    WorkspaceCreate,
    WorkspaceInvite,
)
from app.services.ai import normalize_blocks, get_completion
from app.routers.translate import sanitise_input, validate_code_input
from openai import AsyncOpenAI

RATE_LIMIT_MAX = RATE_LIMIT_IP_MAX
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

# Anuvaad Bootstrap compatibility stub.
# Exposes FastAPI app and internal modules to the pytest suite and ASGI server.

import os

from openai import AsyncOpenAI  # noqa: F401

from app.api.middleware.rate_limit import RATE_LIMIT_IP_MAX  # noqa: F401
from app.core.auth import get_user_email, get_user_pro_status  # noqa: F401
from app.core.cache import LRUCache, cache, cache_key  # noqa: F401
from app.core.config import FRONTEND_URL, SENTRY_DSN, SUPABASE_SERVICE_KEY, SUPABASE_URL, _is_production  # noqa: F401
from app.core.database import supabase_request, supabase_request_list  # noqa: F401
from app.core.quota import (  # noqa: F401
    enforce_quotas_and_protection,
    get_today_usage_count,
    get_user_limits_and_cooldown,
    save_translation_background,
)
from app.main import app  # noqa: F401
from app.models.schemas import (  # noqa: F401
    CheckoutPayload,
    SubscriptionCheckPayload,
    WorkspaceCreate,
    WorkspaceInvite,
)
from app.routers.billing import razorpay_client  # noqa: F401
from app.routers.translate.dependencies import sanitise_input, validate_code_input  # noqa: F401
from app.services.ai import get_completion, normalize_blocks  # noqa: F401

_frontend_url = FRONTEND_URL
RATE_LIMIT_MAX = RATE_LIMIT_IP_MAX
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

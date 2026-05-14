import asyncio
import json
import os
import hashlib
import logging
import sys
import base64
import uvicorn
import stripe
import httpx
import re
import uuid
import secrets
import collections
import threading
import resend
from collections import OrderedDict, deque
from datetime import datetime, timezone
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, BackgroundTasks, Depends, Header, UploadFile, File, Form
from fastapi.responses import JSONResponse, StreamingResponse, PlainTextResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

load_dotenv()
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
import openai
from openai import AsyncOpenAI
import sentry_sdk
import time

# LLM API timeout (seconds) — prevents hung requests
LLM_TIMEOUT = 60

# ── STRUCTURED LOGGING ──
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("anuvaad")

# ── METRICS COLLECTOR ──
class MetricsCollector:
    """In-memory metrics for API observability. Resets on process restart."""

    def __init__(self):
        self.start_time = time.time()
        self.total_requests: dict[str, int] = {}
        self.total_errors: dict[str, int] = {}
        self.model_calls: dict[str, int] = {}
        self.model_errors: dict[str, int] = {}
        self.cache_hits: int = 0
        self.cache_misses: int = 0
        # Rolling window for latency (last 100 per endpoint)
        self._latencies: dict[str, deque] = {}

    def record_request(self, endpoint: str, latency_ms: float, is_error: bool = False):
        self.total_requests[endpoint] = self.total_requests.get(endpoint, 0) + 1
        if is_error:
            self.total_errors[endpoint] = self.total_errors.get(endpoint, 0) + 1
        if endpoint not in self._latencies:
            self._latencies[endpoint] = deque(maxlen=100)
        self._latencies[endpoint].append(latency_ms)

    def record_model_call(self, model_name: str, is_error: bool = False):
        self.model_calls[model_name] = self.model_calls.get(model_name, 0) + 1
        if is_error:
            self.model_errors[model_name] = self.model_errors.get(model_name, 0) + 1

    def record_cache_hit(self):
        self.cache_hits += 1

    def record_cache_miss(self):
        self.cache_misses += 1

    @property
    def average_latency_ms(self) -> dict[str, float]:
        return {
            ep: round(sum(dq) / len(dq), 2) if dq else 0.0
            for ep, dq in self._latencies.items()
        }

    @property
    def uptime_seconds(self) -> int:
        return int(time.time() - self.start_time)

    def snapshot(self) -> dict:
        return {
            "uptime_seconds": self.uptime_seconds,
            "python_version": sys.version,
            "total_requests": dict(self.total_requests),
            "total_errors": dict(self.total_errors),
            "model_calls": dict(self.model_calls),
            "model_errors": dict(self.model_errors),
            "cache_hits": self.cache_hits,
            "cache_misses": self.cache_misses,
            "average_latency_ms": self.average_latency_ms,
        }

metrics = MetricsCollector()

# 1. Core Initialization
app = FastAPI(title="Anuvaad API")

# ── ENVIRONMENT MODE ──
_is_production = os.getenv("ENV", "development").lower() == "production"

# ── CORS ──
# FRONTEND_URL must be set in production .env to your actual domain.
# In development, localhost origins are also allowed.
_frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
_allowed_origins = [_frontend_url]
# Only allow localhost origins in development mode
if not _is_production:
    for origin in ["http://localhost:3000", "http://localhost:5500", "http://127.0.0.1:5500"]:
        if origin not in _allowed_origins:
            _allowed_origins.append(origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── METRICS MIDDLEWARE ──
METRICS_USERNAME = os.getenv("METRICS_USERNAME", "")
METRICS_PASSWORD = os.getenv("METRICS_PASSWORD", "")

@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    """Track request count, latency, and errors for all /api/ endpoints."""
    path = request.url.path
    if not path.startswith("/api/"):
        return await call_next(request)

    # Normalise endpoint name for grouping (strip /api/ prefix, replace slashes)
    endpoint = path.replace("/api/", "").replace("/", "_").rstrip("_") or "root"
    start = time.time()
    is_error = False

    try:
        response = await call_next(request)
        if response.status_code >= 400:
            is_error = True
        return response
    except Exception:
        is_error = True
        raise
    finally:
        latency_ms = (time.time() - start) * 1000
        metrics.record_request(endpoint, latency_ms, is_error)

# 1.5 Sentry Initialization
SENTRY_DSN = os.getenv("SENTRY_DSN", "")
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        traces_sample_rate=0.1,
        environment=os.getenv("ENV", "development"),
    )
    logger.info("Sentry initialized")
else:
    logger.info("Sentry not configured")

# 2. Modern LLM Setup (Groq + DeepSeek)
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")

if not GROQ_API_KEY or GROQ_API_KEY.startswith("your_"):
    logger.warning("GROQ_API_KEY is not set or still default!")
if not DEEPSEEK_API_KEY or DEEPSEEK_API_KEY.startswith("your_"):
    logger.warning("DEEPSEEK_API_KEY is not set or still default!")

# Startup validation
STRIPE_KEY = os.getenv("STRIPE_SECRET_KEY", "")
if STRIPE_KEY and STRIPE_KEY != "sk_test_your_stripe_secret_key_here":
    stripe.api_key = STRIPE_KEY
    logger.info("Stripe configured")
else:
    logger.info("Stripe not configured (Pro tier disabled)")

# ── SUPABASE SERVER-SIDE CLIENT ──
# Uses the SERVICE ROLE KEY (not anon key) for privileged DB writes.
# The anon key is only for client-side auth; the service role key
# bypasses RLS for webhook-driven subscription updates.
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")

if SUPABASE_URL and SUPABASE_SERVICE_KEY:
    logger.info("Supabase server-side client configured")
else:
    logger.warning("SUPABASE_SERVICE_ROLE_KEY not set — subscription DB updates disabled")

# ── STARTUP ENV VALIDATION ──
# In production, critical env vars must be present.
# _is_production is defined above, before CORS setup.
if _is_production:
    _missing = []
    for _var in ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "GROQ_API_KEY", "DEEPSEEK_API_KEY",
                 "STRIPE_WEBHOOK_SECRET", "FRONTEND_URL"]:
        val = os.getenv(_var, "")
        if not val or val.startswith("your_") or val == "dummy_key":
            _missing.append(_var)
    if _missing:
        raise RuntimeError(f"FATAL: Missing required env vars for production: {', '.join(_missing)}")
    if _frontend_url.startswith("http://localhost"):
        raise RuntimeError("FATAL: FRONTEND_URL must not be localhost in production")
    logger.info("Production env validation passed")

FREE_TIER_DAILY_LIMIT = 10

async def supabase_request(method: str, path: str, data: dict = None) -> dict | None:
    """Make an authenticated request to the Supabase REST API using the service role key.
    Returns a single dict (first element if the response is a list)."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        logger.warning("Supabase not configured — skipping DB operation")
        return None
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    try:
        async with httpx.AsyncClient() as http_client:
            if method == "GET":
                resp = await http_client.get(url, headers=headers)
            elif method == "POST":
                headers["Prefer"] = "resolution=merge-duplicates,return=representation"
                resp = await http_client.post(url, headers=headers, json=data)
            elif method == "PATCH":
                resp = await http_client.patch(url, headers=headers, json=data)
            else:
                return None
            if resp.status_code in (200, 201):
                result = resp.json()
                return result[0] if isinstance(result, list) and result else result
            else:
                logger.error(f"Supabase {method} {path} failed: {resp.status_code} {resp.text}")
                return None
    except Exception as e:
        logger.error(f"Supabase request error: {e}")
        return None


async def supabase_request_list(path: str) -> list:
    """GET helper that always returns a list (for multi-row queries)."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return []
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
        "Content-Type": "application/json",
    }
    try:
        async with httpx.AsyncClient() as http_client:
            resp = await http_client.get(url, headers=headers)
            if resp.status_code == 200:
                result = resp.json()
                return result if isinstance(result, list) else [result] if result else []
            else:
                logger.error(f"Supabase GET {path} failed: {resp.status_code} {resp.text}")
                return []
    except Exception as e:
        logger.error(f"Supabase list request error: {e}")
        return []

# ── API KEY / JWT AUTHENTICATION ──
security = HTTPBearer(auto_error=False)

async def get_user_email(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str | None:
    if not credentials:
        return None
    token = credentials.credentials
    # 1. Check if it's an API Key (starts with 'ak_')
    if token.startswith("ak_"):
        # Look up API key in Supabase
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        api_key_data = await supabase_request("GET", f"api_keys?api_key_hash=eq.{token_hash}&select=user_email")
        if api_key_data and isinstance(api_key_data, dict):
            # Update last_used_at
            await supabase_request("PATCH", f"api_keys?api_key_hash=eq.{token_hash}", {"last_used_at": "now()"})
            return api_key_data.get("user_email")
        return None
    
    # 2. Otherwise assume it's a Supabase JWT
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{SUPABASE_URL}/auth/v1/user",
                headers={"Authorization": f"Bearer {token}", "apikey": SUPABASE_ANON_KEY}
            )
            if resp.status_code == 200:
                return resp.json().get("email")
    except Exception as e:
        logger.error(f"JWT verification error: {e}")
    return None

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
            email = await get_user_email(creds)
            if email:
                sentry_sdk.set_user({"email": email})
        except Exception:
            pass
            
    sentry_sdk.capture_exception(exc)
    logger.error(f"Unhandled server error: {exc}")
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})

async def save_translation_background(user_email: str, mode: str, source_language: str, target_language: str, input_text: str, blocks: list, model_used: str, workspace_id: str | None = None):
    if not user_email: return
    try:
        input_preview = input_text[:80]
        char_count = len(input_text)
        block_count = len(blocks)
        new_id = str(uuid.uuid4())
        
        data = {
            "id": new_id,
            "user_email": user_email,
            "mode": mode,
            "source_language": source_language,
            "target_language": target_language,
            "input_preview": input_preview,
            "char_count": char_count,
            "block_count": block_count,
            "model_used": model_used
        }
        
        # Legacy fields for backward compatibility with older schemas
        data["title"] = input_preview
        data["character_count"] = char_count
        
        if workspace_id:
            data["workspace_id"] = workspace_id
            
        await supabase_request("POST", "translation_history", data)

        # ── Welcome email for first-time users + Milestone email check ──
        try:
            all_rows = await supabase_request_list(
                f"translation_history?user_email=eq.{user_email}&select=id"
            )
            total_count = len(all_rows)
            # Send welcome email on first-ever translation (free-tier onboarding)
            if total_count == 1:
                email_service.send_welcome(user_email)
            elif total_count in (10, 100, 500):
                email_service.send_translation_milestone(user_email, total_count)
        except Exception as milestone_err:
            logger.warning(f"Welcome/milestone email check failed: {milestone_err}")
    except Exception as e:
        logger.warning(f"Failed to save translation history in background: {e}")

async def get_today_usage_count(email: str) -> int:
    """Count how many translations a user has made today (UTC)."""
    if not email or not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        return 0
    today_start = datetime.now(timezone.utc).strftime("%Y-%m-%dT00:00:00+00:00")
    path = f"translation_history?user_email=eq.{email}&created_at=gte.{today_start}&select=id"
    rows = await supabase_request_list(path)
    return len(rows)

async def get_user_credits(email: str) -> int:
    """Get the number of translation credits for a user."""
    if not email:
        return 0
    sub = await supabase_request("GET", f"user_subscriptions?user_email=eq.{email}&select=credits")
    if sub and isinstance(sub, dict):
        return sub.get("credits") or 0
    return 0

async def deduct_credit(email: str) -> bool:
    """Deduct one translation credit from a user. Returns True if successful."""
    if not email:
        return False
    sub = await supabase_request("GET", f"user_subscriptions?user_email=eq.{email}&select=credits")
    if not sub or not isinstance(sub, dict):
        return False
    current = sub.get("credits") or 0
    if current <= 0:
        return False
    await supabase_request("PATCH", f"user_subscriptions?user_email=eq.{email}", {"credits": current - 1})
    return True

async def check_free_tier_limit(email: str | None, is_pro: bool, request: Request) -> None:
    """Raise 429 if a free-tier user has exceeded their daily limit and has no credits."""
    if not email:
        client_ip = request.client.host if request.client else "unknown"
        redis_key = f"anon_daily_usage:{client_ip}"
        # Track anonymous usage by IP per 24 hours (86400 seconds)
        count = await cache.incr_rate_limit(redis_key, 86400)
        if count > FREE_TIER_DAILY_LIMIT:
            raise HTTPException(
                status_code=429,
                detail=f"Anonymous free tier limit reached ({FREE_TIER_DAILY_LIMIT} translations/day). Please sign up or upgrade to Pro."
            )
        return
    if is_pro:
        return  # Pro users have unlimited translations
    count = await get_today_usage_count(email)
    if count >= FREE_TIER_DAILY_LIMIT:
        # Check if user has credits
        credits = await get_user_credits(email)
        if credits > 0:
            # Deduct a credit and allow the translation
            await deduct_credit(email)
            return
        raise HTTPException(
            status_code=429,
            detail=f"Free tier limit reached ({FREE_TIER_DAILY_LIMIT} translations/day). Buy credits or upgrade to Pro for unlimited translations."
        )

async def get_user_pro_status(email: str) -> bool:
    """Check if a user has an active Pro subscription."""
    if not email:
        return False
    sub = await supabase_request("GET", f"user_subscriptions?user_email=eq.{email}&select=plan,status")
    if sub and isinstance(sub, dict):
        plan = sub.get("plan", "free")
        status = sub.get("status", "active")
        return plan in ("pro", "enterprise") and status in ("active", "trialing")
    return False
logger.info("Anuvaad API starting")

# ── RESEND EMAIL SERVICE ──
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY
    logger.info("Resend email service configured")
else:
    logger.info("Resend not configured — transactional emails disabled")

FRONTEND_BASE_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
EMAIL_FROM = os.getenv("EMAIL_FROM", "Anuvaad <notifications@anuvaad.dev>")

class EmailService:
    """Transactional email service using Resend (free tier: 100 emails/day)."""

    @staticmethod
    def _send(to: str, subject: str, html: str):
        """Fire-and-forget email send. Logs errors but never raises."""
        if not RESEND_API_KEY:
            logger.info(f"Email skipped (Resend not configured): {subject} → {to}")
            return
        try:
            resend.Emails.send({
                "from": EMAIL_FROM,
                "to": [to],
                "subject": subject,
                "html": html,
            })
            logger.info(f"Email sent: {subject} → {to}")
        except Exception as e:
            logger.error(f"Resend email error: {e}")

    @staticmethod
    def send_welcome(user_email: str, display_name: str = ""):
        name = display_name or user_email.split("@")[0]
        html = f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <!-- Header -->
      <tr><td style="background:linear-gradient(135deg,#d97706,#b45309);padding:32px 40px;text-align:center;">
        <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;letter-spacing:-0.5px;">Welcome to Anuvaad</h1>
        <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Your AI-powered code translation workspace</p>
      </td></tr>
      <!-- Body -->
      <tr><td style="padding:32px 40px;">
        <p style="margin:0 0 16px;font-size:16px;color:#18181b;">Hi {name},</p>
        <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#3f3f46;">Thanks for joining Anuvaad! Here's what you can do:</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:12px 16px;background-color:#fefce8;border-left:3px solid #d97706;border-radius:6px;margin-bottom:12px;">
            <p style="margin:0;font-size:13px;color:#3f3f46;"><strong style="color:#92400e;">Code → English</strong> — Translate any code into plain-English explanations</p>
          </td></tr>
          <tr><td style="height:8px;"></td></tr>
          <tr><td style="padding:12px 16px;background-color:#fefce8;border-left:3px solid #d97706;border-radius:6px;">
            <p style="margin:0;font-size:13px;color:#3f3f46;"><strong style="color:#92400e;">English → Code</strong> — Describe what you need and get working code</p>
          </td></tr>
          <tr><td style="height:8px;"></td></tr>
          <tr><td style="padding:12px 16px;background-color:#fefce8;border-left:3px solid #d97706;border-radius:6px;">
            <p style="margin:0;font-size:13px;color:#3f3f46;"><strong style="color:#92400e;">Code → Code</strong> — Convert between 30+ programming languages</p>
          </td></tr>
        </table>
        <div style="text-align:center;margin:32px 0;">
          <a href="{FRONTEND_BASE_URL}/dashboard/translate" style="display:inline-block;background-color:#d97706;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;">Start Translating →</a>
        </div>
        <p style="margin:0;font-size:12px;color:#a1a1aa;text-align:center;">Star us on <a href="https://github.com/AdiSuresh/Anuvaad" style="color:#d97706;text-decoration:none;">GitHub</a> if you find Anuvaad useful!</p>
      </td></tr>
      <!-- Footer -->
      <tr><td style="padding:20px 40px;background-color:#fafafa;border-top:1px solid #e4e4e7;text-align:center;">
        <p style="margin:0;font-size:11px;color:#a1a1aa;">Anuvaad — AI Code Translation Platform</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>
"""
        EmailService._send(user_email, "Welcome to Anuvaad 🚀", html)

    @staticmethod
    def send_subscription_confirmed(user_email: str, plan: str = "pro"):
        html = f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <tr><td style="background:linear-gradient(135deg,#d97706,#b45309);padding:32px 40px;text-align:center;">
        <h1 style="margin:0;color:#ffffff;font-size:24px;">✦ {plan.title()} Plan Activated</h1>
      </td></tr>
      <tr><td style="padding:32px 40px;">
        <p style="margin:0 0 16px;font-size:16px;color:#18181b;">Your {plan.title()} subscription is now active!</p>
        <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#3f3f46;">You now have access to:</p>
        <ul style="margin:0 0 24px;padding-left:20px;font-size:14px;color:#3f3f46;line-height:2;">
          <li>Unlimited daily translations</li>
          <li>DeepSeek R1 reasoning model</li>
          <li>200KB file uploads</li>
          <li>Priority processing</li>
        </ul>
        <div style="text-align:center;margin:24px 0;">
          <a href="{FRONTEND_BASE_URL}/dashboard/translate" style="display:inline-block;background-color:#d97706;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;">Open Workspace →</a>
        </div>
      </td></tr>
      <tr><td style="padding:20px 40px;background-color:#fafafa;border-top:1px solid #e4e4e7;text-align:center;">
        <p style="margin:0;font-size:11px;color:#a1a1aa;">Manage your subscription in <a href="{FRONTEND_BASE_URL}/dashboard/billing" style="color:#d97706;text-decoration:none;">Billing Settings</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>
"""
        EmailService._send(user_email, f"Your Anuvaad {plan.title()} plan is active ✦", html)

    @staticmethod
    def send_translation_milestone(user_email: str, count: int):
        html = f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
      <tr><td style="background:linear-gradient(135deg,#d97706,#b45309);padding:32px 40px;text-align:center;">
        <h1 style="margin:0;color:#ffffff;font-size:48px;">🎉</h1>
        <h2 style="margin:8px 0 0;color:#ffffff;font-size:22px;">{count} Translations!</h2>
      </td></tr>
      <tr><td style="padding:32px 40px;text-align:center;">
        <p style="margin:0 0 16px;font-size:16px;color:#18181b;">You've translated <strong>{count}</strong> code snippets with Anuvaad.</p>
        <p style="margin:0 0 24px;font-size:14px;color:#3f3f46;">Keep going — every line of code understood is a step forward.</p>
        <a href="{FRONTEND_BASE_URL}/dashboard/translate" style="display:inline-block;background-color:#d97706;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;">Translate More →</a>
      </td></tr>
      <tr><td style="padding:20px 40px;background-color:#fafafa;border-top:1px solid #e4e4e7;text-align:center;">
        <p style="margin:0;font-size:11px;color:#a1a1aa;">Anuvaad — AI Code Translation Platform</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>
"""
        EmailService._send(user_email, f"🎉 You've translated {count} snippets with Anuvaad!", html)

email_service = EmailService()

# ── HEALTH CHECK ──
@app.get("/api/health")
async def health_check():
    redis_ok = False
    if cache.client:
        try:
            await cache.ping()
            redis_ok = True
        except Exception:
            pass
    return {
        "status": "healthy",
        "service": "anuvaad-api",
        "llm_configured": bool(GROQ_API_KEY) or bool(DEEPSEEK_API_KEY),
        "stripe_configured": bool(STRIPE_KEY and STRIPE_KEY != "sk_test_your_stripe_secret_key_here"),
        "redis_connected": redis_ok,
        "supabase_configured": bool(SUPABASE_URL and SUPABASE_SERVICE_KEY)
    }

# ── GITHUB GIST IMPORT ──
GIST_MAX_SIZE = 50 * 1024  # 50 KB
GIST_URL_PATTERN = re.compile(r"^https://gist\.github\.com/([^/]+)/([a-f0-9]+)$")

# Map GitHub linguist language names to our internal language values
GIST_LANGUAGE_MAP = {
    "python": "python", "javascript": "javascript", "typescript": "typescript",
    "java": "java", "c++": "cpp", "c": "c", "c#": "csharp",
    "go": "go", "rust": "rust", "swift": "swift", "kotlin": "kotlin",
    "dart": "dart", "php": "php", "ruby": "ruby", "perl": "perl",
    "lua": "lua", "r": "r", "matlab": "matlab", "sql": "sql",
    "shell": "bash", "powershell": "powershell", "dockerfile": "dockerfile",
    "yaml": "yaml", "scala": "scala", "haskell": "haskell",
    "elixir": "elixir", "clojure": "clojure", "html": "html",
    "css": "css", "json": "json", "xml": "xml", "markdown": "markdown",
    "objective-c": "objective-c", "graphql": "graphql",
}

@app.get("/api/import-gist")
async def import_gist(url: str):
    """Fetch a public GitHub Gist's first file and return its content for translation."""
    # Validate URL format
    match = GIST_URL_PATTERN.match(url.strip())
    if not match:
        raise HTTPException(
            status_code=400,
            detail="Invalid Gist URL. Expected format: https://gist.github.com/username/gist_id"
        )
    
    username = match.group(1)
    gist_id = match.group(2)
    
    # Fetch from GitHub API (unauthenticated — 60 req/hr per IP)
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"https://api.github.com/gists/{gist_id}",
                headers={"Accept": "application/vnd.github.v3+json", "User-Agent": "Anuvaad-App"}
            )
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="GitHub API request timed out. Please try again.")
    except httpx.RequestError as e:
        logger.error(f"Gist fetch network error: {e}")
        raise HTTPException(status_code=502, detail="Could not reach GitHub API.")
    
    if resp.status_code == 404:
        raise HTTPException(status_code=404, detail="Gist not found. It may be private or deleted.")
    if resp.status_code == 403:
        raise HTTPException(status_code=400, detail="Gist is private or GitHub rate limit exceeded.")
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail=f"GitHub API returned status {resp.status_code}")
    
    gist_data = resp.json()
    
    # Check if gist is public
    if not gist_data.get("public", True):
        raise HTTPException(status_code=400, detail="This Gist is private. Only public Gists can be imported.")
    
    # Extract the first file
    files = gist_data.get("files", {})
    if not files:
        raise HTTPException(status_code=400, detail="This Gist has no files.")
    
    first_filename = next(iter(files))
    file_data = files[first_filename]
    content = file_data.get("content", "")
    
    # Size check
    if len(content.encode("utf-8")) > GIST_MAX_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"Gist content exceeds the {GIST_MAX_SIZE // 1024}KB limit. Please use a smaller file."
        )
    
    # Detect language from GitHub's linguist classification
    raw_language = (file_data.get("language") or "").lower()
    detected_language = GIST_LANGUAGE_MAP.get(raw_language, "python")
    
    return {
        "filename": first_filename,
        "language": detected_language,
        "content": content,
        "char_count": len(content),
        "username": username,
    }

# ── METRICS ENDPOINTS ──

def _check_metrics_auth(request: Request) -> bool:
    """Validate HTTP Basic Auth for the metrics endpoints."""
    if not METRICS_USERNAME or not METRICS_PASSWORD:
        # No credentials configured — allow access (dev mode)
        return True
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Basic "):
        return False
    try:
        decoded = base64.b64decode(auth_header[6:]).decode("utf-8")
        username, password = decoded.split(":", 1)
        return username == METRICS_USERNAME and password == METRICS_PASSWORD
    except Exception:
        return False

@app.get("/api/metrics")
async def get_metrics_json(request: Request):
    """Return all metrics as JSON. Protected by HTTP Basic Auth."""
    if not _check_metrics_auth(request):
        return JSONResponse(
            status_code=401,
            content={"detail": "Unauthorized"},
            headers={"WWW-Authenticate": 'Basic realm="metrics"'},
        )
    return metrics.snapshot()

@app.get("/api/metrics/prometheus")
async def get_metrics_prometheus(request: Request):
    """Return metrics in Prometheus text exposition format."""
    if not _check_metrics_auth(request):
        return PlainTextResponse(
            "Unauthorized",
            status_code=401,
            headers={"WWW-Authenticate": 'Basic realm="metrics"'},
        )
    snap = metrics.snapshot()
    lines: list[str] = []

    # ── Uptime
    lines.append("# HELP anuvaad_uptime_seconds Seconds since process start")
    lines.append("# TYPE anuvaad_uptime_seconds gauge")
    lines.append(f'anuvaad_uptime_seconds {snap["uptime_seconds"]}')

    # ── Requests
    lines.append("# HELP anuvaad_requests_total Total requests per endpoint")
    lines.append("# TYPE anuvaad_requests_total counter")
    for ep, count in snap["total_requests"].items():
        lines.append(f'anuvaad_requests_total{{endpoint="{ep}"}} {count}')

    # ── Errors
    lines.append("# HELP anuvaad_errors_total Total errors per endpoint")
    lines.append("# TYPE anuvaad_errors_total counter")
    for ep, count in snap["total_errors"].items():
        lines.append(f'anuvaad_errors_total{{endpoint="{ep}"}} {count}')

    # ── Model calls
    lines.append("# HELP anuvaad_model_calls_total Total calls per model")
    lines.append("# TYPE anuvaad_model_calls_total counter")
    for model, count in snap["model_calls"].items():
        lines.append(f'anuvaad_model_calls_total{{model="{model}"}} {count}')

    # ── Model errors
    lines.append("# HELP anuvaad_model_errors_total Total errors per model")
    lines.append("# TYPE anuvaad_model_errors_total counter")
    for model, count in snap["model_errors"].items():
        lines.append(f'anuvaad_model_errors_total{{model="{model}"}} {count}')

    # ── Cache
    lines.append("# HELP anuvaad_cache_hits_total Total cache hits")
    lines.append("# TYPE anuvaad_cache_hits_total counter")
    lines.append(f'anuvaad_cache_hits_total {snap["cache_hits"]}')
    lines.append("# HELP anuvaad_cache_misses_total Total cache misses")
    lines.append("# TYPE anuvaad_cache_misses_total counter")
    lines.append(f'anuvaad_cache_misses_total {snap["cache_misses"]}')

    # ── Latency
    lines.append("# HELP anuvaad_avg_latency_ms Rolling average latency per endpoint")
    lines.append("# TYPE anuvaad_avg_latency_ms gauge")
    for ep, lat in snap["average_latency_ms"].items():
        lines.append(f'anuvaad_avg_latency_ms{{endpoint="{ep}"}} {lat}')

    lines.append("")
    return PlainTextResponse("\n".join(lines), media_type="text/plain; version=0.0.4; charset=utf-8")

# ── USAGE STATS ──
@app.get("/api/cache-stats")
async def get_cache_stats():
    """Return stats for the cache."""
    stats = cache.fallback.stats()
    stats["cache_type"] = "redis" if cache.client else "lru"
    stats["redis_connected"] = bool(cache.client)
    return stats

@app.get("/api/usage")
async def get_usage(email: str | None = Depends(get_user_email)):
    """Return today's translation count and limit for the authenticated user."""
    if not email:
        raise HTTPException(status_code=401, detail="Unauthorized")
    count = await get_today_usage_count(email)
    is_pro = await get_user_pro_status(email)
    return {
        "translations_today": count,
        "daily_limit": None if is_pro else FREE_TIER_DAILY_LIMIT,
        "is_pro": is_pro
    }

SYSTEM_INSTRUCTION = """
You are an expert code translator and analyzer. Your job is to break down the provided code into small, precise logical blocks and explain EXACTLY what each block does at the code level.

CRITICAL RULES:
1. Break the code into SMALL blocks of 1–8 lines each. Every meaningful statement or group of tightly-related statements should be its own block.
2. For each block, explain EXACTLY what that specific code does — reference the actual variable names, function names, operators, values, and data types used.
3. Do NOT summarize the entire program in one block. Do NOT give vague high-level descriptions like "This program calculates fibonacci numbers." Instead, explain each piece: "Defines a function called `fibonacci` that takes an integer parameter `n`."
4. Include ALL lines of the code. Every import, variable declaration, function definition, loop, conditional, return statement, comment, and expression must be covered in a block.
5. Use precise technical language. For example:
   - GOOD: "Declares a variable `count` and initializes it to `0`."
   - GOOD: "Calls `requests.get(url)` and stores the HTTP response object in `response`."
   - GOOD: "Iterates over each element `item` in the list `data` using a for loop."
   - BAD: "This section handles the data processing." (too vague)
   - BAD: "The program fetches data from the internet." (too high-level)
6. For HTML/CSS/markup languages, explain each tag, selector, property, or rule individually.
7. For SQL, explain each clause (SELECT, FROM, WHERE, JOIN, etc.) as its own block.

OUTPUT FORMAT — Return a JSON object with a single key 'blocks' containing an array of objects. Each object must have:
- "id": a unique block identifier like "block_1", "block_2", etc.
- "code_snippet": the exact code lines for this block (copied verbatim from the input, preserving indentation)
- "english_translation": a precise, plain-English explanation of what this specific code does

Example for Python code `import os\\npath = os.getcwd()\\nprint(path)`:
{
  "blocks": [
    {"id": "block_1", "code_snippet": "import os", "english_translation": "Imports the `os` module from the Python standard library, which provides functions for interacting with the operating system."},
    {"id": "block_2", "code_snippet": "path = os.getcwd()", "english_translation": "Calls `os.getcwd()` to get the current working directory path as a string, and stores it in the variable `path`."},
    {"id": "block_3", "code_snippet": "print(path)", "english_translation": "Prints the value of `path` (the current working directory) to the console."}
  ]
}
"""

# ── REDIS CONNECTION ──

class LRUCache:
    def __init__(self, max_size: int = 500):
        self.cache = collections.OrderedDict()
        self.max_size = max_size
        self.hits = 0
        self.misses = 0
        self.lock = threading.Lock()
        
    def get(self, key: str):
        with self.lock:
            if key in self.cache:
                self.cache.move_to_end(key)
                self.hits += 1
                return self.cache[key]
            self.misses += 1
            return None
            
    def set(self, key: str, value: any):
        with self.lock:
            self.cache[key] = value
            self.cache.move_to_end(key)
            if len(self.cache) > self.max_size:
                self.cache.popitem(last=False)
                
    def stats(self):
        with self.lock:
            total = self.hits + self.misses
            hit_rate = (self.hits / total) if total > 0 else 0.0
            return {
                "size": len(self.cache),
                "max_size": self.max_size,
                "hit_rate": hit_rate,
                "hits": self.hits,
                "misses": self.misses
            }

class RedisCache:
    """Unified cache and rate-limiter backed by Redis.

    Connection priority:
      1. REDIS_URL  — standard Redis (docker, local, managed)
      2. UPSTASH_REDIS_URL + UPSTASH_REDIS_TOKEN — Upstash REST (serverless)
      3. In-memory LRU fallback (development only; logs warning in production)
    """

    def __init__(self):
        self.client = None
        self._backend = "memory"

        # Priority 1: Standard Redis via REDIS_URL
        redis_url = os.environ.get("REDIS_URL")
        if redis_url:
            try:
                import redis.asyncio as aioredis
                self.client = aioredis.from_url(redis_url, decode_responses=True)
                self._backend = "redis"
            except Exception as e:
                logger.warning(f"Failed to connect to Redis via REDIS_URL: {e}")

        # Priority 2: Upstash REST (serverless fallback)
        if not self.client:
            url = os.environ.get("UPSTASH_REDIS_URL")
            token = os.environ.get("UPSTASH_REDIS_TOKEN")
            if url and token:
                try:
                    from upstash_redis.asyncio import Redis
                    self.client = Redis(url=url, token=token)
                    self._backend = "upstash"
                except Exception as e:
                    logger.warning(f"Failed to initialize Upstash Redis: {e}")

        # Fallback: in-memory LRU
        self.fallback = LRUCache(max_size=500)

        if self.client:
            logger.info(f"Redis cache initialized (backend: {self._backend})")
        elif _is_production:
            logger.warning(
                "⚠ PRODUCTION: No Redis configured — using in-memory LRU fallback. "
                "Rate limiting will not persist across restarts or workers. "
                "Set REDIS_URL or UPSTASH_REDIS_URL/UPSTASH_REDIS_TOKEN."
            )
        else:
            logger.info("Redis not configured — using in-memory LRU (development mode)")

    async def get(self, key: str):
        if self.client:
            try:
                val = await self.client.get(key)
                if val is not None:
                    if isinstance(val, str):
                        return json.loads(val)
                    return val
            except Exception as e:
                logger.error(f"Redis get error: {e}")
        return self.fallback.get(key)

    async def put(self, key: str, value: any, ttl: int = 86400):
        if self.client:
            try:
                await self.client.setex(key, ttl, json.dumps(value))
                return
            except Exception as e:
                logger.error(f"Redis put error: {e}")
        self.fallback.set(key, value)

    async def incr_rate_limit(self, key: str, window: int) -> int:
        if self.client:
            try:
                count = await self.client.incr(key)
                if count == 1:
                    await self.client.expire(key, window)
                return count
            except Exception as e:
                logger.error(f"Redis incr error: {e}")

        # In-memory fallback (dev only)
        val = self.fallback.get(key) or 0
        val += 1
        self.fallback.set(key, val)
        return val

    async def ping(self):
        if self.client:
            if self._backend == "redis":
                return await self.client.ping()
            else:
                # Upstash REST — no native ping, use a GET
                await self.client.get("health_ping")
                return True
        return False

cache = RedisCache()

# ── RATE LIMITING (Redis-backed) ──
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX = 15     # requests per window

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    if not request.url.path.startswith("/api/"):
        return await call_next(request)

    client_ip = request.client.host if request.client else "unknown"
    redis_key = f"rate_limit:{client_ip}"
    
    current_count = await cache.incr_rate_limit(redis_key, RATE_LIMIT_WINDOW)
    
    if current_count > RATE_LIMIT_MAX:
        return JSONResponse(
            status_code=429,
            content={"detail": f"Rate limit exceeded. Max {RATE_LIMIT_MAX} requests per {RATE_LIMIT_WINDOW}s."},
            headers={
                "X-RateLimit-Limit": str(RATE_LIMIT_MAX),
                "X-RateLimit-Remaining": "0",
                "Retry-After": str(RATE_LIMIT_WINDOW),
            }
        )

    response = await call_next(request)
    response.headers["X-RateLimit-Limit"] = str(RATE_LIMIT_MAX)
    response.headers["X-RateLimit-Remaining"] = str(max(0, RATE_LIMIT_MAX - current_count))
    return response

def cache_key(code: str, language: str, endpoint: str, model: str) -> str:
    return "anuvaad_cache:" + hashlib.sha256(f"{endpoint}:{language}:{code}:{model}".encode()).hexdigest()

# 3. Pydantic Data Models (with validation)
class CodePayload(BaseModel):
    raw_code: str = Field(..., min_length=1, max_length=50000)
    language: str = Field(..., min_length=1, max_length=30)
    workspace_id: str | None = None
    access_token: str | None = None

    @field_validator('raw_code')
    @classmethod
    def raw_code_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('Code cannot be empty or whitespace only')
        return v

class EnglishUpdatePayload(BaseModel):
    block_id: str = Field(..., min_length=1, max_length=50)
    modified_english: str = Field(..., min_length=1, max_length=5000)
    full_context: str = Field(..., min_length=1, max_length=10000)

class GeneratePayload(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=5000)
    language: str = Field(..., min_length=1, max_length=30)
    workspace_id: str | None = None
    access_token: str | None = None

    @field_validator('prompt')
    @classmethod
    def prompt_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('Prompt cannot be empty or whitespace only')
        return v

class CodeToCodePayload(BaseModel):
    raw_code: str = Field(..., min_length=1, max_length=50000)
    source_language: str = Field(..., min_length=1, max_length=30)
    target_language: str = Field(..., min_length=1, max_length=30)
    workspace_id: str | None = None
    access_token: str | None = None

    @field_validator('raw_code')
    @classmethod
    def raw_code_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('Code cannot be empty or whitespace only')
        return v

class SaveTranslationPayload(BaseModel):
    access_token: str = Field(..., min_length=1)
    mode: str = Field(..., min_length=1)
    source_language: str = Field(..., min_length=1)
    target_language: str = Field(..., min_length=1)
    input_text: str = Field(..., min_length=1)
    block_count: int
    model_used: str = Field(..., min_length=1)

    @field_validator('input_text')
    @classmethod
    def input_text_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('Input cannot be empty or whitespace only')
        return v

# ── RESPONSE NORMALIZATION ──
def normalize_blocks(raw_result, model_used: str = "", tier: str = "free") -> list:
    """Ensure LLM response is a list of {id, code_snippet, english_translation, model_used, tier} dicts.
    Handles nested responses, alternative field names, and missing fields."""
    # Unwrap nested objects like {"blocks": [...]}, {"result": [...]}, etc.
    if isinstance(raw_result, dict):
        for key in ('blocks', 'result', 'data', 'translations', 'code_blocks', 'response'):
            if key in raw_result and isinstance(raw_result[key], list):
                raw_result = raw_result[key]
                break
        else:
            # Single block dict
            raw_result = [raw_result]

    if not isinstance(raw_result, list):
        raise ValueError(f"Expected list, got {type(raw_result).__name__}")

    normalized = []
    for i, block in enumerate(raw_result):
        if not isinstance(block, dict):
            continue
        # Resolve english_translation from alternative keys
        translation = (
            block.get('english_translation')
            or block.get('explanation')
            or block.get('description')
            or block.get('translation')
            or block.get('text')
            or block.get('english')
            or block.get('comment')
            or ''
        )
        code = block.get('code_snippet') or block.get('code') or block.get('snippet') or ''
        block_id = block.get('id') or block.get('block_id') or f'block_{i + 1}'

        normalized.append({
            'id': str(block_id),
            'code_snippet': str(code),
            'english_translation': str(translation),
            'model_used': model_used,
            'tier': tier
        })

    # Filter out blocks with no meaningful content at all
    normalized = [b for b in normalized if b['english_translation'].strip() or b['code_snippet'].strip()]

    if not normalized:
        raise ValueError("API returned no usable translation blocks")

    return normalized

# ── PRO TIER VERIFICATION ──
async def is_token_pro(access_token: str | None) -> bool:
    """Silently checks if a given token belongs to a Pro user."""
    if not access_token:
        return False
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{SUPABASE_URL}/auth/v1/user",
                headers={"Authorization": f"Bearer {access_token}", "apikey": SUPABASE_ANON_KEY}
            )
            if resp.status_code == 200:
                email = resp.json().get("email")
                if email:
                    return await get_user_pro_status(email)
    except Exception as e:
        logger.warning(f"Pro token check failed (silently falling back): {e}")
    return False

# ── LLM ROUTER ──
def _clean_json_response(text: str) -> str:
    """Strip markdown backticks from LLMs that don't enforce strict JSON mode."""
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()

async def get_completion(prompt: str, system_instruction: str, mode: str, response_format: str = "json_object", use_r1: bool = False) -> tuple[str, str]:
    """
    Router for Groq and DeepSeek models.
    If use_r1=True, routes to DeepSeek R1 (deepseek-reasoner).
    mode='explanation' -> Groq (fallback DeepSeek)
    mode='translation' -> DeepSeek (fallback Groq)
    """
    groq_api_key = os.getenv("GROQ_API_KEY")
    deepseek_api_key = os.getenv("DEEPSEEK_API_KEY")
    
    if not groq_api_key or not deepseek_api_key:
        raise HTTPException(status_code=500, detail="LLM API keys not configured")
        
    groq_client = AsyncOpenAI(api_key=groq_api_key, base_url="https://api.groq.com/openai/v1")
    deepseek_client = AsyncOpenAI(api_key=deepseek_api_key, base_url="https://api.deepseek.com/v1")
    
    if use_r1:
        primary = {"client": deepseek_client, "model": "deepseek-reasoner", "name": "DeepSeek R1"}
        fallback = {"client": groq_client, "model": "llama-3.3-70b-versatile", "name": "Llama 3.3"}
    else:
        groq_model = "llama-3.3-70b-versatile"
        deepseek_model = "deepseek-chat"
        if mode == "explanation":
            primary = {"client": groq_client, "model": groq_model, "name": "Llama 3.3"}
            fallback = {"client": deepseek_client, "model": deepseek_model, "name": "DeepSeek V3"}
        else: # "translation"
            primary = {"client": deepseek_client, "model": deepseek_model, "name": "DeepSeek V3"}
            fallback = {"client": groq_client, "model": groq_model, "name": "Llama 3.3"}
        
    messages = [
        {"role": "system", "content": system_instruction},
        {"role": "user", "content": prompt}
    ]
    
    kwargs = {}
    if response_format == "json_object" and primary["model"] != "deepseek-reasoner":
        kwargs["response_format"] = {"type": "json_object"}

    try:
        response = await asyncio.wait_for(
            primary["client"].chat.completions.create(
                model=primary["model"],
                messages=messages,
                **kwargs
            ),
            timeout=LLM_TIMEOUT
        )
        metrics.record_model_call(primary["model"])
        return _clean_json_response(response.choices[0].message.content), primary["name"]
    except (openai.RateLimitError, Exception) as e:
        metrics.record_model_call(primary["model"], is_error=True)
        logger.warning(f"Error on {primary['name']}, falling back to {fallback['name']}. Error: {e}")
        fallback_kwargs = {}
        if response_format == "json_object":
            fallback_kwargs["response_format"] = {"type": "json_object"}
            
        try:
            response = await asyncio.wait_for(
                fallback["client"].chat.completions.create(
                    model=fallback["model"],
                    messages=messages,
                    **fallback_kwargs
                ),
                timeout=LLM_TIMEOUT
            )
            metrics.record_model_call(fallback["model"])
            return _clean_json_response(response.choices[0].message.content), fallback["name"]
        except asyncio.TimeoutError:
            metrics.record_model_call(fallback["model"], is_error=True)
            logger.error(f"LLM API Timeout after {LLM_TIMEOUT}s on fallback {fallback['name']}")
            raise HTTPException(status_code=504, detail=f"Translation timed out after {LLM_TIMEOUT}s. Please try again.")
        except Exception as fallback_e:
            metrics.record_model_call(fallback["model"], is_error=True)
            logger.error(f"Fallback {fallback['name']} Error: {str(fallback_e)}")
            raise HTTPException(status_code=500, detail="Translation failed on both models. Please try again.")

# 4. API Routes
async def stream_code_to_english(payload: CodePayload, email: str | None, is_pro: bool, use_r1: bool, tier: str, background_tasks: BackgroundTasks):
    model_name = "deepseek-reasoner" if use_r1 else "standard"
    model = "deepseek-reasoner" if use_r1 else "llama-3.3-70b-versatile"
    key = cache_key(payload.raw_code, payload.language, "code-to-english", model_name)
    
    # Check Cache
    cached = await cache.get(key)
            
    if cached:
        metrics.record_cache_hit()
        # Stream fake SSE chunks for UI consistency
        yield f'data: {json.dumps({"chunk": "", "done": False})}\n\n'
        yield f'data: {json.dumps({"done": True, "blocks": cached, "model_used": model})}\n\n'
        
        if email:
            background_tasks.add_task(save_translation_background, email, "Code → English", payload.language, "english", payload.raw_code, cached, model_name, payload.workspace_id)
        return

    metrics.record_cache_miss()
    groq_api_key = os.getenv("GROQ_API_KEY")
    deepseek_api_key = os.getenv("DEEPSEEK_API_KEY")
    groq_client = AsyncOpenAI(api_key=groq_api_key, base_url="https://api.groq.com/openai/v1")
    deepseek_client = AsyncOpenAI(api_key=deepseek_api_key, base_url="https://api.deepseek.com/v1")
    
    if use_r1:
        client = deepseek_client
        model = "deepseek-reasoner"
    else:
        client = groq_client
        model = "llama-3.3-70b-versatile"
        
    messages = [
        {"role": "system", "content": SYSTEM_INSTRUCTION},
        {"role": "user", "content": f"Programming Language: {payload.language}\\n\\nCode to Analyze/Translate:\\n{payload.raw_code}"}
    ]
    
    kwargs = {"stream": True}
    if model != "deepseek-reasoner":
        kwargs["response_format"] = {"type": "json_object"}
        
    try:
        stream = await client.chat.completions.create(
            model=model,
            messages=messages,
            **kwargs
        )
        
        full_content = ""
        async for chunk in stream:
            content = chunk.choices[0].delta.content
            if content:
                full_content += content
                # Stream each chunk
                yield f'data: {json.dumps({"chunk": content, "done": False})}\n\n'
                
        # Process and normalize the full JSON result
        cleaned = _clean_json_response(full_content)
        raw = json.loads(cleaned)
        result = normalize_blocks(raw, model_used=model, tier=tier)
        
        await cache.put(key, result)
        
        # Send final complete blocks
        yield f'data: {json.dumps({"done": True, "blocks": result, "model_used": model})}\n\n'
        
        if email:
            background_tasks.add_task(save_translation_background, email, "Code → English", payload.language, "english", payload.raw_code, result, model, payload.workspace_id)
            
    except Exception as e:
        logger.error(f"Streaming error: {str(e)}")
        yield f'data: {json.dumps({"error": str(e), "done": True})}\n\n'

# ── INPUT SANITISATION & VALIDATION ──

def sanitise_input(raw_code: str, mode: str, email: str | None = None) -> str:
    """Detects and neutralises prompt injection patterns hidden in comments."""
    if not raw_code:
        return raw_code

    def replacer(match):
        if email:
            logger.warning(f"Prompt injection detected from {email} in mode {mode}")
        else:
            logger.warning(f"Prompt injection detected from anonymous user in mode {mode}")
        return "[REDACTED INJECTION ATTEMPT]"

    # Line comments: # or // followed by anything up to end of line containing malicious phrase
    pattern_line = r"(?i)(//|#)[^\n]*?(ignore previous|system prompt|you are now|act as|jailbreak|\bdan\b|disregard instructions)[^\n]*"
    raw_code = re.sub(pattern_line, replacer, raw_code)
    
    # Block comments: /* ... */ or <!-- ... --> or """ ... """ or ''' ... '''
    pattern_block = r"(?is)(/\*|<!--|'''|\"\"\").*?(ignore previous|system prompt|you are now|act as|jailbreak|\bdan\b|disregard instructions).*?(?:\*/|-->|'''|\"\"\")"
    raw_code = re.sub(pattern_block, replacer, raw_code)
    
    return raw_code

def validate_code_input(raw_code: str):
    if len(raw_code) > 50000:
        raise HTTPException(status_code=422, detail="Input exceeds the maximum allowed length of 50,000 characters.")
        
    if len(raw_code) == 0:
        return
        
    # Check for binary/junk (>90% non-printable)
    printable_count = sum(1 for c in raw_code if c.isprintable() or c.isspace())
    if (printable_count / len(raw_code)) < 0.1:
        raise HTTPException(status_code=422, detail="Input contains too many non-printable characters. Binary uploads are not supported.")
        
    # Check for spam/ignore lines
    lines = raw_code.splitlines()
    if lines:
        ignore_count = sum(1 for line in lines if re.match(r"^\s*(//|#)\s*ignore", line, re.IGNORECASE))
        if ignore_count / len(lines) > 0.5:
            raise HTTPException(status_code=422, detail="Input rejected: Too many ignored lines detected.")

# ── FILE UPLOAD ENDPOINT ──

ALLOWED_EXTENSIONS = {".py", ".js", ".ts", ".java", ".cpp", ".rs", ".go", ".c", ".cs"}
EXTENSION_TO_LANGUAGE = {
    ".py": "python", ".js": "javascript", ".ts": "typescript",
    ".java": "java", ".cpp": "cpp", ".rs": "rust",
    ".go": "go", ".c": "c", ".cs": "csharp",
}
FREE_MAX_FILE_SIZE = 50 * 1024   # 50 KB
PRO_MAX_FILE_SIZE = 200 * 1024   # 200 KB

@app.post("/api/upload-file")
async def upload_file_translate(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    mode: str = Form("code-to-english"),
    language: str = Form(""),
    target_language: str = Form(""),
    access_token: str = Form(""),
    request: Request = None,
    email: str | None = Depends(get_user_email),
):
    """Accept a code file upload (max 50KB free / 200KB Pro), translate via the LLM router."""
    # ── Validate extension
    filename = file.filename or ""
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=422,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # ── Determine pro status and size limit
    is_pro = False
    if email:
        is_pro = await get_user_pro_status(email)
    if not is_pro and access_token:
        is_pro = await is_token_pro(access_token)

    max_size = PRO_MAX_FILE_SIZE if is_pro else FREE_MAX_FILE_SIZE
    tier = "pro" if is_pro else "free"
    use_r1 = is_pro

    # ── Read and validate content
    contents = await file.read()
    if len(contents) > max_size:
        limit_kb = max_size // 1024
        raise HTTPException(
            status_code=422,
            detail=f"File too large ({len(contents) // 1024}KB). Maximum is {limit_kb}KB for {tier} users.",
        )

    try:
        raw_code = contents.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=422, detail="File is not valid UTF-8 text.")

    if not raw_code.strip():
        raise HTTPException(status_code=422, detail="File is empty.")

    # ── Detect language from extension if not provided
    detected_language = language or EXTENSION_TO_LANGUAGE.get(ext, "python")

    # ── Validate and sanitise
    validate_code_input(raw_code)
    raw_code = sanitise_input(raw_code, mode="upload-file", email=email)

    await check_free_tier_limit(email, is_pro, request)

    # ── Route to the correct completion path
    model_name = "deepseek-reasoner" if use_r1 else "standard"
    key = cache_key(raw_code, detected_language, mode, model_name)

    cached = await cache.get(key)
    if cached:
        metrics.record_cache_hit()
        if email:
            background_tasks.add_task(
                save_translation_background, email, f"File Upload ({mode})",
                detected_language, target_language or "english", raw_code, cached, model_name, None,
            )
        return cached

    metrics.record_cache_miss()

    if mode == "code-to-code" and target_language:
        system = f"""You are an expert polyglot programmer. Translate the given code from {detected_language} to {target_language}.
Produce a complete, working, idiomatic translation. Then break the translated code into logical blocks.
Return a JSON object with a single key 'blocks' containing an array of objects where each object has: id (e.g. 'block_1'), code_snippet (the translated code for that block), and english_translation (a brief explanation of what this block does)."""
        user_prompt = f"Source Language: {detected_language}\nTarget Language: {target_language}\n\nCode to Translate:\n{raw_code}"
        completion_mode = "translation"
    else:
        system = SYSTEM_INSTRUCTION
        user_prompt = f"Programming Language: {detected_language}\n\nCode to Analyze/Translate:\n{raw_code}"
        completion_mode = "explanation"

    try:
        response_text, model_used = await get_completion(
            prompt=user_prompt,
            system_instruction=system,
            mode=completion_mode,
            response_format="json_object",
            use_r1=use_r1,
        )
        raw = json.loads(response_text)
        result = normalize_blocks(raw, model_used=model_used, tier=tier)
        await cache.put(key, result, 86400 * 7)

        if email:
            background_tasks.add_task(
                save_translation_background, email, f"File Upload ({mode})",
                detected_language, target_language or "english", raw_code, result, model_name, None,
            )
        return result

    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="LLM returned invalid JSON. Please try again.")
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/code-to-english")
async def function_translate_to_english_stream(request: Request, payload: CodePayload, background_tasks: BackgroundTasks, email: str | None = Depends(get_user_email)):
    validate_code_input(payload.raw_code)
    payload.raw_code = sanitise_input(payload.raw_code, mode="code-to-english", email=email)
    tier = "free"
    use_r1 = False
    is_pro = False
    if email:
        is_pro = await get_user_pro_status(email)
    await check_free_tier_limit(email, is_pro, request)
        
    if payload.access_token:
        if await is_token_pro(payload.access_token):
            tier = "pro"
            use_r1 = True
    elif is_pro:
        tier = "pro"
        use_r1 = True

    return StreamingResponse(
        stream_code_to_english(payload, email, is_pro, use_r1, tier, background_tasks),
        media_type="text/event-stream"
    )

@app.post("/api/code-to-english/sync")
async def function_translate_to_english(request: Request, payload: CodePayload, background_tasks: BackgroundTasks, email: str | None = Depends(get_user_email)):
    validate_code_input(payload.raw_code)
    payload.raw_code = sanitise_input(payload.raw_code, mode="code-to-english/sync", email=email)
    tier = "free"
    use_r1 = False
    is_pro = False
    # Enforce free tier daily limit
    if email:
        is_pro = await get_user_pro_status(email)
    await check_free_tier_limit(email, is_pro, request)
        
    if payload.access_token:
        if await is_token_pro(payload.access_token):
            tier = "pro"
            use_r1 = True
    elif is_pro:
        tier = "pro"
        use_r1 = True

    model_name = "deepseek-reasoner" if use_r1 else "standard"
    key = cache_key(payload.raw_code, payload.language, "code-to-english", model_name)
    
    cached = await cache.get(key)
    if cached:
        metrics.record_cache_hit()
        if email:
            background_tasks.add_task(save_translation_background, email, "Code → English", payload.language, "english", payload.raw_code, cached, model_name, payload.workspace_id)
        return cached

    metrics.record_cache_miss()

    user_prompt = f"Programming Language: {payload.language}\n\nCode to Analyze/Translate:\n{payload.raw_code}"
    
    try:
        response_text, model_used = await get_completion(
            prompt=user_prompt,
            system_instruction=SYSTEM_INSTRUCTION,
            mode="explanation",
            response_format="json_object",
            use_r1=use_r1
        )
        raw = json.loads(response_text)
        result = normalize_blocks(raw, model_used=model_used, tier=tier)
        
        await cache.put(key, result, 86400 * 7)
        
        if email:
            background_tasks.add_task(save_translation_background, email, "Code → English", payload.language, "english", payload.raw_code, result, model_used, payload.workspace_id)
            
        return result
    except json.JSONDecodeError as e:
        logger.error(f"JSON Parse Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Translation engine returned invalid JSON. Please try again.")
    except ValueError as e:
        logger.error(f"Normalization Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Translation engine returned an unexpected format. Please try again.")
    except Exception as e:
        # get_completion already handles fallbacks and timeouts internally, 
        # so any exception bubbling up here is an ultimate failure or HTTP exception
        if isinstance(e, HTTPException):
            raise e
        logger.error(f"LLM API Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Translation failed. Please try again.")

@app.post("/api/generate-from-english")
async def function_generate_from_english(request: Request, payload: GeneratePayload, background_tasks: BackgroundTasks, email: str | None = Depends(get_user_email)):
    validate_code_input(payload.prompt)
    payload.prompt = sanitise_input(payload.prompt, mode="generate-from-english", email=email)
    tier = "free"
    use_r1 = False
    is_pro = False
    # Enforce free tier daily limit
    if email:
        is_pro = await get_user_pro_status(email)
    await check_free_tier_limit(email, is_pro, request)
        
    if payload.access_token:
        if await is_token_pro(payload.access_token):
            tier = "pro"
            use_r1 = True
    elif is_pro:
        tier = "pro"
        use_r1 = True

    model_name = "deepseek-reasoner" if use_r1 else "standard"
    key = cache_key(payload.prompt, payload.language, "generate-from-english", model_name)
    
    cached = await cache.get(key)
    if cached:
        metrics.record_cache_hit()
        if email:
            background_tasks.add_task(save_translation_background, email, "English → Code", "english", payload.language, payload.prompt, cached, model_name, payload.workspace_id)
        return cached

    metrics.record_cache_miss()

    user_prompt = f"Programming Language: {payload.language}\n\nUser Request:\n{payload.prompt}\n\nFirst, generate the complete, working code to satisfy this request. Then, analyze your generated code and break it down into logical blocks using the system instructions."

    try:
        response_text, model_used = await get_completion(
            prompt=user_prompt,
            system_instruction=SYSTEM_INSTRUCTION,
            mode="explanation",
            response_format="json_object",
            use_r1=use_r1
        )
        raw = json.loads(response_text)
        result = normalize_blocks(raw, model_used=model_used, tier=tier)
        
        await cache.put(key, result, 86400 * 7)
        
        if email:
            background_tasks.add_task(save_translation_background, email, "English → Code", "english", payload.language, payload.prompt, result, model_used, payload.workspace_id)
            
        return result
    except json.JSONDecodeError as e:
        logger.error(f"JSON Parse Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Code generation returned invalid JSON. Please try again.")
    except ValueError as e:
        logger.error(f"Normalization Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Code generation returned an unexpected format. Please try again.")
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        logger.error(f"LLM API Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Code generation failed. Please try again.")

# NOTE: This endpoint is intentionally NOT cached because the full_context
# changes with every edit, making cache hits essentially impossible.
@app.post("/api/english-to-code")
async def function_update_to_code(request: Request, payload: EnglishUpdatePayload, email: str | None = Depends(get_user_email)):
    is_pro = await get_user_pro_status(email) if email else False
    await check_free_tier_limit(email, is_pro, request)
    user_prompt = f"You are an expert programmer. The user is modifying a specific part of their code based on an English instruction. Here is the full context of the code: {payload.full_context}. The user wants to change the block identified as {payload.block_id} to do the following: '{payload.modified_english}'. Generate ONLY the new raw programming syntax required to fulfill this specific instruction. Do not include markdown formatting, backticks, or explanations. Return strictly the raw code."

    try:
        response_text, model_used = await get_completion(
            prompt=user_prompt,
            system_instruction="You are an expert programmer. Only output raw code without markdown formatting.",
            mode="translation", # code generation focus, deepseek primary
            response_format="text"
        )
        return {"status": "success", "updated_code": response_text.strip(), "model_used": model_used}
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        logger.error(f"LLM API Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Code update failed. Please try again.")

# NEW: Code-to-Code Translation
@app.post("/api/code-to-code")
async def function_code_to_code(request: Request, payload: CodeToCodePayload, background_tasks: BackgroundTasks, email: str | None = Depends(get_user_email)):
    validate_code_input(payload.raw_code)
    payload.raw_code = sanitise_input(payload.raw_code, mode="code-to-code", email=email)
    tier = "free"
    use_r1 = False
    is_pro = False
    # Enforce free tier daily limit
    if email:
        is_pro = await get_user_pro_status(email)
    await check_free_tier_limit(email, is_pro, request)
        
    if payload.access_token:
        if await is_token_pro(payload.access_token):
            tier = "pro"
            use_r1 = True
    elif is_pro:
        tier = "pro"
        use_r1 = True

    model_name = "deepseek-reasoner" if use_r1 else "standard"
    key = cache_key(payload.raw_code, f"{payload.source_language}->{payload.target_language}", "code-to-code", model_name)
    
    cached = await cache.get(key)
    if cached:
        metrics.record_cache_hit()
        if email:
            background_tasks.add_task(save_translation_background, email, "Code → Code", payload.source_language, payload.target_language, payload.raw_code, cached, model_name, payload.workspace_id)
        return cached

    metrics.record_cache_miss()

    system = f"""You are an expert polyglot programmer. Translate the given code from {payload.source_language} to {payload.target_language}.
Produce a complete, working, idiomatic translation. Then break the translated code into logical blocks.
Return a JSON object with a single key 'blocks' containing an array of objects where each object has: id (e.g. 'block_1'), code_snippet (the translated code for that block), and english_translation (a brief explanation of what this block does)."""

    user_prompt = f"Source Language: {payload.source_language}\nTarget Language: {payload.target_language}\n\nCode to Translate:\n{payload.raw_code}"

    try:
        response_text, model_used = await get_completion(
            prompt=user_prompt,
            system_instruction=system,
            mode="translation",
            response_format="json_object",
            use_r1=use_r1
        )
        raw = json.loads(response_text)
        result = normalize_blocks(raw, model_used=model_used, tier=tier)
        
        await cache.put(key, result, 86400 * 7)
        
        if email:
            background_tasks.add_task(save_translation_background, email, "Code → Code", payload.source_language, payload.target_language, payload.raw_code, result, model_used, payload.workspace_id)
            
        return result
    except json.JSONDecodeError as e:
        logger.error(f"JSON Parse Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Code translation returned invalid JSON. Please try again.")
    except ValueError as e:
        logger.error(f"Normalization Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Code translation returned an unexpected format. Please try again.")
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        logger.error(f"LLM API Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Code translation failed. Please try again.")




# 5. Account Management
@app.delete("/api/account")
async def delete_account(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    try:
        token = authorization.replace("Bearer ", "")
        async with httpx.AsyncClient() as client:
            # Get user info
            resp = await client.get(
                f"{SUPABASE_URL}/auth/v1/user",
                headers={"Authorization": f"Bearer {token}", "apikey": SUPABASE_ANON_KEY}
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid token")
            
            user_id = resp.json().get("id")
            
            if SUPABASE_SERVICE_KEY:
                # Admin delete user
                admin_resp = await client.delete(
                    f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}",
                    headers={"Authorization": f"Bearer {SUPABASE_SERVICE_KEY}", "apikey": SUPABASE_SERVICE_KEY}
                )
                if admin_resp.status_code not in (200, 204):
                    logger.error(f"Admin delete user failed: {admin_resp.text}")
                    raise HTTPException(status_code=500, detail="Failed to delete account")
            
            # Note: Cascade deletes in Supabase should handle translation_history automatically 
            # if foreign keys are set up correctly.
            return JSONResponse(content={}, status_code=204)
    except Exception as e:
        logger.error(f"Delete account error: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete account")

# 6. Stripe Config & Routes

PRO_PRICE_ID = os.getenv("STRIPE_PRO_PRICE_ID", "price_ID")

class CheckoutPayload(BaseModel):
    user_email: str = Field(..., min_length=5, max_length=254)
    access_token: str = Field(..., min_length=10)

@app.post("/api/create-checkout-session")
async def create_checkout_session(payload: CheckoutPayload):
    """Create a Stripe checkout session.
    Requires a valid Supabase access_token to prevent unauthenticated abuse."""
    # Verify the Supabase JWT by calling the Supabase auth API
    try:
        async with httpx.AsyncClient() as http_client:
            resp = await http_client.get(
                f"{SUPABASE_URL}/auth/v1/user",
                headers={"Authorization": f"Bearer {payload.access_token}",
                         "apikey": SUPABASE_ANON_KEY}
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid or expired authentication token.")
            user_data = resp.json()
            verified_email = user_data.get("email", "")
            # Ensure the token's email matches the requested email
            if verified_email.lower() != payload.user_email.lower():
                raise HTTPException(status_code=403, detail="Email mismatch: token does not belong to this user.")
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Could not verify authentication. Please try again.")

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{'price': PRO_PRICE_ID, 'quantity': 1}],
            mode='subscription',
            success_url=f'{os.getenv("FRONTEND_URL", "http://localhost:3000")}/dashboard/billing?payment=success',
            cancel_url=f'{os.getenv("FRONTEND_URL", "http://localhost:3000")}/dashboard/billing?payment=cancel',
            customer_email=verified_email,
        )
        return {"url": session.url}
    except Exception as e:
        logger.error(f"Stripe Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Payment session creation failed. Please try again later.")


# ── STRIPE BILLING PORTAL ──
class PortalPayload(BaseModel):
    access_token: str = Field(..., min_length=10)

@app.post("/api/create-portal-session")
async def create_portal_session(payload: PortalPayload):
    """Create a Stripe Billing Portal session for the authenticated user.
    Lets Pro users update payment methods, view invoices, and cancel."""
    # Verify the JWT
    try:
        async with httpx.AsyncClient() as http_client:
            resp = await http_client.get(
                f"{SUPABASE_URL}/auth/v1/user",
                headers={"Authorization": f"Bearer {payload.access_token}", "apikey": SUPABASE_ANON_KEY}
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid or expired token")
            user_email = resp.json().get("email", "")
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Could not verify authentication")

    if not user_email:
        raise HTTPException(status_code=401, detail="Could not determine user email")

    # Look up stripe_customer_id from subscription record
    sub = await supabase_request("GET", f"user_subscriptions?user_email=eq.{user_email}&select=stripe_customer_id")
    if not sub or not isinstance(sub, dict) or not sub.get("stripe_customer_id"):
        raise HTTPException(status_code=404, detail="No active subscription found. Please subscribe first.")

    try:
        session = stripe.billing_portal.Session.create(
            customer=sub["stripe_customer_id"],
            return_url=f'{os.getenv("FRONTEND_URL", "http://localhost:3000")}/dashboard/billing',
        )
        return {"url": session.url}
    except Exception as e:
        logger.error(f"Stripe Portal Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Could not open billing portal. Please try again.")

# ── STRIPE CREDIT CHECKOUT ──
class CreditCheckoutPayload(BaseModel):
    access_token: str = Field(..., min_length=10)

@app.post("/api/create-credit-checkout")
async def create_credit_checkout(payload: CreditCheckoutPayload):
    try:
        async with httpx.AsyncClient() as http_client:
            resp = await http_client.get(
                f"{SUPABASE_URL}/auth/v1/user",
                headers={"Authorization": f"Bearer {payload.access_token}", "apikey": SUPABASE_ANON_KEY}
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid token")
            user_email = resp.json().get("email", "")
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Could not verify authentication")

    if not user_email:
        raise HTTPException(status_code=401, detail="Could not determine email")

    try:
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': '100 Translation Credits',
                        'description': 'One-time purchase of 100 translation credits for Anuvaad.'
                    },
                    'unit_amount': 100, # $1.00
                },
                'quantity': 1,
            }],
            mode='payment',
            metadata={
                'type': 'credits',
                'amount': 100,
                'user_email': user_email
            },
            success_url=f'{os.getenv("FRONTEND_URL", "http://localhost:3000")}/dashboard/billing?payment=success',
            cancel_url=f'{os.getenv("FRONTEND_URL", "http://localhost:3000")}/dashboard/billing?payment=cancel',
            customer_email=user_email,
        )
        return {"url": session.url}
    except Exception as e:
        logger.error(f"Credit Checkout Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Could not create checkout session")

# ── CHECK CREDITS ──
@app.post("/api/check-credits")
async def check_credits(payload: CreditCheckoutPayload):
    try:
        async with httpx.AsyncClient() as http_client:
            resp = await http_client.get(
                f"{SUPABASE_URL}/auth/v1/user",
                headers={"Authorization": f"Bearer {payload.access_token}", "apikey": SUPABASE_ANON_KEY}
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid token")
            user_email = resp.json().get("email", "")
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Could not verify authentication")

    sub = await supabase_request("GET", f"user_subscriptions?user_email=eq.{user_email}&select=credits")
    if sub and isinstance(sub, dict):
        return {"credits": sub.get("credits") or 0}
    return {"credits": 0}


# ── STRIPE WEBHOOKS ──
# Handles the full subscription lifecycle and updates the Supabase
# user_subscriptions table so the frontend can gate Pro features.

STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")

@app.post("/api/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events and update user_subscriptions in Supabase.

    SECURITY: Every incoming event MUST be verified against STRIPE_WEBHOOK_SECRET.
    If the secret is not configured, this endpoint refuses to process any events
    to prevent forged payloads from granting unauthorized Pro access.
    """
    # ── Guard: refuse to operate without a signing secret ──
    if not STRIPE_WEBHOOK_SECRET:
        logger.error(
            "STRIPE_WEBHOOK_SECRET is not set — rejecting webhook request. "
            "Set it in .env from Stripe Dashboard → Developers → Webhooks → Signing secret."
        )
        return JSONResponse(
            status_code=503,
            content={"error": "Webhook endpoint not configured"}
        )

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        logger.error("Stripe webhook: invalid payload")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        logger.error("Stripe webhook: invalid signature")
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_type = event.get("type", "") if isinstance(event, dict) else event["type"]
    data = event.get("data", {}).get("object", {}) if isinstance(event, dict) else event["data"]["object"]

    if event_type == "checkout.session.completed":
        metadata = data.get("metadata", {})
        if metadata.get("type") == "credits":
            amount = int(metadata.get("amount", 0))
            user_email = metadata.get("user_email", "")
            logger.info(f"💰 Credits purchased: {user_email} (+{amount})")
            
            sub = await supabase_request("GET", f"user_subscriptions?user_email=eq.{user_email}&select=credits")
            if not sub:
                await supabase_request("POST", "user_subscriptions", {
                    "user_email": user_email,
                    "credits": amount,
                    "plan": "free",
                    "status": "active",
                    "onboarded": False
                })
            else:
                current_credits = sub.get("credits") or 0
                new_credits = current_credits + amount
                await supabase_request("PATCH", f"user_subscriptions?user_email=eq.{user_email}", {"credits": new_credits})
        else:
            customer_email = data.get("customer_email", "unknown")
            subscription_id = data.get("subscription", "")
            customer_id = data.get("customer", "")
            logger.info(f"✅ New subscription: {customer_email} (sub: {subscription_id})")
            # Check if this is a brand-new user (no existing subscription row)
            existing_sub = await supabase_request("GET", f"user_subscriptions?user_email=eq.{customer_email}&select=user_email")
            is_new_user = not existing_sub
            # Upsert into Supabase — creates or updates the user's subscription record
            await supabase_request("POST", "user_subscriptions", {
                "user_email": customer_email,
                "stripe_customer_id": customer_id,
                "stripe_subscription_id": subscription_id,
                "plan": "pro",
                "status": "active",
                "onboarded": False
            })
            # Send welcome email for brand-new users
            if is_new_user and customer_email != "unknown":
                email_service.send_welcome(customer_email)
            # Always send subscription confirmation for Pro upgrades
            if customer_email != "unknown":
                email_service.send_subscription_confirmed(customer_email, "pro")

    elif event_type == "customer.subscription.updated":
        status = data.get("status", "unknown")
        customer_id = data.get("customer", "")
        period_end = data.get("current_period_end")
        logger.info(f"🔄 Subscription updated: customer={customer_id} status={status}")
        # Map Stripe status to our simplified status
        db_status = "active" if status in ("active", "trialing") else "past_due" if status == "past_due" else "cancelled"
        update_data = {"status": db_status}
        if period_end:
            update_data["current_period_end"] = datetime.fromtimestamp(period_end, tz=timezone.utc).isoformat()
        await supabase_request("PATCH",
            f"user_subscriptions?stripe_customer_id=eq.{customer_id}",
            update_data
        )

    elif event_type == "customer.subscription.deleted":
        customer_id = data.get("customer", "")
        logger.info(f"❌ Subscription cancelled: customer={customer_id}")
        await supabase_request("PATCH",
            f"user_subscriptions?stripe_customer_id=eq.{customer_id}",
            {"plan": "free", "status": "cancelled"}
        )

    elif event_type == "invoice.payment_failed":
        customer_email = data.get("customer_email", "unknown")
        attempt_count = data.get("attempt_count", 0)
        logger.warning(f"⚠ Payment failed: {customer_email} (attempt #{attempt_count})")
        if customer_email and customer_email != "unknown":
            await supabase_request("PATCH",
                f"user_subscriptions?user_email=eq.{customer_email}",
                {"status": "past_due"}
            )

    else:
        logger.info(f"Stripe webhook received: {event_type} (unhandled)")

    return {"received": True}


# ── SUBSCRIPTION STATUS CHECK ──
# Frontend calls this after auth to determine if the user is Pro.

class SubscriptionCheckPayload(BaseModel):
    access_token: str = Field(..., min_length=10)

@app.post("/api/subscription-status")
async def check_subscription_status(payload: SubscriptionCheckPayload):
    """Check if the authenticated user has an active Pro subscription.
    Returns {plan, status, isPro} for the frontend to gate features."""
    # Verify the JWT and extract the user email
    try:
        async with httpx.AsyncClient() as http_client:
            resp = await http_client.get(
                f"{SUPABASE_URL}/auth/v1/user",
                headers={
                    "Authorization": f"Bearer {payload.access_token}",
                    "apikey": SUPABASE_ANON_KEY
                }
            )
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid or expired token")
            user_data = resp.json()
            user_email = user_data.get("email", "")
    except httpx.RequestError:
        raise HTTPException(status_code=502, detail="Could not verify authentication")

    if not user_email:
        raise HTTPException(status_code=401, detail="Could not determine user email")

    # Look up subscription in Supabase
    sub = await supabase_request("GET",
        f"user_subscriptions?user_email=eq.{user_email}&select=plan,status")

    if sub and isinstance(sub, dict):
        plan = sub.get("plan", "free")
        status = sub.get("status", "active")
        is_pro = plan in ("pro", "enterprise") and status in ("active", "trialing")
    else:
        plan = "free"
        status = "active"
        is_pro = False

    return {"plan": plan, "status": status, "isPro": is_pro}

# ── TEAM WORKSPACES API ──

class WorkspaceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)

class WorkspaceInvite(BaseModel):
    email: str = Field(..., min_length=3)
    role: str = "member"

@app.post("/api/workspaces")
async def create_workspace(payload: WorkspaceCreate, email: str = Depends(get_user_email)):
    if not email:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Create workspace — supabase_request returns a single dict
    workspace = await supabase_request("POST", "workspaces", {
        "name": payload.name,
        "owner_email": email
    })
    
    if not workspace or not isinstance(workspace, dict) or "id" not in workspace:
        raise HTTPException(status_code=500, detail="Failed to create workspace")
        
    workspace_id = workspace.get("id")
    
    # Add creator as owner in workspace_members
    await supabase_request("POST", "workspace_members", {
        "workspace_id": workspace_id,
        "user_email": email,
        "role": "owner"
    })
    
    return workspace

@app.get("/api/workspaces")
async def list_workspaces(email: str = Depends(get_user_email)):
    if not email:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    # Get all memberships for the user — always returns a list
    memberships = await supabase_request_list(f"workspace_members?user_email=eq.{email}&select=workspace_id,role")
    
    if not memberships:
        return []
        
    workspace_ids = [m["workspace_id"] for m in memberships if isinstance(m, dict) and "workspace_id" in m]
    if not workspace_ids:
        return []
        
    # Fetch workspace details — always returns a list
    ids_param = ",".join(workspace_ids)
    workspaces = await supabase_request_list(f"workspaces?id=in.({ids_param})")
    return workspaces

@app.get("/api/workspaces/{workspace_id}/members")
async def list_workspace_members(workspace_id: str, email: str = Depends(get_user_email)):
    if not email:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    # Verify user is a member of this workspace
    membership = await supabase_request("GET", f"workspace_members?workspace_id=eq.{workspace_id}&user_email=eq.{email}")
    if not membership:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    members = await supabase_request_list(f"workspace_members?workspace_id=eq.{workspace_id}")
    return members

@app.delete("/api/workspaces/{workspace_id}")
async def delete_workspace(workspace_id: str, email: str = Depends(get_user_email)):
    """Delete a workspace. Only the owner can delete it."""
    if not email:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Verify user is the owner
    membership = await supabase_request("GET", f"workspace_members?workspace_id=eq.{workspace_id}&user_email=eq.{email}")
    if not membership or not isinstance(membership, dict) or membership.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Forbidden: Only the workspace owner can delete it")
    
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    }
    async with httpx.AsyncClient() as http_client:
        # Delete all members first
        await http_client.delete(
            f"{SUPABASE_URL}/rest/v1/workspace_members?workspace_id=eq.{workspace_id}",
            headers=headers
        )
        # Delete the workspace
        resp = await http_client.delete(
            f"{SUPABASE_URL}/rest/v1/workspaces?id=eq.{workspace_id}",
            headers=headers
        )
        if resp.status_code not in (200, 204):
            raise HTTPException(status_code=500, detail="Failed to delete workspace")
    
    return {"status": "success"}

@app.delete("/api/workspaces/{workspace_id}/members/{member_email}")
async def remove_workspace_member(workspace_id: str, member_email: str, email: str = Depends(get_user_email)):
    """Remove a member from a workspace. Requires admin/owner role."""
    if not email:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Verify requester is admin or owner
    membership = await supabase_request("GET", f"workspace_members?workspace_id=eq.{workspace_id}&user_email=eq.{email}")
    if not membership or not isinstance(membership, dict) or membership.get("role") not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Forbidden: Admin access required")
    
    # Cannot remove the owner
    target = await supabase_request("GET", f"workspace_members?workspace_id=eq.{workspace_id}&user_email=eq.{member_email}")
    if target and isinstance(target, dict) and target.get("role") == "owner":
        raise HTTPException(status_code=400, detail="Cannot remove the workspace owner")
    
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    }
    async with httpx.AsyncClient() as http_client:
        resp = await http_client.delete(
            f"{SUPABASE_URL}/rest/v1/workspace_members?workspace_id=eq.{workspace_id}&user_email=eq.{member_email}",
            headers=headers
        )
        if resp.status_code not in (200, 204):
            raise HTTPException(status_code=500, detail="Failed to remove member")
    
    return {"status": "success", "message": f"Removed {member_email}"}

@app.post("/api/workspaces/{workspace_id}/invite")
async def invite_workspace_member(workspace_id: str, payload: WorkspaceInvite, email: str = Depends(get_user_email)):
    if not email:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    # Verify user is an admin or owner — supabase_request returns a single dict
    membership = await supabase_request("GET", f"workspace_members?workspace_id=eq.{workspace_id}&user_email=eq.{email}")
    if not membership or not isinstance(membership, dict) or membership.get("role") not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Forbidden: Admin access required")
        
    # Add new member
    await supabase_request("POST", "workspace_members", {
        "workspace_id": workspace_id,
        "user_email": payload.email,
        "role": payload.role
    })
    
    return {"status": "success", "message": f"Invited {payload.email}"}

@app.get("/api/sentry-test")
async def sentry_test():
    """Test endpoint to trigger a deliberate error for Sentry verification"""
    return 1 / 0


# ── TRANSLATION HISTORY API ──
# Frontend uses this instead of querying Supabase directly
# (avoids RLS infinite recursion on workspace_members)

@app.get("/api/history")
async def get_translation_history(workspace_id: str = None, email: str = Depends(get_user_email)):
    if not email:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    if workspace_id:
        path = f"translation_history?workspace_id=eq.{workspace_id}&order=created_at.desc"
    else:
        path = f"translation_history?user_email=eq.{email}&workspace_id=is.null&order=created_at.desc"
    
    history = await supabase_request_list(path)
    return history

@app.delete("/api/history/{item_id}")
async def delete_history_item(item_id: str, email: str = Depends(get_user_email)):
    """Delete a single translation history item."""
    if not email:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Verify ownership
    item = await supabase_request("GET", f"translation_history?id=eq.{item_id}&user_email=eq.{email}")
    if not item:
        raise HTTPException(status_code=404, detail="History item not found")
    
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    }
    async with httpx.AsyncClient() as http_client:
        resp = await http_client.delete(
            f"{SUPABASE_URL}/rest/v1/translation_history?id=eq.{item_id}&user_email=eq.{email}",
            headers=headers
        )
        if resp.status_code not in (200, 204):
            raise HTTPException(status_code=500, detail="Failed to delete history item")
    
    return {"status": "success"}


# ── API KEYS API ──
# Same pattern — route through the backend to avoid RLS issues.

@app.get("/api/api-keys")
async def list_api_keys(workspace_id: str = None, email: str = Depends(get_user_email)):
    if not email:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    path = f"api_keys?user_email=eq.{email}&select=id,name,key_prefix,created_at,last_used_at&order=created_at.desc"
    if workspace_id:
        path += f"&workspace_id=eq.{workspace_id}"
    else:
        path += "&workspace_id=is.null"
    
    keys = await supabase_request_list(path)
    return keys

class ApiKeyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    workspace_id: str | None = None

@app.post("/api/api-keys")
async def create_api_key(payload: ApiKeyCreate, email: str = Depends(get_user_email)):
    if not email:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    raw_key = f"ak_{secrets.token_urlsafe(24)}"
    
    data = {
        "user_email": email,
        "name": payload.name,
        "key_prefix": raw_key[:8] + "...",
        "api_key_hash": hashlib.sha256(raw_key.encode()).hexdigest(),
    }
    if payload.workspace_id:
        data["workspace_id"] = payload.workspace_id
    
    result = await supabase_request("POST", "api_keys", data)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create API key")
    
    # Return the raw key (only shown once) along with the metadata
    return {**result, "raw_key": raw_key}


class ApiKeyDelete(BaseModel):
    key_id: str = Field(..., min_length=1)

@app.delete("/api/api-keys/{key_id}")
async def delete_api_key(key_id: str, email: str = Depends(get_user_email)):
    if not email:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # Verify ownership before deleting
    key = await supabase_request("GET", f"api_keys?id=eq.{key_id}&user_email=eq.{email}")
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    
    # Delete via PATCH with a special marker since we don't have a DELETE helper
    # Use direct HTTP delete instead
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    url = f"{SUPABASE_URL}/rest/v1/api_keys?id=eq.{key_id}&user_email=eq.{email}"
    headers = {
        "apikey": SUPABASE_SERVICE_KEY,
        "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    }
    async with httpx.AsyncClient() as http_client:
        resp = await http_client.delete(url, headers=headers)
        if resp.status_code not in (200, 204):
            raise HTTPException(status_code=500, detail="Failed to delete API key")
    
    return {"status": "success"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
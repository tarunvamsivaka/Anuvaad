import asyncio
import json
import os
import hashlib
import logging
import uvicorn
import stripe
import httpx
import redis.asyncio as redis
from collections import OrderedDict
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, BackgroundTasks, Depends
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

load_dotenv()
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator
from google import genai
from google.genai import types
import time

# Gemini API timeout (seconds) — prevents hung requests
GEMINI_TIMEOUT = 60

# ── STRUCTURED LOGGING ──
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("anuvaad")

# 1. Core Initialization
app = FastAPI(title="Anuvaad API")

# ── CORS ──
# FRONTEND_URL must be set in production .env to your actual domain.
# In development, localhost origins are also allowed.
_frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
_allowed_origins = [_frontend_url]
# Always allow both the legacy port and the Next.js dev server port
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

# 2. Modern Gemini SDK Setup
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if not GEMINI_API_KEY or GEMINI_API_KEY == "your_gemini_api_key_here":
    logger.warning("GEMINI_API_KEY is not set or still default!")
    logger.warning("Copy .env.example to .env and add your key from https://aistudio.google.com/apikey")
    logger.warning("The API will return errors until a valid key is provided.")
    GEMINI_API_KEY = GEMINI_API_KEY or "dummy_key"

client = genai.Client(api_key=GEMINI_API_KEY)

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
        # In a real app, hash the key and compare. For simplicity here:
        api_key_data = await supabase_request("GET", f"api_keys?api_key_hash=eq.{token}&select=user_email")
        if api_key_data and isinstance(api_key_data, dict):
            # Update last_used_at
            await supabase_request("PATCH", f"api_keys?api_key_hash=eq.{token}", {"last_used_at": "now()"})
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

async def log_translation_history(email: str, title: str, source_lang: str, target_lang: str, mode: str, chars: int, workspace_id: str | None = None):
    if not email: return
    data = {
        "user_email": email,
        "title": title[:100],
        "source_language": source_lang,
        "target_language": target_lang,
        "mode": mode,
        "character_count": chars
    }
    if workspace_id:
        data["workspace_id"] = workspace_id
        
    await supabase_request("POST", "translation_history", data)

logger.info(f"Anuvaad API starting -- Gemini key: {'Set' if GEMINI_API_KEY != 'dummy_key' else 'Missing'}")

# ── HEALTH CHECK ──
@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "anuvaad-api",
        "gemini_configured": GEMINI_API_KEY != "dummy_key",
        "stripe_configured": bool(STRIPE_KEY and STRIPE_KEY != "sk_test_your_stripe_secret_key_here")
    }

SYSTEM_INSTRUCTION = """
You are an expert code translator. Analyze the provided code and break it down logically.
Provide a clear, plain-English, beginner-friendly explanation of what the code does. Use Markdown formatting. Use markdown code blocks (` ``` `) when referencing specific snippets of code.
Do NOT wrap your response in JSON. Return pure Markdown.
"""

# ── REDIS CONNECTION ──
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")
try:
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
except Exception as e:
    logger.warning(f"Could not initialize Redis client. Check REDIS_URL. {e}")
    redis_client = None

# ── RATE LIMITING (Redis-backed) ──
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX = 15     # requests per window

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    if not request.url.path.startswith("/api/"):
        return await call_next(request)
    
    if not redis_client:
        # Fallback if Redis is totally down (not ideal for prod, but safe)
        return await call_next(request)

    client_ip = request.client.host if request.client else "unknown"
    redis_key = f"rate_limit:{client_ip}"
    
    try:
        current_count = await redis_client.incr(redis_key)
        if current_count == 1:
            await redis_client.expire(redis_key, RATE_LIMIT_WINDOW)
            
        if current_count > RATE_LIMIT_MAX:
            return JSONResponse(
                status_code=429,
                content={"detail": f"Rate limit exceeded. Max {RATE_LIMIT_MAX} requests per {RATE_LIMIT_WINDOW}s."}
            )
    except Exception as e:
        logger.error(f"Redis rate limit error: {e}")
        # Allow request if Redis fails to avoid total outage
        pass

    response = await call_next(request)
    return response

def cache_key(code: str, language: str, endpoint: str) -> str:
    return "anuvaad_cache:" + hashlib.sha256(f"{endpoint}:{language}:{code}".encode()).hexdigest()

# 3. Pydantic Data Models (with validation)
class CodePayload(BaseModel):
    raw_code: str = Field(..., min_length=1, max_length=10000)
    language: str = Field(..., min_length=1, max_length=30)
    workspace_id: str | None = None

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

    @field_validator('prompt')
    @classmethod
    def prompt_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('Prompt cannot be empty or whitespace only')
        return v

class CodeToCodePayload(BaseModel):
    raw_code: str = Field(..., min_length=1, max_length=10000)
    source_language: str = Field(..., min_length=1, max_length=30)
    target_language: str = Field(..., min_length=1, max_length=30)
    workspace_id: str | None = None

    @field_validator('raw_code')
    @classmethod
    def raw_code_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('Code cannot be empty or whitespace only')
        return v

# ── RESPONSE NORMALIZATION ──
def normalize_blocks(raw_result) -> list:
    """Ensure Gemini response is a list of {id, code_snippet, english_translation} dicts.
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
        })

    # Filter out blocks with no meaningful content at all
    normalized = [b for b in normalized if b['english_translation'].strip() or b['code_snippet'].strip()]

    if not normalized:
        raise ValueError("API returned no usable translation blocks")

    return normalized

# 4. API Routes
@app.post("/api/code-to-english")
async def function_translate_to_english(payload: CodePayload, background_tasks: BackgroundTasks, email: str | None = Depends(get_user_email)):
    key = cache_key(payload.raw_code, payload.language, "code-to-english")
    
    if redis_client:
        try:
            cached_str = await redis_client.get(key)
            if cached_str:
                cached = json.loads(cached_str)
                if email:
                    title = payload.raw_code.split('\n')[0][:50] + "..." if len(payload.raw_code) > 50 else payload.raw_code[:50]
                    background_tasks.add_task(log_translation_history, email, title, payload.language, "english", "Code → English", len(payload.raw_code), payload.workspace_id)
                return cached
        except Exception as e:
            logger.error(f"Redis cache get error: {e}")

    user_prompt = f"Programming Language: {payload.language}\n\nCode to Analyze/Translate:\n{payload.raw_code}"
    
    try:
        response = await asyncio.wait_for(
            asyncio.to_thread(
                client.models.generate_content,
                model='gemini-2.5-flash',
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_INSTRUCTION,
                    response_mime_type="application/json"
                )
            ),
            timeout=GEMINI_TIMEOUT
        )
        raw = json.loads(response.text)
        result = normalize_blocks(raw)
        
        if redis_client:
            try:
                await redis_client.setex(key, 86400 * 7, json.dumps(result)) # Cache for 7 days
            except Exception as e:
                logger.error(f"Redis cache set error: {e}")
        
        if email:
            title = payload.raw_code.split('\n')[0][:50] + "..." if len(payload.raw_code) > 50 else payload.raw_code[:50]
            background_tasks.add_task(log_translation_history, email, title, payload.language, "english", "Code → English", len(payload.raw_code), payload.workspace_id)
            
        return result
    except json.JSONDecodeError as e:
        logger.error(f"JSON Parse Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Translation engine returned invalid JSON. Please try again.")
    except ValueError as e:
        logger.error(f"Normalization Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Translation engine returned an unexpected format. Please try again.")
    except asyncio.TimeoutError:
        logger.error(f"Gemini API Timeout after {GEMINI_TIMEOUT}s")
        raise HTTPException(status_code=504, detail=f"Translation timed out after {GEMINI_TIMEOUT}s. Please try again.")
    except Exception as e:
        logger.error(f"Gemini API Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Translation failed. Please check your API key and try again.")

@app.post("/api/generate-from-english")
async def function_generate_from_english(payload: GeneratePayload, background_tasks: BackgroundTasks, email: str | None = Depends(get_user_email)):
    key = cache_key(payload.prompt, payload.language, "generate-from-english")
    
    if redis_client:
        try:
            cached_str = await redis_client.get(key)
            if cached_str:
                cached = json.loads(cached_str)
                if email:
                    title = payload.prompt[:50] + "..." if len(payload.prompt) > 50 else payload.prompt
                    background_tasks.add_task(log_translation_history, email, title, "english", payload.language, "English → Code", len(payload.prompt), payload.workspace_id)
                return cached
        except Exception as e:
            logger.error(f"Redis cache get error: {e}")

    user_prompt = f"Programming Language: {payload.language}\n\nUser Request:\n{payload.prompt}\n\nFirst, generate the complete, working code to satisfy this request. Then, analyze your generated code and break it down into logical blocks using the system instructions."

    try:
        response = await asyncio.wait_for(
            asyncio.to_thread(
                client.models.generate_content,
                model='gemini-2.5-flash',
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_INSTRUCTION,
                    response_mime_type="application/json"
                )
            ),
            timeout=GEMINI_TIMEOUT
        )
        raw = json.loads(response.text)
        result = normalize_blocks(raw)
        
        if redis_client:
            try:
                await redis_client.setex(key, 86400 * 7, json.dumps(result))
            except Exception as e:
                logger.error(f"Redis cache set error: {e}")
        
        if email:
            title = payload.prompt[:50] + "..." if len(payload.prompt) > 50 else payload.prompt
            background_tasks.add_task(log_translation_history, email, title, "english", payload.language, "English → Code", len(payload.prompt), payload.workspace_id)
            
        return result
    except json.JSONDecodeError as e:
        logger.error(f"JSON Parse Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Code generation returned invalid JSON. Please try again.")
    except ValueError as e:
        logger.error(f"Normalization Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Code generation returned an unexpected format. Please try again.")
    except asyncio.TimeoutError:
        logger.error(f"Gemini API Timeout after {GEMINI_TIMEOUT}s")
        raise HTTPException(status_code=504, detail=f"Code generation timed out after {GEMINI_TIMEOUT}s. Please try again.")
    except Exception as e:
        logger.error(f"Gemini API Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Code generation failed. Please check your API key and try again.")

# NOTE: This endpoint is intentionally NOT cached because the full_context
# changes with every edit, making cache hits essentially impossible.
@app.post("/api/english-to-code")
async def function_update_to_code(payload: EnglishUpdatePayload):
    user_prompt = f"You are an expert programmer. The user is modifying a specific part of their code based on an English instruction. Here is the full context of the code: {payload.full_context}. The user wants to change the block identified as {payload.block_id} to do the following: '{payload.modified_english}'. Generate ONLY the new raw programming syntax required to fulfill this specific instruction. Do not include markdown formatting, backticks, or explanations. Return strictly the raw code."

    try:
        response = await asyncio.wait_for(
            asyncio.to_thread(
                client.models.generate_content,
                model='gemini-2.5-flash',
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="text/plain"
                )
            ),
            timeout=GEMINI_TIMEOUT
        )
        return {"status": "success", "updated_code": response.text.strip()}
    except asyncio.TimeoutError:
        logger.error(f"Gemini API Timeout after {GEMINI_TIMEOUT}s")
        raise HTTPException(status_code=504, detail=f"Code update timed out after {GEMINI_TIMEOUT}s. Please try again.")
    except Exception as e:
        logger.error(f"Gemini API Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Code update failed. Please check your API key and try again.")

# NEW: Code-to-Code Translation
@app.post("/api/code-to-code")
async def function_code_to_code(payload: CodeToCodePayload, background_tasks: BackgroundTasks, email: str | None = Depends(get_user_email)):
    key = cache_key(payload.raw_code, f"{payload.source_language}->{payload.target_language}", "code-to-code")
    
    if redis_client:
        try:
            cached_str = await redis_client.get(key)
            if cached_str:
                cached = json.loads(cached_str)
                if email:
                    title = payload.raw_code.split('\n')[0][:50] + "..." if len(payload.raw_code) > 50 else payload.raw_code[:50]
                    background_tasks.add_task(log_translation_history, email, title, payload.source_language, payload.target_language, "Code → Code", len(payload.raw_code), payload.workspace_id)
                return cached
        except Exception as e:
            logger.error(f"Redis cache get error: {e}")

    system = f"""You are an expert polyglot programmer. Translate the given code from {payload.source_language} to {payload.target_language}.
Produce a complete, working, idiomatic translation. Then break the translated code into logical blocks.
Return a JSON array where each object has: id (e.g. 'block_1'), code_snippet (the translated code for that block), and english_translation (a brief explanation of what this block does)."""

    user_prompt = f"Source Language: {payload.source_language}\nTarget Language: {payload.target_language}\n\nCode to Translate:\n{payload.raw_code}"

    try:
        response = await asyncio.wait_for(
            asyncio.to_thread(
                client.models.generate_content,
                model='gemini-2.5-flash',
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system,
                    response_mime_type="application/json"
                )
            ),
            timeout=GEMINI_TIMEOUT
        )
        raw = json.loads(response.text)
        result = normalize_blocks(raw)
        if redis_client:
            try:
                await redis_client.setex(key, 86400 * 7, json.dumps(result))
            except Exception as e:
                logger.error(f"Redis cache set error: {e}")
        
        if email:
            title = payload.raw_code.split('\n')[0][:50] + "..." if len(payload.raw_code) > 50 else payload.raw_code[:50]
            background_tasks.add_task(log_translation_history, email, title, payload.source_language, payload.target_language, "Code → Code", len(payload.raw_code), payload.workspace_id)
            
        return result
    except json.JSONDecodeError as e:
        logger.error(f"JSON Parse Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Code translation returned invalid JSON. Please try again.")
    except ValueError as e:
        logger.error(f"Normalization Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Code translation returned an unexpected format. Please try again.")
    except asyncio.TimeoutError:
        logger.error(f"Gemini API Timeout after {GEMINI_TIMEOUT}s")
        raise HTTPException(status_code=504, detail=f"Code translation timed out after {GEMINI_TIMEOUT}s. Please try again.")
    except Exception as e:
        logger.error(f"Gemini API Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Code translation failed. Please check your API key and try again.")

# 5. Stripe Config & Routes

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
        import httpx
        supabase_url = os.getenv("SUPABASE_URL", "https://lbqgvehjtbfkxawbznwd.supabase.co")
        async with httpx.AsyncClient() as http_client:
            resp = await http_client.get(
                f"{supabase_url}/auth/v1/user",
                headers={"Authorization": f"Bearer {payload.access_token}",
                         "apikey": os.getenv("SUPABASE_ANON_KEY", "")}
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


# ── STRIPE WEBHOOKS ──
# Handles the full subscription lifecycle and updates the Supabase
# user_subscriptions table so the frontend can gate Pro features.

STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")

@app.post("/api/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events and update user_subscriptions in Supabase."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    if not STRIPE_WEBHOOK_SECRET:
        logger.warning("STRIPE_WEBHOOK_SECRET not set — webhook signature verification disabled")
        try:
            event = json.loads(payload)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid payload")
    else:
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
        customer_email = data.get("customer_email", "unknown")
        subscription_id = data.get("subscription", "")
        customer_id = data.get("customer", "")
        logger.info(f"✅ New subscription: {customer_email} (sub: {subscription_id})")
        # Upsert into Supabase — creates or updates the user's subscription record
        await supabase_request("POST", "user_subscriptions", {
            "user_email": customer_email,
            "stripe_customer_id": customer_id,
            "stripe_subscription_id": subscription_id,
            "plan": "pro",
            "status": "active"
        })

    elif event_type == "customer.subscription.updated":
        status = data.get("status", "unknown")
        customer_id = data.get("customer", "")
        period_end = data.get("current_period_end")
        logger.info(f"🔄 Subscription updated: customer={customer_id} status={status}")
        # Map Stripe status to our simplified status
        db_status = "active" if status in ("active", "trialing") else "past_due" if status == "past_due" else "cancelled"
        update_data = {"status": db_status}
        if period_end:
            from datetime import datetime, timezone
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
    
    import secrets
    raw_key = f"ak_{secrets.token_urlsafe(24)}"
    
    data = {
        "user_email": email,
        "name": payload.name,
        "key_prefix": raw_key[:8] + "...",
        "api_key_hash": raw_key,
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
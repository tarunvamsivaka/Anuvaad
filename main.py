import asyncio
import json
import os
import hashlib
import logging
import uvicorn
import stripe
from collections import OrderedDict
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

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
_frontend_url = os.getenv("FRONTEND_URL", "http://127.0.0.1:5500")
_allowed_origins = [_frontend_url]
if _frontend_url not in ("http://localhost:5500", "http://127.0.0.1:5500"):
    _allowed_origins += ["http://localhost:5500", "http://127.0.0.1:5500"]

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
You are an expert code translator. Analyze the provided code and break it down into logical, sequential blocks.
For each block, provide the exact raw code snippet and a plain-English, beginner-friendly explanation of what that specific code does.
You MUST return the response as a JSON array of objects. Each object must have exactly three keys: id (a unique string like 'block_1'), code_snippet (the exact raw code), and english_translation (the plain text explanation).
"""

# ── RATE LIMITING ──
# NOTE: In-memory store — resets on server restart and is per-worker.
# For multi-worker production deployments, replace with Redis.
RATE_LIMIT_WINDOW = 60  # seconds
RATE_LIMIT_MAX = 15     # requests per window
_rate_store: dict[str, list[float]] = {}

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    if not request.url.path.startswith("/api/"):
        return await call_next(request)
    
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    
    if client_ip not in _rate_store:
        _rate_store[client_ip] = []
    
    # Clean old entries
    _rate_store[client_ip] = [t for t in _rate_store[client_ip] if now - t < RATE_LIMIT_WINDOW]
    
    if len(_rate_store[client_ip]) >= RATE_LIMIT_MAX:
        return JSONResponse(
            status_code=429,
            content={"detail": f"Rate limit exceeded. Max {RATE_LIMIT_MAX} requests per {RATE_LIMIT_WINDOW}s."}
        )
    
    _rate_store[client_ip].append(now)
    response = await call_next(request)
    return response

# ── LRU CACHE ──
# NOTE: In-memory cache — lost on restart, not shared across workers.
# For persistence, replace with Redis or memcached.
class LRUCache:
    def __init__(self, max_size=100):
        self._cache = OrderedDict()
        self._max = max_size

    def get(self, key):
        if key in self._cache:
            self._cache.move_to_end(key)
            return self._cache[key]
        return None

    def put(self, key, value):
        if key in self._cache:
            self._cache.move_to_end(key)
        self._cache[key] = value
        if len(self._cache) > self._max:
            self._cache.popitem(last=False)

_translation_cache = LRUCache(max_size=200)

def cache_key(code: str, language: str, endpoint: str) -> str:
    return hashlib.sha256(f"{endpoint}:{language}:{code}".encode()).hexdigest()

# 3. Pydantic Data Models (with validation)
class CodePayload(BaseModel):
    raw_code: str = Field(..., min_length=1, max_length=10000)
    language: str = Field(..., min_length=1, max_length=30)

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
async def function_translate_to_english(payload: CodePayload):
    key = cache_key(payload.raw_code, payload.language, "code-to-english")
    cached = _translation_cache.get(key)
    if cached:
        return cached

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
        _translation_cache.put(key, result)
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
async def function_generate_from_english(payload: GeneratePayload):
    key = cache_key(payload.prompt, payload.language, "generate-from-english")
    cached = _translation_cache.get(key)
    if cached:
        return cached

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
        _translation_cache.put(key, result)
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
async def function_code_to_code(payload: CodeToCodePayload):
    key = cache_key(payload.raw_code, f"{payload.source_language}->{payload.target_language}", "code-to-code")
    cached = _translation_cache.get(key)
    if cached:
        return cached

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
        _translation_cache.put(key, result)
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
            success_url=f'{os.getenv("FRONTEND_URL", "http://127.0.0.1:5500")}/index.html?payment=success',
            cancel_url=f'{os.getenv("FRONTEND_URL", "http://127.0.0.1:5500")}/index.html?payment=cancel',
            customer_email=verified_email,
        )
        return {"url": session.url}
    except Exception as e:
        logger.error(f"Stripe Error: {str(e)}")
        raise HTTPException(status_code=500, detail="Payment session creation failed. Please try again later.")


# ── STRIPE WEBHOOKS ──
# Handles the full subscription lifecycle:
# - checkout.session.completed → new subscriber
# - customer.subscription.updated → plan change / renewal
# - customer.subscription.deleted → cancellation
# - invoice.payment_failed → failed payment

STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")

@app.post("/api/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events for subscription lifecycle management.
    Requires STRIPE_WEBHOOK_SECRET to verify event signatures."""
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
        logger.info(f"✅ New subscription: {customer_email} (sub: {subscription_id})")

    elif event_type == "customer.subscription.updated":
        status = data.get("status", "unknown")
        customer_id = data.get("customer", "")
        logger.info(f"🔄 Subscription updated: customer={customer_id} status={status}")

    elif event_type == "customer.subscription.deleted":
        customer_id = data.get("customer", "")
        logger.info(f"❌ Subscription cancelled: customer={customer_id}")

    elif event_type == "invoice.payment_failed":
        customer_email = data.get("customer_email", "unknown")
        attempt_count = data.get("attempt_count", 0)
        logger.warning(f"⚠ Payment failed: {customer_email} (attempt #{attempt_count})")

    else:
        logger.info(f"Stripe webhook received: {event_type} (unhandled)")

    return {"received": True}


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
"""
Phase 5.2 — Anonymous Demo Endpoint (POST /api/demo/translate)

Rate limit: 3 requests per IP per 24h (no auth required).
Returns a pre-cached sample translation for the selected language pair.
This powers the landing page Live Demo section without requiring a user account.
"""
import os

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.core.auth import get_client_ip
from app.core.cache import cache
from app.core.config import logger

router = APIRouter(prefix="", tags=["demo"])

DEMO_RATE_LIMIT = int(os.getenv("DEMO_RATE_LIMIT_PER_DAY", "3"))
DEMO_RATE_WINDOW = 86400  # 24 hours in seconds


class DemoTranslateRequest(BaseModel):
    language: str = Field(..., min_length=1, max_length=30, description="Source programming language")
    mode: str = Field(
        "code-to-english",
        description="Translation mode: code-to-english | code-to-code",
        pattern=r"^(code-to-english|code-to-code)$",
    )
    target_language: str = Field("python", min_length=1, max_length=30)


# Pre-cached demo translation samples — used to return a realistic-looking
# result without hitting the LLM. Keeps the demo fast and free.
DEMO_SAMPLES: dict[str, dict] = {
    "javascript": {
        "blocks": [
            {
                "id": "block_1",
                "code_snippet": "const fetchUser = async (id) => {\n  const res = await fetch(`/users/${id}`);\n  if (!res.ok) throw new Error('User not found');\n  return res.json();\n};",
                "english_translation": "This is an asynchronous function that fetches a user's data from the server. It builds a URL using the user's ID, sends an HTTP GET request, and throws an error if the request fails. If successful, it returns the parsed JSON response.",
            },
            {
                "id": "block_2",
                "code_snippet": "export default fetchUser;",
                "english_translation": "This line exports the fetchUser function as the default export, making it available for import in other files.",
            },
        ],
        "model_used": "demo",
    },
    "python": {
        "blocks": [
            {
                "id": "block_1",
                "code_snippet": "async def get_user(user_id: str) -> dict:\n    async with httpx.AsyncClient() as client:\n        resp = await client.get(f\"/users/{user_id}\")\n        resp.raise_for_status()\n        return resp.json()",
                "english_translation": "This is an asynchronous Python function that retrieves user data. It creates a temporary HTTP client, sends a GET request to the user endpoint, raises an exception if the HTTP status indicates an error, then returns the response as a Python dictionary.",
            }
        ],
        "model_used": "demo",
    },
    "typescript": {
        "blocks": [
            {
                "id": "block_1",
                "code_snippet": "interface User {\n  id: string;\n  name: string;\n  email: string;\n}\n\nasync function fetchUser(id: string): Promise<User> {\n  const response = await fetch(`/api/users/${id}`);\n  if (!response.ok) throw new Error(`HTTP ${response.status}`);\n  return response.json() as Promise<User>;\n}",
                "english_translation": "This TypeScript code defines a User type with three fields (id, name, email) and an asynchronous function that fetches a user by ID. The function makes an HTTP GET request, throws an error with the status code if it fails, and returns the JSON response typed as a User object.",
            }
        ],
        "model_used": "demo",
    },
    "rust": {
        "blocks": [
            {
                "id": "block_1",
                "code_snippet": "async fn fetch_user(id: &str) -> Result<User, reqwest::Error> {\n    let url = format!(\"/users/{}\", id);\n    reqwest::get(&url).await?.json::<User>().await\n}",
                "english_translation": "This Rust async function fetches a user by ID. It builds the URL by formatting the ID into the path, sends a GET request using reqwest, awaits the response, then deserializes the JSON body into a User struct. Errors are propagated using the ? operator.",
            }
        ],
        "model_used": "demo",
    },
    "go": {
        "blocks": [
            {
                "id": "block_1",
                "code_snippet": "func fetchUser(id string) (*User, error) {\n    resp, err := http.Get(\"/users/\" + id)\n    if err != nil {\n        return nil, err\n    }\n    defer resp.Body.Close()\n    var user User\n    if err := json.NewDecoder(resp.Body).Decode(&user); err != nil {\n        return nil, err\n    }\n    return &user, nil\n}",
                "english_translation": "This Go function retrieves a user by ID. It sends an HTTP GET request, handles any connection errors, ensures the response body is closed when done, then decodes the JSON response body into a User struct. It returns either the user or an error.",
            }
        ],
        "model_used": "demo",
    },
    "java": {
        "blocks": [
            {
                "id": "block_1",
                "code_snippet": "public CompletableFuture<User> fetchUser(String id) {\n    return HttpClient.newHttpClient()\n        .sendAsync(\n            HttpRequest.newBuilder()\n                .uri(URI.create(\"/users/\" + id))\n                .build(),\n            HttpResponse.BodyHandlers.ofString()\n        )\n        .thenApply(response -> gson.fromJson(response.body(), User.class));\n}",
                "english_translation": "This Java method asynchronously fetches a user from an API. It creates an HTTP client, builds a GET request with the user ID in the URL, sends it asynchronously, then transforms the response by parsing the JSON body into a User object using Gson.",
            }
        ],
        "model_used": "demo",
    },
}

# Default fallback for unsupported languages
DEFAULT_DEMO = DEMO_SAMPLES["javascript"]


@router.post("/demo/translate")
async def demo_translate(request: Request, payload: DemoTranslateRequest):
    """
    Anonymous demo translation endpoint for the landing page.

    Rate-limited to DEMO_RATE_LIMIT requests per IP per 24 hours.
    Returns a pre-cached sample translation (no LLM call).
    """
    client_ip = get_client_ip(request)
    rate_key = f"demo_rate:{client_ip}"

    # Check rate limit
    current_count = await cache.incr_rate_limit(rate_key, DEMO_RATE_WINDOW)
    if current_count > DEMO_RATE_LIMIT:
        logger.info(f"Demo rate limit exceeded for IP: {client_ip}")
        raise HTTPException(
            status_code=429,
            detail=f"Demo limit reached. Maximum {DEMO_RATE_LIMIT} demo translations per day. "
                   "Create a free account to get 10 translations/day with no limit reset wait.",
        )

    remaining = max(0, DEMO_RATE_LIMIT - current_count)
    language_key = payload.language.lower()
    sample = DEMO_SAMPLES.get(language_key, DEFAULT_DEMO)

    logger.info(f"Demo translation served: language={payload.language}, ip={client_ip}, remaining={remaining}")

    return JSONResponse(
        content={
            **sample,
            "demo": True,
            "language": payload.language,
            "mode": payload.mode,
            "remaining_demo_requests": remaining,
        },
        headers={
            "X-Demo-Remaining": str(remaining),
            "X-Demo-Limit": str(DEMO_RATE_LIMIT),
            "Cache-Control": "private, no-store",
        },
    )

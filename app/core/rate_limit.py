from fastapi import Request, HTTPException
from app.core.cache import cache
import hashlib

def rate_limiter(calls: int, window: int):
    async def _rate_limit_dependency(request: Request):
        client_ip = request.client.host if request.client else "127.0.0.1"
        auth_header = request.headers.get("Authorization")
        
        token = None
        if auth_header and auth_header.startswith("Bearer "):
            parts = auth_header.split(" ")
            if len(parts) > 1:
                token = parts[1]
                
        if token:
            token_hash = hashlib.sha256(token.encode()).hexdigest()
            redis_key = f"rate_limit:specific:{request.url.path}:{token_hash}"
        else:
            redis_key = f"rate_limit:specific:{request.url.path}:{client_ip}"
            
        current_count = await cache.incr_rate_limit(redis_key, window)
        
        if current_count > calls:
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded for this endpoint. Max {calls} requests per {window}s.",
                headers={"Retry-After": str(window)}
            )
            
    return _rate_limit_dependency

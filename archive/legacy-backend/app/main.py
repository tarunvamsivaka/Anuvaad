"""
Anuvaad AI Code Translation Platform — FastAPI Main Application
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.api import api_router
from app.services.ai_gateway import ai_gateway

# Optional Scalar Interactive API Docs
try:
    from scalar_fastapi import get_scalar_api_reference
    _SCALAR_AVAILABLE = True
except ImportError:
    _SCALAR_AVAILABLE = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup sequence
    yield
    # Graceful shutdown: close connection pools
    await ai_gateway.close()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="High-performance AI Code Translation Engine with Verifiable Zero Code Retention & Deterministic Tree-sitter AST validation.",
    lifespan=lifespan,
    docs_url="/docs" if not _SCALAR_AVAILABLE else None,
    redoc_url="/redoc",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"^https://anuvaad(-[a-zA-Z0-9_-]+)?\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include v1 API router
app.include_router(api_router, prefix=settings.API_V1_STR)


# Mount Scalar API Interactive Reference if available
if _SCALAR_AVAILABLE:
    @app.get("/scalar", include_in_schema=False)
    @app.get("/docs", include_in_schema=False)
    async def scalar_html():
        return get_scalar_api_reference(
            openapi_url=app.openapi_url,
            title=f"{settings.PROJECT_NAME} — Interactive Docs",
        )


@app.get("/", include_in_schema=False)
async def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
        "api_v1": settings.API_V1_STR,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

"""
Health check and system telemetry endpoints.
"""
from fastapi import APIRouter
from app.core.config import settings
from app.services.ast_parser import _TREE_SITTER_AVAILABLE

router = APIRouter()


@router.get("/healthz", summary="Health Check")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "ast_engine": "tree-sitter-0.23" if _TREE_SITTER_AVAILABLE else "deterministic-fallback",
        "environment": settings.ENVIRONMENT,
    }


@router.get("/status", summary="Infrastructure Status")
async def platform_status():
    return {
        "gateway_tiers": {
            "tier_1_cerebras": bool(settings.CEREBRAS_API_KEY),
            "tier_2_gemini": bool(settings.GEMINI_API_KEY),
            "tier_3_deepseek": bool(settings.DEEPSEEK_API_KEY),
            "tier_5_compiler": True,
        },
        "zdr_active": True,
        "tree_sitter_grammars": _TREE_SITTER_AVAILABLE,
    }

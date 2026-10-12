"""
API v1 Router aggregation.
"""
from fastapi import APIRouter
from app.api.v1.endpoints import health, translate, ast, history, repository

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health & Status"])
api_router.include_router(translate.router, tags=["Code Translation & ZDR Receipts"])
api_router.include_router(ast.router, prefix="/ast", tags=["Deterministic AST Validation"])
api_router.include_router(history.router, tags=["Translation History & Keyset Pagination"])
api_router.include_router(repository.router, prefix="/repo", tags=["Repository Modernization & DAG"])

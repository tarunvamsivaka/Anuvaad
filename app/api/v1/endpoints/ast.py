"""
Standalone AST inspection, parsing, and syntax boundary verification endpoint.
"""
from fastapi import APIRouter
from app.schemas.ast import (
    ASTValidationRequest,
    ASTValidationResponse,
)
from app.services.ast_parser import ast_engine

router = APIRouter()


@router.post(
    "/validate",
    response_model=ASTValidationResponse,
    summary="Validate Code Syntax Boundaries and Extract Structural Symbols",
)
async def validate_ast(request: ASTValidationRequest):
    return await ast_engine.parse_async(
        code=request.code,
        language=request.language,
    )

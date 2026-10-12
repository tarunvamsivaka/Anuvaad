"""
Pydantic V2 schemas for Tree-sitter AST boundary verification and symbol inspection.
"""
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.translation import SupportedLanguage


class ASTCoordinate(BaseModel):
    row: int = Field(..., description="Zero-indexed row number")
    column: int = Field(..., description="Zero-indexed column number")
    byte_offset: int = Field(..., description="Absolute byte offset in code")


class ASTErrorNode(BaseModel):
    start_point: ASTCoordinate
    end_point: ASTCoordinate
    node_type: str = Field(description="AST node type (e.g. ERROR, MISSING)")
    snippet: str = Field(description="Code excerpt around syntax error")


class SymbolInfo(BaseModel):
    name: str
    kind: str = Field(description="function, class, method, interface, struct")
    start_point: ASTCoordinate
    end_point: ASTCoordinate


class ASTValidationRequest(BaseModel):
    code: str = Field(..., min_length=1, description="Code to parse and validate")
    language: SupportedLanguage = Field(..., description="Language grammar to apply")


class ASTValidationResponse(BaseModel):
    is_valid: bool = Field(..., description="True if node.has_error is False")
    root_type: str = Field(description="Root AST node type")
    symbols: List[SymbolInfo] = Field(default_factory=list, description="Extracted structural symbols")
    syntax_errors: List[ASTErrorNode] = Field(default_factory=list, description="Syntax errors detected by Tree-sitter")
    total_nodes: int = Field(default=0, description="Total node count in AST tree")

    model_config = ConfigDict(frozen=True)

"""
Pydantic V2 schemas for translation contracts, ZDR receipts, and language options.
"""
from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field, ConfigDict


class SupportedLanguage(str, Enum):
    PYTHON = "python"
    TYPESCRIPT = "typescript"
    JAVASCRIPT = "javascript"
    GO = "go"
    RUST = "rust"
    JAVA = "java"
    CPP = "cpp"
    CSHARP = "csharp"


class ZdrAuditReceipt(BaseModel):
    """Cryptographic proof of Zero Code Retention."""
    audit_digest: str = Field(description="Deterministic HMAC-SHA256 receipt")
    source_code_hash: str = Field(description="SHA-256 hash of ephemeral input buffer")
    timestamp: int = Field(description="Unix epoch timestamp of translation")
    user_id: str = Field(description="User or workspace identifier")
    ephemeral_lifecycle_ms: float = Field(description="Time input code remained in RAM buffer before purge")
    zero_retention_guaranteed: bool = Field(default=True, description="Strict zero retention compliance guarantee")

    model_config = ConfigDict(frozen=True)


class TranslationRequest(BaseModel):
    source_code: str = Field(..., min_length=1, max_length=150000, description="Source code snippet to translate")
    source_language: SupportedLanguage = Field(..., description="Language of the input source code")
    target_language: SupportedLanguage = Field(..., description="Target language to translate into")
    user_id: str = Field(default="ephemeral-guest", description="Anonymous or workspace session ID")
    preserve_comments: bool = Field(default=True, description="Preserve docstrings and comments")
    strict_ast_verification: bool = Field(default=True, description="Reject code with syntax errors (node.has_error)")

    model_config = ConfigDict(
        str_strip_whitespace=True,
        json_schema_extra={
            "example": {
                "source_code": "def fibonacci(n: int) -> int:\n    if n <= 1:\n        return n\n    return fibonacci(n - 1) + fibonacci(n - 2)",
                "source_language": "python",
                "target_language": "typescript",
                "user_id": "usr_dev_1001"
            }
        }
    )


class TranslationResponse(BaseModel):
    translated_code: str = Field(..., description="Translated source code")
    source_language: SupportedLanguage
    target_language: SupportedLanguage
    ast_valid: bool = Field(..., description="Whether translated AST passed syntax verification")
    symbols_validated: List[str] = Field(default_factory=list, description="Extracted symbols verified across languages")
    zdr_receipt: ZdrAuditReceipt = Field(..., description="Cryptographic Zero Retention receipt")
    inference_tier: str = Field(..., description="Model tier executing the translation")
    latency_ms: float = Field(..., description="End-to-end processing latency in milliseconds")

    model_config = ConfigDict(extra="forbid")

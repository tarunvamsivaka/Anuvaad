"""
Pydantic V2 schemas for repository ingestion, file trees, symbols, and batch translation.
"""
import uuid
from typing import Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.translation import SupportedLanguage, ZdrAuditReceipt


class FileNode(BaseModel):
    path: str = Field(description="Relative file path in repository")
    language: SupportedLanguage
    size_bytes: int
    symbol_count: int = 0
    translation_status: str = Field(default="pending", description="pending, translating, completed, failed")
    translated_code: Optional[str] = None
    ast_valid: Optional[bool] = None


class RepoImportRequest(BaseModel):
    workspace_id: Optional[str] = Field(default=None, description="Target workspace UUID")
    provider: str = Field(default="github", description="github, gitlab, direct_upload")
    repository_name: str = Field(..., description="Repository name e.g. 'org/repo'")
    files: Dict[str, str] = Field(..., description="Dictionary of relative file paths to file contents")
    source_language: SupportedLanguage
    target_language: SupportedLanguage


class RepoImportResponse(BaseModel):
    import_id: str
    repository_name: str
    total_files: int
    topological_order: List[str]
    symbols_extracted: int
    message: str


class RepoBatchTranslateRequest(BaseModel):
    import_id: str
    target_language: SupportedLanguage
    user_id: str = "ephemeral_engineer"
    preserve_comments: bool = True
    max_parallel_files: int = Field(default=3, le=5)


class RepoFileTranslateResult(BaseModel):
    path: str
    translated_code: str
    ast_valid: bool
    symbols_preserved: List[str]
    latency_ms: float
    error: Optional[str] = None


class RepoBatchTranslateResponse(BaseModel):
    import_id: str
    completed_files: int
    failed_files: int
    results: List[RepoFileTranslateResult]
    batch_zdr_receipt: ZdrAuditReceipt
    total_latency_ms: float


class GithubPrRequest(BaseModel):
    import_id: str
    repository_name: str
    target_branch: str = "anuvaad-modernized"
    pr_title: str = "feat: Anuvaad automated code modernization"
    pr_description: Optional[str] = None
    github_token: Optional[str] = None


class GithubPrResponse(BaseModel):
    pull_request_url: str
    branch: str
    files_committed: int
    audit_digest: str
    message: str

"""Autonomous Code Modernization and Repository Dependency Analysis Router.

Provides endpoints for whole-repository AST dependency graphing,
topological leaves-first migration ordering, compiler-driven self-healing,
and characterization test generation.
"""

from __future__ import annotations

import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from app.core.audit import generate_audit_receipt
from app.core.auth import get_optional_user_email_from_request
from app.core.rate_limit import rate_limiter
from app.services.ast_parser import analyze
from app.services.graph.dependency_graph import RepositoryDependencyGraph
from app.services.sandbox.self_healing_agent import SelfHealingAgent
from app.services.verification.equivalence_harness import EquivalenceHarness

logger = logging.getLogger("anuvaad.modernize")

router = APIRouter(prefix="", tags=["modernize"])


class FileEntry(BaseModel):
    file_path: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1)
    language: str | None = None


class AnalyzeRepositoryRequest(BaseModel):
    repository_name: str | None = "repository"
    files: list[FileEntry] = Field(..., min_length=1)


class ModernizeFileRequest(BaseModel):
    file_path: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1)
    source_language: str = Field(..., min_length=1)
    target_language: str = Field(..., min_length=1)
    verify: bool = True
    self_heal: bool = True


class ImpactAnalysisRequest(BaseModel):
    changed_symbol: str = Field(..., min_length=1)
    files: list[FileEntry] = Field(..., min_length=1)


@router.post("/modernize/analyze-repository", dependencies=[Depends(rate_limiter(15, 60))])
async def analyze_repository(payload: AnalyzeRepositoryRequest):
    """Analyze entire repository ASTs, construct dependency DAG, and return topological migration order."""
    if not payload.files:
        raise HTTPException(status_code=400, detail="Files list cannot be empty")

    tasks = [
        asyncio.to_thread(analyze, f.content, f.language or _infer_lang(f.file_path))
        for f in payload.files
    ]
    results = await asyncio.gather(*tasks)
    analyses = {f.file_path: res for f, res in zip(payload.files, results)}

    # Build dependency graph
    graph = RepositoryDependencyGraph()
    await asyncio.to_thread(graph.build_from_analyses, analyses)

    migration_order = graph.compute_migration_order()
    file_migration_order = graph.compute_file_migration_order()

    return {
        "repository_name": payload.repository_name,
        "total_files": len(payload.files),
        "total_symbols": len(graph.symbol_table),
        "symbol_migration_order": migration_order,
        "file_migration_order": file_migration_order,
        "graph": graph.to_dict(),
    }


@router.post("/modernize/impact", dependencies=[Depends(rate_limiter(20, 60))])
async def analyze_impact(payload: ImpactAnalysisRequest):
    """Calculate transitive callers affected by modifying a given symbol."""
    tasks = [
        asyncio.to_thread(analyze, f.content, f.language or _infer_lang(f.file_path))
        for f in payload.files
    ]
    results = await asyncio.gather(*tasks)
    analyses = {f.file_path: res for f, res in zip(payload.files, results)}

    graph = RepositoryDependencyGraph()
    await asyncio.to_thread(graph.build_from_analyses, analyses)
    impacted = graph.get_impacted_symbols(payload.changed_symbol)

    return {
        "changed_symbol": payload.changed_symbol,
        "impacted_symbols": impacted,
        "impact_count": len(impacted),
    }


@router.post("/modernize/file", dependencies=[Depends(rate_limiter(10, 60))])
async def modernize_file(
    request: Request,
    payload: ModernizeFileRequest,
    email: str | None = Depends(get_optional_user_email_from_request),
):
    """Modernize a single source file with self-healing compiler verification and characterization tests."""
    from app.services.ai import get_completion

    user_id = email or "anonymous"

    # 1. Initial Translation
    system_prompt = (
        f"You are a principal modernization engineer. Translate the following code from "
        f"{payload.source_language} to {payload.target_language}. Produce complete, production-grade, "
        f"idiomatic code. Preserve all function signatures and public APIs without conversational filler."
    )
    user_prompt = f"Source code ({payload.source_language}):\n{payload.content}"

    translated_code = await get_completion(user_prompt, system_prompt=system_prompt)
    translated_code = _clean_code_fence(translated_code)

    healing_diagnostics = []
    # 2. Self-Healing Compiler Verification
    if payload.self_heal:
        agent = SelfHealingAgent(max_retries=2)
        outcome = await agent.verify_and_heal(
            candidate_code=translated_code,
            target_language=payload.target_language,
            source_language=payload.source_language,
            source_code=payload.content,
        )
        translated_code = outcome.final_code
        healing_diagnostics = outcome.diagnostics

    # 3. Semantic Equivalence & Test Suite Generation
    equivalence_report = None
    if payload.verify:
        eq = await asyncio.to_thread(
            EquivalenceHarness.evaluate,
            source_language=payload.source_language,
            target_language=payload.target_language,
            source_code=payload.content,
            target_code=translated_code,
            user_id=user_id,
        )
        equivalence_report = eq.to_dict()

    # 4. Generate Zero Code Retention Receipt
    receipt = generate_audit_receipt(
        user_id=user_id,
        code=f"{payload.content}\n---\n{translated_code}",
    )

    return {
        "file_path": payload.file_path,
        "source_language": payload.source_language,
        "target_language": payload.target_language,
        "modernized_code": translated_code,
        "healing_diagnostics": healing_diagnostics,
        "equivalence": equivalence_report,
        "audit_receipt": receipt,
    }


def _infer_lang(path: str) -> str:
    lower = path.lower()
    if lower.endswith(".py"):
        return "python"
    elif lower.endswith((".ts", ".tsx")):
        return "typescript"
    elif lower.endswith((".js", ".jsx")):
        return "javascript"
    elif lower.endswith(".go"):
        return "go"
    elif lower.endswith(".rs"):
        return "rust"
    elif lower.endswith((".c", ".h")):
        return "c"
    elif lower.endswith((".cpp", ".hpp", ".cc")):
        return "cpp"
    elif lower.endswith((".cbl", ".cob", ".cpy")):
        return "cobol"
    elif lower.endswith(".java"):
        return "java"
    return "python"


def _clean_code_fence(text: str) -> str:
    stripped = text.strip()
    if stripped.startswith("```"):
        lines = stripped.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        return "\n".join(lines).strip()
    return stripped

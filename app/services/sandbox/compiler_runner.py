"""In-memory syntax validation for generated source code.

Submitted source is never written to temporary files or passed to subprocesses.
Python uses its in-memory compiler; other languages use the configured
Tree-sitter parser. Validation fails closed when a grammar is unavailable.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field


@dataclass
class DiagnosticMessage:
    """Structured syntax diagnostic."""

    line: int | None
    column: int | None
    severity: str
    message: str


@dataclass
class CompilationResult:
    """Outcome of in-memory syntax validation."""

    success: bool
    exit_code: int
    language: str
    runner_used: str
    stdout: str = ""
    stderr: str = ""
    diagnostics: list[DiagnosticMessage] = field(default_factory=list)
    error_summary: str | None = None


class SandboxedCompilerRunner:
    """Validate code without persisting source or launching subprocesses."""

    @classmethod
    async def validate_code(
        cls,
        language: str,
        code: str,
        timeout_seconds: float = 5.0,
    ) -> CompilationResult:
        del timeout_seconds  # Kept for API compatibility; validation is in-process.
        lang = language.lower().strip()
        if lang in ("python", "py"):
            return cls._validate_python(code)
        return await cls._validate_with_ast_parser(lang, code)

    @staticmethod
    def _validate_python(code: str) -> CompilationResult:
        try:
            compile(code, "<anuvaad_buffer>", "exec")
            return CompilationResult(True, 0, "python", "in_memory_python", stdout="Syntax OK")
        except SyntaxError as err:
            diagnostic = DiagnosticMessage(err.lineno, err.offset, "error", str(err.msg))
            return CompilationResult(
                False,
                1,
                "python",
                "in_memory_python",
                stderr=f"SyntaxError on line {err.lineno}: {err.msg}",
                diagnostics=[diagnostic],
                error_summary=f"Line {err.lineno}: {err.msg}",
            )

    @classmethod
    async def _validate_with_ast_parser(cls, language: str, code: str) -> CompilationResult:
        """Run Tree-sitter in a worker thread and report unavailable grammars."""
        try:
            from app.services.ast_parser import analyze, is_language_supported

            supported = await asyncio.to_thread(is_language_supported, language)
            if not supported:
                message = f"No syntax parser is available for {language}."
                return CompilationResult(
                    False, 2, language, "validation_unavailable", stderr=message, error_summary=message
                )

            analysis = await asyncio.to_thread(analyze, code, language)
            has_errors = analysis.has_parse_errors
            error_summary = f"{analysis.error_count} syntax error(s) detected by Tree-sitter" if has_errors else None
            return CompilationResult(
                success=not has_errors,
                exit_code=1 if has_errors else 0,
                language=language,
                runner_used="tree_sitter",
                stderr=error_summary or "",
                error_summary=error_summary,
            )
        except Exception as err:
            message = f"Syntax validation is unavailable for {language}: {err}"
            return CompilationResult(
                False, 2, language, "validation_unavailable", stderr=message, error_summary=message
            )

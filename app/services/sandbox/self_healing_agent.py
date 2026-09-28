"""Self-Healing Translation Agent.

Monitors compiler, linter, and AST feedback loops. When candidate code fails
validation, the agent extracts compiler error diagnostics and guides the LLM
to repair the syntax and symbol contracts iteratively.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

from app.services.sandbox.compiler_runner import CompilationResult, SandboxedCompilerRunner

logger = logging.getLogger("anuvaad.self_healing")


@dataclass
class HealingOutcome:
    """Result of self-healing compiler/linter loop."""

    final_code: str
    verified: bool
    attempts: int
    diagnostics: list[str] = field(default_factory=list)
    initial_error: str | None = None


class SelfHealingAgent:
    """Iterative compiler-guided code repair agent."""

    def __init__(self, max_retries: int = 2) -> None:
        self.max_retries = max_retries

    async def verify_and_heal(
        self,
        candidate_code: str,
        target_language: str,
        source_language: str,
        source_code: str,
        ai_service: object | None = None,
    ) -> HealingOutcome:
        """Verify code against compiler/AST and autonomously heal if errors are found."""
        current_code = candidate_code
        diagnostics_history: list[str] = []
        initial_error: str | None = None

        for attempt in range(1, self.max_retries + 2):
            result: CompilationResult = await SandboxedCompilerRunner.validate_code(
                language=target_language,
                code=current_code,
            )

            if result.success:
                return HealingOutcome(
                    final_code=current_code,
                    verified=True,
                    attempts=attempt,
                    diagnostics=diagnostics_history,
                    initial_error=initial_error,
                )

            # Record error
            err_desc = result.error_summary or result.stderr or "Syntax/compilation failure"
            if initial_error is None:
                initial_error = err_desc
            diagnostics_history.append(f"Attempt {attempt}: {err_desc}")
            logger.info(f"Self-healing: validation failure on attempt {attempt}: {err_desc}")

            # If no AI service provided or out of retries, break
            if attempt > self.max_retries or ai_service is None:
                break

            # Attempt self-healing repair prompt
            heal_prompt = self._build_repair_prompt(
                source_code=source_code,
                source_language=source_language,
                target_language=target_language,
                broken_code=current_code,
                error_diagnostic=err_desc,
            )

            try:
                # Use ai_service to generate repaired code
                if hasattr(ai_service, "complete"):
                    repaired = await ai_service.complete(heal_prompt)
                    if repaired and isinstance(repaired, str) and len(repaired.strip()) > 0:
                        current_code = self._clean_code_fence(repaired)
            except Exception as e:
                logger.warning(f"Self-healing AI call failed: {e}")
                break

        return HealingOutcome(
            final_code=current_code,
            verified=False,
            attempts=len(diagnostics_history),
            diagnostics=diagnostics_history,
            initial_error=initial_error,
        )

    def _build_repair_prompt(
        self,
        source_code: str,
        source_language: str,
        target_language: str,
        broken_code: str,
        error_diagnostic: str,
    ) -> str:
        """Construct diagnostic-focused repair instructions."""
        return (
            f"You are a precision compiler repair engineer.\n"
            f"The following {target_language} code was translated from {source_language}, but the compiler/linter reported this error:\n"
            f"ERROR DIAGNOSTIC:\n{error_diagnostic}\n\n"
            f"ORIGINAL {source_language} SOURCE:\n{source_code}\n\n"
            f"BROKEN {target_language} CANDIDATE:\n{broken_code}\n\n"
            f"INSTRUCTION: Fix the exact syntax or type error identified in the diagnostic.\n"
            f"Return ONLY the fixed, idiomatic {target_language} code without conversational prose or markdown wrap."
        )

    @staticmethod
    def _clean_code_fence(text: str) -> str:
        """Strip markdown fences if present in AI response."""
        stripped = text.strip()
        if stripped.startswith("```"):
            lines = stripped.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            return "\n".join(lines).strip()
        return stripped

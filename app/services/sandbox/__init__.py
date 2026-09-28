"""Sandbox package for compiler diagnostics and autonomous self-healing."""

from app.services.sandbox.compiler_runner import (
    CompilationResult,
    SandboxedCompilerRunner,
)
from app.services.sandbox.self_healing_agent import SelfHealingAgent

__all__ = ["CompilationResult", "SandboxedCompilerRunner", "SelfHealingAgent"]

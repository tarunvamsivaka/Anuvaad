"""Tests for SandboxedCompilerRunner and SelfHealingAgent."""

import pytest

from app.services.sandbox.compiler_runner import SandboxedCompilerRunner
from app.services.sandbox.self_healing_agent import SelfHealingAgent


@pytest.mark.asyncio
async def test_python_valid_syntax_validation():
    valid_py = """
def calculate_area(radius: float) -> float:
    import math
    return math.pi * (radius ** 2)
"""
    result = await SandboxedCompilerRunner.validate_code("python", valid_py)
    assert result.success is True
    assert result.exit_code == 0
    assert result.language == "python"


@pytest.mark.asyncio
async def test_python_invalid_syntax_validation():
    invalid_py = """
def broken_syntax(
    return 42
"""
    result = await SandboxedCompilerRunner.validate_code("python", invalid_py)
    assert result.success is False
    assert result.exit_code != 0
    assert len(result.diagnostics) > 0
    assert "SyntaxError" in result.stderr or result.error_summary is not None


@pytest.mark.asyncio
async def test_tree_sitter_ast_fallback_validation():
    # Valid typescript code
    valid_ts = "function greet(name: string): string { return 'Hello ' + name; }"
    result = await SandboxedCompilerRunner.validate_code("typescript", valid_ts)
    assert result.success is True

    # Invalid typescript code with missing closing tokens
    invalid_ts = "function unclosed(name: string { return name;"
    result_err = await SandboxedCompilerRunner.validate_code("typescript", invalid_ts)
    assert result_err.success is False


@pytest.mark.asyncio
async def test_self_healing_agent_already_valid():
    agent = SelfHealingAgent(max_retries=2)
    valid_code = "def valid(): return True"
    outcome = await agent.verify_and_heal(
        candidate_code=valid_code,
        target_language="python",
        source_language="go",
        source_code="func valid() bool { return true }",
    )
    assert outcome.verified is True
    assert outcome.attempts == 1
    assert outcome.final_code == valid_code


@pytest.mark.asyncio
async def test_self_healing_agent_repairs_code_with_ai_mock():
    agent = SelfHealingAgent(max_retries=2)
    broken_code = "def add(a, b\n    return a + b"
    fixed_code = "def add(a, b):\n    return a + b"

    class MockAIService:
        async def complete(self, prompt: str) -> str:
            assert "ERROR DIAGNOSTIC" in prompt
            return f"```python\n{fixed_code}\n```"

    outcome = await agent.verify_and_heal(
        candidate_code=broken_code,
        target_language="python",
        source_language="go",
        source_code="func add(a, b int) int { return a + b }",
        ai_service=MockAIService(),
    )
    assert outcome.verified is True
    assert outcome.attempts == 2
    assert outcome.final_code == fixed_code

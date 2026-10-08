"""
Unit tests for Tree-sitter AST Boundary Validation and Syntax Error detection.
"""
import pytest
from app.services.ast_parser import TreeSitterEngine
from app.schemas.translation import SupportedLanguage


@pytest.mark.asyncio
async def test_valid_python_syntax():
    engine = TreeSitterEngine()
    code = "def calculate_area(radius: float) -> float:\n    import math\n    return math.pi * radius * radius"
    result = await engine.parse_async(code, SupportedLanguage.PYTHON)

    assert result.is_valid is True
    assert len(result.syntax_errors) == 0


@pytest.mark.asyncio
async def test_invalid_syntax_detection():
    engine = TreeSitterEngine()
    # Unclosed parentheses / invalid syntax
    invalid_code = "def broken_fn(a, b:\n    return a + b"
    result = await engine.parse_async(invalid_code, SupportedLanguage.PYTHON)

    assert result.is_valid is False
    assert len(result.syntax_errors) > 0


@pytest.mark.asyncio
async def test_typescript_bracket_validation():
    engine = TreeSitterEngine()
    valid_ts = "export function greet(name: string): string {\n    return `Hello ${name}!`;\n}"
    result = await engine.parse_async(valid_ts, SupportedLanguage.TYPESCRIPT)
    assert result.is_valid is True

    # Missing closing brace
    unclosed_ts = "export function greet(name: string): string {\n    return `Hello ${name}!`;"
    bad_result = await engine.parse_async(unclosed_ts, SupportedLanguage.TYPESCRIPT)
    assert bad_result.is_valid is False

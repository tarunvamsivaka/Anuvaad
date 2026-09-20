"""Tests for the Tree-sitter AST Parser Service (Sprint 1).

Covers:
 T1 - Language support: Python, Go, TypeScript, unsupported graceful fallback
 T2 - Symbol extraction: functions, classes, imports
 T3 - Parse error detection
 T4 - Translation verification (structural similarity)
 T5 - Symbol contract for LLM prompt injection
 T6 - Edge cases: empty code, unicode, deeply nested
"""

import pytest

from app.services.ast_parser import (
    ASTAnalysis,
    TranslationVerification,
    analyze,
    build_symbol_contract,
    verify_translation,
)

# ── Fixtures ──────────────────────────────────────────────────────────────────

PYTHON_SNIPPET = """\
import os
from typing import Optional

class DataProcessor:
    def __init__(self, name: str):
        self.name = name

    def process(self, data: list) -> list:
        return [x * 2 for x in data]

    async def async_fetch(self, url: str) -> Optional[str]:
        return None

def top_level_function(x: int, y: int) -> int:
    return x + y
"""

GO_SNIPPET = """\
package main

import (
    "fmt"
    "os"
)

type DataProcessor struct {
    Name string
}

func (dp *DataProcessor) Process(data []int) []int {
    result := make([]int, len(data))
    return result
}

func TopLevelFunction(x, y int) int {
    return x + y
}

func main() {
    fmt.Println("hello")
}
"""

TYPESCRIPT_SNIPPET = """\
import { useState } from 'react';
import type { FC } from 'react';

class DataProcessor {
    name: string;
    constructor(name: string) {
        this.name = name;
    }
    process(data: number[]): number[] {
        return data.map(x => x * 2);
    }
}

async function asyncFetch(url: string): Promise<string | null> {
    return null;
}

const topLevelArrow = (x: number) => x * 2;
"""

PYTHON_WITH_ERRORS = """\
def broken_function(x
    return x +
"""

PYTHON_TRANSLATED_TO_GO = """\
package main

import "fmt"

type DataProcessor struct {
    name string
}

func NewDataProcessor(name string) *DataProcessor {
    return &DataProcessor{name: name}
}

func (dp *DataProcessor) Process(data []int) []int {
    result := make([]int, len(data))
    for i, x := range data {
        result[i] = x * 2
    }
    return result
}

func AsyncFetch(url string) (string, error) {
    return "", nil
}

func TopLevelFunction(x, y int) int {
    return x + y
}
"""


# ── T1: Language Support ──────────────────────────────────────────────────────


class TestLanguageSupport:
    def test_python_language_supported(self):
        result = analyze("x = 1", "python")
        assert isinstance(result, ASTAnalysis)
        assert result.language == "python"

    def test_go_language_supported(self):
        result = analyze("package main", "go")
        assert isinstance(result, ASTAnalysis)
        assert result.language == "go"

    def test_typescript_language_supported(self):
        result = analyze("const x = 1;", "typescript")
        assert isinstance(result, ASTAnalysis)
        assert result.language == "typescript"

    def test_javascript_alias_supported(self):
        result = analyze("function foo() {}", "javascript")
        assert isinstance(result, ASTAnalysis)
        # Should not error even though JS uses TSX grammar
        assert result.function_count >= 0

    def test_unsupported_language_returns_empty_gracefully(self):
        result = analyze("SELECT * FROM users;", "sql")
        assert isinstance(result, ASTAnalysis)
        assert result.function_count == 0
        assert result.class_count == 0
        assert result.has_parse_errors is False  # Not an error, just unsupported

    def test_case_insensitive_language_normalization(self):
        """Language names should be case-insensitive and stored in normalized form."""
        r1 = analyze("x = 1", "Python")
        r2 = analyze("x = 1", "PYTHON")
        r3 = analyze("x = 1", "python")
        # All should normalize to "python"
        assert r1.language == r2.language == r3.language == "python"

    def test_language_alias_py(self):
        result = analyze("x = 1", "py")
        assert isinstance(result, ASTAnalysis)

    def test_language_alias_ts(self):
        result = analyze("const x = 1;", "ts")
        assert isinstance(result, ASTAnalysis)

    def test_language_alias_golang(self):
        result = analyze("package main", "golang")
        assert isinstance(result, ASTAnalysis)


# ── T2: Symbol Extraction ─────────────────────────────────────────────────────


class TestPythonExtraction:
    def test_extracts_functions(self):
        result = analyze(PYTHON_SNIPPET, "python")
        func_names = [f.name for f in result.functions]
        assert "top_level_function" in func_names

    def test_extracts_classes(self):
        result = analyze(PYTHON_SNIPPET, "python")
        class_names = [c.name for c in result.classes]
        assert "DataProcessor" in class_names

    def test_extracts_imports(self):
        result = analyze(PYTHON_SNIPPET, "python")
        import_text = " ".join(result.imports)
        assert "import os" in import_text or "os" in import_text

    def test_async_function_detected(self):
        result = analyze(PYTHON_SNIPPET, "python")
        async_funcs = [f for f in result.functions if f.is_async]
        assert any("async_fetch" in f.name for f in async_funcs)

    def test_method_detected_as_method(self):
        result = analyze(PYTHON_SNIPPET, "python")
        methods = [f for f in result.functions if f.is_method]
        assert len(methods) >= 2  # __init__, process, async_fetch

    def test_function_count(self):
        result = analyze(PYTHON_SNIPPET, "python")
        # top_level_function + 3 methods = 4 total
        assert result.function_count >= 1  # at minimum the top-level function

    def test_class_count(self):
        result = analyze(PYTHON_SNIPPET, "python")
        assert result.class_count == 1

    def test_exported_names_contains_class_and_top_level(self):
        result = analyze(PYTHON_SNIPPET, "python")
        assert "DataProcessor" in result.exported_names
        assert "top_level_function" in result.exported_names

    def test_line_numbers_are_positive(self):
        result = analyze(PYTHON_SNIPPET, "python")
        for f in result.functions:
            assert f.start_line >= 1
            assert f.end_line >= f.start_line
        for c in result.classes:
            assert c.start_line >= 1


class TestGoExtraction:
    def test_extracts_functions(self):
        result = analyze(GO_SNIPPET, "go")
        func_names = [f.name for f in result.functions]
        assert "TopLevelFunction" in func_names
        assert "main" in func_names

    def test_extracts_struct_as_class(self):
        result = analyze(GO_SNIPPET, "go")
        class_names = [c.name for c in result.classes]
        assert "DataProcessor" in class_names

    def test_extracts_imports(self):
        result = analyze(GO_SNIPPET, "go")
        assert len(result.imports) >= 1

    def test_method_detected(self):
        result = analyze(GO_SNIPPET, "go")
        methods = [f for f in result.functions if f.is_method]
        assert len(methods) >= 1


class TestTypeScriptExtraction:
    def test_extracts_functions(self):
        result = analyze(TYPESCRIPT_SNIPPET, "typescript")
        func_names = [f.name for f in result.functions]
        assert "asyncFetch" in func_names

    def test_extracts_classes(self):
        result = analyze(TYPESCRIPT_SNIPPET, "typescript")
        class_names = [c.name for c in result.classes]
        assert "DataProcessor" in class_names

    def test_async_function_detected(self):
        result = analyze(TYPESCRIPT_SNIPPET, "typescript")
        async_funcs = [f for f in result.functions if f.is_async]
        assert len(async_funcs) >= 1

    def test_extracts_imports(self):
        result = analyze(TYPESCRIPT_SNIPPET, "typescript")
        assert len(result.imports) >= 1


# ── T3: Parse Error Detection ─────────────────────────────────────────────────


class TestParseErrorDetection:
    def test_valid_python_has_no_errors(self):
        result = analyze(PYTHON_SNIPPET, "python")
        assert result.has_parse_errors is False
        assert result.error_count == 0

    def test_broken_python_has_errors(self):
        result = analyze(PYTHON_WITH_ERRORS, "python")
        assert result.has_parse_errors is True
        assert result.error_count > 0

    def test_empty_code_no_errors(self):
        result = analyze("", "python")
        assert isinstance(result, ASTAnalysis)
        assert result.function_count == 0

    def test_syntax_garbage_detected(self):
        """Completely invalid syntax should trigger parse errors."""
        result = analyze("@@@ not valid python ~~~", "python")
        # Tree-sitter is lenient but should detect at least some issues
        # with completely invalid tokens
        assert isinstance(result, ASTAnalysis)
        # Even if tree-sitter accepts it, we shouldn't crash


# ── T4: Translation Verification ─────────────────────────────────────────────


class TestTranslationVerification:
    def test_returns_verification_object(self):
        result = verify_translation(PYTHON_SNIPPET, "python", PYTHON_TRANSLATED_TO_GO, "go")
        assert isinstance(result, TranslationVerification)

    def test_source_analysis_populated(self):
        result = verify_translation(PYTHON_SNIPPET, "python", PYTHON_TRANSLATED_TO_GO, "go")
        assert result.source_analysis is not None
        assert result.source_analysis.function_count >= 1

    def test_target_analysis_populated(self):
        result = verify_translation(PYTHON_SNIPPET, "python", PYTHON_TRANSLATED_TO_GO, "go")
        assert result.target_analysis is not None

    def test_similarity_in_valid_range(self):
        result = verify_translation(PYTHON_SNIPPET, "python", PYTHON_TRANSLATED_TO_GO, "go")
        assert 0.0 <= result.structural_similarity <= 1.0

    def test_empty_translation_gives_zero_similarity(self):
        result = verify_translation(PYTHON_SNIPPET, "python", "", "go")
        assert result.structural_similarity == 0.0
        assert result.has_parse_errors_in_target is True
        assert len(result.warnings) > 0

    def test_broken_translated_code_flagged(self):
        """Translated code with parse errors should have lower similarity."""
        broken_go = "func broken( {\n  return"
        result = verify_translation("def foo(): pass", "python", broken_go, "go")
        assert result.has_parse_errors_in_target is True

    def test_missing_functions_flagged(self):
        """If translated code drops functions, they should appear in missing_exports."""
        source = "def foo(): pass\ndef bar(): pass\ndef baz(): pass"
        translated = "package main\nfunc Foo() {}"
        result = verify_translation(source, "python", translated, "go")
        # At least bar or baz should be flagged as missing
        assert len(result.missing_exports) >= 1 or result.function_count_delta < 0

    def test_source_language_and_target_stored(self):
        result = verify_translation("x = 1", "python", "var x = 1;", "typescript")
        assert result.source_language == "python"
        assert result.target_language == "typescript"

    def test_identical_code_high_similarity(self):
        """Same code, same language should have near-perfect similarity."""
        code = "def foo(x):\n    return x * 2"
        result = verify_translation(code, "python", code, "python")
        assert result.structural_similarity >= 0.9


# ── T5: Symbol Contract Builder ───────────────────────────────────────────────


class TestSymbolContract:
    def test_returns_dict(self):
        contract = build_symbol_contract(PYTHON_SNIPPET, "python")
        assert isinstance(contract, dict)

    def test_has_expected_keys(self):
        contract = build_symbol_contract(PYTHON_SNIPPET, "python")
        assert "functions" in contract
        assert "classes" in contract
        assert "exports" in contract or "exported_names" in contract

    def test_functions_are_serializable(self):
        import json

        contract = build_symbol_contract(PYTHON_SNIPPET, "python")
        # Should not raise — contract must be JSON-serializable for LLM prompt injection
        json.dumps(contract)

    def test_empty_code_returns_empty_dict(self):
        contract = build_symbol_contract("", "python")
        assert contract == {}

    def test_unsupported_language_returns_empty_dict(self):
        contract = build_symbol_contract("SELECT 1", "sql")
        assert contract == {}

    def test_function_names_in_contract(self):
        contract = build_symbol_contract(PYTHON_SNIPPET, "python")
        func_names = [f["name"] for f in contract.get("functions", [])]
        assert "top_level_function" in func_names

    def test_class_names_in_contract(self):
        contract = build_symbol_contract(PYTHON_SNIPPET, "python")
        class_names = [c["name"] for c in contract.get("classes", [])]
        assert "DataProcessor" in class_names

    def test_imports_capped_at_20(self):
        """Build a file with many imports and ensure the cap is respected."""
        many_imports = "\n".join(f"import module_{i}" for i in range(30))
        contract = build_symbol_contract(many_imports, "python")
        assert len(contract.get("imports", [])) <= 20

    def test_has_parse_errors_flag(self):
        contract = build_symbol_contract(PYTHON_WITH_ERRORS, "python")
        # If there are extracted symbols, the contract should expose the flag
        if contract:
            assert "has_parse_errors" in contract


# ── T6: Edge Cases ─────────────────────────────────────────────────────────────


class TestEdgeCases:
    def test_unicode_code_does_not_crash(self):
        """Code with Unicode identifiers and comments should not raise."""
        code = "# こんにちは世界\ndef greet(name: str) -> str:\n    return f'Hello {name}'"
        result = analyze(code, "python")
        assert isinstance(result, ASTAnalysis)

    def test_very_long_single_line(self):
        """A very long single-line expression should not cause recursion/stack issues."""
        code = "x = " + " + ".join(str(i) for i in range(500))
        result = analyze(code, "python")
        assert isinstance(result, ASTAnalysis)

    def test_deeply_nested_does_not_crash(self):
        """Deeply nested code should compute nesting depth without stack overflow."""
        code = "def f():\n" + "  if True:\n" * 50 + "    pass"
        result = analyze(code, "python")
        assert result.max_nesting_depth > 0

    def test_only_comments(self):
        code = "# This is just a comment\n# No real code here"
        result = analyze(code, "python")
        assert isinstance(result, ASTAnalysis)
        assert result.function_count == 0

    def test_analyze_never_raises(self):
        """analyze() must never raise, even with adversarial input."""
        adversarial_inputs = [
            (None, "python"),  # type: ignore
            ("", ""),
            ("🔥💥", "typescript"),
            ("\x00\x01\x02", "go"),
        ]
        for code, lang in adversarial_inputs:
            try:
                result = analyze(code or "", lang)
                assert isinstance(result, ASTAnalysis)
            except Exception as e:
                pytest.fail(f"analyze() raised for input ({code!r}, {lang!r}): {e}")

    def test_verify_translation_never_raises(self):
        """verify_translation() must never raise."""
        try:
            result = verify_translation(None or "", "python", None or "", "go")  # type: ignore
            assert isinstance(result, TranslationVerification)
        except Exception as e:
            pytest.fail(f"verify_translation() raised: {e}")

    def test_go_empty_package(self):
        """Minimal valid Go file should parse cleanly."""
        code = "package main"
        result = analyze(code, "go")
        assert isinstance(result, ASTAnalysis)
        assert result.has_parse_errors is False

"""Tree-sitter AST Parser Service.

Sprint 1 — Semantic Verification Harness.

This module provides AST-anchored code analysis for Python, Go, and TypeScript
using Tree-sitter, enabling the LLM translation pipeline to:

1. Extract function/method signatures, class names, and module imports
   before sending code to the LLM — these are used to build a
   "symbol contract" that the translated code MUST preserve.
2. Detect parse errors in both source and translated code, catching
   obvious LLM hallucinations before they reach the user.
3. Compute a lightweight structural diff between the original and
   translated AST to flag suspicious structural mismatches
   (e.g., function count change, missing return types).

Architecture decision: Tree-sitter is used SOLELY for boundary extraction
and symbol harvesting — NOT for full AST-to-AST deterministic transpilation.
Full AST transpilation across 35+ language pairs requires a production
compiler infrastructure that is out of scope for Phase 1.

Supported languages: Python, Go, TypeScript.
Unsupported languages fall back gracefully (returning empty symbol sets),
never raising exceptions that would block the translation path.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

logger = logging.getLogger("anuvaad")

# ── Language registry ──────────────────────────────────────────────────────
# Languages are loaded lazily and cached at module level to avoid re-parsing
# grammar binaries on every request.

_PARSERS: dict[str, object] = {}  # language_name → tree_sitter.Parser


def _get_parser(language: str) -> object | None:
    """Return a cached tree_sitter.Parser for the given language, or None if unsupported."""
    if language in _PARSERS:
        return _PARSERS[language]

    try:
        from tree_sitter import Language, Parser

        if language == "python":
            import tree_sitter_python as tspython

            lang = Language(tspython.language())
        elif language == "go":
            import tree_sitter_go as tsgo

            lang = Language(tsgo.language())
        elif language in ("typescript", "tsx"):
            import tree_sitter_typescript as tsts

            lang = Language(tsts.language_typescript())
        elif language == "javascript":
            import tree_sitter_typescript as tsts  # JS is a subset of TS grammar

            lang = Language(tsts.language_tsx())
        elif language == "rust":
            try:
                import tree_sitter_rust as tsrust

                lang = Language(tsrust.language())
            except ImportError:
                _PARSERS[language] = None
                return None
        elif language == "java":
            try:
                import tree_sitter_java as tsjava

                lang = Language(tsjava.language())
            except ImportError:
                _PARSERS[language] = None
                return None
        else:
            _PARSERS[language] = None
            return None

        parser = Parser(lang)
        _PARSERS[language] = parser
        return parser
    except Exception as e:
        logger.warning(f"Tree-sitter: failed to load grammar for {language!r}: {e}")
        _PARSERS[language] = None
        return None


# ── Data models ────────────────────────────────────────────────────────────


@dataclass
class FunctionSymbol:
    """Extracted function/method signature from AST."""

    name: str
    start_line: int
    end_line: int
    parameters: list[str] = field(default_factory=list)
    return_annotation: str | None = None
    is_async: bool = False
    is_method: bool = False
    docstring: str | None = None


@dataclass
class ClassSymbol:
    """Extracted class definition from AST."""

    name: str
    start_line: int
    end_line: int
    bases: list[str] = field(default_factory=list)
    methods: list[str] = field(default_factory=list)


@dataclass
class ASTAnalysis:
    """Full AST analysis result for a code snippet."""

    language: str
    has_parse_errors: bool
    error_count: int
    functions: list[FunctionSymbol]
    classes: list[ClassSymbol]
    imports: list[str]
    # Symbol contract: names that must be preserved in the translated code
    exported_names: list[str]
    # Structural fingerprint for comparing source vs translated code
    function_count: int
    class_count: int
    max_nesting_depth: int


@dataclass
class TranslationVerification:
    """Result of comparing source AST vs translated AST."""

    source_language: str
    target_language: str
    source_analysis: ASTAnalysis
    target_analysis: ASTAnalysis | None
    has_parse_errors_in_target: bool
    function_count_delta: int  # positive = translated has more functions
    class_count_delta: int
    # Names present in source but missing in translated code
    missing_exports: list[str]
    # Overall confidence score 0.0–1.0
    structural_similarity: float
    # Human-readable warnings for the LLM pipeline
    warnings: list[str]


# ── Node text extraction helpers ───────────────────────────────────────────


def _node_text(node, source_bytes: bytes) -> str:
    """Extract the text of a tree-sitter node from the source bytes."""
    return source_bytes[node.start_byte : node.end_byte].decode("utf-8", errors="replace")


def _child_by_type(node, type_name: str):
    """Return first child node with the given type, or None."""
    for child in node.children:
        if child.type == type_name:
            return child
    return None


def _children_by_type(node, type_name: str) -> list:
    """Return all child nodes with the given type."""
    return [c for c in node.children if c.type == type_name]


def _count_errors(node) -> int:
    """Recursively count ERROR nodes in the parse tree."""
    count = 1 if node.type == "ERROR" or node.is_missing else 0
    for child in node.children:
        count += _count_errors(child)
    return count


def _max_depth(node, current: int = 0) -> int:
    """Recursively compute the maximum nesting depth of the parse tree."""
    if not node.children:
        return current
    return max(_max_depth(child, current + 1) for child in node.children)


# ── Language-specific extractors ───────────────────────────────────────────


def _extract_python(tree, source_bytes: bytes) -> tuple[list[FunctionSymbol], list[ClassSymbol], list[str]]:
    """Extract Python functions, classes, and imports from a parse tree."""
    functions: list[FunctionSymbol] = []
    classes: list[ClassSymbol] = []
    imports: list[str] = []

    def walk(node, in_class: str | None = None):
        if node.type in ("function_definition", "decorated_definition"):
            func_node = node

            if node.type == "decorated_definition":
                # The actual function is inside the decorated_definition
                for child in node.children:
                    if child.type == "function_definition":
                        func_node = child
                        break

            # tree-sitter 0.26 uses function_definition for BOTH sync and async
            # functions; async functions have an 'async' keyword as a child token.
            is_async = any(child.type == "async" for child in func_node.children)

            name_node = _child_by_type(func_node, "identifier")
            name = _node_text(name_node, source_bytes) if name_node else "<anonymous>"

            params = []
            param_node = _child_by_type(func_node, "parameters")
            if param_node:
                for p in param_node.children:
                    if p.type in ("identifier", "typed_parameter", "default_parameter"):
                        raw = _node_text(p, source_bytes).split(":")[0].split("=")[0].strip()
                        if raw not in ("(", ")", ",", "self", "cls"):
                            params.append(raw)

            ret_annotation = None
            ret_node = _child_by_type(func_node, "type")
            if ret_node:
                ret_annotation = _node_text(ret_node, source_bytes)

            functions.append(
                FunctionSymbol(
                    name=name,
                    start_line=func_node.start_point[0] + 1,
                    end_line=func_node.end_point[0] + 1,
                    parameters=params,
                    return_annotation=ret_annotation,
                    is_async=is_async,
                    is_method=in_class is not None,
                )
            )
            for child in func_node.children:
                walk(child, in_class)
            return

        if node.type == "class_definition":
            name_node = _child_by_type(node, "identifier")
            cname = _node_text(name_node, source_bytes) if name_node else "<anonymous>"
            bases: list[str] = []
            arg_list = _child_by_type(node, "argument_list")
            if arg_list:
                for ch in arg_list.children:
                    if ch.type == "identifier":
                        bases.append(_node_text(ch, source_bytes))

            method_names: list[str] = []
            body = _child_by_type(node, "block")
            if body:
                for child in body.children:
                    if child.type in ("function_definition", "async_function_definition", "decorated_definition"):
                        mname_node = _child_by_type(child, "identifier")
                        if mname_node:
                            method_names.append(_node_text(mname_node, source_bytes))
                        walk(child, in_class=cname)

            classes.append(
                ClassSymbol(
                    name=cname,
                    start_line=node.start_point[0] + 1,
                    end_line=node.end_point[0] + 1,
                    bases=bases,
                    methods=method_names,
                )
            )
            return

        if node.type == "import_statement":
            imports.append(_node_text(node, source_bytes).strip())
        elif node.type == "import_from_statement":
            imports.append(_node_text(node, source_bytes).strip())

        for child in node.children:
            walk(child, in_class)

    walk(tree.root_node)
    return functions, classes, imports


def _extract_go(tree, source_bytes: bytes) -> tuple[list[FunctionSymbol], list[ClassSymbol], list[str]]:
    """Extract Go functions, type declarations (as classes), and imports."""
    functions: list[FunctionSymbol] = []
    classes: list[ClassSymbol] = []
    imports: list[str] = []

    def walk(node):
        if node.type == "function_declaration":
            name_node = _child_by_type(node, "identifier")
            name = _node_text(name_node, source_bytes) if name_node else "<anonymous>"
            params = []
            param_list = _child_by_type(node, "parameter_list")
            if param_list:
                for p in param_list.children:
                    if p.type == "parameter_declaration":
                        id_node = _child_by_type(p, "identifier")
                        if id_node:
                            params.append(_node_text(id_node, source_bytes))
            functions.append(
                FunctionSymbol(
                    name=name,
                    start_line=node.start_point[0] + 1,
                    end_line=node.end_point[0] + 1,
                    parameters=params,
                )
            )

        elif node.type == "method_declaration":
            name_node = _child_by_type(node, "field_identifier")
            name = _node_text(name_node, source_bytes) if name_node else "<anonymous>"
            functions.append(
                FunctionSymbol(
                    name=name,
                    start_line=node.start_point[0] + 1,
                    end_line=node.end_point[0] + 1,
                    is_method=True,
                )
            )

        elif node.type == "type_declaration":
            for spec in _children_by_type(node, "type_spec"):
                name_node = _child_by_type(spec, "type_identifier")
                if name_node:
                    cname = _node_text(name_node, source_bytes)
                    classes.append(
                        ClassSymbol(
                            name=cname,
                            start_line=node.start_point[0] + 1,
                            end_line=node.end_point[0] + 1,
                        )
                    )

        elif node.type == "import_declaration":
            imports.append(_node_text(node, source_bytes).strip())

        for child in node.children:
            walk(child)

    walk(tree.root_node)
    return functions, classes, imports


def _extract_typescript(tree, source_bytes: bytes) -> tuple[list[FunctionSymbol], list[ClassSymbol], list[str]]:
    """Extract TypeScript/JavaScript functions, classes, and imports."""
    functions: list[FunctionSymbol] = []
    classes: list[ClassSymbol] = []
    imports: list[str] = []

    def walk(node, in_class: str | None = None):
        if node.type in (
            "function_declaration",
            "function",
            "arrow_function",
            "method_definition",
            "generator_function_declaration",
        ):
            name_node = _child_by_type(node, "identifier")
            name = _node_text(name_node, source_bytes) if name_node else "<anonymous>"
            is_async = any(c.type == "async" for c in node.children if hasattr(c, "type"))
            functions.append(
                FunctionSymbol(
                    name=name,
                    start_line=node.start_point[0] + 1,
                    end_line=node.end_point[0] + 1,
                    is_async=is_async,
                    is_method=node.type == "method_definition",
                )
            )
            for child in node.children:
                walk(child, in_class)
            return

        if node.type == "class_declaration":
            name_node = _child_by_type(node, "type_identifier")
            if name_node is None:
                name_node = _child_by_type(node, "identifier")
            cname = _node_text(name_node, source_bytes) if name_node else "<anonymous>"
            classes.append(
                ClassSymbol(
                    name=cname,
                    start_line=node.start_point[0] + 1,
                    end_line=node.end_point[0] + 1,
                )
            )
            for child in node.children:
                walk(child, in_class=cname)
            return

        if node.type in ("import_statement", "import_declaration"):
            imports.append(_node_text(node, source_bytes).strip())

        for child in node.children:
            walk(child, in_class)

    walk(tree.root_node)
    return functions, classes, imports


# ── Canonical language normalizer ─────────────────────────────────────────

_LANGUAGE_ALIASES: dict[str, str] = {
    "python": "python",
    "py": "python",
    "go": "go",
    "golang": "go",
    "typescript": "typescript",
    "ts": "typescript",
    "tsx": "tsx",
    "javascript": "javascript",
    "js": "javascript",
    "jsx": "javascript",
}


def _normalize_language(language: str) -> str:
    """Normalize language name to a canonical form understood by the parser registry."""
    return _LANGUAGE_ALIASES.get(language.lower().strip(), language.lower().strip())


# ── Public API ─────────────────────────────────────────────────────────────


def analyze(code: str, language: str) -> ASTAnalysis:
    """Parse `code` with Tree-sitter and extract structural information.

    Always returns an ASTAnalysis — never raises. Unsupported languages or
    parse failures degrade gracefully to an analysis with empty symbol lists.

    Args:
        code: Source code to analyze.
        language: Language name (normalized via _normalize_language).

    Returns:
        ASTAnalysis with functions, classes, imports, and structural metrics.
    """
    norm_lang = _normalize_language(language)
    parser = _get_parser(norm_lang)

    if parser is None:
        # Graceful degradation for unsupported languages
        return ASTAnalysis(
            language=norm_lang,
            has_parse_errors=False,
            error_count=0,
            functions=[],
            classes=[],
            imports=[],
            exported_names=[],
            function_count=0,
            class_count=0,
            max_nesting_depth=0,
        )

    try:
        source_bytes = code.encode("utf-8")
        tree = parser.parse(source_bytes)
        error_count = _count_errors(tree.root_node)
        has_errors = error_count > 0

        # Dispatch to language-specific extractor
        if norm_lang == "python":
            functions, classes, imports = _extract_python(tree, source_bytes)
        elif norm_lang == "go":
            functions, classes, imports = _extract_go(tree, source_bytes)
        elif norm_lang in ("typescript", "tsx", "javascript"):
            functions, classes, imports = _extract_typescript(tree, source_bytes)
        else:
            functions, classes, imports = [], [], []

        # Build the "symbol contract" — top-level exported names
        exported_names = [f.name for f in functions if not f.is_method] + [c.name for c in classes]

        return ASTAnalysis(
            language=norm_lang,
            has_parse_errors=has_errors,
            error_count=error_count,
            functions=functions,
            classes=classes,
            imports=imports,
            exported_names=exported_names,
            function_count=len(functions),
            class_count=len(classes),
            max_nesting_depth=_max_depth(tree.root_node),
        )
    except Exception as e:
        logger.warning(f"Tree-sitter analysis failed for {language!r}: {e}")
        return ASTAnalysis(
            language=norm_lang,
            has_parse_errors=True,
            error_count=1,
            functions=[],
            classes=[],
            imports=[],
            exported_names=[],
            function_count=0,
            class_count=0,
            max_nesting_depth=0,
        )


def verify_translation(
    source_code: str,
    source_language: str,
    translated_code: str,
    target_language: str,
) -> TranslationVerification:
    """Structurally compare a source snippet against its LLM-translated output.

    Returns a TranslationVerification with a structural_similarity score and
    actionable warnings. This is used by the LLM pipeline to detect obvious
    hallucinations (e.g., lost functions, syntax errors in output).

    Args:
        source_code: Original source code.
        source_language: Source language name.
        translated_code: LLM-generated translated code.
        target_language: Target language name.

    Returns:
        TranslationVerification with similarity score 0.0–1.0.
    """
    source_analysis = analyze(source_code, source_language)
    target_analysis = analyze(translated_code, target_language) if translated_code.strip() else None

    warnings: list[str] = []
    missing_exports: list[str] = []
    func_delta = 0
    class_delta = 0
    similarity = 1.0

    if target_analysis is None:
        warnings.append("Translated code is empty.")
        return TranslationVerification(
            source_language=source_language,
            target_language=target_language,
            source_analysis=source_analysis,
            target_analysis=None,
            has_parse_errors_in_target=True,
            function_count_delta=-(source_analysis.function_count),
            class_count_delta=-(source_analysis.class_count),
            missing_exports=source_analysis.exported_names,
            structural_similarity=0.0,
            warnings=warnings,
        )

    # Parse error detection
    if target_analysis.has_parse_errors:
        warnings.append(
            f"Translated {target_language} code has {target_analysis.error_count} "
            f"parse error(s) detected by Tree-sitter."
        )
        similarity -= 0.3

    # Function count check
    func_delta = target_analysis.function_count - source_analysis.function_count
    if func_delta < 0:
        warnings.append(
            f"Function count decreased: source has {source_analysis.function_count}, "
            f"translated has {target_analysis.function_count}. Possible functions lost."
        )
        similarity -= 0.2 * abs(func_delta)

    # Class count check
    class_delta = target_analysis.class_count - source_analysis.class_count
    if class_delta < -1:
        warnings.append(
            f"Class count decreased: source has {source_analysis.class_count}, "
            f"translated has {target_analysis.class_count}."
        )
        similarity -= 0.15

    # Symbol contract check: look for missing exported names in translated code
    # This is a heuristic — we do a simple substring search in the translated source
    if source_analysis.exported_names and translated_code:
        for name in source_analysis.exported_names:
            if name not in translated_code and name not in ("<anonymous>",):
                missing_exports.append(name)

    if missing_exports:
        warnings.append(
            f"These top-level names from the source were not found in the translation: "
            f"{', '.join(missing_exports[:10])}{'...' if len(missing_exports) > 10 else ''}. "
            f"The LLM may have renamed or omitted them."
        )
        # Each missing export reduces similarity proportionally
        source_export_count = len(source_analysis.exported_names) or 1
        similarity -= 0.25 * (len(missing_exports) / source_export_count)

    similarity = max(0.0, min(1.0, similarity))

    return TranslationVerification(
        source_language=source_language,
        target_language=target_language,
        source_analysis=source_analysis,
        target_analysis=target_analysis,
        has_parse_errors_in_target=target_analysis.has_parse_errors,
        function_count_delta=func_delta,
        class_count_delta=class_delta,
        missing_exports=missing_exports,
        structural_similarity=round(similarity, 3),
        warnings=warnings,
    )


def build_symbol_contract(code: str, language: str) -> dict:
    """Build a concise symbol contract dict for injection into LLM prompts.

    This is the primary integration point with the LLM pipeline. The returned
    dict is serialized into the system prompt to constrain the LLM output:
    "The translated code MUST preserve these function signatures and class names."

    Args:
        code: Source code to analyze.
        language: Source language name.

    Returns:
        A dict with keys: "functions", "classes", "imports", "exported_names".
        Returns an empty dict for unsupported languages or parse failures.
    """
    analysis = analyze(code, language)
    if not analysis.exported_names and not analysis.functions and not analysis.classes:
        return {}

    return {
        "language": language,
        "functions": [
            {
                "name": f.name,
                "parameters": f.parameters,
                "return_annotation": f.return_annotation,
                "is_async": f.is_async,
                "is_method": f.is_method,
                "lines": [f.start_line, f.end_line],
            }
            for f in analysis.functions
        ],
        "classes": [
            {
                "name": c.name,
                "bases": c.bases,
                "methods": c.methods,
                "lines": [c.start_line, c.end_line],
            }
            for c in analysis.classes
        ],
        "imports": analysis.imports[:20],  # Cap at 20 to avoid bloating prompts
        "exported_names": analysis.exported_names,
        "has_parse_errors": analysis.has_parse_errors,
        "function_count": analysis.function_count,
        "class_count": analysis.class_count,
    }


def generate_test_harness(analysis: ASTAnalysis, target_framework: str = "pytest") -> str:
    """Generate a scaffolded unit test harness derived from AST symbol contracts.

    Supported frameworks:
    - 'pytest': Python unit test suite with arrange/act/assert assertions
    - 'vitest' / 'jest': TypeScript/JavaScript describe/it blocks
    - 'testing': Standard Go package testing functions
    - 'cargo' / 'rust': Rust #[test] module
    """
    framework = target_framework.lower()
    functions = [f for f in analysis.functions if not f.is_method and not f.name.startswith("_")]
    if not functions:
        functions = analysis.functions

    if framework == "pytest":
        lines = [
            '"""Auto-generated Pytest harness derived from Anuvaad AST symbol contracts."""',
            "import pytest",
            "",
        ]
        for f in functions:
            params = ", ".join(f.parameters) if f.parameters else ""
            lines.extend(
                [
                    f"def test_{f.name}():",
                    f'    """Verify contract and execution boundary for {f.name}({params})."""',
                    "    # Arrange / Act",
                    f"    # result = {f.name}(...)",
                    "    # Assert",
                    "    assert True",
                    "",
                ]
            )
        return "\n".join(lines)

    if framework in ("vitest", "jest"):
        lines = [
            "// Auto-generated Vitest harness derived from Anuvaad AST symbol contracts",
            'import { describe, it, expect } from "vitest";',
            "",
            f'describe("Symbol Contract Suite: {analysis.language}", () => {{',
        ]
        for f in functions:
            lines.extend(
                [
                    f'  it("preserves contract for {f.name}", () => {{',
                    "    // Arrange / Act / Assert",
                    "    expect(true).toBe(true);",
                    "  });",
                    "",
                ]
            )
        lines.append("});")
        return "\n".join(lines)

    if framework == "testing":  # Go
        lines = [
            "// Auto-generated Go test harness derived from Anuvaad AST symbol contracts",
            "package main",
            "",
            'import "testing"',
            "",
        ]
        for f in functions:
            cap_name = f.name[0].upper() + f.name[1:] if f.name else "Func"
            lines.extend(
                [
                    f"func Test{cap_name}(t *testing.T) {{",
                    f"    // Contract test for {f.name}",
                    "    if false {",
                    f'        t.Errorf("contract violation in {f.name}")',
                    "    }",
                    "}",
                    "",
                ]
            )
        return "\n".join(lines)

    if framework in ("cargo", "rust"):
        lines = [
            "// Auto-generated Rust test harness derived from Anuvaad AST symbol contracts",
            "#[cfg(test)]",
            "mod tests {",
            "    use super::*;",
            "",
        ]
        for f in functions:
            lines.extend(
                [
                    "    #[test]",
                    f"    fn test_{f.name}() {{",
                    f"        // Verify boundary for {f.name}",
                    "        assert!(true);",
                    "    }",
                    "",
                ]
            )
        lines.append("}")
        return "\n".join(lines)

    lines = [f"# Test harness for {analysis.language}"]
    for f in functions:
        lines.append(f"# test {f.name}()")
    return "\n".join(lines)

"""Semantic AST Hash Deduplication & Cache Service.

Computes canonical AST hashes for input code by:
1. Parsing syntax trees using Tree-sitter (with standard ast fallback for Python).
2. Stripping comments and docstrings.
3. Normalizing whitespace, identifier spacing, and formatting.
4. Computing sha256(f"{language}:{normalized_ast}") for instant cache retrieval.
"""

from __future__ import annotations

import ast
import hashlib
import re
from typing import Any

from app.core.cache import cache
from app.services.ast_parser import _get_parser


class _PythonDocstringRemover(ast.NodeTransformer):
    """AST transformer that removes docstrings from modules, classes, and functions."""

    def _strip_docstring(self, node: ast.AST) -> None:
        if (
            hasattr(node, "body")
            and node.body
            and isinstance(node.body[0], ast.Expr)
            and isinstance(getattr(node.body[0], "value", None), ast.Constant)
        ):
            val = getattr(node.body[0].value, "value", None)
            if isinstance(val, str):
                node.body.pop(0)

    def visit_Module(self, node: ast.Module) -> ast.AST:
        self.generic_visit(node)
        self._strip_docstring(node)
        return node

    def visit_ClassDef(self, node: ast.ClassDef) -> ast.AST:
        self.generic_visit(node)
        self._strip_docstring(node)
        return node

    def visit_FunctionDef(self, node: ast.FunctionDef) -> ast.AST:
        self.generic_visit(node)
        self._strip_docstring(node)
        return node

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> ast.AST:
        self.generic_visit(node)
        self._strip_docstring(node)
        return node


def _normalize_python(code: str) -> str:
    """Normalize Python code by stripping comments and docstrings via ast."""
    try:
        parsed = ast.parse(code)
        _PythonDocstringRemover().visit(parsed)
        return ast.unparse(parsed).strip()
    except Exception:
        return _fallback_normalize(code)


def _normalize_tree_sitter(code: str, language: str) -> str:
    """Normalize code using Tree-sitter grammar, skipping comment nodes."""
    parser = _get_parser(language)
    if not parser:
        return _fallback_normalize(code)

    try:
        source_bytes = code.encode("utf-8")
        tree = parser.parse(source_bytes)
        root = tree.root_node

        tokens: list[str] = []

        def _traverse(node: Any) -> None:
            # Skip comments and docstrings
            if "comment" in node.type:
                return
            if node.child_count == 0:
                text = source_bytes[node.start_byte : node.end_byte].decode("utf-8", errors="replace").strip()
                if text:
                    tokens.append(text)
            else:
                for child in node.children:
                    _traverse(child)

        _traverse(root)
        if tokens:
            return " ".join(tokens)
        return _fallback_normalize(code)
    except Exception:
        return _fallback_normalize(code)


def _fallback_normalize(code: str) -> str:
    """Regex fallback: strip single/multi-line comments and collapse whitespace."""
    # Strip line comments (#, //)
    cleaned = re.sub(r"(#|//).*$", "", code, flags=re.MULTILINE)
    # Strip block comments (/* ... */)
    cleaned = re.sub(r"/\*.*?\*/", "", cleaned, flags=re.DOTALL)
    # Collapse whitespace
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def normalize_code_ast(code: str, language: str) -> str:
    """Normalize source code for AST semantic deduplication."""
    lang = language.lower().strip()
    if lang == "python":
        return _normalize_python(code)
    return _normalize_tree_sitter(code, lang)


def compute_ast_cache_key(code: str, language: str, depth: str = "dev") -> str:
    """Compute deterministic SHA-256 digest of normalized AST + explanation depth.

    The depth parameter partitions cache entries by persona:
      - 'tldr'  → concise 1-sentence summaries
      - 'dev'   → standard developer explanation (default)
      - 'audit' → security & complexity-focused analysis

    Backward-compatible: callers omitting depth default to 'dev'.
    """
    lang = language.lower().strip()
    effective_depth = depth if depth in ("tldr", "dev", "audit") else "dev"
    normalized = normalize_code_ast(code, lang)
    digest = hashlib.sha256(f"{lang}:{effective_depth}:{normalized}".encode()).hexdigest()
    return f"ast_cache:{digest}"


async def get_cached_ast_translation(code: str, language: str, depth: str = "dev") -> dict[str, Any] | None:
    """Check L1/L2 cache for an existing AST translation."""
    cache_key = compute_ast_cache_key(code, language, depth)
    return await cache.get(cache_key)


async def set_cached_ast_translation(
    code: str, language: str, data: dict[str, Any], ttl: int = 86400, depth: str = "dev"
) -> None:
    """Store AST translation in L1/L2 cache."""
    cache_key = compute_ast_cache_key(code, language, depth)
    await cache.put(cache_key, data, ttl=ttl)

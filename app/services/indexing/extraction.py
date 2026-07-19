"""Conservative deterministic structural extraction for repository sources."""

from __future__ import annotations

import ast
import os
import re
from dataclasses import dataclass

LANGUAGES = {
    ".py": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".go": "go",
    ".rs": "rust",
    ".java": "java",
    ".rb": "ruby",
    ".php": "php",
    ".c": "c",
    ".h": "c",
    ".cpp": "cpp",
    ".hpp": "cpp",
    ".html": "html",
    ".css": "css",
    ".json": "json",
    ".md": "markdown",
    ".yml": "yaml",
    ".yaml": "yaml",
    ".txt": "text",
}
_IMPORT_RE = re.compile(r"^\s*(?:import|from)\s+([\w./@-]+)", re.MULTILINE)
_SYMBOL_RE = re.compile(
    r"^\s*(?:export\s+)?(?:async\s+)?(?:function|class|interface|type|const|let|var)\s+([A-Za-z_$][\w$]*)", re.MULTILINE
)


@dataclass(frozen=True)
class ExtractedSymbol:
    name: str
    kind: str
    start: int
    end: int


@dataclass(frozen=True)
class ExtractedFile:
    path: str
    language: str
    module_identity: str | None
    symbols: tuple[ExtractedSymbol, ...]
    imports: tuple[str, ...]


def language_for_path(path: str) -> str:
    return LANGUAGES.get(os.path.splitext(path)[1].lower(), "text")


def extract_structure(path: str, content: str) -> ExtractedFile:
    """Extract declarations and imports only; references and call graphs are deferred."""
    language = language_for_path(path)
    if language == "python":
        try:
            tree = ast.parse(content)
        except SyntaxError:
            tree = None
        symbols = (
            tuple(
                ExtractedSymbol(
                    node.name,
                    "class" if isinstance(node, ast.ClassDef) else "function",
                    node.lineno,
                    getattr(node, "end_lineno", node.lineno),
                )
                for node in ast.walk(tree)
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef))
            )
            if tree
            else ()
        )
        imports = (
            tuple(
                dict.fromkeys(
                    alias.name for node in ast.walk(tree) if isinstance(node, ast.Import) for alias in node.names
                )
            )
            if tree
            else ()
        )
    else:
        symbols = tuple(
            ExtractedSymbol(
                match.group(1),
                match.group(0).strip().split()[0],
                content[: match.start()].count("\n") + 1,
                content[: match.end()].count("\n") + 1,
            )
            for match in _SYMBOL_RE.finditer(content)
        )
        imports = tuple(dict.fromkeys(match.group(1) for match in _IMPORT_RE.finditer(content)))
    return ExtractedFile(
        path, language, os.path.splitext(path)[0].replace("/", ".") if language == "python" else None, symbols, imports
    )

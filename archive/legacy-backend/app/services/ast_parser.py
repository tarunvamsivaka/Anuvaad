"""
Deterministic Tree-sitter AST Boundary Validation and Symbol Extraction Engine.

Invariants:
1. Validates translated code boundaries and syntax before returning to user.
2. Checks `node.has_error` to catch incomplete brackets or malformed code.
3. CPU-bound parsing operations must be dispatched via `asyncio.to_thread` to preserve event loop responsiveness.
"""
import asyncio
from typing import Dict, List, Optional, Tuple, Any
from app.schemas.translation import SupportedLanguage
from app.schemas.ast import (
    ASTCoordinate,
    ASTErrorNode,
    SymbolInfo,
    ASTValidationResponse,
)

# Tree-sitter 0.23+ Language and Parser imports
try:
    from tree_sitter import Language, Parser, Node, Tree
    import tree_sitter_python
    import tree_sitter_javascript
    import tree_sitter_typescript
    import tree_sitter_go
    import tree_sitter_rust
    import tree_sitter_java

    _TREE_SITTER_AVAILABLE = True
except ImportError:
    _TREE_SITTER_AVAILABLE = False


class TreeSitterEngine:
    def __init__(self):
        self._parsers: Dict[SupportedLanguage, Any] = {}
        self._languages: Dict[SupportedLanguage, Any] = {}
        if _TREE_SITTER_AVAILABLE:
            self._init_grammars()

    def _init_grammars(self) -> None:
        """Initialize language grammars using Tree-sitter 0.23 API."""
        try:
            # Python
            py_lang = Language(tree_sitter_python.language())
            self._languages[SupportedLanguage.PYTHON] = py_lang
            parser_py = Parser(py_lang)
            self._parsers[SupportedLanguage.PYTHON] = parser_py

            # JavaScript
            js_lang = Language(tree_sitter_javascript.language())
            self._languages[SupportedLanguage.JAVASCRIPT] = js_lang
            parser_js = Parser(js_lang)
            self._parsers[SupportedLanguage.JAVASCRIPT] = parser_js

            # TypeScript
            ts_lang = Language(tree_sitter_typescript.language_typescript())
            self._languages[SupportedLanguage.TYPESCRIPT] = ts_lang
            parser_ts = Parser(ts_lang)
            self._parsers[SupportedLanguage.TYPESCRIPT] = parser_ts

            # Go
            go_lang = Language(tree_sitter_go.language())
            self._languages[SupportedLanguage.GO] = go_lang
            parser_go = Parser(go_lang)
            self._parsers[SupportedLanguage.GO] = parser_go

            # Rust
            rust_lang = Language(tree_sitter_rust.language())
            self._languages[SupportedLanguage.RUST] = rust_lang
            parser_rust = Parser(rust_lang)
            self._parsers[SupportedLanguage.RUST] = parser_rust

            # Java
            java_lang = Language(tree_sitter_java.language())
            self._languages[SupportedLanguage.JAVA] = java_lang
            parser_java = Parser(java_lang)
            self._parsers[SupportedLanguage.JAVA] = parser_java
        except Exception:
            # Fall back gracefully if precompiled grammars vary
            pass

    def _find_errors(self, node: Any, code_bytes: bytes) -> List[ASTErrorNode]:
        """Recursively scan AST nodes for syntax errors (ERROR or MISSING nodes)."""
        errors: List[ASTErrorNode] = []
        if not node:
            return errors

        if node.type in ("ERROR", "MISSING") or node.is_missing:
            start_row, start_col = node.start_point
            end_row, end_col = node.end_point
            snippet = code_bytes[node.start_byte : node.end_byte].decode("utf-8", errors="replace")
            errors.append(
                ASTErrorNode(
                    start_point=ASTCoordinate(
                        row=start_row, column=start_col, byte_offset=node.start_byte
                    ),
                    end_point=ASTCoordinate(
                        row=end_row, column=end_col, byte_offset=node.end_byte
                    ),
                    node_type=node.type,
                    snippet=snippet or "<empty>",
                )
            )

        for child in node.children:
            if child.has_error:
                errors.extend(self._find_errors(child, code_bytes))

        return errors

    def _extract_symbols(self, node: Any, code_bytes: bytes, language: SupportedLanguage) -> List[SymbolInfo]:
        """Extract declared functions, classes, interfaces, and methods."""
        symbols: List[SymbolInfo] = []
        if not node:
            return symbols

        target_types = {
            "function_definition": "function",
            "class_definition": "class",
            "function_declaration": "function",
            "class_declaration": "class",
            "method_definition": "method",
            "interface_declaration": "interface",
            "type_alias_declaration": "type",
            "function_item": "function",
            "struct_item": "struct",
            "enum_item": "enum",
            "impl_item": "impl",
            "method_declaration": "method",
        }

        if node.type in target_types:
            kind = target_types[node.type]
            name = None
            # Find identifier node
            for child in node.children:
                if child.type in ("identifier", "name", "type_identifier", "property_identifier"):
                    name = code_bytes[child.start_byte : child.end_byte].decode("utf-8", errors="replace")
                    break

            if name:
                start_row, start_col = node.start_point
                end_row, end_col = node.end_point
                symbols.append(
                    SymbolInfo(
                        name=name,
                        kind=kind,
                        start_point=ASTCoordinate(
                            row=start_row, column=start_col, byte_offset=node.start_byte
                        ),
                        end_point=ASTCoordinate(
                            row=end_row, column=end_col, byte_offset=node.end_byte
                        ),
                    )
                )

        for child in node.children:
            symbols.extend(self._extract_symbols(child, code_bytes, language))

        return symbols

    def _count_nodes(self, node: Any) -> int:
        if not node:
            return 0
        count = 1
        for child in node.children:
            count += self._count_nodes(child)
        return count

    def parse_sync(self, code: str, language: SupportedLanguage) -> ASTValidationResponse:
        """Synchronous CPU-bound parse implementation."""
        code_bytes = code.encode("utf-8")
        parser = self._parsers.get(language)

        if not _TREE_SITTER_AVAILABLE or not parser:
            # Fallback lightweight bracket & structure validator when tree-sitter C-grammar is absent
            return self._fallback_validate(code, language)

        tree: Tree = parser.parse(code_bytes)
        root_node = tree.root_node

        is_valid = not root_node.has_error
        syntax_errors = self._find_errors(root_node, code_bytes) if root_node.has_error else []
        symbols = self._extract_symbols(root_node, code_bytes, language)
        total_nodes = self._count_nodes(root_node)

        return ASTValidationResponse(
            is_valid=is_valid,
            root_type=root_node.type,
            symbols=symbols,
            syntax_errors=syntax_errors,
            total_nodes=total_nodes,
        )

    def _fallback_validate(self, code: str, language: SupportedLanguage) -> ASTValidationResponse:
        """Deterministic bracket and balance validator fallback."""
        stack: List[Tuple[str, int, int]] = []
        matching = {")": "(", "}": "{", "]": "["}
        errors: List[ASTErrorNode] = []
        
        line_num = 0
        col_num = 0
        for i, char in enumerate(code):
            if char == "\n":
                line_num += 1
                col_num = 0
                continue
            col_num += 1
            if char in "({[":
                stack.append((char, line_num, col_num))
            elif char in ")}]":
                if not stack or stack[-1][0] != matching[char]:
                    errors.append(
                        ASTErrorNode(
                            start_point=ASTCoordinate(row=line_num, column=col_num, byte_offset=i),
                            end_point=ASTCoordinate(row=line_num, column=col_num + 1, byte_offset=i + 1),
                            node_type="UNBALANCED_BRACKET",
                            snippet=char,
                        )
                    )
                else:
                    stack.pop()

        while stack:
            open_char, r, c = stack.pop()
            errors.append(
                ASTErrorNode(
                    start_point=ASTCoordinate(row=r, column=c, byte_offset=0),
                    end_point=ASTCoordinate(row=r, column=c + 1, byte_offset=1),
                    node_type="UNCLOSED_BRACKET",
                    snippet=open_char,
                )
            )

        is_valid = len(errors) == 0
        return ASTValidationResponse(
            is_valid=is_valid,
            root_type=f"{language.value}_program",
            symbols=[],
            syntax_errors=errors,
            total_nodes=len(code.split()),
        )

    async def parse_async(self, code: str, language: SupportedLanguage) -> ASTValidationResponse:
        """
        Asynchronously validates code using asyncio.to_thread to prevent event loop blocking.
        """
        return await asyncio.to_thread(self.parse_sync, code, language)


# Global singleton instance
ast_engine = TreeSitterEngine()

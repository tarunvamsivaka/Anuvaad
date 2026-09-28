"""Repository Dependency Graph and Symbol Indexer.

Constructs directed acyclic dependency graphs (DAG) across entire codebases,
resolving symbol definitions, cross-file imports, and call dependencies.
Enables topological migration ordering: modernizing independent leaves before
orchestrating higher-level callers.
"""

from __future__ import annotations

import logging
from collections import defaultdict, deque
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from app.services.ast_parser import ASTAnalysis

logger = logging.getLogger("anuvaad.graph")


@dataclass
class SymbolNode:
    """Represents a discrete semantic symbol within a repository."""

    file_path: str
    symbol_name: str
    kind: str  # "function", "class", "module", "copybook", "struct", "interface"
    start_line: int
    end_line: int
    dependencies: set[str] = field(default_factory=set)

    def to_dict(self) -> dict[str, Any]:
        return {
            "file_path": self.file_path,
            "symbol_name": self.symbol_name,
            "kind": self.kind,
            "start_line": self.start_line,
            "end_line": self.end_line,
            "dependencies": sorted(list(self.dependencies)),
        }


class RepositoryDependencyGraph:
    """Graph structure tracking dependencies between symbols and files."""

    def __init__(self) -> None:
        self.symbol_table: dict[str, SymbolNode] = {}
        self.file_to_symbols: dict[str, list[str]] = defaultdict(list)
        # caller -> callees (forward edges)
        self.adj_list: dict[str, set[str]] = defaultdict(set)
        # callee -> callers (reverse edges)
        self.reverse_adj: dict[str, set[str]] = defaultdict(set)
        # file -> files imported
        self.file_deps: dict[str, set[str]] = defaultdict(set)

    def add_symbol(self, node: SymbolNode) -> None:
        """Register a symbol node in the repository graph."""
        self.symbol_table[node.symbol_name] = node
        self.file_to_symbols[node.file_path].append(node.symbol_name)
        if node.symbol_name not in self.adj_list:
            self.adj_list[node.symbol_name] = set()
        if node.symbol_name not in self.reverse_adj:
            self.reverse_adj[node.symbol_name] = set()

        for dep in node.dependencies:
            self.add_dependency(caller=node.symbol_name, callee=dep)

    def add_dependency(self, caller: str, callee: str) -> None:
        """Record a dependency from caller to callee."""
        self.adj_list[caller].add(callee)
        self.reverse_adj[callee].add(caller)

    def add_file_dependency(self, source_file: str, imported_file: str) -> None:
        """Record that source_file depends on imported_file."""
        self.file_deps[source_file].add(imported_file)

    def build_from_analyses(self, file_analyses: dict[str, ASTAnalysis]) -> None:
        """Populate graph from multiple ASTAnalysis results keyed by file path."""
        # 1. First pass: Register all function & class symbols
        for file_path, analysis in file_analyses.items():
            # Add file as a module symbol
            module_name = file_path.replace("\\", "/").split("/")[-1]
            self.add_symbol(
                SymbolNode(
                    file_path=file_path,
                    symbol_name=module_name,
                    kind="module",
                    start_line=1,
                    end_line=1,
                    dependencies=set(analysis.imports),
                )
            )

            for fn in analysis.functions:
                self.add_symbol(
                    SymbolNode(
                        file_path=file_path,
                        symbol_name=f"{module_name}::{fn.name}",
                        kind="function",
                        start_line=fn.start_line,
                        end_line=fn.end_line,
                    )
                )

            for cls in analysis.classes:
                self.add_symbol(
                    SymbolNode(
                        file_path=file_path,
                        symbol_name=f"{module_name}::{cls.name}",
                        kind="class",
                        start_line=cls.start_line,
                        end_line=cls.end_line,
                        dependencies=set(cls.bases),
                    )
                )

    def compute_migration_order(self) -> list[str]:
        """Compute topological sort order using Kahn's algorithm.

        Returns symbols in leaves-first order: symbols with zero outbound
        dependencies are modernized first, followed by callers.
        Handles circular dependencies cleanly by falling back to remaining nodes.
        """
        # Node -> out-degree (number of callees that this node depends on)
        out_degree: dict[str, int] = {}
        all_nodes = set(self.adj_list.keys()) | set(self.symbol_table.keys())

        for node in all_nodes:
            # We filter dependencies to only those in the known graph
            deps = {d for d in self.adj_list.get(node, set()) if d in all_nodes}
            out_degree[node] = len(deps)

        # Queue nodes with out_degree 0 (no dependencies = leaves)
        queue: deque[str] = deque([node for node, deg in out_degree.items() if deg == 0])
        order: list[str] = []

        while queue:
            curr = queue.popleft()
            order.append(curr)

            # For every node that depends on curr, decrement its out_degree
            for caller in self.reverse_adj.get(curr, set()):
                if caller in out_degree:
                    out_degree[caller] -= 1
                    if out_degree[caller] == 0:
                        queue.append(caller)

        # If cycles exist, append any remaining unprocessed nodes
        unprocessed = [node for node in all_nodes if node not in set(order)]
        if unprocessed:
            logger.info("Circular or unresolved dependencies detected; appending remaining nodes: %s", unprocessed)
            order.extend(unprocessed)

        return order

    def compute_file_migration_order(self) -> list[str]:
        """Compute topological sort order at the file level."""
        all_files = set(self.file_to_symbols.keys()) | set(self.file_deps.keys())
        out_degree: dict[str, int] = {}

        for f in all_files:
            deps = {d for d in self.file_deps.get(f, set()) if d in all_files and d != f}
            out_degree[f] = len(deps)

        queue: deque[str] = deque([f for f, deg in out_degree.items() if deg == 0])
        order: list[str] = []

        # reverse lookup: target_file -> files importing it
        imported_by: dict[str, set[str]] = defaultdict(set)
        for f, deps in self.file_deps.items():
            for d in deps:
                imported_by[d].add(f)

        while queue:
            curr = queue.popleft()
            order.append(curr)

            for parent in imported_by.get(curr, set()):
                if parent in out_degree:
                    out_degree[parent] -= 1
                    if out_degree[parent] == 0:
                        queue.append(parent)

        unprocessed = [f for f in all_files if f not in set(order)]
        if unprocessed:
            order.extend(unprocessed)

        return order

    def get_impacted_symbols(self, changed_symbol: str) -> list[str]:
        """Find all upstream callers transitively affected if changed_symbol is modified."""
        visited: set[str] = set()
        queue: deque[str] = deque([changed_symbol])

        while queue:
            curr = queue.popleft()
            for caller in self.reverse_adj.get(curr, set()):
                if caller not in visited:
                    visited.add(caller)
                    queue.append(caller)

        return sorted(list(visited))

    def to_dict(self) -> dict[str, Any]:
        """Serialize graph representation for visualization and APIs."""
        return {
            "total_symbols": len(self.symbol_table),
            "symbols": {k: v.to_dict() for k, v in self.symbol_table.items()},
            "migration_order": self.compute_migration_order(),
            "file_migration_order": self.compute_file_migration_order(),
        }

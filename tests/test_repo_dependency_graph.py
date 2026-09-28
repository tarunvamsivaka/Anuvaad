"""Tests for RepositoryDependencyGraph and topological migration ordering."""

from app.services.ast_parser import parse_code
from app.services.graph.dependency_graph import RepositoryDependencyGraph, SymbolNode


def test_symbol_node_creation_and_serialization():
    node = SymbolNode(
        file_path="pkg/math.py",
        symbol_name="pkg.math::add",
        kind="function",
        start_line=10,
        end_line=20,
        dependencies={"pkg.types::Number"},
    )
    d = node.to_dict()
    assert d["symbol_name"] == "pkg.math::add"
    assert d["kind"] == "function"
    assert "pkg.types::Number" in d["dependencies"]


def test_topological_migration_order_leaves_first():
    graph = RepositoryDependencyGraph()

    # leaf symbol: util has no dependencies
    graph.add_symbol(SymbolNode("util.py", "util::helper", "function", 1, 5, set()))

    # service depends on util
    graph.add_symbol(SymbolNode("service.py", "service::process", "function", 10, 20, {"util::helper"}))

    # api depends on service
    graph.add_symbol(SymbolNode("api.py", "api::handler", "function", 1, 15, {"service::process"}))

    order = graph.compute_migration_order()
    assert len(order) == 3

    # util::helper must appear before service::process
    assert order.index("util::helper") < order.index("service::process")
    # service::process must appear before api::handler
    assert order.index("service::process") < order.index("api::handler")


def test_circular_dependency_graceful_handling():
    graph = RepositoryDependencyGraph()

    # Circular: A depends on B, B depends on A
    graph.add_symbol(SymbolNode("a.py", "A", "class", 1, 10, {"B"}))
    graph.add_symbol(SymbolNode("b.py", "B", "class", 1, 10, {"A"}))

    order = graph.compute_migration_order()
    assert len(order) == 2
    assert "A" in order
    assert "B" in order


def test_impacted_symbols_transitive_callers():
    graph = RepositoryDependencyGraph()

    # base -> mid -> top
    graph.add_symbol(SymbolNode("base.py", "base", "module", 1, 1, set()))
    graph.add_symbol(SymbolNode("mid.py", "mid", "module", 1, 1, {"base"}))
    graph.add_symbol(SymbolNode("top.py", "top", "module", 1, 1, {"mid"}))

    impacted = graph.get_impacted_symbols("base")
    assert "mid" in impacted
    assert "top" in impacted


def test_build_from_analyses():
    graph = RepositoryDependencyGraph()

    py_code = """
import os
import sys

def compute_total(a: int, b: int) -> int:
    return a + b

class Calculator:
    def add(self, x, y):
        return x + y
"""
    analysis = parse_code(py_code, "python")
    graph.build_from_analyses({"src/calc.py": analysis})

    serialized = graph.to_dict()
    assert serialized["total_symbols"] >= 3
    assert "calc.py" in serialized["symbols"]
    assert "calc.py::compute_total" in serialized["symbols"]

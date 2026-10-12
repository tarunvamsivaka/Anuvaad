"""
Repository Ingestion and Topological Dependency DAG Engine.

Invariants:
1. Ingests full project files in volatile RAM.
2. Extracts cross-file dependencies and constructs Directed Acyclic Graph (DAG).
3. Produces topological translation order: foundational types/models translate before consumers.
"""
import re
from typing import Dict, List, Set, Tuple, Optional, Any
from collections import defaultdict, deque
from app.schemas.translation import SupportedLanguage
from app.schemas.repository import FileNode
from app.services.ast_parser import ast_engine


class RepositoryGraphEngine:
    def __init__(self):
        # In-memory storage for active imported repository sessions
        self._active_repos: Dict[str, Dict[str, str]] = {}
        self._repo_metadata: Dict[str, Dict[str, Any]] = {}

    def extract_imports(self, code: str, language: SupportedLanguage, all_files: Set[str]) -> List[str]:
        """
        Extracts imported local files from code using language-specific import syntax.
        """
        imported_files: List[str] = []
        normalized_files = {f.replace("\\", "/"): f for f in all_files}

        if language in (SupportedLanguage.PYTHON,):
            # Matches: from .models import User OR import models
            patterns = [
                r"from\s+([.\w]+)\s+import",
                r"import\s+([.\w]+)",
            ]
            for pat in patterns:
                for match in re.finditer(pat, code):
                    module = match.group(1).lstrip(".")
                    # Check candidate file paths
                    candidates = [
                        f"{module}.py",
                        f"{module}/__init__.py",
                        f"{module.replace('.', '/')}.py",
                    ]
                    for cand in candidates:
                        for norm in normalized_files:
                            if norm.endswith(cand):
                                imported_files.append(normalized_files[norm])
                                break

        elif language in (SupportedLanguage.TYPESCRIPT, SupportedLanguage.JAVASCRIPT):
            # Matches: import { X } from './models' OR import './utils'
            pat = r"from\s+['\"]([.\w/-]+)['\"]"
            for match in re.finditer(pat, code):
                imp_path = match.group(1).lstrip("./")
                candidates = [f"{imp_path}.ts", f"{imp_path}.tsx", f"{imp_path}.js", f"{imp_path}/index.ts"]
                for cand in candidates:
                    for norm in normalized_files:
                        if norm.endswith(cand):
                            imported_files.append(normalized_files[norm])
                            break

        elif language in (SupportedLanguage.GO,):
            # Matches: import "project/pkg"
            pat = r"import\s+[\(]?\s*['\"]([\w/-]+)['\"]"
            for match in re.finditer(pat, code):
                pkg = match.group(1).split("/")[-1]
                for norm in normalized_files:
                    if pkg in norm:
                        imported_files.append(normalized_files[norm])

        return list(set(imported_files))

    def compute_topological_order(
        self, files: Dict[str, str], language: SupportedLanguage
    ) -> Tuple[List[str], Dict[str, List[str]]]:
        """
        Computes Kahn's topological sort on repository dependency graph.
        Returns: (topological_order_list, dependency_map)
        """
        file_set = set(files.keys())
        dependencies: Dict[str, List[str]] = {}
        in_degree: Dict[str, int] = {f: 0 for f in file_set}
        graph: Dict[str, List[str]] = defaultdict(list)

        for path, content in files.items():
            deps = self.extract_imports(content, language, file_set)
            # Remove self-dependency
            deps = [d for d in deps if d != path]
            dependencies[path] = deps

            for dep in deps:
                graph[dep].append(path)
                in_degree[path] += 1

        # Kahn's Algorithm
        queue = deque([f for f in file_set if in_degree[f] == 0])
        order: List[str] = []

        while queue:
            node = queue.popleft()
            order.append(node)

            for dependent in graph[node]:
                in_degree[dependent] -= 1
                if in_degree[dependent] == 0:
                    queue.append(dependent)

        # If cycles exist, append remaining nodes to guarantee full coverage
        if len(order) < len(file_set):
            remaining = [f for f in file_set if f not in set(order)]
            order.extend(remaining)

        return order, dependencies

    async def ingest_repository(
        self,
        import_id: str,
        files: Dict[str, str],
        source_language: SupportedLanguage,
        target_language: SupportedLanguage,
    ) -> Dict[str, Any]:
        """
        Processes repository files, extracts structural symbols and computes DAG.
        """
        order, deps = self.compute_topological_order(files, source_language)

        file_nodes: List[FileNode] = []
        total_symbols = 0

        for path in order:
            content = files[path]
            ast_res = await ast_engine.parse_async(content, source_language)
            total_symbols += len(ast_res.symbols)

            file_nodes.append(
                FileNode(
                    path=path,
                    language=source_language,
                    size_bytes=len(content.encode("utf-8")),
                    symbol_count=len(ast_res.symbols),
                    translation_status="pending",
                )
            )

        if len(self._active_repos) >= 20:
            # Evict oldest session to prevent unbounded memory growth (CWE-400)
            oldest_id = next(iter(self._active_repos))
            del self._active_repos[oldest_id]
            if oldest_id in self._repo_metadata:
                del self._repo_metadata[oldest_id]

        self._active_repos[import_id] = files
        self._repo_metadata[import_id] = {
            "source_language": source_language,
            "target_language": target_language,
            "topological_order": order,
            "dependencies": deps,
            "file_nodes": file_nodes,
        }

        return {
            "topological_order": order,
            "total_symbols": total_symbols,
            "file_nodes": file_nodes,
            "dependencies": deps,
        }

    def get_repo(self, import_id: str) -> Optional[Dict[str, str]]:
        return self._active_repos.get(import_id)

    def get_metadata(self, import_id: str) -> Optional[Dict[str, Any]]:
        return self._repo_metadata.get(import_id)

    def evict_repo(self, import_id: str) -> None:
        """
        Explicitly scrubs source code from volatile RAM upon translation completion (Zero Code Retention).
        """
        if import_id in self._active_repos:
            del self._active_repos[import_id]


# Global singleton
repo_graph_engine = RepositoryGraphEngine()

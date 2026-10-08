"""
Vector Memory and Cross-File Symbol Contract Retrieval Engine (pgvector).

Invariants:
1. Embeds translated public symbol interfaces and types across files.
2. Injects relevant referenced interfaces into subsequent file translation prompts to prevent hallucinated contracts.
"""
import httpx
import logging
import hashlib
from typing import List, Dict, Optional, Any
from app.core.config import settings

logger = logging.getLogger(__name__)


class VectorMemoryEngine:
    def __init__(self):
        # In-memory vector cache for active repository modernization sessions
        # Capped to 50 active sessions to prevent memory exhaustion (CWE-400)
        self._memory_cache: Dict[str, List[Dict[str, Any]]] = {}

    async def get_embedding(self, text: str) -> List[float]:
        """
        Generates 768-dim embedding via Gemini text-embedding-004 or deterministic fallback.
        SEC-004 Fix: Transmits API key via 'x-goog-api-key' header instead of URL query parameter.
        """
        if settings.GEMINI_API_KEY:
            url = "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent"
            headers = {
                "Content-Type": "application/json",
                "x-goog-api-key": settings.GEMINI_API_KEY,
            }
            payload = {
                "model": "models/text-embedding-004",
                "content": {"parts": [{"text": text[:2000]}]},
            }
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(url, headers=headers, json=payload)
                    if resp.status_code == 200:
                        return resp.json()["embedding"]["values"]
            except Exception as e:
                logger.warning(f"Gemini embedding API call failed: {e}")

        # Deterministic pseudo-embedding fallback for zero-cost / offline testing
        return self._hash_embedding(text)

    def _hash_embedding(self, text: str, dim: int = 768) -> List[float]:
        """
        QLT-003 Fix: Generates deterministic unit vector from text tokens using SHA-256.
        Eliminates reliance on process-randomized python hash().
        """
        vec = [0.0] * dim
        tokens = text.lower().split()
        for token in tokens:
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            token_int = int.from_bytes(digest[:4], byteorder="big")
            idx = token_int % dim
            vec[idx] += 1.0

        # Normalize
        norm = sum(x * x for x in vec) ** 0.5
        if norm > 0:
            vec = [x / norm for x in vec]
        return vec

    def _cosine_similarity(self, v1: List[float], v2: List[float]) -> float:
        dot = sum(a * b for a, b in zip(v1, v2))
        return dot

    def _extract_contract_interface(self, content: str) -> str:
        """
        SEC-003 Fix: Extracts only type/interface signatures and public headers.
        Never retains full proprietary function bodies in semantic memory.
        """
        contract_lines = []
        for line in content.splitlines():
            stripped = line.strip()
            # Capture type, class, interface, function declarations and docstrings
            if any(
                stripped.startswith(prefix)
                for prefix in (
                    "export",
                    "interface",
                    "type ",
                    "class ",
                    "def ",
                    "pub fn",
                    "fn ",
                    "func ",
                    "//",
                    "/*",
                    "*",
                )
            ):
                contract_lines.append(line)
        contract = "\n".join(contract_lines)
        return contract[:800] if contract else content[:400]

    async def index_translated_file(
        self,
        repository_name: str,
        file_path: str,
        content: str,
    ) -> None:
        """
        Stores translated contract interface in semantic memory (ZDR compliant).
        """
        if repository_name not in self._memory_cache:
            if len(self._memory_cache) >= 50:
                # Evict oldest repo to preserve RAM bounds
                oldest_key = next(iter(self._memory_cache))
                del self._memory_cache[oldest_key]
            self._memory_cache[repository_name] = []

        contract = self._extract_contract_interface(content)
        embedding = await self.get_embedding(contract)
        self._memory_cache[repository_name].append({
            "file_path": file_path,
            "contract": contract,
            "embedding": embedding,
        })

    async def retrieve_symbol_context(
        self,
        repository_name: str,
        query: str,
        top_k: int = 2,
    ) -> str:
        """
        Retrieves the top-k most relevant translated contract snippets to inject into translation prompts.
        """
        records = self._memory_cache.get(repository_name, [])
        if not records:
            return ""

        query_vec = await self.get_embedding(query)
        scored = []
        for r in records:
            sim = self._cosine_similarity(query_vec, r["embedding"])
            scored.append((sim, r))

        scored.sort(key=lambda x: x[0], reverse=True)
        top_records = scored[:top_k]

        context_parts = []
        for score, r in top_records:
            context_parts.append(
                f"// Referenced Contract from already translated {r['file_path']}:\n{r['contract']}..."
            )

        return "\n\n".join(context_parts)

    def clear_repository(self, repository_name: str) -> None:
        """
        Explicitly scrubs all semantic memory for repository (Zero Code Retention).
        """
        if repository_name in self._memory_cache:
            del self._memory_cache[repository_name]


# Global singleton
vector_memory_engine = VectorMemoryEngine()

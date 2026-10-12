"""
Unit tests for vector memory and semantic symbol contract retrieval.
"""
import pytest
from app.services.vector_memory import VectorMemoryEngine


@pytest.mark.asyncio
async def test_vector_memory_indexing_and_retrieval():
    engine = VectorMemoryEngine()
    repo_name = "test_org/test_repo"

    # Index translated models.ts
    models_code = "export interface UserAccount {\n    id: string;\n    email: string;\n    tier: 'free' | 'pro';\n}"
    await engine.index_translated_file(repo_name, "src/models.ts", models_code)

    # Index translated utils.ts
    utils_code = "export function formatCurrency(amount: number): string {\n    return `$${amount.toFixed(2)}`;\n}"
    await engine.index_translated_file(repo_name, "src/utils.ts", utils_code)

    # Query for UserAccount
    retrieved = await engine.retrieve_symbol_context(repo_name, "UserAccount user authentication", top_k=1)
    assert "models.ts" in retrieved
    assert "UserAccount" in retrieved

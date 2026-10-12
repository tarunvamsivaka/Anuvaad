"""
Unit tests for multi-file repository ingestion and topological dependency ordering.
"""
import pytest
from app.services.repo_ingestion import RepositoryGraphEngine
from app.schemas.translation import SupportedLanguage


@pytest.mark.asyncio
async def test_topological_dependency_sorting():
    engine = RepositoryGraphEngine()

    # 3-file scenario:
    # main.py imports service.py
    # service.py imports models.py
    # Expected topological order: models.py -> service.py -> main.py
    files = {
        "src/main.py": "from .service import UserService\n\ndef main(): pass",
        "src/service.py": "from .models import User\n\nclass UserService: pass",
        "src/models.py": "class User:\n    id: int\n    name: str",
    }

    result = await engine.ingest_repository(
        import_id="test_repo_dag_1",
        files=files,
        source_language=SupportedLanguage.PYTHON,
        target_language=SupportedLanguage.TYPESCRIPT,
    )

    order = result["topological_order"]
    assert len(order) == 3

    # models.py MUST come before service.py
    assert order.index("src/models.py") < order.index("src/service.py")
    # service.py MUST come before main.py
    assert order.index("src/service.py") < order.index("src/main.py")
    assert result["total_symbols"] > 0


@pytest.mark.asyncio
async def test_cycle_handling_in_topological_sort():
    engine = RepositoryGraphEngine()

    # Cyclic dependency: a.py imports b.py, b.py imports a.py
    files = {
        "a.py": "import b\ndef fn_a(): pass",
        "b.py": "import a\ndef fn_b(): pass",
    }

    result = await engine.ingest_repository(
        import_id="test_repo_cycle_1",
        files=files,
        source_language=SupportedLanguage.PYTHON,
        target_language=SupportedLanguage.GO,
    )

    # Engine must resolve both without throwing or infinite loop
    order = result["topological_order"]
    assert len(order) == 2
    assert "a.py" in order and "b.py" in order

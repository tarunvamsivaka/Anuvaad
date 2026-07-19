from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.services.indexing.admission import AdmissionPolicy, AdmissionRejectedError
from app.services.indexing.extraction import extract_structure
from app.services.indexing.pipeline import RepositoryIndexingPipeline


def test_admission_rejects_before_source_processing():
    policy = AdmissionPolicy(max_files=1)
    with pytest.raises(AdmissionRejectedError, match="file admission"):
        policy.validate_content(
            [
                {"path": "one.py", "content": "print(1)"},
                {"path": "two.py", "content": "print(2)"},
            ]
        )


def test_python_extraction_is_conservative_and_deterministic():
    extracted = extract_structure(
        "package/example.py",
        "import os\nfrom app.core import config\n\nclass Service:\n    pass\n\ndef run():\n    return os.name\n",
    )
    assert extracted.language == "python"
    assert extracted.module_identity == "package.example"
    assert {(symbol.name, symbol.kind) for symbol in extracted.symbols} == {("Service", "class"), ("run", "function")}
    assert extracted.imports == ("os",)


@pytest.mark.asyncio
async def test_pipeline_rejects_unknown_workspace_before_fetching():
    session = AsyncMock()
    result = MagicMock()
    result.one_or_none.return_value = None
    session.execute.return_value = result
    fetcher = MagicMock()
    pipeline = RepositoryIndexingPipeline(session, fetcher=fetcher)

    with pytest.raises(AdmissionRejectedError, match="not owned"):
        await pipeline.run(uuid4(), uuid4(), uuid4())

    fetcher.assert_not_called()
    session.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_pipeline_is_idempotent_when_desired_state_is_current():
    session = AsyncMock()
    desired = MagicMock()
    desired.index_configuration.chunk_size = 100
    import_ = MagicMock(provider="github")
    source = MagicMock()
    context_result = MagicMock()
    context_result.one_or_none.return_value = (desired, import_, source)
    publication_result = MagicMock()
    publication_result.scalar_one_or_none.return_value = MagicMock()
    session.execute.side_effect = [context_result, publication_result]
    fetcher = MagicMock()
    pipeline = RepositoryIndexingPipeline(session, fetcher=fetcher)

    assert await pipeline.run(uuid4(), uuid4(), uuid4()) == "already_published"
    fetcher.assert_not_called()
    session.commit.assert_not_awaited()

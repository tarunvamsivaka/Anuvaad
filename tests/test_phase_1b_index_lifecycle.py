import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from app.models.schemas import DesiredIndexStateCreate, IndexRunCreate
from pydantic import ValidationError
import uuid

@pytest.fixture
def mock_session():
    session = AsyncMock()
    session.add = MagicMock()
    
    ctx_manager = MagicMock()
    ctx_manager.__aenter__.return_value = session
    ctx_manager.__aexit__.return_value = None
    
    return session, ctx_manager

def test_pydantic_schemas():
    # Test valid creation
    ds_create = DesiredIndexStateCreate(
        import_id=str(uuid.uuid4()),
        source_state_id=str(uuid.uuid4()),
        index_configuration_id=str(uuid.uuid4())
    )
    assert ds_create.import_id is not None
    
    run_create = IndexRunCreate(
        desired_state_id=str(uuid.uuid4()),
        status="PENDING"
    )
    assert run_create.status == "PENDING"
    
    # Test missing fields
    with pytest.raises(ValidationError):
        IndexRunCreate(status="PENDING")

@pytest.mark.asyncio
@patch("app.repositories.repository_identity.AsyncSessionLocal") # Mocking just to have a similar structure, but we actually just test schemas and model instantiations
async def test_mock_creation(mock_local, mock_session):
    from app.models.db_models import DesiredIndexState, IndexRun
    session, ctx_manager = mock_session
    mock_local.return_value = ctx_manager
    
    import_id = uuid.uuid4()
    ds = DesiredIndexState(
        import_id=import_id,
        source_state_id=uuid.uuid4(),
        index_configuration_id=uuid.uuid4(),
        incarnation_id=uuid.uuid4()
    )
    session.add(ds)
    session.add.assert_called_once_with(ds)
    
    run = IndexRun(
        desired_state_id=ds.id,
        status="PENDING"
    )
    session.add(run)
    assert session.add.call_count == 2

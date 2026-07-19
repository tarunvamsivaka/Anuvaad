import uuid

import pytest
from pydantic import ValidationError

from app.models.db_models import DesiredIndexState, IndexRun
from app.models.schemas import DesiredIndexStateCreate, IndexRunCreate


def test_phase_1b_create_schemas_require_lifecycle_identifiers() -> None:
    desired_state = DesiredIndexStateCreate(
        import_id=str(uuid.uuid4()),
        source_state_id=str(uuid.uuid4()),
        index_configuration_id=str(uuid.uuid4()),
    )
    index_run = IndexRunCreate(desired_state_id=str(uuid.uuid4()), status="PENDING")

    assert desired_state.import_id
    assert index_run.status == "PENDING"

    with pytest.raises(ValidationError):
        IndexRunCreate(status="PENDING")


def test_phase_1b_models_link_only_lifecycle_entities() -> None:
    desired_state = DesiredIndexState(
        import_id=uuid.uuid4(),
        source_state_id=uuid.uuid4(),
        index_configuration_id=uuid.uuid4(),
        incarnation_id=uuid.uuid4(),
    )
    index_run = IndexRun(desired_state_id=desired_state.id, status="PENDING")

    assert desired_state.__tablename__ == "desired_index_states"
    assert index_run.__tablename__ == "index_runs"
    assert index_run.desired_state_id == desired_state.id

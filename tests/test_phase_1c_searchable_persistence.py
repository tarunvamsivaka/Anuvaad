from sqlalchemy import inspect
from alembic import command

from tests.test_migrations import _alembic_config, _foreign_key_targets


def test_phase_1c_upgrade_and_downgrade(migration_engine) -> None:
    """Phase 1C adds and removes only searchable persistence tables."""
    config = _alembic_config()
    command.upgrade(config, "007_phase_1b")

    inspector = inspect(migration_engine)
    phase_1c_tables = {
        "searchable_materializations",
        "structural_files",
        "structural_symbols",
        "structural_imports",
        "repository_linked_history",
    }
    assert phase_1c_tables.isdisjoint(inspector.get_table_names())

    command.upgrade(config, "008_phase_1c")
    inspector = inspect(migration_engine)
    assert phase_1c_tables <= set(inspector.get_table_names())

    materialization_columns = {
        column["name"]: column
        for column in inspector.get_columns("searchable_materializations")
    }
    assert set(materialization_columns) == {
        "id", "import_id", "index_run_id", "is_current", "published_at"
    }
    assert _foreign_key_targets(migration_engine, "searchable_materializations") == {
        ("import_id", "repository_imports"),
        ("index_run_id", "index_runs"),
    }
    assert any(
        index["name"] == "uq_searchable_materializations_current_import"
        and index["column_names"] == ["import_id"]
        and index["unique"]
        for index in inspector.get_indexes("searchable_materializations")
    )

    assert _foreign_key_targets(migration_engine, "structural_files") == {
        ("materialization_id", "searchable_materializations"),
    }
    assert _foreign_key_targets(migration_engine, "structural_symbols") == {
        ("structural_file_id", "structural_files"),
    }
    assert _foreign_key_targets(migration_engine, "structural_imports") == {
        ("source_file_id", "structural_files"),
        ("resolved_target_file_id", "structural_files"),
    }
    assert _foreign_key_targets(migration_engine, "repository_linked_history") == {
        ("workspace_id", "workspaces"),
        ("translation_history_id", "translation_history"),
        ("import_id", "repository_imports"),
        ("source_state_id", "source_states"),
    }

    command.downgrade(config, "007_phase_1b")
    assert phase_1c_tables.isdisjoint(inspect(migration_engine).get_table_names())

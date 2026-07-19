"""PostgreSQL migration verification for the Phase 1B lifecycle schema.

The test intentionally exercises only the 006_phase_1a -> 007_phase_1b
transition.  It runs in the dedicated ``migration`` CI job, where
``MIGRATION_DATABASE_URL`` points at an ephemeral PostgreSQL + pgvector
database.
"""

from __future__ import annotations

import os

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect
from sqlalchemy.engine import Engine


MIGRATION_DATABASE_URL = os.getenv("MIGRATION_DATABASE_URL")


@pytest.fixture(scope="module")
def migration_engine() -> Engine:
    if not MIGRATION_DATABASE_URL:
        pytest.skip("MIGRATION_DATABASE_URL is required for PostgreSQL migration tests")

    engine = create_engine(MIGRATION_DATABASE_URL)
    try:
        yield engine
    finally:
        engine.dispose()


def _alembic_config() -> Config:
    config = Config("alembic.ini")
    config.set_main_option("sqlalchemy.url", MIGRATION_DATABASE_URL or "")
    return config


def _foreign_key_targets(engine: Engine, table_name: str) -> set[tuple[str, str]]:
    return {
        (foreign_key["constrained_columns"][0], foreign_key["referred_table"])
        for foreign_key in inspect(engine).get_foreign_keys(table_name)
    }


def test_phase_1b_upgrade_and_downgrade(migration_engine: Engine) -> None:
    """Phase 1B adds and removes only its lifecycle tables and constraints."""
    config = _alembic_config()
    command.upgrade(config, "006_phase_1a")

    inspector = inspect(migration_engine)
    phase_1a_tables = {"repository_imports", "source_states", "index_configurations"}
    assert phase_1a_tables <= set(inspector.get_table_names())
    assert {"desired_index_states", "index_runs"}.isdisjoint(inspector.get_table_names())

    command.upgrade(config, "007_phase_1b")

    inspector = inspect(migration_engine)
    table_names = set(inspector.get_table_names())
    assert phase_1a_tables <= table_names
    assert {"desired_index_states", "index_runs"} <= table_names
    assert not {
        "searchable_materializations",
        "structural_files",
        "structural_symbols",
        "structural_imports",
        "repository_linked_history",
    } & table_names

    desired_columns = {column["name"]: column for column in inspector.get_columns("desired_index_states")}
    assert set(desired_columns) == {
        "id",
        "import_id",
        "source_state_id",
        "index_configuration_id",
        "incarnation_id",
        "created_at",
    }
    assert not desired_columns["id"]["nullable"]
    assert not desired_columns["import_id"]["nullable"]
    assert not desired_columns["source_state_id"]["nullable"]
    assert not desired_columns["index_configuration_id"]["nullable"]
    assert not desired_columns["incarnation_id"]["nullable"]
    assert desired_columns["created_at"]["nullable"]
    assert inspector.get_pk_constraint("desired_index_states")["constrained_columns"] == ["id"]
    assert _foreign_key_targets(migration_engine, "desired_index_states") == {
        ("import_id", "repository_imports"),
        ("source_state_id", "source_states"),
        ("index_configuration_id", "index_configurations"),
    }
    assert any(
        constraint["column_names"] == ["incarnation_id"]
        for constraint in inspector.get_unique_constraints("desired_index_states")
    )
    assert any(
        index["name"] == "ix_desired_index_states_import_id"
        and index["column_names"] == ["import_id"]
        for index in inspector.get_indexes("desired_index_states")
    )

    index_run_columns = {column["name"]: column for column in inspector.get_columns("index_runs")}
    assert set(index_run_columns) == {
        "id",
        "desired_state_id",
        "status",
        "error_diagnostics",
        "created_at",
        "completed_at",
    }
    assert not index_run_columns["id"]["nullable"]
    assert not index_run_columns["desired_state_id"]["nullable"]
    assert not index_run_columns["status"]["nullable"]
    assert index_run_columns["error_diagnostics"]["nullable"]
    assert index_run_columns["created_at"]["nullable"]
    assert index_run_columns["completed_at"]["nullable"]
    assert inspector.get_pk_constraint("index_runs")["constrained_columns"] == ["id"]
    assert _foreign_key_targets(migration_engine, "index_runs") == {
        ("desired_state_id", "desired_index_states"),
    }
    assert any(
        index["name"] == "ix_index_runs_desired_state_id"
        and index["column_names"] == ["desired_state_id"]
        for index in inspector.get_indexes("index_runs")
    )

    command.downgrade(config, "006_phase_1a")

    inspector = inspect(migration_engine)
    table_names = set(inspector.get_table_names())
    assert phase_1a_tables <= table_names
    assert {"desired_index_states", "index_runs"}.isdisjoint(table_names)

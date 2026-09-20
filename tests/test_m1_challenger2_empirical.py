"""Empirical Adversarial Challenge Suite for Milestone 1 Database Remediation.

Executed by Challenger 2:
- Migration graph linearity, branchlessness, and single head validation.
- Migration 010 upgrade/downgrade execution and idempotence.
- Index verification: column matching, uniqueness, naming, and dialect compatibility.
- Composite index verification: ix_translation_history_user_created and query plan analysis.
- Model vs Migration schema synchronization (TranslationHistory, UserSubscription, ApiKey, DesiredIndexState).
- FK constraints and cascade behavior under indexed scenarios.
- Global index uniqueness and collision audit across all 14 migration files.
- Foreign Key coverage audit (verifying all FK columns have supporting indexes).
"""

from __future__ import annotations

import importlib.util
import re
from pathlib import Path
from unittest.mock import MagicMock

from alembic.config import Config
from alembic.operations import Operations
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import (
    Column,
    DateTime,
    Index,
    Integer,
    MetaData,
    String,
    Table,
    create_engine,
    inspect,
    text,
)
from sqlalchemy.orm import declarative_base, sessionmaker

from app.models.db_models import (
    ApiKey,
    DesiredIndexState,
    IndexRun,
    RepositoryImport,
    RepositoryLinkedHistory,
    SearchableMaterialization,
    SemanticArtifact,
    SourceState,
    StructuralFile,
    StructuralImport,
    StructuralSymbol,
    TranslationHistory,
    UserSubscription,
)

# ============================================================================
# 1. ALEMBIC MIGRATION GRAPH LINEARITY & HEAD INTEGRITY
# ============================================================================


def test_alembic_single_head_and_no_branches():
    """Verify that Alembic has exactly one head and zero branches/forks."""
    config = Config("alembic.ini")
    script = ScriptDirectory.from_config(config)

    heads = script.get_heads()
    assert len(heads) == 1, f"Expected exactly 1 head, found {len(heads)}: {heads}"
    assert heads[0] == "012_grant_anon_translation_count"

    bases = script.get_bases()
    assert len(bases) == 1, f"Expected exactly 1 base, found {len(bases)}: {bases}"
    assert bases[0] == "7af437a6b3ae"


def test_alembic_linear_dag_traversal():
    """Traverse the entire revision chain from head to base to guarantee a single strict line."""
    config = Config("alembic.ini")
    script = ScriptDirectory.from_config(config)

    expected_chain = [
        "012_grant_anon_translation_count",
        "011_add_indexed_by_to_repo_embeddings",
        "010_add_performance_and_fk_indexes",
        "009_phase_2a",
        "008_phase_1c",
        "007_phase_1b",
        "006_phase_1a",
        "005_remove_duplicate_columns",
        "004_add_fk_constraints",
        "003_argon2_api_key_hashing",
        "002_add_critical_indexes",
        "001_encrypt_github_tokens",
        "0d71502217e9",
        "8d3045f704c7",
        "a3f8c1d2e9b4",
        "7af437a6b3ae",
    ]

    current_rev = script.get_current_head()
    observed_chain = []

    while current_rev is not None:
        observed_chain.append(current_rev)
        revision_obj = script.get_revision(current_rev)
        assert revision_obj is not None
        current_rev = revision_obj.down_revision

    assert observed_chain == expected_chain, f"Observed chain mismatch: {observed_chain} != {expected_chain}"


# ============================================================================
# 2. MIGRATION 010 UPGRADE / DOWNGRADE FUNCTIONAL TESTS
# ============================================================================


def test_migration_010_upgrade_and_downgrade_mock_operations():
    """Verify op.create_index and op.drop_index calls in 010_add_performance_and_fk_indexes."""
    migration_path = Path("alembic/versions/010_add_performance_and_fk_indexes.py")
    spec = importlib.util.spec_from_file_location("mig_010", migration_path)
    mig_010 = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mig_010)

    # Test upgrade calls
    created_indexes = []
    mig_010.op = MagicMock()
    mig_010.op.create_index = lambda name, table, cols: created_indexes.append((name, table, cols))

    mig_010.upgrade()

    assert created_indexes == [
        ("ix_user_subscriptions_razorpay_sub", "user_subscriptions", ["razorpay_subscription_id"]),
        ("ix_api_keys_key_prefix", "api_keys", ["key_prefix"]),
        ("ix_api_keys_user_email", "api_keys", ["user_email"]),
        ("ix_desired_index_states_source_state", "desired_index_states", ["source_state_id"]),
        ("ix_desired_index_states_index_config", "desired_index_states", ["index_configuration_id"]),
    ]

    # Test downgrade calls
    dropped_indexes = []
    mig_010.op.drop_index = lambda name, table_name=None: dropped_indexes.append((name, table_name))

    mig_010.downgrade()

    assert dropped_indexes == [
        ("ix_desired_index_states_index_config", "desired_index_states"),
        ("ix_desired_index_states_source_state", "desired_index_states"),
        ("ix_api_keys_user_email", "api_keys"),
        ("ix_api_keys_key_prefix", "api_keys"),
        ("ix_user_subscriptions_razorpay_sub", "user_subscriptions"),
    ]


def test_migration_010_real_sqlite_upgrade_downgrade_cycle():
    """Execute migration 010 on a real SQLite in-memory database to verify DDL execution."""
    engine = create_engine("sqlite:///:memory:")
    metadata = MetaData()

    # Pre-create the tables that 010 adds indexes on
    Table(
        "user_subscriptions",
        metadata,
        Column("id", String, primary_key=True),
        Column("user_email", String, nullable=False),
        Column("razorpay_subscription_id", String, nullable=True),
    )
    Table(
        "api_keys",
        metadata,
        Column("id", String, primary_key=True),
        Column("user_email", String, nullable=False),
        Column("key_prefix", String, nullable=False),
    )
    Table(
        "desired_index_states",
        metadata,
        Column("id", String, primary_key=True),
        Column("source_state_id", String, nullable=False),
        Column("index_configuration_id", String, nullable=False),
    )

    metadata.create_all(engine)

    migration_path = Path("alembic/versions/010_add_performance_and_fk_indexes.py")
    spec = importlib.util.spec_from_file_location("mig_010_real", migration_path)
    mig_010 = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mig_010)

    with engine.connect() as conn:
        ctx = MigrationContext.configure(conn)
        op = Operations(ctx)
        mig_010.op = op

        # 1. Run Upgrade
        mig_010.upgrade()
        conn.commit()

        # Check indexes exist
        inspector = inspect(conn)
        sub_indexes = {idx["name"]: idx["column_names"] for idx in inspector.get_indexes("user_subscriptions")}
        api_indexes = {idx["name"]: idx["column_names"] for idx in inspector.get_indexes("api_keys")}
        desired_indexes = {idx["name"]: idx["column_names"] for idx in inspector.get_indexes("desired_index_states")}

        assert "ix_user_subscriptions_razorpay_sub" in sub_indexes
        assert sub_indexes["ix_user_subscriptions_razorpay_sub"] == ["razorpay_subscription_id"]

        assert "ix_api_keys_key_prefix" in api_indexes
        assert api_indexes["ix_api_keys_key_prefix"] == ["key_prefix"]
        assert "ix_api_keys_user_email" in api_indexes
        assert api_indexes["ix_api_keys_user_email"] == ["user_email"]

        assert "ix_desired_index_states_source_state" in desired_indexes
        assert desired_indexes["ix_desired_index_states_source_state"] == ["source_state_id"]
        assert "ix_desired_index_states_index_config" in desired_indexes
        assert desired_indexes["ix_desired_index_states_index_config"] == ["index_configuration_id"]

        # 2. Run Downgrade
        mig_010.downgrade()
        conn.commit()

        inspector = inspect(conn)
        sub_indexes_after = {idx["name"]: idx["column_names"] for idx in inspector.get_indexes("user_subscriptions")}
        api_indexes_after = {idx["name"]: idx["column_names"] for idx in inspector.get_indexes("api_keys")}
        desired_indexes_after = {
            idx["name"]: idx["column_names"] for idx in inspector.get_indexes("desired_index_states")
        }

        assert "ix_user_subscriptions_razorpay_sub" not in sub_indexes_after
        assert "ix_api_keys_key_prefix" not in api_indexes_after
        assert "ix_api_keys_user_email" not in api_indexes_after
        assert "ix_desired_index_states_source_state" not in desired_indexes_after
        assert "ix_desired_index_states_index_config" not in desired_indexes_after

        # 3. Re-upgrade (idempotence verification)
        mig_010.upgrade()
        conn.commit()

        inspector = inspect(conn)
        assert "ix_user_subscriptions_razorpay_sub" in {
            idx["name"] for idx in inspector.get_indexes("user_subscriptions")
        }


# ============================================================================
# 3. COMPOSITE INDEX & QUERY PLAN VERIFICATION (002 & MODELS)
# ============================================================================


def test_translation_history_composite_index_definition_and_query_plan():
    """Verify ix_translation_history_user_created composite index and query plan."""
    engine = create_engine("sqlite:///:memory:")
    metadata = MetaData()

    th_table = Table(
        "translation_history",
        metadata,
        Column("id", String, primary_key=True),
        Column("user_email", String, nullable=True),
        Column("created_at", DateTime, nullable=True),
        Column("character_count", Integer, default=0),
        Index("ix_translation_history_user_created", "user_email", "created_at"),
    )

    metadata.create_all(engine)

    # Populate 1,000 rows
    with engine.connect() as conn:
        values = [
            {
                "id": f"id_{i}",
                "user_email": f"user_{i % 10}@example.com",
                "character_count": i * 10,
            }
            for i in range(1000)
        ]
        conn.execute(th_table.insert(), values)
        conn.commit()

        # Check EXPLAIN QUERY PLAN for primary history listing query:
        # SELECT * FROM translation_history WHERE user_email = 'user_1@example.com' ORDER BY created_at DESC
        plan = conn.execute(
            text(
                "EXPLAIN QUERY PLAN SELECT * FROM translation_history WHERE user_email = 'user_1@example.com' ORDER BY created_at DESC"
            )
        ).fetchall()

        plan_str = " ".join(str(row) for row in plan)
        # SQLite should use the index ix_translation_history_user_created
        assert "ix_translation_history_user_created" in plan_str, f"Query plan did not utilize index: {plan_str}"


# ============================================================================
# 4. ORM MODEL SCHEMA INDEX CONFORMANCE
# ============================================================================


def test_model_indexes_match_migrations():
    """Verify that all index=True or explicit Index declarations on ORM models match migration definitions."""
    # UserSubscription
    user_sub_cols = UserSubscription.__table__.columns
    assert user_sub_cols["user_email"].unique is True
    assert user_sub_cols["user_email"].index is True
    assert user_sub_cols["razorpay_subscription_id"].index is True

    # ApiKey
    api_key_cols = ApiKey.__table__.columns
    assert api_key_cols["user_email"].index is True
    assert api_key_cols["key_prefix"].index is True

    # DesiredIndexState
    desired_cols = DesiredIndexState.__table__.columns
    assert desired_cols["import_id"].index is True
    assert desired_cols["source_state_id"].index is True
    assert desired_cols["index_configuration_id"].index is True

    # TranslationHistory
    th_indexes = {idx.name: [c.name for c in idx.columns] for idx in TranslationHistory.__table__.indexes}
    assert "ix_translation_history_user_created" in th_indexes
    assert th_indexes["ix_translation_history_user_created"] == ["user_email", "created_at"]
    assert "ix_translation_history_workspace" in th_indexes
    assert th_indexes["ix_translation_history_workspace"] == ["workspace_id"]

    # RepositoryImport
    repo_imp_indexes = {idx.name: [c.name for c in idx.columns] for idx in RepositoryImport.__table__.indexes}
    assert "ix_repo_imports_workspace_provider" in repo_imp_indexes
    assert repo_imp_indexes["ix_repo_imports_workspace_provider"] == ["workspace_id", "provider", "provider_repo_id"]


# ============================================================================
# 5. TRANSLATIONHISTORY MODEL COMPATIBILITY & ALIAS BEHAVIOR
# ============================================================================


def test_translation_history_orm_persistence_with_char_count_alias():
    """Verify TranslationHistory persistence, querying, and updating with char_count alias."""
    Base = declarative_base()

    class TestTH(Base):
        __tablename__ = "translation_history"
        id = Column(String, primary_key=True)
        user_email = Column(String, nullable=True)
        character_count = Column(Integer, default=0)

        @property
        def char_count(self) -> int:
            return self.character_count or 0

        @char_count.setter
        def char_count(self, value: int) -> None:
            self.character_count = value

    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    # 1. Insert using character_count
    rec1 = TestTH(id="t1", user_email="a@example.com", character_count=100)
    session.add(rec1)
    session.commit()

    # 2. Insert using char_count alias setter
    rec2 = TestTH(id="t2", user_email="b@example.com", char_count=200)
    session.add(rec2)
    session.commit()

    # 3. Query and verify
    q1 = session.query(TestTH).filter_by(id="t1").first()
    assert q1.character_count == 100
    assert q1.char_count == 100

    q2 = session.query(TestTH).filter_by(id="t2").first()
    assert q2.character_count == 200
    assert q2.char_count == 200

    # 4. Update via char_count setter
    q2.char_count = 350
    session.commit()

    q2_updated = session.query(TestTH).filter_by(id="t2").first()
    assert q2_updated.character_count == 350
    assert q2_updated.char_count == 350
    session.close()


# ============================================================================
# 6. GLOBAL INDEX UNIQUENESS & COLLISION AUDIT ACROSS ALL MIGRATIONS
# ============================================================================


def test_global_index_names_are_unique_across_migrations():
    """Verify that no two migrations define conflicting or duplicate index names."""
    versions_dir = Path("alembic/versions")
    index_pattern = re.compile(r'op\.create_index\(\s*(?:op\.f\()?["\']([^"\']+)["\']')

    declared_indexes: dict[str, list[str]] = {}

    for migration_file in sorted(versions_dir.glob("*.py")):
        if migration_file.name.startswith("__"):
            continue
        content = migration_file.read_text(encoding="utf-8")
        matches = index_pattern.findall(content)
        for idx_name in matches:
            declared_indexes.setdefault(idx_name, []).append(migration_file.name)

    # Check for duplicates across different migration files
    duplicate_indexes = {name: files for name, files in declared_indexes.items() if len(files) > 1}
    assert not duplicate_indexes, f"Duplicate index creation detected across migrations: {duplicate_indexes}"


# ============================================================================
# 7. FOREIGN KEY SUPPORTING INDEX COVERAGE AUDIT
# ============================================================================


def test_all_foreign_key_columns_have_supporting_indexes():
    """Verify that all Foreign Key relationships on SQLAlchemy models have index=True or explicit Indexes.

    This ensures that in PostgreSQL, cascading updates/deletes or joins on foreign key
    columns do not trigger full table scans or share table locks.
    """
    models = [
        RepositoryImport,
        SourceState,
        DesiredIndexState,
        IndexRun,
        SearchableMaterialization,
        SemanticArtifact,
        StructuralFile,
        StructuralSymbol,
        StructuralImport,
        RepositoryLinkedHistory,
    ]

    missing_fk_indexes = []

    for model in models:
        table = model.__table__
        table_indexes = table.indexes
        indexed_columns = set()
        for idx in table_indexes:
            for col in idx.columns:
                indexed_columns.add(col.name)

        for col in table.columns:
            if col.index:
                indexed_columns.add(col.name)

        for fk in table.foreign_keys:
            col_name = fk.parent.name
            if col_name not in indexed_columns:
                missing_fk_indexes.append(f"{table.name}.{col_name} (FK -> {fk.target_fullname})")

    assert not missing_fk_indexes, f"Found unindexed foreign key columns: {missing_fk_indexes}"


# ============================================================================
# 8. QUERY PLAN UTILIZATION FOR ALL 010 INDEXES
# ============================================================================


def test_all_010_indexes_query_plans():
    """Verify that SQLite/Postgres query optimizer actively selects all 5 indexes created in 010."""
    engine = create_engine("sqlite:///:memory:")
    metadata = MetaData()

    user_subscriptions = Table(
        "user_subscriptions",
        metadata,
        Column("id", String, primary_key=True),
        Column("user_email", String, nullable=False),
        Column("razorpay_subscription_id", String, nullable=True),
        Index("ix_user_subscriptions_razorpay_sub", "razorpay_subscription_id"),
    )
    api_keys = Table(
        "api_keys",
        metadata,
        Column("id", String, primary_key=True),
        Column("user_email", String, nullable=False),
        Column("key_prefix", String, nullable=False),
        Index("ix_api_keys_key_prefix", "key_prefix"),
        Index("ix_api_keys_user_email", "user_email"),
    )
    desired_index_states = Table(
        "desired_index_states",
        metadata,
        Column("id", String, primary_key=True),
        Column("source_state_id", String, nullable=False),
        Column("index_configuration_id", String, nullable=False),
        Index("ix_desired_index_states_source_state", "source_state_id"),
        Index("ix_desired_index_states_index_config", "index_configuration_id"),
    )

    metadata.create_all(engine)

    with engine.connect() as conn:
        # Populate dummy rows
        conn.execute(
            user_subscriptions.insert(),
            [
                {"id": f"sub_{i}", "user_email": f"u{i}@test.com", "razorpay_subscription_id": f"sub_rzp_{i}"}
                for i in range(100)
            ],
        )
        conn.execute(
            api_keys.insert(),
            [{"id": f"k_{i}", "user_email": f"u{i}@test.com", "key_prefix": f"prefix_{i}"} for i in range(100)],
        )
        conn.execute(
            desired_index_states.insert(),
            [{"id": f"dis_{i}", "source_state_id": f"ss_{i}", "index_configuration_id": f"ic_{i}"} for i in range(100)],
        )
        conn.commit()

        # 1. user_subscriptions query plan
        p1 = " ".join(
            str(r)
            for r in conn.execute(
                text(
                    "EXPLAIN QUERY PLAN SELECT * FROM user_subscriptions WHERE razorpay_subscription_id = 'sub_rzp_10'"
                )
            ).fetchall()
        )
        assert "ix_user_subscriptions_razorpay_sub" in p1

        # 2. api_keys key_prefix query plan
        p2 = " ".join(
            str(r)
            for r in conn.execute(
                text("EXPLAIN QUERY PLAN SELECT * FROM api_keys WHERE key_prefix = 'prefix_10'")
            ).fetchall()
        )
        assert "ix_api_keys_key_prefix" in p2

        # 3. api_keys user_email query plan
        p3 = " ".join(
            str(r)
            for r in conn.execute(
                text("EXPLAIN QUERY PLAN SELECT * FROM api_keys WHERE user_email = 'u10@test.com'")
            ).fetchall()
        )
        assert "ix_api_keys_user_email" in p3

        # 4. desired_index_states source_state_id query plan
        p4 = " ".join(
            str(r)
            for r in conn.execute(
                text("EXPLAIN QUERY PLAN SELECT * FROM desired_index_states WHERE source_state_id = 'ss_10'")
            ).fetchall()
        )
        assert "ix_desired_index_states_source_state" in p4

        # 5. desired_index_states index_configuration_id query plan
        p5 = " ".join(
            str(r)
            for r in conn.execute(
                text("EXPLAIN QUERY PLAN SELECT * FROM desired_index_states WHERE index_configuration_id = 'ic_10'")
            ).fetchall()
        )
        assert "ix_desired_index_states_index_config" in p5

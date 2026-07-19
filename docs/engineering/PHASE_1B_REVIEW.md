# Phase 1B Engineering Review Artifact

## Scope

Phase 1B introduces the additive index-lifecycle schema only:

- `desired_index_states`
- `index_runs`

It does not introduce searchable materializations, structural persistence,
retrieval, APIs, or background-worker behavior. Those concerns remain outside
this phase.

## Delivered Artifacts

- Migration: `alembic/versions/007_phase_1b.py`
- SQLAlchemy models: `DesiredIndexState`, `IndexRun`
- Pydantic create/response schemas for both lifecycle entities
- Unit coverage: `tests/test_phase_1b_index_lifecycle.py`
- PostgreSQL migration coverage: `tests/test_migrations.py`
- CI migration job: `.github/workflows/ci.yml`
- Schema diagram: `PHASE_1B_SCHEMA_ERD.md`

## Contract Verification

`desired_index_states` contains the Phase 1B lifecycle identity:

- foreign keys to repository import, source state, and index configuration
- a unique, non-null `incarnation_id`
- an index on `import_id`

`index_runs` contains lifecycle execution state only:

- foreign key to `desired_index_states`
- non-null status
- optional error diagnostics and completion timestamp
- an index on `desired_state_id`

The upgrade creates only these two Phase 1B tables. The downgrade removes only
these two tables and preserves Phase 1A tables.

## Verification Status

- Static migration/model/schema review: passed.
- Diff whitespace validation: passed.
- Local pytest execution: not run because this environment does not provide a
  Python executable on `PATH`.
- CI coverage: a PostgreSQL + pgvector migration job now runs the Phase 1B
  upgrade/downgrade test and gates the Docker job.

## Review Decision

Phase 1B is complete and ready for engineering review. No Phase 1C work is
included in this artifact.

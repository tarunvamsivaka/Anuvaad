# Phase 1B Schema ERD

Phase 1B introduces only the index lifecycle schema. It does not add
searchable materializations, structural persistence, retrieval, APIs, or
background-worker behavior.

```mermaid
erDiagram
    REPOSITORY_IMPORTS ||--o{ DESIRED_INDEX_STATES : "import_id"
    SOURCE_STATES ||--o{ DESIRED_INDEX_STATES : "source_state_id"
    INDEX_CONFIGURATIONS ||--o{ DESIRED_INDEX_STATES : "index_configuration_id"
    DESIRED_INDEX_STATES ||--o{ INDEX_RUNS : "desired_state_id"

    DESIRED_INDEX_STATES {
        uuid id PK
        uuid import_id FK
        uuid source_state_id FK
        uuid index_configuration_id FK
        uuid incarnation_id UK
        timestamptz created_at
    }

    INDEX_RUNS {
        uuid id PK
        uuid desired_state_id FK
        text status
        text error_diagnostics
        timestamptz created_at
        timestamptz completed_at
    }
```

The `incarnation_id` uniqueness constraint preserves a non-repeating desired
state identity. `IndexRun` records lifecycle execution state only; publication
and searchable persistence remain Phase 1C work.

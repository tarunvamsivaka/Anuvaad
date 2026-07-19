# Phase 1C Schema ERD

Phase 1C adds only published-searchable persistence, lightweight structural
metadata, and repository-linked translation provenance. It does not add
extraction, embedding, retrieval, APIs, or background-worker behavior.

```mermaid
erDiagram
    REPOSITORY_IMPORTS ||--o{ SEARCHABLE_MATERIALIZATIONS : "import_id"
    INDEX_RUNS ||--|| SEARCHABLE_MATERIALIZATIONS : "index_run_id"
    SEARCHABLE_MATERIALIZATIONS ||--o{ STRUCTURAL_FILES : "materialization_id"
    STRUCTURAL_FILES ||--o{ STRUCTURAL_SYMBOLS : "structural_file_id"
    STRUCTURAL_FILES ||--o{ STRUCTURAL_IMPORTS : "source_file_id"
    STRUCTURAL_FILES o|--o{ STRUCTURAL_IMPORTS : "resolved_target_file_id"
    WORKSPACES ||--o{ REPOSITORY_LINKED_HISTORY : "workspace_id"
    REPOSITORY_IMPORTS ||--o{ REPOSITORY_LINKED_HISTORY : "import_id"
    SOURCE_STATES ||--o{ REPOSITORY_LINKED_HISTORY : "source_state_id"
    TRANSLATION_HISTORY ||--o| REPOSITORY_LINKED_HISTORY : "translation_history_id"
```

`uq_searchable_materializations_current_import` is a partial unique index that
permits historic materializations while allowing at most one current searchable
materialization per repository import. Declared imports are deliberately kept
separate from their optional resolved file target; no symbol-reference or
call-graph persistence is introduced.

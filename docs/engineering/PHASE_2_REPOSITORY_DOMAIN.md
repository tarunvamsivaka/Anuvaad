# Phase 2 Repository Domain

`RepositoryDomainRepository` is the internal CRUD boundary for the Phase 1A--1C
repository tables. It receives an `AsyncSession`; transaction ownership remains
with the repository method for single-record operations.

Every operation that reads or writes an import-derived record requires a
`workspace_id` and verifies ownership by joining through `repository_imports`.
Operations return `None` or an empty list when the requested row is absent or
outside that workspace. This prevents cross-workspace existence disclosure.

The records represented here are immutable identities or lifecycle artifacts.
There are consequently no generic update methods. Phase 3 remains responsible
for execution and conditional publication; this repository only persists rows.

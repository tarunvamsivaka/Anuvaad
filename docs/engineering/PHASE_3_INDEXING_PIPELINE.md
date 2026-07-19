# Phase 3 Indexing Pipeline

The Phase 3 worker accepts a workspace ID, repository import ID, and desired
index state ID. It proves the complete ownership chain before source fetching:

`Workspace -> RepositoryImport -> SearchableMaterialization -> SemanticArtifact`

Admission rejects unsupported providers, invalid configurations, oversized
repositories, and oversized files before embedding generation. GitHub source
acquisition is pinned to the requested source-state revision and verifies the
optional deterministic snapshot hash.

The worker creates an `IndexRun` (`pending`, `running`, then `complete` or
`failed`). A successful run stages a non-current materialization, structural
files/symbols/declared imports, and 1536-dimensional semantic artifacts. Only
after all writes flush does it atomically retire the previous current
materialization and publish the new one. Failed or rejected runs never become
searchable. Re-running a desired state with an existing current publication is
idempotent and performs no fetch or embedding work.

Structural extraction intentionally records declarations and declared imports
only. Symbol references, call graphs, and retrieval are deferred to later
approved phases.

# Database migration policy

**Status:** forward process adopted locally; historical reconciliation remains open

**Updated:** 2026-10-04

## Source of truth

Use Alembic (`alembic/versions/`) as the versioned source of truth for application-owned PostgreSQL schema changes: tables, columns, indexes, constraints, RLS policies, SQL functions, grants, and triggers. Keep migrations additive and reviewed, and include downgrade behavior where it is safe. Do not apply application DDL as one-off SQL in the Supabase dashboard.

Use Supabase project settings for Supabase Auth and platform configuration that is not application schema (for example, password protection and redirect settings). Record operational changes and their verification in the audit/change log. Do not treat Supabase's internal migration ledger as a replacement for the application migration source.

## Current production evidence

- Production `public.alembic_version` reports `014_fix_supabase_security_and_indexes`. The local checkout adds revision `015_revoke_public_table_grants`; it has not been applied to production.
- The Supabase project separately reports ten entries in `supabase_migrations.schema_migrations`, including several security/performance changes and one dated September 30, 2026. The migration source SQL for those entries is not present in this repository, so the exact object-level overlap with Alembic cannot be established from the ledger alone.
- The CI migration job exercises the additive `006_phase_1a` → `007_phase_1b` upgrade/downgrade, then has a full-chain upgrade smoke test from `006_phase_1a` to `015_revoke_public_table_grants`, including client-role privilege assertions. This check is present in the checkout and still needs a successful CI run; it does not test downgrading the entire chain.

These facts show that both ledgers exist; they do not prove that their recorded changes are identical or that the current live schema has no drift.

## Required workflow

1. Before creating a schema change, confirm the current production Alembic revision and inspect the relevant live schema and policies using read-only queries.
2. Create the migration in the repository, review both `upgrade()` and `downgrade()`, and ensure the migration is safe for current production data. Never add source code or secrets to migration logs.
3. Run the migration suite against an isolated PostgreSQL + pgvector database in CI. Require the full-chain upgrade smoke test to pass. Add a full-chain downgrade/re-upgrade path only after each migration's destructive downgrade behavior has been reviewed.
4. Apply approved application DDL to Supabase through the controlled release procedure, then verify the Alembic revision and affected schema objects. Do not deploy dependent application code before the migration succeeds.
5. Keep the Supabase migration ledger for historical evidence. Do not reapply or mark old migrations as new merely to make the two ledgers appear aligned.

## Historical cleanup needed

Recover the SQL or dashboard history for the ten already-applied Supabase migrations, compare affected objects to Alembic revisions (especially the September 30 security/performance change and Alembic revision 014), and store a reviewed mapping in this repository. Do not rewrite either live migration ledger. Until that mapping is complete, avoid schema changes to objects whose ownership or current definition is uncertain.

## Live schema drift recorded 2026-10-04

The live `public.user_translation_stats` relation is a `security_invoker` view over `translation_history`, while the checked-in baseline declares it as a table. Celery's daily and weekly resets now detect the relation kind and avoid issuing an invalid update when it is a view. Reconcile the Supabase migration source that introduced the view and decide whether the canonical Alembic schema should also use it before rebuilding production databases from scratch.

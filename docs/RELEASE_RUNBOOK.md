# Release and incident runbook

**Status:** operator procedure documented; no release has been rehearsed against production.  
**Expected topology recorded by the project inventory:** Vercel frontend plus Render FastAPI API. `render.yaml` provisions only the API; it does not provision frontend, database, or cache. Confirm the actual target project, branch, and service settings before each release; this document does not assert that the current deployment is healthy.

## Before release

1. Review the code diff, dependency lockfiles, security findings, and current [implementation gates](IMPLEMENTATION_PLAN_2026-10-04.md). Do not enable GitHub writes, SSO, or checkout while their feature gates remain closed.
2. Run the verification commands in the repository README and the CI workflows. Require backend tests/lint and the PostgreSQL migration job to pass; local frontend success alone is not a release gate.
3. Review pending Alembic migrations for expand/contract compatibility and downgrade safety. Follow [the database migration policy](DATABASE_MIGRATION_POLICY.md); reconcile the live revision and historical Supabase migration evidence before applying DDL.
4. Confirm the operator can restore a recent database backup and record the chosen restore point. Never put credentials, SQL dumps, or source code into release logs.
5. Verify required environment-variable presence in the deployment secret store without printing values. Check frontend/API origin, OAuth callback URLs, webhook signature secret (if webhooks are enabled), provider availability, rate limits, and billing feature flags.
6. Confirm privacy notice, support contact, quota/error copy, and rollback owner are current. If provider retention or hosting diagnostics are unverified, do not claim end-to-end zero retention.

## Release sequence

1. Schedule a controlled maintenance window if the migration or rollback plan requires one.
2. Take and verify a database backup using the hosting provider's approved controls.
3. Apply the reviewed migration from a controlled operator environment with the production `DATABASE_URL` supplied through its secret store:

   ```powershell
   alembic upgrade head
   alembic current
   ```

4. Deploy the API and frontend from the reviewed commit. The Render Blueprint does not run pre-deploy migrations; do not rely on application startup to alter the schema.
5. Smoke-test health, sign-in, an ephemeral translation, an opted-in history save/delete, share expiry/revocation, and quota/error behavior. Use synthetic non-sensitive input. Confirm logs and analytics contain no source text.
6. Record commit, migration revision, operator, start/end times, smoke-test results, and any issue in the release record. Do not record tokens, prompts, generated code, or provider payloads.

## Rollback

1. Stop rollout and identify whether the failure is application-only or schema-related.
2. For an application-only issue, redeploy the last known-good compatible commit and repeat smoke tests.
3. Do not automatically run `alembic downgrade head`. Downgrade only after reviewing the exact migration's data-loss behavior and confirming compatibility with the prior application version. Prefer a forward fix for additive migrations.
4. If data integrity is at risk, use the verified backup restore procedure and coordinate a maintenance window. Capture only operational metadata in incident notes.
5. Revoke exposed credentials through their provider consoles, rotate dependent secrets, and invalidate affected sessions if needed. Do not paste secrets into tickets or logs.

## Incident response

- Disable the affected feature flag or integration first when that safely limits impact.
- Preserve request IDs, timestamps, route names, deployment revision, and exception classes; exclude request bodies and generated output.
- For suspected account compromise, disable the affected auth integration, revoke sessions/tokens, and investigate authorization events.
- For provider outage or unexpected spend, disable provider routing or lower quotas; never silently serve saved outputs to an ephemeral request.
- Document impact, containment, recovery, and a follow-up owner. Notify affected users and authorities only under the applicable approved response policy.

## Accessibility and release QA

Before public release, complete keyboard-only, screen-reader, contrast, narrow mobile viewport, and slow-network checks on supported real browsers/devices. Track failures with reproducible steps and block release on inaccessible primary translation, error recovery, consent, history deletion, or sharing controls. The current automated frontend checks do not replace this manual gate.

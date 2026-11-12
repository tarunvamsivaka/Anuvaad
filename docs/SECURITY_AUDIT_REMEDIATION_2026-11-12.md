# Security audit and remediation record

**Review date:** 2026-11-12
**Scope:** local repository source and deployment configuration only. No production service, account, database, secret store, or user data was accessed.
**Risk scale:** Critical = unauthenticated compromise or systemic exposure; High = material privacy/security impact; Medium = bounded integrity/availability impact; Low = defense-in-depth/documentation.

## Executive summary

The audit found three actionable issues in the checked-out code: error telemetry and logs could retain user content, oversized multipart uploads could be spooled to temporary disk before the endpoint size check, and failed repository embeddings could be represented as synthetic zero vectors. Source fixes are implemented. Telemetry redaction has focused passing tests; lint and format checks pass. The upload middleware has targeted regression tests in the repository, but local execution stalled during test collection, so its runtime behavior still needs CI confirmation. The complete backend suite and Python dependency advisory scan were not verified in this environment. Production readiness is therefore **not certified** by this audit.

## Assets and entry points reviewed

- Next.js frontend routes and BFF GitHub OAuth start/callback handlers.
- FastAPI translation, upload, repository-search, history, GitHub webhook, and billing router registration.
- Background repository indexing and PR review tasks.
- Sentry and application logging; Hugging Face/OpenAI embedding calls.
- Nginx upload limit, Render API configuration, Docker/Compose deployment declarations, and security headers.

This was a focused static review of the named paths and security-sensitive pattern searches, not a line-by-line assessment of every tracked file or a live penetration test.

## Findings and remediation status

| ID | Risk | Evidence and impact | Remediation / component | Effort | Status and validation |
| --- | --- | --- | --- | --- | --- |
| SEC-01 | High | The global exception handler logged exception text and sent raw exception events to Sentry. Error strings may contain request content, provider payloads, query values, or identifiers. Sentry scrubbing previously covered request body and select headers only. | `app/main.py`: send only exception class to application logs; remove user, extra data, breadcrumbs, request query strings, exception messages, and local frame variables from Sentry events; disable default PII; apply scrubber to transactions. Focused telemetry tests assert source text and authorization values are absent. | Small | Implemented. `tests/test_security_zdr_telemetry.py`: 2 passed. Ruff lint and formatting pass. |
| SEC-02 | High | FastAPI `UploadFile` uses Starlette's spooled temporary files. Endpoint limits were checked only after multipart parsing. Nginx allowed 25 MB requests; an oversized code file could cross Starlette's 1 MiB spool threshold and reach disk before being rejected. | `app/api/middleware/upload_limit.py`: reject requests to both upload aliases above 256 KiB using Content-Length and streaming byte counting before downstream multipart parsing. The bound includes framing and remains below the parser's 1 MiB rollover threshold. Registered in `app/api/middleware/__init__.py`. | Small | Implemented; targeted tests in `tests/test_upload_body_limit.py` cover declared-length and chunked oversized requests. Local pytest stalled during collection/execution, so CI confirmation is required. |
| SEC-03 | Medium | Hugging Face embedding errors returned all-zero vectors, and repository indexing inserted fallback zero vectors for missing embeddings. Search could treat invalid data as valid and return misleading results. | `app/services/embedding.py` returns no vectors on failure and omits empty malformed entries; `app/queue/tasks.py` skips batches with no valid embeddings rather than persisting synthetic vectors. | Small | Implemented. Ruff lint and format pass. Dedicated runtime regression test was removed after the async client test harness hung; CI should add/confirm coverage. |
| SEC-04 | Medium | Lead intake trusted the leftmost client-controlled `X-Forwarded-For` value, accepted unbounded chunked JSON bodies, and retained unbounded attacker-selected rate-limit keys in process memory. | `frontend/src/app/api/leads/route.ts` prefers the edge address, uses the nearest forwarded hop as fallback, caps streaming JSON at 2 KiB, validates payload shape/source, and prunes/bounds rate-limit state. | Small | Implemented. Frontend typecheck/build and Vitest pass; add focused route tests for chunked oversize and rate-limit behavior. |
| SEC-05 | High | Account deletion could continue after swallowed local cleanup errors and could return success when Supabase admin configuration was absent or the user lookup failed. | `app/routers/history.py` now fails closed on missing admin settings/failed lookup and makes repository cleanup failures propagate via opt-in `raise_on_error` flags. | Small | Implemented. Ruff and compile checks pass; no dedicated account deletion integration test ran in this environment. |

## Existing high-risk paths spot-checked

These are present in the working tree and were not reimplemented in this pass:

- GitHub webhooks reject missing/invalid HMAC signatures in `app/routers/github.py`.
- GitHub pull-request write/approval endpoints return HTTP 501 rather than pretending to mutate PRs.
- The frontend GitHub OAuth callback requires the short-lived state cookie and uses constant-time comparison.
- The SAML router is not mounted in `app/main.py`.
- Metrics authentication fails closed when credentials are absent; production database startup checks migration heads; billing registration is feature-gated in the current working tree.

These checks confirm source behavior only; they do not verify deployed settings, secret rotation, or actual provider/webhook configuration.

## Verification evidence and limitations

- `ruff check` on 14 changed source/test files: passed.
- `ruff format --check` on the same files: passed.
- `git diff --check`: passed (only line-ending conversion warnings on pre-existing dirty files).
- `tests/test_security_zdr_telemetry.py`: 2 passed.
- Frontend `npm run typecheck`: passed; `npm run build`: passed (two circular chunk dependency warnings); `npx vitest run`: 593 passed, 2 skipped.
- `ruff check`, `ruff format --check`, Python `compileall`, and `git diff --check`: passed for reviewed changes.
- `npm audit --offline --audit-level=high` in `frontend/`: 0 vulnerabilities reported.
- Python tests: the full test runner previously failed during plugin import because application control blocked the installed `jsonschema_rs` native extension. Later focused asynchronous test runs stalled in this environment; upload middleware tests are not claimed as passing.
- `pip-audit`: unable to query PyPI because DNS/network access is unavailable; the attempted temporary pip upgrade was also denied. Python dependency risk remains unknown.
- No live endpoint, production deployment, webhook, database, or external account was exercised.
- Existing translation history rows are not backfilled by migration 017 and may remain in the legacy plaintext `blocks` column. New writes are encrypted. `scripts/backfill_encrypted_history.py` now provides a key-backed, batched, restartable migration that atomically writes ciphertext and clears each plaintext payload; execute it in production after revision 017 and retain aggregate migration evidence. `history_key_version` is currently set to `1`; key rotation/version semantics still need an explicit migration policy.

## Prioritized follow-up plan

1. **P1 — Run CI on SEC-02/03 tests and the complete backend suite.** If these tests fail, fix the middleware/test harness before release. Confirm request parsing never creates a disk-backed temporary file for a rejected upload.
2. **P1 — Run `pip-audit` against a fully resolved/pinned backend dependency set in network-enabled CI.** Review and patch any advisories; the current requirements include ranges and are not a reproducible lockfile.
3. **P1 — Validate all remaining error logs and external telemetry exporters against the no-source-content policy.** The audit sanitized confirmed high-risk paths; a repository-wide log-field allowlist and review of OpenTelemetry export configuration remain advisable.
4. **P2 — Add a stable embedding regression test with an HTTP mock transport and verify failed batches leave the database unchanged.**
5. **P2 — Confirm deployment controls independently:** frontend/API origins, secret rotation, TLS, database migration head, webhook secret presence, retention settings, and Nginx/body limits.

## Rollback notes

- **SEC-01:** Revert only the Sentry scrubber/logging changes if event diagnostics become unusable, but first replace them with an explicit allowlist of safe fields. Do not restore raw request content, exception messages, user identity, or frame locals.
- **SEC-02:** Revert the upload middleware only if accepted upload workflows are blocked. The safe fallback is to lower the edge request-body limit and keep multipart requests below the parser spool threshold; do not restore the 25 MB upload path without an in-memory parser guarantee.
- **SEC-03:** Revert only if downstream indexing requires a shape-preserving failure result. In that case represent unavailable vectors explicitly and never persist them as zero vectors.

## Patch state

The implementation and new tests are in the current working tree. They are not committed in this pass because the repository already had extensive unrelated edits in the same application files; staging whole files would capture unrelated user changes. Review the focused source/test diff and commit it in a clean isolated change after reconciling that existing work.

# Anuvaad Operating Rules

This document is the operating baseline for product, engineering, support, and release work. It complements the repository's `AGENTS.md`; technical security and architecture requirements in `AGENTS.md` remain mandatory.

## Product focus

Serve anyone who needs to understand code: students, developers entering an unfamiliar codebase, and independent builders working with generated projects. The primary task is **Explain code**. Translation and generation remain available when they help that task.

Do not advertise a capability until the user can complete it in the current product and its limits are visible in the interface.

## Delivery rules

1. Prefer a small, reversible improvement that removes a proven user or operational problem.
2. Do not begin a new surface area while a primary workflow, privacy promise, or release gate is unverified.
3. Use one source of truth for each decision. This file governs operating rules; `CONSUMER_PRODUCT_DEVELOPMENT_STRATEGY.md` governs product direction; `RELEASE_RUNBOOK.md` governs releases.
4. Keep source code out of logs, analytics, tickets, URLs, and persistent storage unless the user has made the required explicit choice.
5. Treat parser success as a syntax signal only. It does not prove behavior, safety, or semantic equivalence.
6. Make external processing and history choices understandable at the point where a user submits code.
7. Make failures actionable and provider-safe. Preserve user input locally where possible and require an explicit retry for an operation that can consume quota.

## Zero-budget discipline

1. Use existing dependencies, provider free tiers, and built-in platform capabilities before adding a service.
2. Add a dependency, provider, scheduled task, or background worker only when it has a named user outcome, owner, removal condition, and measured cost or quota impact.
3. Bound input size, output size, retries, concurrency, caching, and retention before increasing traffic or feature scope.
4. Do not use synthetic keep-alives or hidden workarounds to defeat platform limits.
5. Keep billing disabled until pricing, support, refund, and tax decisions are approved and tested.

## Execution discipline

1. Start each task with the smallest relevant inspection; do not run broad or duplicate checks without a release or regression reason.
2. Reuse existing tests and scripts. Add a regression test for a behavior change that can fail silently or affect privacy, quotas, or user data.
3. Verify only the changed area during iteration, then run the documented release checks before a release.
4. Record blockers with the exact missing dependency, service setting, or decision. Do not represent blocked verification as complete.
5. Preserve unrelated work in a dirty working tree. Keep changes reviewable and do not overwrite user work.

## User service

- Guests get a useful first attempt with clear processing consent and limits.
- Accounts are needed for durable benefits such as history, cross-device continuity, and managed access.
- History and sharing require informed, separate choices.
- Support reports should collect reproducible metadata without source code by default.

## Release gate

Before a public release, require the checks in the README and `RELEASE_RUNBOOK.md`, reviewed migration safety, synthetic smoke tests, current privacy/support copy, and a known rollback path. A passing frontend build alone is insufficient.

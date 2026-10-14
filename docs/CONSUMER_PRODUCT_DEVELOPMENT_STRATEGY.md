# Anuvaad Consumer Product Development Strategy

**Planning horizon:** 12 months from the first focused consumer release  
**Audience:** Individual developers, learners, and independent builders

## Current phase gate status — 2026-10-04

| Phase | Repository work | Evidence / gate still required |
|---|---|---|
| 0 — Trust and readiness | Local privacy, quota, validation, migration-policy, claim, and least-privilege grant changes are prepared in the checkout. Supabase's live RLS and policy filters were inspected read-only. | Apply/review the new grant migration through the release procedure; reconcile migration history; enable leaked-password protection; complete the secret scan; verify service retention/settings; validate language-pair quality. |
| 1 — Focused individual MVP | First-use examples, parser status, validation explanation, consent-based history, result feedback, and delete-all history are implemented locally. Frontend tests, lint, type-check, and production build pass. | Moderated sessions with 8–12 recruited users must establish the 70% unassisted completion gate. |
| 2 — Reliability and repeat use | Existing diff/edit flows plus cache revalidation, consent-gated result/validation/action events, history deletion, public-share preview/revocation, per-process p95 instrumentation, bounded user-triggered retry, and provider-safe error messages are present locally. The local verification script passes all frontend and backend code checks. | PostgreSQL migration execution, automatic history-retention policy, external monitoring, numeric SLOs, real-device accessibility checks, and a four-week cohort with cost/quality evidence remain open. |
| 3 — Sustainable consumer business | Billing remains paused; a pricing research gate is documented. | Willingness-to-pay evidence, approved pricing/support/refund/tax decisions, and two real billing cycles are required before claiming sustainability. |
| 4 — Optional expansion | No new surface is being scheduled without the documented expansion evidence. | Requires repeat consumer value, quality results, and a named owner/cost assessment. |

## Verification update — 2026-10-04

The earlier Phase 0 execution note below is superseded for test status by the latest run: local verification reports 555 backend tests passed and 8 skipped, 208 frontend tests passed and 2 skipped, plus passing Ruff lint/format, ESLint, TypeScript, and the Next.js production build. Nine stale or incorrect backend test expectations discovered in the first run were corrected. PostgreSQL migrations could not be exercised locally because no database server/client or running Docker daemon is available; the dedicated CI migration job remains necessary. No production deployment, provider settings, schema, or billing configuration was changed in this follow-up.

Phase 1 also now uses a JSON client for the English-to-code endpoint, which returns JSON rather than server-sent events.

**Reliability and sharing follow-up — 2026-10-04:** Translation POST requests no longer retry indefinitely after a transport or server failure; users can explicitly retry from the output panel, avoiding silent duplicate work. HTTP and provider failures use actionable, provider-safe copy while preserving the current input. Quota responses continue through the existing quota flow. Sharing from the translation workspace and History now requires an explicit preview/confirmation, supports 1, 7, or 30 day expiry (or no expiry), and can be revoked from History. Expired public links are rejected by the API. The expiry migration is local and still needs deployment; no production schema or service settings have been changed.

## Product direction

Make Anuvaad the quickest trustworthy way for one person to understand unfamiliar code, make a small safe translation, and decide what to do next. Start with individual users who already encounter code but lack time, context, or confidence. Do not lead with enterprise modernization, broad PR automation, or a promise that every language is equally supported.

### Core user promise

“Paste a code snippet, choose Explain or Translate, and get a result you can inspect beside the original—with clear limits on syntax checks, privacy, and model use.”

The product should help users answer three questions:

1. What does this code do?
2. How would this small piece look in another language?
3. What should I verify before I use the result?

## Priority users and jobs

| Early user | Job to be done | Initial success signal |
|---|---|---|
| Individual developer joining an unfamiliar codebase | Understand one function or file without losing the source context | Copies or saves an explanation and returns to translate/ask a follow-up |
| Student or self-taught learner | Understand a programming concept through a concrete example | Completes a first explanation and rates it useful |
| Independent builder working across stacks | Convert a small, bounded snippet and compare both versions | Accepts the result after review or reports a useful correction |

Recruit these groups through interviews and a small opt-in cohort. Do not infer demand from page views or launch-day votes alone.

## Product principles

- **Useful before signup:** let a visitor try one curated example, then make the next step obvious. Ask for account creation only for history, higher limits, or cross-device use.
- **One clear workspace:** source and result side by side, plain-language modes, language selection, copy, retry, and a short explanation of what was checked.
- **Honest verification:** distinguish parser syntax checks from compilation, tests, semantic equivalence, and human review. Show unsupported parser coverage explicitly.
- **Privacy users can understand:** distinguish ephemeral requests, saved history, public sharing, server-side validation, provider processing, and browser sandbox behavior at the point of use.
- **Progressive capability:** ship a small set of well-validated language pairs before marketing a large count.
- **Low-cost by design:** use bounded free usage, request-size limits, caching only where the retention model permits it, and provider routing with cost/latency/error telemetry. Keep an emergency spend ceiling and stop conditions.

## Roadmap

### Phase 0 — Trust and product readiness (weeks 1–3)

**Execution update — 2026-10-04:** The checkout now keeps syntax validation in memory and fails closed when a parser is unavailable; the translation toolbar queries actual parser availability for the selected language and distinguishes parser availability from syntax-check availability. The output panel explains that syntax checks do not establish runtime or behavioral correctness. The English-to-code workspace client now consumes that endpoint's JSON response instead of treating it as an SSE stream. A one-click useful/incorrect/unsupported feedback control tracks only mode, language, model, and rating through the existing analytics-consent gate; no code or free-text context is collected. Signed-in users can delete all saved history from the History page after confirmation; individual deletion remains available. Workspace history/cache writes now default off and require a signed-in user to explicitly opt in; guest requests use the ephemeral application-history/cache mode. English-to-code cache hits are now syntax-checked before return, and invalid cached output is evicted. Authenticated metrics now include a per-process rolling p95 for the latest 100 requests; numeric service objectives and external monitoring remain to be set. Frontend verification passes: 205 Vitest tests passed, 2 skipped; ESLint reports no warnings or errors; and Next.js production build/type-check passed. All 18 modified Python files parse, but backend pytest could not start because PyPI access is blocked and no pytest is installed in the available runtimes. A PostgreSQL CI smoke test for the complete Alembic upgrade chain is now present in the checkout but has not run yet. Provider/hosting retention still needs confirmation. Public privacy copy describes saved history, explicit shares, AI-provider processing, and the limits of the API ephemeral header. Frontend quota copy reads configured limits from the API policy used for enforcement. Unqualified language-count, latency, accuracy, and ZDR claims were removed from metadata and onboarding/changelog descriptions. Checkout is described as paused. The Render Blueprint now targets the observed free plan and entry point. A migration policy assigns future application DDL to Alembic and CI checks for a single migration head. Phase 0 is still open: reconcile the ten historical Supabase migrations against Alembic, verify service log/provider retention, enable Supabase leaked-password protection, complete a successful secret scan, verify live deployment settings, run backend tests, and select a quality-backed language matrix.

- Close the compiler temporary-file/ZDR mismatch or withdraw the RAM-only claim until proven.
- Define ephemeral/history/share behavior, default retention, deletion and share expiry; align UI, privacy policy, and backend implementation.
- Reconcile free quotas and prices across frontend, API, and deployment configuration.
- Enable Supabase leaked-password protection; complete the repository secret scan; verify environment-variable presence without exposing values.
- Reconcile Render Blueprint/runtime settings and name a single migration owner for Supabase schema changes.
- Select a small supported matrix (for example Python, TypeScript/JavaScript, Go, and Rust) based on end-to-end output quality, not grammar installation alone.
- Replace unsupported “under 2 seconds,” “production-grade,” “zero code storage,” and equivalent broad claims unless current evidence and behavior support them.

**Exit criteria:** every public capability and privacy statement maps to a verifiable behavior; critical auth, syntax-validation, persistence, and deployment paths have owner-approved acceptance checks.

### Phase 1 — Focused individual MVP (weeks 4–8)

- Make Explain and Translate the primary entry points. Put the interactive workbench above enterprise/PR material.
- Add first-use guidance, input examples, empty/loading/error states, keyboard-friendly source/result navigation, and mobile layouts.
- Explain exactly what AST validation does and add a visible “syntax check unavailable” state for unsupported languages.
- Keep signup optional for the first try; offer history only after clear consent and sign-in.
- Add lightweight feedback on each result: useful, incorrect, or unsupported, with optional sanitized context. Never send code in analytics events.
- Run moderated sessions with 8–12 users across the priority groups and fix repeated onboarding/quality failures.

**Exit criteria:** at least 70% of recruited users can complete the core task without help; the team has a labeled sample of accepted, rejected, and unsupported outputs to guide quality work.

### Phase 2 — Reliability and repeat use (months 3–4)

- Improve syntax and semantic checks for the selected language pairs; add clear diagnostics, source/output diff, and reversible edit history.
- Add account-backed private history with retention controls and a one-step delete-all option. Keep public sharing an explicit separate action with preview and expiry controls.
- Add rate-limit feedback and predictable retries; expose provider outages without leaking provider internals.
- Instrument an event funnel using internal user IDs only after analytics consent: first input, first result, validation state, copy/export, return session, and feedback.
- Establish service objectives for request success, p95 latency, validation failure rate, and privacy incidents. Do not optimize to a sub-two-second promise until measurements support it.

**Exit criteria:** four-week retained usage demonstrates recurring individual value; quality and provider cost stay within declared guardrails.

### Phase 3 — Sustainable consumer business (months 5–8)

- Test a simple Free / Pro offer with transparent daily limits and a small paid plan. Only charge after validating willingness to pay with actual users.
- Make Pro benefits concrete: higher fair-use limits, larger inputs, saved private history, exports, and faster support. Avoid selling “unlimited” model usage.
- Add privacy-respecting referral/share flows and optional public examples that use synthetic or explicitly consented content.
- Offer a BYO-key or local-model option only if setup/support burden is measured and the privacy contract is clear.
- Publish a short quality page describing evaluated languages, dataset approach, known failure classes, and method—no unsubstantiated accuracy percentages.

**Exit criteria:** paid conversion and gross margin are positive for at least two billing cycles; refunds and quality complaints are understood.

### Phase 4 — Optional expansion (months 9–12)

- Add new language pairs only when user demand, parser coverage, and measured correctness justify the maintenance cost.
- Explore VS Code/CLI as retention surfaces after web activation and trust are stable.
- Reassess whether GitHub repository indexing or PR review belongs in a separate developer/teams product. Keep it out of the consumer onboarding path unless interviews show it is a core job.
- Consider mobile companion features only after research identifies a mobile-specific code-understanding job.

## Metrics and guardrails

### North-star candidate

**Weekly users who complete a code task and mark the result useful**, with separate counts for Explain and Translate. This measures user value rather than generation volume.

### Supporting metrics

- Activation: share of first-time visitors who receive a first usable result.
- Time to first value: median elapsed time from opening the workbench to viewing a result.
- Quality: user-reported useful/incorrect rate, AST parse-failure rate, and sampled expert review for supported language pairs.
- Retention: week-one and week-four return rate for activated users.
- Trust: privacy-setting comprehension, share confirmation abandonment, and privacy-related support reports.
- Business: free-to-paid conversion, paid retention, refund rate, and contribution margin per active user.
- Operations: API success, p95 latency, provider fallback frequency, rate-limit rejection, memory, database connections, and estimated inference cost.

### Guardrails

- Never treat a successful parser run as proof of semantic correctness.
- Do not store snippets in analytics, application logs, traces, URLs, or error reports.
- Do not make a public share by default; show exactly what becomes public before creating a share link.
- Alert on cost and provider concentration; cap daily spend and throttle before the $0 operating assumption is exceeded.
- Do not launch a new language as “supported” until representative syntax, edge cases, and failure behavior are reviewed.

## Operating plan

1. **Product owner:** run discovery, maintain a single prioritized problem backlog, and approve consumer-facing claims.
2. **Engineering owner:** own request lifecycle, AST validation, privacy retention, migrations, and rollback readiness.
3. **Design/research owner:** test first-use comprehension, accessible keyboard flow, and privacy comprehension with target users.
4. **Release cadence:** weekly small releases behind reversible flags; production schema changes use one documented migration path and an explicit rollback plan.
5. **Decision review:** every two weeks, review usefulness, repeat use, quality failures, privacy incidents, and per-user cost. Stop or narrow work when quality or margin guardrails fail.

The session script, consent constraints, blank scorecard, language-pair review rubric, and phase gates are in [Consumer Product Validation Plan](CONSUMER_VALIDATION_PLAN.md). Completing the protocol still requires recruiting participants and recording actual observations.

## Decisions to make before launch

- What does “ephemeral” mean in each request path, and how long do caches, histories, shares, and backups retain data?
- Will normal history store generated code, source code, or metadata only? What does the user explicitly opt into?
- Which three to five language pairs are truly supported at launch?
- What daily request limit and price can be honored with real provider quotas and an explicit cost cap?
- Is Anuvaad primarily a code explainer for individuals, a translator, or both? Choose the entry job based on interviews and retention, not the current feature count.

**Additional CI follow-up — 2026-10-04:** GitHub's latest scheduled evaluation run failed during pytest collection because the harness-only job loaded the project-wide 	ests/conftest.py, which imports Razorpay. Evaluation tests are now isolated under scripts/eval_harness/tests/; their four test functions pass when run directly, and GitHub CI must rerun the workflow to confirm pytest collection is isolated. A full-history Gitleaks workflow is also present locally; the secret-scan gate remains open until GitHub executes it successfully and findings are resolved.

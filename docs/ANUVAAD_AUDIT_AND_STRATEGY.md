# Anuvaad: Repository Audit and Development Strategy

**Repo:** https://github.com/tarunvamsivaka/Anuvaad
**Audit date:** 2026-09-30
**Scope:** Backend (FastAPI), CI/CD, Dockerfiles, middleware, OAuth flow, dependency and docs hygiene.
**Verified by running:** backend test suite (551 passed, 6 skipped, ~10s on Python 3.12) and `ruff check` (clean).
**Not verified:** frontend build and tests, Playwright e2e, Docker image builds, `get_client_ip` proxy-header handling, Go/Rust branches of the sandbox runner.

---

## 1. What's good

- **Hygiene:** no TODO/FIXME markers, no stray `print` calls, no tracked `.db`, `.env` or scratch files, no hardcoded secrets found.
- **Architecture:** clear layering (routers, services, repositories, domain), plus 18 Alembic migrations.
- **CI:** Python 3.11/3.12/3.13 matrix with a real Redis service, `pip-audit`, CodeQL, and a Postgres/pgvector migration test.
- **Containers:** all three Dockerfiles run as non-root, use multi-stage builds, and define healthchecks.
- **Security basics:**
  - CORS uses explicit methods and headers.
  - CSRF-origin, security-header and rate-limit middlewares are in place.
  - Outbound HTTP uses `follow_redirects=False`.
  - GitHub OAuth tokens are Fernet-encrypted and never returned to the browser.
- **Differentiator:** Tree-sitter AST parsing plus compile checks. The Python check uses `compile()` only, so user code is never executed.

---

## 2. What to fix (priority order)

### 2.1 GitHub OAuth `state` is never validated (High)
`/github/login` generates a `state` value and returns it to the client, but `POST /oauth/github/callback` accepts only `code`, and the Next.js callback route does not forward `state`. An attacker can trick a logged-in victim into completing a flow that links the attacker's GitHub account to the victim's account.

**Fix:** store the state server-side (Redis with a short TTL, or a signed httpOnly cookie), and verify and consume it on callback. Add a regression test for a missing or mismatched state.

### 2.2 Rate limiter can be bypassed (High)
In `app/api/middleware/rate_limit.py`, any `Authorization: Bearer <anything>` is placed in its own 200/min bucket without the token being verified. An unauthenticated client can rotate random tokens and avoid the 50/min IP limit.

**Fix:** always count the IP bucket. Apply the per-token bucket only after the JWT has been verified.

### 2.3 Subprocesses not killed on timeout (Medium)
`asyncio.wait_for(proc.communicate(), timeout=...)` cancels the wait but leaves the child process running (confirmed in the Node path of `compiler_runner.py`).

**Fix:** catch `TimeoutError`, call `proc.kill()`, then `await proc.wait()`. Longer term, run `go vet` / Rust checks on user code in an isolated worker with no network and hard CPU and memory limits, not on the API host.

### 2.4 CSRF referer fallback uses `startswith` (Low to Medium)
In `app/api/middleware/csrf.py`, when no `Origin` header is present the check is `referer.startswith(origin)`, so `https://getanuvaad.vercel.app.evil.com` passes. Browsers send `Origin` on cross-origin POSTs, so practical risk is low, but the fix is cheap.

**Fix:** parse the URL and compare scheme, host and port exactly. Replace the `"/webhook" in path` exemption with an explicit route allowlist.

---

## 3. What to modify

| Area | Issue | Action |
|---|---|---|
| Dependencies | Only 6 of ~40 requirements are pinned; no lockfile; test tools installed ad hoc in CI | Add a lockfile (uv or pip-tools), split `requirements-dev.txt`, enable Dependabot or Renovate |
| Requirements | `setuptools` in runtime deps; both `psycopg2-binary` and `psycopg[binary]` | Remove `setuptools`; pick one Postgres driver |
| Celery | Tests are named for "Celery decommissioning", yet Celery remains in requirements, `queue/`, `tasks.py` and `translate/dependencies.py` | Remove it, or commit to it |
| Docs sprawl | ~283 KB of markdown in the repo root, including four overlapping audit/analysis reports (one is 71 KB), `ORIGINAL_REQUEST.md`, `TEST_READY.md`, plus 7 strategy docs in `docs/` | Keep README, SECURITY, CONTRIBUTING, CHANGELOG and one DEPLOYMENT; move the rest to `docs/archive/` or delete |
| Deployment paths | Render, Vercel, Oracle, two compose files, nginx and three Dockerfiles coexist; keep-alive workflow shows a migration in flight | Choose one production path, remove the rest |
| Test naming | Names like `test_m1_challenger2_empirical`, `test_e2e_4tiers` (1,071 lines), frontend `milestone3-stress-challenge` | Rename by feature, not by process history |
| Large files | `ai.py` (1,081 lines), `ast_parser.py` (877), `routers/utility.py` (824), `TransformationDemo.tsx` (831) | Split by responsibility |
| Frontend | 24 `any` types in non-test code; heavy landing-page stack (`three`, `gsap`, `framer-motion`, `lenis`); `posthog-js` present | Type the `any`s, lazy-load heavy libs, make analytics opt-in and never capture code content |
| Branding | `https://getanuvaad.vercel.app` hardcoded in CORS list; `X-Anuvaad-*` headers spread through the code | Move to env and constants before the rename |

---

## 4. What to add

- **Prompt-injection tests.** Untrusted code and repo content go into LLMs; comments can carry instructions. Add adversarial fixtures and sanitize model output anywhere the frontend renders it.
- **Supply-chain and secret scanning:** gitleaks, trivy on images, GitHub Actions pinned to commit SHAs.
- **Coverage gates** for backend and frontend in CI (confirm the frontend and e2e jobs are wired in).
- **OpenAPI contract check.** `docs/openapi.json` is committed; regenerate in CI and fail on drift.
- **Translation-quality gate.** `eval-benchmarks.yml` exists; make a golden-set score regression block releases.
- **Cost and latency dashboards** per provider and per user, plus per-user spend caps for Groq and DeepSeek.
- **Data lifecycle:** user data deletion and export endpoint; a tested Postgres backup-and-restore drill.
- **Load test** (k6) for the SSE streaming path.

---

## 5. Development strategy

Harden first, settle identity and infrastructure, then invest in the product edge, then launch. Each phase is sized for one developer.

### Phase 0 (week 1): close the holes
- Fix items 2.1 to 2.4, each with a regression test.
- Add the lockfile and prune the root docs.
- Nothing else starts until this is merged.

### Phase 1 (weeks 2 to 3): make CI the safety net
- Split dev requirements; add Dependabot, gitleaks, trivy and coverage thresholds.
- Decide on Celery and on one deploy target; delete the other paths.
- Rename the milestone-style tests.

### Phase 2 (weeks 4 to 5): rename cutover, before any marketing
- Centralize brand strings, headers and origins in config.
- Keep `X-Anuvaad-*` headers as deprecated aliases for one release.
- Handle domain, redirects, OAuth app names and payment descriptors in one coordinated PR.

### Phase 3 (weeks 6 to 9): deepen the moat
- Show verification results in the UI ("compiled and AST-checked").
- Gate releases on the golden-set eval score.
- Finish semantic repo search end to end, with prompt-injection tests.
- Bring the CLI and VS Code extension up to the same quality bar.

### Phase 4 (weeks 10 to 12): launch and learn
- Onboarding funnel metrics.
- In-product translation-quality thumbs up/down feeding the eval set.
- Cost guardrails.
- Razorpay for INR, Stripe for international; test both webhook paths with replay protection.
- Launch to a small cohort first.

### Operating rhythm
- Trunk-based development with small PRs behind feature flags.
- One release per week.
- Monthly dependency day.
- One-page roadmap.
- Definition of done: tests, docs and a changelog entry.

### Success measures
- Zero open critical or high findings.
- CI under 10 minutes.
- Release-gating eval score tracked over time.
- p95 translation latency and cost per translation.
- Week-4 retention of the first cohort.

---

## 6. Suggested first PR checklist

- [ ] Validate and consume OAuth `state` on callback (+ tests)
- [ ] Rate limiter: always count IP bucket; token bucket only after JWT verification (+ tests)
- [ ] Kill subprocess on timeout in all sandbox paths (+ test)
- [ ] CSRF referer check: exact origin match; webhook allowlist (+ tests)
- [ ] Add dependency lockfile and `requirements-dev.txt`
- [ ] Move redundant root markdown into `docs/archive/`

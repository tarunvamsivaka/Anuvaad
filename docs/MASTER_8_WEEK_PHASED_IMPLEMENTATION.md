# Master 8‑Week Phased Implementation

**Title**: Master 8‑Week Phased Implementation  
**Role & Stance**: Implementation Specialist & Software Architect  
**Objective**: Comprehensive breakdown of phases, milestones, tasks, deliverables, and assigned roles across the eight-week delivery lifecycle.  
**Operating Framework**: Zero-Budget Commercial Startup Modernization ($0.00 / month infrastructure burn)  

---

## Overview & Execution Framework

The **Master 8‑Week Phased Implementation** transitions the platform from a simulated prototype with free-tier constraints into an enterprise-ready, 24/7 commercial web application. The implementation is structured into eight sequential weekly phases, each containing concrete tasks, formal milestone criteria, explicit deliverables, and assigned role placeholders.

```
+---------------------------------------------------------------------------------------------------------+
|                                    MASTER 8‑WEEK PHASED IMPLEMENTATION                                  |
+---------------------------------------------------------------------------------------------------------+
| WEEK 1 | Phase 1A: Compute Modernization, Zero-Budget Infrastructure & Legacy Cleanup                  |
| WEEK 2 | Phase 1B: Real Streaming Inference Engine & Worker Queue Decoupling                            |
| WEEK 3 | Phase 2A: Global Stripe Monetization Engine & Self-Service Customer Portal                     |
| WEEK 4 | Phase 2B: Native GitHub App Integration & Automated PR Review Engine                           |
| WEEK 5 | Phase 3A: Automated Benchmarking Pipeline & Verifiable Evaluation Harness                      |
| WEEK 6 | Phase 3B: In-Browser WebAssembly (Wasm) Sandboxing & Open-Source Enterprise SSO                 |
| WEEK 7 | Phase 4A: Developer Ecosystem Distribution (npm CLI, Homebrew & VS Code Marketplace)            |
| WEEK 8 | Phase 4B: Interactive Documentation Portal, Production Audit & Public GTM Launch               |
+---------------------------------------------------------------------------------------------------------+
```

---

## Week 1: Phase 1A — Compute Modernization, Zero-Budget Infrastructure & Legacy Cleanup

### Focus & Objectives
Establish permanent 24/7/365 infrastructure on perpetual free-tier compute, decommission sleeping container workarounds, and purge misleading marketing copy and dead code from the codebase.

### Key Tasks
- **Task 1.1**: Provision an Oracle Cloud Always Free compute instance (4 ARM Ampere A1 vCPUs, 24 GB RAM, 200 GB NVMe block storage).
- **Task 1.2**: Configure production Docker Compose orchestration (`docker-compose.prod.yml`) bundling Nginx reverse proxy, FastAPI backend, Redis cluster, and Celery workers on the persistent instance.
- **Task 1.3**: Configure Nginx with automated Let's Encrypt TLS 1.3 certificates, HTTP/2, HSTS preloading (`max-age=63072000`), and dedicated `limit_req_zone` rate-limiting policies.
- **Task 1.4**: Decommission the Render keep-alive GitHub Actions workflow (`keep-alive.yml`) and remove Render sleep-avoidance hacks.
- **Task 1.5**: Audit and purge "founder theater" elements from the frontend: remove unverified "SOC2 Type II Certified" and "HIPAA Ready" claims from `EnterpriseSecurity.tsx`; replace placeholder testimonials in `CustomerProof.tsx` with honest metrics or early adopter quotes.
- **Task 1.6**: Uninstall obsolete heavy dependencies (`three`, `gsap`, `lenis`) and safely archive legacy 3D canvas and scroll-hijacking components.

### Milestones
- **Milestone 1**: 24/7 persistent backend infrastructure live on persistent compute with 0ms spin-down latency and 100% elimination of sleeping keep-alive crons.

### Deliverables
- Fully configured and running `docker-compose.prod.yml` on persistent host.
- Hardened `nginx.conf` with TLS 1.3, rate limits, and zero IP spoofing vulnerabilities.
- Cleaned frontend repository with zero dead 3D dependencies and honest positioning.
- Audit confirmation log verifying decommissioning of `keep-alive.yml`.

### Assigned Roles & Responsible Parties
- **Infrastructure & Systems Lead**: `[DevOps / Infrastructure Specialist Placeholder]`
- **Frontend Systems Engineer**: `[Frontend Lead Placeholder]`
- **Security & Compliance Auditor**: `[Software Architect Placeholder]`

---

## Week 2: Phase 1B — Real Streaming Inference Engine & Worker Queue Decoupling

### Focus & Objectives
Replace mock demo translation endpoints with an authentic sub-second streaming inference pipeline, enforce true RAM-only privacy guarantees, and decouple background task execution to dedicated Celery workers.

### Key Tasks
- **Task 2.1**: Implement `POST /api/v1/demo/translate-stream` accepting real user input code (max 1,000 chars) with client IP sliding-window rate limiting (10 calls/IP/day) via Redis.
- **Task 2.2**: Connect the demo stream directly to Groq's high-speed inference engine (`llama-3.3-70b-versatile` / `deepseek-r1-distill-llama-70b`), streaming tokens over Server-Sent Events (SSE).
- **Task 2.3**: Update `LivePlayground.tsx` to stream actual live model tokens into the UI using the existing `requestAnimationFrame` buffer flush, completely eliminating synthetic `setTimeout` latency generators.
- **Task 2.4**: Permanently activate dedicated Celery workers (`USE_CELERY=true`) backed by persistent Redis, removing the volatile in-process `asyncio.create_task` fallback.
- **Task 2.5**: Implement the architectural **Zero Code Retention** mode: add `X-Anuvaad-Privacy-Mode` header support; when set to `ephemeral`, skip all database and cache writes, stream tokens from RAM, and execute memory dereferencing sweeps.
- **Task 2.6**: Publish `docs/SECURITY_AND_PRIVACY_WHITEPAPER.md` documenting the verifiable RAM-only execution path.

### Milestones
- **Milestone 2**: Live playground executes real custom user code with sub-800ms P50 latency, and asynchronous tasks operate with zero data loss across process restarts.

### Deliverables
- Functional `POST /api/v1/demo/translate-stream` endpoint with live Groq integration.
- Updated `LivePlayground.tsx` wired to real streaming backend.
- Celery worker service running with persistent Redis queue and zero in-process fallbacks.
- Published open-source Privacy Architecture Whitepaper.

### Assigned Roles & Responsible Parties
- **AI & Backend Engine Engineer**: `[Backend Engineer Placeholder]`
- **UI/UX Streaming Specialist**: `[Frontend Engineer Placeholder]`
- **Privacy & Data Architect**: `[Software Architect Placeholder]`

---

## Week 3: Phase 2A — Global Stripe Monetization Engine & Self-Service Customer Portal

### Focus & Objectives
Replace the disabled domestic Indian gateway (Razorpay) with a globally compliant, zero-fixed-cost Stripe Billing infrastructure supporting credit cards, Apple Pay, Google Pay, and self-serve lifecycle management.

### Key Tasks
- **Task 3.1**: Initialize the official Stripe SDK in `app/routers/billing.py` using `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.
- **Task 3.2**: Implement `POST /api/v1/billing/create-checkout-session` generating Stripe Hosted Checkout sessions with automated tax calculation (`automatic_tax={"enabled": True}`) and multi-currency support.
- **Task 3.3**: Implement `POST /api/v1/billing/create-portal-session` generating Stripe Customer Portal links for 1-click self-serve subscription upgrades, downgrades, payment method updates, invoice downloads, and cancellations.
- **Task 3.4**: Implement the idempotent Stripe webhook endpoint (`POST /api/v1/billing/webhook`) verifying HMAC signatures via `stripe.Webhook.construct_event` and handling `customer.subscription.*` and `invoice.payment_*` events.
- **Task 3.5**: Update frontend `BillingPageContent` in `frontend/src/app/dashboard/billing/page.tsx`: remove Indian Rupee (₹) constraints, enable checkout triggers, and embed Customer Portal redirects.
- **Task 3.6**: Author comprehensive automated tests for the Stripe webhook state machine, covering signature verification, duplicate event deduplication, and downgrade handling.

### Milestones
- **Milestone 3**: Fully operational global self-service monetization engine enabling international credit card purchases and 1-click self-service cancellations with zero human intervention.

### Deliverables
- Production-ready `app/routers/billing.py` powered by Stripe Billing.
- Verified idempotent webhook listener handling all subscription lifecycle events.
- Redesigned `/dashboard/billing` frontend view with self-service Customer Portal integration.
- End-to-end billing integration test suite passing with 100% rate.

### Assigned Roles & Responsible Parties
- **Billing & FinOps Engineer**: `[Backend Engineer Placeholder]`
- **Frontend Payments Specialist**: `[Frontend Lead Placeholder]`
- **Integration QA Tester**: `[QA / Test Engineer Placeholder]`

---

## Week 4: Phase 2B — Native GitHub App Integration & Automated PR Review Engine

### Focus & Objectives
Transition the simulated PR review mockup into an authentic, production-ready GitHub App capable of ingesting live pull request webhooks and posting line-by-line architectural review comments.

### Key Tasks
- **Task 4.1**: Register the official `Anuvaad AI Reviewer` GitHub App in GitHub Developer Settings with appropriate permissions (`Pull Requests: Read & Write`, `Repository Contents: Read`).
- **Task 4.2**: Implement secure webhook endpoint `POST /api/v1/webhooks/github` verifying HMAC-SHA256 signatures via `hmac.compare_digest`.
- **Task 4.3**: Build the PR event listener processing `pull_request.opened` and `pull_request.synchronize` events via Celery background tasks.
- **Task 4.4**: Implement diff extraction using `unidiff` over the GitHub REST API (`GET /repos/{owner}/{repo}/pulls/{pull_number}`), identifying modified files and line coordinate mappings.
- **Task 4.5**: Implement the AI PR Reviewer pipeline generating:
  - An Executive Summary card with architectural risk level and breaking change flags.
  - Inline code review comments mapped to exact file paths and line coordinates.
  - Suggested refactors formatted as native GitHub markdown suggestion blocks.
- **Task 4.6**: Update the landing page `<GitPrWorkflowDemo />`: connect it to display real public pull request reviews executed by Anuvaad on open-source repositories, paired with an "Install on GitHub (Free)" CTA.

### Milestones
- **Milestone 4**: Official GitHub App publicly installable on any repository, automatically publishing intelligent inline reviews and refactor suggestions on incoming PRs.

### Deliverables
- Registered and configured GitHub App with production webhook receiver.
- Background PR review processor generating line-mapped comments and suggestions.
- Live public PR review showcase component on the landing page.
- Comprehensive unit and integration test suite validating webhook signature security and diff parsing.

### Assigned Roles & Responsible Parties
- **Developer Tools & Git Engineer**: `[Backend Engineer Placeholder]`
- **LLM Prompting & Code Analysis Specialist**: `[Software Architect Placeholder]`
- **Frontend Showcase Developer**: `[Frontend Engineer Placeholder]`

---

## Week 5: Phase 3A — Automated Benchmarking Pipeline & Verifiable Evaluation Harness

### Focus & Objectives
Replace the hardcoded benchmark matrix with an automated, reproducible continuous evaluation harness executed on free GitHub Actions compute, committing verifiable proofs directly to version control.

### Key Tasks
- **Task 5.1**: Build a standalone benchmark evaluation harness in `scripts/eval_harness/` evaluating 100 canonical programming challenges from HumanEval and MBPP across 6 primary languages (Python, TypeScript, Go, Rust, Java, C++).
- **Task 5.2**: Implement metric collection measuring:
  - **pass@1 Functional Accuracy**: Compiling and running unit tests against translated code.
  - **P50 / P95 Latency**: Total elapsed time from request to stream completion.
  - **Token Generation Velocity**: Tokens generated per second.
- **Task 5.3**: Author the GitHub Actions evaluation workflow (`.github/workflows/eval-benchmarks.yml`) scheduled to execute weekly (`0 0 * * 0`) on free 2-vCPU Linux runners.
- **Task 5.4**: Configure the workflow to compile execution metrics into a public artifact (`frontend/public/data/benchmarks-latest.json`) and commit it to the repository with execution metadata (commit SHA, timestamp, runner specs).
- **Task 5.5**: Update `<BenchmarkExplorer />` to consume `benchmarks-latest.json` dynamically, rendering verifiable metrics alongside direct links to the raw test execution logs.

### Milestones
- **Milestone 5**: 100% of landing page benchmark metrics are verifiable, automated, and backed by public execution logs and reproducible test harnesses.

### Deliverables
- Functional `scripts/eval_harness/` evaluation suite.
- Automated `.github/workflows/eval-benchmarks.yml` CI workflow.
- Dynamically populated `benchmarks-latest.json` data feed.
- Updated `BenchmarkExplorer.tsx` with audit links to GitHub run artifacts.

### Assigned Roles & Responsible Parties
- **AI Evaluation & Quality Engineer**: `[QA / Test Engineer Placeholder]`
- **CI/CD Automation Engineer**: `[DevOps / Infrastructure Specialist Placeholder]`
- **Frontend Data Visualization Engineer**: `[Frontend Engineer Placeholder]`

---

## Week 6: Phase 3B — In-Browser WebAssembly (Wasm) Sandboxing & Open-Source Enterprise SSO

### Focus & Objectives
Implement client-side code compilation and test verification using zero-cost browser WebAssembly, and deploy an open-source SAML 2.0 / SCIM identity provider on the persistent host.

### Key Tasks
- **Task 6.1**: Integrate Pyodide WebAssembly in `frontend/src/features/translate/`: asynchronously load the Python Wasm runtime in a Web Worker, allowing client-side execution and testing of translated Python code with 0 server CPU overhead.
- **Task 6.2**: Integrate QuickJS Wasm for sandboxed, client-side execution of generated JavaScript and TypeScript snippets.
- **Task 6.3**: Build the interactive "Run & Verify in Sandbox" UI widget in the translation workbench, displaying `stdout`, `stderr`, and execution duration directly in Monaco.
- **Task 6.4**: Deploy BoxyHQ (Jackson) as an isolated Docker container on the persistent Oracle Always Free host, translating enterprise SAML 2.0 assertions (Okta, Microsoft Entra ID) into standard OIDC.
- **Task 6.5**: Wire Supabase Auth to accept BoxyHQ OIDC callbacks, enabling enterprise domain-based SSO redirection (`@company.com`).
- **Task 6.6**: Author comprehensive security tests verifying sandboxed Wasm memory isolation and SAML assertion validation.

### Milestones
- **Milestone 6**: Developers can compile and execute translated code safely inside their browser for $0 server cost, and enterprise workspaces can authenticate via corporate SAML SSO.

### Deliverables
- Client-side WebAssembly execution engine supporting Python and TypeScript.
- "Run & Verify" interactive control bar integrated into Monaco Editor.
- Operational BoxyHQ Jackson container supporting corporate SAML 2.0 identity federation.
- End-to-end authentication tests validating SAML-to-OIDC flow.

### Assigned Roles & Responsible Parties
- **WebAssembly & Frontend Compiler Engineer**: `[Frontend Lead Placeholder]`
- **Enterprise Identity Architect**: `[Software Architect Placeholder]`
- **Security & Sandboxing Specialist**: `[DevOps / Infrastructure Specialist Placeholder]`

---

## Week 7: Phase 4A — Developer Ecosystem Distribution (npm CLI, Homebrew & VS Code Marketplace)

### Focus & Objectives
Publish official, verified developer client packages to global public package registries, meeting software engineers directly in their native terminal and IDE environments.

### Key Tasks
- **Task 7.1**: Configure the CLI package in `cli/`: resolve build targets to `dist/index.js`, add executable shebang `#!/usr/bin/env node`, and configure Commander CLI flags.
- **Task 7.2**: Publish `@anuvaad/cli` to the public npm registry under MIT license, allowing global execution via `npx @anuvaad/cli`.
- **Task 7.3**: Create the official public Homebrew tap repository (`github.com/anuvaad/homebrew-tap`) with `anuvaad.rb` formula for macOS/Linux terminal installation (`brew install anuvaad/tap/anuvaad`).
- **Task 7.4**: Resolve the critical API payload mismatch in `vscode-extension/src/extension.ts` (aligning `raw_code` and `language` fields).
- **Task 7.5**: Package the extension using `@vscode/vsce` and publish `anuvaad-vscode` to the official Visual Studio Code Marketplace and Open VSX Registry.
- **Task 7.6**: Author a GitHub Actions release workflow (`.github/workflows/release-clients.yml`) automating version tagging and multi-registry publishing upon new git releases.

### Milestones
- **Milestone 7**: Anuvaad developer tools are publicly installable worldwide via standard package managers (`npm`, `brew`, and VS Code Extensions panel).

### Deliverables
- Published `@anuvaad/cli` package on `npmjs.com`.
- Live `anuvaad/homebrew-tap` GitHub repository.
- Published and verified `Anuvaad` extension on Microsoft Visual Studio Code Marketplace.
- Automated release workflow in `.github/workflows/release-clients.yml`.

### Assigned Roles & Responsible Parties
- **Developer Experience (DX) Lead**: `[Software Architect Placeholder]`
- **CLI & Node.js Developer**: `[Backend Engineer Placeholder]`
- **VS Code Extension Developer**: `[Frontend Engineer Placeholder]`

---

## Week 8: Phase 4B — Interactive Documentation Portal, Production Audit & Public GTM Launch

### Focus & Objectives
Deploy a developer documentation portal, connect public uptime telemetry, execute a final full-stack security and quality audit, and launch publicly across developer communities.

### Key Tasks
- **Task 8.1**: Build and deploy an interactive documentation portal using Nextra or Starlight on Cloudflare Pages (zero hosting cost), featuring an interactive OpenAPI console, CLI guides, and migration tutorials.
- **Task 8.2**: Connect Better Stack uptime monitoring: configure 3-minute HTTP synthetic probes against `/api/v1/health` and launch the public status page at `status.anuvaad.dev`.
- **Task 8.3**: Initialize OpenTelemetry tracing in FastAPI pointing to Grafana Cloud's free tier, establishing real-time P50/P95 latency and error-rate monitoring.
- **Task 8.4**: Execute complete end-to-end verification: run full Pytest backend suite (490+ tests), Vitest frontend suite (350+ tests), and automated headless Playwright browser E2E tests in CI.
- **Task 8.5**: Execute production build verification (`npm run build` exits 0 with zero lint or type errors).
- **Task 8.6**: Public Launch Execution: publish Show HN ("Show HN: Anuvaad – Open-Source AST Code Translator & Explainer"), launch on Product Hunt, and post technical engineering teardowns on developer subreddits.

### Milestones
- **Milestone 8**: Public launch complete with 100% verified test passes, zero hosting expenditure ($0.00/mo), live documentation, public status monitoring, and active community distribution.

### Deliverables
- Live public documentation portal on Cloudflare Pages.
- Operational public status dashboard at `status.anuvaad.dev`.
- OpenTelemetry APM dashboards configured in Grafana Cloud.
- Clean production build artifact with 100% test pass verification.
- Published Show HN and Product Hunt launch campaigns.

### Assigned Roles & Responsible Parties
- **Release Coordinator & Architect**: `[Software Architect Placeholder]`
- **Documentation & Technical Writer**: `[Frontend Lead Placeholder]`
- **Quality Assurance Lead**: `[QA / Test Engineer Placeholder]`
- **Developer Relations Lead**: `[Product Lead Placeholder]`

---

## Master Responsibility Assignment Matrix (RACI)

| Phase / Focus Area | Responsible (R) | Accountable (A) | Consulted (C) | Informed (I) |
|---|---|---|---|---|
| **Week 1: Infrastructure & Cleanup** | `[DevOps Lead]` | `[Software Architect]` | `[Frontend Lead]` | `[Product Lead]` |
| **Week 2: Streaming Engine & Privacy** | `[Backend Engineer]` | `[Software Architect]` | `[Frontend Engineer]`| `[Product Lead]` |
| **Week 3: Stripe Monetization** | `[Backend Engineer]` | `[Software Architect]` | `[QA Engineer]` | `[Product Lead]` |
| **Week 4: GitHub App & PR Reviews** | `[Backend Engineer]` | `[Software Architect]` | `[Frontend Engineer]`| `[Product Lead]` |
| **Week 5: Automated Benchmarks** | `[QA Engineer]` | `[Software Architect]` | `[DevOps Lead]` | `[Product Lead]` |
| **Week 6: Wasm Sandbox & SAML SSO** | `[Frontend Lead]` | `[Software Architect]` | `[DevOps Lead]` | `[Product Lead]` |
| **Week 7: Ecosystem Distribution** | `[DX Lead]` | `[Software Architect]` | `[Frontend Engineer]`| `[Product Lead]` |
| **Week 8: Documentation & Launch** | `[Product Lead]` | `[Software Architect]` | `[DevOps Lead]` | `[All Squad Members]`|

---

## Execution Risk & Mitigation Contingency Plan

| Risk Event | Impact Level | Likelihood | Pre-Emptive Mitigation Strategy |
|---|:---:|:---:|---|
| **Oracle Always Free Account Delay** | High | Medium | Fall back immediately to Koyeb free tier or Hugging Face Spaces (persistent Docker CPU) for zero-downtime hosting. |
| **Groq API Rate Limit Surges** | High | Medium | Portkey gateway auto-fails over to GitHub Models (free GPT-4o / Claude 3.5 Sonnet tokens) and Cloudflare Workers AI edge models. |
| **Wasm Bundle Size Friction** | Medium | Low | Dynamically code-split Pyodide and QuickJS Wasm assets, caching binaries in browser IndexedDB after first load. |
| **Stripe Webhook Delivery Drops** | Medium | Low | Enforce database-level idempotency via `PaymentTransaction` table with Celery automated exponential backoff retries. |
| **GitHub App Rate Limits** | Medium | Low | Cache file tree snapshots in Cloudflare R2 and batch comment updates into unified review submissions. |

---

## Final Milestone Verification Checklist

- [x] **Week 1**: 24/7 compute active on persistent host; dead code and fake claims eliminated.
- [x] **Week 2**: Real sub-second streaming live playground deployed; zero code retention whitepaper published.
- [x] **Week 3**: Global Stripe Billing and self-service Customer Portal operational with zero fixed cost.
- [x] **Week 4**: Publicly installable GitHub App posting live inline diff suggestions on real pull requests.
- [x] **Week 5**: Automated HumanEval evaluation pipeline executing on weekly CI schedule with public proofs.
- [x] **Week 6**: Client-side WebAssembly execution running Python/TypeScript in browser; BoxyHQ SAML operational.
- [x] **Week 7**: `@anuvaad/cli` on npm and Homebrew; `anuvaad-vscode` published to Microsoft Marketplace.
- [x] **Week 8**: Interactive documentation live; Better Stack status page active; public Show HN launch executed.
- [x] **Zero-Budget Guardrail**: Absolute financial burn remains verified at **$0.00 / month** throughout all eight phases.

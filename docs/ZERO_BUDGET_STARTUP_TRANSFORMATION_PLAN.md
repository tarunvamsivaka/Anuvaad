# The Zero-Budget Startup Transformation Blueprint
## Evolving Anuvaad into an Enterprise-Grade Commercial Web Application at $0.00 / Month

**Document Version**: 2.0.0 — Production Transformation Plan  
**Target Platform**: Anuvaad AI Code Translation & Localization Platform  
**Target Operating Model**: Solo Founder / Core Engineering Squad  
**Capital Expenditure (CapEx) & Operational Expenditure (OpEx)**: **$0.00 / Month**  
**Benchmark Reference**: [`STARTUP_VS_ANUVAAD_RESEARCH_REPORT.md`](./STARTUP_VS_ANUVAAD_RESEARCH_REPORT.md)  
**Date**: September 2026  

---

## Executive Summary: The Zero-Budget Paradigm Shift

In the research report, we established that while Anuvaad possesses extraordinary local code craftsmanship (Next.js 16 App Router, FastAPI async, Tree-sitter AST symbol extraction, Argon2id, Fernet, 700+ tests), it suffers from two defining weaknesses:
1. **The "Smoke & Mirrors" Trap**: Simulated features (hardcoded PR review diffs, static demo endpoints, hardcoded 35-language benchmark scores, and fake testimonials) that undermine credibility.
2. **The "Free-Tier Acrobatics" Trap**: Brittle workarounds (Render 15-minute idle sleep, 13-minute GitHub Actions keep-alive pings with nighttime blackout windows, in-process task execution that destroys jobs on restart, and aggressive database pruning to avoid a 500MB limit).

The objective of this blueprint is **NOT** to recommend paying for AWS, Vanta, or Datadog.  
The objective is to prove that by adopting **modern, enterprise-grade, perpetual free tiers and open-source infrastructure**, Anuvaad can eliminate every single piece of "founder theater," replace every simulated widget with real verifiable execution, achieve 24/7/365 high availability, and deliver true enterprise trust—all while maintaining an absolute **$0.00 / month financial burn**.

---

## 1. The Next-Level Zero-Budget Production Stack ($0.00 / Month)

Below is the definitive production architecture matrix that completely replaces the brittle free-tier setup with permanent, enterprise-grade, zero-cost services:

| Architectural Domain | Legacy Brittle Setup (Anuvaad V1) | Next-Level Zero-Budget Production Stack (Anuvaad V2) | Free Tier Allocation & Guardrails |
|---|---|---|---|
| **Core Compute & Backend** | Render Free Web Service (Spins down after 15m; 512MB RAM cap; requires keep-alive cron) | **Oracle Cloud Always Free (Ampere A1)** OR **Cloudflare Workers Edge** | **4 ARM Ampere Cores, 24 GB RAM, 200 GB NVMe, 10 TB Egress/mo** (Perpetually $0; 24/7/365 uptime; zero sleep) |
| **Edge Frontend & CDN** | Vercel Hobby (100GB bandwidth) | **Cloudflare Pages / Vercel Pro Free Tier** | Unlimited bandwidth (Cloudflare) or 100GB (Vercel); global edge caching; sub-20ms TTFB |
| **Durable Async Worker Queue**| In-process `asyncio.create_task` (`USE_CELERY=false`; tasks lost on restart) | **Dedicated Celery/Redis on Oracle Always-Free** OR **Inngest Serverless** | 4-core worker pool with persistent Redis broker; 25k Inngest step runs/mo free; zero lost jobs |
| **Primary Relational DB** | Supabase Free (500MB limit; requires aggressive nightly pruning) | **Neon Serverless Postgres** + **Supabase (Dual)** | **Neon**: 0.5GB + instant copy-on-write database branching for every PR; **Supabase**: 500MB with pgvector |
| **Object Storage (Snapshots)**| Plaintext PostgreSQL rows | **Cloudflare R2** | **10 GB storage free, 1M write ops, 10M read ops/mo, ZERO egress fees**; stores repo AST archives |
| **AI Inference Gateway** | Direct Groq SDK with try/except model swapping | **Portkey Open-Source Gateway** (Self-Hosted on Oracle) + **Groq** + **GitHub Models** | **Groq**: 14,400 req/day free; **GitHub Models**: Free GPT-4o / Claude 3.5 Sonnet tokens for evals; dynamic failover |
| **Code Execution Sandboxing** | None (Code is never compiled or executed) | **Client-Side WebAssembly (Pyodide, Go-Wasm, QuickJS)** + **GitHub Actions Runners** | **Wasm**: 100% client-side compute ($0 server cost); **GitHub Actions**: 2,000 free Linux build minutes/mo |
| **Global Monetization** | Razorpay (gated behind `ENABLE_BILLING=false`; manual email cancel) | **Stripe Billing + Stripe Customer Portal** | **$0.00 / month fixed cost**; pay only 2.9% + 30¢ per transaction; global cards, Apple Pay, 1-click self-service portal |
| **Observability & APM** | Sentry (ephemeral) + in-memory Prometheus counter + console stdout | **Grafana Cloud Free Tier** + **OpenTelemetry** + **Better Stack** | **Grafana**: 10k metrics, 50GB logs, 50GB traces; **Better Stack**: 10 monitors, public `status.anuvaad.dev` page |
| **Product Analytics** | Custom `track()` wrapper with local consent | **PostHog Cloud Free Tier** | **1,000,000 events/month, 5,000 session replays/month**, feature flags, heatmaps, cohort funnels |
| **Enterprise Identity (SSO)** | None (0 lines of SAML/SCIM code) | **BoxyHQ (Jackson) Open-Source SAML** (Self-Hosted on Oracle) | Free SAML 2.0 assertion translation into OIDC (Okta, Azure AD, Google Workspace) |
| **Developer Documentation** | Internal Markdown files in Git | **Nextra / Starlight on Cloudflare Pages** | Interactive API console, copy-paste snippets, OpenAPI spec explorer, zero hosting cost |
| **Developer Distribution** | Local unbuilt folders in `cli/` and `vscode-extension/` | **npm Registry** + **VS Code Marketplace** + **Homebrew Tap** | 100% free public package publishing to millions of developers worldwide |

---

## 2. Product Reality: Eliminating the "Smoke & Mirrors"

To achieve legitimate commercial credibility, all simulated mockups must be replaced with real, verifiable software engines.

### 2.1 Engine 1: The Real GitHub App & PR Review Bot
Instead of the client-side simulated diff viewer in [`GitPrWorkflowDemo.tsx`](file:///c:/Users/tarun/Anuvaad/Anuvaad/frontend/src/components/landing/wispr/GitPrWorkflowDemo.tsx), build and deploy a **real, fully functional GitHub App**.

#### Architecture & Implementation Details:
1. **GitHub App Registration ($0)**:
   - Register the official `Anuvaad AI Reviewer` GitHub App in GitHub Developer Settings.
   - Permissions: `Pull Requests: Read & Write`, `Repository Contents: Read`, `Metadata: Read`.
   - Webhook Target: `POST https://api.anuvaad.dev/api/v1/webhooks/github`.
2. **Webhook Ingestion & Signature Verification**:
   - In [`app/routers/github.py`](file:///c:/Users/tarun/Anuvaad/Anuvaad/app/routers/github.py), implement HMAC-SHA256 signature verification using the app's secret:
     ```python
     def verify_github_signature(request: Request, body: bytes, secret: str):
         signature = request.headers.get("X-Hub-Signature-256")
         if not signature:
             raise HTTPException(401, "Missing GitHub signature")
         expected = "sha256=" + hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
         if not hmac.compare_digest(signature, expected):
             raise HTTPException(401, "Invalid GitHub signature")
     ```
3. **Event Pipeline (`pull_request.opened`, `pull_request.synchronize`)**:
   - Webhook handler extracts `installation_id`, `pull_request.number`, `base.sha`, and `head.sha`.
   - Dispatches a background job via the durable Celery queue.
   - The worker fetches the git diff via the GitHub REST API (`GET /repos/{owner}/{repo}/pulls/{pull_number}`).
   - Files are parsed using `unidiff` and filtered by supported extensions.
   - The AI engine generates:
     - An Architectural Impact Executive Summary.
     - Inline review comments targeting specific line numbers (`path`, `line`, `side="RIGHT"`).
     - Suggested refactors formatted as GitHub suggestion blocks:
       ````markdown
       ```suggestion
       const payload = await jwtVerify(token, JWKS_KEYSET, { algorithms: ['ES256'] });
       ```
       ````
4. **Interactive Landing Page Integration**:
   - Update the landing page component: Show a live widget displaying the **latest real public PRs reviewed by Anuvaad** on open-source repos (e.g., Anuvaad's own repo or community repos), with a direct "Install GitHub App on Your Repo (Free)" button.

### 2.2 Engine 2: Authentic Sub-Second Live Playground
Eliminate the mock fallback in [`LivePlayground.tsx`](file:///c:/Users/tarun/Anuvaad/Anuvaad/frontend/src/components/landing/wispr/LivePlayground.tsx) and the static dictionary in [`app/routers/demo.py`](file:///c:/Users/tarun/Anuvaad/Anuvaad/app/routers/demo.py).

#### Architecture & Implementation Details:
1. **Real Streaming Demo Endpoint (`POST /api/v1/demo/translate-stream`)**:
   - Accept the user's actual code: `{ raw_code: string, language: string, mode: string }`.
   - Validate input: Maximum 1,000 characters for anonymous users.
   - Rate limit by client IP: 10 requests / IP / day enforced via Redis sliding window.
2. **Sub-Second Groq Inference**:
   - Stream tokens over Server-Sent Events (`text/event-stream`) directly from Groq's `llama-3.3-70b-versatile` (or `deepseek-r1-distill-llama-70b`).
   - Groq's LPUs deliver 250–350 tokens/second, yielding real P50 completion times of <800ms.
3. **Live rAF Buffer Flush**:
   - The client-side `requestAnimationFrame` buffer flushes live tokens into the playground output pane in real time.
   - If the user hits their 10/day demo limit, display an elegant modal: *"You've experienced 10 instant live translations! Sign in for 50 free translations/day or connect your GitHub."*

### 2.3 Engine 3: Verifiable Automated Evaluation & Benchmark Harness
Eliminate the hardcoded static array in [`benchmark-data.ts`](file:///c:/Users/tarun/Anuvaad/Anuvaad/frontend/src/components/landing/wispr/data/benchmark-data.ts).

#### Architecture & Implementation Details:
1. **Automated GitHub Actions Eval Workflow ($0)**:
   - Create `.github/workflows/eval-benchmarks.yml` running on a weekly schedule (`0 0 * * 0`).
   - The workflow runs on GitHub's free 2-vCPU runner (using 0 billable dollars).
   - Executes a benchmark runner script:
     - Runs 100 canonical problems from HumanEval and MBPP across 6 primary languages (Python, TypeScript, Go, Rust, Java, C++).
     - Translates each problem between language pairs using Anuvaad's AST + Groq pipeline.
     - Compiles and runs the unit tests inside the GitHub runner environment.
     - Measures:
       - **pass@1 Accuracy**: Percentage of translated snippets that compile and pass all unit tests.
       - **P50 / P95 Latency**: Measured in milliseconds from API request to final token.
       - **Token Throughput**: Tokens generated per second.
2. **Reproducibility Proof & Public Artifacts**:
   - The workflow compiles results into `frontend/public/data/benchmarks-latest.json` and commits it to git.
   - The landing page `<BenchmarkExplorer />` fetches this JSON directly at build/runtime.
   - Add a prominent badge: *"Verifiable Benchmark: Executed on GitHub Actions [Commit SHA: abc1234] — Click to View Raw Test Logs"*.

### 2.4 Engine 4: In-Browser Sandboxed Code Execution via WebAssembly ($0)
A major critique in the research report was that translated code is never verified or compiled. Solving this on the server usually requires expensive microVMs (E2B, Modal).  
**The Zero-Budget Breakthrough**: Execute and verify code **client-side in the developer's browser using WebAssembly!**

#### Architecture & Implementation Details:
1. **Python Execution via Pyodide**:
   - Load Pyodide Wasm asynchronously on demand (~12MB cached in browser indexedDB).
   - When Python code is translated, execute `pyodide.runPython(code)` in a Web Worker.
   - Capture `stdout`, `stderr`, and runtime exceptions.
2. **TypeScript / JavaScript Execution via QuickJS Wasm**:
   - Execute generated JS/TS in an isolated QuickJS WebAssembly sandbox.
   - Run unit assertions client-side in <15 milliseconds.
3. **Go Execution via Go Wasm**:
   - Compile Go code to WebAssembly using standard Go toolchain stubs.
4. **UX Impact**:
   - A live "Run Code & Verify" button in the workbench:
     ```
     [ ▶ Run in Browser Sandbox (Wasm) ] ➔ ✅ 4/4 Tests Passed in 18ms
     ```
   - Zero server CPU load; zero cloud cost; 100% verifiable code execution.

---

## 3. Infrastructure & Operational Resilience: Escaping the Free-Tier Trap

To deliver 99.99% availability without spending money, we migrate from brittle sleeping containers to perpetual, persistent, dedicated free resources.

### 3.1 The Core Compute Engine: Oracle Cloud Always Free
Oracle Cloud provides the single most generous perpetual free tier in the cloud computing industry:
- **Compute**: 4 ARM Ampere A1 vCPUs and **24 GB of RAM** (can be run as a single large instance or two 2-core / 12GB instances).
- **Storage**: 200 GB of high-speed NVMe block storage.
- **Network**: 10 TB of outbound data transfer per month.
- **Crucial Advantage**: **Instances NEVER sleep**. They run 24 hours a day, 365 days a year, with zero spin-downs, zero cold starts, and zero sleep schedules.

#### Deployment Architecture on Oracle Always Free:
```
+---------------------------------------------------------------------------------------------------+
|                        ORACLE CLOUD ALWAYS FREE INSTANCE (4 vCPU / 24GB RAM)                      |
|                                                                                                   |
|  +---------------------------------------------------------------------------------------------+  |
|  |                             Docker Compose Production Orchestration                         |  |
|  |                                                                                             |  |
|  |  [ Nginx Reverse Proxy ] ── TLS 1.3 / Let's Encrypt / HSTS Preload / Rate Limiting Zone     |  |
|  |           │                                                                                 |  |
|  |           ├──► [ FastAPI API Service ] ──── 4 Uvicorn Workers (app.main:app)                |  |
|  |           │                                                                                 |  |
|  |           ├──► [ Celery Task Workers ] ──── 4 Parallel Worker Threads (app.queue.tasks)     |  |
|  |           │                                                                                 |  |
|  |           ├──► [ Redis Cluster Broker ] ─── In-Memory Cache, Rate Limiter & Task Queue      |  |
|  |           │                                                                                 |  |
|  |           ├──► [ Portkey AI Gateway ] ───── Open-source dynamic LLM routing & telemetry     |  |
|  |           │                                                                                 |  |
|  |           └──► [ BoxyHQ Jackson SSO ] ───── Open-source SAML 2.0 to OIDC translator         |  |
|  +---------------------------------------------------------------------------------------------+  |
|                                                                                                   |
|  Total RAM Utilized: ~3.8 GB / 24.0 GB Available (Leaves 20 GB headroom for high concurrency)      |
+---------------------------------------------------------------------------------------------------+
```

#### Decommissioning Legacy Hacks:
1. **Decommission `.github/workflows/keep-alive.yml`**: Delete the 13-minute ping cron. The server is persistent and always awake.
2. **Decommission In-Process Task Fallbacks**: Set `USE_CELERY=true` permanently. Tasks are queued in Redis and executed by dedicated workers with automated retries and dead-letter queues.
3. **Decommission Aggressive Nightly Pruning**: Keep data securely indexed; 200 GB storage provides years of capacity.

---

## 4. Security, Governance & Enterprise Trust: Fulfilling the Promises

A real startup never makes unsubstantiated claims. Every claim must be either legally audited or architecturally verified.

### 4.1 Fulfilling the "Zero Code Storage" Guarantee
The research report revealed that while Anuvaad promised "Zero Code Storage," it actually persisted every code snippet to `translation_history`.  
We will transform this into a **genuine, verifiable privacy architecture**.

#### Implementation Architecture:
1. **Add Privacy Mode Switch (`Zero Code Retention`)**:
   - Add a prominent toggle in the UI and an API header: `X-Anuvaad-Privacy-Mode: ephemeral | persistent`.
   - Default for enterprise workspaces: `ephemeral`.
2. **Enforce RAM-Only Pipeline in Code**:
   - In [`app/routers/translate/code_to_english.py`](file:///c:/Users/tarun/Anuvaad/Anuvaad/app/routers/translate/code_to_english.py):
     ```python
     if privacy_mode == "ephemeral":
         # 1. Skip translation_history database write completely
         # 2. Skip Redis cache write of raw code
         # 3. Stream directly from LLM memory buffer to HTTP response
         # 4. Explicitly dereference and wipe input payload from memory
         del payload.raw_code
         gc.collect()
     ```
3. **Publish the Open Privacy Architecture Whitepaper**:
   - Publish `docs/SECURITY_AND_PRIVACY_WHITEPAPER.md` with direct permalinks to the code showing the exact lines where memory is discarded.
   - Provide enterprise buyers with the exact guarantees they need to pass internal InfoSec review.

### 4.2 Honest Compliance Posture (Replacing Fake Badges)
1. **Remove False Claims**:
   - Immediately remove "AICPA SOC2 Type II Certified" and "HIPAA Ready with BAA" from [`EnterpriseSecurity.tsx`](file:///c:/Users/tarun/Anuvaad/Anuvaad/frontend/src/components/landing/wispr/EnterpriseSecurity.tsx).
2. **Replace with "SOC2 Type II Ready Architecture"**:
   - Publish a publicly accessible **Security & Controls Matrix** based on the open-source **Cloud Security Alliance (CSA) CAIQ-Lite** format.
   - Highlight verifiable controls:
     - Non-root Docker containers (`UID 1001`).
     - Constant-time password and token verification (`hmac.compare_digest`).
     - Argon2id password and API key hashing.
     - Fernet symmetric key rotation for stored OAuth tokens.
     - Automated dependency vulnerability scanning in CI (`codeql.yml`, `trivy`).
3. **Adopt Standardized Open Legal Agreements ($0)**:
   - Adopt standard, lawyer-approved open agreements from **Common Paper** (commonpaper.com) and **Bonterms**:
     - Common Paper Cloud Service Agreement (CSA).
     - Common Paper Data Processing Addendum (DPA) with Standard Contractual Clauses (SCCs).
   - These are industry-standard, legally vetted, and 100% free for startups to use.

### 4.3 Real Enterprise SSO on Zero Budget: BoxyHQ (Jackson)
Instead of advertising non-existent SAML/SCIM:
1. **Deploy BoxyHQ Jackson ($0)**:
   - BoxyHQ Jackson is an open-source, self-hosted service that translates enterprise SAML 2.0 (Okta, Microsoft Entra ID, Google Workspace) into standard OAuth 2.0 / OIDC.
   - Run BoxyHQ as a Docker container on the Oracle Always Free instance (consumes ~150MB RAM).
2. **Connect to Supabase / Auth Flow**:
   - Supabase Auth supports custom OIDC providers.
   - Point Supabase to the local BoxyHQ instance.
   - Enterprise users enter their corporate domain (`@company.com`), are redirected to their Okta/Azure login screen, and return authenticated.

---

## 5. Monetization & Financial Operations: Global Stripe Infrastructure ($0 Fixed Cost)

Replace the disabled Razorpay integration with a production-grade, global **Stripe Billing** engine. Stripe costs **$0.00 / month fixed**, only taking a standard fee when money is made.

```
+---------------------------------------------------------------------------------------------------+
|                                   STRIPE BILLING LIFECYCLE ($0 FIXED)                              |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|  [ User clicks "Upgrade" ] ──► [ POST /api/v1/billing/create-checkout-session ]                   |
|                                       │                                                           |
|                                       ├──► Stripe Hosted Checkout (Cards, Apple Pay, Google Pay)  |
|                                       │                                                           |
|  [ Successful Payment ] ──────────────┴──► Webhook: `customer.subscription.created`               |
|                                                   │                                               |
|  [ Stripe Customer Portal ] ◄─────────────────────┼──► Database: UserSubscription(is_pro=True)   |
|  (1-Click Cancel, Upgrade,                        │                                               |
|   Update Cards, Invoices)                         └──► Celery: Send Welcome Email via Resend      |
+---------------------------------------------------------------------------------------------------+
```

### 5.1 Architecture & Implementation Details:
1. **Stripe Checkout Integration**:
   - In `app/routers/billing.py`, replace Razorpay logic with `stripe.checkout.Session.create`:
     ```python
     session = stripe.checkout.Session.create(
         customer_email=user_email,
         payment_method_types=["card"],
         line_items=[{"price": STRIPE_PRO_PRICE_ID, "quantity": 1}],
         mode="subscription",
         success_url=f"{FRONTEND_URL}/dashboard/billing?session_id={{CHECKOUT_SESSION_ID}}",
         cancel_url=f"{FRONTEND_URL}/dashboard/billing",
         automatic_tax={"enabled": True},
     )
     ```
2. **Stripe Customer Portal**:
   - Implement `POST /api/v1/billing/create-portal-session`:
     ```python
     portal_session = stripe.billing_portal.Session.create(
         customer=stripe_customer_id,
         return_url=f"{FRONTEND_URL}/dashboard/billing",
     )
     return {"portal_url": portal_session.url}
     ```
   - Eliminates the amateurish "email support@anuvaad.dev to cancel" message. Users can manage billing, download tax invoices, and cancel with one click.
3. **Idempotent Webhook Processing**:
   - Route `POST /api/v1/billing/webhook` through `PaymentTransaction` table to guarantee idempotency.
   - Handle `invoice.payment_succeeded`, `customer.subscription.updated`, and `customer.subscription.deleted`.

---

## 6. Observability, Reliability & Telemetry ($0 / Month)

Replace in-memory Prometheus counters and console logs with a world-class, unified observability stack.

### 6.1 Unified Tracing & Metrics: Grafana Cloud Free Tier
- **Allocation**: 10,000 metric series, 50 GB logs, 50 GB traces (Tempo), 3 dashboards — **Perpetually Free ($0.00)**.
- **Implementation**:
  - Install OpenTelemetry Python SDK: `opentelemetry-distro`, `opentelemetry-exporter-otlp`.
  - In `app/main.py`, initialize OTel tracer pointing to Grafana Cloud's OTLP gRPC endpoint.
  - Automatically traces all FastAPI route executions, SQLAlchemy database queries, Redis commands, and outgoing Groq API calls.

### 6.2 Uptime Monitoring & Public Status Page: Better Stack
- **Allocation**: 10 monitors, 3-minute check intervals, public status page at `status.anuvaad.dev` — **Perpetually Free ($0.00)**.
- **Implementation**:
  - Configure HTTP HEAD probes against `https://api.anuvaad.dev/api/v1/health` and `https://anuvaad.dev`.
  - Public status page displays live 90-day uptime metrics and incident history.
  - Configures email/SMS alerts to the founder if downtime occurs.

---

## 7. Developer Distribution, Ecosystem & Public Registries ($0)

A real startup meets developers in their native terminal and IDE environments.

### 7.1 Public CLI Distribution via npm & Homebrew
1. **Build & Publish `@anuvaad/cli` to npm ($0)**:
   - In [`cli/`](file:///c:/Users/tarun/Anuvaad/Anuvaad/cli), configure TypeScript build output to `dist/index.js`.
   - Add shebang `#!/usr/bin/env node`.
   - Publish to npm:
     ```bash
     npm publish --access public
     ```
   - Any developer worldwide can now run:
     ```bash
     npx @anuvaad/cli translate file.py --to rust
     ```
2. **Create Homebrew Tap on GitHub ($0)**:
   - Create a public GitHub repository: `github.com/anuvaad/homebrew-tap`.
   - Add `anuvaad.rb` formula pointing to the compiled npm release.
   - Developers install via:
     ```bash
     brew install anuvaad/tap/anuvaad
     ```

### 7.2 Visual Studio Marketplace Extension Release
1. **Fix Extension & Build (`vscode-extension/`)**:
   - Align payload fields (`raw_code` and `language`).
   - Package extension using `@vscode/vsce`:
     ```bash
     npx @vscode/vsce package
     ```
2. **Publish to Marketplace ($0)**:
   - Create a free publisher account on `marketplace.visualstudio.com`.
   - Publish extension:
     ```bash
     npx @vscode/vsce publish
     ```
   - Millions of developers can now install Anuvaad directly from the VS Code Extensions panel (`Ctrl+Shift+X` ➔ "Anuvaad").

---

## 8. Master 8-Week Phased Implementation Roadmap

```
+---------------------------------------------------------------------------------------------------+
|                        8-WEEK ZERO-BUDGET COMMERCIAL TRANSFORMATION ROADMAP                       |
+---------------------------------------------------------------------------------------------------+
|                                                                                                   |
|  SPRINT 1 (WEEKS 1-2): INTEGRITY & FOUNDATION                                                    |
|  ├── Task 1.1: Provision Oracle Cloud Always Free (4 vCPU / 24GB RAM) with Docker Compose.        |
|  ├── Task 1.2: Remove fake testimonials, fake SOC2/HIPAA badges, and dead Three.js/Lenis code.    |
|  ├── Task 1.3: Wire LivePlayground to real streaming demo endpoint (Groq API, 10 calls/IP/day).  |
|  └── Task 1.4: Decommission Render keep-alive cron; enable permanent Celery workers on Oracle.    |
|                                                                                                   |
|  SPRINT 2 (WEEKS 3-4): MONETIZATION & REAL GITHUB APP                                             |
|  ├── Task 2.1: Implement Stripe Billing, Stripe Checkout, and Stripe Customer Portal ($0 fixed).  |
|  ├── Task 2.2: Register and deploy the official Anuvaad GitHub App with webhook listener.        |
|  ├── Task 2.3: Implement live PR diff analysis and inline code suggestions via GitHub REST API.   |
|  └── Task 2.4: Connect Better Stack uptime monitoring and launch public `status.anuvaad.dev`.    |
|                                                                                                   |
|  SPRINT 3 (WEEKS 5-6): VERIFIABLE BENCHMARKS & WASM SANDBOX                                      |
|  ├── Task 3.1: Build `.github/workflows/eval-benchmarks.yml` running weekly HumanEval test runs. |
|  ├── Task 3.2: Wire `<BenchmarkExplorer />` to real committed `benchmarks-latest.json` proofs.   |
|  ├── Task 3.3: Implement client-side WebAssembly (Pyodide & QuickJS) sandboxed code execution.    |
|  └── Task 3.4: Deploy BoxyHQ Jackson container on Oracle for open-source SAML 2.0 / SCIM SSO.    |
|                                                                                                   |
|  SPRINT 4 (WEEKS 7-8): DISTRIBUTION & PUBLIC LAUNCH                                              |
|  ├── Task 4.1: Publish `@anuvaad/cli` to npm and GitHub Homebrew tap.                            |
|  ├── Task 4.2: Publish `anuvaad-vscode` extension to Microsoft Visual Studio Code Marketplace.   |
|  ├── Task 4.3: Deploy interactive documentation hub on Cloudflare Pages using Nextra/Starlight.   |
|  └── Task 4.4: Public Launch: Show HN ("Show HN: Anuvaad – Open-Source AST Code Translator") &   |
|                Product Hunt Launch Campaign.                                                      |
+---------------------------------------------------------------------------------------------------+
```

---

## 9. Quantitative KPI Scorecard & Zero-Budget Guardrails

| Metric Domain | Baseline (Current) | Target (Week 8 Launch) | Guardrail & Verification Method |
|---|:---:|:---:|---|
| **Monthly Hosting Burn** | **$0.00** | **$0.00** | Strict verification: zero paid cloud invoices; 100% on perpetual free tiers. |
| **API Availability (SLA)** | ~85% (Due to sleep/off-peak downtime) | **99.95%+** | Better Stack synthetic HTTP probes checking `status.anuvaad.dev` every 3 min. |
| **P50 Streaming Latency** | Synthetic `Math.random` (1.2s) | **<800ms Real** | OpenTelemetry spans tracking real Groq API time-to-first-token. |
| **Benchmark Accuracy** | 99.6% (Hardcoded static data) | **Verifiable pass@1** | Real HumanEval & MBPP pass rates committed to git with execution logs. |
| **Background Task Loss** | Risk of 100% loss during restart | **0.0% Task Loss** | Persistent Redis queue with Celery autoretry and Dead Letter Queues (DLQ). |
| **Public Distribution** | 0 external users | **1,000+ Installs** | npm registry downloads + VS Code Marketplace installation telemetry. |
| **Paid Conversions** | 0 (Billing disabled) | **10+ Pro Users** | Stripe Billing dashboard; $190–$490 MRR with zero merchant subscription fee. |

---

## 10. Conclusion

A startup's credibility is not measured by the size of its seed round, but by the **rigor of its engineering and the honesty of its product delivery**.

By abandoning the brittle keep-alive workarounds, dismantling the simulated front-of-house mockups, and leveraging the immense power of **Oracle Always Free compute, Cloudflare Edge networks, Stripe's zero-fixed-cost billing, client-side WebAssembly execution, and automated GitHub Actions evaluation harnesses**, Anuvaad can legitimately stand shoulder-to-shoulder with venture-backed developer tools—**without spending a single dollar.**

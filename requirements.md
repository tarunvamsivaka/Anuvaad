# Anuvaad Modernization — Development Requirements Specification

This document defines the complete set of Model Context Protocol (MCP) servers, developmental skills, execution tools, system permissions, and operational controls required by the AI agent to execute the Anuvaad repository modernization and rebuild plan.

---

## 1. Required MCP Servers

To support design operations, UI mocking, screen generation, and design system synchronization throughout the modernization cycle, the following MCP servers are required:

| Server | Type | Purpose | Key Tools Utilized |
|---|---|---|---|
| **StitchMCP** | UI & Design | Orchestrates user interface screen design, variant generation, and layout alignment. Required for the Awwwards-level Landing Page and Dashboard Overview redesigns. | `create_project`, `get_project`, `list_projects`, `list_screens`, `get_screen`, `generate_screen_from_text`, `edit_screens`, `generate_variants`, `upload_design_md`, `create_design_system`, `create_design_system_from_design_md`, `update_design_system`, `list_design_systems`, `apply_design_system` |

---

## 2. Required Skills

Executing the modernization plan demands a precise set of architectural and domain-specific skills. The following specialized skills are designated for development tasks:

### A. Core Development & Guidance
*   **modern-web-guidance-plugin**:
    *   *Role*: Provides strict rules for styling layouts, ensuring styling follows the Vanilla CSS custom property token structure (`color.css`, `typography.css`, etc.) inside the `src/design/` path.
    *   *Usage*: Validates Next.js 16/App Router components, React 19 concurrent features, and ensures SEO best practices (metadata, OG images, titles, semantic HTML5 tags).
*   **chrome-devtools-plugin** (or browser diagnostics):
    *   *Role*: Enables runtime DOM inspection, visual diagnostic audits, and performance checks.
    *   *Usage*: Debugging the 6,000-particle scroll-morph system in Three.js and ensuring GSAP animations render smoothly without layout shifts.

### B. Workspace & Script Automation
*   **uv**:
    *   *Role*: Validates Python packaging, environment parameters, and dependencies.
    *   *Usage*: Managing the backend packages (FastAPI, Pydantic, Redis clients) and dependencies for testing.
*   **workflow-skill-creator**:
    *   *Role*: Distills and packages development workflows into reusable, programmatic scripts.
    *   *Usage*: Creating automated routines for running tests, database schema validation checks, and build validations.

---

## 3. Required Tools

The following file-system, exploration, and execution tools are required to perform the refactoring, compilation, and testing steps:

### A. Code Refactoring & File Manipulation
*   [view_file](file:///C:/Users/Dell/.gemini/antigravity-ide/mcp/default_api/view_file.json): Required to audit monolithic source files, check imports, and trace configurations.
*   [write_to_file](file:///C:/Users/Dell/.gemini/antigravity-ide/mcp/default_api/write_to_file.json): Required to initialize newly decomposed modules, hooks (e.g., `useTranslationStream`), and separate stylesheet files.
*   [replace_file_content](file:///C:/Users/Dell/.gemini/antigravity-ide/mcp/default_api/replace_file_content.json): Used for single contiguous updates to files like `next.config.ts` or `docker-compose.yml`.
*   [multi_replace_file_content](file:///C:/Users/Dell/.gemini/antigravity-ide/mcp/default_api/multi_replace_file_content.json): Used to modify multiple non-contiguous import lines and clean up dependencies across shared files.

### B. Search & Code Exploration
*   [list_dir](file:///C:/Users/Dell/.gemini/antigravity-ide/mcp/default_api/list_dir.json): Used to map directory structures during the feature-based transition.
*   [grep_search](file:///C:/Users/Dell/.gemini/antigravity-ide/mcp/default_api/grep_search.json): Locates symbol exports, shared hooks, and duplicate utility patterns (e.g., tracking `get_client_ip` duplicates).

### C. Execution & Verification
*   [run_command](file:///C:/Users/Dell/.gemini/antigravity-ide/mcp/default_api/run_command.json): Used to run test suites, check lints, run build scripts, and execute the compliance auditor:
    *   Backend verification: `pytest tests/`
    *   Frontend verification: `npm run build` or `npx playwright test`
    *   Compliance subagent: `python scripts/compliance_subagent.py`
*   [browser_subagent](file:///C:/Users/Dell/.gemini/antigravity-ide/mcp/default_api/browser_subagent.json): Used for end-to-end interactive UI verification. Automatically records WebP videos of the user interface to confirm visual animation correctness and layout transitions.

### D. Asset Creation & Scheduling
*   [generate_image](file:///C:/Users/Dell/.gemini/antigravity-ide/mcp/default_api/generate_image.json): Generates functional UI images and assets, avoiding the use of blank placeholders on landing and onboarding routes.
*   [schedule](file:///C:/Users/Dell/.gemini/antigravity-ide/mcp/default_api/schedule.json): Schedules one-shot reminders or background tasks during long E2E test runs or build compilations.

---

## 4. Required Permissions

To perform local builds, API verification, and directory manipulation, the development agent requires the following explicit permissions:

### A. Filesystem Read & Write Scope
*   **Workspace root (`f:\Anuvaad`)**: Full read/write access to manage all frontend, backend, test, and docker assets.
*   **AppData Directory (`C:\Users\Dell\.gemini\antigravity-ide\*`)**:
    *   Read/write access to `scratch/` for executing temporary scripts.
    *   Read/write access to `browser_recordings/` for saving WebP browser execution captures.
    *   Read/write access to `html_artifacts/` and `knowledge/` for reviewing documentation and historical logs.

### B. Command Execution Authority (Terminal)
*   Permission to execute powershell or cmd processes in `f:\Anuvaad` for the following commands and tools:
    *   `npm` / `node` / `npx` (for frontend dependency audit, linting, dev-server, and playwright).
    *   `python` / `pytest` / `pip` (for running backend tests, dependency audits, and the compliance script).
    *   `docker-compose` / `docker` (to spin up, reload, or tear down local cache and web server services).
    *   `git` (to review file changes, check branch differences, and coordinate versioning).

### C. Network Outbound Communication
To perform integration testing, database validation, and external services audits:
*   `read_url` and `execute_url` authority for:
    *   **Supabase (`supabase.co` / `supabase.com`)**: Database connection, PostgREST CRUD tests, GoTrue session verification.
    *   **Razorpay (`razorpay.com`)**: Mock checkout session testing and webhook event simulation.
    *   **Resend (`resend.com`)**: Outbound transactional email tests.
    *   **Groq / DeepSeek API endpoints**: Querying LLM streaming rates and confirming failure fallback chains.
    *   **PostHog (`posthog.com`)**: Validating consent boundaries and telemetry block rules.
    *   **GitHub (`api.github.com`)**: Validating Monaco Editor Gist imports.
    *   **Localhost (`127.0.0.1` / `localhost`)**: Testing server connections and reverse proxy routing rules.

---

## 5. Quality, Security & Operational Controls

To safeguard user data, enforce code quality, and maintain compliance standards, the following gates must be enforced:

### A. Credentials & Secret Concealment
*   **Strict Env Isolation**: All API credentials, JWT secrets, database connection URLs, and payment tokens must be isolated in the `.env` configuration file.
*   **Zero Leakage Rule**: No raw secret values or `.env` files may be printed in terminal outputs, written to public artifacts, or included in Sentry log outputs.

### B. Automated Compliance Gating
*   **Auditing Script**: The automated compliance auditor `scripts/compliance_subagent.py` must be executed before compiling release candidates.
*   **Audit Targets**:
    *   **Site Health**: Redis cache ping response and Supabase endpoint responsiveness.
    *   **Security Headers**: Inspecting CSP, X-Frame-Options, and CORS limits on Nginx and FastAPI router middlewares.
    *   **Broken Link Check**: Enforces that legal pages (`terms.html`, `privacy.html`) contain Next.js dynamic routing pathnames (`/`, `/terms`, `/privacy`) and validates external URLs.
    *   **Vulnerability Audit**: Compiles and parses `npm audit` weekly; locks deployment gating on *High* or *Critical* issues.

### C. Performance & Animation Boundaries
*   **WebGL Fallback**: Enforces that `WebGLCanvas.tsx` runs WebGL context detection; gracefully swaps with a CSS gradient backdrop if unavailable.
*   **Thread Optimization**: Ensures Three.js calculations are offloaded to an `OffscreenCanvas` inside a Web Worker thread (`particle.worker.ts`) to maintain 60fps main-thread rendering.
*   **Motion Accessibility**: All motion triggers must respect the browser's `prefers-reduced-motion` settings. Keyframe declarations must be wrapped inside `@media (prefers-reduced-motion: no-preference)`.

### D. Architectural Integrity & Safety Gates
*   **Thin Page Boundary**: Page files inside `src/app/` act strictly as client-side routers or layout shells. They must not contain internal business logic or state machines.
*   **Error Boundaries**: Route components must be wrapped in standard React `<ErrorBoundary>` containers to block blank-screen hydration failures and show recovery menus.
*   **Database Schema Drift Guard**: Mutating database executions must query columns dynamically via `get_history_columns()` to prevent PostgreSQL column mismatches due to schema modifications.

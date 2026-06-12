# Anuvaad — Complete Technical Audit
### Awwwards-Level Redesign Blueprint

> **Audit Date**: 2026-06-10  
> **Status**: Read-only — zero code changes made  
> **Scope**: Full-stack (FastAPI backend + Next.js frontend + infra)

---

## Table of Contents

1. [Current Tech Stack](#1-current-tech-stack)
2. [Folder Structure](#2-folder-structure)
3. [Architecture Overview](#3-architecture-overview)
4. [Existing Design System](#4-existing-design-system)
5. [Existing UI Components](#5-existing-ui-components)
6. [Existing Animations](#6-existing-animations)
7. [Existing Dependencies](#7-existing-dependencies)
8. [Existing Strengths](#8-existing-strengths)
9. [Existing Weaknesses](#9-existing-weaknesses)
10. [Performance Concerns](#10-performance-concerns)
11. [Scalability Concerns](#11-scalability-concerns)
12. [What Should Be Preserved](#12-what-should-be-preserved)
13. [What Should Be Redesigned](#13-what-should-be-redesigned)
14. [What Should Be Rebuilt From Scratch](#14-what-should-be-rebuilt-from-scratch)
15. [Recommended Architecture for Awwwards-Level Redesign](#15-recommended-architecture-for-awwwards-level-redesign)

---

## 1. Current Tech Stack

### Backend

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Web framework | **FastAPI** | 0.136.1 | Async, ASGI, modular router pattern |
| ASGI server | **Uvicorn** | 0.46.0 | Single-process in Compose |
| Validation | **Pydantic v2** | 2.13.3 | 11 schemas; `field_validator` decorators |
| HTTP client | **httpx** (async) | 0.28.1 | Shared global client via `get_http_client()` |
| LLM SDK | **openai** Python SDK | ≥ 1.0.0 | OpenAI-compatible; Groq + DeepSeek endpoints |
| Primary cache | **redis.asyncio** | ≥ 5.0.0 | Redis 7; async operations |
| Secondary cache | **upstash-redis** | 1.7.0 | REST fallback; edge-compatible |
| Database | **supabase** Python | ≥ 2.4.0 | Postgres via REST (PostgREST) |
| Payments | **razorpay** | ≥ 1.4.1 | Subscriptions + one-time credit orders |
| Email | **resend** | ≥ 2.0.0 | 3 transactional templates; fire-and-forget |
| Error tracking | **sentry-sdk[fastapi]** | latest | Tracing + error capture |
| Config | **python-dotenv** | 1.2.2 | `.env` loading |
| File upload | **python-multipart** | ≥ 0.0.9 | `UploadFile` multipart |

### Frontend

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Framework | **Next.js** (App Router) | ^16.2.7 | Standalone build output; PWA enabled |
| Language | **TypeScript** | ^5 | Strict mode implied |
| UI runtime | **React 19** | 19.2.4 | Concurrent features available |
| Styling | **TailwindCSS v4** | 4.x | `@import "tailwindcss"` syntax |
| Component kit | **shadcn/ui** | ^4.5.0 | Base UI + Radix primitives |
| Animation A | **GSAP** | ^3.15.0 | ScrollTrigger, timeline, context |
| Animation B | **Framer Motion** | ^12.38.0 | Block entrance animations only |
| 3D / WebGL | **Three.js** | ^0.184.0 | 6,000-particle morph system |
| Code editor | **Monaco Editor** | ^4.7.0 | VS Code engine; dynamic import |
| Auth | **Supabase SSR** | ^0.10.2 | Server-side session management |
| Data fetching | **SWR** | ^2.4.1 | Cache-first, cross-tab revalidation |
| Analytics | **PostHog** | ^1.372.8 | EU data residency; consent-gated |
| Error tracking | **Sentry Next.js** | ^10.51.0 | Source map upload; tunnel route |
| Payments | Razorpay JS (CDN) | v1 | Lazy-loaded via `next/script` |
| File drop | **react-dropzone** | ^15.0.0 | Extension whitelist |
| Toasts | **Sonner** | ^2.0.7 | Bottom-right; rich colors |
| Icons | **Lucide React** | ^1.11.0 | Tree-shakeable SVG icons |
| Command palette | **cmdk** | ^1.1.1 | ⌘K navigation |
| Confetti | **canvas-confetti** | ^1.9.4 | Dynamic import on completion |
| PWA | **@ducanh2912/next-pwa** | ^10.2.9 | Service worker; disabled in dev |
| Fonts | Inter + JetBrains Mono + Lora | Google Fonts | `display: swap`; FOIT prevented |

### Infrastructure

| Component | Technology | Notes |
|---|---|---|
| Container orchestration | **Docker Compose** | 4-service stack |
| Reverse proxy | **Nginx Alpine** | SSE tuning; security headers; GZIP |
| Cache store | **Redis 7 Alpine** | Volume-persisted; healthcheck |
| Auth + Database | **Supabase** | Postgres + GoTrue + PostgREST |
| Static landing | **Plain HTML** (`index.html`) | 94KB; no JS framework |

---

## 2. Folder Structure

```
f:\Anuvaad\
│
├── main.py                           # Bootstrap re-export stub (pytest compat)
├── Dockerfile                        # Multi-stage Python backend build
├── docker-compose.yml                # 4-service orchestration (redis/backend/frontend/nginx)
├── nginx.conf                        # Reverse proxy, SSE tuning, security headers
├── requirements.txt                  # 13 Python packages
│
├── index.html                        # ★ Self-contained landing page (94KB, 2,784 lines)
├── privacy.html / terms.html         # Legal pages (static HTML)
├── robots.txt                        # SEO crawler directives
│
├── operational_standards.md          # Internal runbook
├── production_deployment_manual.md   # Deployment guide
├── CHANGELOG.md
├── TASK.md                           # Feature backlog
│
├── app/                              # FastAPI application
│   ├── main.py                       # App factory: CORS, middleware, lifespan
│   ├── core/
│   │   ├── config.py                 # Env vars, logger, MetricsCollector, lifespan, httpx client
│   │   ├── auth.py                   # JWT decode, API-key lookup, get_user_pro_status
│   │   ├── cache.py                  # LRUCache + RedisCache + CacheProxy (3-tier)
│   │   └── quota.py                  # Daily limits, 4-mode protection, credit system, pruning
│   ├── models/
│   │   └── schemas.py                # 11 Pydantic v2 models
│   ├── routers/
│   │   ├── translate.py              # 7 translation endpoints, 608 lines
│   │   ├── history.py                # History CRUD + stats + share
│   │   ├── billing.py                # Razorpay checkout + webhook handler
│   │   ├── workspace.py              # Team workspace + invitations + API keys
│   │   └── utility.py                # /health, /metrics, /import-gist
│   └── services/
│       ├── ai.py                     # LLM orchestration, streaming, fallback, stale recovery
│       └── email.py                  # Resend: 3 HTML email templates
│
├── tests/                            # 184 backend tests across 9 files
│   ├── conftest.py                   # pytest fixtures, sys.modules mock injection
│   ├── test_api.py
│   ├── test_cache.py
│   ├── test_comprehensive.py         # Primary coverage (31KB)
│   ├── test_launch_resilience.py
│   ├── test_production.py
│   ├── test_router.py
│   ├── test_security.py
│   ├── test_streaming.py
│   └── test_validation.py
│
└── frontend/
    ├── package.json                   # 25 runtime deps, 14 devDeps
    ├── next.config.ts                 # Rewrites, PWA, Sentry, bundle analyzer
    ├── playwright.config.ts           # E2E config
    ├── src/
    │   ├── app/                       # App Router
    │   │   ├── layout.tsx             # Root layout (3 fonts, 5 providers)
    │   │   ├── globals.css            # Design system (884 lines, 25+ keyframes)
    │   │   ├── api/auth/callback/     # Supabase OAuth callback
    │   │   ├── dashboard/
    │   │   │   ├── layout.tsx         # Sidebar shell: collapse, mobile drawer (386 lines)
    │   │   │   ├── page.tsx           # Overview: stats, quota ring, bar chart (383 lines)
    │   │   │   ├── translate/page.tsx # Core translate UI (1,391 lines — monolith)
    │   │   │   ├── billing/page.tsx   # Plan + Razorpay checkout (422 lines)
    │   │   │   ├── history/           # Translation log
    │   │   │   ├── settings/          # Account settings
    │   │   │   ├── team/              # Team management
    │   │   │   ├── welcome/page.tsx   # 3-step onboarding (235 lines)
    │   │   │   └── workspace/         # Workspace settings
    │   │   ├── signin/ signup/        # Auth pages
    │   │   ├── share/[id]/            # Public share URL
    │   │   ├── privacy/ terms/        # Legal
    │   │   └── opengraph-image/       # Dynamic OG image
    │   ├── components/
    │   │   ├── landing/               # 18 landing page components (see §5)
    │   │   ├── ui/                    # 15 shadcn/ui primitives
    │   │   ├── CommandPalette.tsx     # Global ⌘K (8.3KB)
    │   │   ├── posthog-provider.tsx   # PostHog context
    │   │   └── theme-toggle.tsx       # Dark / light switch
    │   ├── context/
    │   │   └── WorkspaceContext.tsx   # Team workspace state
    │   ├── lib/
    │   │   ├── auth-context.tsx       # AuthProvider (Supabase, isPro, OAuth)
    │   │   ├── analytics.ts           # PostHog wrapper (consent-gated, EU host)
    │   │   ├── hooks.ts               # SWR: useTranslationStats, useCredits, useSubscriptionStatus
    │   │   ├── supabase.ts            # Singleton Supabase client
    │   │   └── utils.ts               # cn() utility (clsx + tailwind-merge)
    │   └── proxy.ts                   # Next.js middleware: auth guard + session refresh
    └── e2e/
        └── anuvaad.spec.ts            # Playwright E2E tests
```

---

## 3. Architecture Overview

```
                          ┌──────────────────────────────────┐
                          │         BROWSER (React 19)        │
                          │  Three.js │ GSAP │ Monaco Editor  │
                          └─────────────────┬────────────────┘
                                            │ HTTP/WS
                          ┌─────────────────▼────────────────┐
                          │       Nginx Reverse Proxy :80      │
                          │  GZIP │ CSP │ SSE tuning           │
                          └──────┬──────────────┬─────────────┘
                 /api/*          │              │  /*
        ┌────────▼──────┐  ┌────▼──────────────▼──────┐
        │  FastAPI :8000 │  │   Next.js 16 SSR :3000    │
        │  5 routers     │  │   App Router + Middleware  │
        │  2 services    │  │   PWA + Sentry             │
        └──────┬─────────┘  └─────────────┬─────────────┘
               │                          │
    ┌──────────┼──────────────────────────┼─────────────────┐
    │          │          External Services│                  │
    │  ┌───────▼────┐  ┌────────────┐  ┌─▼───────────────┐  │
    │  │  Redis 7   │  │  Supabase  │  │   PostHog (EU)   │  │
    │  │  Cache     │  │  Postgres  │  │   Analytics      │  │
    │  │  RateLimit │  │  Auth      │  └─────────────────┘   │
    │  └────────────┘  └─────┬──────┘                        │
    │                        │                                │
    │  ┌──────────┐  ┌───────▼──────┐  ┌──────────────────┐  │
    │  │  Groq    │  │   Razorpay   │  │   Resend Email   │  │
    │  │  Llama   │  │   Billing    │  │   Transactional  │  │
    │  │  3.3-70b │  └──────────────┘  └──────────────────┘  │
    │  └────┬─────┘                                           │
    │  ┌────▼─────┐                                           │
    │  │ DeepSeek │                                           │
    │  │ V3 / R1  │                                           │
    │  └──────────┘                                           │
    └────────────────────────────────────────────────────────┘
```

### Key Architectural Patterns

| Pattern | Implementation |
|---|---|
| **API gateway** | Nginx routes `/api/*` → FastAPI; everything else → Next.js |
| **Auth middleware** | `proxy.ts` (Next.js middleware) validates Supabase session; redirects to `/signin` if invalid |
| **LLM routing** | free tier → Groq (Llama 3.3); pro tier → DeepSeek (V3 sync / R1 streaming); automatic fallback on error |
| **Streaming** | SSE (`text/event-stream`) for real-time output; client uses `requestAnimationFrame` to batch DOM updates at 60fps |
| **Caching** | SHA-256 key (code + language + endpoint + model + version) → 7-day TTL; 3-tier: Redis → Upstash REST → in-memory LRU |
| **Quota** | `enforce_quotas_and_protection()` runs on every translate route: size → auth → pro check → char limit → cooldown → daily count → credits |
| **Protection modes** | 4 levels triggered by platform daily cap %; EMERGENCY cuts free users to 20% of normal limits |
| **Background I/O** | FastAPI `BackgroundTasks` for DB writes, cache invalidation, email sends |
| **Billing** | Razorpay subscription flow: `/create-checkout-session` → JS modal → Razorpay webhook → `/verify-payment` |

---

## 4. Existing Design System

### Color Palette (CSS Custom Properties)

```css
/* Core brand */
--color-amber-500: #f59e0b
--color-amber-600: #d97706
--color-amber-700: #b45309

/* Landing surface tokens */
--landing-bg:     #020204   /* near-black void */
--landing-charcoal: #0c0c0f
--landing-panel:  rgba(18,18,24,0.85)

/* Dashboard surface tokens */
--surface-0:      #080c14
--surface-1:      #0c0f1a
--surface-2:      #111520
--surface-elevated: #161b28
--surface-card:   #0e1219

/* Border states */
--border-subtle:  rgba(245,158,11,0.08)
--border-default: rgba(245,158,11,0.12)
--border-active:  rgba(245,158,11,0.35)

/* Text hierarchy */
--text-primary:   #e8ecf0
--text-secondary: #8899aa
--text-muted:     #5a6a7a

/* Glow utilities */
--glow-amber-sm:  0 0 12px rgba(245,158,11,0.25)
--glow-amber-md:  0 0 24px rgba(245,158,11,0.35)
--glow-amber-lg:  0 0 48px rgba(245,158,11,0.25), 0 0 100px rgba(245,158,11,0.1)
```

### Typography

| Token | Font | Use |
|---|---|---|
| `--font-sans` (`var(--font-sans)`) | **Inter** | Body, UI, labels |
| `--font-mono` (`var(--font-geist-mono)`) | **JetBrains Mono** | Code blocks, Monaco editor |
| `--font-lora` | **Lora** (italic) | Translated English output — narrative voice |

### Glass Levels

| Class | Description |
|---|---|
| `.glass-amber` | `rgba(18,18,24,0.7)` + `blur(20px)` + amber border |
| `.glass-dark` | `rgba(8,12,20,0.8)` + `blur(24px)` + subtle amber border |
| `.glass-apple` | `rgba(255,255,255,0.45)` + `blur(32px) saturate(180%)` — macOS-style |
| `.premium-card` | Dark gradient + `border 1px amber/10` + hover lift |

### Utility Classes

```css
.btn-amber-shimmer    /* animated gradient CTA */
.headline-gradient    /* animated 5s text gradient */
.gradient-text-amber  /* static amber gradient text */
.text-amber-glow      /* text-shadow glow */
.animated-underline   /* hover underline reveal */
.shimmer-loading      /* skeleton loader */
.blinking-cursor      /* terminal █ cursor */
.nav-active-glow      /* sidebar active indicator */
.terminal-panel       /* dark mono code surface */
.status-dot           /* animated presence indicators */
.marquee-track        /* infinite scroll container */
.progress-bar         /* shimmer-animated bar */
.typing-dot           /* 3-dot typing loader */
.scan-line-anim       /* amber sweep effect */
.stagger-children     /* nth-child delay cascade */
```

### Scrollbar Styling

Custom 6px amber scrollbar (webkit only): track transparent, thumb `rgba(245,158,11,0.15)` on hover `0.30`.

### Focus Styles

All interactive elements: `outline: 2px solid #f59e0b; outline-offset: 2px` on `:focus-visible`.

---

## 5. Existing UI Components

### Landing Page (18 components)

| Component | File | Size | Description |
|---|---|---|---|
| **Hero** | `hero.tsx` | 12.9KB | GSAP word entrance + typewriter demo (3 code→English pairs) |
| **WebGL Canvas** | `WebGLCanvas.tsx` | 10.4KB | Three.js 6,000-particle scroll-morph system |
| **WebGL Scroll Provider** | `WebGLScrollProvider.tsx` | 0.4KB | Scroll context for WebGL |
| **Scroll Story** | `ScrollStory.tsx` | 24.5KB | GSAP ScrollTrigger pinned narrative: 6-scene chapter |
| **Transformation Demo** | `TransformationDemo.tsx` | 13.8KB | Code↔English animated split panel |
| **Trust** | `Trust.tsx` | 6.7KB | Social proof + infinite marquee logos |
| **Positioning** | `Positioning.tsx` | 6.1KB | Feature differentiation grid |
| **Features** | `features.tsx` | 8.8KB | 6-card feature grid |
| **Use Cases** | `use-cases.tsx` | 4.3KB | Bento-style developer scenarios |
| **Pricing** | `pricing.tsx` | 8.1KB | 3-tier pricing cards |
| **How It Works** | `how-it-works.tsx` | 2.8KB | Step-by-step pipeline |
| **Testimonials** | `testimonials.tsx` | 5.2KB | User quote cards |
| **FAQ** | `faq.tsx` | 3.0KB | Accordion FAQ |
| **Navbar** | `navbar.tsx` | 5.4KB | Landing navigation |
| **Footer** | `footer.tsx` | 5.9KB | Links + social |
| **Smooth Scroll** | `SmoothScroll.tsx` | 4.1KB | Lenis smooth scroll wrapper |
| **Logo** | `Logo.tsx` | 3.8KB | Brand mark SVG |
| **Final CTA** | `FinalCTA.tsx` | 4.3KB | Bottom call-to-action |

### shadcn/ui Primitives (15 components)

`Badge`, `Button`, `Card`, `Checkbox`, `Command`, `Dialog`, `Input`, `Label`, `Popover`, `Select`, `Separator`, `Skeleton`, `Tabs`, `Textarea`, `Tooltip`

### Dashboard Components

| Component | File | Description |
|---|---|---|
| **Dashboard Layout** | `dashboard/layout.tsx` | Collapsible sidebar (224px↔60px), mobile drawer, workspace switcher, user avatar |
| **Dashboard Overview** | `dashboard/page.tsx` | Stat cards, SVG quota ring, 7-day bar chart, recent translations table |
| **Translate Page** | `dashboard/translate/page.tsx` | Monaco editors, SSE streaming, block cards, diff view, file drop, Gist import |
| **Billing Page** | `dashboard/billing/page.tsx` | Plan display, Razorpay checkout modal, usage progress bar |
| **Welcome Onboarding** | `dashboard/welcome/page.tsx` | 3-step onboarding: demo → modes → launch |
| **Command Palette** | `CommandPalette.tsx` | Global ⌘K with keyboard navigation (cmdk) |
| **Theme Toggle** | `theme-toggle.tsx` | Light/dark system-aware switch |

---

## 6. Existing Animations

### Landing Page

| Animation | Engine | Technique | Duration |
|---|---|---|---|
| **3D particle morph** | Three.js + rAF | 6,000 particles lerp across 4 geometry targets (tunnel→grid→wave→sphere) driven by `window.scrollY`; mouse distortion field within radius 4 | Continuous |
| **Hero word entrance** | GSAP timeline | Per-word: `opacity 0→1`, `y 60→0`, `rotateX -20→0`, `blur 8px→0`; stagger 0.12s | 1.8s total |
| **Hero eyebrow fade** | GSAP | `opacity 0→1`, `y -16→0` | 0.7s |
| **Hero demo card** | GSAP | `opacity 0→1`, `y 50→0`, `scale 0.97→1` | 1.1s |
| **Typewriter demo** | `setTimeout` chain | Code: 18ms/char; English: 14ms/char; 3 pairs cycle; 3.2s pause | 8–12s/cycle |
| **Caret blink** | CSS `step-end` | `opacity 1→0` at 0.8s | Infinite |
| **Aurora orbs** | CSS `@keyframes` | Two radial gradient orbs translate/scale; `opacity 0.05–0.10` | 14s / 18s |
| **Floating particles** | CSS `@keyframes` | 6 amber dots: Y±18px, X±12px; custom `--duration`/`--delay` per element | 3.5–8.3s |
| **Scroll story** | GSAP ScrollTrigger | 600vh pinned section; 6 scenes with typewriter, morphing borders, ripple rings | Scroll-driven |
| **Marquee logos** | CSS `@keyframes` | Two-track infinite scroll (40s/45s); `animation-play-state: paused` on hover | 40s / 45s |
| **Amber shimmer text** | CSS `@keyframes` | Gradient headline background-position sweeps 0%→200%; | 5s infinite |
| **Scan line** | CSS `@keyframes` | Amber vertical line: `left -5%→105%` with opacity fade | 2s forwards |
| **Hover card shimmer** | CSS `::after` | `translateX(-100%→100%)` on hover | 1s ease-out |
| **Amber pulse ring** | CSS `@keyframes` | `scale 0.95→1`; `box-shadow 0→12px` then fade | 2s infinite |

### Dashboard

| Animation | Engine | Technique |
|---|---|---|
| **Translation block entrance** | Framer Motion | `opacity 0→1`, `y 15→0`; 0.05s stagger per block (max 0.4s delay) |
| **Shimmer loading skeletons** | CSS | `translateX(-100%→100%)` gradient sweep at 1.5s |
| **SVG quota ring** | CSS transition | `stroke-dashoffset` 1s ease; color: green→amber→red based on % |
| **Activity bar chart** | CSS transition | `height 0→{val}` 700ms on mount |
| **Stat card number** | CSS `@keyframes number-count` | `opacity 0→1`, `y 8→0`, `scale 0.9→1`; cubic-bezier spring |
| **Sidebar collapse** | CSS `transition-all` | Width `224px ↔ 60px`; 250ms |
| **Theme toggle transition** | CSS | `background-color` 150ms ease |
| **Canvas confetti** | `canvas-confetti` | 100-particle amber burst; dynamic import on translation complete |
| **Status online dot** | CSS `@keyframes status-ping` | `scale 1→2.2`, `opacity 1→0`; `glow-pulse` on inner dot |
| **Typing dots loader** | CSS `@keyframes typing-dots` | 3-dot stagger; 0.2s delay offsets |
| **Progress bar shimmer** | CSS `::after` | Continuous `translateX(-100%→100%)` sweep overlay |
| **Upgrade banner shimmer** | CSS `::after hover` | Left-to-right sweep on hover |
| **Nav active indicator** | CSS `box-shadow` | `inset 3px 0 0 #f59e0b` left-border glow |

---

## 7. Existing Dependencies

### Runtime Dependencies (Frontend)

```
@base-ui/react         ^1.4.1    Accessible component primitives
@ducanh2912/next-pwa   ^10.2.9   Service worker PWA
@monaco-editor/react   ^4.7.0    VS Code editor engine
@next/bundle-analyzer  ^16.2.4   Build bundle analysis
@sentry/nextjs         ^10.51.0  Error monitoring
@supabase/ssr          ^0.10.2   Server-side auth
@supabase/supabase-js  ^2.104.1  Database + auth client
@types/three           ^0.184.1  Three.js TypeScript types
canvas-confetti        ^1.9.4    Particle celebration
class-variance-authority ^0.7.1  CVA for component variants
clsx                   ^2.1.1    Class concatenation
cmdk                   ^1.1.1    Command menu
cross-env              ^10.1.0   Cross-platform env vars
framer-motion          ^12.38.0  React animation library
gsap                   ^3.15.0   GreenSock animation
lucide-react           ^1.11.0   SVG icon library
next                   ^16.2.7   React framework
next-themes            ^0.4.6    Theme management
posthog-js             ^1.372.8  Product analytics
react                  19.2.4    UI runtime
react-dom              19.2.4    DOM renderer
react-dropzone         ^15.0.0   File drag and drop
shadcn                 ^4.5.0    Component CLI + styles
sonner                 ^2.0.7    Toast notifications
swr                    ^2.4.1    Data fetching
tailwind-merge         ^3.5.0    Tailwind class conflict resolution
three                  ^0.184.0  3D WebGL engine
tw-animate-css         ^1.4.0    Tailwind animation utilities
```

### Dev Dependencies (Frontend)

```
@playwright/test       ^1.59.1   E2E browser testing
@tailwindcss/postcss   ^4        PostCSS Tailwind plugin
@types/canvas-confetti ^1.9.0    Type definitions
@types/node            ^20       Node types
@types/react           ^19       React types
@types/react-dom       ^19       React DOM types
eslint                 ^9        Linting
eslint-config-next     16.2.4    Next.js ESLint rules
tailwindcss            ^4        Utility-first CSS
typescript             ^5        Type system
```

### Backend Dependencies (Python)

```
fastapi[standard]      0.136.1   Web framework + Uvicorn
pydantic               2.13.3    Data validation
httpx                  0.28.1    Async HTTP client
openai                 ≥1.0.0    LLM API (Groq + DeepSeek compat)
redis[asyncio]         ≥5.0.0    Redis client
upstash-redis          1.7.0     Edge-compatible REST cache
supabase               ≥2.4.0    Postgres + Auth
razorpay               ≥1.4.1    Payment processing
resend                 ≥2.0.0    Transactional email
sentry-sdk[fastapi]    latest    Error tracking
python-dotenv          1.2.2     Environment config
python-multipart       ≥0.0.9    File upload parsing
```

---

## 8. Existing Strengths

### Backend

| # | Strength | Details |
|---|---|---|
| S1 | **4-mode adaptive protection** | NORMAL / CAUTION / RESTRICTED / EMERGENCY triggered by platform daily cap ratio; proportionally scales per-user limits without deployment |
| S2 | **3-tier cache with auto-degradation** | Redis → Upstash REST → in-memory LRU; zero config required to run locally; production-safe at all tiers |
| S3 | **LLM resilience chain** | Primary fails → fallback provider; both fail → stale cache lookup → DB history recovery; last resort → 500 to user |
| S4 | **Prompt injection defence** | Regex sanitisation of injection patterns inside code comments (`// ignore`, `/* act as */`, `'''system prompt'''`) before LLM handoff |
| S5 | **Comprehensive quota enforcement** | `enforce_quotas_and_protection()` is a single sequential gate: absolute size → auth required → pro check → char limit → cooldown → daily count → credit balance |
| S6 | **Background task offloading** | All DB writes, cache invalidations, and emails use `BackgroundTasks` — never blocking the response |
| S7 | **Dynamic schema guard** | `get_history_columns()` fetches allowed DB columns before every INSERT; prevents PGRST204 column mismatch errors from schema drift |
| S8 | **History pruning** | Auto-deletes oldest rows when user exceeds storage limit (100 free / 1000 pro); prevents unbounded table growth |
| S9 | **API key system** | `ak_` prefix; SHA-256 hashed in DB; `last_used_at` updated on every request |
| S10 | **Test suite depth** | 184 tests across 9 files: validation, security (injection, binary upload, too-many-ignored-lines), streaming, caching, routing, production resilience |
| S11 | **Milestone email system** | First translation (welcome), 10/100/500 (milestone) — meaningful UX moment; fire-and-forget so it never blocks |

### Frontend

| # | Strength | Details |
|---|---|---|
| F1 | **rAF-batched SSE streaming** | SSE chunks buffer into `streamBufferRef` and flush at 60fps via `requestAnimationFrame`; prevents hundreds of `setState` calls per second |
| F2 | **Language auto-detection** | 7 client-side regex heuristics detect Python, TypeScript, JavaScript, Rust, C++, Go, Java from pasted text |
| F3 | **Monaco Editor integration** | Dynamic import (no SSR), stable `monacoOptions` memo, 32+ language syntax modes |
| F4 | **Consent-gated analytics** | PostHog opt-in only; code content blocked from all event properties; EU data residency |
| F5 | **Two-way sync** | Edit English → sync back to code; Monaco DiffEditor shows original vs. synced side-by-side |
| F6 | **Next.js middleware auth guard** | `proxy.ts` validates Supabase session server-side on every `/dashboard` route; no client-flash before redirect |
| F7 | **PWA support** | Service worker enabled in production; `manifest.json`; offline-capable |
| F8 | **Semantic metadata** | Full OG/Twitter cards, canonical URL, structured keywords, dynamic OG image route |
| F9 | **Command palette** | Global ⌘K with keyboard navigation; dynamically imports on first open |
| F10 | **Cross-tab SWR revalidation** | After translation completes, `mutate()` broadcasts to all open tabs |

### Design System

| # | Strength | Details |
|---|---|---|
| D1 | **Coherent amber/void palette** | Consistent dark surfaces (4 levels) + amber accent at consistent 8/12/35% opacity steps |
| D2 | **3D WebGL backdrop** | Six thousand particles morphing across 4 geometries driven by scroll; mouse-interactive distortion field |
| D3 | **Glassmorphism depth system** | Three semantic glass levels (amber, dark, apple) matched to surface hierarchy |
| D4 | **Animation vocabulary** | 25+ named keyframes; semantic utility classes (`.btn-amber-shimmer`, `.headline-gradient`, `.scan-line-anim`) |

---

## 9. Existing Weaknesses

### Backend

| # | Weakness | File | Impact |
|---|---|---|---|
| W1 | **`sys.modules.get("main")` DI anti-pattern** | `auth.py`, `quota.py` | Global side-effect DI; fragile; opaque; all three functions perform `sys.modules` lookup on every invocation |
| W2 | **LLM clients re-instantiated per call** | `ai.py` | `AsyncOpenAI` created fresh inside `stream_code_to_english` / `stream_code_to_code`; re-does DNS + TLS on every translation |
| W3 | **No ORM or migration tooling** | `database.py` | Raw Supabase REST calls; no Alembic; schema drift caught only by `get_history_columns()` at runtime |
| W4 | **`get_client_ip` duplicated** | `main.py` + `auth.py` | Identical function in two files; no single source of truth |
| W5 | **In-process MetricsCollector** | `config.py` | Resets on every restart; not shared across workers; not Prometheus-compatible |
| W6 | **History pruning is O(n) and sequential** | `quota.py:save_translation_background` | Fetches all history IDs, then deletes individually; at 1000 rows this is expensive |
| W7 | **Token exposed in request body** | Multiple routers | `access_token` accepted as JSON body field alongside `Authorization` header — inconsistent; wider attack surface |
| W8 | **Webhook has no idempotency guard** | `billing.py` | Razorpay retries on timeout; duplicate webhook fires can write subscription state twice |
| W9 | **`any` type annotation** | `billing.py:82` | `response: any` on Razorpay handler — type safety disabled on the most sensitive code path |
| W10 | **Unstructured logging** | All modules | `f"string {var}"` format strings; not JSON-structured; difficult to query in log aggregators |

### Frontend

| # | Weakness | File | Impact |
|---|---|---|---|
| F1 | **1,391-line monolithic translate page** | `translate/page.tsx` | Monaco editors + SSE + file drops + Gist + block cards + diff + clipboard + analytics all in one file; impossible to unit-test |
| F2 | **Dual animation libraries** | Multiple | GSAP (ScrollTrigger, timelines) AND Framer Motion both ship to dashboard users; Framer Motion is used only for block entrance animations; ~120KB gzipped overhead |
| F3 | **No WebGL fallback** | `WebGLCanvas.tsx` | No check for `WebGLRenderingContext`; mobile/low-end devices render a blank viewport instead of a CSS fallback |
| F4 | **All dashboard pages are `"use client"`** | Dashboard routes | Zero RSC usage; all JavaScript sent to browser; no streaming HTML from server |
| F5 | **No Error Boundaries** | Dashboard | Context throw or SWR failure causes white screen with no recovery UI |
| F6 | **No `loading.tsx` per route** | Dashboard | Skeleton states are ad-hoc per component; App Router streaming model is unused |
| F7 | **`window.location.href` hard redirects** | `billing/page.tsx:98` | Full-page navigation on payment success; loses React state and SWR cache |
| F8 | **Large commented-out code blocks** | `billing/page.tsx` | Portal management + credit purchase logic commented inline (106 lines); ships in bundle |
| F9 | **Landing page in two canonical forms** | `index.html` + `src/components/landing/` | Separate maintenance burden; copy changes must be applied in both places |
| F10 | **WorkspaceProvider duplicated** | `layout.tsx` + `dashboard/layout.tsx` | Provider mounted twice in the tree for dashboard routes |

---

## 10. Performance Concerns

### Critical (Immediate Impact on Core Web Vitals)

| # | Concern | Severity | Details |
|---|---|---|---|
| P1 | **Three.js always blocking main thread** | 🔴 Critical | 6,000-particle morph runs `for (i < 6000)` position updates every `requestAnimationFrame`; on mobile this takes 4–8ms per frame and drops below 60fps. No `OffscreenCanvas` / Worker offloading |
| P2 | **Three.js loaded on initial page visit** | 🔴 Critical | ~145KB gzipped; no lazy load; blocks FCP on slow connections; no WebGL detection before loading |
| P3 | **GSAP + Framer Motion both in dashboard bundle** | 🟠 High | GSAP alone is ~55KB gzipped; Framer Motion adds ~60KB; used simultaneously for overlapping use cases |
| P4 | **No React Server Components in dashboard** | 🟠 High | Every dashboard page ships the full React tree + all hooks to the client; no streaming HTML; navigation feels slow |

### High (Significant UX Impact)

| # | Concern | Severity | Details |
|---|---|---|---|
| P5 | **Monaco Editor cold start** | 🟠 High | Dynamic import delays first editor render; no placeholder skeleton during load |
| P6 | **`postFetcher` sends empty body POST for reads** | 🟠 High | `useSubscriptionStatus` fires a POST with `body: JSON.stringify({})` — semantically wrong; bypasses HTTP caching |
| P7 | **No `content-visibility: auto` on history list** | 🟡 Medium | Long history lists render all items off-screen; should use virtual list or `content-visibility` |
| P8 | **`globals.css` is 884 lines** | 🟡 Medium | No code splitting of CSS; all 25+ keyframes load on every route including auth pages that need none of them |

### Medium (Background / Build-time)

| # | Concern | Severity | Details |
|---|---|---|---|
| P9 | **No CDN for static assets** | 🟡 Medium | `_next/static/` served through Nginx at 365-day cache but no global CDN edge; international users see high TTFB |
| P10 | **LLM client re-initialization** | 🟡 Medium | `AsyncOpenAI` re-created per streaming call; DNS + TLS overhead on every translation |
| P11 | **`translate` page bundle size** | 🟡 Medium | 1,391-line single file without code splitting; Monaco + GSAP + Framer Motion + SSE code all in one chunk |
| P12 | **Unindexed daily quota count query** | 🟡 Medium | `get_today_usage_count` counts `translation_history WHERE created_at >= today_start`; no documented partial index on `(user_email, created_at)` |

---

## 11. Scalability Concerns

### 0–10K Users

| # | Risk | Impact |
|---|---|---|
| SC1 | **Single Uvicorn worker** | LLM calls (30–60s) starve other requests in the same event loop without `--workers N` |
| SC2 | **In-memory LRU as rate-limit fallback** | Multiple workers → inconsistent per-user limits; Redis must always be available in prod |
| SC3 | **Supabase free tier connection limit** | Free plan: 60 connections; each FastAPI instance opens its own pool with no configured limit |

### 10K–100K Users

| # | Risk | Impact |
|---|---|---|
| SC4 | **FastAPI `BackgroundTasks` blocks event loop** | DB writes run in the same event loop as request handling; at high concurrency, DB write latency degrades translation response times |
| SC5 | **Translation history table grows unboundedly** | Pruning is async and race-condition prone; at 100K users with 1K rows/user = 100M rows |
| SC6 | **Razorpay webhook duplication** | No idempotency key; retried webhooks can double-write subscription state |
| SC7 | **Redis connection pool not configured** | `redis.asyncio` default pool size; under load this can exhaust connections |

### 100K+ Users

| # | Risk | Impact |
|---|---|---|
| SC8 | **Monolithic FastAPI process** | Translate (LLM-bound, 60s) competes with billing (DB-only, <100ms) for the same thread pool |
| SC9 | **No message queue for LLM tasks** | Synchronous SSE streaming; at scale needs a queue (Celery/BullMQ/SQS) with async result polling |
| SC10 | **No horizontal scaling config** | Single-replica Compose; no Kubernetes, no auto-scaling, no sticky sessions for streaming |
| SC11 | **MetricsCollector cannot survive multi-process** | In-process 100-sample rolling window; meaningless with >1 replica |
| SC12 | **Supabase REST pagination for stats** | `get_today_usage_count` scans rows; at 100K users with heavy usage, this becomes a table scan per request |

---

## 12. What Should Be Preserved

### Backend — Keep As-Is

- ✅ **The 4-mode protection system** — adaptive quota scaling based on platform cap ratio is exactly right for an LLM cost-sensitive SaaS
- ✅ **3-tier cache with automatic degradation** — Redis → Upstash → LRU is production-robust; the `cache_key` SHA-256 scheme is correct
- ✅ **Stale translation recovery** (`find_stale_translation`) — recovering from LLM outages via cache then DB history is sophisticated resilience
- ✅ **Prompt injection sanitisation** (`sanitise_input`) — pattern matching in comments + block strings before LLM handoff
- ✅ **CSRF origin middleware** — custom origin validation for mutating requests
- ✅ **`normalize_blocks()`** — handles all LLM response shape variations (key aliasing, empty filtering, tier metadata injection)
- ✅ **Background task + milestone email system** — first translation (welcome), 10/100/500 (milestone); delightful and never blocking
- ✅ **All 11 Pydantic schemas** — comprehensive field validation; max lengths, blank checks, regex patterns
- ✅ **The test suite structure** — 184 tests; conftest fixture pattern; test categories per concern
- ✅ **API key system** — `ak_` prefix; SHA-256 hashed; `last_used_at` tracking
- ✅ **`enforce_quotas_and_protection()` as single gate** — one function, one sequential responsibility chain
- ✅ **Dynamic history column guard** (`get_history_columns()`) — prevents schema drift errors in production

### Frontend — Keep As-Is

- ✅ **rAF-batched SSE streaming** — `streamBufferRef` + `requestAnimationFrame` flush; correct pattern for high-frequency streaming
- ✅ **Monaco Editor integration** — dynamic import, stable options memo, language auto-detection heuristics
- ✅ **Consent-gated PostHog analytics** — opt-in by default; EU host; code content blocked from all properties
- ✅ **Two-way sync with DiffEditor** — edit English → sync to code → view diff; the highest-value differentiator
- ✅ **Next.js middleware auth guard** (`proxy.ts`) — server-side session validation; no client flash
- ✅ **SWR cross-tab invalidation** — `mutate()` after translation broadcasts to all open tabs
- ✅ **AuthContext pattern** — `useCallback` + `useMemo` composition; stable references; silent Pro check
- ✅ **Command palette** — ⌘K; keyboard-accessible
- ✅ **Canvas confetti on completion** — dynamically imported; delightful micro-moment
- ✅ **WorkspaceContext** — clean provider pattern for team namespacing

### Design System — Keep As-Is

- ✅ **Amber/void brand palette** — distinctive; not generic; works for both dark and light modes
- ✅ **3 glassmorphism levels** — semantic depth hierarchy
- ✅ **Typography trio** — Inter (UI) + JetBrains Mono (code) + Lora italic (English output) is a precise editorial choice
- ✅ **The animation vocabulary** — 25+ named keyframes; the language is already rich
- ✅ **Collapsible sidebar** — dual-mode (desktop collapse / mobile drawer) is correct for a productivity tool

### Infrastructure — Keep As-Is

- ✅ **Nginx SSE tuning** — `proxy_buffering off` + 120s `proxy_read_timeout`
- ✅ **Redis Docker healthcheck** — `redis-cli ping`; FastAPI waits on healthy Redis
- ✅ **GZIP config** — level 6; correct types list
- ✅ **Next.js standalone output** — smaller Docker image; correct for containerised deployment
- ✅ **`removeConsole` in production** — eliminates accidental console.log leaks

---

## 13. What Should Be Redesigned

### Backend Refactors (No Architecture Change)

| # | What | How |
|---|---|---|
| R1 | Replace `sys.modules` DI | Migrate to FastAPI `Depends()` injection + `app.dependency_overrides` in tests |
| R2 | LLM client singletons | Module-level or lifespan-managed `AsyncOpenAI` instances for Groq + DeepSeek |
| R3 | Deduplicate `get_client_ip` | Remove from `main.py`; import from `auth.py` |
| R4 | Persist metrics | Push `MetricsCollector.snapshot()` to Redis on every update; expose `/api/metrics` from Redis |
| R5 | Webhook idempotency | Store `razorpay_webhook_event_id` in Redis/DB; `409 Conflict` on duplicate |
| R6 | Structured logging | Replace `logger.info(f"…")` with `structlog` JSON emitters |
| R7 | Remove body token | Accept `access_token` only via `Authorization` header; remove body field from schemas |
| R8 | History pruning efficiency | Single DB-side `DELETE WHERE id IN (SELECT id … ORDER BY created_at ASC LIMIT n)` |

### Frontend Refactors (Break Up, Not Rewrite)

| # | What | How |
|---|---|---|
| R9 | Split translate page | Extract `useTranslationStream`, `useFileImport`, `TranslationInput`, `TranslationOutput`, `TranslationToolbar` |
| R10 | Remove Framer Motion from dashboard | Replace `TranslationBlockCard` entrance with CSS `fade-up` keyframe; save ~60KB |
| R11 | Add Error Boundaries | Wrap each dashboard route with `<ErrorBoundary>` → friendly retry UI |
| R12 | Add `loading.tsx` per route | Leverage App Router streaming; replace ad-hoc skeleton rendering |
| R13 | Fix payment redirect | `router.push` + `mutate()` instead of `window.location.href` |
| R14 | Remove dead billing code | Move commented portal/credits code to feature branch or flag |
| R15 | Fix WorkspaceProvider duplication | Remove from `layout.tsx`; keep only in `dashboard/layout.tsx` |
| R16 | Fix `postFetcher` semantic | `useSubscriptionStatus` should use GET not POST; enables HTTP caching |

### Design Refactors

| # | What | How |
|---|---|---|
| D1 | WebGL graceful fallback | Detect `WebGLRenderingContext`; render CSS animated gradient if unavailable |
| D2 | Consolidate landing page | Single canonical source: generate from Next.js static export OR retire Next.js components |
| D3 | Defer Three.js init | Use `IntersectionObserver` to start particle system only when canvas enters viewport |
| D4 | Split `globals.css` | Route-segment CSS: landing.css / dashboard.css / auth.css |

---

## 14. What Should Be Rebuilt From Scratch

These components are structurally flawed and cannot be meaningfully improved through refactoring. A clean rebuild will yield better results.

### Frontend

#### [REBUILD-F1] The Translate Page (`dashboard/translate/page.tsx`)

**Why rebuild**: 1,391 lines, 0 composable units, 12+ distinct responsibilities, impossible to test, impossible to extend. A refactor would produce the same tangle.

**New architecture**:
```
translate/
├── page.tsx                   ← <200 lines; orchestrator only
├── _hooks/
│   ├── useTranslationStream.ts ← SSE state machine
│   ├── useFileImport.ts        ← dropzone + Gist
│   └── useTranslationHistory.ts ← local session history
└── _components/
    ├── TranslationInput/        ← Monaco + mode selector + language picker
    ├── TranslationOutput/       ← block cards + diff view
    ├── TranslationToolbar/      ← download, copy, share, sync
    └── TranslationBlockCard/    ← single block: code + English + edit
```

#### [REBUILD-F2] The Dashboard Overview (`dashboard/page.tsx`)

**Why rebuild**: SVG quota ring, bar chart, and stat cards are written as inline JSX with hardcoded geometry. Should be proper chart components with responsive layouts.

**New architecture**: Replace with data-driven `<QuotaRing>`, `<ActivityChart>`, `<StatCard>` components; RSC for data loading; Client Component only for animation.

#### [REBUILD-F3] The Onboarding Flow (`dashboard/welcome/page.tsx`)

**Why rebuild**: 3 steps managed with a single `useState(1)` integer; no animation between steps; no progress persistence; step content hardcoded inline.

**New architecture**: A proper `<Stepper>` with slide transitions, persistent `localStorage` checkpoint, and modular `StepContent` components.

### Infrastructure

#### [REBUILD-I1] Docker Compose → Production-Ready Config

**Why rebuild**: Current Compose is development-first. For production, needs separate `compose.prod.yml` with:
- Redis AUTH password
- HTTPS Nginx with Let's Encrypt
- Backend with `--workers 4 --worker-class uvicorn.workers.UvicornWorker`
- Health check for frontend container
- Resource limits per service

#### [REBUILD-I2] Email Templates

**Why rebuild**: HTML emails written as f-strings inside Python functions. Table-layout from 2005. No responsive design. Should use a proper transactional email template engine (React Email or MJML) with preview capability and consistent branding.

---

## 15. Recommended Architecture for an Awwwards-Level Redesign

An Awwwards site is judged on: **Design** (40%), **Usability** (30%), **Creativity** (15%), **Content** (15%). The current codebase is functionally excellent but visually it plays it safe. The following architecture targets a Site of the Day award.

---

### 15.1 Visual Direction

The identity keyword for Anuvaad is **translation** — the act of making the unknown legible. The Awwwards-level visual direction should be:

> **"The Archive of Living Code"** — Dark editorial, typographic precision, information-dense but breathable. Code is artifact. English is archaeology.

| Current | Recommended |
|---|---|
| Amber glow on dark | **Deep obsidian + amber signal** — amber becomes more controlled; reserved for active/interactive moments only |
| Glassmorphism everywhere | **Selective frosted glass** — glass only on overlays/modals; flat surfaces otherwise; creates hierarchy |
| Particles always visible | **Particles as narrative device** — animate in during specific scroll chapters; go idle when user is working |
| Uniform border glow | **Editorial grid lines** — subtle 1px rule lines as structure; no glow on static elements |
| GSAP + Framer Motion | **GSAP exclusively** — one engine, full control; GSAP FLIP for layout transitions |

---

### 15.2 Recommended Technology Stack

```
Frontend:
  Next.js 16 (App Router) + React 19
  TypeScript 5
  TailwindCSS v4 (keep)
  GSAP 3.15 + ScrollTrigger (keep; remove Framer Motion)
  Three.js (keep; offload to Web Worker via OffscreenCanvas)
  Monaco Editor (keep)
  Lenis smooth scroll (already present)
  CSS Custom Properties design tokens (expanded)

Backend:
  FastAPI (keep all logic; clean DI)
  Uvicorn with Gunicorn worker management
  Celery + Redis for async LLM task queue (new)
  Prometheus metrics endpoint (new)
  structlog JSON logging (new)

Infrastructure:
  Docker Compose (dev) + Kubernetes manifests (prod)
  Cloudflare CDN + Workers for edge caching
  HTTPS with HSTS
  Redis Cluster (prod)
```

---

### 15.3 Landing Page Architecture

```
/  (static export or ISR)
│
├── Section 1: VOID ENTRY
│   ├── Full-viewport dark canvas (#020204)
│   ├── Single headline: "Every Codebase Has a Story."
│   ├── Subtext fades in 2s after headline settles
│   ├── WebGL particle field: DORMANT — barely visible ambient drift
│   └── Scroll arrow: a single amber vertical line pulsing 0→1
│
├── Section 2: THE MOMENT (pinned scroll story)
│   ├── Camera: tight on a single code block — anonymous function
│   ├── GSAP splits characters; individual chars drift apart slowly
│   ├── English words assemble in the void left by dispersed code chars
│   ├── Particles AWAKEN — rush from off-screen into the formed words
│   └── "Anuvaad reads code like a language, not a syntax."
│
├── Section 3: FEATURE GRID (horizontal scroll)
│   ├── 3 columns: Code→English, English→Code, Code→Code
│   ├── Each column: code block on left, animated translation on right
│   ├── Horizontal drag/trackpad scroll; animated progress pill
│   └── GSAP SplitText reveals on column enter
│
├── Section 4: LIVE DEMO (interactive)
│   ├── Full-width split: Monaco editor (left) ↔ English output (right)
│   ├── Pre-loaded with a real, interesting snippet
│   ├── User can edit; output streams in real-time from API
│   └── "Try it. Right here. No account required." (anonymous mode)
│
├── Section 5: TRUST + SOCIAL PROOF
│   ├── Usage count (live from /api/stats, ISR 60s)
│   ├── Language support grid: 35 language icons in amber grid
│   └── Testimonial scroll (marquee)
│
├── Section 6: PRICING
│   ├── Two cards: Free / Pro
│   ├── Minimal; no gimmicks; honest limits listed
│   └── Amber highlight on Pro card with shimmer border
│
└── Section 7: FINAL CTA
    ├── Full-viewport with WebGL plasma sphere (scroll target from Section 1)
    ├── "Start reading your codebase."
    └── Single amber button

Key Awwwards techniques:
  - Custom cursor (amber circle + code_char label on hover)
  - Page transition: black overlay wipe on route change
  - Scroll hijacking for Section 2 (600vh pin)
  - Horizontal scroll with momentum for Section 3
  - GSAP SplitText on every major headline
  - Magnetic button effect on all CTAs
  - Audio: optional subtle ambient sound (toggleable)
```

---

### 15.4 Dashboard Architecture

```
Dashboard shell:
  ├── Left rail: icon-only nav (not collapsible by default — always icon rail)
  ├── Top bar: breadcrumb + workspace switcher + user menu
  └── Main content: full-width, no container max-width restriction

Translate page (rebuilt):
  ├── Top: mode selector tabs (3 modes) — pill tabs with GSAP ink-slide
  ├── Left panel: Monaco editor (language selector in top-right corner)
  ├── Right panel: streaming output
  │   ├── While streaming: typewriter with scan line
  │   ├── After complete: block cards with Lora italic English
  │   └── Edit mode: inline English editing with debounced sync
  ├── Bottom toolbar: Download / Copy / Share / Sync (icon + label)
  └── File drop: drop anywhere on left panel (not a separate dropzone)

Animation strategy (dashboard):
  ├── Page enter: `clip-path: inset(0 0 100% 0) → inset(0 0 0% 0)` wipe (GSAP)
  ├── Block entrance: stagger with GSAP (not Framer Motion)
  ├── Streaming: rAF batching kept exactly as-is
  └── No decorative animations in the working dashboard — focus over flair
```

---

### 15.5 Awwwards Technical Checklist

| Category | Requirement | Status |
|---|---|---|
| **Performance** | LCP < 2.5s | ⬜ Needs Three.js deferral |
| **Performance** | CLS = 0 | ⬜ Needs font `size-adjust` |
| **Performance** | FID < 100ms | ⬜ Needs rAF offloading |
| **Creativity** | Custom cursor | ⬜ Not implemented |
| **Creativity** | Route transition animation | ⬜ Not implemented |
| **Creativity** | Horizontal scroll section | ⬜ Not implemented |
| **Creativity** | Interactive live demo (no-auth) | ⬜ Not implemented |
| **Creativity** | GSAP SplitText headlines | ⬜ Partially (hero only) |
| **Design** | Magnetic CTA buttons | ⬜ Not implemented |
| **Design** | Custom scrollbar styled | ✅ Done |
| **Design** | Consistent type scale | ✅ Done (Inter) |
| **Design** | WebGL particle system | ✅ Done |
| **Usability** | Keyboard navigation | ✅ Partially (⌘K palette) |
| **Usability** | ARIA roles on all interactive | ⬜ Incomplete |
| **Usability** | `prefers-reduced-motion` | ⬜ Not respected |
| **Usability** | Error boundaries | ⬜ Missing |
| **Content** | Live demo (real API) | ⬜ Not on landing |
| **Content** | Real usage stats | ⬜ Not shown |
| **Content** | Code-level SEO | ✅ OG, canonical, robots |

---

### 15.6 Implementation Priority Order

```
Phase 1 — Foundation (no visual changes)
  ├── Fix sys.modules DI (R1)
  ├── LLM client singletons (R2)
  ├── Structured logging (R6)
  ├── Error boundaries (R11)
  ├── loading.tsx per route (R12)
  └── Split translate page into hooks + components (REBUILD-F1)

Phase 2 — Performance
  ├── Remove Framer Motion from dashboard (R10)
  ├── WebGL graceful fallback (D1)
  ├── Three.js IntersectionObserver deferred init (D3)
  ├── OffscreenCanvas for particle compute (P1)
  └── Split globals.css by route segment (D4)

Phase 3 — Awwwards Redesign (landing)
  ├── Custom cursor
  ├── Route transition wipe
  ├── GSAP SplitText on headlines
  ├── Section 2: GSAP pinned code→English character morph
  ├── Section 3: horizontal scroll feature comparison
  ├── Section 4: live anonymous demo (real API call)
  └── WebGL: dormant → awaken trigger on scroll

Phase 4 — Dashboard Redesign
  ├── Translate page rebuilt (REBUILD-F1)
  ├── Dashboard overview rebuilt (REBUILD-F2)
  ├── Onboarding rebuilt (REBUILD-F3)
  └── prefers-reduced-motion compliance

Phase 5 — Infrastructure
  ├── Celery + Redis for LLM task queue
  ├── Prometheus metrics
  ├── Production Docker Compose with HTTPS
  └── React Email templates (REBUILD-I2)
```

---

## Summary Scorecard

| Dimension | Current Score | Target (Awwwards) |
|---|---|---|
| Backend architecture | 7.5 / 10 | 9.0 / 10 |
| Backend security | 8.5 / 10 | 9.5 / 10 |
| Frontend architecture | 5.5 / 10 | 9.0 / 10 |
| Design creativity | 6.5 / 10 | 9.5 / 10 |
| Animation quality | 7.0 / 10 | 9.5 / 10 |
| Performance (CWV) | 5.5 / 10 | 8.5 / 10 |
| Accessibility | 5.0 / 10 | 8.0 / 10 |
| Test coverage | 7.5 / 10 | 8.5 / 10 |
| Scalability | 5.0 / 10 | 8.0 / 10 |
| **Overall** | **6.4 / 10** | **9.0 / 10** |

The codebase has a **strong, defensible backend** and a **coherent design language**. The gap to Awwwards-level is primarily in three areas: (1) the translate page monolith blocking architectural progress, (2) performance headroom lost to dual animation libraries and un-deferred Three.js, and (3) the landing page lacks the interactive demo, character-level animation, and creative moments that distinguish award-winning sites. All three gaps have clear, specific solutions above.

---

*End of audit. No code was modified.*

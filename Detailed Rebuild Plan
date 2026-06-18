# Anuvaad — Repository Modernization Plan
### Path to an Awwwards-Level Product

> **Created**: 2026-06-10 | **Status**: Planning — no code modified  
> **Based on**: Complete technical audit (technical_audit_v2.md)

---

## Table of Contents

1. [Phase Overview](#1-phase-overview)
2. [Large File Decomposition Map](#2-large-file-decomposition-map)
3. [Feature-Based Frontend Architecture](#3-feature-based-frontend-architecture)
4. [Design System Architecture](#4-design-system-architecture)
5. [Motion System Architecture](#5-motion-system-architecture)
6. [Landing Page Architecture (Awwwards-Level)](#6-landing-page-architecture-awwwards-level)
7. [Implementation Order](#7-implementation-order)
8. [Risk Register](#8-risk-register)
9. [Migration Roadmap](#9-migration-roadmap)

---

## 1. Phase Overview

Six sequential phases. Each phase is fully shippable independently — no phase requires a subsequent phase to be "in progress" before deploying.

```
Phase 0 ── Foundations          (1–2 weeks)   No visual change. Structural cleanup.
Phase 1 ── Architecture         (2–3 weeks)   Feature-based file structure. File decomposition.
Phase 2 ── Design System        (1–2 weeks)   Tokens, typography scale, component library.
Phase 3 ── Motion System        (1–2 weeks)   Single animation engine. Motion primitives.
Phase 4 ── Dashboard Redesign   (3–4 weeks)   Rebuilt translate page, overview, onboarding.
Phase 5 ── Landing Redesign     (3–4 weeks)   Awwwards-level landing. Interactive demo.
Phase 6 ── Infrastructure       (1–2 weeks)   Production hardening, scalability, observability.
```

| Phase | Effort | Risk | Business Value | Dependency |
|---|---|---|---|---|
| Phase 0 | 1–2 wks | 🟢 Low | 🔴 Low | None |
| Phase 1 | 2–3 wks | 🟡 Medium | 🟡 Medium | Phase 0 |
| Phase 2 | 1–2 wks | 🟢 Low | 🟡 Medium | Phase 1 |
| Phase 3 | 1–2 wks | 🟡 Medium | 🟡 Medium | Phase 2 |
| Phase 4 | 3–4 wks | 🟡 Medium | 🔴 High | Phase 1, 2, 3 |
| Phase 5 | 3–4 wks | 🔴 High | 🔴 High | Phase 2, 3 |
| Phase 6 | 1–2 wks | 🟡 Medium | 🟡 Medium | Phase 0 |

**Total estimate**: 13–19 weeks for a single developer; 7–10 weeks with two developers (frontend + backend in parallel from Phase 1 onward).

---

## 2. Large File Decomposition Map

Every file with ≥300 lines or ≥3 distinct responsibilities is listed below with its target decomposition.

### 2.1 Backend Files

---

#### `app/routers/translate.py` — 608 lines, 7 endpoints

**Problem**: Monolithic router mixing input validation, sanitisation, cache logic, quota enforcement, and streaming orchestration all inline.

**Target decomposition**:

```
app/routers/translate.py         ← Keep; router registration only (~80 lines)
app/routers/_translate/
├── validators.py                ← sanitise_input(), validate_code_input(), ext/language maps
├── file_upload.py               ← upload_file_translate() endpoint
├── code_to_english.py           ← stream + sync endpoints
├── english_to_code.py           ← generate-from-english + english-to-code endpoints
├── code_to_code.py              ← code-to-code stream endpoint
└── sync.py                      ← sync-english-to-code endpoint
```

**Rule**: Each sub-module owns exactly one endpoint family. Shared logic lives in `validators.py` only.

---

#### `app/core/quota.py` — 412 lines, 6 distinct functions

**Problem**: Mixes quota enforcement, credit management, platform-level daily tracking, protection mode calculation, and background history saves in one file.

**Target decomposition**:

```
app/core/quota/
├── __init__.py                  ← re-exports enforce_quotas_and_protection, record_successful_completion
├── enforcement.py               ← enforce_quotas_and_protection(), check_free_tier_limit()
├── limits.py                    ← get_user_limits_and_cooldown(), get_active_protection_mode()
├── credits.py                   ← get_user_credits(), deduct_credit()
├── platform.py                  ← increment_platform_daily_usage(), get_platform_daily_usage()
└── history.py                   ← save_translation_background(), get_today_usage_count(), get_lifetime_translations()
```

---

#### `app/routers/billing.py` — ~450 lines

**Problem**: Checkout session creation, webhook handling, subscription status, and credit checkout mixed together.

**Target decomposition**:

```
app/routers/_billing/
├── checkout.py                  ← create-checkout-session, create-credit-checkout
├── webhook.py                   ← razorpay webhook handler (with idempotency)
├── status.py                    ← subscription-status, check-credits
└── portal.py                    ← (future) customer portal
```

---

#### `app/core/auth.py`

**Fix only** (not a decomposition problem):
- Move `get_client_ip()` out of `main.py` and reference only from `auth.py`
- Remove all `sys.modules.get("main")` patterns — replace with `Depends()` injection

---

### 2.2 Frontend Files

---

#### `src/app/dashboard/translate/page.tsx` — 1,391 lines ⚠️ CRITICAL

**Problem**: Single file contains 12 distinct responsibilities:
1. Language constants and detection logic
2. Mode configuration
3. SSE streaming state machine
4. File upload / dropzone
5. GitHub Gist import
6. Monaco Editor (input)
7. Monaco DiffEditor (output comparison)
8. Translation block cards
9. English editing and sync-back
10. Download / copy / share actions
11. Analytics event tracking
12. Quota / credit management

**Target decomposition**:

```
src/features/translate/
├── index.tsx                    ← Page entry; composes panels (<200 lines)
│
├── _hooks/
│   ├── useTranslationStream.ts  ← SSE state machine; rAF batch; done/error handling
│   ├── useFileImport.ts         ← dropzone + Gist import + file validation
│   ├── useLanguageDetection.ts  ← detectLanguage() regex heuristics
│   └── useTranslationSession.ts ← block state, edit mode, sync-back orchestration
│
├── _constants/
│   ├── languages.ts             ← languages[] array (35 entries) + EXT_TO_LANGUAGE map
│   └── modes.ts                 ← modes[] array with icons
│
├── _components/
│   ├── TranslateShell.tsx       ← Two-panel layout wrapper; mode-aware
│   ├── InputPanel/
│   │   ├── index.tsx            ← Panel wrapper; state props
│   │   ├── MonacoInput.tsx      ← Monaco Editor + language selector
│   │   ├── ModeSelector.tsx     ← Pill tab switcher (3 modes)
│   │   └── FileDropzone.tsx     ← Drag-and-drop overlay + Gist import button
│   ├── OutputPanel/
│   │   ├── index.tsx            ← Panel wrapper; streaming vs complete state
│   │   ├── StreamingView.tsx    ← Live typewriter + scan-line during stream
│   │   ├── BlocksView.tsx       ← Block card list after completion
│   │   └── DiffView.tsx         ← Monaco DiffEditor (before/after sync)
│   ├── BlockCard/
│   │   ├── index.tsx            ← Single code block; code snippet + English card
│   │   ├── EnglishEditor.tsx    ← Inline editable English translation
│   │   └── BlockActions.tsx     ← Copy code / copy English / edit toggle
│   └── Toolbar/
│       ├── index.tsx            ← Bottom action bar
│       ├── DownloadButton.tsx   ← Multi-format download (md/txt/json)
│       ├── CopyButton.tsx       ← Copy full output to clipboard
│       ├── ShareButton.tsx      ← Create share link
│       └── SyncButton.tsx       ← Trigger sync-English-to-code
│
└── _types/
    └── index.ts                 ← TranslationBlock, TranslationMode, FileImportResult
```

**Result**: Largest single file drops from 1,391 to ~180 lines. Every hook is independently testable.

---

#### `src/app/dashboard/layout.tsx` — 386 lines

**Problem**: Sidebar content, mobile drawer, workspace switcher, user avatar, and collapse logic all inline.

**Target decomposition**:

```
src/features/shell/
├── DashboardLayout.tsx          ← Layout entry (~80 lines); composes sidebar + main
├── Sidebar/
│   ├── index.tsx                ← Desktop sidebar + collapse button
│   ├── MobileSidebar.tsx        ← Slide-in drawer for mobile
│   ├── SidebarContent.tsx       ← Nav links + bottom user section
│   ├── WorkspaceSwitcher.tsx    ← Dropdown workspace picker
│   ├── UserCard.tsx             ← Avatar + email + plan badge
│   └── UpgradeCTA.tsx           ← Sidebar upgrade prompt for free users
└── NavLink.tsx                  ← Shared active-state nav link
```

---

#### `src/app/dashboard/page.tsx` — 383 lines

**Problem**: `ActivityBar`, `QuotaRing`, stat card data, recent translations table, and skeleton states all inline.

**Target decomposition**:

```
src/features/overview/
├── index.tsx                    ← Page; composes sections (~100 lines)
├── _components/
│   ├── StatCards.tsx            ← 4 stat cards grid; data-driven
│   ├── QuotaRing.tsx            ← SVG radial progress; accepts {used, total, isPro}
│   ├── ActivityChart.tsx        ← 7-day bar chart; `ActivityBar` sub-component
│   └── RecentTranslations.tsx   ← History table; skeleton fallback
└── _hooks/
    └── useOverviewData.ts       ← SWR composition; derives weekActivity, statCards
```

---

#### `src/app/dashboard/billing/page.tsx` — 422 lines

**Problem**: Razorpay handler, plan display, usage bar, and commented-out portal code all inline.

**Target decomposition**:

```
src/features/billing/
├── index.tsx                    ← Page; composes sections (~80 lines)
├── _components/
│   ├── CurrentPlanCard.tsx      ← Plan info; usage progress bar
│   ├── UpgradeCard.tsx          ← Free user upgrade prompt; feature list
│   ├── ProActiveCard.tsx        ← Pro confirmation card
│   └── PaymentStatusBanner.tsx  ← Success / cancel toast banner
└── _hooks/
    └── useRazorpay.ts           ← handleUpgrade(); Razorpay modal; verify payment
```

---

#### `src/components/landing/ScrollStory.tsx` — 24.5KB (~600 lines)

**Problem**: 6 scroll scenes, GSAP timeline setup, typed text animation, and morph animation all inline.

**Target decomposition**:

```
src/features/landing/scroll-story/
├── index.tsx                    ← GSAP ScrollTrigger pin + scene orchestration
├── _scenes/
│   ├── SceneVoid.tsx            ← Dark, empty opening scene
│   ├── SceneCode.tsx            ← Code block appears, chars animate
│   ├── SceneTranslate.tsx       ← Code morphs → English words
│   ├── SceneParticles.tsx       ← Particles assemble into formed words
│   ├── SceneMeaning.tsx         ← Typography reveal: "Anuvaad reads code…"
│   └── SceneCTA.tsx             ← Closing scene with CTA
└── _hooks/
    └── useScrollStory.ts        ← GSAP context + ScrollTrigger setup
```

---

#### `app/services/email.py` — 160 lines

**Problem**: HTML email templates as f-strings inside Python functions. Unmaintainable.

**Target decomposition**:

```
app/services/email/
├── __init__.py                  ← email_service singleton export
├── service.py                   ← EmailService class; _send() method
└── templates/
    ├── welcome.html             ← Jinja2 template; responsive HTML
    ├── subscription.html        ← Plan activated template
    └── milestone.html           ← Achievement template
```

Using `jinja2` for template rendering — already available as a FastAPI sub-dependency.

---

#### `src/app/globals.css` — 884 lines

**Problem**: Design tokens, keyframe animations, utility classes, auth-specific styles, dashboard-specific styles, and glassmorphism all in one file loaded on every route.

**Target decomposition**: See §4 (Design System Architecture).

---

## 3. Feature-Based Frontend Architecture

### Current vs. Target Structure

**Current** (route-based — all logic in pages):
```
src/app/dashboard/
├── page.tsx          ← 383 lines; everything inline
├── translate/page.tsx ← 1,391 lines; 12 responsibilities
├── billing/page.tsx   ← 422 lines; Razorpay + UI mixed
└── layout.tsx         ← 386 lines; sidebar + layout
```

**Target** (feature-based — pages are thin orchestrators):
```
src/
├── app/                         ← THIN. Pages only import features.
│   ├── layout.tsx               ← Root layout (keep; minimal)
│   ├── page.tsx                 ← Landing page entry
│   └── dashboard/
│       ├── layout.tsx           ← Thin: <DashboardLayout> only
│       ├── page.tsx             ← Thin: <OverviewPage> only
│       ├── translate/page.tsx   ← Thin: <TranslatePage> only
│       ├── billing/page.tsx     ← Thin: <BillingPage> only
│       ├── history/page.tsx     ← Thin: <HistoryPage> only
│       ├── settings/page.tsx    ← Thin: <SettingsPage> only
│       ├── team/page.tsx        ← Thin: <TeamPage> only
│       └── welcome/page.tsx     ← Thin: <WelcomePage> only
│
├── features/                    ← ALL business logic lives here
│   ├── translate/               ← Translation feature (see §2)
│   ├── overview/                ← Dashboard overview feature
│   ├── billing/                 ← Billing + upgrade feature
│   ├── history/                 ← History list + share feature
│   ├── settings/                ← Account settings feature
│   ├── team/                    ← Team + workspace feature
│   ├── onboarding/              ← Welcome + onboarding flow
│   ├── shell/                   ← Layout, sidebar, navbar
│   ├── auth/                    ← Sign-in, sign-up, forgot-password
│   └── landing/                 ← All landing page sections
│
├── components/                  ← Truly shared, reusable, feature-agnostic
│   ├── ui/                      ← shadcn/ui primitives (keep)
│   ├── charts/                  ← QuotaRing, ActivityBar (promoted from features)
│   ├── editors/                 ← MonacoEditor, MonacoDiffEditor wrappers
│   ├── overlays/                ← CommandPalette, dialogs, sheets
│   └── motion/                  ← Motion primitives (see §5)
│
├── design/                      ← Design system (see §4)
│   ├── tokens/
│   ├── css/
│   └── primitives/
│
├── lib/                         ← Infrastructure (keep; minimal changes)
│   ├── auth-context.tsx
│   ├── analytics.ts
│   ├── hooks.ts
│   ├── supabase.ts
│   └── utils.ts
│
└── types/                       ← Global TypeScript types
    ├── api.ts                   ← API response shapes
    ├── translation.ts           ← TranslationBlock, TranslationMode
    └── billing.ts               ← SubscriptionStatus, Plan
```

### Rules for the Feature-Based Architecture

1. **Pages import features, never sub-features directly** — `dashboard/page.tsx` imports from `features/overview/index.tsx` only
2. **Features own their state** — no feature reaches into another feature's state
3. **Shared components have no business logic** — `components/` are pure presentational or utility
4. **Hooks are co-located with their feature** — no global `hooks.ts` for feature-specific logic (keep only SWR infrastructure hooks in `lib/hooks.ts`)
5. **Types flow top-down** — `types/` are global; feature-local types live in `features/{name}/_types/`

---

## 4. Design System Architecture

### 4.1 Token Architecture

Replace the inline CSS custom properties scattered through `globals.css` with a structured token file system:

```
src/design/tokens/
├── color.css          ← All color custom properties
├── typography.css     ← Font scale, line-height, letter-spacing
├── spacing.css        ← Spacing scale (4px base grid)
├── radius.css         ← Border radius tokens
├── shadow.css         ← Shadow + glow tokens
├── animation.css      ← Duration, easing curve tokens
└── z-index.css        ← Layer stacking constants
```

#### Color Token Structure (target)

```css
/* src/design/tokens/color.css */

/* ── Brand Primitives ── */
:root {
  --amber-50:  #fffbeb;
  --amber-100: #fef3c7;
  --amber-200: #fde68a;
  --amber-300: #fcd34d;
  --amber-400: #fbbf24;
  --amber-500: #f59e0b;  /* Primary brand */
  --amber-600: #d97706;
  --amber-700: #b45309;
  --amber-800: #92400e;
  --amber-900: #78350f;

  /* ── Semantic Surface Tokens ── */
  --surface-base:     #030014;   /* Page void */
  --surface-low:      #080c14;   /* Dashboard base */
  --surface-mid:      #0c0f1a;   /* Card surface */
  --surface-high:     #111520;   /* Elevated component */
  --surface-overlay:  #161b28;   /* Modal / popover */

  /* ── Semantic Border Tokens ── */
  --border-faint:     rgba(245,158,11,0.06);
  --border-subtle:    rgba(245,158,11,0.10);
  --border-default:   rgba(245,158,11,0.18);
  --border-active:    rgba(245,158,11,0.40);
  --border-focus:     rgba(245,158,11,0.70);

  /* ── Semantic Text Tokens ── */
  --text-primary:     #e8ecf0;
  --text-secondary:   #8899aa;
  --text-muted:       #5a6a7a;
  --text-disabled:    #3a4a5a;
  --text-brand:       #f59e0b;
  --text-on-brand:    #020204;

  /* ── Semantic Feedback Tokens ── */
  --status-success:   #10b981;
  --status-warning:   #f59e0b;
  --status-danger:    #ef4444;
  --status-info:      #3b82f6;

  /* ── Glow Tokens ── */
  --glow-xs: 0 0  8px rgba(245,158,11,0.20);
  --glow-sm: 0 0 12px rgba(245,158,11,0.25);
  --glow-md: 0 0 24px rgba(245,158,11,0.35);
  --glow-lg: 0 0 48px rgba(245,158,11,0.25), 0 0 100px rgba(245,158,11,0.10);
}
```

#### Typography Token Structure (target)

```css
/* src/design/tokens/typography.css */
:root {
  /* Font families */
  --font-display: var(--font-sans);      /* Inter — headlines */
  --font-body:    var(--font-sans);      /* Inter — body text */
  --font-code:    var(--font-mono);      /* JetBrains Mono */
  --font-prose:   var(--font-lora);      /* Lora italic — English output */

  /* Type scale (Major Third: 1.25x) */
  --text-2xs:  0.625rem;   /* 10px */
  --text-xs:   0.75rem;    /* 12px */
  --text-sm:   0.875rem;   /* 14px */
  --text-base: 1rem;       /* 16px */
  --text-lg:   1.25rem;    /* 20px */
  --text-xl:   1.5rem;     /* 24px */
  --text-2xl:  2rem;       /* 32px */
  --text-3xl:  2.5rem;     /* 40px */
  --text-4xl:  3.5rem;     /* 56px */
  --text-5xl:  5rem;       /* 80px */
  --text-hero: 7rem;       /* 112px — landing headline */

  /* Line heights */
  --leading-tight:    1.1;
  --leading-snug:     1.25;
  --leading-normal:   1.5;
  --leading-relaxed:  1.7;

  /* Letter spacing */
  --tracking-tight:   -0.04em;
  --tracking-normal:  0em;
  --tracking-wide:    0.05em;
  --tracking-wider:   0.12em;
  --tracking-widest:  0.20em;
}
```

### 4.2 CSS File Architecture

**Current**: Single 884-line `globals.css` loaded on every route.

**Target**: Route-segment CSS loading — only the styles needed for the current route are shipped:

```
src/design/css/
├── base.css              ← @layer base: reset, scrollbar, focus-visible, body
├── tokens.css            ← @import all token files
├── animations.css        ← All 25+ @keyframes
├── utilities.css         ← Semantic utility classes (.glass-amber, .glow-border, etc.)
├── components.css        ← Component-level styles (.btn-amber-shimmer, .terminal-panel, etc.)
│
├── landing.css           ← Landing-page-only: aurora orbs, marquee, scan-line, perspective
├── dashboard.css         ← Dashboard-only: sidebar glow, progress bar, typing-dots
└── auth.css              ← Auth-page-only: auth-bg radial gradients
```

**Route segment imports** (Next.js App Router):

```
app/
├── globals.css           ← @import base.css + tokens.css + utilities.css
├── dashboard/
│   └── layout.css        ← @import dashboard.css (only loaded on dashboard routes)
└── (auth)/
    └── layout.css        ← @import auth.css (only loaded on auth routes)

src/features/landing/
└── landing.css           ← @import landing.css (only loaded when landing renders)
```

### 4.3 Component Primitive Architecture

All presentational component variants use CVA (Class Variance Authority) — already a dependency:

```
src/components/ui/           ← shadcn/ui (keep; don't modify)

src/design/primitives/       ← Anuvaad's own design-system components
├── Surface.tsx              ← Semantic surface wrapper ({level: 0|1|2|elevated})
├── GlassPanel.tsx           ← Glassmorphism panel ({level: amber|dark|apple})
├── GlowBorder.tsx           ← Animated amber border wrapper
├── CodeSurface.tsx          ← Dark mono code block surface
├── AmberBadge.tsx           ← Amber pill badge
├── StatusDot.tsx            ← Animated presence indicator
└── TypographyProse.tsx      ← Lora italic wrapper for English output
```

---

## 5. Motion System Architecture

### 5.1 Current Problems

| Problem | Detail |
|---|---|
| Dual engines | GSAP (landing) + Framer Motion (dashboard) — ~120KB combined |
| No centralized config | Duration, easing, stagger values hardcoded inline |
| No reduced-motion support | `prefers-reduced-motion` not respected anywhere |
| Coupling | Animation logic embedded inside component business logic |

### 5.2 Target: Single Engine, Composable Primitives

**Decision**: Keep GSAP as the single animation engine. Remove Framer Motion entirely.

**Rationale**:
- GSAP is already imported for landing page — adding it to dashboard is zero marginal cost
- GSAP FLIP enables layout transitions that Framer Motion would need Layout animations for
- GSAP's `context()` API makes cleanup safe in React effects
- Removes ~60KB gzipped from the bundle (Framer Motion)

### 5.3 Motion Token File

```
src/design/tokens/animation.css
```

```css
:root {
  /* Durations */
  --dur-instant:    50ms;
  --dur-fast:       150ms;
  --dur-normal:     300ms;
  --dur-slow:       500ms;
  --dur-slower:     800ms;
  --dur-cinematic: 1200ms;

  /* Easing curves */
  --ease-out-expo:   cubic-bezier(0.16, 1, 0.3, 1);
  --ease-out-back:   cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-in-out:     cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring:     cubic-bezier(0.175, 0.885, 0.32, 1.275);

  /* Stagger step */
  --stagger-xs:  40ms;
  --stagger-sm:  60ms;
  --stagger-md: 100ms;
  --stagger-lg: 160ms;
}
```

### 5.4 Motion Primitive Components

```
src/components/motion/
│
├── FadeIn.tsx              ← opacity 0→1; accepts delay, duration
├── SlideUp.tsx             ← opacity 0→1, y 20→0; accepts delay
├── RevealText.tsx          ← GSAP SplitText char-by-char reveal
├── StaggerContainer.tsx    ← GSAP stagger wrapper; sets context for children
├── MagneticButton.tsx      ← Mouse proximity pull effect on CTA buttons
├── ParallaxLayer.tsx       ← Scroll-driven y translation
├── CountUp.tsx             ← Animated number count to target value
├── GlowIn.tsx              ← box-shadow 0→glow-md on mount
├── TextScramble.tsx        ← Cyberpunk character scramble reveal
├── PageTransition.tsx      ← Clip-path wipe on route changes
└── ReducedMotion.tsx       ← Wraps children; strips animations if prefers-reduced-motion
```

### 5.5 Motion Hook

```typescript
// src/lib/motion.ts

export function useMotionSafe() {
  // Returns false if prefers-reduced-motion: reduce
  // All motion primitives check this before registering animations
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return !prefersReduced;
}

export function useGsapContext(ref: React.RefObject<HTMLElement>) {
  // Returns a GSAP context scoped to ref; auto-reverts on unmount
  // All landing and dashboard animation effects use this pattern
}

export const motionConfig = {
  // Centralized GSAP defaults — import everywhere
  ease: { outExpo: 'power4.out', spring: 'back.out(1.4)' },
  duration: { fast: 0.15, normal: 0.3, slow: 0.5, cinematic: 1.2 },
  stagger: { xs: 0.04, sm: 0.06, md: 0.10, lg: 0.16 },
} as const;
```

### 5.6 Framer Motion Removal Strategy

Framer Motion is used in exactly **one location**: `MotionDiv` in `translate/page.tsx` for block card entrance animations.

**Replacement steps** (zero visual regression):

```typescript
// BEFORE (Framer Motion):
<MotionDiv
  initial={{ opacity: 0, y: 15 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: Math.min(idx * 0.05, 0.4), duration: 0.4 }}
>
  <BlockCard />
</MotionDiv>

// AFTER (GSAP via CSS utility):
<div className="animate-block-in" style={{ '--delay': `${Math.min(idx * 50, 400)}ms` }}>
  <BlockCard />
</div>

// In dashboard.css:
.animate-block-in {
  opacity: 0;
  transform: translateY(15px);
  animation: block-enter 0.4s var(--ease-out-expo) var(--delay, 0ms) forwards;
}
@keyframes block-enter {
  to { opacity: 1; transform: translateY(0); }
}
```

This uses the CSS `@keyframes block-enter` + `animation-delay` CSS variable pattern — zero JS, zero library cost.

---

## 6. Landing Page Architecture (Awwwards-Level)

### 6.1 Design Concept

> **"The Archive of Living Code"**  
> Code is artifact. Translation is archaeology. The landing page is a museum of meaning — dark, cinematic, typographically precise.

**Judges assess**: Design (40%), Usability (30%), Creativity (15%), Content (15%).

**Differentiators that win awards**:
- Interactive demo that calls the real API — no mocks
- Scroll-driven particle morph that tells a story, not just decorates
- Character-level text animation (GSAP SplitText)
- Custom cursor that responds to content context
- Horizontal scroll with inertia for the feature comparison
- Magnetic CTAs with physical spring response

---

### 6.2 File Structure

```
src/features/landing/
│
├── LandingPage.tsx              ← Root: mounts WebGL + SmoothScroll + all sections
├── landing.css                  ← Landing-specific CSS (imported by LandingPage)
│
├── _sections/
│   ├── VoidEntry/               ← Section 1: hero
│   │   ├── index.tsx
│   │   ├── Headline.tsx         ← GSAP SplitText; word-by-word reveal
│   │   ├── Subline.tsx          ← Delayed fade-in
│   │   └── ScrollCue.tsx        ← Amber vertical line pulse
│   │
│   ├── TranslationMoment/       ← Section 2: pinned GSAP story (600vh)
│   │   ├── index.tsx            ← ScrollTrigger pin setup
│   │   ├── CodeArtifact.tsx     ← Anonymous code block
│   │   ├── CharMorph.tsx        ← Code chars drift; English words assemble
│   │   └── NarrativeText.tsx    ← "Anuvaad reads code like a language…"
│   │
│   ├── FeatureComparison/       ← Section 3: horizontal scroll
│   │   ├── index.tsx            ← Horizontal scroll container + GSAP pin
│   │   ├── ComparePanel.tsx     ← Single mode panel (code left, English right)
│   │   └── ProgressPill.tsx     ← Scroll progress indicator
│   │
│   ├── LiveDemo/                ← Section 4: interactive (no auth required)
│   │   ├── index.tsx
│   │   ├── DemoEditor.tsx       ← Monaco editor; pre-loaded snippet
│   │   ├── DemoOutput.tsx       ← Streaming output panel
│   │   └── DemoHint.tsx         ← "Try it. Right here." prompt
│   │
│   ├── SocialProof/             ← Section 5: trust + stats
│   │   ├── index.tsx
│   │   ├── LiveCounter.tsx      ← Animated count of total translations (from API)
│   │   ├── LanguageGrid.tsx     ← 35-language amber icon grid
│   │   └── TestimonialMarquee.tsx
│   │
│   ├── Pricing/                 ← Section 6: pricing cards
│   │   └── index.tsx
│   │
│   └── FinalCTA/                ← Section 7: closing act
│       ├── index.tsx
│       └── PlasmaSphere.tsx     ← WebGL particle sphere (scroll-triggered)
│
├── _canvas/
│   ├── WebGLCanvas.tsx          ← Three.js; OffscreenCanvas; 6,000 particles
│   ├── useParticleSystem.ts     ← Particle init, layout positions, morph loop
│   └── useScrollMorph.ts        ← Scroll → layout interpolation
│
├── _cursor/
│   ├── CustomCursor.tsx         ← Amber circle cursor; context labels on hover
│   └── useCursor.ts             ← Mouse tracking; hover target detection
│
├── _transitions/
│   └── PageTransition.tsx       ← Black wipe on route change (GSAP clip-path)
│
└── _hooks/
    ├── useSmoothScroll.ts       ← Lenis instance management
    ├── useHorizontalScroll.ts   ← GSAP horizontal scroll + inertia
    └── useMagneticButton.ts     ← Mouse proximity spring for CTAs
```

---

### 6.3 Section Architecture Detail

#### Section 1: Void Entry (Hero)

```
Visual state:
  - Full viewport dark canvas (#030014)
  - WebGL particle field DORMANT — particles at rest, barely visible ambient drift
  - Single headline: "Every Codebase Has a Story."
    → GSAP SplitText: each word individually: y: 80→0, opacity 0→1, blur 12px→0
    → Stagger: 0.14s per word
  - Subline: "Understand any codebase in minutes, not weeks."
    → 0.8s delay; fade up
  - Two CTAs: "Try Free" (magnetic amber button) + "See the Story" (ghost button)
  - Scroll cue: amber 1px line pulses 0.5→1 opacity, 60px tall
  - Ambient: 2 slowly drifting radial gradient orbs (kept from current)

WebGL behaviour:
  - On scroll past 10%: particles begin to stir
  - On scroll past 20%: particles start morphing toward grid layout
```

#### Section 2: The Translation Moment (Pinned)

```
Physical setup:
  - 600vh pinned section (GSAP ScrollTrigger)
  - Progress: 0–100% across those 600vh

Scene breakdown by scroll progress:
  0–15%:  Anonymous code block fades in (fibonacci, classic, beautiful)
  15–35%: GSAP SplitText splits each character of the code
  35–55%: Characters drift — code chars float off; English words form in the void
           (coordinate map: code char positions → target English word positions)
  55–75%: Particles AWAKEN — rush from off-screen; orbit the formed English words
  75–90%: English text settles; particles settle into word outlines
  90–100%: Typography fades to: "Anuvaad reads code like a language, not a syntax."

Key technique:
  - Character position morph: record code char DOM positions with FLIP;
    record target English word positions; animate with GSAP FLIP
  - Particle convergence: particle targets become English word centroids
```

#### Section 3: Feature Comparison (Horizontal Scroll)

```
Physical setup:
  - 300vh pinned; translates X across 3 panels
  - GSAP: xPercent 0 → -200 over scroll progress

Panels (each full viewport width):
  Panel 1: Code → English
    - Left: Monaco editor (read-only, pre-populated)
    - Right: English output with Lora italic
    - Header: "Code → English" amber label

  Panel 2: English → Code
    - Left: English description textarea
    - Right: Generated code
    - Header: "English → Code"

  Panel 3: Code → Code
    - Left: Python source
    - Right: TypeScript output
    - Header: "Code → Code" (dual language badge)

Each panel entrance:
  - GSAP SplitText on panel heading
  - Code lines type in one by one (18ms/line delay, not char)
  - Progress pill at bottom: 3 dots; active dot expands

Interaction:
  - Cursor on panel: "← Scroll →" subtle hint
  - Touch/trackpad: natural horizontal momentum
```

#### Section 4: Live Demo (Interactive, No Auth)

```
Layout:
  - Full-width panel with a dark surface
  - Left: Monaco editor (full height, 500px)
  - Right: output panel with streaming view
  - Top: "Try Anuvaad — No account required." amber eyebrow

Behaviour:
  - Pre-loaded with interesting real code (not fibonacci; maybe a real sorting algorithm)
  - User can edit; "Translate →" button runs real API call (/api/code-to-english)
  - Anonymous endpoint: rate-limited to 3 requests per IP, no auth required
  - Streaming output shows in real time with scan-line animation
  - After first translation: "This is what 100,000 developers use every day."
  
Anonymous API endpoint needed:
  - New backend route: POST /api/demo/translate
  - Rate-limited: 3 req/IP/hour via Redis
  - Uses Groq (cheapest) only
  - Fixed char limit: 2,000 chars
```

#### Section 5: Social Proof

```
  LiveCounter: Total translations performed (ISR 60s, from /api/stats/global)
    - CountUp animation: 0 → {real_value} over 1.5s when in viewport
    - Label: "translations and counting"

  LanguageGrid: 35 language boxes in 7×5 grid
    - On viewport enter: staggered amber glow appears on each box (GSAP stagger)
    - Hover: individual box lifts with glow-md

  TestimonialMarquee: (existing; keep marquee direction logic)
```

#### Section 7: Final CTA

```
  Visual state:
    - Full viewport
    - WebGL particle sphere ACTIVATED (particles arrive from periphery into sphere)
    - Sphere: 8-unit radius; rotates 0.02rad/frame; mouse distortion maintained

  Typography:
    - "Start reading your codebase." — GSAP SplitText on scroll enter
    - Amber shimmer button: "Start Free →" (magnetic)
    - Below button: "No credit card. 10 free translations per day."
```

---

### 6.4 Custom Cursor

```typescript
// src/features/landing/_cursor/CustomCursor.tsx
//
// A 20px amber circle follows the mouse with lerp 0.12
// On hover of:
//   - CTA buttons:  expands to 48px; fills amber; label "Click"
//   - Code blocks:  expands to 36px; color: #6366f1 (indigo); label "Code"
//   - English text: expands to 36px; color: #f59e0b (amber); label "English"
//   - Links:        scales to 28px; opacity 0.7
// On mousedown: scale(0.8) spring compress
// On click:     scale(1.1) then return to normal
```

---

### 6.5 Page Transition

```typescript
// src/features/landing/_transitions/PageTransition.tsx
//
// On route change:
//   1. Black overlay div: clip-path inset(0 0 100% 0) → inset(0 0 0% 0) — 0.4s power3.inOut
//   2. (new page renders behind)
//   3. clip-path inset(0 0 0% 0) → inset(0 100% 0 0) — 0.3s power3.in
// 
// This creates a classic "wipe" transition common on Awwwards sites.
```

---

## 7. Implementation Order

### Rationale for Order

The ordering follows three rules:
1. **No user-visible regressions** — foundation changes must not alter appearance
2. **Dependencies first** — design system before components; motion system before animations
3. **High-risk items early** — the translate page decomposition is the highest-risk item; do it in Phase 1 before building on top of it

---

### Phase 0: Foundations (Week 1–2)

**Goal**: Zero visual change. Fix structural problems that block all subsequent work.

```
0.1  Backend: Remove sys.modules DI pattern
     Files: app/core/auth.py, app/core/quota.py
     Action: Replace with FastAPI Depends(); update conftest.py to use app.dependency_overrides

0.2  Backend: LLM client singletons
     Files: app/services/ai.py
     Action: Move AsyncOpenAI instances to module-level; manage in lifespan if needed

0.3  Backend: Deduplicate get_client_ip
     Files: app/main.py → remove; app/core/auth.py → keep

0.4  Backend: Structured logging
     Files: All app/ files
     Action: Replace logger.info(f"…") with structlog JSON emission

0.5  Frontend: Remove Framer Motion
     Files: frontend/src/app/dashboard/translate/page.tsx
     Action: Replace MotionDiv with .animate-block-in CSS class; uninstall framer-motion

0.6  Frontend: Fix WorkspaceProvider duplication
     Files: app/layout.tsx → remove WorkspaceProvider; dashboard/layout.tsx → keep

0.7  Frontend: Fix payment redirect
     Files: billing/page.tsx
     Action: router.push + mutate() instead of window.location.href

0.8  Frontend: Remove commented-out code from billing
     Files: billing/page.tsx
     Action: Delete the 106 commented lines

0.9  Backend: Webhook idempotency
     Files: app/routers/billing.py
     Action: Store webhook event ID in Redis; 409 on duplicate

0.10 Frontend: Fix postFetcher semantic
     Files: lib/hooks.ts
     Action: useSubscriptionStatus → GET not POST
```

**Definition of Done**: All 184 backend tests pass. No visual difference in any page. Framer Motion removed from bundle.

---

### Phase 1: Architecture (Week 3–5)

**Goal**: Feature-based file structure. All large files decomposed. Pages become thin.

```
1.1  Create /src/features/ directory structure
     Action: mkdir all feature directories; no file moves yet

1.2  Extract translate page constants
     Files: translate/page.tsx → features/translate/_constants/
     Action: Move languages[], modes[], EXT_TO_LANGUAGE, ACCEPTED_EXTENSIONS, detectLanguage()

1.3  Extract translate hooks
     Files: translate/page.tsx → features/translate/_hooks/
     Action: Extract useTranslationStream, useFileImport, useLanguageDetection, useTranslationSession

1.4  Extract translate components
     Files: translate/page.tsx → features/translate/_components/
     Action: Extract InputPanel, OutputPanel, BlockCard, Toolbar in order

1.5  Rebuild translate page entry
     Files: dashboard/translate/page.tsx
     Action: <200 line orchestrator importing from features/translate

1.6  Extract shell components
     Files: dashboard/layout.tsx → features/shell/
     Action: DashboardLayout, Sidebar, MobileSidebar, WorkspaceSwitcher, UserCard

1.7  Extract overview components
     Files: dashboard/page.tsx → features/overview/
     Action: StatCards, QuotaRing, ActivityChart, RecentTranslations

1.8  Extract billing components
     Files: dashboard/billing/page.tsx → features/billing/
     Action: CurrentPlanCard, UpgradeCard, useRazorpay hook

1.9  Extract backend translate router
     Files: app/routers/translate.py → app/routers/_translate/
     Action: validators.py, file_upload.py, code_to_english.py, etc.

1.10 Extract backend quota module
     Files: app/core/quota.py → app/core/quota/
     Action: enforcement.py, limits.py, credits.py, platform.py, history.py

1.11 Update all import paths
     Action: Find-and-replace all imports to new feature paths

1.12 Update E2E tests for new structure
     Files: e2e/translate.spec.ts
     Action: Verify window.__monacoEditor still exposed after refactor
```

**Definition of Done**: 
- All 184 backend tests pass unchanged
- Playwright E2E passes (`translate.spec.ts`)
- No file in `src/app/dashboard/` exceeds 100 lines
- No file in `src/features/` exceeds 300 lines

---

### Phase 2: Design System (Week 6–7)

**Goal**: Token-based CSS; split globals.css; stable design primitives.

```
2.1  Create src/design/ directory structure

2.2  Extract color tokens
     Files: globals.css → design/tokens/color.css
     Action: Formalise all custom properties; add missing scale steps

2.3  Extract typography tokens
     Files: globals.css → design/tokens/typography.css
     Action: Add formal type scale; line-height tokens; tracking tokens

2.4  Extract animation tokens
     Files: globals.css → design/tokens/animation.css
     Action: Duration vars, easing curve vars, stagger step vars

2.5  Extract all @keyframes
     Files: globals.css → design/css/animations.css

2.6  Extract utility classes
     Files: globals.css → design/css/utilities.css
     Action: .glass-amber, .glow-border, .btn-amber-shimmer, etc.

2.7  Extract landing-specific styles
     Files: globals.css → design/css/landing.css + features/landing/landing.css

2.8  Extract dashboard-specific styles
     Files: globals.css → design/css/dashboard.css

2.9  Extract auth-specific styles
     Files: globals.css → design/css/auth.css

2.10 Rebuild globals.css as root @import
     Files: app/globals.css
     Action: @import base.css + tokens/*.css + utilities.css only (~50 lines)

2.11 Add route-segment CSS imports
     Files: dashboard/layout.css, (auth)/layout.css

2.12 Create design primitive components
     Files: src/design/primitives/
     Action: Surface, GlassPanel, GlowBorder, CodeSurface, StatusDot
```

**Definition of Done**:
- `app/globals.css` < 60 lines
- Zero visual difference on any page
- All CSS custom properties use token variables (no hardcoded hex except in token files)

---

### Phase 3: Motion System (Week 8–9)

**Goal**: Single animation engine; centralized config; motion primitives; reduced-motion support.

```
3.1  Create src/lib/motion.ts
     Action: motionConfig constant; useMotionSafe(); useGsapContext()

3.2  Add CSS animation token variables
     Files: design/tokens/animation.css
     Action: --dur-*, --ease-*, --stagger-* custom properties

3.3  Create motion primitive components
     Files: src/components/motion/
     Action: FadeIn, SlideUp, StaggerContainer, CountUp, GlowIn, TextScramble

3.4  Add prefers-reduced-motion guard
     Files: src/components/motion/ReducedMotion.tsx
     Action: Wraps children; uses CSS @media (prefers-reduced-motion: reduce)

3.5  Migrate existing dashboard animations to motion primitives
     Files: features/overview/, features/translate/_components/
     Action: Replace inline animation styles with <FadeIn>, <SlideUp>

3.6  Create MagneticButton component
     Files: src/components/motion/MagneticButton.tsx
     Action: Mouse proximity spring on all landing CTAs

3.7  Create PageTransition component
     Files: src/features/landing/_transitions/PageTransition.tsx
     Action: GSAP clip-path wipe; hook into Next.js App Router navigation events

3.8  Create RevealText component (GSAP SplitText)
     Files: src/components/motion/RevealText.tsx
     Action: Wrap any text; char-by-char or word-by-word GSAP reveal
```

**Definition of Done**:
- All dashboard animations use motion primitives
- `prefers-reduced-motion: reduce` disables all keyframe animations
- GSAP is the only animation library (Framer Motion removed in Phase 0)

---

### Phase 4: Dashboard Redesign (Week 10–13)

**Goal**: Production-quality dashboard UI. Rebuilt pages. Error boundaries. Loading states.

```
4.1  Add Error Boundaries
     Files: All dashboard routes
     Action: Wrap each route in <ErrorBoundary fallback={<ErrorCard />}>

4.2  Add loading.tsx per route
     Files: dashboard/translate/loading.tsx, dashboard/billing/loading.tsx, etc.
     Action: Skeleton-based loading states using App Router streaming

4.3  Rebuild dashboard overview
     Files: features/overview/
     Action: RSC for data; Client Component for animation; QuotaRing, ActivityChart

4.4  Redesign translate page UI
     Files: features/translate/_components/
     Action: Full-width layout; mode pill tabs with ink-slide; proper panel architecture

4.5  Redesign block cards
     Files: features/translate/_components/BlockCard/
     Action: Editorial card: code on top, amber rule, Lora italic English below; inline edit

4.6  Rebuild onboarding flow
     Files: features/onboarding/
     Action: Animated step transitions; progress persistence; modular step components

4.7  Redesign billing page
     Files: features/billing/
     Action: Clean card layout; usage ring; conditional upgrade CTA

4.8  Dashboard sidebar refinement
     Files: features/shell/Sidebar/
     Action: Always-visible icon rail on desktop; full label on expand; upgrade CTA polish

4.9  Add keyboard navigation
     Files: All interactive components
     Action: Proper aria-label; focus-trap on modals; roving tabindex on nav

4.10 Add PWA offline page
     Files: app/offline.tsx
     Action: Show translation history from localStorage when offline
```

**Definition of Done**:
- Lighthouse Performance ≥ 85 on dashboard routes
- Lighthouse Accessibility ≥ 90
- Zero white-screen errors (Error Boundaries catch all failures)
- All translate page E2E tests pass

---

### Phase 5: Landing Redesign (Week 14–17)

**Goal**: Awwwards-level landing page. Interactive live demo. Character morph. Custom cursor.

```
5.1  Create anonymous demo API endpoint
     Files: app/routers/utility.py → /api/demo/translate
     Action: 3 req/IP/hour; Groq only; 2,000 char limit; no auth

5.2  Refactor WebGLCanvas to use OffscreenCanvas
     Files: features/landing/_canvas/WebGLCanvas.tsx
     Action: Move particle loop to Web Worker; OffscreenCanvas handoff

5.3  Add WebGL graceful fallback
     Files: features/landing/_canvas/WebGLCanvas.tsx
     Action: Detect WebGLRenderingContext; CSS animated gradient fallback

5.4  Create custom cursor
     Files: features/landing/_cursor/
     Action: 20px amber circle; context labels; spring lerp

5.5  Build Section 1: Void Entry
     Files: features/landing/_sections/VoidEntry/
     Action: GSAP SplitText headline; magnetic CTAs; ambient particles

5.6  Build Section 2: Translation Moment (pinned)
     Files: features/landing/_sections/TranslationMoment/
     Action: 600vh pin; character morph; particle convergence (hardest section)

5.7  Build Section 3: Feature Comparison (horizontal)
     Files: features/landing/_sections/FeatureComparison/
     Action: GSAP horizontal pin; 3 panels; progress pill

5.8  Build Section 4: Live Demo
     Files: features/landing/_sections/LiveDemo/
     Action: Monaco editor; calls /api/demo/translate; streaming output

5.9  Build Section 5: Social Proof
     Files: features/landing/_sections/SocialProof/
     Action: LiveCounter from ISR; language grid stagger; testimonial marquee

5.10 Build Section 6: Pricing
     Files: features/landing/_sections/Pricing/
     Action: Minimal 2-card grid; honest feature lists

5.11 Build Section 7: Final CTA
     Files: features/landing/_sections/FinalCTA/
     Action: WebGL sphere activated on scroll; SplitText; magnetic button

5.12 Add page transition
     Files: features/landing/_transitions/PageTransition.tsx
     Action: GSAP clip-path wipe on all route changes

5.13 Landing navbar
     Files: features/landing/_sections/ → Navbar
     Action: Transparent on scroll top; frosted glass on scroll; amber CTA

5.14 Performance audit
     Action: Lighthouse; PageSpeed; Three.js defer; bundle analysis
```

**Definition of Done**:
- Lighthouse Performance ≥ 85 on landing (desktop)
- LCP < 2.5s
- WebGL particle system deferred until viewport intersection
- Live demo successfully calls API and streams output
- Custom cursor present and functional
- `prefers-reduced-motion` respected on all sections

---

### Phase 6: Infrastructure (Week 18–19)

**Goal**: Production-ready deployment. Observability. Scalability.

```
6.1  Prometheus metrics endpoint
     Files: app/core/config.py, app/routers/utility.py
     Action: Replace MetricsCollector with prometheus_client; /api/metrics/prometheus

6.2  Celery task queue for LLM jobs
     Files: app/workers/ (new)
     Action: Celery + Redis broker; async LLM task; SSE polls task status

6.3  Production Docker Compose
     Files: docker-compose.prod.yml (new)
     Action: Redis AUTH; HTTPS Nginx; multi-worker Uvicorn; resource limits

6.4  Email templates with Jinja2
     Files: app/services/email/templates/
     Action: Proper HTML email templates; responsive; preview capability

6.5  DB index documentation
     Files: supabase/migrations/ (new directory)
     Action: Document required indexes: (user_email, created_at) on translation_history

6.6  Frontend CDN config
     Files: nginx.conf
     Action: Add Cloudflare-compatible cache headers; HSTS; CSP tightening

6.7  Redis AUTH in Docker Compose
     Files: docker-compose.yml
     Action: requirepass directive; update REDIS_URL pattern

6.8  Frontend ISR for landing stats
     Files: features/landing/_sections/SocialProof/LiveCounter.tsx
     Action: Next.js ISR (60s) for /api/stats/global endpoint
```

---

## 8. Risk Register

| ID | Risk | Phase | Likelihood | Impact | Mitigation |
|---|---|---|---|---|---|
| R01 | **Translate page decomposition breaks E2E tests** | 1 | 🟡 Medium | 🔴 High | Run E2E on every PR during Phase 1; keep `window.__monacoEditor` exposed |
| R02 | **Import path changes break runtime** | 1 | 🟡 Medium | 🟠 Medium | TypeScript compilation will catch most; add CI build step for each sub-task |
| R03 | **CSS split removes styles from some routes** | 2 | 🟡 Medium | 🟡 Medium | Visual regression test with Percy/Playwright screenshots before/after |
| R04 | **GSAP SplitText conflicts with SSR** | 3, 5 | 🟡 Medium | 🟡 Medium | All SplitText runs in `useEffect` with `typeof window` guard |
| R05 | **WebGL OffscreenCanvas Safari support** | 5 | 🔴 High | 🟠 Medium | Safari 16.4+ supports OffscreenCanvas; add feature detect; fallback to main thread |
| R06 | **Character morph (Section 2) performance** | 5 | 🔴 High | 🔴 High | FLIP technique requires careful layout measurement; test on mid-range mobile |
| R07 | **Anonymous demo API abuse** | 5 | 🟡 Medium | 🔴 High | Redis rate-limit: 3 req/IP/hour; CAPTCHA fallback if abuse detected |
| R08 | **Celery migration breaks SSE streaming** | 6 | 🔴 High | 🔴 High | SSE is synchronous by design; Celery adds async complexity; validate carefully |
| R09 | **Three.js deferred init breaks scroll morph timing** | 3, 5 | 🟡 Medium | 🟡 Medium | IntersectionObserver fires before section enters viewport; add buffer |
| R10 | **Database query degradation (quota count)** | 6 | 🟡 Medium | 🟠 Medium | Add composite index; cache quota count in Redis with 30s TTL |
| R11 | **Framer Motion removal breaks animations** | 0 | 🟢 Low | 🟡 Medium | CSS `@keyframes` replacement is visually identical; test in all browsers |
| R12 | **`prefers-reduced-motion` breaks marketing animations** | 3 | 🟢 Low | 🟡 Medium | Motion primitives only disable transform/opacity animations; layout stays |
| R13 | **GSAP ScrollTrigger conflicts with Lenis** | 3, 5 | 🟡 Medium | 🟠 Medium | Use `ScrollTrigger.scrollerProxy` for Lenis integration; already documented by GSAP |
| R14 | **WorkspaceContext refactor breaks workspace switcher** | 0 | 🟢 Low | 🟡 Medium | Remove duplicate provider only; context API unchanged |
| R15 | **Landing page LCP fails on slow connections** | 5 | 🟡 Medium | 🔴 High | Defer Three.js; use static image as LCP element; font `size-adjust` |

---

## 9. Migration Roadmap

### Current State Snapshot

```
Current architecture summary:
  ├── Backend: Monolithic FastAPI (5 routers, 2 services) — solid logic; poor DI
  ├── Frontend pages: Route-based; 3 pages > 380 lines; 1 page at 1,391 lines
  ├── Animation: Dual engines (GSAP + Framer Motion); no centralized config
  ├── CSS: Single 884-line globals.css; no token system; no route splitting
  ├── Design: Coherent amber palette; no formal token file; no scale
  ├── Landing: Strong visual foundations; missing interactivity; no character animation
  └── Infra: Dev-quality Docker Compose; no HTTPS config; single replica
```

### Target State

```
Target architecture summary:
  ├── Backend: Feature-scoped routers; Depends() DI; LLM client singletons; Celery queue
  ├── Frontend features: Feature-based; max 200 lines/page; max 300 lines/feature file
  ├── Animation: GSAP only; motion primitives; prefers-reduced-motion; centralized config
  ├── CSS: Token system; route-segment loading; globals.css < 60 lines
  ├── Design: Formal token scale (color, type, spacing, animation); semantic primitives
  ├── Landing: Awwwards-level; char morph; live demo; custom cursor; page transitions
  └── Infra: Prod Docker Compose; Redis AUTH; HTTPS; Prometheus; Celery workers
```

---

### Migration Dependency Graph

```
Phase 0 (Foundations)
    │
    ├──────────────────────────┐
    ▼                          ▼
Phase 1 (Architecture)    Phase 6 (Infra)
    │
    ├──────────────────────────┐
    ▼                          ▼
Phase 2 (Design System)   (can start in parallel with Phase 2)
    │
    ▼
Phase 3 (Motion System)
    │
    ├──────────────────────────┐
    ▼                          ▼
Phase 4 (Dashboard)       Phase 5 (Landing)
```

---

### Week-by-Week Gantt (Single Developer)

```
Week  1-2:  Phase 0 — Foundation fixes (backend DI, Framer Motion removal, billing fixes)
Week  3-4:  Phase 1 — Extract translate hooks and components
Week  5:    Phase 1 — Extract shell, overview, billing; update E2E tests
Week  6:    Phase 2 — Token files, split globals.css
Week  7:    Phase 2 — Design primitives, route-segment CSS
Week  8:    Phase 3 — Motion tokens, motion primitive components
Week  9:    Phase 3 — Migrate dashboard animations; MagneticButton; PageTransition
Week 10-11: Phase 4 — Error boundaries, loading.tsx, overview rebuild, billing rebuild
Week 12-13: Phase 4 — Translate page UI redesign, block cards, onboarding rebuild
Week 14:    Phase 5 — Anonymous demo API; WebGL OffscreenCanvas refactor
Week 15:    Phase 5 — Custom cursor; Section 1 (Void Entry); Section 2 (Translation Moment)
Week 16:    Phase 5 — Section 3 (Horizontal); Section 4 (Live Demo)
Week 17:    Phase 5 — Sections 5–7; Page transition; performance audit
Week 18-19: Phase 6 — Prometheus; Celery; Prod Docker Compose; email templates
```

---

### Parallel Developer Track (Frontend + Backend)

```
Developer A (Frontend):
  Week 1-2:   Phase 0 frontend tasks (Framer Motion, WorkspaceProvider, billing)
  Week 3-5:   Phase 1 — Feature-based structure
  Week 6-7:   Phase 2 — Design system
  Week 8-9:   Phase 3 — Motion system
  Week 10-13: Phase 4 — Dashboard redesign
  Week 14-17: Phase 5 — Landing redesign
  Week 18-19: Phase 5 polish + Phase 6 CDN/ISR

Developer B (Backend):
  Week 1-2:   Phase 0 backend tasks (DI, LLM singletons, logging, webhook)
  Week 3-4:   Phase 1 backend — Router decomposition, quota module split
  Week 5-6:   Phase 6 partial — Prometheus metrics, DB index docs
  Week 7-8:   Phase 5 backend — Anonymous demo API endpoint
  Week 9-10:  Phase 6 — Celery task queue
  Week 11-12: Phase 6 — Prod Docker Compose, Redis AUTH, email templates
  Week 13-19: QA, load testing, security review
```

---

### Rollback Strategy

Every phase is independently deployable. To roll back:

| Phase | Rollback mechanism |
|---|---|
| Phase 0 | Git revert specific commits (each task is one commit) |
| Phase 1 | All imports still resolve; pages call same feature APIs |
| Phase 2 | Revert CSS split; restore globals.css from git |
| Phase 3 | CSS animation unchanged; GSAP context reverts on unmount |
| Phase 4 | Feature components are additive; old pages can be restored from git |
| Phase 5 | Landing is a separate feature module; original `index.html` still available |
| Phase 6 | Docker Compose is a separate file (`compose.prod.yml`); dev compose unchanged |

---

### Feature Flags Recommended

The following features should be controlled by environment variables to allow safe partial rollouts:

```env
NEXT_PUBLIC_LANDING_V2=true              # Phase 5: New landing page
NEXT_PUBLIC_DASHBOARD_V2=true            # Phase 4: New dashboard UI
NEXT_PUBLIC_LIVE_DEMO_ENABLED=true       # Phase 5: Anonymous demo endpoint
NEXT_PUBLIC_CUSTOM_CURSOR=true           # Phase 5: Custom cursor (desktop only)
NEXT_PUBLIC_PAGE_TRANSITIONS=true        # Phase 3/5: Route transition wipes
FEATURE_CELERY_ENABLED=false             # Phase 6: LLM task queue
FEATURE_PROMETHEUS_ENABLED=false         # Phase 6: Prometheus metrics
```

---

### Success Metrics

At the completion of all phases, the following metrics define success:

| Metric | Current | Target |
|---|---|---|
| Lighthouse Performance (landing) | ~55 | ≥ 85 |
| Lighthouse Performance (dashboard) | ~65 | ≥ 85 |
| Lighthouse Accessibility | ~60 | ≥ 90 |
| LCP (landing) | ~3.5s | < 2.5s |
| Bundle size (dashboard JS) | ~450KB gz | < 280KB gz |
| Largest single file (frontend) | 1,391 lines | < 300 lines |
| Largest single file (backend routers) | 608 lines | < 200 lines |
| `prefers-reduced-motion` compliance | 0% | 100% |
| Error boundary coverage | 0% | 100% |
| Awwwards submission readiness | ❌ | ✅ |

---

*End of modernization plan. No code was modified.*

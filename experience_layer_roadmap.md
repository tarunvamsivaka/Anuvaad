# Anuvaad — Experience Layer Roadmap
### Awwwards-Level Frontend Implementation Plan

> **Scope**: Experience layer only — Landing V2 · Motion System · WebGL System · Repository Storytelling · Interactive Product Demo · Design System V2 · Dashboard UX Redesign  
> **Excludes**: Billing, CI/CD, infrastructure, compliance, migrations, backend hardening  
> **Prerequisite assumption**: Backend structural fixes (DI, LLM singletons, logging) are complete or running in parallel

---

## Phase Map

| Phase | Name | Duration | Focus Areas |
|---|---|---|---|
| **Phase E1** | Design System V2 + Motion Engine | Weeks 1–3 | Design System V2 · Motion System |
| **Phase E2** | Dashboard UX Redesign | Weeks 4–7 | Dashboard UX Redesign |
| **Phase E3** | WebGL System + Repository Storytelling | Weeks 8–10 | WebGL System · Repository Storytelling |
| **Phase E4** | Landing V2 + Interactive Product Demo | Weeks 11–16 | Landing V2 · Interactive Product Demo |

Each phase is independently deployable behind a feature flag. No phase requires the next to be in-progress before shipping.

```
NEXT_PUBLIC_DASHBOARD_V2=true      # Phase E2
NEXT_PUBLIC_LANDING_V2=true        # Phase E4
NEXT_PUBLIC_LIVE_DEMO_ENABLED=true # Phase E4
NEXT_PUBLIC_CUSTOM_CURSOR=true     # Phase E4
NEXT_PUBLIC_PAGE_TRANSITIONS=true  # Phase E4
```

---

---

## Phase E1 — Design System V2 + Motion Engine
### Weeks 1–3 · Risk: 🟢 Low · Business Value: 🔴 High (unblocks everything)

> **Goal**: Build the design token system, split `globals.css` into route-scoped files, establish the GSAP-only motion engine, and create the reusable motion primitives that every subsequent phase depends on. Zero visual regression allowed.

---

### E1.1 — Design Token Architecture (Design System V2)

**What it is**: Replace the scattered CSS custom properties in the 884-line `globals.css` with a structured 7-file token system. Every color, type size, shadow, radius, spacing value, and animation timing becomes a named token.

**Why it matters**: Without tokens, every subsequent component built in Phase E2–E4 will hardcode hex values and magic numbers. Tokens are the contractual foundation. Awwwards-winning sites have obsessive design consistency — this is how it's mechanically enforced.

**Deliverables**:

```
frontend/src/design/tokens/
├── color.css          ← 6-tier color hierarchy (primitives → semantic → glow)
├── typography.css     ← Major Third scale (--text-2xs through --text-hero at 7rem)
├── spacing.css        ← 4px-base grid spacing
├── radius.css         ← --radius-sm through --radius-4xl
├── shadow.css         ← shadow + glow values
├── animation.css      ← duration, easing, stagger step tokens
└── z-index.css        ← --z-canvas / --z-base / --z-overlay / --z-cursor
```

**Color token hierarchy** (6 tiers):

| Tier | Contents | Rule |
|---|---|---|
| 1 — Primitives | `--amber-{50–900}`, `--void-{50–900}`, `--neutral-{50–900}` | Never used directly in components |
| 2 — Surfaces | `--surface-base #030014` through `--surface-overlay #161b28` | Used as backgrounds |
| 3 — Borders | `--border-faint` (6%) through `--border-focus` (70% amber) | Border + divider |
| 4 — Text | `--text-primary #e8ecf0` through `--text-on-brand #020204` | All text |
| 5 — Glows | `--glow-xs` (8px) through `--glow-lg` (48px + 100px halo) | Amber focus/hover glow |
| 6 — Status | `--status-success`, `--status-warning`, `--status-danger`, `--status-info` | Feedback states |

**Animation token values**:
```css
/* Durations */
--dur-instant: 50ms   --dur-fast: 150ms   --dur-normal: 300ms
--dur-slow: 500ms     --dur-slower: 800ms  --dur-cinematic: 1200ms

/* Easing */
--ease-out-expo:  cubic-bezier(0.16, 1, 0.3, 1)
--ease-out-back:  cubic-bezier(0.34, 1.56, 0.64, 1)
--ease-spring:    cubic-bezier(0.175, 0.885, 0.32, 1.275)

/* Stagger steps */
--stagger-xs: 40ms    --stagger-sm: 60ms
--stagger-md: 100ms   --stagger-lg: 160ms
```

**Acceptance criteria**:
- All CSS custom properties from current `globals.css` have a corresponding token
- No component file contains a hardcoded hex value
- `tokens.css` `@import`s all 7 files in correct cascade order

---

### E1.2 — Route-Scoped CSS Split (Design System V2)

**What it is**: Break the 884-line `globals.css` into 8 focused files loaded only on the routes that need them. Landing animations don't ship to the dashboard. Auth gradients don't ship to the landing.

**Target structure**:
```
src/design/css/
├── base.css          ← @layer base: reset, body, scrollbar, focus-visible
├── tokens.css        ← @import all 7 token files
├── animations.css    ← ALL 25+ @keyframes (named library)
├── utilities.css     ← .glass-amber, .glass-dark, .glass-apple, .premium-card, etc.
├── components.css    ← .terminal-panel, .status-dot, .progress-bar, .typing-dot, etc.
├── landing.css       ← aurora orbs, marquee, scan-line, perspective — landing only
├── dashboard.css     ← sidebar glow, animate-block-in, progress bar — dashboard only
└── auth.css          ← auth-bg radial gradients — auth only
```

**Route import strategy**:
```
app/globals.css           ← @import base + tokens + utilities (~50 lines)
app/dashboard/layout.css  ← @import dashboard.css (dashboard routes only)
(auth)/layout.css         ← @import auth.css (auth routes only)
features/landing/         ← imports landing.css internally
```

**Acceptance criteria**:
- `globals.css` is ≤ 60 lines
- Zero visual regression on landing, auth, or dashboard (Playwright screenshots before/after)
- Dashboard routes do not load landing CSS (verify in DevTools network tab)
- All `@keyframes` live in `animations.css`, not inline in component files

---

### E1.3 — Design Primitive Components (Design System V2)

**What they are**: Seven semantic surface/typography atoms that are Anuvaad's own design-system layer, sitting above shadcn/ui and below feature components.

```
src/design/primitives/
├── Surface.tsx          ← level={0|1|2|'elevated'} — semantic background wrapper
├── GlassPanel.tsx       ← level={'amber'|'dark'|'apple'} — glassmorphism layer
├── GlowBorder.tsx       ← animated amber box-shadow border wrapper
├── CodeSurface.tsx      ← dark monospace terminal panel (.terminal-panel)
├── AmberBadge.tsx       ← amber pill badge (plan status, labels)
├── StatusDot.tsx        ← animated online/offline presence indicator
└── TypographyProse.tsx  ← Lora italic wrapper for English translation output
```

**Rules**: All variants use CVA. No hardcoded hex values — only token variables. Independently importable. Storybook-reviewable.

---

### E1.4 — GSAP-Only Motion Engine (Motion System)

**Decision**: Remove Framer Motion entirely. GSAP 3.15 becomes the single animation engine.

**Why**:
- Framer Motion saves ~60KB gzipped removed from the dashboard bundle
- GSAP already present — zero marginal cost to extend to dashboard
- GSAP FLIP handles layout transitions natively
- GSAP `context()` makes cleanup safe in React effects
- GSAP ScrollTrigger integrates with Lenis via `scrollerProxy`

**Motion infrastructure** (`src/lib/motion.ts`):
```typescript
export const motionConfig = {
  ease: {
    outExpo: 'power4.out',
    spring:  'back.out(1.4)',
    inOut:   'power2.inOut',
    sharp:   'power3.inOut',
  },
  duration: {
    instant:   0.05,  fast: 0.15,
    normal:    0.30,  slow: 0.50,
    cinematic: 1.20,
  },
  stagger: { xs: 0.04, sm: 0.06, md: 0.10, lg: 0.16 },
} as const;

export function useMotionSafe(): boolean;  // false if prefers-reduced-motion
export function useGsapContext(ref): gsap.Context;  // auto-reverts on unmount
```

**Framer Motion removal** — block card entrance is the only usage. Replace with CSS `@keyframes`:
```css
/* dashboard.css */
.animate-block-in {
  opacity: 0; transform: translateY(15px);
  animation: block-enter 0.4s var(--ease-out-expo) var(--delay, 0ms) forwards;
}
@keyframes block-enter { to { opacity: 1; transform: translateY(0); } }
```
```tsx
<div className="animate-block-in" style={{ '--delay': `${Math.min(idx * 50, 400)}ms` }}>
```

---

### E1.5 — Motion Primitive Components (Motion System)

**What they are**: 11 composable motion components that encapsulate GSAP animation patterns. Every subsequent animation in Phase E2–E4 is built from these — no ad-hoc GSAP calls in feature components.

```
src/components/motion/
├── FadeIn.tsx              ← opacity 0→1; {delay, duration, from}
├── SlideUp.tsx             ← opacity 0→1 + y 20→0; {delay}
├── RevealText.tsx          ← GSAP SplitText char/word reveal; {by: 'char'|'word'}
├── StaggerContainer.tsx    ← GSAP stagger scope; {stagger, from}
├── MagneticButton.tsx      ← mouse-proximity spring pull on CTAs
├── ParallaxLayer.tsx       ← scroll-driven y translation via ScrollTrigger
├── CountUp.tsx             ← animated number counter to target value
├── GlowIn.tsx              ← box-shadow 0 → var(--glow-md) on mount
├── TextScramble.tsx        ← cyberpunk character scramble reveal
├── PageTransition.tsx      ← GSAP clip-path wipe on route change
└── ReducedMotion.tsx       ← wraps children; strips all animations if prefers-reduced-motion
```

**`prefers-reduced-motion` strategy** (mandatory, applied everywhere):
- All GSAP animations check `useMotionSafe()` before registering
- All CSS keyframes wrapped in `@media (prefers-reduced-motion: no-preference) { ... }`
- `<ReducedMotion>` component for tree-level opt-out

---

### Phase E1 — Exit Criteria

- [ ] `globals.css` ≤ 60 lines
- [ ] All 25+ `@keyframes` in `animations.css`
- [ ] Zero hardcoded hex colors in any component file
- [ ] `framer-motion` absent from `package.json`
- [ ] All 7 token files exist and cascade correctly
- [ ] All 7 design primitives render without error
- [ ] All 11 motion primitives implement `useMotionSafe()`
- [ ] `prefers-reduced-motion: reduce` disables all motion in OS setting test
- [ ] Zero visual regression on any route (Playwright screenshot comparison)

---

---

## Phase E2 — Dashboard UX Redesign
### Weeks 4–7 · Risk: 🟡 Medium · Business Value: 🔴 High

> **Goal**: Production-quality dashboard. Every dashboard route has an error boundary, a loading skeleton, and uses the Phase E1 motion primitives. The translate page is rebuilt as composable components. The sidebar, overview, onboarding, and billing are visually redesigned.

---

### E2.1 — Error Boundaries + Loading States

**Why first**: All subsequent redesign work depends on a resilient shell. Currently, any SWR failure or context throw white-screens the entire app — with zero recovery path.

**Error boundary** — wrap every dashboard route:
```tsx
<ErrorBoundary fallback={({ error, reset }) => 
  <ErrorCard title="Something went wrong" onRetry={reset} />
}>
  <Suspense fallback={<RouteSkeleton />}>
    <FeaturePage />
  </Suspense>
</ErrorBoundary>
```

**Per-route `loading.tsx`** — leverage App Router streaming:
```
app/dashboard/loading.tsx           ← root dashboard skeleton
app/dashboard/translate/loading.tsx ← Monaco skeleton (left) + output skeleton (right)
app/dashboard/history/loading.tsx   ← 5-row list skeleton
app/dashboard/billing/loading.tsx   ← 2-card skeleton
app/dashboard/settings/loading.tsx
app/dashboard/team/loading.tsx
```

All skeletons use `<Skeleton>` from shadcn/ui, sized to match the target layout (no layout shift).

---

### E2.2 — Translate Page Rebuild (Dashboard UX Redesign)

**The problem**: 1,391-line monolith — 12 responsibilities, 0 composable units, untestable. A refactor creates the same tangle. This is a clean rebuild into the feature-based architecture.

**Target architecture**:
```
features/translate/
├── index.tsx                     ← <200 lines; orchestrator only
├── _hooks/
│   ├── useTranslationStream.ts   ← SSE state machine + rAF batching (preserved exactly)
│   ├── useFileImport.ts          ← dropzone + GitHub Gist import
│   ├── useLanguageDetection.ts   ← 7 regex heuristics (Python/TS/JS/Rust/C++/Go/Java)
│   └── useTranslationSession.ts  ← block state, edit mode, sync-back orchestration
├── _constants/
│   ├── languages.ts              ← languages[] (35 entries) + EXT_TO_LANGUAGE map
│   └── modes.ts                  ← modes[] array with icons + API endpoints
├── _types/index.ts               ← TranslationBlock, TranslationMode, FileImportResult
└── _components/
    ├── TranslateShell.tsx         ← two-panel layout; mode-aware
    ├── InputPanel/
    │   ├── index.tsx
    │   ├── MonacoInput.tsx        ← dynamic import; language selector top-right
    │   ├── ModeSelector.tsx       ← pill tabs with GSAP ink-slide animation
    │   └── FileDropzone.tsx       ← entire left panel is drop zone
    ├── OutputPanel/
    │   ├── index.tsx
    │   ├── StreamingView.tsx      ← typewriter + scan-line during SSE
    │   ├── BlocksView.tsx         ← block card list after completion
    │   └── DiffView.tsx           ← Monaco DiffEditor for original vs. synced
    ├── BlockCard/
    │   ├── index.tsx              ← CodeSurface top + amber rule + TypographyProse bottom
    │   ├── EnglishEditor.tsx      ← click-to-edit; auto-height; debounced 500ms
    │   └── BlockActions.tsx       ← copy code · copy English · edit toggle
    └── Toolbar/
        ├── index.tsx              ← bottom bar: icon+label ≥768px, icon-only mobile
        ├── DownloadButton.tsx
        ├── CopyButton.tsx
        ├── ShareButton.tsx
        └── SyncButton.tsx
```

**Visual changes to translate page**:

| Element | Current | Target |
|---|---|---|
| Mode selector | Inline tabs | Pill tabs with GSAP ink-slide underline |
| Layout | Container-constrained | Full-width two-panel (50/50 desktop, stacked mobile) |
| File drop | Separate visible zone | Entire left panel is drop zone; overlay only on drag |
| Streaming | Plain text stream | Scan-line animation during SSE |
| Block cards | Code + English inline | `<CodeSurface>` top · amber 1px rule · `<TypographyProse>` (Lora italic) bottom |
| Toolbar | Scattered actions | Bottom bar: icon+label at ≥768px, icon-only mobile |

**Critical preservation**: `streamBufferRef` + `requestAnimationFrame` flush pattern must be preserved exactly in `useTranslationStream.ts`.

---

### E2.3 — Dashboard Overview Redesign (Dashboard UX Redesign)

**Target components**:

| Component | Implementation |
|---|---|
| `StatCards.tsx` | 4 data-driven cards; `<CountUp>` on numeric values; `<SlideUp>` stagger entrance |
| `QuotaRing.tsx` | SVG radial progress; `stroke-dashoffset` animated on mount; green→amber→red at 60%/85% |
| `ActivityChart.tsx` | 7 SVG bars; height 0→value on mount (700ms); hover tooltip |
| `RecentTranslations.tsx` | Last 5 translations; mode badge + language pair + timestamp + view link; `<Skeleton>` during load |
| Quick Actions | 3 link cards for the 3 translation modes |

**Layout**: CSS Grid; 2 columns md+; 1 column mobile. RSC for data loading; client component for animation only.

---

### E2.4 — Sidebar Redesign (Dashboard UX Redesign)

**Vision**: Permanent icon rail (always 60px, no toggle). Hover/click to expand to 224px. Typographically precise. Active state is a 3px amber left-inset border, not a background fill.

| Element | Behavior |
|---|---|
| Desktop rail | Always 60px icon-only; hover to expand to 224px with labels; 250ms ease |
| Active nav link | 3px amber inset left border + subtle `--glow-xs` + amber text color |
| User card | Avatar-only collapsed → avatar + email + plan badge expanded; click → popover (Settings, Sign Out) |
| Upgrade CTA (free) | Amber gem icon + tooltip collapsed → usage bar + shimmer-border "Upgrade" card expanded |
| Mobile | Hamburger → full-width Sheet drawer; `<UpgradeCTA>` at bottom |
| TopBar | 48px sticky bar: left breadcrumb · center workspace switcher · right theme toggle + user menu |

---

### E2.5 — Onboarding Flow Rebuild (Dashboard UX Redesign)

**Current problem**: 3 steps controlled by a single `useState(1)` integer; no animation between steps; no progress persistence.

**New architecture**:
```
features/onboarding/
├── index.tsx               ← 3-step stepper; GSAP xPercent slide between steps
├── _components/
│   ├── Stepper.tsx         ← progress bar + step dots + animated step number
│   ├── StepDemo.tsx        ← fibonacci→English example; <SlideUp> reveal
│   ├── StepModes.tsx       ← 3 mode cards; hover: card lifts + amber border glows
│   └── StepLaunch.tsx      ← "You're ready." + <CountUp> developer count + confetti
```

- Step progress persisted in `localStorage` — refresh restores current step
- On completion: `updateUser({ data: { onboarded: true } })` in Supabase
- Confetti burst (existing `canvas-confetti`) fires on step 3 completion

---

### E2.6 — Keyboard Navigation + Accessibility Audit (Dashboard UX Redesign)

- Audit every interactive element for `aria-label` / `aria-labelledby`
- Add `focus-trap` to all modal/Sheet components
- Roving `tabindex` on sidebar nav links
- All icon-only buttons have `aria-label` + `title`
- Run Axe accessibility audit via Playwright `@axe-core/playwright`
- Resolve all Critical + Serious violations

**Target**: 0 Critical Axe violations, 0 Serious Axe violations, Lighthouse Accessibility ≥ 90

---

### Phase E2 — Exit Criteria

- [ ] Lighthouse Performance ≥ 85 on all dashboard routes
- [ ] Lighthouse Accessibility ≥ 90 on all dashboard routes
- [ ] Zero white-screen errors (all routes have ErrorBoundary)
- [ ] All dashboard routes have `loading.tsx` with layout-matched skeletons
- [ ] `translate/page.tsx` is < 200 lines; no file in `_components/` > 200 lines
- [ ] All translate E2E tests pass (all 3 modes, file drop, Gist import, diff view)
- [ ] Onboarding flow completes and sets `onboarded: true`
- [ ] Sidebar accessible via keyboard; all interactive elements have `aria-label`
- [ ] `prefers-reduced-motion: reduce` disables all dashboard animations

---

---

## Phase E3 — WebGL System + Repository Storytelling
### Weeks 8–10 · Risk: 🟡 Medium · Business Value: 🟡 Medium

> **Goal**: Move the Three.js particle system off the main thread entirely using OffscreenCanvas + Web Worker. Add graceful fallback for devices without WebGL. Implement the scroll-driven narrative that turns the particle system into a storytelling device rather than a decorative element.

---

### E3.1 — OffscreenCanvas + Web Worker Architecture (WebGL System)

**The problem**: The existing 6,000-particle morph runs `for (i < 6000)` position updates every `requestAnimationFrame` on the main thread. On mobile, this costs 4–8ms/frame and drops below 60fps — a Core Web Vital penalty and a jank experience on the page that's meant to impress.

**New architecture**:
```
features/landing/_canvas/
├── WebGLCanvas.tsx              ← React host; detects OffscreenCanvas; transfers control
├── particle.worker.ts           ← Web Worker; owns Three.js entirely
├── useParticleSystem.ts         ← computes 4 layout position buffers
└── useScrollMorph.ts            ← maps Lenis scroll (0→1) → worker messages
```

**Worker communication protocol**:
```typescript
// Main → Worker
type WorkerInbound =
  | { type: 'init';   canvas: OffscreenCanvas; width: number; height: number; dpr: number }
  | { type: 'resize'; width: number; height: number; dpr: number }
  | { type: 'scroll'; value: number }       // 0–1 normalized
  | { type: 'mouse';  x: number; y: number } // normalized -1 to 1
  | { type: 'mode';   mode: 'dormant'|'active'|'sphere' }
  | { type: 'destroy' }

// Worker → Main (diagnostic only)
type WorkerOutbound =
  | { type: 'ready' }
  | { type: 'fps'; value: number }
```

**WebGL mode states**:

| Mode | Trigger | Visual |
|---|---|---|
| `DORMANT` | Hero viewport | Particles at rest; ambient drift only |
| `ACTIVE` | Scroll > 20% | Full scroll morph cycle (tunnel→grid→wave→sphere) |
| `SPHERE` | Final CTA enters viewport | Particles collapse to sphere; rotate 0.02 rad/frame |
| `FALLBACK` | No WebGL context | CSS animated gradient backdrop |

**OffscreenCanvas feature detection + fallback**:
```tsx
const hasOffscreen = 'transferControlToOffscreen' in canvas;
if (hasOffscreen) {
  const offscreen = canvas.transferControlToOffscreen();
  worker.postMessage({ type: 'init', canvas: offscreen, ... }, [offscreen]);
} else {
  // Fall back to main-thread Three.js (existing code path)
}
```

**Safari note**: Safari ≥ 16.4 supports OffscreenCanvas. Earlier versions use the main-thread fallback. Feature-detect required (R05 risk).

**Acceptance criteria**:
- Main thread CPU during particle animation: < 1ms/frame (Chrome DevTools Performance panel)
- Worker thread visible in DevTools → Performance → Worker
- Scroll-driven morph still works (tunnel → grid → wave → sphere)
- Mouse interaction still works (normalized coordinates via postMessage)
- Safari < 16.4: graceful fallback to main-thread Three.js

---

### E3.2 — WebGL Graceful Fallback (WebGL System)

**CSS fallback for no WebGL**:
```tsx
// WebGLCanvas.tsx
const hasWebGL = typeof WebGLRenderingContext !== 'undefined' &&
  !!document.createElement('canvas').getContext('webgl');

if (!hasWebGL) return <CSSGradientBackdrop />;
```

```css
/* CSSGradientBackdrop */
.css-backdrop {
  background:
    radial-gradient(ellipse at 30% 50%, rgba(99,102,241,0.15) 0%, transparent 60%),
    radial-gradient(ellipse at 70% 20%, rgba(245,158,11,0.12) 0%, transparent 50%),
    #030014;
  animation: aurora-drift 14s ease-in-out infinite;
}
```

**IntersectionObserver deferral**:
- Three.js init deferred until canvas enters viewport (`rootMargin: '200px'`)
- Eliminates the ~145KB gzipped Three.js blocking FCP on slow connections

**Acceptance criteria**:
- On `--disable-webgl` in Playwright: CSS gradient renders, no JS error
- Three.js chunk loads only after canvas enters viewport (Network waterfall confirms)
- LCP improvement measurable vs. current baseline

---

### E3.3 — Particle System Specification (WebGL System)

**Preserved configuration** (do not change):

| Parameter | Value |
|---|---|
| Particle count | **6,000** |
| Pixel ratio cap | `Math.min(devicePixelRatio, 2)` |
| Anti-alias | `true` |
| Clear color | `#030014` |
| Fog | `FogExp2(0x030014, density: 0.015)` |
| Material | `PointsMaterial` + `AdditiveBlending` + `depthWrite: false` |
| Particle size | `0.28` |

**Particle color palette** (cosmically editorial):

| Color | Hex | Semantic |
|---|---|---|
| Indigo | `#6366f1` | Primary cosmic |
| Pink/Violet | `#ec4899` | Accent |
| Cyan | `#06b6d4` | Cool highlight |
| Amber | `#f59e0b` | Brand match |

**Scroll morph ranges**:

| Scroll % | Layout From | Layout To |
|---|---|---|
| 0 → 30% | Tunnel/Vortex | Grid Constellation |
| 30 → 65% | Grid | Wave Stream |
| 65 → 100% | Wave | Plasma Sphere (r=8) |

Lerp factor: `0.1` per frame (smooth, non-instant convergence).

---

### E3.4 — Scroll Storytelling Architecture (Repository Storytelling)

**Concept**: "The Archive of Living Code." The scroll story is not decoration — it's the product's core narrative. Every scroll chapter answers *why Anuvaad exists*.

**The 6-scene narrative** (600vh GSAP ScrollTrigger pin):

| Scene | Scroll % | What Happens | Emotional Beat |
|---|---|---|---|
| **Void** | 0–15% | Anonymous code block fades in — fibonacci, elegant, mysterious | "Code exists in silence" |
| **Split** | 15–35% | GSAP SplitText explodes each character; code chars begin to drift | "This is how machines see it" |
| **Morph** | 35–55% | Code chars float to English word positions (GSAP FLIP coordinate map) | "Translation is happening" |
| **Awaken** | 55–75% | Particles AWAKEN — rush from edges; orbit the formed English words | "The system is alive" |
| **Settle** | 75–90% | English text crystallizes; particles settle into word outlines | "Meaning has landed" |
| **Speak** | 90–100% | Typography reveal: "Anuvaad reads code like a language, not a syntax." | "This is what we built" |

**Character morph technique** (the hardest, most impressive part):
```
Algorithm:
1. Render fibonacci code block; measure each char's getBoundingClientRect()
2. Render English translation off-screen; measure target word positions
3. GSAP FLIP records original char positions
4. Rearrange DOM: code chars drift toward English word positions
5. GSAP FLIP.animate() — each char interpolates from recorded origin to new position
6. Chars with no English target: scatter off-screen (x: ±200, opacity: 0)
7. Particle targets updated to English word centroids via useScrollMorph.ts
Duration: scroll-driven (scrub: 0.5), not time-based
```

**GSAP ScrollTrigger configuration**:
```typescript
ScrollTrigger.create({
  trigger: '#section-moment',
  start: 'top top',
  end: '+=600vh',
  pin: true,
  scrub: 0.5,
  onUpdate: ({ progress }) => driveSceneByProgress(progress),
});
```

**Sections structure**:
```
features/landing/_sections/TranslationMoment/
├── index.tsx          ← ScrollTrigger pin + driveSceneByProgress() state machine
├── CodeArtifact.tsx   ← fibonacci function in <CodeSurface>; fades in 0–15%
├── CharMorph.tsx      ← GSAP FLIP coordinate map; char scatter + English assembly
└── NarrativeText.tsx  ← <RevealText by="word"> on narrative sentence at 90–100%
```

---

### Phase E3 — Exit Criteria

- [ ] Main thread animation frame budget < 1ms/frame (Workers verified in DevTools)
- [ ] WebGL CSS fallback renders without error on `--disable-webgl`
- [ ] Three.js loads after viewport intersection (Network waterfall confirmed)
- [ ] Scroll story pins for 600vh; all 6 scene transitions functional
- [ ] Character morph animates from code positions to English positions visually
- [ ] 60fps on modern laptop during scroll (< 8ms main thread per frame)
- [ ] `prefers-reduced-motion: reduce` skips to final state immediately
- [ ] Cross-browser: Chrome, Safari, Firefox — particle system or CSS fallback works

---

---

## Phase E4 — Landing V2 + Interactive Product Demo
### Weeks 11–16 · Risk: 🔴 High · Business Value: 🔴 High

> **Goal**: Awwwards Site of the Day quality. Custom cursor. Page transitions. GSAP SplitText on every major headline. Horizontal scroll feature comparison. Live interactive demo calling the real API with no account required. All 7 landing sections.

---

### E4.1 — Anonymous Demo API Endpoint (Interactive Product Demo)

**Backend change required** (small, isolated): `POST /api/demo/translate`

```
Auth:       None required
Rate limit: Redis SET demo:{ip} EX 3600 NX → max 3 per IP per hour
Model:      Groq (Llama 3.3-70b) only
Char limit: 1,000 characters (HTTP 400 if exceeded)
Response:   Identical SSE stream to authenticated /api/code-to-english
Tracking:   MetricsCollector as demo_requests
```

**Acceptance criteria**:
- 3 requests/IP/hour succeed; 4th returns HTTP 429
- 1,001 chars returns HTTP 400
- SSE stream delivers blocks identically to authenticated endpoint

---

### E4.2 — Custom Cursor (Landing V2)

**What it is**: An amber circle that replaces the default OS cursor on the landing page only. Context-aware: changes shape, size, and label based on what's being hovered.

```typescript
// useCursor.ts
// Track mousemove globally; lerp at 0.12 factor
// Hover detection: CTA buttons → state: 'click', code blocks → 'code', links → 'link'

// CustomCursor.tsx
// 20px amber circle; pointer-events: none; z-index: var(--z-cursor)
// States:
//   normal  → 20px amber ring
//   click   → 48px amber fill + "Click" label
//   code    → 36px indigo ring
//   link    → 28px amber ring
// mousedown: scale(0.8) spring compress
// Hidden on touch devices: @media (hover: none) { display: none }
```

Mounted inside `LandingPage.tsx` only — not in dashboard, not in auth pages.

---

### E4.3 — Page Transitions (Landing V2)

**What they are**: A black overlay performs a GSAP `clip-path` wipe on every App Router route change. Covers the seam between pages. Award judges love this.

```typescript
// PageTransition.tsx
const tl = gsap.timeline();
tl.to(overlay, { clipPath: 'inset(0 0 0% 0)', duration: 0.4, ease: 'power3.inOut' })
  .call(() => router.push(href))
  .to(overlay, { clipPath: 'inset(0 100% 0 0)', duration: 0.3, ease: 'power3.in' });
```

Hook into Next.js App Router via `usePathname` + `useEffect`. Fires on every navigation.

---

### E4.4 — Section 1: Void Entry / Hero (Landing V2)

**Visual state**:
- Full-viewport `#030014` canvas
- WebGL particles DORMANT (ambient drift only at mount)
- Single headline: **"Every Codebase Has a Story."**
- Subline: "Understand any codebase in minutes, not weeks."
- Two CTAs: "Try Free →" (`<MagneticButton>` amber) + "See the Story" (ghost)
- Amber eyebrow label: "Open Source Developer Tool"
- Scroll cue: 1px amber vertical line, pulses 0.5→1 opacity

**Headline animation** (GSAP SplitText, per-word):
```typescript
gsap.timeline({ defaults: { ease: 'power4.out' } })
  .from(eyebrow,  { opacity: 0, y: -16, duration: 0.7 },              0)
  .from(chars[],  { opacity: 0, y: 80, rotateX: -20,
                    filter: 'blur(12px)', stagger: 0.14, dur: 0.9 },   0.3)
  .from(subline,  { opacity: 0, y: 20, duration: 0.6 },               1.1)
  .from(ctas[],   { opacity: 0, y: 30, scale: 0.95, stagger: 0.08 },  1.4)
  .from(scrollCue,{ opacity: 0, scaleY: 0, duration: 0.4 },           1.8)
```

**WebGL triggers**: Scroll > 10% → particles stir; Scroll > 20% → morph toward grid.

---

### E4.5 — Section 3: Feature Comparison — Horizontal Scroll (Landing V2)

**Physical setup**: 300vh GSAP pin; horizontal 3-panel track driven by `xPercent: -200 * progress`.

**Three panels** (each full-width, Monaco left / Lora italic English right):
1. Code → English: Python Quick Sort
2. English → Code: TypeScript interface generation
3. Code → Code: Python → TypeScript transpilation

**Panel features**:
- GSAP `SplitText` on header as panel enters viewport
- Code lines type in at panel entry (18ms/line)
- `ProgressPill` — 3 amber dots; active dot expands to pill width, driven by scroll %
- Lenis horizontal momentum via `useHorizontalScroll.ts` (GSAP `scrollerProxy` pattern)

---

### E4.6 — Section 4: Live Demo (Interactive Product Demo)

**This is Anuvaad's killer feature on the landing page.** Judges, visitors, and journalists can try the real product without creating an account. No mock data.

```
features/landing/_sections/LiveDemo/
├── index.tsx          ← 80vh section; --surface-low bg; 1px --border-subtle border
├── DemoEditor.tsx     ← Monaco editor (editable, max 1,000 chars); Quick Sort in C pre-loaded
├── DemoOutput.tsx     ← SSE streaming output; StreamingView during stream; block cards after
└── DemoHint.tsx       ← "Try it. Right here. No account required." + char count indicator
```

**UX states**:

| State | What user sees |
|---|---|
| Initial | Monaco with pre-loaded C code snippet; char counter; "Translate →" MagneticButton |
| Streaming | Scan-line animation; text streaming in real-time from `/api/demo/translate` |
| Completed | Block cards (CodeSurface + TypographyProse); "This is what developers use every day." |
| Rate limited (4th req) | "Sign up for unlimited →" amber CTA replaces translate button |
| Char limit exceeded | Counter turns amber at 900, red at 1000; button disabled |

**Analytics**: `demo_used` event fires on first translation via `lib/analytics.ts`.

---

### E4.7 — Section 5: Social Proof (Landing V2)

| Component | Implementation |
|---|---|
| `LiveCounter.tsx` | Fetches `/api/stats/global` via ISR (60s revalidation); `<CountUp>` on viewport entry; amber `--glow-sm` on number |
| `LanguageGrid.tsx` | 7×5 grid of 35 language boxes (60px each); GSAP stagger glow `{ amount: 1.2, from: 'center', grid: [5,7] }` on IntersectionObserver entry |
| `TestimonialMarquee.tsx` | Preserve existing two-track infinite marquee (40s/45s); pause on hover |

---

### E4.8 — Section 6 + 7: Pricing + Final CTA (Landing V2)

**Pricing (Section 6)**:
- 2 cards: Free (₹0/month, 10 translations/day) and Pro (₹499/month, Unlimited)
- Pro card: `--border-active` shimmer border; "Most Popular" `<AmberBadge>`
- `<MagneticButton>` on "Activate Pro →"
- Honest feature lists; no dark patterns

**Final CTA (Section 7)**:
- 100vh; WebGL mode switches to `SPHERE` on viewport entry (particles converge from wave)
- `<RevealText by="word">` on "Start reading your codebase."
- Large amber `<MagneticButton>`: "Start Free →" → `/signup`
- Below: "No credit card. 10 free translations per day."

---

### E4.9 — Landing Navbar + Performance Audit (Landing V2)

**Landing Navbar**:
- Transparent at scroll top → `backdrop-filter: blur(20px)` frosted glass when scroll > 40px
- Logo (left) + Links: Features, Demo, Pricing, Docs (center) + "Sign In" ghost + "Try Free" amber (right)
- All links keyboard accessible

**Lighthouse targets** (non-negotiable for Awwwards submission):

| Metric | Target |
|---|---|
| Performance (desktop) | ≥ 85 |
| LCP | < 2.5s |
| CLS | 0 |
| FID | < 100ms |
| Accessibility | ≥ 90 |

**Performance checklist**:
- GSAP SplitText loaded lazily (dynamic import inside `useEffect`)
- Three.js chunk loads after IntersectionObserver fires (Network waterfall confirms)
- `font-display: swap` + `size-adjust` on all Google Fonts
- Bundle analyzer: no unintended chunk > 50KB gzipped

---

### Phase E4 — Exit Criteria

- [ ] Lighthouse Performance ≥ 85 (desktop landing)
- [ ] LCP < 2.5s, CLS = 0
- [ ] All 7 landing sections render in Chrome, Safari, Firefox
- [ ] Custom cursor functional on desktop; hidden on mobile/touch
- [ ] Live demo calls real API; SSE stream visible; rate limit UI shows on 4th request
- [ ] Page transitions fire on all route changes (verified in DevTools)
- [ ] WebGL SPHERE mode activates on Final CTA entry
- [ ] `prefers-reduced-motion: reduce` respected on all landing sections
- [ ] 0 console errors on full landing page load
- [ ] Awwwards technical checklist items below all checked:

| Awwwards Criterion | Requirement | Phase |
|---|---|---|
| Custom cursor | Amber circle + context label | E4 |
| Route transition | GSAP clip-path wipe | E4 |
| SplitText headlines | Every major headline | E3, E4 |
| Horizontal scroll | Feature comparison (300vh pin) | E4 |
| Live interactive demo | Real API, no auth | E4 |
| Magnetic CTAs | Spring proximity pull | E1 (primitive), E4 (usage) |
| WebGL particle system | 6,000 particles, scroll morph | E3 |
| Character-level morph | GSAP FLIP code→English | E3 |
| prefers-reduced-motion | 100% compliance | E1 |
| Custom scrollbar | 6px amber (already done ✅) | — |
| Lenis smooth scroll | Already present ✅ | — |

---

---

## Cross-Cutting Concerns

### Preserved From Current Implementation (Do Not Change)

- ✅ **SSE streaming + rAF batching** — `streamBufferRef` + `requestAnimationFrame` flush pattern; preserved exactly in `useTranslationStream.ts`
- ✅ **Monaco Editor integration** — dynamic import, stable options memo, language auto-detection
- ✅ **Two-way sync with DiffEditor** — edit English → sync to code → view diff; the highest-value differentiator
- ✅ **Amber/void brand palette** — distinctive color identity preserved in token system
- ✅ **Typography trio** — Inter (UI) + JetBrains Mono (code) + Lora italic (English output)
- ✅ **Glassmorphism depth system** — 3 semantic levels (amber, dark, apple) mapped to token primitives
- ✅ **Canvas confetti on completion** — dynamically imported; delightful micro-moment
- ✅ **Command palette** — ⌘K; keyboard accessible; dynamically imported on first open
- ✅ **Collapsible sidebar** — dual-mode (desktop expand/collapse / mobile drawer)
- ✅ **Lenis smooth scroll** — already integrated; preserved as-is

---

### Feature Flag Registry

```env
# Phase E2
NEXT_PUBLIC_DASHBOARD_V2=true          # New dashboard UI

# Phase E4
NEXT_PUBLIC_LANDING_V2=true            # New landing page
NEXT_PUBLIC_LIVE_DEMO_ENABLED=true     # Anonymous demo endpoint
NEXT_PUBLIC_CUSTOM_CURSOR=true         # Custom cursor (desktop only)
NEXT_PUBLIC_PAGE_TRANSITIONS=true      # Route transition wipes
```

---

### Risk Register (Experience Layer Only)

| ID | Risk | Phase | Likelihood | Impact | Mitigation |
|---|---|---|---|---|---|
| R1 | GSAP SplitText conflicts with SSR | E1, E4 | 🟡 Medium | 🟡 Medium | All SplitText in `useEffect` with `typeof window` guard |
| R2 | CSS split removes styles from routes | E1 | 🟡 Medium | 🟡 Medium | Playwright visual regression screenshots before/after each CSS move |
| R3 | Translate page decomposition breaks E2E | E2 | 🟡 Medium | 🔴 High | Run E2E after every extraction; keep `window.__monacoEditor` in MonacoInput.tsx |
| R4 | Character morph performance on mid-range mobile | E3 | 🔴 High | 🔴 High | Test on real Android device; `will-change: transform` on chars; reduce count if needed |
| R5 | WebGL OffscreenCanvas unsupported in Safari < 16.4 | E3 | 🔴 High | 🟠 Medium | Feature-detect `'transferControlToOffscreen' in canvas`; fall back to main-thread |
| R6 | GSAP ScrollTrigger conflicts with Lenis | E3, E4 | 🟡 Medium | 🟠 Medium | Use `ScrollTrigger.scrollerProxy` for Lenis (GSAP-documented pattern) |
| R7 | Anonymous demo API abuse | E4 | 🟡 Medium | 🔴 High | Redis 3 req/IP/hour; Cloudflare Turnstile CAPTCHA if abuse detected post-launch |
| R8 | Three.js IntersectionObserver timing breaks morph | E3 | 🟡 Medium | 🟡 Medium | `rootMargin: '200px'` gives buffer before section enters viewport |
| R9 | prefers-reduced-motion breaks marketing animations | E1 | 🟢 Low | 🟡 Medium | Only transform/opacity disabled; layout and colors unchanged |

---

### Success Metrics

| Metric | Current Baseline | Phase E4 Target |
|---|---|---|
| Lighthouse Performance (landing) | ~55 | ≥ 85 |
| Lighthouse Performance (dashboard) | ~65 | ≥ 85 |
| Lighthouse Accessibility | ~60 | ≥ 90 |
| LCP (landing) | ~3.5s | < 2.5s |
| CLS | Unknown | 0 |
| Dashboard JS bundle | ~450KB gzipped | < 280KB gzipped |
| `framer-motion` in bundle | ✅ Present (~60KB) | ❌ Removed |
| Largest frontend file | 1,391 lines | < 200 lines |
| `prefers-reduced-motion` compliance | 0% | 100% |
| Error boundary coverage | 0% | 100% |
| Custom cursor | ❌ | ✅ |
| Page transitions | ❌ | ✅ |
| Live interactive demo | ❌ | ✅ |
| Character-level morph animation | ❌ | ✅ |
| Awwwards submission readiness | ❌ | ✅ |

---

*Experience Layer Roadmap — Anuvaad · Generated 2026-06-10*  
*Synthesized from: technical_audit.md · technical_audit_v2.md · Project_backlog.md · Engineering Specification.md · Detailed Rebuild Plan.md · architecture_inventory.md*

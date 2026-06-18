# Anuvaad — Complete Implementation Specification
### Awwwards-Level Engineering Blueprint

> **Specification Date**: 2026-06-10  
> **Status**: Read-only specification — zero code changes made  
> **Synthesis of**: Technical Audit (v1 + v2) · Modernization Roadmap · Architecture Inventory · Master Blueprint

---

## Table of Contents

1. [React Component Tree](#1-react-component-tree)
2. [Page Hierarchy](#2-page-hierarchy)
3. [Feature Hierarchy](#3-feature-hierarchy)
4. [Design System Hierarchy](#4-design-system-hierarchy)
5. [Motion System Hierarchy](#5-motion-system-hierarchy)
6. [GSAP Timeline Architecture](#6-gsap-timeline-architecture)
7. [Three.js / WebGL Architecture](#7-threejs--webgl-architecture)
8. [Landing V2 Scene Breakdown](#8-landing-v2-scene-breakdown)
9. [Dashboard Redesign Breakdown](#9-dashboard-redesign-breakdown)
10. [Translator Modularization Breakdown](#10-translator-modularization-breakdown)
11. [API Layer Architecture](#11-api-layer-architecture)
12. [State Management Architecture](#12-state-management-architecture)
13. [Complete Folder Structure](#13-complete-folder-structure)
14. [Development Phases](#14-development-phases)
15. [Estimated Implementation Order](#15-estimated-implementation-order)

---

## 1. React Component Tree

The full component tree after all phases are complete. Providers wrap the entire application; features are isolated modules; pages are thin orchestrators.

```
<RootLayout>                              ← app/layout.tsx
  <ThemeProvider>                         ← next-themes
  <PostHogProvider>                       ← consent-gated analytics
  <TooltipProvider>                       ← Radix tooltip context
  <AuthProvider>                          ← Supabase session + isPro
  <SentryErrorBoundary>                   ← root-level error capture
  <Toaster />                             ← Sonner toast container
  <PageTransition>                        ← GSAP clip-path wipe on nav

  {/* ── Landing Routes ── */}
  <LandingPage>                           ← features/landing/LandingPage.tsx
    <CustomCursor />                      ← amber circle; context-aware label
    <WebGLCanvas />                       ← Three.js; OffscreenCanvas; z: -50
    <SmoothScroll>                        ← Lenis wrapper
      <LandingNavbar />
      <VoidEntry />                       ← Section 1: hero
        <RevealText />                    ← GSAP SplitText headline
        <MagneticButton />                ← spring proximity CTAs
        <ScrollCue />                     ← amber pulse line
      <TranslationMoment />               ← Section 2: 600vh pinned
        <CodeArtifact />
        <CharMorph />                     ← GSAP FLIP char→word
        <NarrativeText />
      <FeatureComparison />               ← Section 3: horizontal scroll
        <ComparePanel />  (×3)
        <ProgressPill />
      <LiveDemo />                        ← Section 4: interactive no-auth
        <DemoEditor />                    ← Monaco read/write
        <DemoOutput />                    ← SSE streaming
      <SocialProof />                     ← Section 5
        <LiveCounter />                   ← CountUp from ISR
        <LanguageGrid />
        <TestimonialMarquee />
      <PricingSection />                  ← Section 6
      <FinalCTA />                        ← Section 7: WebGL sphere
        <PlasmaSphere />
      <LandingFooter />
    </SmoothScroll>
  </LandingPage>

  {/* ── Auth Routes ── */}
  <AuthLayout>                            ← (auth)/layout.tsx
    <SignInPage />  |  <SignUpPage />  |  <ForgotPage />

  {/* ── Dashboard Routes ── */}
  <WorkspaceProvider>                     ← features/shell context
  <DashboardLayout>                       ← features/shell/DashboardLayout.tsx
    <Sidebar>                             ← icon rail + expandable
      <Logo />
      <NavLink /> (×6)
      <WorkspaceSwitcher />
      <UserCard />
      <UpgradeCTA />                      ← free users only
    </Sidebar>
    <MobileSidebar />                     ← sheet drawer
    <CommandPalette />                    ← ⌘K overlay
    <TopBar />                            ← breadcrumb + workspace + user menu

    <ErrorBoundary fallback={<ErrorCard />}>
      <Suspense fallback={<RouteSkeleton />}>

        {/* /dashboard */}
        <OverviewPage>
          <StatCards />
          <QuotaRing />
          <ActivityChart />
          <RecentTranslations />

        {/* /dashboard/translate */}
        <TranslatePage>
          <TranslateShell>
            <ModeSelector />
            <InputPanel>
              <MonacoInput />
              <LanguagePicker />
              <FileDropzone />
              <GistImportButton />
            </InputPanel>
            <OutputPanel>
              <StreamingView />      ← during SSE
              <BlocksView>           ← after completion
                <BlockCard /> (×n)
                  <EnglishEditor />
                  <BlockActions />
              </BlocksView>
              <DiffView />           ← sync comparison
            </OutputPanel>
            <Toolbar>
              <DownloadButton />
              <CopyButton />
              <ShareButton />
              <SyncButton />
            </Toolbar>
          </TranslateShell>

        {/* /dashboard/history */}
        <HistoryPage>
          <HistoryFilters />
          <HistoryList />
          <HistoryPagination />

        {/* /dashboard/billing */}
        <BillingPage>
          <CurrentPlanCard />
          <UpgradeCard />  |  <ProActiveCard />
          <PaymentStatusBanner />

        {/* /dashboard/settings */}
        <SettingsPage>
          <ProfileSection />
          <ApiPreferences />
          <AnalyticsConsent />

        {/* /dashboard/team */}
        <TeamPage>
          <WorkspaceCreate />
          <MemberList />
          <InviteForm />

        {/* /dashboard/welcome */}
        <OnboardingPage>
          <Stepper />
            <StepDemo />
            <StepModes />
            <StepLaunch />

      </Suspense>
    </ErrorBoundary>
  </DashboardLayout>

  {/* ── Public Routes ── */}
  <SharePage />                           ← /share/[id]
  <TermsPage />  |  <PrivacyPage />
```

---

## 2. Page Hierarchy

```
/                          Landing             Public   SSG/ISR
├── /signin                Sign In             Public   Client
├── /signup                Sign Up             Public   Client
├── /forgot-password       Password Reset      Public   Client
├── /terms                 Terms of Service    Public   SSG
├── /privacy               Privacy Policy      Public   SSG
├── /share/[id]            Public Share View   Public   SSR (dynamic)
│
├── /dashboard             Overview            Auth ✓   Client + RSC
│   ├── /translate         Core Translate      Auth ✓   Client (Monaco)
│   ├── /history           Translation Log     Auth ✓   Client + RSC
│   ├── /billing           Plan Management     Auth ✓   Client (Razorpay)
│   ├── /settings          Account Settings    Auth ✓   Client
│   ├── /team              Team Management     Auth ✓   Client
│   ├── /workspace         Workspace View      Auth ✓   Client
│   └── /welcome           Onboarding (once)  Auth ✓   Client
│
└── /api
    └── /auth/callback     OAuth Callback      Public   Route Handler

Internal Next.js routes:
  /opengraph-image         Dynamic OG image    Public   Route Handler
  /sitemap.ts              SEO sitemap         Public   Route Handler
```

### Page Auth Guard Strategy

| Guard Type | Mechanism | Routes |
|---|---|---|
| **Server-side** | `proxy.ts` middleware validates Supabase JWT | All `/dashboard/*` |
| **Client-side** | `useEffect` → `router.push('/signin')` | Dashboard layout fallback |
| **Onboarding** | `user_metadata.onboarded` check | Dashboard layout |
| **Pro gate** | `isPro` from `AuthContext` | Billing features, pro quota |

---

## 3. Feature Hierarchy

Each feature is a self-contained vertical slice: hooks + components + types + constants.

```
features/
│
├── landing/               LANDING PAGE (Phase 5)
│   ├── Sections: VoidEntry · TranslationMoment · FeatureComparison
│   │             LiveDemo · SocialProof · Pricing · FinalCTA
│   ├── Canvas: WebGLCanvas · useParticleSystem · useScrollMorph
│   ├── Cursor: CustomCursor · useCursor
│   ├── Transitions: PageTransition
│   └── Hooks: useSmoothScroll · useHorizontalScroll · useMagneticButton
│
├── translate/             CORE TRANSLATION FEATURE (Phase 1 + 4)
│   ├── Hooks: useTranslationStream · useFileImport
│   │          useLanguageDetection · useTranslationSession
│   ├── Components: TranslateShell · InputPanel · OutputPanel
│   │               BlockCard · Toolbar
│   ├── Constants: languages · modes · extensions
│   └── Types: TranslationBlock · TranslationMode · FileImportResult
│
├── overview/              DASHBOARD HOME (Phase 4)
│   ├── Components: StatCards · QuotaRing · ActivityChart
│   │               RecentTranslations
│   └── Hooks: useOverviewData
│
├── billing/               BILLING + UPGRADE (Phase 4)
│   ├── Components: CurrentPlanCard · UpgradeCard · ProActiveCard
│   │               PaymentStatusBanner
│   └── Hooks: useRazorpay
│
├── history/               HISTORY LOG (Phase 4)
│   ├── Components: HistoryFilters · HistoryList · HistoryItem
│   │               HistoryPagination
│   └── Hooks: useHistory
│
├── settings/              ACCOUNT SETTINGS (Phase 4)
│   ├── Components: ProfileSection · ApiPreferences · AnalyticsConsent
│   └── Hooks: useSettings
│
├── team/                  TEAM MANAGEMENT (Phase 4)
│   ├── Components: WorkspaceCreate · MemberList · InviteForm
│   └── Hooks: useTeam
│
├── onboarding/            WELCOME FLOW (Phase 4)
│   ├── Components: Stepper · StepDemo · StepModes · StepLaunch
│   └── Hooks: useOnboarding
│
├── shell/                 APP SHELL (Phase 1)
│   ├── DashboardLayout · Sidebar · MobileSidebar
│   ├── SidebarContent · WorkspaceSwitcher · UserCard · UpgradeCTA
│   └── NavLink · TopBar
│
└── auth/                  AUTH PAGES (Phase 0–1)
    ├── SignInPage · SignUpPage · ForgotPage
    └── Hooks: useAuthForm
```

### Feature Contracts

1. **Pages import features only** — `dashboard/translate/page.tsx` imports `features/translate` exclusively
2. **Features never cross-import** — `billing` does not import from `translate`
3. **Shared state via context** — `AuthContext`, `WorkspaceContext` only
4. **Feature-local types** — `features/{name}/_types/` for private types; `src/types/` for global shapes
5. **Feature-local hooks** — `lib/hooks.ts` contains only SWR infrastructure hooks

---

## 4. Design System Hierarchy

### 4.1 Token File Hierarchy

```
src/design/tokens/
├── color.css          ← All color primitives + semantic aliases
├── typography.css     ← Font scale · line-height · letter-spacing tokens
├── spacing.css        ← 4px-base grid spacing scale
├── radius.css         ← Border radius scale
├── shadow.css         ← Shadow + glow token definitions
├── animation.css      ← Duration · easing · stagger tokens
└── z-index.css        ← Layer constants (--z-canvas / --z-base / --z-overlay / --z-cursor)
```

### 4.2 Color Token Hierarchy

```
Tier 1: Primitives (exact values, never used in components directly)
  --amber-{50…900}       → amber scale
  --void-{50…900}        → near-black scale (obsidian)
  --neutral-{50…900}     → grey scale

Tier 2: Semantic Surface Tokens (used in components)
  --surface-base          #030014    Page void / canvas
  --surface-low           #080c14    Dashboard background
  --surface-mid           #0c0f1a    Card surface
  --surface-high          #111520    Elevated component
  --surface-overlay       #161b28    Modal / popover

Tier 3: Semantic Border Tokens
  --border-faint          rgba(245,158,11,0.06)
  --border-subtle         rgba(245,158,11,0.10)
  --border-default        rgba(245,158,11,0.18)
  --border-active         rgba(245,158,11,0.40)
  --border-focus          rgba(245,158,11,0.70)

Tier 4: Semantic Text Tokens
  --text-primary          #e8ecf0
  --text-secondary        #8899aa
  --text-muted            #5a6a7a
  --text-disabled         #3a4a5a
  --text-brand            #f59e0b
  --text-on-brand         #020204

Tier 5: Glow Tokens
  --glow-xs    0 0  8px rgba(245,158,11,0.20)
  --glow-sm    0 0 12px rgba(245,158,11,0.25)
  --glow-md    0 0 24px rgba(245,158,11,0.35)
  --glow-lg    0 0 48px rgba(245,158,11,0.25), 0 0 100px rgba(245,158,11,0.10)

Tier 6: Feedback / Status
  --status-success    #10b981
  --status-warning    #f59e0b
  --status-danger     #ef4444
  --status-info       #3b82f6
```

### 4.3 Typography Token Hierarchy

```
Font Families:
  --font-display    Inter            Headlines, large UI
  --font-body       Inter            Body text, labels
  --font-code       JetBrains Mono   Code blocks, Monaco, terminal
  --font-prose      Lora (italic)    English translation output

Type Scale (Major Third, 1.25×):
  --text-2xs   0.625rem  (10px)
  --text-xs    0.75rem   (12px)
  --text-sm    0.875rem  (14px)
  --text-base  1rem      (16px)
  --text-lg    1.25rem   (20px)
  --text-xl    1.5rem    (24px)
  --text-2xl   2rem      (32px)
  --text-3xl   2.5rem    (40px)
  --text-4xl   3.5rem    (56px)
  --text-5xl   5rem      (80px)
  --text-hero  7rem      (112px) — landing headline only

Line Heights:
  --leading-tight    1.1
  --leading-snug     1.25
  --leading-normal   1.5
  --leading-relaxed  1.7

Letter Spacing:
  --tracking-tight    -0.04em
  --tracking-normal    0em
  --tracking-wide      0.05em
  --tracking-wider     0.12em
  --tracking-widest    0.20em
```

### 4.4 CSS File Hierarchy

```
src/design/css/
├── base.css              @layer base: reset, body, scrollbar, focus-visible
├── tokens.css            @import all 7 token files
├── animations.css        All 25+ @keyframes (named library)
├── utilities.css         .glass-amber, .glow-border, .btn-amber-shimmer, etc.
├── components.css        .terminal-panel, .premium-card, .status-dot, etc.
│
├── landing.css           Aurora orbs, marquee, scan-line, perspective
├── dashboard.css         Sidebar glow, progress bar, typing-dots, block-enter
└── auth.css              Auth-bg radial gradients

app/globals.css           @import base.css + tokens.css + utilities.css only (~50 lines)
app/dashboard/layout.css  @import dashboard.css
(auth)/layout.css         @import auth.css
features/landing/         import landing.css internally
```

### 4.5 Design Primitive Component Hierarchy

```
src/design/primitives/                  ← Anuvaad's own design-system atoms
├── Surface.tsx            Semantic surface level={0|1|2|elevated}
├── GlassPanel.tsx         Glassmorphism level={amber|dark|apple}
├── GlowBorder.tsx         Animated amber border with box-shadow glow
├── CodeSurface.tsx        Dark monospace code surface (.terminal-panel)
├── AmberBadge.tsx         Amber pill badge (plan, status)
├── StatusDot.tsx          Animated presence indicator (online/offline)
└── TypographyProse.tsx    Lora italic wrapper for English translation output

src/components/ui/                      ← shadcn/ui (do not modify)
├── Accordion · Avatar · Badge · Button · Card · Checkbox
├── Command · Dialog · DropdownMenu · Input · Label
├── Popover · Select · Separator · Sheet · Skeleton
├── Tabs · Textarea · Tooltip

src/components/editors/                 ← Editor wrappers
├── MonacoEditor.tsx       Dynamic import, stable options memo, lang detection
└── MonacoDiffEditor.tsx   Diff view for original vs. synced code

src/components/charts/                  ← Promoted from feature-level
├── QuotaRing.tsx          SVG radial quota ring ({used, total, isPro})
└── ActivityChart.tsx      7-day bar chart

src/components/overlays/
└── CommandPalette.tsx     Global ⌘K (cmdk)
```

### 4.6 Glassmorphism Depth Hierarchy

| Class | Surface | Blur | Use Case |
|---|---|---|---|
| `.glass-amber` | `rgba(18,18,24,0.70)` | `blur(20px)` | Landing panels, hero cards |
| `.glass-dark` | `rgba(8,12,20,0.80)` | `blur(24px)` | Auth pages, modals |
| `.glass-apple` | `rgba(255,255,255,0.45)` | `blur(32px) saturate(180%)` | macOS-style overlays |
| `.premium-card` | Dark gradient | — | Dashboard feature cards |

---

## 5. Motion System Hierarchy

### 5.1 Engine Decision

**Single engine: GSAP 3.15**

- Framer Motion removed (saves ~60KB gzipped from dashboard bundle)
- GSAP already present; zero marginal bundle cost to extend
- GSAP FLIP handles layout transitions natively
- GSAP `context()` API ensures safe cleanup in React effects
- GSAP ScrollTrigger integrates with Lenis via `scrollerProxy`

### 5.2 Animation Token Hierarchy

```
src/design/tokens/animation.css

Durations:
  --dur-instant     50ms
  --dur-fast        150ms
  --dur-normal      300ms
  --dur-slow        500ms
  --dur-slower      800ms
  --dur-cinematic   1200ms

Easing Curves:
  --ease-out-expo    cubic-bezier(0.16, 1, 0.3, 1)
  --ease-out-back    cubic-bezier(0.34, 1.56, 0.64, 1)
  --ease-in-out      cubic-bezier(0.4, 0, 0.2, 1)
  --ease-spring      cubic-bezier(0.175, 0.885, 0.32, 1.275)

Stagger Steps:
  --stagger-xs   40ms
  --stagger-sm   60ms
  --stagger-md  100ms
  --stagger-lg  160ms
```

### 5.3 Motion Primitive Component Hierarchy

```
src/components/motion/
│
├── FadeIn.tsx              opacity 0→1; accepts {delay, duration, from}
├── SlideUp.tsx             opacity 0→1 + y 20→0; accepts {delay}
├── RevealText.tsx          GSAP SplitText char/word reveal; accepts {by: "char"|"word"}
├── StaggerContainer.tsx    GSAP stagger scope; accepts {stagger, from}
├── MagneticButton.tsx      Mouse-proximity spring pull on CTA elements
├── ParallaxLayer.tsx       Scroll-driven y translation via ScrollTrigger
├── CountUp.tsx             Animated number counter to target value
├── GlowIn.tsx              box-shadow 0 → var(--glow-md) on mount
├── TextScramble.tsx        Cyberpunk character scramble reveal (code aesthetic)
├── PageTransition.tsx      GSAP clip-path wipe on route change
└── ReducedMotion.tsx       Wraps children; strips all animations if prefers-reduced-motion
```

### 5.4 Motion Hook Architecture

```typescript
// src/lib/motion.ts

// Central config — import everywhere; never hardcode values
export const motionConfig = {
  ease: {
    outExpo:  'power4.out',
    spring:   'back.out(1.4)',
    inOut:    'power2.inOut',
    sharp:    'power3.inOut',
  },
  duration: {
    instant:   0.05,
    fast:      0.15,
    normal:    0.30,
    slow:      0.50,
    cinematic: 1.20,
  },
  stagger: { xs: 0.04, sm: 0.06, md: 0.10, lg: 0.16 },
} as const;

// Safe in SSR — checks at runtime
export function useMotionSafe(): boolean;

// GSAP context scoped to a ref; auto-reverts on unmount
export function useGsapContext(ref: RefObject<HTMLElement>): gsap.Context;
```

### 5.5 CSS-Only Animation Replacement (Framer Motion Removal)

```css
/* dashboard.css */
.animate-block-in {
  opacity: 0;
  transform: translateY(15px);
  animation: block-enter 0.4s var(--ease-out-expo) var(--delay, 0ms) forwards;
}
@keyframes block-enter {
  to { opacity: 1; transform: translateY(0); }
}
```

```tsx
{/* Usage — no JS animation library required */}
<div className="animate-block-in" style={{ '--delay': `${Math.min(idx * 50, 400)}ms` }}>
  <BlockCard />
</div>
```

### 5.6 `prefers-reduced-motion` Strategy

- All GSAP animations check `useMotionSafe()` before registering
- All CSS keyframes are wrapped in `@media (prefers-reduced-motion: no-preference) { ... }`
- `<ReducedMotion>` component provides tree-level opt-out
- Scrollbar, cursor, and structural transitions are always preserved

---

## 6. GSAP Timeline Architecture

### 6.1 Landing Page Timelines

#### Hero Entrance Timeline (`VoidEntry/Headline.tsx`)
```
gsap.timeline({ defaults: { ease: 'power4.out' } })
  .from(eyebrow,    { opacity: 0, y: -16, duration: 0.7 },           0)
  .from(chars[],    { opacity: 0, y: 80, rotateX: -20, blur: 12,
                      stagger: 0.14, duration: 0.9 },                 0.3)
  .from(subline,    { opacity: 0, y: 20, duration: 0.6 },            1.1)
  .from(ctas[],     { opacity: 0, y: 30, scale: 0.95,
                      stagger: 0.08, duration: 0.5 },                 1.4)
  .from(scrollCue,  { opacity: 0, scaleY: 0, duration: 0.4 },        1.8)
```

#### Translation Moment ScrollTrigger (`TranslationMoment/index.tsx`)
```
ScrollTrigger.create({
  trigger: '#section-moment',
  start: 'top top',
  end: '+=600vh',
  pin: true,
  scrub: 0.5,
  onUpdate: ({ progress }) => {
    // 0.00–0.15  → scene: code block fade in
    // 0.15–0.35  → scene: SplitText chars scatter (GSAP FLIP)
    // 0.35–0.55  → scene: English words assemble
    // 0.55–0.75  → scene: particles AWAKEN + converge
    // 0.75–0.90  → scene: particles settle into word outlines
    // 0.90–1.00  → scene: narrative text settles
    driveSceneByProgress(progress);
  }
});
```

#### Feature Comparison Horizontal Pin (`FeatureComparison/index.tsx`)
```
ScrollTrigger.create({
  trigger: '#section-compare',
  start: 'top top',
  end: '+=300vh',
  pin: true,
  scrub: 0.8,
  onUpdate: ({ progress }) => {
    gsap.set(panelTrack, { xPercent: -200 * progress });
    // Progress pill: each panel at 0.0, 0.33, 0.66
    updateProgressPill(progress);
  }
});
```

#### Social Proof / Language Grid (`SocialProof/LanguageGrid.tsx`)
```
ScrollTrigger.create({
  trigger: '#language-grid',
  start: 'top 80%',
  once: true,
  onEnter: () => {
    gsap.from('.lang-box', {
      opacity: 0,
      scale: 0.8,
      stagger: { amount: 1.2, from: 'center', grid: [5, 7] },
      duration: 0.4,
      ease: 'back.out(1.4)',
    });
  }
});
```

#### Final CTA Particle Sphere Trigger
```
ScrollTrigger.create({
  trigger: '#section-final-cta',
  start: 'top 70%',
  once: true,
  onEnter: () => {
    activatePlasmaSphere();         // signals WebGL canvas
    gsap.from(finalChars, { y: 60, opacity: 0, stagger: 0.08, duration: 0.7 });
    gsap.from(ctaButton,  { scale: 0.9, opacity: 0, duration: 0.5, delay: 0.6 });
  }
});
```

### 6.2 Dashboard Page Transition Timeline

```
// PageTransition.tsx — fires on every App Router navigation
const tl = gsap.timeline();
tl.to(overlay, { clipPath: 'inset(0 0 0% 0)', duration: 0.4, ease: 'power3.inOut' })
  .call(() => router.push(href))
  .to(overlay, { clipPath: 'inset(0 100% 0 0)', duration: 0.3, ease: 'power3.in' });
```

### 6.3 Character Morph Timeline (Section 2 — Key Technique)

```
Algorithm:
1. Render code block; measure each character's getBoundingClientRect()
2. Render English words off-screen; measure target positions
3. Use GSAP FLIP to record original positions
4. Rearrange DOM (code chars drift to English word positions)
5. GSAP FLIP.animate() — each char animates from recorded origin to new position
6. Chars that have no English target: scatter off-screen with gsap.to(char, { x: ±200, opacity: 0 })
7. Particle targets updated to English word centroids via useScrollMorph.ts

Duration: driven by scroll (scrub: 0.5); not time-based
```

### 6.4 Magnetic Button Timeline

```typescript
// useMagneticButton.ts
onMouseMove: ({ clientX, clientY }) => {
  const { left, top, width, height } = el.getBoundingClientRect();
  const x = clientX - (left + width / 2);
  const y = clientY - (top + height / 2);
  gsap.to(el, { x: x * 0.35, y: y * 0.35, duration: 0.3, ease: 'power2.out' });
};
onMouseLeave: () => {
  gsap.to(el, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
};
```

---

## 7. Three.js / WebGL Architecture

### 7.1 Component Ownership

```
features/landing/_canvas/
├── WebGLCanvas.tsx         React host component
│   ├── Detects WebGLRenderingContext availability
│   ├── Falls back to <CSSGradientBackdrop /> if unavailable
│   ├── Uses IntersectionObserver to defer init until near viewport
│   └── Transfers canvas to OffscreenCanvas + Worker on supported browsers
│
├── particle.worker.ts      Web Worker (OffscreenCanvas)
│   ├── Receives { canvas, width, height, dpr } from main thread
│   ├── Owns Three.js renderer, scene, camera, particles
│   ├── Receives postMessage: { type: 'scroll', value: 0-1 }
│   ├── Receives postMessage: { type: 'mouse', x, y }
│   ├── Receives postMessage: { type: 'mode', mode: 'dormant'|'active'|'sphere' }
│   └── rAF render loop runs entirely in Worker — zero main thread cost
│
├── useParticleSystem.ts    Particle init + layout computation
│   └── Computes 4 layout position buffers: tunnel / grid / wave / sphere
│
└── useScrollMorph.ts       Scroll → layout interpolation signal
    ├── Reads Lenis scroll progress (0→1)
    ├── Maps ranges: 0–0.30 tunnel→grid, 0.30–0.65 grid→wave, 0.65–1.0 wave→sphere
    └── Posts { type: 'scroll', value } to worker on every Lenis scroll event
```

### 7.2 Particle System Specification

| Parameter | Value |
|---|---|
| Particle count | **6,000** |
| Pixel ratio cap | `Math.min(devicePixelRatio, 2)` |
| Anti-alias | `true` |
| Clear color | `#030014` |
| Fog | `FogExp2(0x030014, density: 0.015)` |
| Material | `PointsMaterial` + `AdditiveBlending` + `depthWrite: false` |
| Particle size | `0.28` |
| Opacity | `0.85` |
| Texture | Canvas-generated radial gradient (32×32 px) |

### 7.3 Particle Color Palette

| Color | Hex | Semantic |
|---|---|---|
| Indigo | `#6366f1` | Primary cosmic |
| Pink/Violet | `#ec4899` | Accent |
| Cyan | `#06b6d4` | Cool highlight |
| Amber/Gold | `#f59e0b` | Brand match |

### 7.4 Particle Layout Morph Ranges (scroll-driven)

| Scroll % | From | To | Effect |
|---|---|---|---|
| 0 → 30% | Tunnel/Vortex | Grid Constellation | Spiral → flat grid |
| 30 → 65% | Grid | Wave Stream | Grid → sinusoidal wave |
| 65 → 100% | Wave | Plasma Sphere | Wave → central sphere (r=8) |

**Lerp factor**: `0.1` per frame (smooth, non-instant)

### 7.5 WebGL Mode States

```
DORMANT   → Hero viewport; particles barely move; ambient drift only
ACTIVE    → Section 2–3; full scroll morph cycle running
SPHERE    → Final CTA section; particles collapse to sphere; rotate 0.02/frame
FALLBACK  → No WebGL; CSS animated gradient replaces canvas
```

### 7.6 Worker Communication Protocol

```typescript
// Main → Worker messages
type WorkerInbound =
  | { type: 'init';   canvas: OffscreenCanvas; width: number; height: number; dpr: number }
  | { type: 'resize'; width: number; height: number; dpr: number }
  | { type: 'scroll'; value: number }      // 0–1 normalized
  | { type: 'mouse';  x: number; y: number }  // normalized -1 to 1
  | { type: 'mode';   mode: WebGLMode }
  | { type: 'destroy' }

// Worker → Main messages (minimal — for perf diagnostics only)
type WorkerOutbound =
  | { type: 'ready' }
  | { type: 'fps'; value: number }
```

### 7.7 Graceful Fallback

```tsx
// WebGLCanvas.tsx
const hasWebGL = typeof WebGLRenderingContext !== 'undefined' &&
  !!document.createElement('canvas').getContext('webgl');

if (!hasWebGL) return <CSSGradientBackdrop />;
```

```css
/* CSSGradientBackdrop — CSS-only particle substitute */
.css-backdrop {
  background: radial-gradient(ellipse at 30% 50%, rgba(99,102,241,0.15) 0%, transparent 60%),
              radial-gradient(ellipse at 70% 20%, rgba(245,158,11,0.12) 0%, transparent 50%),
              #030014;
  animation: aurora-drift 14s ease-in-out infinite;
}
```

---

## 8. Landing V2 Scene Breakdown

### Section 1 — Void Entry (Hero)

```
Viewport: 100vh
Background: #030014 (var(--surface-base))
WebGL state: DORMANT (ambient drift only)

Elements:
  ┌─────────────────────────────────────────────────┐
  │   [amber eyebrow label]     ← fade in 0.7s       │
  │                                                   │
  │   Every Codebase             ← GSAP SplitText     │
  │   Has a Story.               ← word-by-word       │
  │                              ← y:80→0, blur:12→0  │
  │   [subline text]             ← fade up 0.6s       │
  │                                                   │
  │   [Try Free ↗]  [See the Story]  ← MagneticButton │
  │                                                   │
  │         ╏ amber pulse line ╏  ← scroll cue        │
  └─────────────────────────────────────────────────┘

GSAP Timeline:
  t=0.0s  eyebrow: opacity 0→1, y -16→0
  t=0.3s  headline chars: stagger 0.14s each, y 80→0, blur 12→0
  t=1.1s  subline: opacity 0→1, y 20→0
  t=1.4s  CTAs: stagger 0.08s, scale 0.95→1, opacity 0→1
  t=1.8s  scrollCue: scaleY 0→1, opacity 0→1

WebGL trigger:
  scroll > 10%  → particles begin to stir
  scroll > 20%  → morph toward grid layout
```

### Section 2 — The Translation Moment (600vh Pinned)

```
Viewport: 100vh (pinned for 600vh of scroll)
ScrollTrigger scrub: 0.5

Scene Progression by scroll %:

  [0–15%]   CODE ARTIFACT
    → Anonymous fibonacci function fades in (beautiful, readable)
    → Font: JetBrains Mono, size: 18px, color: var(--text-primary)
    → Border: 1px solid var(--border-subtle), glow: var(--glow-xs)

  [15–35%]  CHAR SCATTER
    → GSAP SplitText splits every character individually
    → Each char: position recorded with FLIP
    → Chars begin to drift apart with gentle delay stagger
    → Code becomes unreadable — chars dispersed

  [35–55%]  ENGLISH ASSEMBLY
    → English words appear at centroid positions in the void
    → Chars navigate from code positions to English word positions
    → Algorithm: code_char_pos → gsap.FLIP → target_english_pos
    → Chars with no target: float off-screen + opacity 0

  [55–75%]  PARTICLE AWAKENING
    → Worker receives: { type: 'mode', mode: 'active' }
    → Particles rush from periphery toward English word centroids
    → useScrollMorph.ts passes English word positions as particle targets

  [75–90%]  SETTLEMENT
    → Particles slow → settle → outline English word shapes
    → English text itself: opacity 1, Lora italic, amber color
    → Amber glow emerges on formed words (var(--glow-sm))

  [90–100%] NARRATIVE
    → Code and particles fade to low opacity
    → Typography emerges: "Anuvaad reads code like a language, not a syntax."
    → RevealText word-by-word (--dur-cinematic)
    → Amber underline draws under "language"
```

### Section 3 — Feature Comparison (Horizontal Scroll, 300vh)

```
Viewport: 100vh (pinned for 300vh of scroll)
Track: 3 full-width panels, translates X 0 → -200%
GSAP scrub: 0.8

Panel 1: Code → English
  Left:  Monaco Editor (read-only, pre-populated: Python sorting algo)
  Right: Lora italic English output with amber rule separator
  Header: "Code → English" amber small-caps label
  Entry:  GSAP SplitText on header as panel enters

Panel 2: English → Code
  Left:  English description (natural language)
  Right: Generated TypeScript with line-by-line type-in animation
  Header: "English → Code"

Panel 3: Code → Code
  Left:  Python source
  Right: TypeScript equivalent with dual language badge
  Header: "Code ↔ Code"

Progress indicator:
  Bottom-center: 3 amber dots; active dot expands to pill width
  Dot transitions: scale 1→3 + opacity, driven by scroll %

Interaction hint:
  Cursor enters panel area: subtle "← Scroll →" text appears at 0.5 opacity
  Touch/trackpad: natural horizontal momentum via Lenis
```

### Section 4 — Live Demo (Interactive, No Auth Required)

```
Viewport: ~80vh
Background: var(--surface-low)
Border: 1px solid var(--border-subtle)

Layout:
  ┌──────────────────────┬──────────────────────┐
  │   Monaco Editor      │   Translation Output  │
  │   (user-editable)    │   (SSE streaming)     │
  │                      │                       │
  │   Pre-loaded:        │   [typing indicator]  │
  │   Quick Sort in C    │   then:               │
  │                      │   [English blocks]    │
  └──────────────────────┴──────────────────────┘
  [ Translate → ]  amber button (magnetic)
  "Try it. Right here. No account required." eyebrow

Behaviour:
  → User can edit Monaco (1,000-char limit indicator)
  → Click Translate → calls POST /api/demo/translate
  → SSE stream renders in right panel with scan-line animation
  → After completion: "This is what 100,000+ developers use."
  → Rate limit: 3 req/IP/hour (enforced via Redis)
  → If limit hit: "Sign up for unlimited →" amber CTA

Backend endpoint:
  POST /api/demo/translate
  Auth: none
  Rate limit: 3/IP/hour (Redis)
  Model: Groq (Llama 3.3-70b) only
  Char limit: 1,000 (hard)
  Response: SSE stream identical to authenticated endpoint
```

### Section 5 — Social Proof

```
Three subsections:

5A. LiveCounter
  → Fetches /api/stats/global (Next.js ISR, 60s revalidate)
  → CountUp animation: 0 → {total} over 1.5s when viewport-entered
  → Label: "translations and counting"
  → Amber glow on number (--glow-sm)

5B. Language Grid (35 languages × 5 rows × 7 cols)
  → Each box: language name + icon, 60px×60px, border: var(--border-subtle)
  → On viewport enter (IntersectionObserver): GSAP stagger glow
    gsap.from('.lang-box', { opacity:0, scale:0.8, stagger:{ amount:1.2, from:'center' } })
  → Hover: individual box lifts with var(--glow-md)

5C. Testimonial Marquee
  → Two-track infinite scroll (existing mechanism preserved)
  → Track A: 40s → Track B: 45s (reverse)
  → Pauses on hover
```

### Section 6 — Pricing

```
Two cards: Free / Pro
Minimal design; honest feature lists; no dark patterns

Free:        ₹0/month · 10 translations/day · 35 langs · 3 modes
Pro:         ₹499/month · Unlimited · DeepSeek · Team workspaces · API access

Pro card:
  → Amber shimmer border (--border-active + animation)
  → "Most Popular" pill badge
  → MagneticButton on "Activate Pro →"
```

### Section 7 — Final CTA

```
Viewport: 100vh
WebGL state: SPHERE (plasma sphere activated on scroll enter)

Elements:
  → Sphere: r=8 units, rotates 0.02rad/frame, mouse-distorted
  → Headline: "Start reading your codebase."
    GSAP SplitText on scroll enter
  → Button: "Start Free →" (MagneticButton, large amber shimmer)
  → Below: "No credit card. 10 free translations per day."

WebGL sphere signal:
  IntersectionObserver fires when section > 50% visible
  → postMessage({ type: 'mode', mode: 'sphere' })
  → Particles converge from wave layout to sphere over 2s (lerp accelerated)
```

---

## 9. Dashboard Redesign Breakdown

### 9.1 Shell Architecture

```
Layout Shell Strategy:
  Desktop: Fixed icon rail (60px) always visible + expandable full sidebar (224px)
  Mobile:  Hidden; hamburger trigger → full-width slide-in Sheet

TopBar: sticky 48px bar
  Left:  breadcrumb path (Dashboard > Translate)
  Center: workspace switcher dropdown
  Right: theme toggle + user avatar menu

Sidebar icon rail (always visible):
  Icons: Dashboard · Translate · History · Billing · Settings · Team
  Expand: hover or click toggle → shows labels at 224px
  Active indicator: left 3px amber inset border + subtle glow
  Bottom: user avatar → popover menu (settings, sign out)

Upgrade CTA:
  Collapsed: amber gem icon with tooltip
  Expanded: card with plan name, usage bar, "Upgrade" button
```

### 9.2 Dashboard Overview Redesign

```
Layout: CSS Grid, 2 columns on md+, 1 column mobile

Row 1: Stat Cards (4 cards)
  → Data-driven: {label, value, delta, icon}
  → SlideUp animation on mount (stagger 0.08s)
  → CountUp on numeric values

Row 2: QuotaRing (left) + ActivityChart (right)
  QuotaRing:
    → SVG circle; stroke-dashoffset animated on mount (1s ease)
    → Color: green → amber → red based on usage %
    → Center text: "{used}/{total}" + plan label
  ActivityChart:
    → 7 SVG bars; height transition 0→{value} on mount (700ms)
    → Hover: bar highlights amber + tooltip

Row 3: Recent Translations (table)
  → Last 5 translations
  → Mode badge · Language pair · Timestamp · View link
  → Skeleton during loading (App Router Suspense)
  → "View All →" link to /history

Quick Actions (small card grid):
  → Code→English · English→Code · Code→Code
  → Each: icon + label + arrow; hover lift

RSC strategy:
  → server component fetches initial stats
  → client component handles animation + polling
```

### 9.3 Sidebar Polish Points

| Element | Current | Target |
|---|---|---|
| Collapse mode | Full collapse 60px | Icon rail always visible |
| Mobile | Sheet drawer | Same; improved z-index |
| Workspace switcher | Dropdown (free tier always shown) | Only when ≥1 workspace exists |
| User card | Avatar + email + badge | Avatar → popover with menu |
| Upgrade CTA | Static card | Animated shimmer border |
| Nav active | Left border + bg | Left border + glow + text amber |

### 9.4 Error Boundary Strategy

```tsx
// Every dashboard route is wrapped:
<ErrorBoundary
  fallback={({ error, reset }) => (
    <ErrorCard
      title="Something went wrong"
      description={error.message}
      onRetry={reset}
    />
  )}
>
  <Suspense fallback={<RouteSkeleton />}>
    <FeaturePage />
  </Suspense>
</ErrorBoundary>
```

### 9.5 Loading State Architecture

```
Every dashboard route has:
  app/dashboard/{route}/loading.tsx    ← App Router streaming skeleton
  
Skeleton strategy:
  OverviewPage   → StatCards skeleton (4×) + rings placeholder
  TranslatePage  → Monaco skeleton (left) + output skeleton (right)
  HistoryPage    → List skeleton (5 rows)
  BillingPage    → Card skeleton (2×)
```

### 9.6 Onboarding Flow Redesign

```
OnboardingPage (/dashboard/welcome)
  → Stepper: 3 steps with animated slide transitions (GSAP xPercent)
  → Progress: localStorage checkpoint (don't lose step on refresh)
  → Completion: sets user_metadata.onboarded = true via Supabase

Step 1: Demo
  → Pre-loaded translation example (fibonacci → English)
  → "This is what Anuvaad does." heading
  → Animated code → English reveal (SlideUp)

Step 2: Modes
  → 3 mode cards: Code→English / English→Code / Code→Code
  → Each card: animated icon + description
  → Hover: card lifts + border glows

Step 3: Launch
  → "You're ready." heading
  → CountUp: "Join 10,000+ developers"
  → Single CTA: "Open Translator →"
  → Confetti burst (canvas-confetti, dynamic import)
```

---

## 10. Translator Modularization Breakdown

### 10.1 Current State vs. Target

| Metric | Current | Target |
|---|---|---|
| File count | 1 file | 14+ files |
| Line count | 1,391 lines | ~180 lines (orchestrator) |
| Testability | 0 hooks testable | All hooks independently testable |
| Responsibilities | 12 | 1 per file |

### 10.2 Hook Architecture

```typescript
// useTranslationStream.ts
// Owns: SSE state machine, rAF batching, done/error handling
interface UseTranslationStreamReturn {
  streamText: string;
  isStreaming: boolean;
  isComplete: boolean;
  error: string | null;
  blocks: TranslationBlock[];
  startStream: (payload: CodePayload) => void;
  stopStream: () => void;
  reset: () => void;
}

// Implementation notes:
// - streamBufferRef accumulates chunks; rAF flushes at 60fps (PRESERVE)
// - On SSE 'done' event → parse blocks → setBlocks → trigger confetti
// - AbortController for cleanup on unmount / mode change

// ─────────────────────────────────────────────

// useFileImport.ts
// Owns: dropzone state, Gist import, file validation
interface UseFileImportReturn {
  isDragActive: boolean;
  importedContent: string | null;
  importedLanguage: string | null;
  importError: string | null;
  getRootProps: () => DropzoneRootProps;
  getInputProps: () => DropzoneInputProps;
  importGist: (url: string) => Promise<void>;
  clearImport: () => void;
}

// ─────────────────────────────────────────────

// useLanguageDetection.ts
// Owns: 7 regex heuristics for Python/TS/JS/Rust/C++/Go/Java
interface UseLanguageDetectionReturn {
  detectedLanguage: string;
  detectLanguage: (code: string) => string;
}

// ─────────────────────────────────────────────

// useTranslationSession.ts
// Owns: block editing state, sync-back orchestration, edit toggle
interface UseTranslationSessionReturn {
  editedBlocks: Record<string, string>;
  editingBlockId: string | null;
  isSyncing: boolean;
  syncedCode: string | null;
  setEditingBlock: (id: string | null) => void;
  updateBlockEdit: (id: string, value: string) => void;
  syncEnglishToCode: () => Promise<void>;
}
```

### 10.3 Component Decomposition Map

```
features/translate/
│
├── index.tsx                    Page orchestrator (<200 lines)
│   Uses: useTranslationStream + useFileImport + useLanguageDetection
│          + useTranslationSession
│   Renders: <TranslateShell> with all props threaded down
│
├── _hooks/
│   ├── useTranslationStream.ts  SSE state machine + rAF batching
│   ├── useFileImport.ts         Dropzone + Gist import
│   ├── useLanguageDetection.ts  7-regex auto-detect
│   └── useTranslationSession.ts Block edit state + sync-back
│
├── _constants/
│   ├── languages.ts             35-entry language array + EXT_TO_LANGUAGE map
│   └── modes.ts                 3 mode configs with icons + API endpoints
│
├── _types/
│   └── index.ts
│       TranslationBlock  { id, code_snippet, english_explanation, ... }
│       TranslationMode   'code-to-english' | 'english-to-code' | 'code-to-code'
│       FileImportResult  { content, language, filename }
│
└── _components/
    │
    ├── TranslateShell.tsx       Two-panel layout; mode-aware; handles resize
    │
    ├── InputPanel/
    │   ├── index.tsx            Panel wrapper + state props
    │   ├── MonacoInput.tsx      Monaco editor + language selector
    │   │                        (dynamic import, stable options memo — PRESERVE)
    │   ├── ModeSelector.tsx     Pill tabs with GSAP ink-slide underline
    │   └── FileDropzone.tsx     Drop overlay (entire panel is drop zone)
    │                            + Gist import button
    │
    ├── OutputPanel/
    │   ├── index.tsx            Panel wrapper; switches views
    │   ├── StreamingView.tsx    Live typewriter + scan-line during SSE stream
    │   ├── BlocksView.tsx       Block card list (animate-block-in CSS stagger)
    │   └── DiffView.tsx         Monaco DiffEditor: original vs. synced code
    │
    ├── BlockCard/
    │   ├── index.tsx            Single block card (code + English)
    │   │                        Layout: code snippet (top) · amber rule · Lora English (below)
    │   ├── EnglishEditor.tsx    Inline editable textarea; debounced save
    │   └── BlockActions.tsx     Copy code · Copy English · Edit toggle · Share
    │
    └── Toolbar/
        ├── index.tsx            Bottom action bar
        ├── DownloadButton.tsx   Multi-format: .md / .txt / .json
        ├── CopyButton.tsx       Copy full output to clipboard
        ├── ShareButton.tsx      Generate /share/[id] URL
        └── SyncButton.tsx       Trigger sync-English-to-code API call
```

### 10.4 ModeSelector Ink-Slide Animation

```tsx
// GSAP ink-slide underline (replaces static active class)
const ModeSelector = () => {
  const underlineRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const slideToTab = (tabEl: HTMLElement) => {
    const { left, width } = tabEl.getBoundingClientRect();
    const containerLeft = containerRef.current!.getBoundingClientRect().left;
    gsap.to(underlineRef.current, {
      x: left - containerLeft,
      width,
      duration: 0.3,
      ease: 'power2.inOut',
    });
  };
  // ...
};
```

---

## 11. API Layer Architecture

### 11.1 FastAPI Backend Router Map (Target)

```
app/
├── main.py                       App factory; middleware stack
│
├── routers/
│   ├── translate.py              Registration only (~40 lines)
│   ├── _translate/
│   │   ├── validators.py         sanitise_input · validate_code_input · ext/language maps
│   │   ├── code_to_english.py    POST /api/code-to-english (SSE) + /api/code-to-english/sync
│   │   ├── english_to_code.py    POST /api/generate-from-english + /api/english-to-code
│   │   ├── code_to_code.py       POST /api/code-to-code (SSE)
│   │   ├── sync.py               POST /api/sync-english-to-code
│   │   └── file_upload.py        POST /api/upload-file
│   │
│   ├── history.py                GET /api/history · GET /api/stats · GET /api/share/{id}
│   │
│   ├── billing.py                Registration only
│   ├── _billing/
│   │   ├── checkout.py           POST /api/create-checkout-session · /api/create-credit-checkout
│   │   ├── webhook.py            POST /api/webhook/razorpay (idempotency guarded)
│   │   ├── status.py             GET /api/subscription-status · POST /api/check-credits
│   │   └── portal.py             (future) customer portal
│   │
│   ├── workspace.py              CRUD + invitations
│   └── utility.py                GET /api/health · GET /api/metrics · POST /api/import-gist
│                                 POST /api/demo/translate (new — anonymous, rate-limited)
│
├── core/
│   ├── config.py                 Env vars · MetricsCollector · lifespan · httpx client
│   ├── auth.py                   get_user_email (Depends) · get_user_pro_status · get_client_ip
│   ├── cache.py                  LRUCache · RedisCache · CacheProxy · cache_key
│   └── quota/
│       ├── __init__.py           Re-exports enforcement + record_successful_completion
│       ├── enforcement.py        enforce_quotas_and_protection · check_free_tier_limit
│       ├── limits.py             get_user_limits_and_cooldown · get_active_protection_mode
│       ├── credits.py            get_user_credits · deduct_credit
│       ├── platform.py           increment_platform_daily_usage · get_platform_daily_usage
│       └── history.py            save_translation_background · get_today_usage_count
│
├── models/
│   └── schemas.py                11 Pydantic v2 schemas (unchanged)
│
└── services/
    ├── ai.py                     LLM routing · streaming · stale recovery · normalize_blocks
    └── email/
        ├── __init__.py           EmailService export
        ├── service.py            EmailService._send() via Resend
        └── templates/
            ├── welcome.html      Jinja2 responsive HTML
            ├── subscription.html Plan activated
            └── milestone.html    Achievement (10/100/500)
```

### 11.2 API Endpoint Reference

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/code-to-english` | POST | JWT/API key | SSE streaming translation |
| `/api/code-to-english/sync` | POST | JWT/API key | Synchronous translation |
| `/api/generate-from-english` | POST | JWT/API key | English → Code generation |
| `/api/english-to-code` | POST | JWT/API key | English → Code (sync) |
| `/api/code-to-code` | POST | JWT/API key | SSE code→code translation |
| `/api/sync-english-to-code` | POST | JWT/API key | Sync edited English back to code |
| `/api/upload-file` | POST | JWT/API key | Multipart file → translation |
| `/api/history` | GET | JWT | Paginated translation history |
| `/api/stats` | GET | JWT | User stats (today/week/total) |
| `/api/share/{id}` | GET | None | Public share view |
| `/api/create-checkout-session` | POST | JWT | Razorpay subscription checkout |
| `/api/verify-payment` | POST | JWT | Verify + activate subscription |
| `/api/subscription-status` | GET | JWT | Current plan status |
| `/api/webhook/razorpay` | POST | Signature | Razorpay lifecycle events |
| `/api/check-credits` | POST | JWT | Credit balance |
| `/api/workspaces` | GET/POST | JWT | List / create workspaces |
| `/api/workspaces/{id}/members` | GET | JWT | Workspace member list |
| `/api/workspaces/{id}/invite` | POST | JWT | Invite member by email |
| `/api/health` | GET | None | Service health check |
| `/api/metrics` | GET | JWT | Internal metrics snapshot |
| `/api/import-gist` | POST | JWT | Fetch GitHub Gist |
| `/api/demo/translate` | POST | None | Anonymous demo (3/IP/hour) |
| `/api/stats/global` | GET | None | Global usage count (ISR source) |

### 11.3 Middleware Stack (Preserved + Extended)

```
Order:
1. CORS                 Allowlist: production domain + localhost variants
2. Security Headers     X-Frame-Options · CSP · X-XSS-Protection · Referrer-Policy
3. CSRF Origin          Custom origin validation for POST/PATCH/DELETE (not webhooks)
4. Metrics              Per-endpoint latency + error tracking (→ Redis in Phase 6)
5. Rate Limit           50 req/min anon / 200 req/min authenticated (Redis token bucket)
6. Webhook Bypass       Razorpay webhook path bypasses CSRF + rate limit checks
```

### 11.4 Dependency Injection (Target — replacing sys.modules)

```python
# Before (anti-pattern):
cache = sys.modules.get("main")
redis_client = getattr(cache, "redis_client", None)

# After (FastAPI Depends):
async def get_cache(request: Request) -> CacheProxy:
    return request.app.state.cache

@router.post("/api/code-to-english")
async def translate(
    payload: CodePayload,
    user_email: str = Depends(get_user_email),
    cache: CacheProxy = Depends(get_cache),
):
    ...

# Tests use app.dependency_overrides:
app.dependency_overrides[get_cache] = lambda: mock_cache
```

---

## 12. State Management Architecture

### 12.1 State Layers

```
Layer 1: Server State (SWR)
  → useTranslationStats()     SWR: GET /api/stats
  → useCredits()              SWR: GET /api/check-credits
  → useSubscriptionStatus()   SWR: GET /api/subscription-status (fix: GET not POST)
  → useHistory()              SWR: GET /api/history
  → Revalidation: focus, 60s interval, cross-tab via mutate()

Layer 2: Auth State (React Context)
  → AuthProvider (lib/auth-context.tsx)
  → Shape: { user, session, loading, isPro, signIn*, signOut }
  → isPro derived from /api/subscription-status via SWR

Layer 3: Workspace State (React Context)
  → WorkspaceProvider (features/shell context)
  → Shape: { workspaces, activeWorkspace, setActiveWorkspace, refreshWorkspaces, loading }
  → Single provider instance in dashboard/layout only (remove from root layout)

Layer 4: Feature-Local State (useState / useReducer)
  → translate: { mode, inputCode, language, model, blocks, isStreaming, error }
  → overview:  { week, statCards } — derived in useOverviewData
  → billing:   { isLoading, checkoutOpen } — in useRazorpay
  → No cross-feature state sharing

Layer 5: UI State (component-local)
  → Sidebar collapsed/expanded
  → Modal open/closed
  → Tooltip visibility
  → No lift-up unless ≥2 siblings need it
```

### 12.2 SWR Configuration

```typescript
// lib/swr-config.tsx — global SWR provider
const swrConfig: SWRConfiguration = {
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: 10_000,   // 10s dedup window
  errorRetryCount: 3,
  errorRetryInterval: 5_000,
  onError: (err) => captureException(err),  // Sentry
};
```

### 12.3 Analytics Event Architecture

```typescript
// lib/analytics.ts — PostHog wrapper (consent-gated, EU host)
// Events tracked:
track('translation_started', { mode, language, char_count })
track('translation_completed', { mode, language, block_count, duration_ms })
track('translation_failed', { mode, language, error_type })
track('file_uploaded', { language, size_bytes })
track('gist_imported', { char_count })
track('upgrade_clicked', { source: 'sidebar'|'billing'|'quota_hit' })
track('demo_used', { char_count })          // New: landing demo usage
track('onboarding_completed', { step })

// Rules:
// - Code content NEVER sent in any event property
// - User email hashed before identification
// - All tracks are no-ops when consent = false
```

### 12.4 PostHog + Sentry Integration

```
PostHog:  posthog-js; EU host (eu.posthog.com); user opt-in only
Sentry:   @sentry/nextjs; source maps uploaded; tunnel route /monitoring
          Captures: client exceptions · SSE errors · payment failures
          Does NOT capture: code content · translated output · PII
```

---

## 13. Complete Folder Structure

```
f:\Anuvaad\
│
├── main.py                           pytest bootstrap stub
├── Dockerfile                        multi-stage backend build
├── docker-compose.yml                dev: 4 services
├── docker-compose.prod.yml           [NEW Phase 6] prod: HTTPS, Redis AUTH, workers
├── nginx.conf                        SSE tuning, GZIP, security headers
├── requirements.txt                  13 Python packages
│
├── index.html                        legacy standalone landing (CDN fallback)
├── privacy.html / terms.html         static legal pages
├── robots.txt                        SEO
│
├── app/                              FastAPI application
│   ├── main.py                       App factory, middleware, lifespan
│   ├── core/
│   │   ├── config.py                 Env, MetricsCollector, logger, httpx client
│   │   ├── auth.py                   get_user_email (Depends), get_client_ip, pro status
│   │   ├── cache.py                  LRUCache, RedisCache, CacheProxy, cache_key
│   │   └── quota/
│   │       ├── __init__.py
│   │       ├── enforcement.py
│   │       ├── limits.py
│   │       ├── credits.py
│   │       ├── platform.py
│   │       └── history.py
│   ├── models/
│   │   └── schemas.py                11 Pydantic v2 schemas
│   ├── routers/
│   │   ├── translate.py              router registration
│   │   ├── _translate/
│   │   │   ├── validators.py
│   │   │   ├── code_to_english.py
│   │   │   ├── english_to_code.py
│   │   │   ├── code_to_code.py
│   │   │   ├── sync.py
│   │   │   └── file_upload.py
│   │   ├── billing.py                router registration
│   │   ├── _billing/
│   │   │   ├── checkout.py
│   │   │   ├── webhook.py
│   │   │   ├── status.py
│   │   │   └── portal.py
│   │   ├── history.py
│   │   ├── workspace.py
│   │   └── utility.py                + /api/demo/translate + /api/stats/global
│   └── services/
│       ├── ai.py                     LLM routing, singletons, streaming, stale recovery
│       └── email/
│           ├── __init__.py
│           ├── service.py
│           └── templates/
│               ├── welcome.html
│               ├── subscription.html
│               └── milestone.html
│
├── tests/                            184+ backend tests
│   ├── conftest.py                   app.dependency_overrides (not sys.modules)
│   ├── test_api.py
│   ├── test_cache.py
│   ├── test_comprehensive.py
│   ├── test_launch_resilience.py
│   ├── test_production.py
│   ├── test_router.py
│   ├── test_security.py
│   ├── test_streaming.py
│   └── test_validation.py
│
└── frontend/
    ├── package.json
    ├── next.config.ts
    ├── playwright.config.ts
    └── src/
        │
        ├── app/                      THIN — pages only
        │   ├── layout.tsx            Root layout (fonts, providers, Sentry)
        │   ├── globals.css           @import only (~50 lines)
        │   ├── page.tsx              → <LandingPage />
        │   ├── api/auth/callback/    Supabase OAuth callback
        │   ├── sitemap.ts
        │   ├── opengraph-image.tsx
        │   ├── (auth)/
        │   │   ├── layout.tsx        @import auth.css
        │   │   ├── signin/page.tsx   → <SignInPage />
        │   │   ├── signup/page.tsx   → <SignUpPage />
        │   │   └── forgot-password/  → <ForgotPage />
        │   ├── dashboard/
        │   │   ├── layout.tsx        → <DashboardLayout />; @import dashboard.css
        │   │   ├── loading.tsx       Root dashboard skeleton
        │   │   ├── page.tsx          → <OverviewPage />
        │   │   ├── translate/
        │   │   │   ├── page.tsx      → <TranslatePage />
        │   │   │   └── loading.tsx   Monaco skeleton
        │   │   ├── history/
        │   │   │   ├── page.tsx      → <HistoryPage />
        │   │   │   └── loading.tsx
        │   │   ├── billing/
        │   │   │   ├── page.tsx      → <BillingPage />
        │   │   │   └── loading.tsx
        │   │   ├── settings/page.tsx
        │   │   ├── team/page.tsx
        │   │   ├── workspace/page.tsx
        │   │   └── welcome/page.tsx  → <OnboardingPage />
        │   ├── share/[id]/page.tsx   → <SharePage />
        │   ├── privacy/page.tsx
        │   └── terms/page.tsx
        │
        ├── features/                 ALL BUSINESS LOGIC
        │   ├── landing/
        │   │   ├── LandingPage.tsx
        │   │   ├── landing.css
        │   │   ├── _sections/
        │   │   │   ├── VoidEntry/
        │   │   │   │   ├── index.tsx
        │   │   │   │   ├── Headline.tsx
        │   │   │   │   ├── Subline.tsx
        │   │   │   │   └── ScrollCue.tsx
        │   │   │   ├── TranslationMoment/
        │   │   │   │   ├── index.tsx
        │   │   │   │   ├── CodeArtifact.tsx
        │   │   │   │   ├── CharMorph.tsx
        │   │   │   │   └── NarrativeText.tsx
        │   │   │   ├── FeatureComparison/
        │   │   │   │   ├── index.tsx
        │   │   │   │   ├── ComparePanel.tsx
        │   │   │   │   └── ProgressPill.tsx
        │   │   │   ├── LiveDemo/
        │   │   │   │   ├── index.tsx
        │   │   │   │   ├── DemoEditor.tsx
        │   │   │   │   ├── DemoOutput.tsx
        │   │   │   │   └── DemoHint.tsx
        │   │   │   ├── SocialProof/
        │   │   │   │   ├── index.tsx
        │   │   │   │   ├── LiveCounter.tsx
        │   │   │   │   ├── LanguageGrid.tsx
        │   │   │   │   └── TestimonialMarquee.tsx
        │   │   │   ├── Pricing/
        │   │   │   │   └── index.tsx
        │   │   │   ├── FinalCTA/
        │   │   │   │   ├── index.tsx
        │   │   │   │   └── PlasmaSphere.tsx
        │   │   │   ├── LandingNavbar/
        │   │   │   └── LandingFooter/
        │   │   ├── _canvas/
        │   │   │   ├── WebGLCanvas.tsx
        │   │   │   ├── particle.worker.ts
        │   │   │   ├── useParticleSystem.ts
        │   │   │   └── useScrollMorph.ts
        │   │   ├── _cursor/
        │   │   │   ├── CustomCursor.tsx
        │   │   │   └── useCursor.ts
        │   │   ├── _transitions/
        │   │   │   └── PageTransition.tsx
        │   │   └── _hooks/
        │   │       ├── useSmoothScroll.ts
        │   │       ├── useHorizontalScroll.ts
        │   │       └── useMagneticButton.ts
        │   │
        │   ├── translate/
        │   │   ├── index.tsx
        │   │   ├── _hooks/
        │   │   │   ├── useTranslationStream.ts
        │   │   │   ├── useFileImport.ts
        │   │   │   ├── useLanguageDetection.ts
        │   │   │   └── useTranslationSession.ts
        │   │   ├── _constants/
        │   │   │   ├── languages.ts
        │   │   │   └── modes.ts
        │   │   ├── _types/
        │   │   │   └── index.ts
        │   │   └── _components/
        │   │       ├── TranslateShell.tsx
        │   │       ├── InputPanel/
        │   │       │   ├── index.tsx
        │   │       │   ├── MonacoInput.tsx
        │   │       │   ├── ModeSelector.tsx
        │   │       │   └── FileDropzone.tsx
        │   │       ├── OutputPanel/
        │   │       │   ├── index.tsx
        │   │       │   ├── StreamingView.tsx
        │   │       │   ├── BlocksView.tsx
        │   │       │   └── DiffView.tsx
        │   │       ├── BlockCard/
        │   │       │   ├── index.tsx
        │   │       │   ├── EnglishEditor.tsx
        │   │       │   └── BlockActions.tsx
        │   │       └── Toolbar/
        │   │           ├── index.tsx
        │   │           ├── DownloadButton.tsx
        │   │           ├── CopyButton.tsx
        │   │           ├── ShareButton.tsx
        │   │           └── SyncButton.tsx
        │   │
        │   ├── overview/
        │   │   ├── index.tsx
        │   │   ├── _components/
        │   │   │   ├── StatCards.tsx
        │   │   │   ├── QuotaRing.tsx (will be promoted to components/charts)
        │   │   │   ├── ActivityChart.tsx
        │   │   │   └── RecentTranslations.tsx
        │   │   └── _hooks/
        │   │       └── useOverviewData.ts
        │   │
        │   ├── billing/
        │   │   ├── index.tsx
        │   │   ├── _components/
        │   │   │   ├── CurrentPlanCard.tsx
        │   │   │   ├── UpgradeCard.tsx
        │   │   │   ├── ProActiveCard.tsx
        │   │   │   └── PaymentStatusBanner.tsx
        │   │   └── _hooks/
        │   │       └── useRazorpay.ts
        │   │
        │   ├── history/
        │   │   ├── index.tsx
        │   │   ├── _components/
        │   │   │   ├── HistoryFilters.tsx
        │   │   │   ├── HistoryList.tsx
        │   │   │   ├── HistoryItem.tsx
        │   │   │   └── HistoryPagination.tsx
        │   │   └── _hooks/
        │   │       └── useHistory.ts
        │   │
        │   ├── settings/
        │   │   ├── index.tsx
        │   │   └── _components/
        │   │       ├── ProfileSection.tsx
        │   │       ├── ApiPreferences.tsx
        │   │       └── AnalyticsConsent.tsx
        │   │
        │   ├── team/
        │   │   ├── index.tsx
        │   │   └── _components/
        │   │       ├── WorkspaceCreate.tsx
        │   │       ├── MemberList.tsx
        │   │       └── InviteForm.tsx
        │   │
        │   ├── onboarding/
        │   │   ├── index.tsx
        │   │   └── _components/
        │   │       ├── Stepper.tsx
        │   │       ├── StepDemo.tsx
        │   │       ├── StepModes.tsx
        │   │       └── StepLaunch.tsx
        │   │
        │   ├── shell/
        │   │   ├── DashboardLayout.tsx
        │   │   ├── TopBar.tsx
        │   │   ├── Sidebar/
        │   │   │   ├── index.tsx
        │   │   │   ├── MobileSidebar.tsx
        │   │   │   ├── SidebarContent.tsx
        │   │   │   ├── WorkspaceSwitcher.tsx
        │   │   │   ├── UserCard.tsx
        │   │   │   └── UpgradeCTA.tsx
        │   │   └── NavLink.tsx
        │   │
        │   └── auth/
        │       ├── SignInPage.tsx
        │       ├── SignUpPage.tsx
        │       ├── ForgotPage.tsx
        │       └── _hooks/
        │           └── useAuthForm.ts
        │
        ├── components/              SHARED, FEATURE-AGNOSTIC
        │   ├── ui/                  shadcn/ui (untouched)
        │   ├── editors/
        │   │   ├── MonacoEditor.tsx
        │   │   └── MonacoDiffEditor.tsx
        │   ├── charts/
        │   │   ├── QuotaRing.tsx
        │   │   └── ActivityChart.tsx
        │   ├── overlays/
        │   │   └── CommandPalette.tsx
        │   └── motion/
        │       ├── FadeIn.tsx
        │       ├── SlideUp.tsx
        │       ├── RevealText.tsx
        │       ├── StaggerContainer.tsx
        │       ├── MagneticButton.tsx
        │       ├── ParallaxLayer.tsx
        │       ├── CountUp.tsx
        │       ├── GlowIn.tsx
        │       ├── TextScramble.tsx
        │       ├── PageTransition.tsx
        │       └── ReducedMotion.tsx
        │
        ├── design/                  DESIGN SYSTEM
        │   ├── tokens/
        │   │   ├── color.css
        │   │   ├── typography.css
        │   │   ├── spacing.css
        │   │   ├── radius.css
        │   │   ├── shadow.css
        │   │   ├── animation.css
        │   │   └── z-index.css
        │   ├── css/
        │   │   ├── base.css
        │   │   ├── tokens.css
        │   │   ├── animations.css
        │   │   ├── utilities.css
        │   │   ├── components.css
        │   │   ├── landing.css
        │   │   ├── dashboard.css
        │   │   └── auth.css
        │   └── primitives/
        │       ├── Surface.tsx
        │       ├── GlassPanel.tsx
        │       ├── GlowBorder.tsx
        │       ├── CodeSurface.tsx
        │       ├── AmberBadge.tsx
        │       ├── StatusDot.tsx
        │       └── TypographyProse.tsx
        │
        ├── lib/                     INFRASTRUCTURE (minimal changes)
        │   ├── auth-context.tsx     AuthProvider (Supabase, isPro, OAuth)
        │   ├── analytics.ts         PostHog wrapper (consent-gated)
        │   ├── hooks.ts             SWR infra hooks only
        │   ├── motion.ts            [NEW] motionConfig + useMotionSafe + useGsapContext
        │   ├── supabase.ts          createBrowserClient() singleton
        │   └── utils.ts             cn() utility
        │
        ├── types/                   GLOBAL TYPESCRIPT TYPES
        │   ├── api.ts               API response shapes
        │   ├── translation.ts       TranslationBlock, TranslationMode, FileImportResult
        │   └── billing.ts           SubscriptionStatus, Plan, PaymentResult
        │
        ├── proxy.ts                 Next.js middleware: auth guard + session refresh
        └── e2e/
            └── anuvaad.spec.ts      Playwright E2E tests
```

---

## 14. Development Phases

### Phase 0 — Foundations (Weeks 1–2)
**Goal**: Zero visual change. Fix structural problems blocking all subsequent work.

| # | Task | Files | Type |
|---|---|---|---|
| 0.1 | Replace `sys.modules` DI with FastAPI `Depends()` | `auth.py`, `quota.py` | Backend |
| 0.2 | LLM client singletons (module-level `AsyncOpenAI`) | `ai.py` | Backend |
| 0.3 | Deduplicate `get_client_ip` | `main.py` → remove | Backend |
| 0.4 | Structured JSON logging with `structlog` | All `app/` | Backend |
| 0.5 | Remove Framer Motion; add `.animate-block-in` CSS | `translate/page.tsx` | Frontend |
| 0.6 | Fix `WorkspaceProvider` duplication (remove from root) | `app/layout.tsx` | Frontend |
| 0.7 | Fix billing `window.location.href` → `router.push + mutate()` | `billing/page.tsx` | Frontend |
| 0.8 | Remove 106 commented-out billing lines | `billing/page.tsx` | Frontend |
| 0.9 | Razorpay webhook idempotency key (Redis) | `billing.py` | Backend |
| 0.10 | Fix `useSubscriptionStatus` to GET not POST | `lib/hooks.ts` | Frontend |
| 0.11 | Update `conftest.py` to use `app.dependency_overrides` | `tests/conftest.py` | Backend |

**Done when**: 184 backend tests pass · No visual diff · Framer Motion absent from bundle

---

### Phase 1 — Architecture (Weeks 3–5)
**Goal**: Feature-based file structure. All large files decomposed. Pages become thin orchestrators.

| # | Task | Description |
|---|---|---|
| 1.1 | Create `/src/features/` tree | `mkdir` all directories; no moves yet |
| 1.2 | Extract translate constants | `languages.ts`, `modes.ts` → `_constants/` |
| 1.3 | Extract translate hooks | `useTranslationStream`, `useFileImport`, `useLanguageDetection`, `useTranslationSession` |
| 1.4 | Extract translate components | `InputPanel`, `OutputPanel`, `BlockCard`, `Toolbar` (in order) |
| 1.5 | Rebuild translate page entry | `<200 lines`; imports from `features/translate` only |
| 1.6 | Extract shell components | `DashboardLayout`, `Sidebar`, `MobileSidebar`, `WorkspaceSwitcher` |
| 1.7 | Extract overview components | `StatCards`, `QuotaRing`, `ActivityChart`, `RecentTranslations` |
| 1.8 | Extract billing components | `CurrentPlanCard`, `UpgradeCard`, `useRazorpay` |
| 1.9 | Decompose backend translate router | `_translate/` sub-modules |
| 1.10 | Decompose backend quota module | `core/quota/` sub-packages |
| 1.11 | Update all import paths | TS compilation validates all references |
| 1.12 | Update E2E tests for new structure | Verify `window.__monacoEditor` still exposed |

**Done when**: All 184 backend tests pass · E2E passes · No dashboard file > 100 lines · No feature file > 300 lines

---

### Phase 2 — Design System (Weeks 6–7)
**Goal**: Token-based CSS. Split `globals.css`. Stable design primitives.

| # | Task |
|---|---|
| 2.1 | Create `src/design/` directory structure |
| 2.2 | Extract color tokens → `design/tokens/color.css` |
| 2.3 | Extract typography tokens → `design/tokens/typography.css` |
| 2.4 | Extract animation tokens → `design/tokens/animation.css` |
| 2.5 | Extract all `@keyframes` → `design/css/animations.css` |
| 2.6 | Extract utility classes → `design/css/utilities.css` |
| 2.7 | Extract landing styles → `design/css/landing.css` |
| 2.8 | Extract dashboard styles → `design/css/dashboard.css` |
| 2.9 | Extract auth styles → `design/css/auth.css` |
| 2.10 | Rebuild `globals.css` as root `@import` only (~50 lines) |
| 2.11 | Add route-segment CSS imports (`dashboard/layout.css`, etc.) |
| 2.12 | Create design primitive components (`Surface`, `GlassPanel`, etc.) |

**Done when**: `app/globals.css` < 60 lines · Zero visual diff · No hardcoded hex in components (only token vars)

---

### Phase 3 — Motion System (Weeks 8–9)
**Goal**: Single animation engine (GSAP). Centralized config. Motion primitives. Reduced-motion support.

| # | Task |
|---|---|
| 3.1 | Create `src/lib/motion.ts` with `motionConfig` + `useMotionSafe` + `useGsapContext` |
| 3.2 | Add CSS animation token variables to `design/tokens/animation.css` |
| 3.3 | Create motion primitive components (`FadeIn`, `SlideUp`, `StaggerContainer`, `CountUp`, etc.) |
| 3.4 | Add `ReducedMotion` wrapper + `@media (prefers-reduced-motion: no-preference)` guards |
| 3.5 | Migrate dashboard animations to motion primitives |
| 3.6 | Create `MagneticButton` component |
| 3.7 | Create `PageTransition` component (GSAP clip-path wipe) |
| 3.8 | Create `RevealText` component (GSAP SplitText) |

**Done when**: All dashboard animations use primitives · `prefers-reduced-motion` disables all keyframes · GSAP is the only animation library

---

### Phase 4 — Dashboard Redesign (Weeks 10–13)
**Goal**: Production-quality dashboard UI. Rebuilt pages. Error boundaries. Loading states.

| # | Task |
|---|---|
| 4.1 | Add `<ErrorBoundary>` to all dashboard routes |
| 4.2 | Add `loading.tsx` per route (App Router streaming) |
| 4.3 | Rebuild dashboard overview (RSC data + Client animation) |
| 4.4 | Redesign translate page UI (mode pill tabs, full-width panels) |
| 4.5 | Redesign block cards (code + amber rule + Lora italic) |
| 4.6 | Rebuild onboarding flow (animated Stepper, localStorage checkpoint) |
| 4.7 | Redesign billing page (usage ring, clean card layout) |
| 4.8 | Sidebar polish (icon rail, popover user menu, upgrade CTA shimmer) |
| 4.9 | Full keyboard navigation audit (aria-labels, focus-trap, roving tabindex) |
| 4.10 | PWA offline page (`app/offline.tsx`) |

**Done when**: Lighthouse ≥ 85 (dashboard) · Accessibility ≥ 90 · Zero white screens · E2E passes

---

### Phase 5 — Landing Redesign (Weeks 14–17)
**Goal**: Awwwards-level landing page. Interactive live demo. Character morph. Custom cursor.

| # | Task |
|---|---|
| 5.1 | Create anonymous demo API endpoint (`/api/demo/translate`) |
| 5.2 | Create `/api/stats/global` endpoint for ISR usage counter |
| 5.3 | Refactor `WebGLCanvas` to `OffscreenCanvas` + Web Worker |
| 5.4 | Add WebGL graceful fallback (CSS gradient backdrop) |
| 5.5 | Create `CustomCursor` component |
| 5.6 | Build Section 1: Void Entry (GSAP SplitText + magnetic CTAs) |
| 5.7 | Build Section 2: Translation Moment (600vh pin + GSAP FLIP char morph) |
| 5.8 | Build Section 3: Feature Comparison (horizontal scroll + 3 panels) |
| 5.9 | Build Section 4: Live Demo (Monaco + anonymous SSE streaming) |
| 5.10 | Build Section 5: Social Proof (LiveCounter + LanguageGrid + Marquee) |
| 5.11 | Build Section 6: Pricing (2-card, minimal, honest) |
| 5.12 | Build Section 7: Final CTA (plasma sphere + SplitText + magnetic button) |
| 5.13 | Add `PageTransition` (GSAP clip-path wipe on all route changes) |
| 5.14 | Navbar: transparent → frosted glass on scroll |
| 5.15 | Performance audit: Lighthouse, Three.js defer, bundle analysis |

**Done when**: Lighthouse ≥ 85 (landing, desktop) · LCP < 2.5s · Live demo calls real API · Custom cursor functional · `prefers-reduced-motion` respected

---

### Phase 6 — Infrastructure (Weeks 18–19)
**Goal**: Production-ready deployment. Observability. Scalability.

| # | Task |
|---|---|
| 6.1 | Prometheus metrics endpoint (replace in-process MetricsCollector) |
| 6.2 | Celery task queue for LLM jobs (Redis broker) |
| 6.3 | Production `docker-compose.prod.yml` (Redis AUTH, HTTPS, multi-worker Uvicorn) |
| 6.4 | Jinja2 email templates (`welcome.html`, `subscription.html`, `milestone.html`) |
| 6.5 | DB index documentation (`supabase/migrations/`) |
| 6.6 | Frontend CDN config (Cloudflare-compatible cache headers, HSTS, CSP) |
| 6.7 | Redis AUTH in Docker Compose (`requirepass`) |
| 6.8 | Frontend ISR for landing stats (`LiveCounter`, 60s revalidate) |

---

## 15. Estimated Implementation Order

### Priority Rationale

1. **No regressions** — foundation changes precede visual changes
2. **Dependencies first** — design system → motion system → components → pages
3. **Highest-risk first** — translate page decomposition is the highest-risk item; done in Phase 1 before building on it
4. **Value delivery** — each phase is independently deployable and business-valuable

### Sequenced Task Order (Single Developer)

```
WEEK 1–2   Phase 0 — Foundation Fixes
  ── 0.11  conftest.py → dependency_overrides
  ── 0.1   sys.modules DI → Depends()
  ── 0.2   LLM client singletons
  ── 0.3   deduplicate get_client_ip
  ── 0.4   structured JSON logging
  ── 0.9   webhook idempotency
  ── 0.5   remove Framer Motion → .animate-block-in
  ── 0.6   WorkspaceProvider dedup
  ── 0.7   billing redirect fix
  ── 0.8   remove dead billing code
  ── 0.10  useSubscriptionStatus → GET

WEEK 3–4   Phase 1a — Translate Page Decomposition (highest risk)
  ── 1.1   create /src/features/ directories
  ── 1.2   extract translate constants
  ── 1.3   extract translate hooks
  ── 1.4   extract translate components
  ── 1.5   rebuild translate page entry
  ── 1.12  update E2E tests

WEEK 5     Phase 1b — Remaining Feature Extraction
  ── 1.6   shell components
  ── 1.7   overview components
  ── 1.8   billing components
  ── 1.9   backend translate router decomposition
  ── 1.10  backend quota module decomposition
  ── 1.11  update all import paths

WEEK 6     Phase 2a — Token System
  ── 2.1   design/ directory
  ── 2.2   color tokens
  ── 2.3   typography tokens
  ── 2.4   animation tokens
  ── 2.5   @keyframes extraction
  ── 2.10  rebuild globals.css

WEEK 7     Phase 2b — CSS Split + Design Primitives
  ── 2.6   utility classes
  ── 2.7–2.9 landing/dashboard/auth CSS
  ── 2.11  route-segment imports
  ── 2.12  design primitive components

WEEK 8     Phase 3a — Motion Foundation
  ── 3.1   lib/motion.ts (motionConfig, useMotionSafe, useGsapContext)
  ── 3.2   animation token CSS vars
  ── 3.3   motion primitives: FadeIn, SlideUp, StaggerContainer, CountUp, GlowIn
  ── 3.4   ReducedMotion wrapper + @media guards

WEEK 9     Phase 3b — Advanced Motion Primitives
  ── 3.5   migrate dashboard animations
  ── 3.6   MagneticButton
  ── 3.7   PageTransition
  ── 3.8   RevealText (GSAP SplitText)
  ── 3.9   TextScramble

WEEK 10–11 Phase 4a — Dashboard Infrastructure
  ── 4.1   ErrorBoundary on all routes
  ── 4.2   loading.tsx per route
  ── 4.3   overview page rebuild (RSC + Client)
  ── 4.7   billing page redesign
  ── 4.9   keyboard navigation audit

WEEK 12–13 Phase 4b — Translate + Onboarding UI Redesign
  ── 4.4   translate page UI (mode tabs, panels)
  ── 4.5   block card redesign (Lora italic, amber rule)
  ── 4.6   onboarding Stepper rebuild
  ── 4.8   sidebar polish
  ── 4.10  PWA offline page

WEEK 14    Phase 5a — Landing Backend + WebGL Foundation
  ── 5.1   /api/demo/translate endpoint
  ── 5.2   /api/stats/global endpoint
  ── 5.3   WebGL OffscreenCanvas + Worker
  ── 5.4   WebGL graceful fallback
  ── 5.5   CustomCursor component

WEEK 15    Phase 5b — Landing Sections 1 + 2 (hardest)
  ── 5.6   Section 1: Void Entry
  ── 5.7   Section 2: Translation Moment (GSAP FLIP char morph)

WEEK 16    Phase 5c — Landing Sections 3 + 4
  ── 5.8   Section 3: Feature Comparison horizontal scroll
  ── 5.9   Section 4: Live Demo

WEEK 17    Phase 5d — Landing Sections 5–7 + Polish
  ── 5.10  Section 5: Social Proof
  ── 5.11  Section 6: Pricing
  ── 5.12  Section 7: Final CTA
  ── 5.13  PageTransition
  ── 5.14  Navbar scroll behavior
  ── 5.15  Performance audit

WEEK 18–19 Phase 6 — Infrastructure
  ── 6.1   Prometheus metrics
  ── 6.2   Celery task queue
  ── 6.3   docker-compose.prod.yml
  ── 6.4   Jinja2 email templates
  ── 6.5   DB index docs
  ── 6.6   CDN config
  ── 6.7   Redis AUTH
  ── 6.8   ISR landing stats
```

### Parallel Track (2 Developers: Frontend + Backend)

```
Dev A (Frontend):  Weeks 1–2: Phase 0 frontend
                   Weeks 3–5: Phase 1 frontend
                   Weeks 6–7: Phase 2
                   Weeks 8–9: Phase 3
                   Weeks 10–13: Phase 4
                   Weeks 14–17: Phase 5
                   Weeks 18–19: Phase 5 polish + 6 CDN/ISR

Dev B (Backend):   Weeks 1–2: Phase 0 backend
                   Weeks 3–4: Phase 1 backend (router + quota decomposition)
                   Weeks 5–6: Phase 6 partial (Prometheus, DB index docs)
                   Weeks 7–8: Phase 5 backend (demo API, stats global)
                   Weeks 9–10: Phase 6 (Celery)
                   Weeks 11–12: Phase 6 (prod Compose, Redis AUTH, email templates)
                   Weeks 13–19: QA, load testing, security review
```

**Total estimate**: 19 weeks (single developer) · 10 weeks (two developers)

---

## Success Metrics

| Metric | Current | Target |
|---|---|---|
| Lighthouse Performance (landing) | ~55 | ≥ 85 |
| Lighthouse Performance (dashboard) | ~65 | ≥ 85 |
| Lighthouse Accessibility | ~60 | ≥ 90 |
| LCP (landing) | ~3.5s | < 2.5s |
| Dashboard JS bundle (gzip) | ~450KB | < 280KB |
| Largest frontend file | 1,391 lines | < 300 lines |
| Largest backend router | 608 lines | < 200 lines |
| `prefers-reduced-motion` compliance | 0% | 100% |
| Error boundary coverage | 0% | 100% |
| Animation libraries | GSAP + Framer Motion | GSAP only |
| Awwwards submission readiness | ❌ | ✅ |

---

## Feature Flags

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

## Risk Register

| ID | Risk | Phase | Likelihood | Impact | Mitigation |
|---|---|---|---|---|---|
| R01 | Translate page decomposition breaks E2E | 1 | Medium | High | Run E2E on every PR; preserve `window.__monacoEditor` |
| R02 | Import path changes cause runtime errors | 1 | Medium | Medium | TS compilation catches most; CI build step per sub-task |
| R03 | CSS split removes styles from routes | 2 | Medium | Medium | Percy/Playwright visual regression screenshots |
| R04 | GSAP SplitText conflicts with SSR | 3, 5 | Medium | Medium | All SplitText in `useEffect` with `typeof window` guard |
| R05 | WebGL OffscreenCanvas — Safari support | 5 | High | Medium | Safari 16.4+ supported; feature detect; main-thread fallback |
| R06 | Section 2 char morph performance on mobile | 5 | High | High | FLIP benchmark on mid-range mobile before full build |
| R07 | Anonymous demo API abuse | 5 | Medium | High | 3 req/IP/hour Redis; CAPTCHA fallback on abuse detection |
| R08 | Celery breaks SSE streaming | 6 | High | High | SSE is sync by nature; validate SSE+Celery integration carefully |
| R09 | Three.js IntersectionObserver breaks scroll morph timing | 5 | Medium | Medium | Add viewport entry buffer margin |
| R10 | Framer Motion removal introduces animation regressions | 0 | Low | Medium | CSS `@keyframes` replacement; test all browsers |
| R11 | GSAP ScrollTrigger conflicts with Lenis | 3, 5 | Medium | Medium | Use `ScrollTrigger.scrollerProxy` (documented by GSAP) |

---

*End of implementation specification. No code was modified.*

# Anuvaad Web Application: Design Review & Formal Specification Blueprint

**Document Version**: 2.0.0  
**Status**: Approved Architectural Blueprint  
**Target Codebase**: `Anuvaad/frontend`  
**Framework**: Next.js 16.3.0 (App Router), React 19.2.4, TypeScript 5 (Strict Mode), Tailwind CSS v4  
**Design Paradigm**: Product-First Developer Tool (Wispr Flow Inspired Neutral Aesthetic)  
**Date**: 2026-08-15  

---

## Table of Contents
1. [Executive Summary & Context](#1-executive-summary--context)
   - 1.1 Project Mission & Product Definition
   - 1.2 Motivation for Complete Architectural Redesign
   - 1.3 Scope, Constraints & Document Governance
2. [Objective Review of Prior Versions](#2-objective-review-of-prior-versions)
   - 2.1 Executive Architectural Audit (V1 Scrollytelling vs. V2 3D WebGL Canvas)
   - 2.2 Visual Metaphors & Cognitive Overload Analysis
   - 2.3 Technical & Performance Bottleneck Deep Dive
   - 2.4 Developer Usability & Scannability Deficits
   - 2.5 Comprehensive 10-Dimension Architectural Comparison Matrix
   - 2.6 Key Architectural Takeaways & Legacy Elimination Plan
3. [Product-First Philosophy (Wispr Flow Inspiration)](#3-product-first-philosophy-wispr-flow-inspiration)
   - 3.1 The Paradigm Shift: From Narrative Fluff to Immediate Tactile Utility
   - 3.2 Five Foundational Principles of the Anuvaad Redesign
   - 3.3 Anatomy of the Wispr Flow Developer Aesthetic
4. [Page Layout Wireframe & Component Hierarchy](#4-page-layout-wireframe--component-hierarchy)
   - 4.1 Global Layout Grid, Breakpoints & Spatial Cadence
   - 4.2 Comprehensive Full-Page Master ASCII Wireframe (All 9 Tiers)
   - 4.3 Modular ASCII Diagrams for Key Interactive Modules
   - 4.4 Complete Component Tree & Spatial Hierarchy
   - 4.5 Strict TypeScript Interface Contracts
5. [Design System Tokens & Foundations](#5-design-system-tokens--foundations)
   - 5.1 Neutral Surface Hierarchy & Color Architecture
   - 5.2 Typographic System & Scale Matrix (Inter UI + JetBrains Mono)
   - 5.3 Elevation, Border Radius & Backdrop Filter Tokens
   - 5.4 4px/8px Incremental Spacing Grid
   - 5.5 Tailwind CSS v4 Theme Integration Blueprint
6. [Interactive Core Modules Specification](#6-interactive-core-modules-specification)
   - 6.1 Module 1: Live Interactive Playground (`LivePlayground`)
   - 6.2 Module 2: Interactive Git / PR Workflow Demo (`GitPrWorkflowDemo`)
   - 6.3 Module 3: Multi-Language Benchmark & Latency Explorer (`BenchmarkExplorer`)
7. [Interaction States, Motion & Accessibility](#7-interaction-states-motion--accessibility)
   - 7.1 Comprehensive 8-State Interactive Matrix
   - 7.2 Micro-Interaction Design & Motion Transition Choreography
   - 7.3 Reduced Motion Strategy & Accessibility Overrides
   - 7.4 ARIA Semantic Landmarks, Roles & Accessible DOM Tree
   - 7.5 Full Keyboard Navigation Protocol & Global Shortcuts
   - 7.6 Color Contrast & WCAG 2.1 AA / AAA Compliance Matrix
8. [Implementation & Verification Roadmap](#8-implementation--verification-roadmap)
   - 8.1 Milestone Dependencies & Delivery Schedule
   - 8.2 Zero-Error Production Build Verification (`npm run build` Gate)
   - 8.3 Vitest Component & Unit Test Suite Architecture
   - 8.4 End-to-End User Journey Validation Checklists
   - 8.5 Performance, Memory & Layout Shift (CLS) Guardrails

---

## 1. Executive Summary & Context

### 1.1 Project Mission & Product Definition
**Anuvaad** is an enterprise-grade, high-velocity neural code translation and intelligence platform designed for software engineers, engineering leaders, and DevOps practitioners. Anuvaad translates complex, multi-language source codebases into clear, idiomatic human English, generates production-ready code from natural language specifications, modernizes legacy stacks across 35+ languages, and automates pull request reviews with sub-3-second inference speeds.

The goal of this redesign is to deliver a landing experience that reflects the tool's core technical precision: **fast, tactile, distraction-free, and product-first**.

### 1.2 Motivation for Complete Architectural Redesign
Previous iterations of the Anuvaad frontend attempted to present a developer infrastructure platform through an artistic, editorial storytelling lens. These implementations forced technical visitors through:
- Heavy Three.js 3D WebGL particle canvases (6,000 CPU-calculated vertices per frame),
- Lenis momentum scroll hijacking with rigid pinned viewport locks,
- Antique warm-cream (`#f5f3ee`) paper textures and editorial serif typography (*Playfair Display*),
- Lengthy fictional parables ("Riya at Helix Corp") delaying access to the product.

This specification blueprints a complete, from-scratch rebuild inspired by **Wispr Flow's sleek, fluid, product-first aesthetic**. The new architecture places the working product directly in the hero and throughout the page via floating precision controls, high-density workspaces, real-time code execution simulators, and neutral slate surfaces.

### 1.3 Scope, Constraints & Document Governance
This document serves as the authoritative single source of truth for the frontend redesign across all engineering milestones:
- **Zero Legacy Metaphors**: Complete elimination of WebGL canvas blockers, scroll hijacking, and editorial serif styling.
- **Strict Typing & Compilation**: 100% TypeScript strict-mode compliance, Next.js 16.3.0 App Router compatibility, React 19.2.4 compliance, and Tailwind CSS v4 token integration.
- **Verification Guarantee**: 100% pass rate across all unit and component test suites via Vitest, zero build warnings, and strict WCAG 2.1 AA/AAA accessibility compliance.

---

## 2. Objective Review of Prior Versions

### 2.1 Executive Architectural Audit (V1 Scrollytelling vs. V2 3D WebGL Canvas)
The legacy codebase maintained two parallel landing implementations toggleable via `process.env.NEXT_PUBLIC_LANDING_V2`:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              LEGACY IMPLEMENTATION AUDIT                               │
├──────────────────────────────────────────┬─────────────────────────────────────────────┤
│ LANDING V1 (LandingV1Page.tsx)           │ LANDING V2 (LandingExperience.tsx)          │
├──────────────────────────────────────────┼─────────────────────────────────────────────┤
│ • GSAP ScrollTrigger scrollytelling      │ • Three.js WebGLSceneManager (6,000 pts)    │
│ • ScrollStory.tsx pinned for 500vh       │ • 9 Sequential Scenes (1450vh scroll lock)  │
│ • Tabbed TransformationDemo.tsx          │ • Lenis smooth-scroll momentum hijacking    │
│ • Warm-cream (#f5f3ee) background        │ • Dynamic theme inversion (#f5f3ee ↔ #0e1117)│
│ • Editorial Playfair Display serif fonts │ • Custom spring cursor & activity toast popups│
└──────────────────────────────────────────┴─────────────────────────────────────────────┘
```

Both architectures prioritized visual spectacle over developer utility, creating substantial cognitive friction and technical debt.

### 2.2 Visual Metaphors & Cognitive Overload Analysis

#### 2.2.1 The Warm-Cream / Sepia Antique Metaphor
- **Implementation**: `src/design/css/landing.css` enforced `--wispr-cream: #f5f3ee`, `--wispr-cream-dark: #ede8e0`, `--wispr-ink-900: #1a1208`, paired with SVG fractal noise paper textures and wavy SVG section dividers.
- **Cognitive Impact**: This aesthetic belongs to antique publishing and literary blogs. In developer tools, sepia backgrounds reduce contrast against dark monospaced code blocks, blur structural boundaries, and project an academic mood rather than the crisp, precise atmosphere expected of modern developer tooling.

#### 2.2.2 Typographic Dissonance (Playfair Display Editorial Serif)
- **Implementation**: `src/app/layout.tsx` loaded `Playfair_Display` with italic variants, applying serif styling to headlines (`.wispr-headline`), watermarks, and translated code outputs.
- **Cognitive Impact**: Didone-style serifs feature extreme thick-to-thin stroke modulation, leading to severe subpixel rendering degradation on non-Retina displays and visual fatigue when juxtaposed with fixed-width monospace code (`JetBrains Mono`). Developers scanning for parameters, syntax tokens, and latency metrics experienced reduced reading velocity.

#### 2.2.3 Fictional Narrative Distractions ("Riya at Helix Corp")
- **Implementation**: `src/components/landing/ScrollStory.tsx` dedicated extensive viewport space to a fictional parable (*"Day one at Helix Corp. Riya opened the legacy repository. 40,000 lines. No comments. No docs... The Abyss... The Seeker entity..."*).
- **Cognitive Impact**: Engineers and technical buyers evaluate developer platforms on concrete technical vectors: AST parsing accuracy, language coverage, zero-data-retention security policies, and real inference latency. Fictional storytelling created marketing fluff and delayed access to the working tool.

#### 2.2.4 Intrusive Micro-Interactions & DOM Overhead
- **Custom Cursor Layer (`CustomCursor.tsx`)**: Disabled the native OS cursor (`cursor: none`) to render a dual-layer DOM dot and spring-lagged ring (`GSAP quickTo`). A `MutationObserver` on `document.body` re-scanned interactive DOM nodes on every render, adding main-thread CPU overhead and introducing noticeable input lag on 60Hz/120Hz displays.
- **Simulated Activity Feed (`LiveActivityFeed.tsx`)**: Animated periodic toast notifications (*"Translated 420 lines of Java to Python • dev_team_alpha • just now"*), introducing visual clutter and peripheral distraction.
- **Exit-Intent Modal (`ExitIntentModal.tsx`)**: Hooked into mouse coordinates (`clientY <= 15`) to trigger a fullscreen modal popup when the pointer approached the browser tab bar, disrupting user control with consumer-marketing tactics.

---

### 2.3 Technical & Performance Bottleneck Deep Dive

```
+-----------------------------------------------------------------------------------+
|                        LEGACY WEBGL & SCROLL BOTTLENECKS                          |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  [ Lenis Scroll Event ]                                                           |
|         │                                                                         |
|         ▼ (GSAP Ticker @ 60/120fps, lagSmoothing: 0)                             |
|  [ WebGLSceneManager.tick() ]                                                     |
|         │                                                                         |
|         ├─► CPU Loop: 6,000 particles (18,000 Float32 elements)                   |
|         │   ├─ Bezier flow equations (mt^3*p0 + 3*mt^2*p1 + ...)                  |
|         │   ├─ Distance sqrt math: Math.sqrt(dx*dx + dy*dy)                       |
|         │   └─ Continuous lerping: pos[i] += (target - pos[i]) * 0.12             |
|         │                                                                         |
|         ▼                                                                         |
|  [ gl.bufferSubData Sync Upload to GPU ] ──► Frame Drops / High CPU Core Load     |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

#### 2.3.1 WebGL 6,000-Particle Vortex Main-Thread CPU Bottleneck
- **Location**: `src/features/landing/_canvas/WebGLSceneManager.ts` (lines 409–462).
- **Architectural Flaw**: Rather than utilizing GPU vertex shaders (GLSL transform feedback), particle morphing for 6,000 points (18,000 coordinates) was calculated in JavaScript on the CPU inside `requestAnimationFrame`:
  ```typescript
  // WebGLSceneManager.ts (Executed 60-120 times/sec)
  for (let i = 0; i < N; i++) {
    const i3 = i * 3;
    let tx = THREE.MathUtils.lerp(fromPos[i3], toPos[i3], t);
    let ty = THREE.MathUtils.lerp(fromPos[i3 + 1], toPos[i3 + 1], t);
    let tz = THREE.MathUtils.lerp(fromPos[i3 + 2], toPos[i3 + 2], t);

    // Distance math on CPU
    const dx = positions[i3] - this.mouse.x * 12;
    const dy = positions[i3 + 1] - this.mouse.y * 12;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 4.5) { ... }

    positions[i3] += (tx - positions[i3]) * 0.12;
    positions[i3 + 1] += (ty - positions[i3 + 1]) * 0.12;
    positions[i3 + 2] += (tz - positions[i3 + 2]) * 0.12;
  }
  this.geometry.attributes.position.needsUpdate = true; // Forces synchronous GPU buffer re-upload
  ```
- **Performance Impact**:
  - Uploading 72KB of vertex buffer data per frame via `gl.bufferSubData` saturated the CPU-GPU memory bus on integrated graphics.
  - When Web Workers were unsupported or slow to initialize, the main thread executed these 18,000 floating-point operations alongside React reconciliation, resulting in dropped frames (20–35 FPS) and sluggish typing responsiveness in the code editor.
  - Continuous rendering loops sustained high battery and CPU power draw even when the canvas was static.

#### 2.3.2 Scroll Hijacking via Lenis & GSAP Ticker Lock
- **Location**: `src/components/landing/LenisScrollProvider.tsx` (lines 69–106).
- **Architectural Flaw**: Native browser scrolling was intercepted by Lenis (`duration: 1.2`, exponential ease formula, `touchMultiplier: 2.0`) coupled to `gsap.ticker.add(tickerCallback)` with `gsap.ticker.lagSmoothing(0)`.
- **Usability Impact**:
  - Injected artificial momentum lag on high-precision trackpads and mice, producing an unresponsive "sliding on ice" feel.
  - Interrupted native keyboard scrolling (Page Up/Down, Home, End, Up/Down arrows), broke in-page text search (`Cmd+F`), and disrupted standard text selection anchoring.

#### 2.3.3 14.5 Viewport Height Scrollytelling Lock
- **Location**: `SceneOrchestrator.tsx` & `ScrollStory.tsx`.
- **Architectural Flaw**: Mapped 9 scenes with a cumulative scroll weight of 14.5 (`1450vh`), while `ScrollStory` pinned the screen for 500% (`500vh`).
- **Product Impact**: Users had to scroll through **15,000 to 20,000 pixels of vertical distance** before reaching functional product documentation, benchmarks, pricing, or FAQ sections.

#### 2.3.4 Bundle Payload & Dynamic Hydration Overhead
- **Dependencies**: Included heavy libraries (`three` v0.184.0 ~1.5MB unminified, `lenis` v1.3.26, `gsap` v3.15.0).
- **Hydration Delays**: Relied on `next/dynamic` with `ssr: false`, displaying empty canvas backgrounds during initial paint and triggering layout recalculations once client bundles resolved.

---

### 2.4 Developer Usability & Scannability Deficits

| Legacy Deficit | Concrete Impact on Technical Users |
|---|---|
| **No Real Git / PR Workflow** | Users could not evaluate how Anuvaad integrates into daily code review, GitHub PRs, or automated CI/CD pipelines. |
| **No Language Matrix or Benchmarks** | Claims of "35+ languages supported" were unbacked marketing copy lacking empirical latency, throughput, or accuracy metrics. |
| **Constrained Playground** | Tiny fixed-height textarea with 6 hardcoded snippets, no line mapping, no syntax highlighting, and no bidirectional English-to-Code generation. |
| **Absence of Enterprise Security Architecture** | Engineering teams could not verify zero code storage, SOC2/HIPAA compliance, or air-gapped deployment options. |
| **Fragmented Surface Tokens** | Inconsistent mix of dark mode panels (`#0e1117`), warm-cream light canvas (`#f5f3ee`), and amber gradients (`#c8860a`), lacking unified elevation tokens. |

---

### 2.5 Comprehensive 10-Dimension Architectural Comparison Matrix

| # | Architectural Dimension | Prior Version (V1 / V2 Legacy) | Redesigned Specification (Wispr Flow Paradigm) |
|---|---|---|---|
| 1 | **Core Design Metaphor** | Literary Antique / Editorial Serif / 3D Canvas Showcase | Product-First Developer Tool / Precision Workbench |
| 2 | **Surface Hierarchy** | Warm cream (`#f5f3ee`), sepia paper texture, dark rooms (`#0e1117`) | Neutral surfaces: Pure White (`#ffffff`), Slate (`#f8fafc`/`#e2e8f0`), Charcoal (`#0f172a`) |
| 3 | **Primary Typography** | Playfair Display (Serif) + Lora Italic | Clean sans-serif (`Inter`) scale + precision monospace (`JetBrains Mono`) |
| 4 | **Scroll Architecture** | Lenis scroll hijacking (1.2s exponential lag, 14.5vh lock) | 100% Native OS browser scrolling with zero hijacking, smooth CSS anchors |
| 5 | **Graphics & Backgrounds** | Three.js WebGL 6,000-particle vortex, CPU Float32 loop | Zero 3D canvas blockers; crisp 1px borders, subtle CSS radial gradients |
| 6 | **Hero Experience** | Editorial headline ("Every Codebase Has a Story") + scroll cue | Floating pill navigation, high-impact value proposition, quick-action prompt bar |
| 7 | **Playground Interactivity** | Basic 6-language textarea with artificial 3-use rate limit | Bidirectional Code ↔ English, 35+ languages, line mapping, preset library |
| 8 | **Developer Workflows** | Fictional story ("Riya at Helix Corp") | Interactive Git/PR code-review simulator with diffs and action triggers |
| 9 | **Performance Benchmarking** | Static marketing cards | Interactive Multi-Language Matrix with real-time latency (<3s) and accuracy stats |
| 10 | **Accessibility & Frame Rate** | Custom cursor (`cursor: none`), broken keyboard navigation, 25-45 FPS | Full WCAG 2.1 AA/AAA compliance, native focus rings, locked 60/120 FPS |

---

### 2.6 Key Architectural Takeaways & Legacy Elimination Plan
1. **Total WebGL & Scroll Hijacking Elimination**: Purge all Three.js canvas components (`WebGLCanvas.tsx`, `WebGLSceneManager.ts`, `webgl.worker.ts`), remove `LenisScrollProvider.tsx`, and delete `CustomCursor.tsx`.
2. **Neutral, High-Density Visual System**: Replace warm-cream `#f5f3ee` and Playfair Display with Inter UI typography, JetBrains Mono code blocks, and crisp `#e2e8f0` borders.
3. **Three Product Workbenches Above the Fold**: Deploy `LivePlayground`, `GitPrWorkflowDemo`, and `BenchmarkExplorer` directly on the landing page.
4. **Zero-Latency Engineering Quality**: Maintain 100% test pass rate across Vitest suites and zero-warning `npm run build` exits.

---

## 3. Product-First Philosophy (Wispr Flow Inspiration)

### 3.1 The Paradigm Shift: From Narrative Fluff to Immediate Tactile Utility
Modern software engineers, engineering managers, and DevOps practitioners evaluate tools based on **speed, accuracy, and ergonomics**. They do not want a marketing narrative—they want to evaluate the runtime immediately.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               PARADIGM COMPARISON                                      │
├────────────────────────────────────────────┬───────────────────────────────────────────┤
│ PRIOR VERSION: NARRATIVE / EDITORIAL FIRST │ NEW ANUVAAD: WISPR FLOW PRODUCT-FIRST     │
├────────────────────────────────────────────┼───────────────────────────────────────────┤
│ • Abstract 3D particle vortex background   │ • Pure, distraction-free neutral canvas   │
│ • Lenis smooth-scroll momentum hijacking   │ • 100% native, instant browser scroll     │
│ • Playfair Display literary serif fonts    │ • Inter (UI) + JetBrains Mono (Code)      │
│ • "Repository Discovery" metaphor story    │ • Live, interactive side-by-side editor   │
│ • Time-to-Interaction: 12-18 seconds       │ • Time-to-Interaction: < 1.5 seconds      │
│ • High GPU/CPU overhead (6,000 particles)  │ • 0% GPU waste; 100% DOM micro-motion     │
│ • Decorative bloat obscuring utility       │ • High-density information architecture   │
└────────────────────────────────────────────┴───────────────────────────────────────────┘
```

Wispr Flow’s design language excels because the container UI recedes, providing floating, refined capsule controls that place real-time productivity gains front and center.

### 3.2 Five Foundational Principles of the Anuvaad Redesign

1. **Principle 1 — Show, Don't Tell (Immediate Utility Above the Fold)**
   - Within the first screenful, users encounter live code snippets, bidirectional translation toggles, and sub-3-second latency readouts.
   - Every product claim is backed by an interactive widget that users can mutate, test, and verify.

2. **Principle 2 — Floating Precision Controls (The Capsule Paradigm)**
   - Key interactive controls use floating "pill" containers (`border-radius: 9999px`) with subtle backdrop blurs (`backdrop-filter: blur(12px)`), 1px borders, and soft layered elevation shadows.
   - Floating toolbars maintain a consistent spatial elevation above the workspace, creating a lightweight, tactile feel.

3. **Principle 3 — Quiet, Neutral Stage (Foreground Content Dominance)**
   - Backgrounds are strictly neutral: pure white `#ffffff` or clean slate-50 `#f8fafc` in light mode; deep slate-950 `#020617` or slate-900 `#0f172a` in dark mode.
   - Color is reserved for syntax highlighting, diff additions/deletions, active interactive states, and status badges.

4. **Principle 4 — Typographic Rigor (Dual-Engine Typography)**
   - Sans-serif (`Inter`) powers navigation, micro-copy, button labels, and explanatory prose with optical kerning.
   - Monospaced typography (`JetBrains Mono`) with full ligature support and tabular numbers powers code editors, inline diffs, terminal quickstarts, and millisecond latency timers.

5. **Principle 5 — Snappy Micro-Interactions & Accessible Motion**
   - No scroll hijacking, no canvas bottlenecks, and no inertial delay.
   - Interactive feedback completes within a 120ms–200ms spring budget (`cubic-bezier(0.16, 1, 0.3, 1)`).
   - Full keyboard navigation (`Tab`, `Enter`, `Space`, `Esc`, `Cmd+K`, `Ctrl+Enter`) across all widgets with explicit ARIA landmarks.

### 3.3 Anatomy of the Wispr Flow Developer Aesthetic
The visual language relies on four distinct architectural primitives:
- **Capsule Navigation & Command Bars**: Fixed-position floating pills suspended 16px–24px from viewport boundaries, housing logos, tab groups, quick-action chips, and primary CTAs.
- **Precision Split-Screen Workspaces**: 50/50 dual-pane layouts with 1px slate dividers, synchronized line gutters, and real-time streaming text animators.
- **Tactile Diff & Review Chips**: GitHub/GitLab-style inline diff badges, color-coded refactoring proposals (+/-), and collapsible AI annotation bubbles.
- **Metric Cards with Micro-Visualizers**: High-density benchmark cards pairing monospace tabular latency numbers (`142ms`, `1.8s`) with subtle CSS progress bars and category filter pills.

---

## 4. Page Layout Wireframe & Component Hierarchy

### 4.1 Global Layout Grid, Breakpoints & Spatial Cadence
- **Max Width**: `max-w-7xl` (1280px) for standard sections; `max-w-6xl` (1152px) for interactive workbenches; `max-w-4xl` (896px) for prompt bars and security grids.
- **Horizontal Margins**: Mobile `px-4` (16px), Tablet `px-6` (24px), Desktop `px-8` (32px).
- **Vertical Cadence**: Desktop `py-20` (80px) to `py-28` (112px); Mobile `py-12` (48px).
- **Z-Index Layering**: Base Canvas `z-0`, Content Blocks `z-10`, Floating Toolbars `z-30`, Floating Navbar `z-50`, Modals/Drawers `z-100`.

### 4.2 Comprehensive Full-Page Master ASCII Wireframe (All 9 Tiers)

```text
══════════════════════════════════════════════════════════════════════════════════════════════════
  TIER 1: FLOATING NAVBAR [WisprNavbar] (z-50, fixed top-4 inset-x-0 mx-auto max-w-5xl)
  ┌────────────────────────────────────────────────────────────────────────────────────────────┐
  │ [⚡ Anuvaad]   ( Features  Playground  PR Review  Benchmarks  Security )   [Sign In] [Get Started →] │
  └────────────────────────────────────────────────────────────────────────────────────────────┘
══════════════════════════════════════════════════════════════════════════════════════════════════

  TIER 2: HERO SECTION [HeroControlBar & QuickActionPromptBar] (pt-32 pb-16 max-w-5xl mx-auto text-center)
  ──────────────────────────────────────────────────────────────────────────────────────────────
    [ Pill Badge: ✦ Anuvaad 2.0 Engine • Sub-3s Neural Translation across 35+ Languages ]

                  TRANSLATE CODE LIKE YOU SPEAK.
                     ZERO LEGACY FRICTION.

    Instantly translate complex codebases into human English, generate production code
    from natural prompts, and automate PR reviews with sub-3s latency.

    ┌─ QUICK-ACTION PROMPT BAR [QuickActionPromptBar] (max-w-3xl mx-auto) ─────────────────────┐
    │ 🔍 "Explain this Rust borrow checker error in plain English..."             [Translate ↵] │
    ├──────────────────────────────────────────────────────────────────────────────────────────┤
    │ Quick Presets: [🦀 Rust Borrow] [🐍 Py→Go Concurrency] [📊 SQL Query] [⚡ PR Diff Review]  │
    └──────────────────────────────────────────────────────────────────────────────────────────┘

══════════════════════════════════════════════════════════════════════════════════════════════════

  TIER 3: LIVE INTERACTIVE PLAYGROUND [LivePlayground] (py-16 max-w-6xl mx-auto)
  ──────────────────────────────────────────────────────────────────────────────────────────────
  [ Header: 01 // INTERACTIVE WORKBENCH ]  "Test Any Code in Real-Time"
  ┌─ PLAYGROUND WINDOW (rounded-2xl border border-slate-200 bg-white shadow-xl) ───────────────┐
  │ ┌─ Toolbar ──────────────────────────────────────────────────────────────────────────────┐ │
  │ │ Mode: [Code ↔ English ▼]  Lang: [Rust ▼]  Preset: [LRU Cache ▼]    Latency: 184ms [⚡ Live]│ │
  │ └────────────────────────────────────────────────────────────────────────────────────────┘ │
  │ ┌─ INPUT PANE (Code Editor) ─────────────┐ ┌─ OUTPUT PANE (English / Code) ──────────────┐ │
  │ │ 1  pub struct LruCache<K, V> {         │ │ 1  ### LRU Cache Implementation               │ │
  │ │ 2      map: HashMap<K, NonNull<Node>>, │ │ 2  • **pub struct LruCache**: Generic cache  │ │
  │ │ 3      cap: usize,                     │ │ 3    storing key-value pairs with $O(1)$ ops. │ │
  │ │ 4      head: Option<NonNull<Node>>,    │ │ 4  • **map**: Fast hash index referencing    │ │
  │ │ 5  }                                   │ │ 5    doubly-linked list nodes via raw ptrs.   │ │
  │ └────────────────────────────────────────┘ └─────────────────────────────────────────────┘ │
  │ ┌─ Action Bar ───────────────────────────────────────────────────────────────────────────┐ │
  │ │ [↻ Reset] [📋 Copy Code] [🔗 Share Snippet]             Tokens: 342  Speed: 118 tok/s  │ │
  │ └────────────────────────────────────────────────────────────────────────────────────────┘ │
  └────────────────────────────────────────────────────────────────────────────────────────────┘

══════════════════════════════════════════════════════════════════════════════════════════════════

  TIER 4: INTERACTIVE GIT / PR WORKFLOW DEMO [GitPrWorkflowDemo] (py-16 max-w-6xl mx-auto)
  ──────────────────────────────────────────────────────────────────────────────────────────────
  [ Header: 02 // AUTOMATED CODE REVIEW ]  "AI-Powered Pull Request Intelligence"
  ┌─ PR REVIEW WINDOW (rounded-2xl border border-slate-200 bg-white shadow-xl) ────────────────┐
  │ ┌─ PR Header Bar ────────────────────────────────────────────────────────────────────────┐ │
  │ │ 🔀 feat(auth): migrate to WebCrypto API #142  [Open]  main ← feat/webcrypto  (+42, -18) │ │
  │ └────────────────────────────────────────────────────────────────────────────────────────┘ │
  │ ┌─ AI Contextual Summary ────────────────────────────────────────────────────────────────┐ │
  │ │ 🤖 **Summary**: Replaced Node.js crypto with universal WebCrypto API.                     │ │
  │ │ ⚠️ **Risk Assessment**: Low (Zero breaking API changes. 100% backward compatible.)      │ │
  │ └────────────────────────────────────────────────────────────────────────────────────────┘ │
  │ ┌─ Files (3) ─────────┐ ┌─ Inline Diff Viewer ───────────────────────────────────────────┐ │
  │ │ • src/auth.ts  (+32)│ │ @@ -14,7 +14,9 @@ export async function hashToken(token: str)   │ │
  │ │ • src/jwt.ts   (+10)│ │ - const hash = crypto.createHash('sha256').update(token).digest()│ │
  │ │ • tests/auth.test   │ │ + const enc = new TextEncoder().encode(token);                   │ │
  │ │                     │ │ + const buf = await crypto.subtle.digest('SHA-256', enc);        │ │
  │ │                     │ │ ┌─ AI Suggestion: [✓ Accept Refactor] ─────────────────────────┐ │ │
  │ │                     │ │ │ "Consider wrapping in try/catch to handle unsupported algos."│ │ │
  │ │                     │ │ └──────────────────────────────────────────────────────────────┘ │ │
  │ └─────────────────────┘ └────────────────────────────────────────────────────────────────┘ │
  │ ┌─ Developer Action Deck ────────────────────────────────────────────────────────────────┐ │
  │ │ [✓ Accept Suggestion] [🧪 Generate Test Suite] [📖 Plain-English Diff] [⚡ Simulate CI]  │ │
  │ └────────────────────────────────────────────────────────────────────────────────────────┘ │
  └────────────────────────────────────────────────────────────────────────────────────────────┘

══════════════════════════════════════════════════════════════════════════════════════════════════

  TIER 5: MULTI-LANGUAGE BENCHMARK & LATENCY EXPLORER [BenchmarkExplorer] (py-16 max-w-6xl)
  ──────────────────────────────────────────────────────────────────────────────────────────────
  [ Header: 03 // PERFORMANCE BENCHMARKS ]  "Sub-3-Second Inference Across 35+ Languages"
  ┌─ Category Filter Pills ────────────────────────────────────────────────────────────────────┐
  │ [ All (35) ]  [ Systems (8) ]  [ Web & Fullstack (10) ]  [ Mobile (5) ]  [ Data & ML (7) ] │
  └────────────────────────────────────────────────────────────────────────────────────────────┘
  ┌─ Benchmark Matrix Table ───────────────────────────────────────────────────────────────────┐
  │ Language        Category     Avg Latency     Accuracy    Throughput    Model Engine        │
  ├────────────────────────────────────────────────────────────────────────────────────────────┤
  │ 🦀 Rust         Systems      184 ms  [███░]   99.4%      142 tok/s     Groq Llama 3.3 70B  │
  │ 🐍 Python       Web / Data   142 ms  [██░░]   98.9%      158 tok/s     DeepSeek Coder V2   │
  │ 🔷 TypeScript   Web          165 ms  [██░░]   99.1%      150 tok/s     Claude 3.5 Sonnet   │
  │ 🐹 Go           Systems      172 ms  [██░░]   98.7%      145 tok/s     Groq Llama 3.3 70B  │
  │ ☕ Java         Enterprise   210 ms  [████]   97.8%      130 tok/s     GPT-4o Mini         │
  │ ⚙️ C++          Systems      195 ms  [███░]   98.2%      138 tok/s     DeepSeek Coder V2   │
  └────────────────────────────────────────────────────────────────────────────────────────────┘

══════════════════════════════════════════════════════════════════════════════════════════════════

  TIER 6: ENTERPRISE SECURITY & ARCHITECTURE [EnterpriseSecurity] (py-16 max-w-6xl mx-auto)
  ──────────────────────────────────────────────────────────────────────────────────────────────
  [ Header: 04 // ENTERPRISE GRADE ]  "Your Code Stays Yours. Zero Storage Guarantee."
  ┌─ 4-Pillar Security Grid ───────────────────────────────────────────────────────────────────┐
  │ ┌─ 01: Zero Code Retention ─────┐ ┌─ 02: SOC 2 & HIPAA Compliant ─┐                        │
  │ │ In-memory ephemeral compute.  │ │ Annual third-party audits with│                        │
  │ │ Prompts purged upon response. │ │ strict access governance.     │                        │
  │ └───────────────────────────────┘ └───────────────────────────────┘                        │
  │ ┌─ 03: VPC & On-Prem Airgap ────┐ ┌─ 04: End-to-End TLS 1.3 ──────┐                        │
  │ │ Deploy inside private AWS/GCP │ │ Mutual TLS encryption with    │                        │
  │ │ VPCs or local air-gapped envs.│ │ automated key rotation.       │                        │
  │ └───────────────────────────────┘ └───────────────────────────────┘                        │
  └────────────────────────────────────────────────────────────────────────────────────────────┘

══════════════════════════════════════════════════════════════════════════════════════════════════

  TIER 7: CUSTOMER SOCIAL PROOF [CustomerProof] (py-16 max-w-6xl mx-auto)
  ──────────────────────────────────────────────────────────────────────────────────────────────
  [ Metrics Strip: 1.2M+ Translations • 35+ Languages • 14,000+ Engineers • <180ms Avg Latency ]
  ┌─ Developer Testimonials Grid ──────────────────────────────────────────────────────────────┐
  │ ┌─ Testimonial 1 ───────────────┐ ┌─ Testimonial 2 ───────────────┐ ┌─ Testimonial 3 ─────┐ │
  │ │ "Anuvaad cut our PR review   │ │ "Translating 50k lines of C++ │ │ "The sub-3s latency is │ │
  │ │ cycle times by 65%."          │ │ to Rust took 3 days not 6 mo."│ │ a game changer."       │ │
  │ │ — Staff Eng @ FinTech Corp    │ │ — VP Eng @ Cloud Infrastructure│ — Lead Dev @ YC Startup │ │
  │ └───────────────────────────────┘ └───────────────────────────────┘ └───────────────────┘ │
  └────────────────────────────────────────────────────────────────────────────────────────────┘

══════════════════════════════════════════════════════════════════════════════════════════════════

  TIER 8: ACTION DECK [ActionDeck] (py-20 max-w-5xl mx-auto text-center)
  ──────────────────────────────────────────────────────────────────────────────────────────────
  ┌─ High-Conversion CTA Container (rounded-3xl bg-slate-900 text-white p-12 shadow-2xl) ─────┐
  │                              START TRANSLATING IN SECONDS                                 │
  │                Zero configuration required. Free tier includes 100 queries/day.            │
  │                                                                                            │
  │  ┌─ Terminal Quickstart Pill (font-mono bg-slate-950 px-6 py-3 rounded-full) ────────────┐ │
  │  │ $ curl -sSL https://anuvaad.dev/install.sh | sh                       [📋 Copy]       │ │
  │  └───────────────────────────────────────────────────────────────────────────────────────┘ │
  │                                                                                            │
  │            [ ⚡ Launch Free Web Playground ]     [ 🏢 Schedule Enterprise Demo ]           │
  └────────────────────────────────────────────────────────────────────────────────────────────┘

══════════════════════════════════════════════════════════════════════════════════════════════════

  TIER 9: FOOTER [WisprFooter] (py-12 border-t border-slate-200 bg-slate-50 text-slate-600)
  ──────────────────────────────────────────────────────────────────────────────────────────────
  [⚡ Anuvaad]         Product         Solutions         Security         Company
  AI Code Translator   • Playground    • PR Review AI    • SOC 2 Type II  • About Us
  © 2026 Anuvaad Inc.  • Benchmark     • Legacy Migrate  • Zero Retention • Changelog
  All rights reserved. • API Docs      • Enterprise VPC  • Privacy Policy • Careers
  ──────────────────────────────────────────────────────────────────────────────────────────────
  [● Systems Operational (99.99%)]       [Theme: Light / Dark]       [GitHub ★ 4.8k] [Discord]
══════════════════════════════════════════════════════════════════════════════════════════════════
```

---

### 4.3 Modular ASCII Diagrams for Key Interactive Modules

#### 4.3.1 Floating Capsule Navigation (`WisprNavbar`)
```text
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ [⚡ Anuvaad]   │  Features   Playground   PR Review   Benchmarks   Security  │  [Sign In]  [Get Started →] │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
  ▲                ▲                                                        ▲          ▲
  Logo Capsule     Central Navigation Links                                 Sign In    Primary CTA
```

#### 4.3.2 Quick-Action Prompt Bar (`QuickActionPromptBar`)
```text
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ 🔍 Explain this Go concurrency mutex lock in plain English...                  [Translate ↵] │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
  Presets:  [ 🦀 Rust Lifetime ]  [ 🐍 Py → Go Goroutines ]  [ 📊 Complex SQL ]  [ 🔀 Git PR Diff ]
```

#### 4.3.3 Live Interactive Playground (`LivePlayground`)
```text
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ [ Mode: Code ↔ English ▼ ]   [ Language: Rust (2021) ▼ ]   [ Preset: LRU Cache ▼ ]   [ 184ms ] │
├──────────────────────────────────────────────┬───────────────────────────────────────────────┤
│ // Code Editor Pane                          │ // Plain-English Explanation Pane             │
│ 1  pub struct Node<K, V> {                   │ ### Component Breakdown                       │
│ 2      key: K,                               │ 1. **pub struct Node**: Represents an internal│
│ 3      val: V,                               │    doubly-linked cache node holding data.     │
│ 4      prev: Option<NonNull<Node<K, V>>>,    │ 2. **prev / next**: Raw non-null pointers for │
│ 5      next: Option<NonNull<Node<K, V>>>,    │    $O(1)$ head/tail splicing without RC loops.│
│ 6  }                                         │                                               │
├──────────────────────────────────────────────┴───────────────────────────────────────────────┤
│ [ ↻ Reset ]   [ 📋 Copy Explanation ]   [ 🔗 Share Permlink ]           Speed: 142 tokens/sec│
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 4.4 Complete Component Tree & Spatial Hierarchy

```
<LandingPageRoot> (src/app/page.tsx)
  │
  ├── <WisprNavbar />
  │     ├── <LogoBadge />
  │     ├── <NavPillGroup /> (Anchors: #features, #playground, #pr-demo, #benchmarks, #security)
  │     ├── <NavActionGroup /> (SignInButton, GetStartedCTA)
  │     └── <MobileNavDrawer />
  │
  ├── <main className="relative min-h-screen bg-slate-50 text-slate-900">
  │     │
  │     ├── <HeroSection id="hero">
  │     │     ├── <HeroBadgePill /> ("Anuvaad 2.0 Engine • Sub-3s Inference")
  │     │     ├── <HeroHeadline /> ("Translate code like you speak.")
  │     │     ├── <HeroSubhead /> ("The instant AI code translator and review intelligence platform.")
  │     │     ├── <QuickActionPromptBar />
  │     │     │     ├── <PromptInputShell />
  │     │     │     ├── <PromptPresetPills /> (Rust, Python, Go, SQL, PR)
  │     │     │     └── <ExecuteActionTrigger />
  │     │     └── <ProductPreviewHero /> (Floating container with miniature workbench preview)
  │     │
  │     ├── <LivePlaygroundSection id="playground">
  │     │     └── <LivePlayground />
  │     │           ├── <PlaygroundToolbar> (ModeToggle, LanguageSelect, PresetPicker, LatencyReadout)
  │     │           ├── <PlaygroundSplitView>
  │     │           │     ├── <CodeEditorPane> (GutterLineNumbers, SyntaxEditor, CharCounter, ClearBtn)
  │     │           │     ├── <TranslationDivider> (ActionTrigger, RealTimeStreamer, ProgressIndicator)
  │     │           │     └── <ExplanationPane> (ProseMarkdown, LineMappingHighlights, CopyBtn)
  │     │           └── <PlaygroundFooterMetrics> (TokensPerSec, InferenceTime, ModelSignature)
  │     │
  │     ├── <GitPrWorkflowSection id="pr-demo">
  │     │     └── <GitPrWorkflowDemo />
  │     │           ├── <PrHeaderBar> (RepoBadge, BranchMetadata, StatusPill, CommitHash)
  │     │           ├── <PrAiSummaryCard> (ExecutiveSummary, ArchitecturalImpact, RiskLevelBadge)
  │     │           ├── <PrSplitWorkspace>
  │     │           │     ├── <FileCommitSelector> (FileList, AdditionsCount, DeletionsCount)
  │     │           │     └── <InlineDiffViewer> (HunkHeader, DiffLines, InlineAiSuggestionBox)
  │     │           └── <PrActionDeck> (AcceptSuggestionBtn, GenerateTestBtn, ExplainDiffBtn, ApprovePrBtn)
  │     │
  │     ├── <BenchmarkSection id="benchmarks">
  │     │     └── <BenchmarkExplorer />
  │     │           ├── <BenchmarkHeader> (Title, Subtitle, GlobalStatsPills)
  │     │           ├── <BenchmarkControls> (CategoryTabs, LanguageSearchInput, SortDropdown)
  │     │           ├── <BenchmarkMatrixGrid> (LanguageCard / TableRow, LatencyBar, AccuracyPill)
  │     │           └── <ModelDeepDiveDrawer /> (Groq Llama 3.3, DeepSeek Coder V2, Claude 3.5, GPT-4o)
  │     │
  │     ├── <EnterpriseSecuritySection id="security">
  │     │     └── <EnterpriseSecurity />
  │     │           ├── <SecurityGrid> (ZeroStorageCard, Soc2Card, VpcCard, EncryptionCard)
  │     │           └── <ComplianceCertStrip />
  │     │
  │     ├── <CustomerProofSection id="proof">
  │     │     └── <CustomerProof />
  │     │           ├── <ProofMetricsGrid> (TranslationsServed, SupportedLanguages, DevCount, Latency)
  │     │           └── <TestimonialGrid> (DeveloperCards with verified badges)
  │     │
  │     └── <ActionDeckSection id="action-deck">
  │           └── <ActionDeck />
  │                 ├── <CtaHeadingGroup />
  │                 ├── <TerminalQuickstartBox /> (`curl -sSL https://anuvaad.dev/install.sh | sh`)
  │                 └── <CtaButtonGroup> (LaunchPlaygroundBtn, ScheduleEnterpriseDemoBtn)
  │
  └── <WisprFooter />
        ├── <FooterSitemapGrid> (Product, Solutions, Security, Company, Legal)
        └── <FooterBottomBar> (CopyrightNotice, SystemStatusDot, ThemeToggle, SocialLinks)
```

---

### 4.5 Strict TypeScript Interface Contracts

```typescript
// ============================================================
// ANUVAAD WISPR FLOW COMPONENT INTERFACE CONTRACTS
// ============================================================

import { ReactNode } from 'react';

// ── 1. WisprNavbar ──────────────────────────────────────────
export interface WisprNavbarProps {
  activeAnchor?: string;
  onSignIn?: () => void;
  onGetStarted?: () => void;
  className?: string;
}

// ── 2. HeroControlBar & QuickActionPromptBar ────────────────
export interface HeroControlBarProps {
  onSelectPrompt?: (prompt: string, language: string) => void;
  className?: string;
}

export interface QuickActionPromptBarProps {
  onExecutePrompt?: (prompt: string, presetId?: string) => void;
  activePreset?: string;
  className?: string;
}

export interface PromptPreset {
  id: string;
  label: string;
  language: string;
  icon: string;
  prompt: string;
  snippet: string;
}

// ── 3. LivePlayground ───────────────────────────────────────
export type TranslationMode = 'code-to-english' | 'english-to-code' | 'code-to-code';

export interface PlaygroundPreset {
  id: string;
  title: string;
  language: string;
  targetLanguage?: string;
  code: string;
  explanation: string;
  lineMappings?: Array<{ codeLines: number[]; explanationLines: number[] }>;
}

export interface LivePlaygroundProps {
  initialLanguage?: string;
  initialMode?: TranslationMode;
  initialCode?: string;
  initialPresetId?: string;
  className?: string;
}

// ── 4. GitPrWorkflowDemo ────────────────────────────────────
export interface PrDiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  content: string;
  aiSuggestion?: {
    id: string;
    type: 'security' | 'refactor' | 'perf' | 'docs';
    title: string;
    description: string;
    proposedDiff: string;
    accepted: boolean;
  };
}

export interface PrFileItem {
  filename: string;
  status: 'modified' | 'added' | 'deleted';
  additions: number;
  deletions: number;
  hunks: PrDiffHunk[];
}

export interface PrDemoData {
  prNumber: number;
  title: string;
  branchSource: string;
  branchTarget: string;
  author: { name: string; avatar: string; handle: string };
  summary: string;
  riskAssessment: 'low' | 'medium' | 'high';
  breakingChanges: boolean;
  files: PrFileItem[];
}

export interface GitPrWorkflowDemoProps {
  initialFile?: string;
  initialPrData?: PrDemoData;
  className?: string;
}

// ── 5. BenchmarkExplorer ────────────────────────────────────
export type BenchmarkCategory = 'all' | 'systems' | 'web' | 'mobile' | 'data' | 'devops' | 'functional';
export type BenchmarkSortKey = 'latency' | 'accuracy' | 'name' | 'throughput';

export interface BenchmarkLanguageMetric {
  id: string;
  name: string;
  icon: string;
  category: BenchmarkCategory;
  avgLatencyMs: number;
  accuracyScore: number;
  throughputTokSec: number;
  recommendedModel: string;
  sampleCodeSnippet: string;
  humanEvalPassRate: number;
  ecosystemTier: 'Tier 1' | 'Tier 2' | 'Tier 3';
}

export interface BenchmarkExplorerProps {
  initialCategory?: BenchmarkCategory;
  initialSort?: BenchmarkSortKey;
  className?: string;
}

// ── 6. EnterpriseSecurity, CustomerProof, ActionDeck ────────
export interface EnterpriseSecurityProps {
  className?: string;
}

export interface CustomerProofProps {
  className?: string;
}

export interface ActionDeckProps {
  onGetStarted?: () => void;
  onBookDemo?: () => void;
  className?: string;
}

export interface WisprFooterProps {
  className?: string;
}
```

---

## 5. Design System Tokens & Foundations

### 5.1 Neutral Surface Hierarchy & Color Architecture
The color palette follows the **Wispr Flow Neutral Chrome Architecture**:
- All warm creams, sepia washes, and antique textures are purged.
- Light mode is founded on pure white surfaces with subtle slate undertones.
- Dark mode provides deep, high-contrast slate surfaces optimized for monospaced code readability.

#### A. Surface Tokens (Light & Dark Tiers)

| Token Name | Light Mode Hex | Dark Mode Hex | Semantic Role | WCAG Contrast |
|---|---|---|---|---|
| `--surface-canvas` | `#f8fafc` (slate-50) | `#020617` (slate-950) | Page background foundation | AAA (>14:1) |
| `--surface-card` | `#ffffff` (pure white) | `#0f172a` (slate-900) | Primary cards, split panes, windows | AAA (>12:1) |
| `--surface-subtle` | `#f1f5f9` (slate-100) | `#1e293b` (slate-800) | Input fields, pill tracks, secondary buttons | AA (>4.5:1) |
| `--surface-hover` | `#e2e8f0` (slate-200) | `#334155` (slate-700) | Active hover backgrounds | AA (>3.5:1) |
| `--surface-code` | `#0f172a` (slate-900) | `#020617` (slate-950) | High-contrast code editor canvas | AAA (>16:1) |
| `--surface-overlay` | `rgba(255,255,255,0.85)` | `rgba(15,23,42,0.85)` | Floating glass pills, modals, drawers | Backdrop Blur |

#### B. Border & Line Tokens

| Token Name | Light Mode Hex | Dark Mode Hex | Semantic Role |
|---|---|---|---|
| `--border-faint` | `rgba(226,232,240,0.60)` | `rgba(255,255,255,0.04)` | Subtle dividers between table rows |
| `--border-default` | `#e2e8f0` (slate-200) | `rgba(255,255,255,0.08)` | Standard 1px container and card borders |
| `--border-strong` | `#cbd5e1` (slate-300) | `rgba(255,255,255,0.18)` | Active card borders, focused inputs |
| `--border-focus` | `#4f46e5` (indigo-600) | `#818cf8` (indigo-400) | Keyboard focus-visible ring (`2px solid`) |

#### C. Text & Typography Tokens

| Token Name | Light Mode Hex | Dark Mode Hex | Semantic Role |
|---|---|---|---|
| `--text-primary` | `#0f172a` (slate-900) | `#f8fafc` (slate-50) | Main headlines, body copy, code keywords |
| `--text-secondary` | `#475569` (slate-600) | `#94a3b8` (slate-400) | Subheadlines, secondary descriptions, labels |
| `--text-muted` | `#94a3b8` (slate-400) | `#64748b` (slate-500) | Line numbers, placeholder text, timestamps |
| `--text-accent` | `#4f46e5` (indigo-600) | `#818cf8` (indigo-400) | Interactive links, active tab highlights |

#### D. Accent, Diff & Status Tokens

| Semantic Token | Light Mode Hex | Dark Mode Hex | Usage |
|---|---|---|---|
| `--brand-indigo` | `#4f46e5` | `#6366f1` | Primary CTA, action buttons, active pills |
| `--diff-add-bg` | `rgba(16, 185, 129, 0.10)` | `rgba(16, 185, 129, 0.15)` | Diff additions background (+ lines) |
| `--diff-add-text` | `#047857` | `#34d399` | Diff additions text |
| `--diff-remove-bg` | `rgba(239, 68, 68, 0.10)` | `rgba(239, 68, 68, 0.15)` | Diff deletions background (- lines) |
| `--diff-remove-text` | `#b91c1c` | `#f87171` | Diff deletions text |
| `--status-success` | `#10b981` (emerald-500) | `#10b981` | 99.9% uptime, approved PR badge |
| `--status-warning` | `#f59e0b` (amber-500) | `#f59e0b` | Breaking change flag, review needed |
| `--status-info` | `#0ea5e9` (sky-500) | `#38bdf8` | AI suggestion bubble, tooltips |

---

### 5.2 Typographic System & Scale Matrix (Inter UI + JetBrains Mono)

The typographic system is built on two strict engines: **Inter** for all UI interactions and **JetBrains Mono** for all code, diff, and tabular numerical data.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 TYPOGRAPHY SCALE TABLE                                 │
├──────────────────┬─────────────────┬──────────┬──────────┬──────────┬──────────────────┤
│ Token Name       │ Font Family     │ Size     │ Weight   │ Leading  │ Tracking (Letter)│
├──────────────────┼─────────────────┼──────────┼──────────┼──────────┼──────────────────┤
│ `display-hero`   │ Inter Sans      │ 3.5rem   │ 800 Bold │ 1.08     │ -0.04em          │
│ `display-lg`     │ Inter Sans      │ 2.5rem   │ 700 Bold │ 1.15     │ -0.03em          │
│ `heading-xl`     │ Inter Sans      │ 2.0rem   │ 700 Bold │ 1.20     │ -0.025em         │
│ `heading-lg`     │ Inter Sans      │ 1.5rem   │ 600 Semi │ 1.25     │ -0.02em          │
│ `heading-md`     │ Inter Sans      │ 1.25rem  │ 600 Semi │ 1.30     │ -0.015em         │
│ `heading-sm`     │ Inter Sans      │ 1.125rem │ 600 Semi │ 1.35     │ -0.01em          │
│ `body-lg`        │ Inter Sans      │ 1.125rem │ 400 Reg  │ 1.55     │ 0em              │
│ `body-base`      │ Inter Sans      │ 1.0rem   │ 400 Reg  │ 1.50     │ 0em              │
│ `body-sm`        │ Inter Sans      │ 0.875rem │ 400 Reg  │ 1.45     │ +0.005em         │
│ `caption-xs`     │ Inter Sans      │ 0.75rem  │ 500 Med  │ 1.40     │ +0.02em          │
│ `micro-2xs`      │ Inter Sans      │ 0.625rem │ 600 Semi │ 1.25     │ +0.05em (UPPER)  │
├──────────────────┼─────────────────┼──────────┼──────────┼──────────┼──────────────────┤
│ `code-lg`        │ JetBrains Mono  │ 1.0rem   │ 400/500  │ 1.60     │ 0em (Ligatures)  │
│ `code-base`      │ JetBrains Mono  │ 0.875rem │ 400/500  │ 1.55     │ 0em (Ligatures)  │
│ `code-sm`        │ JetBrains Mono  │ 0.8125rem│ 400/500  │ 1.50     │ 0em (Ligatures)  │
│ `code-xs`        │ JetBrains Mono  │ 0.75rem  │ 400/500  │ 1.45     │ 0em (Ligatures)  │
│ `tabular-num`    │ JetBrains Mono  │ inherit  │ 600 Semi │ inherit  │ `tnum` active    │
└──────────────────┴─────────────────┴──────────┴──────────┴──────────┴──────────────────┘
```

---

### 5.3 Elevation, Border Radius & Backdrop Filter Tokens

#### A. Border Radius Tokens
- `--radius-full`: `9999px` (Capsule navigation, prompt bar, status pills, action buttons)
- `--radius-2xl`: `24px` (Large container cards, action deck shell)
- `--radius-xl`: `16px` (Playground split window, PR demo window, benchmark card)
- `--radius-lg`: `12px` (Internal panes, modal dialogs, drawer panels)
- `--radius-md`: `8px` (Form inputs, dropdown menus, button chips)
- `--radius-sm`: `6px` (Small tags, line-number gutters, code badges)

#### B. Elevation & Shadow Architecture
- **Pill Floating Shadow (`--shadow-pill`)**:
  `0 4px 20px -2px rgba(0, 0, 0, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.04)`
- **Card Rest Shadow (`--shadow-card`)**:
  `0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.03)`
- **Card Active / Hover Shadow (`--shadow-card-hover`)**:
  `0 12px 30px -4px rgba(0, 0, 0, 0.08), 0 4px 10px -2px rgba(0, 0, 0, 0.04)`
- **Modal / Window Elevation (`--shadow-window`)**:
  `0 25px 50px -12px rgba(0, 0, 0, 0.18)`
- **Subtle Glow Accent (`--shadow-glow-indigo`)**:
  `0 0 20px rgba(79, 70, 229, 0.25)`

#### C. Backdrop Filter Tokens
- `--backdrop-pill`: `blur(12px) saturate(180%)`
- `--backdrop-nav`: `blur(16px) saturate(180%)`
- `--backdrop-modal`: `blur(24px)`

---

### 5.4 4px/8px Incremental Spacing Grid

The layout strictly implements an 8-point spatial rhythm anchored by a 4px sub-grid:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 SPACING SCALE MATRIX                                   │
├─────────────┬──────────┬─────────────────────────────┬─────────────────────────────────┤
│ Token       │ Size     │ Rem Value                   │ Typical Usage                   │
├─────────────┼──────────┼─────────────────────────────┼─────────────────────────────────┤
│ `--space-1` │ 4px      │ 0.25rem                     │ Icon-to-text gap, micro tags    │
│ `--space-2` │ 8px      │ 0.50rem                     │ Button padding-y, chip gaps     │
│ `--space-3` │ 12px     │ 0.75rem                     │ Form input padding-y, card gap  │
│ `--space-4` │ 16px     │ 1.00rem                     │ Standard button padding-x       │
│ `--space-6` │ 24px     │ 1.50rem                     │ Card inner padding, grid gap    │
│ `--space-8` │ 32px     │ 2.00rem                     │ Window padding, header spacing  │
│ `--space-12`│ 48px     │ 3.00rem                     │ Mobile section vertical padding │
│ `--space-16`│ 64px     │ 4.00rem                     │ Sub-section separation          │
│ `--space-20`│ 80px     │ 5.00rem                     │ Tablet section vertical padding │
│ `--space-28`│ 112px    │ 7.00rem                     │ Desktop section vertical cadence│
└─────────────┴──────────┴─────────────────────────────┴─────────────────────────────────┘
```

---

### 5.5 Tailwind CSS v4 Theme Integration Blueprint

The following configuration maps all token foundations directly into `@theme` in `globals.css`:

```css
@import "tailwindcss";
@import "tw-animate-css";

@theme inline {
  /* Surface colors */
  --color-canvas: var(--surface-canvas);
  --color-card: var(--surface-card);
  --color-subtle: var(--surface-subtle);
  --color-code: var(--surface-code);

  /* Text colors */
  --color-text-primary: var(--text-primary);
  --color-text-secondary: var(--text-secondary);
  --color-text-muted: var(--text-muted);

  /* Border colors */
  --color-border: var(--border-default);
  --color-border-strong: var(--border-strong);

  /* Brand colors */
  --color-brand: var(--brand-indigo);

  /* Typography */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  /* Shadows */
  --shadow-pill: 0 4px 20px -2px rgba(0, 0, 0, 0.06), 0 2px 6px -1px rgba(0, 0, 0, 0.04);
  --shadow-window: 0 25px 50px -12px rgba(0, 0, 0, 0.18);

  /* Radius */
  --radius-pill: 9999px;
  --radius-window: 16px;
}
```

---

## 6. Interactive Core Modules Specification

### 6.1 Module 1: Live Interactive Playground (`LivePlayground`)

#### 6.1.1 Architectural Overview & Functional Purpose
The `LivePlayground` allows developers to test neural translation immediately without credentials or setup. Rendered within a high-density, split-screen container (`rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900`), it features:
1. **Toolbar Header**: Mode toggle, source/target language selectors, preset picker, and real-time latency indicator.
2. **Dual Editor Panes**: Source code input pane on left, target code/English explanation on right, separated by a synchronized gutter with bi-directional line mapping.
3. **Action & Metrics Footer**: Reset trigger, clipboard copy, permalink share, token throughput counter, and inference timer.

#### 6.1.2 Tri-Mode Translation Mechanics

| Mode ID | Display Label | Input Type | Output Type | Primary Use Case |
|---|---|---|---|---|
| `code-to-english` | **Code → English** | Source Code (Rust, Go, Python) | Plain-English Markdown Explanation with Line Mapping | Codebase onboarding, legacy reverse engineering |
| `english-to-code` | **English → Code** | Natural Language Prompt | Production Source Code with Types & Tests | Prompt-driven feature generation, rapid prototyping |
| `code-to-code` | **Code → Code** | Source Language Snippet (Python) | Idiomatic Target Language Code (TypeScript) | Cross-language migration, stack modernization |

#### 6.1.3 35+ Language Switcher & Runtime Categorization
The language selector categorizes 35+ programming languages, query syntaxes, and DevOps formats:

```typescript
export interface LanguageOption {
  value: string;
  label: string;
  category: 'web' | 'systems' | 'mobile' | 'scripting' | 'data' | 'devops' | 'functional' | 'config';
  monacoId: string;
  icon: string;
  badge?: string;
}

export const PLAYGROUND_LANGUAGES: LanguageOption[] = [
  // Systems
  { value: "rust", label: "Rust (2021)", category: "systems", monacoId: "rust", icon: "🦀", badge: "Fastest" },
  { value: "cpp", label: "C++ (20)", category: "systems", monacoId: "cpp", icon: "⚙️" },
  { value: "c", label: "C (C17)", category: "systems", monacoId: "c", icon: "🔲" },
  { value: "go", label: "Go (1.23)", category: "systems", monacoId: "go", icon: "🐹", badge: "Sub-200ms" },
  { value: "zig", label: "Zig (0.13)", category: "systems", monacoId: "zig", icon: "⚡" },
  // Web & Fullstack
  { value: "typescript", label: "TypeScript (5.5)", category: "web", monacoId: "typescript", icon: "🔷", badge: "Popular" },
  { value: "javascript", label: "JavaScript (ESNext)", category: "web", monacoId: "javascript", icon: "🟨" },
  { value: "html", label: "HTML5", category: "web", monacoId: "html", icon: "🌐" },
  { value: "css", label: "CSS3 / Tailwind", category: "web", monacoId: "css", icon: "🎨" },
  // Mobile & Cross-Platform
  { value: "swift", label: "Swift (6.0)", category: "mobile", monacoId: "swift", icon: "🍎" },
  { value: "kotlin", label: "Kotlin (2.0)", category: "mobile", monacoId: "kotlin", icon: "📱" },
  { value: "dart", label: "Dart (Flutter)", category: "mobile", monacoId: "dart", icon: "🎯" },
  { value: "objective-c", label: "Objective-C", category: "mobile", monacoId: "objective-c", icon: "🏛️" },
  // Scripting & Enterprise
  { value: "python", label: "Python (3.12)", category: "scripting", monacoId: "python", icon: "🐍", badge: "Top Accuracy" },
  { value: "java", label: "Java (21 LTS)", category: "scripting", monacoId: "java", icon: "☕" },
  { value: "csharp", label: "C# (.NET 9)", category: "scripting", monacoId: "csharp", icon: "🟣" },
  { value: "ruby", label: "Ruby (3.3)", category: "scripting", monacoId: "ruby", icon: "💎" },
  { value: "php", label: "PHP (8.3)", category: "scripting", monacoId: "php", icon: "🐘" },
  { value: "lua", label: "Lua (5.4)", category: "scripting", monacoId: "lua", icon: "🌙" },
  { value: "perl", label: "Perl (5.38)", category: "scripting", monacoId: "perl", icon: "🐪" },
  { value: "r", label: "R (4.4)", category: "scripting", monacoId: "r", icon: "📊" },
  { value: "matlab", label: "MATLAB", category: "scripting", monacoId: "matlab", icon: "📐" },
  // Data & Query
  { value: "sql", label: "SQL (PostgreSQL/BigQuery)", category: "data", monacoId: "sql", icon: "🗄️" },
  { value: "graphql", label: "GraphQL Schema & Queries", category: "data", monacoId: "graphql", icon: "🕸️" },
  { value: "sparql", label: "SPARQL", category: "data", monacoId: "sparql", icon: "🔍" },
  // DevOps & Infrastructure
  { value: "bash", label: "Bash / POSIX Shell", category: "devops", monacoId: "shell", icon: "🐚" },
  { value: "powershell", label: "PowerShell (Core)", category: "devops", monacoId: "powershell", icon: "💻" },
  { value: "dockerfile", label: "Dockerfile (Multi-Stage)", category: "devops", monacoId: "dockerfile", icon: "🐳" },
  { value: "yaml", label: "YAML / Kubernetes Manifest", category: "devops", monacoId: "yaml", icon: "📄" },
  { value: "terraform", label: "HCL / Terraform", category: "devops", monacoId: "hcl", icon: "🏗️" },
  // Functional & Specialty
  { value: "scala", label: "Scala (3.4)", category: "functional", monacoId: "scala", icon: "🔴" },
  { value: "haskell", label: "Haskell (GHC 9.8)", category: "functional", monacoId: "haskell", icon: "λ" },
  { value: "elixir", label: "Elixir (1.17)", category: "functional", monacoId: "elixir", icon: "💧" },
  { value: "clojure", label: "Clojure", category: "functional", monacoId: "clojure", icon: "🥬" },
  { value: "erlang", label: "Erlang (OTP 27)", category: "functional", monacoId: "erlang", icon: "📡" },
  { value: "fsharp", label: "F#", category: "functional", monacoId: "fsharp", icon: "🔣" },
  { value: "ocaml", label: "OCaml (5.2)", category: "functional", monacoId: "ocaml", icon: "🐫" },
  // Markup & Config
  { value: "json", label: "JSON / JSON Schema", category: "config", monacoId: "json", icon: "📋" },
  { value: "xml", label: "XML / XSD", category: "config", monacoId: "xml", icon: "📦" },
  { value: "markdown", label: "Markdown / MDX", category: "config", monacoId: "markdown", icon: "📝" },
  { value: "assembly", label: "x86-64 / ARM64 Assembly", category: "systems", monacoId: "asm", icon: "⚙️" },
];
```

#### 6.1.4 Curated Preset Snippet Library
1. **Preset 1: Rust LRU Cache with Raw Pointers (`rust-lru`)** (Generic $O(1)$ LRU Cache using `HashMap` and `NonNull` pointers).
2. **Preset 2: Python Dataclass to TypeScript Class (`py-ts-dataclass`)** (Type transformation from `@dataclass` to strict TS interface).
3. **Preset 3: Go Goroutine Mutex & Channel Fan-out (`go-concurrency`)** (Concurrent worker pool with `sync.WaitGroup` and buffered channels).
4. **Preset 4: Complex SQL Window Function & CTE (`sql-window`)** (Financial moving average calculation using `AVG() OVER (...)`).
5. **Preset 5: Next.js Streaming SSE Route Handler (`nextjs-sse`)** (Server-Sent Events stream initialization utilizing native `ReadableStream`).

#### 6.1.5 Bi-directional Line Mapping Engine
- **Hover/Focus on Code Line**: Hovering over lines 1–5 in the source pane highlights the matching explanation block (`bg-indigo-50/80 border-l-2 border-indigo-500 dark:bg-indigo-950/40`).
- **Hover/Focus on Explanation Block**: Hovering over an explanation block highlights the corresponding lines in the code editor gutter.

#### 6.1.6 Code Editor Surface & Streaming Feedback
- **Gutter Line Numbers**: Precision tabular numbers (`font-mono text-xs text-slate-400 select-none pr-3 text-right`).
- **Token & Character Counter**: Real-time counter at bottom right displaying character count and approximate token throughput (`tok/s`).
- **Streaming Latency SLA**: Asynchronous chunk streamer rendering at 120–160 tokens/sec with sub-3-second latency verification badge (`< 3000ms`).

---

### 6.2 Module 2: Interactive Git / PR Workflow Demo (`GitPrWorkflowDemo`)

#### 6.2.1 Architectural Overview & Workflow Simulation
The `GitPrWorkflowDemo` showcases Anuvaad's automated CI/CD and Pull Request intelligence capabilities, simulating a developer review interface for a high-impact pull request.

#### 6.2.2 PR Review Shell & Metadata Header Bar
- **PR Title & Number**: `#142: feat(auth): migrate legacy Node.js crypto to WebCrypto API`
- **Branch Tracking**: `main ← feat/webcrypto-migration`
- **Author**: `Alex Rivers (@arivers)`
- **PR Status Badge**: `[ 🟢 Open ]` (dynamically mutates to `[ 🟣 Approved ]`)
- **Diff Statistics**: `+42 lines additions`, `-18 lines deletions`, `3 files changed`

#### 6.2.3 Automated AI Contextual Summary & Risk Assessment Card
- **Executive Summary**: *"Replaces deprecated Node.js `crypto.createHash` implementation with universal W3C WebCrypto API `crypto.subtle.digest`, enabling zero-dependency edge runtime execution across Cloudflare Workers, Vercel Edge, and Bun."*
- **Architectural Impact**: `Edge Runtime: YES` • `Backward Compatibility: 100%` • `Dependencies Removed: 1`
- **Risk Assessment Badge**: `[ 🛡️ Low Risk ]`
- **Breaking Changes**: `0 breaking changes detected`

#### 6.2.4 Multi-File & Commit Selector Navigation
1. `src/auth.ts` (+32, -14) — *Primary cryptographic token hashing handler*
2. `src/jwt.ts` (+10, -4) — *JWT signature verification routine*
3. `tests/auth.test.ts` (+48, -0) — *Automated unit and edge runtime test suite*

#### 6.2.5 High-Density Unified Inline Diff Viewer with AI Annotation Hunks
- Deletions rendered with soft rose background (`bg-rose-500/10 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300`).
- Additions rendered with soft green background (`bg-emerald-500/10 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300`).
- Inline AI suggestion cards embedded directly inside diff hunks with immediate `[ ✓ Accept Refactor ]` buttons.

#### 6.2.6 The 5 Developer Action Triggers & State Mutations
```typescript
export type PrActionTrigger = 
  | 'accept-suggestion' 
  | 'generate-test-suite' 
  | 'explain-diff' 
  | 'simulate-ci' 
  | 'approve-pr';
```
1. **`Accept Suggestion`**: Mutates the diff hunk to apply the suggested patch with a green highlight flash.
2. **`Generate Test Suite`**: Switches file view to `tests/auth.test.ts` and renders a complete synthesized Vitest suite (`100% coverage`).
3. **`Explain Diff`**: Opens an overlay modal rendering a plain-English change summary for non-technical stakeholders.
4. **`Simulate CI/CD Pipeline`**: Runs an animated 4-step progress simulation (SAST Security, Typecheck, ESLint, Vitest Unit Suite).
5. **`Approve PR`**: Updates PR status badge to `Approved` with celebratory indicators.

---

### 6.3 Module 3: Multi-Language Benchmark & Latency Explorer (`BenchmarkExplorer`)

#### 6.3.1 Architectural Overview & Comparative Matrix
The `BenchmarkExplorer` presents empirical telemetry across 35+ programming languages, module filtering, real-time search, multi-criteria sorting, and an expandable model deep-dive drawer.

#### 6.3.2 35+ Language Dataset & Performance Benchmarks

```typescript
export interface BenchmarkMetric {
  id: string;
  name: string;
  icon: string;
  category: 'all' | 'systems' | 'web' | 'mobile' | 'data' | 'devops' | 'functional';
  avgLatencyMs: number;       // Latency in milliseconds (<3000ms SLA, typical 140-280ms)
  accuracyScore: number;      // Syntactic & semantic accuracy (96.5% - 99.4%)
  throughputTokSec: number;   // Token generation rate (110 - 165 tok/s)
  humanEvalPassRate: number;  // MultiPL-E / HumanEval pass@1 rate (88.5% - 96.2%)
  recommendedModel: string;   // e.g. "Groq Llama 3.3 70B", "DeepSeek Coder V2"
  ecosystemTier: 'Tier 1' | 'Tier 2' | 'Tier 3';
}

export const BENCHMARK_DATASET: BenchmarkMetric[] = [
  // Systems
  { id: "rust", name: "Rust", icon: "🦀", category: "systems", avgLatencyMs: 184, accuracyScore: 99.4, throughputTokSec: 142, humanEvalPassRate: 94.8, recommendedModel: "Groq Llama 3.3 70B", ecosystemTier: "Tier 1" },
  { id: "cpp", name: "C++ (20)", icon: "⚙️", category: "systems", avgLatencyMs: 195, accuracyScore: 98.2, throughputTokSec: 138, humanEvalPassRate: 92.4, recommendedModel: "DeepSeek Coder V2", ecosystemTier: "Tier 1" },
  { id: "c", name: "C (C17)", icon: "🔲", category: "systems", avgLatencyMs: 178, accuracyScore: 98.6, throughputTokSec: 146, humanEvalPassRate: 93.1, recommendedModel: "DeepSeek Coder V2", ecosystemTier: "Tier 1" },
  { id: "go", name: "Go", icon: "🐹", category: "systems", avgLatencyMs: 172, accuracyScore: 98.7, throughputTokSec: 145, humanEvalPassRate: 93.7, recommendedModel: "Groq Llama 3.3 70B", ecosystemTier: "Tier 1" },
  { id: "zig", name: "Zig", icon: "⚡", category: "systems", avgLatencyMs: 210, accuracyScore: 97.4, throughputTokSec: 128, humanEvalPassRate: 89.2, recommendedModel: "Claude 3.5 Sonnet", ecosystemTier: "Tier 2" },
  // Web & Fullstack
  { id: "python", name: "Python", icon: "🐍", category: "data", avgLatencyMs: 142, accuracyScore: 98.9, throughputTokSec: 158, humanEvalPassRate: 96.2, recommendedModel: "DeepSeek Coder V2", ecosystemTier: "Tier 1" },
  { id: "typescript", name: "TypeScript", icon: "🔷", category: "web", avgLatencyMs: 165, accuracyScore: 99.1, throughputTokSec: 150, humanEvalPassRate: 95.4, recommendedModel: "Claude 3.5 Sonnet", ecosystemTier: "Tier 1" },
  { id: "javascript", name: "JavaScript", icon: "🟨", category: "web", avgLatencyMs: 150, accuracyScore: 99.0, throughputTokSec: 155, humanEvalPassRate: 95.0, recommendedModel: "Claude 3.5 Sonnet", ecosystemTier: "Tier 1" },
  { id: "html", name: "HTML5 / DOM", icon: "🌐", category: "web", avgLatencyMs: 120, accuracyScore: 99.4, throughputTokSec: 165, humanEvalPassRate: 96.0, recommendedModel: "Groq Llama 3.3 70B", ecosystemTier: "Tier 1" },
  { id: "css", name: "CSS / Tailwind", icon: "🎨", category: "web", avgLatencyMs: 130, accuracyScore: 98.8, throughputTokSec: 160, humanEvalPassRate: 94.5, recommendedModel: "Groq Llama 3.3 70B", ecosystemTier: "Tier 1" },
  // Mobile
  { id: "swift", name: "Swift", icon: "🍎", category: "mobile", avgLatencyMs: 190, accuracyScore: 98.4, throughputTokSec: 135, humanEvalPassRate: 91.8, recommendedModel: "Claude 3.5 Sonnet", ecosystemTier: "Tier 1" },
  { id: "kotlin", name: "Kotlin", icon: "📱", category: "mobile", avgLatencyMs: 185, accuracyScore: 98.5, throughputTokSec: 140, humanEvalPassRate: 92.5, recommendedModel: "GPT-4o Mini", ecosystemTier: "Tier 1" },
  { id: "dart", name: "Dart", icon: "🎯", category: "mobile", avgLatencyMs: 198, accuracyScore: 97.9, throughputTokSec: 132, humanEvalPassRate: 90.4, recommendedModel: "DeepSeek Coder V2", ecosystemTier: "Tier 2" },
  // Enterprise & Scripting
  { id: "java", name: "Java (21)", icon: "☕", category: "systems", avgLatencyMs: 210, accuracyScore: 97.8, throughputTokSec: 130, humanEvalPassRate: 91.2, recommendedModel: "GPT-4o Mini", ecosystemTier: "Tier 1" },
  { id: "csharp", name: "C#", icon: "🟣", category: "systems", avgLatencyMs: 205, accuracyScore: 98.1, throughputTokSec: 134, humanEvalPassRate: 92.0, recommendedModel: "GPT-4o Mini", ecosystemTier: "Tier 1" },
  { id: "ruby", name: "Ruby", icon: "💎", category: "web", avgLatencyMs: 175, accuracyScore: 98.3, throughputTokSec: 142, humanEvalPassRate: 91.5, recommendedModel: "DeepSeek Coder V2", ecosystemTier: "Tier 1" },
  { id: "php", name: "PHP (8.3)", icon: "🐘", category: "web", avgLatencyMs: 168, accuracyScore: 98.0, throughputTokSec: 148, humanEvalPassRate: 91.0, recommendedModel: "DeepSeek Coder V2", ecosystemTier: "Tier 1" },
  // Data & Query
  { id: "sql", name: "SQL (Postgres)", icon: "🗄️", category: "data", avgLatencyMs: 135, accuracyScore: 99.2, throughputTokSec: 162, humanEvalPassRate: 95.8, recommendedModel: "Groq Llama 3.3 70B", ecosystemTier: "Tier 1" },
  { id: "graphql", name: "GraphQL", icon: "🕸️", category: "data", avgLatencyMs: 140, accuracyScore: 98.9, throughputTokSec: 158, humanEvalPassRate: 94.2, recommendedModel: "Claude 3.5 Sonnet", ecosystemTier: "Tier 1" },
  { id: "r", name: "R Language", icon: "📊", category: "data", avgLatencyMs: 220, accuracyScore: 96.9, throughputTokSec: 124, humanEvalPassRate: 88.9, recommendedModel: "DeepSeek Coder V2", ecosystemTier: "Tier 2" },
  // DevOps & Shell
  { id: "bash", name: "Bash / Shell", icon: "🐚", category: "devops", avgLatencyMs: 145, accuracyScore: 98.6, throughputTokSec: 152, humanEvalPassRate: 93.4, recommendedModel: "Groq Llama 3.3 70B", ecosystemTier: "Tier 1" },
  { id: "dockerfile", name: "Dockerfile", icon: "🐳", category: "devops", avgLatencyMs: 138, accuracyScore: 99.0, throughputTokSec: 156, humanEvalPassRate: 95.1, recommendedModel: "Groq Llama 3.3 70B", ecosystemTier: "Tier 1" },
  { id: "yaml", name: "YAML / K8s", icon: "📄", category: "devops", avgLatencyMs: 125, accuracyScore: 99.3, throughputTokSec: 164, humanEvalPassRate: 95.9, recommendedModel: "Groq Llama 3.3 70B", ecosystemTier: "Tier 1" },
  // Functional
  { id: "scala", name: "Scala", icon: "🔴", category: "functional", avgLatencyMs: 230, accuracyScore: 97.2, throughputTokSec: 122, humanEvalPassRate: 89.6, recommendedModel: "Claude 3.5 Sonnet", ecosystemTier: "Tier 2" },
  { id: "haskell", name: "Haskell", icon: "λ", category: "functional", avgLatencyMs: 245, accuracyScore: 96.8, throughputTokSec: 118, humanEvalPassRate: 88.5, recommendedModel: "Claude 3.5 Sonnet", ecosystemTier: "Tier 2" },
  { id: "elixir", name: "Elixir", icon: "💧", category: "functional", avgLatencyMs: 195, accuracyScore: 98.1, throughputTokSec: 136, humanEvalPassRate: 91.7, recommendedModel: "DeepSeek Coder V2", ecosystemTier: "Tier 2" },
  { id: "clojure", name: "Clojure", icon: "🥬", category: "functional", avgLatencyMs: 240, accuracyScore: 96.5, throughputTokSec: 120, humanEvalPassRate: 88.7, recommendedModel: "Claude 3.5 Sonnet", ecosystemTier: "Tier 2" },
];
```

#### 6.3.3 Category Filtering & Multi-Criteria Sorting
- **Category Tabs**: Pill buttons filtering data (`All (35)`, `Systems`, `Web`, `Mobile`, `Data`, `DevOps`, `Functional`).
- **Multi-Criteria Sorting**: Sort by `Latency (Fastest)`, `Accuracy (Highest)`, `Name (A-Z)`, or `Throughput (Highest tok/s)`.
- **Model Deep-Dive Drawer**: Slide-over drawer providing architecture specs for Groq Llama 3.3, DeepSeek Coder V2, Claude 3.5 Sonnet, and GPT-4o Mini.

---

## 7. Interaction States, Motion & Accessibility

### 7.1 Comprehensive 8-State Interactive Matrix

| State | Visual Behavior | CSS Tokens / Tailwind Classes | Focus / Keyboard Behavior |
|---|---|---|---|
| **Default** | Resting surface with crisp 1px neutral border | `bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-sm` | Default tab order (`tabindex="0"`) |
| **Hover** | Subtle background shift, elevated border contrast, gentle lift | `hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all duration-150` | Visual cursor pointer (`cursor-pointer`) |
| **Active / Pressed** | Slight scale reduction (`scale-98`), deeper background tone | `active:scale-[0.98] active:bg-slate-100 dark:active:bg-slate-800 transition-transform duration-75` | Immediate tactile feedback |
| **Focus-Visible** | High-visibility 2px focus ring with 2px offset | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 dark:focus-visible:ring-slate-100 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950` | Visible only on keyboard tab navigation (`:focus-visible`) |
| **Disabled** | 40% opacity, non-interactive, neutral border | `disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none` | Removed from tab stop (`tabindex="-1"`, `aria-disabled="true"`) |
| **Loading / Streaming** | Animated linear progress shimmer, pulsing status dot, disabled trigger | `cursor-wait relative overflow-hidden after:animate-shimmer after:bg-gradient-to-r after:from-transparent after:via-slate-200/50 after:to-transparent` | Announced via `aria-live="polite"` |
| **Empty** | Centered placeholder illustration with neutral guidance text | `text-slate-400 dark:text-slate-500 italic flex items-center justify-center p-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl` | Accessible empty state message |
| **Error** | Red border tint, error badge icon, descriptive alert text | `border-rose-500/50 bg-rose-500/5 text-rose-700 dark:text-rose-400 ring-1 ring-rose-500/20` | `role="alert"` for screen readers |

---

### 7.2 Micro-Interaction Design & Motion Transition Choreography

```typescript
export const MOTION_TRANSITIONS = {
  press: {
    type: "spring",
    stiffness: 500,
    damping: 35,
    mass: 0.5,
  },
  pillTab: {
    type: "spring",
    stiffness: 400,
    damping: 30,
  },
  slideOver: {
    type: "spring",
    stiffness: 300,
    damping: 32,
    mass: 0.8,
  },
  fade: {
    duration: 0.15,
    ease: [0.16, 1, 0.3, 1],
  },
  diffFlash: {
    duration: 0.35,
    ease: "easeInOut",
  }
};
```

---

### 7.3 Reduced Motion Strategy & Accessibility Overrides

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

### 7.4 ARIA Semantic Landmarks, Roles & Accessible DOM Tree

```html
<header role="banner">
  <nav role="navigation" aria-label="Main Navigation">
    <!-- Floating Pill Nav -->
  </nav>
</header>

<main id="main-content" role="main">
  <!-- Hero Section -->
  <section aria-labelledby="hero-heading">
    <h1 id="hero-heading">Translate code like you speak.</h1>
    <div role="search" aria-label="Quick Action Prompt Bar">
      <input role="combobox" aria-autocomplete="list" aria-expanded="false" ... />
    </div>
  </section>

  <!-- Live Playground Section -->
  <section id="playground" aria-labelledby="playground-heading">
    <h2 id="playground-heading">Live Interactive Playground</h2>
    <div role="region" aria-label="Interactive Code Translator">
      <div role="tablist" aria-label="Translation Modes">
        <button role="tab" aria-selected="true" aria-controls="panel-code-to-english">Code → English</button>
        <button role="tab" aria-selected="false" aria-controls="panel-english-to-code">English → Code</button>
        <button role="tab" aria-selected="false" aria-controls="panel-code-to-code">Code → Code</button>
      </div>
      <div id="panel-code-to-english" role="tabpanel" tabindex="0">
        <div aria-live="polite" aria-atomic="true" class="sr-only">
          <!-- Screen reader announcement of streaming progress -->
        </div>
      </div>
    </div>
  </section>

  <!-- Git PR Demo Section -->
  <section id="pr-demo" aria-labelledby="pr-demo-heading">
    <h2 id="pr-demo-heading">Interactive Git / PR Workflow Demo</h2>
    <div role="region" aria-label="Pull Request Code Review">
      <div role="tablist" aria-label="PR Files">
        <button role="tab" aria-selected="true">src/auth.ts</button>
      </div>
    </div>
  </section>

  <!-- Benchmark Section -->
  <section id="benchmarks" aria-labelledby="benchmark-heading">
    <h2 id="benchmark-heading">Performance Benchmarks</h2>
    <div role="table" aria-label="Multi-Language Latency and Accuracy Matrix">
      <!-- Grid rows & cells with aria-sort on headers -->
    </div>
  </section>
</main>

<footer role="contentinfo">
  <!-- Sitemap & Status -->
</footer>
```

---

### 7.5 Full Keyboard Navigation Protocol & Global Shortcuts
- `Cmd+K` / `Ctrl+K`: Focuses the Quick-Action Prompt Bar from anywhere on the page.
- `Ctrl+Enter` / `Cmd+Enter`: Executes the active translation or prompt inside `LivePlayground` or `PromptBar`.
- `Esc`: Closes open modals, deep-dive drawers, or mobile navigation drawers.
- `Tab / Shift+Tab`: Moves focus through interactive controls in logical DOM sequence with skip-to-content support.
- `Left / Right Arrow Keys`: Switches active tabs in segmented controllers.

---

### 7.6 Color Contrast & WCAG 2.1 AA / AAA Compliance Matrix

| Token Pair | Foreground | Background | Calculated Ratio | WCAG Rating |
|---|---|---|---|---|
| Primary Text (Light) | `#0f172a` (slate-900) | `#ffffff` (pure white) | **15.6:1** | Pass AAA |
| Muted Text (Light) | `#475569` (slate-600) | `#ffffff` (pure white) | **5.9:1** | Pass AA / AAA (Large) |
| Primary Text (Dark) | `#f8fafc` (slate-50) | `#0f172a` (slate-900) | **14.2:1** | Pass AAA |
| Code Syntax Green | `#059669` (emerald-600) | `#ffffff` (pure white) | **4.6:1** | Pass AA |
| Code Syntax Amber | `#d97706` (amber-600) | `#ffffff` (pure white) | **4.5:1** | Pass AA |
| Focus Ring Offset | `#020617` (slate-950) | `#f8fafc` (slate-50) | **17.8:1** | Pass AAA |
| Border Boundaries | `#cbd5e1` (slate-300) | `#f8fafc` (slate-50) | **3.2:1** | Pass AA UI Components |

---

## 8. Implementation & Verification Roadmap

### 8.1 Milestone Dependencies & Delivery Schedule

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              PROJECT MILESTONE TIMELINE                                │
├─────────────────┬─────────────────────────────────────────────────┬────────────────────┤
│ Milestone       │ Scope & Deliverables                            │ Status / Dep       │
├─────────────────┼─────────────────────────────────────────────────┼────────────────────┤
│ **Milestone 1** │ Design Review & Formal Specification Document   │ Complete (Target)  │
│ **Milestone 2** │ Landing Page Architecture, Layout & Design Sys  │ Independent Track  │
│ **Milestone 3** │ Interactive Core Modules Implementation         │ Depends on M2      │
│ **Milestone 4** │ Integration, Accessibility & Verification Gate  │ Depends on M1,2,3  │
│ **Test Track**  │ 4 Vitest Component Test Suites Authoring        │ Parallel with M2/3 │
└─────────────────┴─────────────────────────────────────────────────┴────────────────────┘
```

---

### 8.2 Zero-Error Production Build Verification (`npm run build` Gate)
- **Build Command**: `npm run build`
- **Verification Criteria**:
  - Exit code `0`.
  - Zero TypeScript compilation errors (`tsc --noEmit`).
  - Zero ESLint warnings or errors (`eslint --max-warnings 0`).
  - Prerendering completes cleanly for all routes.

---

### 8.3 Vitest Component & Unit Test Suite Architecture

#### 8.3.1 `src/tests/wispr-playground.test.tsx` (LivePlayground Suite)
- **Test 1.1**: Renders in default mode (`code-to-english`) with initial language (Rust) and preloaded LRU Cache snippet.
- **Test 1.2**: Switches translation mode to `english-to-code` and `code-to-code`, verifying editor panes and labels update.
- **Test 1.3**: Selects a new language from the 35+ language dropdown and verifies mode/syntax reconfiguration.
- **Test 1.4**: Loads different presets (`rust-lru`, `py-ts-dataclass`, `go-concurrency`, `sql-window`, `nextjs-sse`) and verifies snippet mutation.
- **Test 1.5**: Simulates real-time streaming and verifies latency readout display (`<3000ms`).
- **Test 1.6**: Tests bi-directional line mapping hover events and highlights.
- **Test 1.7**: Verifies clipboard copy action triggers checkmark confirmation.

#### 8.3.2 `src/tests/wispr-git-pr.test.tsx` (GitPrWorkflowDemo Suite)
- **Test 2.1**: Renders PR metadata header (`#142`, branch names, `Open` badge, files changed count).
- **Test 2.2**: Renders AI contextual summary with risk assessment badge and architectural impact flags.
- **Test 2.3**: Switches active files via the file commit selector tab and verifies diff hunk updates.
- **Test 2.4**: Executes Action Trigger 1 (`Accept Suggestion`), verifying the diff hunk mutates with accepted patch.
- **Test 2.5**: Executes Action Trigger 2 (`Generate Test Suite`), verifying navigation to test file and rendered test coverage.
- **Test 2.6**: Executes Action Trigger 3 (`Explain Diff`), verifying plain-English modal summary rendering.
- **Test 2.7**: Executes Action Trigger 4 (`Simulate CI`), verifying multi-step progress animation and checkmark completions.
- **Test 2.8**: Executes Action Trigger 5 (`Approve PR`), verifying PR status badge updates to `Approved` with celebratory indicators.

#### 8.3.3 `src/tests/wispr-benchmark.test.tsx` (BenchmarkExplorer Suite)
- **Test 3.1**: Renders benchmark matrix with all 35+ supported languages and default sorting.
- **Test 3.2**: Filters languages by category tabs (`Systems`, `Web`, `Mobile`, `Data`, `DevOps`, `Functional`).
- **Test 3.3**: Filters languages via real-time search input.
- **Test 3.4**: Tests multi-criteria sorting (Latency ascending, Accuracy descending, Name A-Z).
- **Test 3.5**: Toggles Model Deep-Dive Drawer when clicking a language row, verifying technical model specifications render.

#### 8.3.4 `src/tests/wispr-landing-layout.test.tsx` (Layout & Navigation Suite)
- **Test 4.1**: Renders `WisprNavbar` with floating pill styles, logo, anchor links, and CTA buttons.
- **Test 4.2**: Tests mobile navigation drawer toggle and keyboard focus trap.
- **Test 4.3**: Tests `QuickActionPromptBar` preset chips and input execution callbacks.
- **Test 4.4**: Verifies ARIA landmark presence (`role="banner"`, `role="main"`, `role="contentinfo"`, `role="tablist"`).
- **Test 4.5**: Verifies keyboard navigation and shortcut listeners (`Cmd+K`, `Escape`).

---

### 8.4 End-to-End User Journey Validation Checklists

| Journey # | User Persona | Action Sequence | Success Verification Criteria |
|---|---|---|---|
| **Journey 1: Instant Workbench Exploration** | Staff Engineer | 1. Lands on Hero.<br>2. Clicks `🦀 Rust Borrow` preset chip in Prompt Bar.<br>3. Scrolls to `LivePlayground`.<br>4. Toggles language to `Go`.<br>5. Clicks line 4 in code editor. | • Prompt bar routes to playground.<br>• Playground loads Go snippet.<br>• Line mapping highlights explanation section 2.<br>• Latency counter displays `< 200ms`. |
| **Journey 2: Automated PR Review Inspection** | Tech Lead / Reviewer | 1. Navigates to `GitPrWorkflowDemo`.<br>2. Reads AI Contextual Summary.<br>3. Clicks `tests/auth.test.ts` in file selector.<br>4. Clicks `[ ⚡ Simulate CI ]`.<br>5. Clicks `[ 🟣 Approve PR ]`. | • File diff switches cleanly.<br>• CI simulation checks all 4 steps.<br>• Status badge switches to `Approved`. |
| **Journey 3: Enterprise Benchmark Due Diligence** | VP of Engineering | 1. Navigates to `BenchmarkExplorer`.<br>2. Clicks `[ Systems ]` category pill.<br>3. Sorts by `Accuracy (Highest)`.<br>4. Clicks `Rust` row to open Deep Dive Drawer. | • Matrix filters down to systems languages.<br>• Rust (99.4%) is first row.<br>• Drawer displays Groq Llama 3.3 70B architecture specs. |
| **Journey 4: Full Keyboard & Screen Reader Access** | Accessibility Auditor | 1. Uses `Tab` key to traverse page.<br>2. Presses `Cmd+K` to open prompt input.<br>3. Uses `Arrow Keys` to switch tabs in Playground.<br>4. Presses `Esc` to close drawer. | • Focus ring visible on all active stops.<br>• `aria-live` announces streaming updates.<br>• Zero keyboard traps. |

---

### 8.5 Performance, Memory & Layout Shift (CLS) Guardrails
- **Cumulative Layout Shift (CLS)**: `CLS < 0.02` (Zero layout shifts during streaming, tab switching, or drawer open).
- **First Contentful Paint (FCP)**: `< 0.8s` (Zero blocking 3D canvas scripts).
- **Interaction to Next Paint (INP)**: `< 50ms` on all button clicks and filter selections.
- **Memory Leak Protection**: Complete cleanup in `useEffect` for all streaming timers and event listeners.

---
*Anuvaad Design Review and Formal Specification Blueprint authored for Milestone 1.*

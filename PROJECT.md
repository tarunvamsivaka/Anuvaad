# Project: Anuvaad Redesign & Frontend Implementation

## Architecture
- **Framework**: Next.js 16.3.0 (App Router), React 19.2.4, TypeScript 5 (strict mode), Tailwind CSS v4.
- **Design Metaphor**: Wispr Flow-inspired product-first developer tool. Neutral surface hierarchy (pure white `#ffffff`, subtle slate `#f8fafc`/`#f1f5f9`/`#e2e8f0`, charcoal dark `#0f172a`/`#020617`), precision monospaced code blocks (`JetBrains Mono`), clean sans-serif UI typography (`Inter`), floating pill navigation, quick-action prompt bars, and high-density product previews.
- **Legacy Elimination**: Complete removal/bypass of Three.js WebGL canvas blockers, 6,000-particle vortex workers, Lenis momentum scroll hijacking, warm-cream/editorial serif styling, and decorative narrative fluff.
- **Core Modules**:
  1. `LivePlayground`: Bidirectional Code ↔ English translator, 35+ languages, line mapping, presets, instant feedback.
  2. `GitPrWorkflowDemo`: Simulated GitHub/GitLab PR review widget, diff viewer, inline AI annotations, developer action triggers.
  3. `BenchmarkExplorer`: Matrix filtering 35+ languages, <3s latency metrics, accuracy scoring, category filtering, search, and deep-dive modal.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Review Report | Critical evaluation of prior versions (friction, cognitive load, visual clarity, 3D performance) | M1 | ORIGINAL_REQUEST §R1 |
| 2 | Design Specification Blueprint | Formal layout, component hierarchy, typography, color tokens, elevation & interactive states | M1 | ORIGINAL_REQUEST §R1 |
| 3 | Floating Pill Navigation Bar | Floating glass/neutral navigation bar with anchors, sign-in, CTA, and mobile drawer | M2 | ORIGINAL_REQUEST §R2 |
| 4 | Wispr Hero Showcase | High-impact headline, value prop, fluid pill badges, instant preview container | M2 | ORIGINAL_REQUEST §R2 |
| 5 | Quick-Action Prompt Bar | Floating command bar with preset prompt pills and interactive prompt input | M2 | ORIGINAL_REQUEST §R2 |
| 6 | Enterprise Security Section | Zero code storage, SOC2/HIPAA compliance highlights, privacy by default | M2 | ORIGINAL_REQUEST §R2 |
| 7 | Customer Social Proof | Dense developer testimonials with verified company badges and adoption metrics | M2 | ORIGINAL_REQUEST §R2 |
| 8 | Action Deck & Cohesive Footer | High-conversion CTA deck and semantic sitemap footer | M2 | ORIGINAL_REQUEST §R2 |
| 9 | Zero Legacy 3D Canvas Cleanse | Complete elimination of Three.js WebGL canvas blockers and decorative fluff | M2 | ORIGINAL_REQUEST §R2 |
| 10 | Live Playground - Dual Mode Translation | Code to English, English to Code, and Code to Code translation modes | M3 | ORIGINAL_REQUEST §R3 |
| 11 | Live Playground - 35+ Language Switcher | Multi-language selector covering Web, Systems, Mobile, DevOps, Functional, Data | M3 | ORIGINAL_REQUEST §R3 |
| 12 | Live Playground - Preset Snippet Library | Curated real-world snippets across various languages and algorithms | M3 | ORIGINAL_REQUEST §R3 |
| 13 | Live Playground - Code Editor Surface | High-density editor with line numbers, syntax highlighting, clear, and character counter | M3 | ORIGINAL_REQUEST §R3 |
| 14 | Live Playground - Real-Time Streamer | Simulated/live streaming translation with progress and <3s latency readout | M3 | ORIGINAL_REQUEST §R3 |
| 15 | Live Playground - Interactive Line Mapping | Bi-directional hover line mapping between code and English explanations | M3 | ORIGINAL_REQUEST §R3 |
| 16 | Live Playground - Action Controls | Precision buttons for copy to clipboard, reset, and share permalink | M3 | ORIGINAL_REQUEST §R3 |
| 17 | Git/PR Demo - Simulated PR Shell | Simulated PR review header with branch metadata, status, and files changed | M3 | ORIGINAL_REQUEST §R3 |
| 18 | Git/PR Demo - Automated AI Contextual Summary | Executive summary with architectural impact, risk badge, and breaking change flags | M3 | ORIGINAL_REQUEST §R3 |
| 19 | Git/PR Demo - Multi-File / Commit Selector | Interactive file list switching active diff and annotations | M3 | ORIGINAL_REQUEST §R3 |
| 20 | Git/PR Demo - Inline Diff Viewer | Unified diff with color-coded additions/deletions and expandable AI comments | M3 | ORIGINAL_REQUEST §R3 |
| 21 | Git/PR Demo - Action Trigger: Accept Suggestion | Interactive button applying AI refactor suggestion directly into diff | M3 | ORIGINAL_REQUEST §R3 |
| 22 | Git/PR Demo - Action Trigger: Generate Test Suite | Action button generating unit test suite with coverage badges | M3 | ORIGINAL_REQUEST §R3 |
| 23 | Git/PR Demo - Action Trigger: Explain Diff | Action button rendering plain-English changelog for non-technical stakeholders | M3 | ORIGINAL_REQUEST §R3 |
| 24 | Git/PR Demo - Action Trigger: CI/CD Simulation | Action button running simulated SAST, typecheck, and lint progress | M3 | ORIGINAL_REQUEST §R3 |
| 25 | Git/PR Demo - Action Trigger: Approve PR | Action button triggering approval status badge and confirmation | M3 | ORIGINAL_REQUEST §R3 |
| 26 | Benchmark Explorer - 35+ Language Matrix | Interactive matrix comparing speed, accuracy, and token throughput across 35+ languages | M3 | ORIGINAL_REQUEST §R3 |
| 27 | Benchmark Explorer - Category Filtering & Search | Instant category tabs (All, Systems, Web, Mobile, Data, DevOps) + text search | M3 | ORIGINAL_REQUEST §R3 |
| 28 | Benchmark Explorer - Latency Visualizer | Sub-3s latency comparison visualizer with millisecond timer and progress bar | M3 | ORIGINAL_REQUEST §R3 |
| 29 | Benchmark Explorer - Model Accuracy Score | Accuracy percentages (96.5% - 99.4%) and HumanEval benchmark breakdowns | M3 | ORIGINAL_REQUEST §R3 |
| 30 | Benchmark Explorer - Multi-Criteria Sorting | Sorting by latency (fastest), accuracy (highest), or name (A-Z) | M3 | ORIGINAL_REQUEST §R3 |
| 31 | Benchmark Explorer - Model Deep Dive Drawer | Detailed comparison of Groq Llama 3.3, DeepSeek Coder, Claude 3.5, GPT-4o | M3 | ORIGINAL_REQUEST §R3 |
| 32 | Neutral Surface & Color Architecture | Token hierarchy: pure white `#ffffff`, slate `#f8fafc`, border `#e2e8f0`, dark `#0f172a` | M2 | ORIGINAL_REQUEST §R4 |
| 33 | Precision Code & UI Typography | Clean sans-serif primary font + JetBrains Mono for code blocks | M2 | ORIGINAL_REQUEST §R4 |
| 34 | Keyboard Navigation & ARIA Landmarks | Full keyboard accessibility (Tab, Enter, Space, Esc), ARIA roles, semantic landmarks | M4 | ORIGINAL_REQUEST §R5 |
| 35 | Vitest Component & Unit Test Suite | 100% pass rate across all unit and component test suites (existing 20 + 4 new) | TestTrack / M4 | ORIGINAL_REQUEST §R5 |
| 36 | Zero Error Production Build | `npm run build` exits 0 with zero TypeScript or Lint errors | M4 | ORIGINAL_REQUEST §R5 |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Milestone 1: Docs & Design Specification | Deliver `docs/design_review_and_spec.md` with critical evaluation & formal design blueprint | none | DONE |
| 2 | Milestone 2: Foundation, Layout Architecture & Design System | Rebuild landing page layout from scratch, floating pill nav, hero & prompt bar, enterprise security, social proof, action deck, zero 3D canvas blockers | none | DONE |
| 3 | Milestone 3: Interactive Core Product Modules | Implement Live Interactive Playground, Interactive Git/PR Demo, and Benchmark & Latency Explorer | M2 | DONE |
| 4 | Milestone 4: Integration, Polish & Final Verification | Assemble landing page, ARIA accessibility landmarks, ensure 100% test pass and clean `npm run build` exit 0 | M1, M2, M3 | DONE |
| E2E | E2E & Component Testing Track | Author 4 comprehensive Vitest test suites for new Wispr Flow modules & verify 100% pass rate | M2 | DONE |

---

## Interface Contracts

### LivePlayground Component
```typescript
export interface LivePlaygroundProps {
  initialLanguage?: string;
  initialMode?: 'code-to-english' | 'english-to-code' | 'code-to-code';
  initialCode?: string;
  className?: string;
}
```

### GitPrWorkflowDemo Component
```typescript
export interface GitPrWorkflowDemoProps {
  initialFile?: string;
  className?: string;
}
```

### BenchmarkExplorer Component
```typescript
export interface BenchmarkExplorerProps {
  initialCategory?: string;
  initialSort?: 'latency' | 'accuracy' | 'name';
  className?: string;
}
```

### WisprNavbar & HeroControlBar Components
```typescript
export interface WisprNavbarProps {
  onSignIn?: () => void;
  onGetStarted?: () => void;
}

export interface HeroControlBarProps {
  onSelectPrompt?: (prompt: string, language: string) => void;
}
```

---

## Code Layout
- Documentation: `Anuvaad/frontend/docs/design_review_and_spec.md`
- Landing Page Root: `Anuvaad/frontend/src/app/page.tsx`
- Wispr Flow Components:
  - `Anuvaad/frontend/src/components/landing/wispr/WisprNavbar.tsx`
  - `Anuvaad/frontend/src/components/landing/wispr/HeroControlBar.tsx`
  - `Anuvaad/frontend/src/components/landing/wispr/LivePlayground.tsx`
  - `Anuvaad/frontend/src/components/landing/wispr/GitPrWorkflowDemo.tsx`
  - `Anuvaad/frontend/src/components/landing/wispr/BenchmarkExplorer.tsx`
  - `Anuvaad/frontend/src/components/landing/wispr/EnterpriseSecurity.tsx`
  - `Anuvaad/frontend/src/components/landing/wispr/CustomerProof.tsx`
  - `Anuvaad/frontend/src/components/landing/wispr/ActionDeck.tsx`
  - `Anuvaad/frontend/src/components/landing/wispr/WisprFooter.tsx`
  - `Anuvaad/frontend/src/components/landing/wispr/data/benchmark-data.ts`
  - `Anuvaad/frontend/src/components/landing/wispr/data/pr-demo-data.ts`
  - `Anuvaad/frontend/src/components/landing/wispr/data/playground-presets.ts`
- Tests:
  - `Anuvaad/frontend/src/tests/wispr-playground.test.tsx`
  - `Anuvaad/frontend/src/tests/wispr-git-pr.test.tsx`
  - `Anuvaad/frontend/src/tests/wispr-benchmark.test.tsx`
  - `Anuvaad/frontend/src/tests/wispr-landing-layout.test.tsx`

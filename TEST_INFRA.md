# E2E & Component Test Infra: Anuvaad Wispr Flow Experience

## Test Philosophy
- **Requirement-Driven & Opaque-Box**: Derived directly from `ORIGINAL_REQUEST.md` and `PROJECT.md` feature specifications.
- **Methodology**: Systematic 4-tier testing hierarchy (Feature Coverage, Boundary/Corner Cases, Combinatorial & Interactions, Real-World Workload & Accessibility).
- **Execution Target**: Vitest test runner (`npx vitest run`) with `@testing-library/react` and `@testing-library/jest-dom`.

---

## Feature Inventory & Test Tier Mapping

| # | Feature | Target Test Suite | Tier 1 (Feature) | Tier 2 (Boundary) | Tier 3 (Interaction) | Tier 4 (Scenario/a11y) |
|---|---------|-------------------|:----------------:|:-----------------:|:--------------------:|:----------------------:|
| F1 | Floating Pill Navbar | `wispr-landing-layout.test.tsx` | ✓ (5 tests) | ✓ (5 tests) | ✓ | ✓ |
| F2 | Hero Showcase & Prompt Bar | `wispr-landing-layout.test.tsx` | ✓ (5 tests) | ✓ (5 tests) | ✓ | ✓ |
| F3 | Enterprise Security & Proof | `wispr-landing-layout.test.tsx` | ✓ (5 tests) | ✓ (5 tests) | ✓ | ✓ |
| F4 | Action Deck & Footer | `wispr-landing-layout.test.tsx` | ✓ (5 tests) | ✓ (5 tests) | ✓ | ✓ |
| F5 | Live Playground - Dual Mode | `wispr-playground.test.tsx` | ✓ (5 tests) | ✓ (5 tests) | ✓ | ✓ |
| F6 | Live Playground - 35+ Languages | `wispr-playground.test.tsx` | ✓ (5 tests) | ✓ (5 tests) | ✓ | ✓ |
| F7 | Live Playground - Streaming & Presets | `wispr-playground.test.tsx` | ✓ (5 tests) | ✓ (5 tests) | ✓ | ✓ |
| F8 | Live Playground - Copy/Reset Actions | `wispr-playground.test.tsx` | ✓ (5 tests) | ✓ (5 tests) | ✓ | ✓ |
| F9 | Git/PR Demo - PR Shell & Summary | `wispr-git-pr.test.tsx` | ✓ (5 tests) | ✓ (5 tests) | ✓ | ✓ |
| F10 | Git/PR Demo - File Diff Viewer | `wispr-git-pr.test.tsx` | ✓ (5 tests) | ✓ (5 tests) | ✓ | ✓ |
| F11 | Git/PR Demo - Inline Annotations | `wispr-git-pr.test.tsx` | ✓ (5 tests) | ✓ (5 tests) | ✓ | ✓ |
| F12 | Git/PR Demo - Action Triggers | `wispr-git-pr.test.tsx` | ✓ (5 tests) | ✓ (5 tests) | ✓ | ✓ |
| F13 | Benchmark - 35+ Language Matrix | `wispr-benchmark.test.tsx` | ✓ (5 tests) | ✓ (5 tests) | ✓ | ✓ |
| F14 | Benchmark - Filtering & Search | `wispr-benchmark.test.tsx` | ✓ (5 tests) | ✓ (5 tests) | ✓ | ✓ |
| F15 | Benchmark - Latency & Accuracy | `wispr-benchmark.test.tsx` | ✓ (5 tests) | ✓ (5 tests) | ✓ | ✓ |
| F16 | Benchmark - Sorting & Deep Dive | `wispr-benchmark.test.tsx` | ✓ (5 tests) | ✓ (5 tests) | ✓ | ✓ |

---

## Test Architecture & Directory Layout

### Test Runner Configuration
- Framework: Vitest (`vitest.config.ts` in `Anuvaad/frontend`)
- Setup file: `src/tests/setup.ts` with jest-dom matchers and browser API polyfills (ResizeObserver, IntersectionObserver, window.matchMedia, clipboard)
- Command: `npm test` or `npx vitest run`

### Test Suites Structure
1. `src/tests/wispr-playground.test.tsx`:
   - Tier 1: Rendering of dual editor panes, language selectors, preset buttons, mode toggle pills.
   - Tier 2: Handling empty inputs, very large code snippets, rapid mode toggling, special unicode characters in translations.
   - Tier 3: Selecting a preset updating both code and target explanation; changing source language updating available presets.
   - Tier 4: Full translation simulation workflow (type code -> select language -> trigger translate -> inspect streamed response -> copy to clipboard).

2. `src/tests/wispr-git-pr.test.tsx`:
   - Tier 1: PR header metadata, branch badges, file list, AI summary card with risk badges.
   - Tier 2: Diff line numbering integrity, expanding/collapsing comment threads, switching between files with zero state pollution.
   - Tier 3: Triggering "Accept Suggestion" modifying the active diff; "Generate Tests" displaying generated test cases; "Explain Diff" toggling plain-English modal.
   - Tier 4: Complete PR review lifecycle (review diff -> inspect AI annotation -> trigger CI simulation -> approve PR).

3. `src/tests/wispr-benchmark.test.tsx`:
   - Tier 1: 35+ languages listed in matrix with correct latency (<3s), accuracy scores (96.5%-99.4%), and category badges.
   - Tier 2: Search with zero matching query ("xyz123"), special characters, boundary sorting values.
   - Tier 3: Combining category filter ("Systems") with search query ("Rust") and sorting by latency.
   - Tier 4: Clicking model deep-dive drawer, comparing Groq Llama 3.3 vs DeepSeek Coder vs Claude 3.5, closing drawer via Escape key.

4. `src/tests/wispr-landing-layout.test.tsx`:
   - Tier 1: Presence of floating pill navbar, hero section, interactive prompt bar, enterprise security grid, customer proof cards, action deck, and footer.
   - Tier 2: Mobile responsive drawer toggling, resize behavior, absence of legacy Three.js WebGL canvas elements.
   - Tier 3: Clicking prompt pills in HeroControlBar updating the interactive preview or scrolling to LivePlayground.
   - Tier 4: Keyboard navigation across all interactive landmarks (tab navigation, Enter/Space activation, ARIA landmark audit).

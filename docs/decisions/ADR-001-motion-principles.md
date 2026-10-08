# ADR-001: Animation & Motion Principles

**Date:** October 2026  
**Status:** Accepted

## Context

The initial build used a mix of Framer Motion and inline CSS animations, leading to inconsistent timing, bundle bloat (~65kB from framer-motion), and animations that ignored `prefers-reduced-motion`.

## Decision

All animations use CSS `@keyframes` defined in `src/design/css/animations.css` and triggered via CSS classes or inline `animation` properties. Framer Motion is retained as a dependency but should only be used for scroll-based orchestration where IntersectionObserver + CSS transitions are genuinely insufficient.

**Duration standards:**
- Micro-interactions (button state, icon swap): ≤ 150ms
- UI transitions (panel open/close, tab switch): 200–300ms  
- Scroll-reveal entrances: 500–600ms with spring easing (`cubic-bezier(0.16, 1, 0.3, 1)`)
- Page-level transitions: 350ms
- Ambient / looping animations: 2–4s

**Easing standards:**
- Enters: `cubic-bezier(0.16, 1, 0.3, 1)` (spring-out — fast initial velocity, smooth landing)
- Exits: `cubic-bezier(0.4, 0, 1, 1)` (ease-in — objects accelerate out)
- Looping: `ease-in-out`

**Keyframe guard:**  
All `@keyframes` blocks are wrapped in `@media (prefers-reduced-motion: no-preference)`. The global `globals.css` override (`animation-duration: 0.01ms !important`) is belt-and-suspenders for anything that escapes the media query.

## Consequences

- Eliminated ~65kB of Framer Motion from the critical path bundle
- All animations live in one auditable file (`animations.css`)
- The scroll-reveal system (`sr-fade-up`, `sr-scale-in` etc.) works with IntersectionObserver via a shared `useScrollReveal` hook — no JavaScript animation overhead
- Adding a new animation means: add keyframe in `animations.css`, add CSS class, done

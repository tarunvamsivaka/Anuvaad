# ADR-001: Animation & Motion Principles

**Date:** October 2026
**Status:** Accepted

## Context

The initial build used a mix of Framer Motion and inline CSS animations, leading to inconsistent timing, bundle bloat (~65kB from framer-motion), and animations that ignored `prefers-reduced-motion`.

## Decision

All animations use CSS `@keyframes` defined in `src/design/css/animations.css` and triggered via CSS classes or inline `animation` properties. Framer Motion is retained as a dependency for scroll-based orchestration only where IntersectionObserver + CSS transitions are insufficient.

**Duration standards:**
- Micro-interactions (button state, icon swap): ≤ 150ms
- UI transitions (panel open/close, tab switch): 200–300ms
- Scroll-reveal entrances: 500–600ms with spring easing
- Page-level transitions: 350ms
- Ambient / looping animations: 2–4s

**Easing standards:**
- Enters: `cubic-bezier(0.16, 1, 0.3, 1)` (spring-out)
- Exits: `cubic-bezier(0.4, 0, 1, 1)` (ease-in)
- Looping: `ease-in-out`

## Consequences

- Eliminated ~65kB of Framer Motion from critical path bundle
- All animations are now in one file, making the motion system auditable
- The `prefers-reduced-motion` override in `globals.css` catches anything that escapes the per-keyframe media query wrappers

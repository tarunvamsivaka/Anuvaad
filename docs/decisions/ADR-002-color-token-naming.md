# ADR-002: Color Token Naming & Tiered System

**Date:** October 2026  
**Status:** Accepted

## Context

The first iteration used raw Tailwind utilities directly in components (`bg-slate-800 border border-slate-700 text-slate-300`). This made global color changes require grep-and-replace across 40+ files and made it impossible to reason about the color system without reading every component.

## Decision

Seven-tier token system in `src/design/tokens/color.css`:

| Tier | Purpose | Examples |
|------|---------|---------|
| 1 — Primitives | Never used in components directly | `--amber-500`, `--neutral-800` |
| 2 — Surfaces | Theme-aware backgrounds | `--surface-base`, `--surface-low`, `--surface-mid`, `--surface-high` |
| 3 — Borders | Theme-aware dividers | `--border-faint`, `--border-subtle`, `--border-default`, `--border-medium` |
| 4 — Text | Semantic text roles | `--text-primary`, `--text-secondary`, `--text-muted`, `--text-amber` |
| 5 — Glows | Ambient shadows | `--glow-xs/sm/md/lg` |
| 6 — Status | Semantic state colors | `--status-success`, `--status-warning`, `--status-danger` |
| 7 — Language identity | Per-language hue chips | `--lang-python`, `--lang-rust`, `--lang-typescript` |

**Naming rule:** Tokens are named by semantic role, not by appearance.

- ✅ `--surface-high` not `--white-card`
- ✅ `--border-subtle` not `--gray-10`
- ✅ `--lang-python` not `--color-blue-for-python`

## Consequences

- Theme switching (light/dark) requires changing only the `.dark {}` block in `color.css`
- Language badge colors have a single canonical source
- New language support = add one token pair (`--lang-X` + `--lang-X-bg`) in one file
- Designers can audit the full color system by reading a single file

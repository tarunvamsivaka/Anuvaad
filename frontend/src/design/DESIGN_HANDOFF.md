# Anuvaad Design Handoff & Responsive Specifications

This document provides complete design handoff specifications for design teams utilizing **Figma**, **Sketch**, or **Adobe XD**, alongside engineering implementation references.

---

## 1. Exportable Assets & Token Import

- **Token Package File**: [`figma-tokens.json`](./tokens/figma-tokens.json)
- **Format**: W3C Design Tokens Community Group (DTCG) standard.
- **Figma Import**:
  1. Open Figma and launch the **Tokens Studio for Figma** plugin.
  2. Click **Load from JSON** and select `figma-tokens.json`.
  3. All styles (Color, Typography, Spacing, Radius, Shadow) will automatically synchronize into Figma Local Variables and Styles.
- **Sketch / Adobe XD Import**:
  - Compatible with standard design token converters (e.g. Style Dictionary) for Sketch palettes and XD Creative Cloud libraries.

---

## 2. Responsive Breakpoint Specifications

| Viewport | Target Resolution | Container Max-Width | Grid System | Sidebar Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **Desktop (Default)** | 1440px &times; 900px+ | `1400px` | 12-column grid, 24px gutter | User-controlled 64px / 240px collapsible rail |
| **Laptop / Tablet** | 768px - 1024px | Fluid (`100%`) | 8-column grid, 16px gutter | Collapsible rail; labels remain user-controlled |
| **Mobile** | 375px - 414px | Fluid (`100%`) | 4-column grid, 12px gutter | Hidden; slide-out drawer via top-left hamburger |

### Responsive Layout Adaptations
1. **Dashboard Overview (`/dashboard`)**:
   - **Desktop**: 4 KPI stat cards in row (`grid-cols-4`), 8-col recent work + 4-col 7-day activity & quota ring.
   - **Tablet**: 2&times;2 KPI card matrix (`grid-cols-2`), stacked activity & quota below recent translations.
   - **Mobile**: Single-column vertical stream (`grid-cols-1`). Quota ring centers horizontally.
2. **Workspace Management (`/dashboard/workspace`)**:
   - **Desktop**: 7-column form + 5-column showcase preview box side-by-side.
   - **Mobile / Tablet**: Form stacks on top; showcase graphic renders beneath with reduced height (min 200px).
3. **Translation Studio (`/dashboard/translate`)**:
   - **Desktop**: Split 50/50 dual-pane IDE studio with synchronized scroll.
   - **Mobile**: Tabbed toggle switches between input and output; wide screens show both panes together.
4. **Billing & Licenses (`/dashboard/billing`)**:
   - **Desktop**: 2-column feature checklist for Pro Tier.
   - **Mobile**: 1-column vertical checklist with full-width action button.
5. **System Settings (`/dashboard/settings`)**:
   - **Desktop**: 8-column credentials & profile + 4-column appearance & danger zone.
   - **Mobile**: Single-column vertical stack with full-width inputs.

---

## 3. Accessibility & Contrast Verification

Treat contrast as a measured acceptance check, not a token-level promise. Verify each foreground/background pairing in both themes, including muted text, badges, focus rings, and disabled states. Normal text must reach 4.5:1 and large text or meaningful UI graphics 3:1. Keep keyboard focus visible, controls labeled, touch targets usable, and reduced-motion behavior intact.

---

## 4. Component Specification Checklist

- [x] **Primary Buttons**: Height 44px (touch accessible), Radius 12px, Background `#F59E0B`, Text `#020617` Bold, Box-shadow `0 0 12px rgba(245, 158, 11, 0.20)`.
- [x] **Form Inputs**: Height 44px (desktop) / 48px (mobile), Radius 12px, Border `#CBD5E1` (light) / `#1E293B` (dark), Active Focus Ring `2px solid #F59E0B`.
- [x] **Card Containers**: Radius 16px - 24px, 1px subtle border, gentle surface elevation.
- [x] **Sidebar Rail**: User-controlled collapsible rail; no hover-only navigation or content overlap.

---

## 5. Anuvaad Art Direction & Content Rules

- Use warm paper as a restrained editorial accent, deep ink for code surfaces, and amber for focused actions. Keep the interface quiet enough for code to remain the visual priority.
- Use DM Sans for display headings, Inter for interface copy, and JetBrains Mono for code and compact technical labels. Do not use serif styling for product copy.
- Prefer specific labels such as “Translation studio” and “Audit receipt” over simulated system telemetry, invented build versions, or cost slogans.
- Mark static playgrounds and PR flows as examples. Do not present simulated controls as live integration behavior.
- Publish customer quotes, adoption metrics, latency, accuracy, uptime, or certifications only when a reviewer can trace each claim to evidence and a date.
- Use brief motion for feedback, preserve `prefers-reduced-motion`, and do not hide keyboard-focused controls.

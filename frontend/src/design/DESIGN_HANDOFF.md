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
| **Desktop (Default)** | 1440px &times; 900px+ | `1400px` | 12-column grid, 24px gutter | Fixed 60px rail; expands to 224px on hover |
| **Laptop / Tablet** | 768px - 1024px | Fluid (`100%`) | 8-column grid, 16px gutter | Fixed 60px rail; icon-only |
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
   - **Mobile**: Tabbed toggle switching between "Input Code" and "AI Output" to prevent horizontal squishing.
4. **Billing & Licenses (`/dashboard/billing`)**:
   - **Desktop**: 2-column feature checklist for Pro Tier.
   - **Mobile**: 1-column vertical checklist with full-width action button.
5. **System Settings (`/dashboard/settings`)**:
   - **Desktop**: 8-column credentials & profile + 4-column appearance & danger zone.
   - **Mobile**: Single-column vertical stack with full-width inputs.

---

## 3. WCAG 2.1 AA Accessibility & Contrast Matrix

All text and interactive surfaces strictly meet or exceed the **4.5:1** contrast ratio requirement for normal text and **3:1** for large text / graphical UI components.

| Component / Token | Foreground (Hex) | Background (Hex) | Contrast Ratio | WCAG Compliance |
| :--- | :--- | :--- | :--- | :--- |
| **Light Mode Headers** (`text-slate-900`) | `#0f172a` | `#ffffff` | **18.7:1** | **AAA Pass** |
| **Light Mode Body** (`text-slate-700`) | `#334155` | `#ffffff` | **9.6:1** | **AAA Pass** |
| **Light Mode Muted** (`text-slate-500`) | `#64748b` | `#ffffff` | **4.6:1** | **AA Pass** |
| **Light Mode Amber Accent** (`text-amber-700`) | `#b45309` | `#ffffff` | **4.8:1** | **AA Pass** |
| **Primary CTA Button** (Amber-500) | `#020617` (Slate-950) | `#f59e0b` (Amber-500) | **10.5:1** | **AAA Pass** |
| **Dark Mode Headers** (`text-slate-50`) | `#f8fafc` | `#060a14` (Obsidian) | **20.1:1** | **AAA Pass** |
| **Dark Mode Secondary** (`text-slate-300`) | `#cbd5e1` | `#0a0f1d` (Card) | **13.2:1** | **AAA Pass** |
| **Dark Mode Amber Accent** (`text-amber-400`) | `#fbbf24` | `#0a0f1d` (Card) | **11.4:1** | **AAA Pass** |
| **Status Success Badge** | `#10b981` | `#060a14` | **7.8:1** | **AAA Pass** |

---

## 4. Component Specification Checklist

- [x] **Primary Buttons**: Height 44px (touch accessible), Radius 12px, Background `#F59E0B`, Text `#020617` Bold, Box-shadow `0 0 12px rgba(245, 158, 11, 0.20)`.
- [x] **Form Inputs**: Height 44px (desktop) / 48px (mobile), Radius 12px, Border `#CBD5E1` (light) / `#1E293B` (dark), Active Focus Ring `2px solid #F59E0B`.
- [x] **Card Containers**: Radius 16px - 24px, 1px subtle border, gentle surface elevation.
- [x] **Sidebar Rail**: 60px default rail with 24px Lucide icons centered; hover expansion to 224px with 50ms transition delay on typography.

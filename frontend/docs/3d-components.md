# Anuvaad 3D WebGL & Scroll Experience Documentation

This document provides a comprehensive architectural specification, component API reference, design token binding system, motion safety matrix, and verification runbook for the Anuvaad Awwwards-level 3D WebGL landing page experience.

---

## 1. System Overview & Awwwards-Level 3D Architecture

The Anuvaad landing page is engineered as a **decoupled hybrid WebGL + 3D DOM experience**. It marries high-performance hardware-accelerated 3D graphics with semantic, accessible DOM typography and interactive overlays.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   Browser Viewport                                     │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                 Lenis Smooth Scroll                                    │
│             (Normalized momentum physics, touch & wheel velocity tracking)             │
└───────────────────────────┬────────────────────────────────┬───────────────────────────┘
                            │                                │
                            ▼                                ▼
┌──────────────────────────────────────────────┐ ┌───────────────────────────────────────┐
│                 GSAP Ticker                  │ │          GSAP ScrollTrigger           │
│   Synchronized RAF loop: lenis.raf(t*1000)   │ │  Active section detection & thresholds│
│           lagSmoothing disabled (0)          │ │  Landmark triggers: top 60% / bot 40% │
└───────────────────────────┬──────────────────┘ └───────────────────┬───────────────────┘
                            │                                        │
                            ▼                                        ▼
┌──────────────────────────────────────────────┐ ┌───────────────────────────────────────┐
│     Single Fixed WebGL Background Canvas     │ │        3D DOM Section Overlays        │
│   (fixed inset-0 -z-10, OffscreenCanvas)     │ │   Hardware-accelerated CSS 3D:        │
│   - Three.js WebGLSceneManager               │ │   - Hero Typographic 3D Reveal        │
│   - Dedicated Web Worker (webgl.worker.ts)   │ │   - Bento Cards 3D Rise & Hover Tilt  │
│   - 7-State Morphing Particle Vortex System  │ │   - Positioning & Trust Dark Vault    │
│   - Dynamic Warm Cream <-> Dark Room Lerp    │ │   - Testimonials 3D Depth Stack       │
│   - Proximity Interactive Mouse Physics      │ │   - FAQ 3D Accordion Plane Fold       │
│   - Responsive Quality Tiers (1.5k–6k pts)   │ │   - Stats 3D Slot-Machine Reel Spin   │
│                                              │ │   - Footer 3D Floor Elevation Rise    │
└──────────────────────────────────────────────┘ └───────────────────────────────────────┘
```

### Architectural Tenets
1. **Single Fixed Background Canvas**: A single WebGL canvas element mounted in `fixed inset-0 -z-10` renders continuous particle vortex and camera effects behind all DOM sections, avoiding expensive multi-canvas overhead.
2. **Main Thread Offloading**: The WebGL engine runs inside a dedicated Web Worker via `OffscreenCanvas.transferControlToOffscreen()`. User scroll events, mouse coordinate deltas, and resize payloads pass to the worker asynchronously via lightweight message buffers.
3. **Decoupled 3D DOM Overlays**: Content remains selectable, SEO-crawlable, and accessible in the DOM. Cards, accordions, reels, and typography transform in 3D coordinate space (`perspective(1000px)`, `rotateX`, `rotateY`, `translateZ`) synchronized with the scroll driver.
4. **Motion Safety First**: Users with `prefers-reduced-motion: reduce` are routed at the component tree root to the 2D flat-minimalism editorial layout (`LandingV1Page`), completely skipping WebGL canvas allocation, Web Worker threads, and Lenis smooth scroll listeners.

---

## 2. Core Infrastructure

### 2.1 Lenis Smooth Scroll Driver (`LenisScrollProvider.tsx`)

The `LenisScrollProvider` (`src/components/landing/LenisScrollProvider.tsx`) wraps the application and supplies normalized momentum scroll metrics through React context (`useLenis()`).

- **Instance Configuration**:
  ```ts
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Exponential decay curve
    orientation: "vertical",
    gestureOrientation: "vertical",
    smoothWheel: true,
    wheelMultiplier: 1.0,
    touchMultiplier: 2.0,
    infinite: false,
  });
  ```
- **Ticker Synchronization**:
  GSAP's ticker supplies delta time in **seconds**, whereas `Lenis.raf()` expects **milliseconds**. The provider explicitly scales the ticker input:
  ```ts
  const tickerCallback = (time: number) => {
    lenis.raf(time * 1000);
  };
  gsap.ticker.add(tickerCallback);
  gsap.ticker.lagSmoothing(0); // Eliminates hitching after idle or tab switching
  ```
- **Context Contract (`LenisContextValue`)**:
  ```ts
  export interface LenisContextValue {
    lenis: Lenis | null;
    scrollProgress: number; // 0.0 to 1.0
    scrollY: number;        // Absolute pixels scrolled
    velocity: number;      // Instantaneous scroll velocity
    activeSection: string; // Landmark section identifier
    isReducedMotion: boolean;
    scrollTo: (target: string | HTMLElement | number, options?: Record<string, unknown>) => void;
  }
  ```

### 2.2 WebGL Engine & Worker (`webgl.worker.ts` & `WebGLSceneManager.ts`)

The WebGL pipeline executes in `src/features/landing/_canvas/WebGLSceneManager.ts` and can run on both worker threads and the main thread.

- **Worker Bridge (`webgl.worker.ts`)**:
  Receives `INIT` (with offscreen canvas, dimensions, pixel ratio), `SCROLL` (normalized progress $0.0 \to 1.0$), `MOUSE` ($x, y$ screen coordinates), `RESIZE`, and `DESTROY` messages.
- **Main Thread Fallback (`WebGLCanvas.tsx`)**:
  If `HTMLCanvasElement.prototype.transferControlToOffscreen` is not supported (e.g. older iOS WebKit or restricted WebView), `WebGLCanvas.tsx` dynamically instantiates `WebGLSceneManager` directly on the main thread without failing.
- **Adaptive Performance Tiers**:
  ```ts
  if (width < 768) {
    // Mobile: 1,500 particles, locked DPR 1.0
    return { particleCount: 1500, dpr: 1 };
  } else if (width < 1024) {
    // Tablet: 3,000 particles, max DPR 1.5
    return { particleCount: 3000, dpr: Math.min(deviceDpr, 1.5) };
  } else {
    // Desktop: 6,000 particles, max DPR 2.0
    return { particleCount: 6000, dpr: Math.min(deviceDpr, 2.0) };
  }
  ```

- **Particle State Morphs (7 Coordinate Buffers)**:
  Particles continuously lerp between pre-computed coordinate topologies based on scroll progress:
  1. `vortexScrollPos` ($0.000 \le p < 0.138$): Dual-structure spiral helix ($r = 5 + 3\sin(0.04i) + 1.2\cos(0.1i)$) combined with horizontal code-line grids.
  2. `chaosPos` ($0.138 \le p < 0.259$): High-entropy stochastic 3D distribution ($[-18, 18] \times [-12, 12] \times [-15, 15]$).
  3. `discoveryPos` ($0.259 \le p < 0.379$): Three spherical clusters representing discovered repository modules.
  4. `mappingPos` ($0.379 \le p < 0.500$): Tree-graph hierarchy modeling file and dependency AST structures.
  5. `translationPos` ($0.500 \le p < 0.621$): Split dual columns with flowing cubic Bézier translation trajectories.
  6. `spherePos` / `understandingPos` ($0.621 \le p < 0.948$): Calm sinusoidal wave plane mesh ($\sin(0.4x) \cdot 3.5$).
  7. `clarityPos` ($p \ge 0.948$): Concentric orbital planar rings representing complete architecture clarity.

- **Dynamic Theme Color Lerping**:
  Background clear color and exponential fog (`THREE.FogExp2(0xf5f3ee, 0.015)`) lerp smoothly every frame:
  $$\text{targetColor} = \begin{cases} \#0e1117 \text{ (Deep Dark Room)} & \text{if } 0.42 \le \text{scrollVal} \le 0.72 \\ \#f5f3ee \text{ (Warm Cream)} & \text{otherwise} \end{cases}$$

### 2.3 Scene Orchestration (`SceneOrchestrator.tsx`)

`SceneOrchestrator` (`src/features/landing/_orchestrator/SceneOrchestrator.tsx`) coordinates scroll weights and global progress across sequential scenes:

| Scene ID | Title | Scroll Weight | Milestone | DOM Anchor ID |
|---|---|---|---|---|
| `repository-discovery` | Repository Discovery | 1.0 | M1/M2 | `#story` |
| `code-confusion` | Code Confusion | 2.0 | M2 | — |
| `recognition` | Recognition | 1.5 | M2 | — |
| `understanding` | Understanding | 2.0 | M3 | `#demo` |
| `repository-intelligence`| Repository Intelligence | 1.5 | M3 | — |
| `english-modification` | English Modification | 2.0 | M3 | — |
| `code-updates` | Code Updates | 2.0 | M3 | — |
| `future-vision` | Future Vision | 1.0 | M4 | — |
| `final-cta` | Final CTA | 1.5 | M4 | `#cta` |

---

## 3. 3D Scene Components Specification

### 3.1 Hero Section (`src/components/landing/hero.tsx`)

- **Typographic 3D Reveal**:
  The main headline rendered in *Playfair Display* translates and rotates along a 3D perspective vector on initial scroll:
  $$\text{transform} = \text{translate3d}(0\text{px}, p_{\text{hero}} \times -50\text{px}, p_{\text{hero}} \times -100\text{px}) \cdot \text{rotateX}(p_{\text{hero}} \times 15^\circ)$$
  $$\text{opacity} = \max(0, 1 - p_{\text{hero}} \times 1.2), \quad p_{\text{hero}} = \min(\text{scrollProgress} / 0.15, 1.0)$$
- **Line-Art Code Scroll Illustration**:
  Translates on perspective axis: $\text{perspective}(1000\text{px}) \cdot \text{rotateY}(p_{\text{hero}} \times -20^\circ) \cdot \text{translateZ}(p_{\text{hero}} \times 50\text{px})$.
- **Particle Vortex Camera Shift**:
  Camera position moves along Z from $30 \to 18$ and Y from $0 \to -2.5$ while looking at $(0, 0, 0)$.
- **Interactive Live Demo Panel**:
  - Deep Dark Room container (`#0e1117`) with 3D tilt: $\text{rotateX}(p_{\text{hero}} \times 12^\circ) \cdot \text{translateZ}(p_{\text{hero}} \times -40\text{px})$.
  - Language tabs for Python, JavaScript, TypeScript, Go, Rust, Java.
  - Keyboard accelerator: `Ctrl+Enter` / `Cmd+Enter` executes live translation via `/api/demo/translate`.
  - Rate limiting: Gracefully handles HTTP 429 quota responses and informs the user of remaining daily trials.

### 3.2 Features Bento Section (`src/components/landing/features.tsx`)

- **Bento 3D Staggered Entrance**:
  GSAP `ScrollTrigger` at `top 75%` entrance:
  $$\text{from: } \{ y: 70\text{px}, z: -140\text{px}, \text{rotateX}: 20^\circ, \text{rotateY}: \pm 7^\circ, \text{scale}: 0.90, \text{opacity}: 0 \}$$
  $$\text{to: } \{ y: 0, z: 0, \text{rotateX}: 0^\circ, \text{rotateY}: 0^\circ, \text{scale}: 1.0, \text{opacity}: 1, \text{stagger}: 0.06 \}$$
- **Real-Time Pointer Hover Tilt**:
  Tracks pointer coordinates $(x, y)$ relative to card center $(c_x, c_y)$:
  $$n_x = \frac{x - c_x}{w/2}, \quad n_y = \frac{y - c_y}{h/2}$$
  $$\text{rotateX} = -n_y \times 10^\circ, \quad \text{rotateY} = n_x \times 10^\circ, \quad z = 24\text{px}, \quad \text{scale} = 1.02$$
- **Amber Sheen Spotlight Layer**:
  $$\text{sheen.background} = \text{radial-gradient}(350\text{px circle at } (x_{\text{rel}}, y_{\text{rel}}), \text{rgba}(200, 134, 10, 0.09), \text{transparent } 80\%)$$

### 3.3 Positioning & Trust Sections

#### Positioning (`src/components/landing/Positioning.tsx`)
- **3D Typography Blur Resolve**:
  Words transition from `{ opacity: 0, y: 40, z: -60, rotateX: 20, filter: "blur(6px)" }` to clean focus.
- **Concept Cards 3D Fan Unfold**:
  Three concept cards ("Understanding", "Collaboration", "Knowledge Transfer") unfold with asymmetric angles:
  $$\text{rotateY} = \begin{cases} -12^\circ & \text{Card 1} \\ 0^\circ & \text{Card 2} \\ +12^\circ & \text{Card 3} \end{cases}, \quad z: -100\text{px} \to 0\text{px}$$
- **Interactive Pointer Sheen**: Radial amber highlight ($280\text{px}$ circle) tracks mouse movement across cards.

#### Trust (`src/components/landing/Trust.tsx`)
- **Monolithic 3D Dark Vault Door Unfold**:
  Monolithic dark panel (`#0d1117` to `#111827`) unfolds from top-hinged 3D plane:
  $$\text{from: } \{ \text{rotateX}: 20^\circ, z: -120\text{px}, \text{scale}: 0.92, \text{transformOrigin}: \text{"center top"} \} \to \{ \text{rotateX}: 0^\circ, z: 0, \text{scale}: 1 \}$$
- **Pillar Cards 3D Fan-Out**:
  Three pillar cards ("Zero Code Storage", "Instant Processing", "Privacy by Default") fan out ($\text{rotateY}: -10^\circ, 0^\circ, +10^\circ$).
- **SVG Circular Progress Ring Animation**:
  Circle stroke dashoffset interpolates from $283 \to 0$ over 1.2s on trigger.
- **Infrastructure Strip**:
  Renders partners (Groq, DeepSeek, Supabase, Vercel, Next.js) with 3D elevation.

### 3.4 Testimonials 3D Depth Stack Carousel (`src/components/landing/testimonials.tsx`)

- **Cylindrical 3D Depth Layer Math**:
  Cards are arranged in a 3D cylindrical stage based on offset $\delta = (i - \text{activeIndex} + N) \pmod N$:

| Relative Offset ($\delta$) | 3D Transform | Opacity | Blur | Z-Index | Pointer Events |
|---|---|---|---|---|---|
| **$\delta = 0$ (Active Front)** | `translate3d(dragOffset * 0.4px, 0px, 40px) rotateY(tiltX) rotateX(tiltY) scale(1.0)` | `1.0` | `0px` | `30` | `auto` |
| **$\delta = +1$ (Right Mid)** | `translate3d(320px, 12px, -60px) rotateY(-14deg) scale(0.86)` | `0.75` | `2px` | `20` | `auto` (clickable) |
| **$\delta = -1$ (Left Mid)** | `translate3d(-320px, 12px, -60px) rotateY(14deg) scale(0.86)` | `0.75` | `2px` | `20` | `auto` (clickable) |
| **$\delta = +2$ (Right Outer)** | `translate3d(540px, 24px, -150px) rotateY(-24deg) scale(0.72)` | `0.35` | `5px` | `10` | `auto` (clickable) |
| **$\delta = -2$ (Left Outer)** | `translate3d(-540px, 24px, -150px) rotateY(24deg) scale(0.72)` | `0.35` | `5px` | `10` | `auto` (clickable) |
| **$|\delta| \ge 3$ (Hidden)** | `translate3d(±720px, 36px, -260px) rotateY(∓35deg) scale(0.55)` | `0.0` | `8px` | `0` | `none` |

- **Multi-Modal Interaction**:
  - **Pointer Drag & Flick**: `onPointerDown`/`Move`/`Up` captures gestures with $\pm 45\text{px}$ flick threshold.
  - **Keyboard Navigation**: Left and right arrow key navigation when focused (`tabIndex={0}`).
  - **Auto-Rotation**: 5.5-second rotation timer pauses automatically on hover.
  - **Accessibility**: Full ARIA roles (`role="region"`, `aria-roledescription="carousel"`, `aria-label`).

### 3.5 FAQ 3D Accordion & Stats 3D Slot-Machine

#### FAQ (`src/components/landing/faq.tsx`)
- **3D Top-Hinged Plane Fold**:
  $$\text{Closed: } \text{perspective}(1000\text{px}) \cdot \text{rotateX}(-18^\circ) \cdot \text{scale}(0.96) \cdot \text{translateZ}(-8\text{px}), \quad \text{maxHeight}: 0\text{px}, \quad \text{opacity}: 0$$
  $$\text{Open: } \text{perspective}(1000\text{px}) \cdot \text{rotateX}(0^\circ) \cdot \text{scale}(1.0) \cdot \text{translateZ}(0\text{px}), \quad \text{maxHeight}: 500\text{px}, \quad \text{opacity}: 1$$
  Easing: `cubic-bezier(0.16, 1, 0.3, 1)` over 450ms with `transformOrigin: "top center"`.
- **Plus Icon 3D Rotation**: Rotates $45^\circ$ with amber glow (`#c8860a`) on open.

#### Stats Banner (`src/components/landing/StatsBanner.tsx`)
- **Slot-Machine 3D Reel Spin**:
  Stat items rotate along their Y-axis on entrance:
  $$\text{from: } \{ \text{rotateY}: 720^\circ, z: -60\text{px}, \text{scale}: 0.85, \text{opacity}: 0 \} \to \{ \text{rotateY}: 0^\circ, z: 0, \text{scale}: 1, \text{opacity}: 1 \}$$
  Duration: 1.2s with `power4.out` easing.
- **Synchronized Count-Up Interpolator**:
  Numeric values count up from 0 to target using `easeOutCubic` over 1,600ms. Supports live counts via `LiveCounter`.

### 3.6 Footer Section (`src/components/landing/footer.tsx`)

- **3D Floor Elevation Rise**:
  The Deep Dark Room footer (`#0e1117`) elevates as the viewport reaches the bottom:
  $$\{ y: 70\text{px}, z: -80\text{px}, \text{rotateX}: 14^\circ, \text{scale}: 0.95 \} \to \{ y: 0, z: 0, \text{rotateX}: 0, \text{scale}: 1 \}$$
- **Particle Opacity Attenuation**:
  When $\text{scrollProgress} \ge 0.88$, WebGL particle opacity smoothly attenuates from $0.70 \to 0.25$ to maximize contrast for footer navigation links.

---

## 4. Design System Token Binding

| Design Token | Hex / Value | CSS Variable / Tailwind | 3D Usage & Application |
|---|---|---|---|
| **Warm Cream Canvas** | `#f5f3ee` / `#f5f3ef` | `--surface-base` / `bg-[#f5f3ee]` | Default WebGL clear color, fog background, primary page backdrop |
| **Deep Dark Room** | `#0e1117` / `#0d1117` | `--surface-dark` / `bg-[#0e1117]` | Clear color during Trust/Dark panels & Footer scene |
| **Amber Accent** | `#c8860a` | `--accent-amber` / `text-[#c8860a]` | Headline italic highlights, particle bursts, hover borders, CTA buttons |
| **Deep Teal** | `#034f46` | `--accent-teal` / `text-[#034f46]` | Secondary particle accents, line art strokes, test badges |
| **Ink Borders** | `rgba(26,18,8,0.09)` | `border-[rgba(26,18,8,0.09)]` | DOM overlay card borders (light theme) |
| **Dark Ink Borders**| `rgba(255,255,255,0.08)`| `border-white/08` | Dark vault panel borders, footer dividers |
| **Editorial Serif** | `Playfair Display` | `var(--font-playfair)` | Display typography, 3D headlines, quote marks, translation output |
| **Modern Sans** | `Inter` | `var(--font-sans)` | UI labels, body copy, eyebrow pills, metrics labels |
| **Technical Mono** | `JetBrains Mono` | `font-mono` | Code snippets, terminal tabs, live counter timestamps |

---

## 5. Motion Safety & Fallback Architecture

Anuvaad implements a **dual-tier fallback architecture** to respect user preferences and ensure universal accessibility:

```
                                 User Device / Browser
                                           │
                       prefers-reduced-motion: reduce?
                                    ├── YES ──► Route to <LandingV1Page />
                                    │           (2D Flat Minimalism, No WebGL Canvas,
                                    │            No Lenis smooth scroll, native scroll)
                                    └── NO  ──► Render <LandingExperience />
                                                (3D WebGL Canvas Worker + Lenis +
                                                 3D DOM Overlays)
                                                     │
                                            WebGL2 Context Available?
                                                 ├── YES ──► OffscreenCanvas Worker
                                                 └── NO  ──► Main-Thread WebGL / Static Fallback
```

### 5.1 Tree-Level Fallback (`src/components/motion/ReducedMotion.tsx`)
```tsx
export function LandingExperience() {
  return (
    <ReducedMotion fallback={<LandingV1Page />}>
      <LenisScrollProvider>
        {/* Full 3D WebGL & Scene Orchestrator Experience */}
      </LenisScrollProvider>
    </ReducedMotion>
  );
}
```

### 5.2 Component-Level Safety (`useMotionSafe()`)
Components query `useMotionSafe()`. When motion is restricted, GSAP timelines gracefully fall back to 2D opacity/translation ramps:
```ts
if (isReducedMotion) {
  gsap.fromTo(cards, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6 });
}
```

---

## 6. Dependency Roster

| Package | Version | License | Justification & Role |
|---|---|---|---|
| `three` | `^0.184.0` | MIT | WebGL scene graph, buffer geometries, camera math, FogExp2 |
| `@types/three` | `^0.184.1` | MIT | TypeScript type safety for Three.js objects |
| `lenis` | `^1.3.26` | MIT | Normalized momentum smooth scroll driver |
| `gsap` | `^3.15.0` | GSAP Standard | ScrollTrigger orchestration & 3D transform timelines |
| `framer-motion` | `^12.42.0` | MIT | Modal and layout transitions |
| `lucide-react` | `^1.24.0` | ISC | Lightweight accessible icons |

---

## 7. Testing & Build Verification Runbook

### 7.1 Running Vitest Test Suite
Execute the full Vitest suite to verify all unit, component, adversarial, and 3D scene tests:
```bash
cd C:\Users\tarun\Anuvaad\Anuvaad\frontend
npx vitest run
```
Expected output: All test files pass with 0 failures.

### 7.2 Running Next.js Production Build
Compile the application bundle with full TypeScript and ESLint type checking:
```bash
cd C:\Users\tarun\Anuvaad\Anuvaad\frontend
npm run build
```
Expected output: Clean build completed with exit code 0 (`✓ Generating static pages`).

### 7.3 Local Server Inspection
Start the local server to visually test 3D scene interactions:
```bash
npm run start
```
Open `http://localhost:3000` to inspect:
- Hero 3D typographic reveal & code-scroll particle vortex
- Features Bento 3D cards tilt & cursor sheen
- Trust dark room panel 3D unfold & pillar fan-out
- Testimonials 3D depth stack carousel (drag, arrow keys, auto-rotation)
- FAQ 3D accordion fold & Stats 3D slot-machine count-up
- Footer 3D elevation rise & particle attenuation

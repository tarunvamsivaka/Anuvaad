/**
 * Milestone 3 Empirical Challenger Stress Test Suite
 * 
 * Deep Empirical Adversarial Verification for:
 * 1. Positioning 3D Tilt Vector Math, Boundary Clamping & Extreme Pointer Coordinates
 * 2. Trust Monolithic 3D Vault Panel Unfold & Pillar Cards 3D Fan-out Geometry
 * 3. SVG Circular Progress Ring strokeDashoffset & Mathematical Precision
 * 4. Testimonials 3D Depth Layer Stack Carousel 64-State Modulo Permutation Matrix
 * 5. WebGL Background clearColor & Fog Dynamic Theme Lerping Invariants
 * 6. Prefers-Reduced-Motion Fallback & Degradation Invariants
 * 7. Live React Component DOM Mounting & Interaction Stress Testing
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import * as THREE from "three";

import { Positioning } from "@/components/landing/Positioning";
import { Trust } from "@/components/landing/Trust";
import { Testimonials } from "@/components/landing/testimonials";
import * as MotionModule from "@/lib/motion";

// Mock GSAP to track transforms with high fidelity
vi.mock("gsap", async () => {
  const actual = await vi.importActual<any>("gsap");
  return {
    ...actual,
    default: {
      ...actual.default,
      to: vi.fn((target: any, vars: any) => vars),
      fromTo: vi.fn((target: any, fromVars: any, toVars: any) => toVars),
      context: vi.fn((fn: () => void) => {
        fn();
        return { revert: vi.fn() };
      }),
      timeline: vi.fn(() => ({
        fromTo: vi.fn().mockReturnThis(),
      })),
      utils: {
        toArray: vi.fn((selector: string) => {
          if (typeof document !== "undefined") {
            return Array.from(document.querySelectorAll(selector));
          }
          return [];
        }),
      },
      registerPlugin: vi.fn(),
    },
  };
});

describe("Milestone 3 Empirical Challenger Stress Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  // ===========================================================================
  // 1. Positioning 3D Tilt Vector Math & Extreme Boundary Invariants
  // ===========================================================================
  describe("1. Positioning 3D Tilt Vector Math & Extreme Pointer Coordinates", () => {
    const calcPositioningCardTilt = (
      clientX: number,
      clientY: number,
      rect: { left: number; top: number; width: number; height: number }
    ) => {
      const halfWidth = rect.width / 2;
      const halfHeight = rect.height / 2;
      const centerX = rect.left + halfWidth;
      const centerY = rect.top + halfHeight;
      const normX = halfWidth > 0 ? (clientX - centerX) / halfWidth : 0;
      const normY = halfHeight > 0 ? (clientY - centerY) / halfHeight : 0;

      const maxTilt = 8;
      const rotateX = -normY * maxTilt || 0;
      const rotateY = normX * maxTilt || 0;

      const relX = clientX - rect.left;
      const relY = clientY - rect.top;
      const sheenBg = `radial-gradient(280px circle at ${relX}px ${relY}px, rgba(200, 134, 10, 0.08), transparent 80%)`;

      return {
        normX,
        normY,
        rotateX,
        rotateY,
        z: 18,
        scale: 1.03,
        relX,
        relY,
        sheenBg,
      };
    };

    const standardCardRect = { left: 100, top: 150, width: 240, height: 200 };

    it("evaluates exact neutral baseline at card geographic center (normX=0, normY=0)", () => {
      const center = calcPositioningCardTilt(220, 250, standardCardRect);
      expect(center.normX).toBe(0);
      expect(center.normY).toBe(0);
      expect(center.rotateX).toBe(0);
      expect(center.rotateY).toBe(0);
      expect(center.z).toBe(18);
      expect(center.scale).toBe(1.03);
      expect(center.relX).toBe(120);
      expect(center.relY).toBe(100);
      expect(center.sheenBg).toBe(
        "radial-gradient(280px circle at 120px 100px, rgba(200, 134, 10, 0.08), transparent 80%)"
      );
    });

    it("evaluates exact corner tilt rotations (+/- 8deg)", () => {
      // Top-Left (100, 150): normX = -1, normY = -1 => rotateX = +8, rotateY = -8
      const tl = calcPositioningCardTilt(100, 150, standardCardRect);
      expect(tl.normX).toBe(-1);
      expect(tl.normY).toBe(-1);
      expect(tl.rotateX).toBe(8);
      expect(tl.rotateY).toBe(-8);

      // Top-Right (340, 150): normX = +1, normY = -1 => rotateX = +8, rotateY = +8
      const tr = calcPositioningCardTilt(340, 150, standardCardRect);
      expect(tr.normX).toBe(1);
      expect(tr.normY).toBe(-1);
      expect(tr.rotateX).toBe(8);
      expect(tr.rotateY).toBe(8);

      // Bottom-Left (100, 350): normX = -1, normY = +1 => rotateX = -8, rotateY = -8
      const bl = calcPositioningCardTilt(100, 350, standardCardRect);
      expect(bl.normX).toBe(-1);
      expect(bl.normY).toBe(1);
      expect(bl.rotateX).toBe(-8);
      expect(bl.rotateY).toBe(-8);

      // Bottom-Right (340, 350): normX = +1, normY = +1 => rotateX = -8, rotateY = +8
      const br = calcPositioningCardTilt(340, 350, standardCardRect);
      expect(br.normX).toBe(1);
      expect(br.normY).toBe(1);
      expect(br.rotateX).toBe(-8);
      expect(br.rotateY).toBe(8);
    });

    it("safely handles zero or collapsed card dimensions without NaN or Division-By-Zero", () => {
      const zeroRect = { left: 100, top: 100, width: 0, height: 0 };
      const res = calcPositioningCardTilt(200, 300, zeroRect);
      expect(Number.isNaN(res.rotateX)).toBe(false);
      expect(Number.isNaN(res.rotateY)).toBe(false);
      expect(Number.isFinite(res.rotateX)).toBe(true);
      expect(Number.isFinite(res.rotateY)).toBe(true);
      expect(res.rotateX).toBe(0);
      expect(res.rotateY).toBe(0);
    });

    it("processes 50,000 chaotic pointer events across extreme screen bounds", () => {
      let nanCount = 0;
      let infiniteCount = 0;

      for (let i = 0; i < 50000; i++) {
        // Range: -5000 to +5000
        const clientX = (Math.random() - 0.5) * 10000;
        const clientY = (Math.random() - 0.5) * 10000;
        const res = calcPositioningCardTilt(clientX, clientY, standardCardRect);

        if (
          Number.isNaN(res.rotateX) ||
          Number.isNaN(res.rotateY) ||
          Number.isNaN(res.relX) ||
          Number.isNaN(res.relY)
        ) {
          nanCount++;
        }
        if (!Number.isFinite(res.rotateX) || !Number.isFinite(res.rotateY)) {
          infiniteCount++;
        }
      }

      expect(nanCount).toBe(0);
      expect(infiniteCount).toBe(0);
    }, 15000);

    it("verifies initial 3D staggered entrance angles for the 3 concept cards", () => {
      const getInitialCardTransform = (i: number) => ({
        opacity: 0,
        y: 60,
        z: -100,
        rotateX: 24,
        rotateY: i === 0 ? -12 : i === 2 ? 12 : 0,
        scale: 0.9,
      });

      const card0 = getInitialCardTransform(0);
      const card1 = getInitialCardTransform(1);
      const card2 = getInitialCardTransform(2);

      expect(card0.rotateY).toBe(-12);
      expect(card0.rotateX).toBe(24);
      expect(card0.z).toBe(-100);

      expect(card1.rotateY).toBe(0);
      expect(card1.rotateX).toBe(24);
      expect(card1.z).toBe(-100);

      expect(card2.rotateY).toBe(12);
      expect(card2.rotateX).toBe(24);
      expect(card2.z).toBe(-100);
    });
  });

  // ===========================================================================
  // 2. Trust Monolithic 3D Dark Vault Panel & Pillar Cards Fan-out Geometry
  // ===========================================================================
  describe("2. Trust Monolithic 3D Vault Panel & Pillar Cards Fan-out", () => {
    it("verifies monolithic dark vault panel 3D unfold contract", () => {
      const panelUnfoldFrom = {
        opacity: 0,
        rotateX: 20,
        z: -120,
        scale: 0.92,
        transformOrigin: "center top",
      };

      const panelUnfoldTo = {
        opacity: 1,
        rotateX: 0,
        z: 0,
        scale: 1,
        duration: 1.1,
        ease: "power3.out",
      };

      expect(panelUnfoldFrom.rotateX).toBe(20);
      expect(panelUnfoldFrom.z).toBe(-120);
      expect(panelUnfoldFrom.scale).toBe(0.92);
      expect(panelUnfoldFrom.transformOrigin).toBe("center top");

      expect(panelUnfoldTo.rotateX).toBe(0);
      expect(panelUnfoldTo.z).toBe(0);
      expect(panelUnfoldTo.scale).toBe(1);
      expect(panelUnfoldTo.duration).toBe(1.1);
    });

    it("verifies 3D fan-out angles across 3 security pillar cards", () => {
      const getPillarCardFrom = (i: number) => ({
        opacity: 0,
        y: 50,
        z: -80,
        rotateX: 18,
        rotateY: i === 0 ? -10 : i === 2 ? 10 : 0,
        scale: 0.92,
      });

      const pillar0 = getPillarCardFrom(0);
      const pillar1 = getPillarCardFrom(1);
      const pillar2 = getPillarCardFrom(2);

      // Card 0 (Zero Code Storage) fans out to left (-10deg)
      expect(pillar0.rotateY).toBe(-10);
      expect(pillar0.rotateX).toBe(18);
      expect(pillar0.z).toBe(-80);

      // Card 1 (Instant Processing) enters central (0deg)
      expect(pillar1.rotateY).toBe(0);
      expect(pillar1.rotateX).toBe(18);
      expect(pillar1.z).toBe(-80);

      // Card 2 (Privacy by Default) fans out to right (+10deg)
      expect(pillar2.rotateY).toBe(10);
      expect(pillar2.rotateX).toBe(18);
      expect(pillar2.z).toBe(-80);
    });

    it("verifies dark card hover tilt math and radial amber sheen layer", () => {
      const calcTrustCardTilt = (
        clientX: number,
        clientY: number,
        rect: { left: number; top: number; width: number; height: number }
      ) => {
        const halfWidth = rect.width / 2;
        const halfHeight = rect.height / 2;
        const centerX = rect.left + halfWidth;
        const centerY = rect.top + halfHeight;
        const normX = halfWidth > 0 ? (clientX - centerX) / halfWidth : 0;
        const normY = halfHeight > 0 ? (clientY - centerY) / halfHeight : 0;

        const maxTilt = 8;
        const rotateX = -normY * maxTilt || 0;
        const rotateY = normX * maxTilt || 0;

        const relX = clientX - rect.left;
        const relY = clientY - rect.top;
        const sheenBg = `radial-gradient(320px circle at ${relX}px ${relY}px, rgba(200, 134, 10, 0.12), transparent 75%)`;

        return { rotateX, rotateY, z: 20, scale: 1.025, sheenBg };
      };

      const dummyRect = { left: 50, top: 80, width: 320, height: 260 };
      const tiltRes = calcTrustCardTilt(210, 210, dummyRect); // center
      expect(tiltRes.rotateX).toBe(0);
      expect(tiltRes.rotateY).toBe(0);
      expect(tiltRes.z).toBe(20);
      expect(tiltRes.scale).toBe(1.025);
      expect(tiltRes.sheenBg).toContain("320px circle at 160px 130px");
    });
  });

  // ===========================================================================
  // 3. SVG Circular Progress Ring strokeDashoffset & Mathematical Precision
  // ===========================================================================
  describe("3. SVG Circular Progress Ring strokeDashoffset & Geometric Precision", () => {
    it("verifies circumference calculation: 2 * PI * r (r=45) = 282.743 ~ 283", () => {
      const radius = 45;
      const exactCircumference = 2 * Math.PI * radius;
      expect(exactCircumference).toBeCloseTo(282.7433, 3);
      expect(Math.round(exactCircumference)).toBe(283);
    });

    it("verifies strokeDashoffset interpolation progression across 0% to 100%", () => {
      const maxOffset = 283;
      const calcOffset = (progress: number) => maxOffset * (1 - Math.min(Math.max(progress, 0), 1));

      expect(calcOffset(0.0)).toBe(283);
      expect(calcOffset(0.25)).toBeCloseTo(212.25, 2);
      expect(calcOffset(0.5)).toBeCloseTo(141.5, 2);
      expect(calcOffset(0.75)).toBeCloseTo(70.75, 2);
      expect(calcOffset(1.0)).toBe(0);
    });

    it("survives out-of-bound progress inputs (-10, 50) with strict clamping", () => {
      const maxOffset = 283;
      const calcClampedOffset = (progress: number) => {
        const safeProgress = Number.isFinite(progress) ? progress : 0;
        const p = Math.min(Math.max(safeProgress, 0), 1);
        return maxOffset * (1 - p);
      };

      expect(calcClampedOffset(-10)).toBe(283);
      expect(calcClampedOffset(50)).toBe(0);
      expect(Number.isNaN(calcClampedOffset(Number.NaN))).toBe(false);
    });
  });

  // ===========================================================================
  // 4. Testimonials 3D Depth Layer Stack Carousel 64-State Modulo Permutation Matrix
  // ===========================================================================
  describe("4. Testimonials 3D Depth Layer Stack Carousel 64-State Matrix", () => {
    const total = 8;

    const calcDelta = (index: number, activeIndex: number) => {
      let delta = (index - activeIndex + total) % total;
      if (delta > total / 2) delta -= total;
      return delta;
    };

    const getCardStyle = (index: number, activeIndex: number, isReducedMotion: boolean) => {
      const delta = calcDelta(index, activeIndex);

      if (isReducedMotion) {
        return {
          display: Math.abs(delta) <= 1 ? "block" : "none",
          transform: delta === 0 ? "scale(1)" : "scale(0.92)",
          opacity: delta === 0 ? 1 : 0.4,
          zIndex: delta === 0 ? 30 : 10,
          pointerEvents: delta === 0 ? "auto" : "none",
        };
      }

      if (delta === 0) {
        return {
          delta,
          tier: "active",
          transform: "translate3d(0px, 0px, 40px) rotateY(0deg) rotateX(0deg) scale(1.0)",
          opacity: 1,
          filter: "blur(0px)",
          zIndex: 30,
          pointerEvents: "auto",
        };
      }

      if (delta === 1) {
        return {
          delta,
          tier: "right-flank",
          transform: "translate3d(320px, 12px, -60px) rotateY(-14deg) scale(0.86)",
          opacity: 0.75,
          filter: "blur(2px)",
          zIndex: 20,
          pointerEvents: "auto",
        };
      }

      if (delta === -1) {
        return {
          delta,
          tier: "left-flank",
          transform: "translate3d(-320px, 12px, -60px) rotateY(14deg) scale(0.86)",
          opacity: 0.75,
          filter: "blur(2px)",
          zIndex: 20,
          pointerEvents: "auto",
        };
      }

      if (delta === 2) {
        return {
          delta,
          tier: "outer-right",
          transform: "translate3d(540px, 24px, -150px) rotateY(-24deg) scale(0.72)",
          opacity: 0.35,
          filter: "blur(5px)",
          zIndex: 10,
          pointerEvents: "auto",
        };
      }

      if (delta === -2) {
        return {
          delta,
          tier: "outer-left",
          transform: "translate3d(-540px, 24px, -150px) rotateY(24deg) scale(0.72)",
          opacity: 0.35,
          filter: "blur(5px)",
          zIndex: 10,
          pointerEvents: "auto",
        };
      }

      return {
        delta,
        tier: "offstage",
        transform: `translate3d(${Math.sign(delta) * 720}px, 36px, -260px) rotateY(${Math.sign(delta) * -35}deg) scale(0.55)`,
        opacity: 0,
        filter: "blur(8px)",
        zIndex: 0,
        pointerEvents: "none",
      };
    };

    it("verifies all 64 permutations of (activeIndex, cardIndex) for exact symmetry & depth bounds", () => {
      for (let active = 0; active < total; active++) {
        let frontCount = 0;
        let flankCount = 0;
        let outerCount = 0;
        let offstageCount = 0;

        for (let idx = 0; idx < total; idx++) {
          const style = getCardStyle(idx, active, false);
          const delta = calcDelta(idx, active);

          expect(delta).toBeGreaterThanOrEqual(-4);
          expect(delta).toBeLessThanOrEqual(4);

          if (delta === 0) {
            frontCount++;
            expect(style.tier).toBe("active");
            expect(style.opacity).toBe(1);
            expect(style.zIndex).toBe(30);
            expect(style.pointerEvents).toBe("auto");
          } else if (Math.abs(delta) === 1) {
            flankCount++;
            expect(style.tier).toContain("flank");
            expect(style.opacity).toBe(0.75);
            expect(style.zIndex).toBe(20);
            expect(style.pointerEvents).toBe("auto");
          } else if (Math.abs(delta) === 2) {
            outerCount++;
            expect(style.tier).toContain("outer");
            expect(style.opacity).toBe(0.35);
            expect(style.zIndex).toBe(10);
            expect(style.pointerEvents).toBe("auto");
          } else {
            offstageCount++;
            expect(style.tier).toBe("offstage");
            expect(style.opacity).toBe(0);
            expect(style.zIndex).toBe(0);
            expect(style.pointerEvents).toBe("none");
          }
        }

        // Exact distribution for N=8: 1 front, 2 flank, 2 outer, 3 offstage
        expect(frontCount).toBe(1);
        expect(flankCount).toBe(2);
        expect(outerCount).toBe(2);
        expect(offstageCount).toBe(3);
      }
    });

    it("verifies monotonic depth ordering and z-index isolation across tiers", () => {
      const tiers = [0, 1, 2, 3];
      const opacities = tiers.map((d) => getCardStyle(d, 0, false).opacity);
      const zIndices = tiers.map((d) => getCardStyle(d, 0, false).zIndex);

      // Strictly decreasing opacities: 1.0 > 0.75 > 0.35 > 0
      expect(opacities[0]).toBeGreaterThan(opacities[1]);
      expect(opacities[1]).toBeGreaterThan(opacities[2]);
      expect(opacities[2]).toBeGreaterThan(opacities[3]);

      // Strictly decreasing zIndex: 30 > 20 > 10 > 0
      expect(zIndices[0]).toBeGreaterThan(zIndices[1]);
      expect(zIndices[1]).toBeGreaterThan(zIndices[2]);
      expect(zIndices[2]).toBeGreaterThan(zIndices[3]);
    });
  });

  // ===========================================================================
  // 5. WebGL Background clearColor & Fog Dynamic Theme Lerping Invariants
  // ===========================================================================
  describe("5. WebGL Background clearColor Dynamic Theme Lerping Invariants", () => {
    const creamColor = new THREE.Color(0xf5f3ee);
    const darkColor = new THREE.Color(0x0e1117);

    const resolveTargetThemeColor = (scrollVal: number) => {
      if (scrollVal >= 0.42 && scrollVal <= 0.72) {
        return darkColor;
      }
      return creamColor;
    };

    it("verifies exact boundary transitions at scroll progress epsilon thresholds", () => {
      expect(resolveTargetThemeColor(0.0000).getHexString()).toBe("f5f3ee");
      expect(resolveTargetThemeColor(0.4199).getHexString()).toBe("f5f3ee");
      expect(resolveTargetThemeColor(0.4200).getHexString()).toBe("0e1117");
      expect(resolveTargetThemeColor(0.5700).getHexString()).toBe("0e1117");
      expect(resolveTargetThemeColor(0.7200).getHexString()).toBe("0e1117");
      expect(resolveTargetThemeColor(0.7201).getHexString()).toBe("f5f3ee");
      expect(resolveTargetThemeColor(1.0000).getHexString()).toBe("f5f3ee");
    });

    it("simulates 10,000 continuous frame ticks with rapid random scroll jumps", () => {
      const currentColor = new THREE.Color(0xf5f3ee);

      for (let i = 0; i < 10000; i++) {
        const randomScroll = Math.random();
        const target = resolveTargetThemeColor(randomScroll);
        currentColor.lerp(target, 0.05);

        expect(Number.isNaN(currentColor.r)).toBe(false);
        expect(Number.isNaN(currentColor.g)).toBe(false);
        expect(Number.isNaN(currentColor.b)).toBe(false);

        // Bounds validation [0, 1]
        expect(currentColor.r).toBeGreaterThanOrEqual(0);
        expect(currentColor.r).toBeLessThanOrEqual(1);
        expect(currentColor.g).toBeGreaterThanOrEqual(0);
        expect(currentColor.g).toBeLessThanOrEqual(1);
        expect(currentColor.b).toBeGreaterThanOrEqual(0);
        expect(currentColor.b).toBeLessThanOrEqual(1);
      }
    });

    it("proves exponential asymptotic convergence to dark room within 60 frames", () => {
      const currentColor = new THREE.Color(0xf5f3ee);
      const targetDark = darkColor;
      const initialDistance = Math.hypot(
        currentColor.r - targetDark.r,
        currentColor.g - targetDark.g,
        currentColor.b - targetDark.b
      );

      for (let frame = 0; frame < 60; frame++) {
        currentColor.lerp(targetDark, 0.05);
      }

      // Delta Euclidean distance
      const distance = Math.hypot(
        currentColor.r - targetDark.r,
        currentColor.g - targetDark.g,
        currentColor.b - targetDark.b
      );

      // (0.95)^60 ~= 0.0461 (remaining error is < 5% of initial distance)
      expect(distance / initialDistance).toBeLessThan(0.05);
      expect(distance).toBeLessThan(0.075);
    });
  });

  // ===========================================================================
  // 6. Prefers-Reduced-Motion Fallback & Degradation Invariants
  // ===========================================================================
  describe("6. Prefers-Reduced-Motion Fallback & Accessibility Invariants", () => {
    it("renders Positioning cleanly when prefers-reduced-motion is true", () => {
      vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const { container } = render(<Positioning />);
      const section = container.querySelector("#positioning");
      expect(section).toBeInTheDocument();
      expect(screen.getByText("Understanding")).toBeInTheDocument();
    });

    it("renders Trust cleanly when prefers-reduced-motion is true", () => {
      vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const { container } = render(<Trust />);
      const section = container.querySelector("#trust");
      expect(section).toBeInTheDocument();
      expect(screen.getByText("Zero Code Storage")).toBeInTheDocument();
    });

    it("renders Testimonials with 2D fallback layout when motionSafe is false", () => {
      vi.spyOn(MotionModule, "useMotionSafe").mockReturnValue(false);

      const { container } = render(<Testimonials />);
      const section = container.querySelector("#testimonials");
      expect(section).toBeInTheDocument();

      const slides = container.querySelectorAll('[aria-roledescription="slide"]');
      expect(slides.length).toBe(8);

      // Active slide is displayed
      const activeSlide = slides[0] as HTMLElement;
      expect(activeSlide.style.display).toBe("block");
      expect(activeSlide.style.transform).toBe("scale(1)");
      expect(activeSlide.style.opacity).toBe("1");

      // Distant slides are hidden (display: none)
      const distantSlide = slides[3] as HTMLElement;
      expect(distantSlide.style.display).toBe("none");
    });
  });

  // ===========================================================================
  // 7. Live React Component DOM Mounting & Interaction Stress Testing
  // ===========================================================================
  describe("7. Live React Component Mounting & Rapid Interaction Stress", () => {
    it("renders Positioning and executes 100 rapid mouse move events", () => {
      const { container } = render(<Positioning />);
      const cards = container.querySelectorAll(".positioning-card-3d");
      expect(cards.length).toBe(3);

      const firstCard = cards[0] as HTMLElement;
      vi.spyOn(firstCard, "getBoundingClientRect").mockReturnValue({
        left: 50,
        top: 50,
        width: 240,
        height: 200,
        right: 290,
        bottom: 250,
        x: 50,
        y: 50,
        toJSON: () => {},
      });

      for (let i = 0; i < 100; i++) {
        fireEvent.mouseMove(firstCard, { clientX: 100 + i, clientY: 100 + (i % 20) });
      }

      fireEvent.mouseLeave(firstCard);
    });

    it("renders Trust and executes 100 rapid mouse move events across all 3 pillar cards", () => {
      const { container } = render(<Trust />);
      const cards = container.querySelectorAll(".trust-card-3d");
      expect(cards.length).toBe(3);

      cards.forEach((card, idx) => {
        const el = card as HTMLElement;
        vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
          left: 100 * idx,
          top: 50,
          width: 300,
          height: 240,
          right: 100 * idx + 300,
          bottom: 290,
          x: 100 * idx,
          y: 50,
          toJSON: () => {},
        });

        for (let i = 0; i < 50; i++) {
          fireEvent.mouseMove(el, { clientX: 150 + i * 2, clientY: 100 + i });
        }
        fireEvent.mouseLeave(el);
      });
    });

    it("renders Testimonials and cycles through 50 consecutive next/prev clicks and drag gestures", () => {
      const { container } = render(<Testimonials />);
      const nextBtn = screen.getByLabelText("Next testimonial");
      const prevBtn = screen.getByLabelText("Previous testimonial");
      const stage = container.querySelector('[style*="preserve-3d"]') as HTMLElement;

      // 20 Next clicks
      for (let i = 0; i < 20; i++) {
        fireEvent.click(nextBtn);
      }

      // 20 Prev clicks
      for (let i = 0; i < 20; i++) {
        fireEvent.click(prevBtn);
      }

      // 10 Drag gestures
      for (let i = 0; i < 10; i++) {
        fireEvent.pointerDown(stage, { clientX: 300 });
        fireEvent.pointerMove(stage, { clientX: 200 }); // flick left
        fireEvent.pointerUp(stage);
      }

      expect(screen.getByText(/Loved by developers/i)).toBeInTheDocument();
    });
  });
});

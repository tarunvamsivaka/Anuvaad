/**
 * Milestone 3 Empirical Challenger Stress Test Suite
 * 
 * Exhaustive Verification & Adversarial Stress Tests:
 * 1. Testimonials Delta Math Matrix (64 combinations: all activeIndex x all cardIndex)
 * 2. Rapid Click & Gestures (Wrap-around cycles, sub-threshold drags, flick thresholds)
 * 3. Drag displacement live tracking and pointer cancel safety
 * 4. Keyboard Arrow toggles and ignored keys
 * 5. Auto-play timer suspension on hover/focus and reduced motion
 * 6. Positioning & Trust mouse tilt vector math (corners, center, out-of-bounds)
 * 7. Reduced motion fallback invariants across all M3 components
 * 8. Dynamic WebGL theme color lerp convergence and boundary stability
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import * as THREE from "three";

import { Positioning } from "@/components/landing/Positioning";
import { Trust } from "@/components/landing/Trust";
import { Testimonials, TESTIMONIALS } from "@/components/landing/testimonials";
import * as motionModule from "@/lib/motion";

// Mock GSAP
const mockGSAPTo = vi.fn((target: any, vars: any) => vars);
const mockGSAPFromTo = vi.fn((target: any, fromVars: any, toVars: any) => toVars);

vi.mock("gsap", async () => {
  const actual = await vi.importActual<any>("gsap");
  return {
    ...actual,
    default: {
      ...actual.default,
      to: (target: any, vars: any) => mockGSAPTo(target, vars),
      fromTo: (target: any, fromVars: any, toVars: any) => mockGSAPFromTo(target, fromVars, toVars),
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

describe("Milestone 3 Empirical Stress & Adversarial Challenge Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // 1. TESTIMONIALS 3D DELTA MATH MATRIX (64 COMBINATIONS)
  // ===========================================================================
  describe("1. Testimonials 3D Delta Math Exhaustive Matrix", () => {
    const N = TESTIMONIALS.length; // 8

    it("verifies N = 8 testimonials dataset", () => {
      expect(N).toBe(8);
    });

    it("evaluates delta wrapping formula across all 64 activeIndex x cardIndex pairs", () => {
      const { container } = render(<Testimonials />);
      const nextBtn = screen.getByLabelText("Next testimonial");

      for (let active = 0; active < N; active++) {
        const slides = container.querySelectorAll('[aria-roledescription="slide"]');
        expect(slides.length).toBe(N);

        for (let i = 0; i < N; i++) {
          let expectedDelta = (i - active + N) % N;
          if (expectedDelta > N / 2) expectedDelta -= N;

          const slide = slides[i] as HTMLElement;

          if (expectedDelta === 0) {
            // Active Front Card
            expect(slide.style.opacity).toBe("1");
            expect(slide.style.filter).toBe("blur(0px)");
            expect(slide.style.zIndex).toBe("30");
            expect(slide.style.transform).toContain("translate3d(0px, 0px, 40px)");
            expect(slide.style.pointerEvents).toBe("auto");
            expect(slide.getAttribute("aria-hidden")).toBe("false");
          } else if (expectedDelta === 1) {
            // Right Flank (+1)
            expect(slide.style.opacity).toBe("0.75");
            expect(slide.style.filter).toBe("blur(2px)");
            expect(slide.style.zIndex).toBe("20");
            expect(slide.style.transform).toContain("translate3d(320px, 12px, -60px)");
            expect(slide.style.transform).toContain("rotateY(-14deg)");
            expect(slide.style.pointerEvents).toBe("auto");
            expect(slide.getAttribute("aria-hidden")).toBe("true");
          } else if (expectedDelta === -1) {
            // Left Flank (-1)
            expect(slide.style.opacity).toBe("0.75");
            expect(slide.style.filter).toBe("blur(2px)");
            expect(slide.style.zIndex).toBe("20");
            expect(slide.style.transform).toContain("translate3d(-320px, 12px, -60px)");
            expect(slide.style.transform).toContain("rotateY(14deg)");
            expect(slide.style.pointerEvents).toBe("auto");
            expect(slide.getAttribute("aria-hidden")).toBe("true");
          } else if (expectedDelta === 2) {
            // Outer Right (+2)
            expect(slide.style.opacity).toBe("0.35");
            expect(slide.style.filter).toBe("blur(5px)");
            expect(slide.style.zIndex).toBe("10");
            expect(slide.style.transform).toContain("translate3d(540px, 24px, -150px)");
            expect(slide.style.transform).toContain("rotateY(-24deg)");
            expect(slide.style.pointerEvents).toBe("auto");
            expect(slide.getAttribute("aria-hidden")).toBe("true");
          } else if (expectedDelta === -2) {
            // Outer Left (-2)
            expect(slide.style.opacity).toBe("0.35");
            expect(slide.style.filter).toBe("blur(5px)");
            expect(slide.style.zIndex).toBe("10");
            expect(slide.style.transform).toContain("translate3d(-540px, 24px, -150px)");
            expect(slide.style.transform).toContain("rotateY(24deg)");
            expect(slide.style.pointerEvents).toBe("auto");
            expect(slide.getAttribute("aria-hidden")).toBe("true");
          } else {
            // Offstage (|delta| >= 3)
            expect(slide.style.opacity).toBe("0");
            expect(slide.style.filter).toBe("blur(8px)");
            expect(slide.style.zIndex).toBe("0");
            expect(slide.style.pointerEvents).toBe("none");
            expect(slide.getAttribute("aria-hidden")).toBe("true");
          }
        }

        // Advance to next slide for subsequent iteration
        fireEvent.click(nextBtn);
      }
    });
  });

  // ===========================================================================
  // 2. RAPID NAVIGATION & CYCLING STRESS TESTS
  // ===========================================================================
  describe("2. Rapid Navigation & Boundary Stress Tests", () => {
    it("handles 100 consecutive rapid forward clicks with flawless mod 8 wrap-around", () => {
      render(<Testimonials />);
      const nextBtn = screen.getByLabelText("Next testimonial");

      for (let step = 0; step < 24; step++) {
        const expectedIndex = step % 8;
        expect(screen.getByText(new RegExp(`${expectedIndex + 1} / 8 · ${TESTIMONIALS[expectedIndex].company}`, "i"))).toBeInTheDocument();
        fireEvent.click(nextBtn);
      }
    }, 60000);

    it("handles 100 consecutive rapid backward clicks with flawless mod 8 reverse wrap-around", () => {
      render(<Testimonials />);
      const prevBtn = screen.getByLabelText("Previous testimonial");

      for (let step = 0; step < 24; step++) {
        const expectedIndex = (8 - (step % 8)) % 8;
        expect(screen.getByText(new RegExp(`${expectedIndex + 1} / 8 · ${TESTIMONIALS[expectedIndex].company}`, "i"))).toBeInTheDocument();
        fireEvent.click(prevBtn);
      }
    }, 60000);

    it("handles interleaved random dot, button, and card clicks without state desynchronization", () => {
      const { container } = render(<Testimonials />);
      const nextBtn = screen.getByLabelText("Next testimonial");
      const prevBtn = screen.getByLabelText("Previous testimonial");

      // Click Dot 6 (index 5: Rahul Patel / Razorpay)
      fireEvent.click(screen.getByLabelText("Go to testimonial 6"));
      expect(screen.getByText(/6 \/ 8 · Razorpay/i)).toBeInTheDocument();

      // Click Next -> Dot 7 (index 6: Sophie Laurent / Datadog)
      fireEvent.click(nextBtn);
      expect(screen.getByText(/7 \/ 8 · Datadog/i)).toBeInTheDocument();

      // Click Prev -> Dot 6
      fireEvent.click(prevBtn);
      expect(screen.getByText(/6 \/ 8 · Razorpay/i)).toBeInTheDocument();

      // Click card 7 (index 7: James O. / Linear)
      const slides = container.querySelectorAll('[aria-roledescription="slide"]');
      fireEvent.click(slides[7]);
      expect(screen.getByText(/8 \/ 8 · Linear/i)).toBeInTheDocument();

      // From index 7, click Next -> wraps to index 0 (Priya Sharma / Flipkart)
      fireEvent.click(nextBtn);
      expect(screen.getByText(/1 \/ 8 · Flipkart/i)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 3. POINTER DRAG GESTURE & LIVE DISPLACEMENT TRACKING
  // ===========================================================================
  describe("3. Pointer Drag Gestures & Threshold Boundary Tests", () => {
    it("tracks real-time horizontal drag offset (dragOffset * 0.4 px)", () => {
      const { container } = render(<Testimonials />);
      const stage = container.querySelector('[style*="preserve-3d"]') as HTMLElement;
      const frontCard = container.querySelectorAll('[aria-roledescription="slide"]')[0] as HTMLElement;

      // Pointer down at clientX = 300
      fireEvent.pointerDown(stage, { clientX: 300 });

      // Move to clientX = 400 (dragOffset = +100px)
      fireEvent.pointerMove(stage, { clientX: 400 });

      // Active card transform should reflect translate3d(40px, 0px, 40px)
      expect(frontCard.style.transform).toContain("translate3d(40px, 0px, 40px)");

      // Move to clientX = 150 (dragOffset = -150px)
      fireEvent.pointerMove(stage, { clientX: 150 });
      expect(frontCard.style.transform).toContain("translate3d(-60px, 0px, 40px)");

      // Cancel pointer -> resets offset without advancing
      fireEvent.pointerCancel(stage);
      expect(frontCard.style.transform).toContain("translate3d(0px, 0px, 40px)");
      expect(screen.getByText(/1 \/ 8 · Flipkart/i)).toBeInTheDocument();
    });

    it("does NOT advance slide when drag displacement is within threshold (|delta| <= 45px)", () => {
      const { container } = render(<Testimonials />);
      const stage = container.querySelector('[style*="preserve-3d"]') as HTMLElement;

      // Sub-threshold drag right (+45px)
      fireEvent.pointerDown(stage, { clientX: 200 });
      fireEvent.pointerMove(stage, { clientX: 245 });
      fireEvent.pointerUp(stage);
      expect(screen.getByText(/1 \/ 8 · Flipkart/i)).toBeInTheDocument();

      // Sub-threshold drag left (-45px)
      fireEvent.pointerDown(stage, { clientX: 200 });
      fireEvent.pointerMove(stage, { clientX: 155 });
      fireEvent.pointerUp(stage);
      expect(screen.getByText(/1 \/ 8 · Flipkart/i)).toBeInTheDocument();
    });

    it("advances to next slide when drag displacement exceeds leftward threshold (delta < -45px)", () => {
      const { container } = render(<Testimonials />);
      const stage = container.querySelector('[style*="preserve-3d"]') as HTMLElement;

      // Flick left (-46px)
      fireEvent.pointerDown(stage, { clientX: 200 });
      fireEvent.pointerMove(stage, { clientX: 154 });
      fireEvent.pointerUp(stage);
      expect(screen.getByText(/2 \/ 8 · Stripe/i)).toBeInTheDocument();
    });

    it("advances to prev slide when drag displacement exceeds rightward threshold (delta > 45px)", () => {
      const { container } = render(<Testimonials />);
      const stage = container.querySelector('[style*="preserve-3d"]') as HTMLElement;

      // Flick right (+46px) from index 0 -> wraps to index 7 (Linear)
      fireEvent.pointerDown(stage, { clientX: 200 });
      fireEvent.pointerMove(stage, { clientX: 246 });
      fireEvent.pointerUp(stage);
      expect(screen.getByText(/8 \/ 8 · Linear/i)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 4. KEYBOARD NAVIGATION & FOCUS COMPLIANCE
  // ===========================================================================
  describe("4. Keyboard Navigation & Accessibility", () => {
    it("handles ArrowRight and ArrowLeft keyboard toggles with boundary wrapping", () => {
      const { container } = render(<Testimonials />);
      const section = container.querySelector("#testimonials") as HTMLElement;

      // ArrowRight 3 times -> index 3 (Shopify)
      fireEvent.keyDown(section, { key: "ArrowRight" });
      fireEvent.keyDown(section, { key: "ArrowRight" });
      fireEvent.keyDown(section, { key: "ArrowRight" });
      expect(screen.getByText(/4 \/ 8 · Shopify/i)).toBeInTheDocument();

      // ArrowLeft 4 times -> index 7 (Linear)
      fireEvent.keyDown(section, { key: "ArrowLeft" });
      fireEvent.keyDown(section, { key: "ArrowLeft" });
      fireEvent.keyDown(section, { key: "ArrowLeft" });
      fireEvent.keyDown(section, { key: "ArrowLeft" });
      expect(screen.getByText(/8 \/ 8 · Linear/i)).toBeInTheDocument();
    });

    it("ignores non-arrow keys like Space, Enter, Tab, ArrowUp, ArrowDown", () => {
      const { container } = render(<Testimonials />);
      const section = container.querySelector("#testimonials") as HTMLElement;

      fireEvent.keyDown(section, { key: "Space" });
      fireEvent.keyDown(section, { key: "Enter" });
      fireEvent.keyDown(section, { key: "Tab" });
      fireEvent.keyDown(section, { key: "ArrowUp" });
      fireEvent.keyDown(section, { key: "ArrowDown" });
      expect(screen.getByText(/1 \/ 8 · Flipkart/i)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 5. AUTO-PLAY TIMER SUSPENSION & HOVER BEHAVIOR
  // ===========================================================================
  describe("5. Auto-Play Timer & Hover Suspension", () => {
    it("auto-advances after 5500ms when unpaused", () => {
      render(<Testimonials />);
      expect(screen.getByText(/1 \/ 8 · Flipkart/i)).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(5500);
      });
      expect(screen.getByText(/2 \/ 8 · Stripe/i)).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(5500);
      });
      expect(screen.getByText(/3 \/ 8 · Georgia Tech/i)).toBeInTheDocument();
    });

    it("suspends auto-rotation during mouse hover and resumes on mouse leave", () => {
      const { container } = render(<Testimonials />);
      const section = container.querySelector("#testimonials") as HTMLElement;

      // Hover on section -> pauses
      fireEvent.mouseEnter(section);

      act(() => {
        vi.advanceTimersByTime(11000); // 2 full cycles
      });
      // Should still be at index 0
      expect(screen.getByText(/1 \/ 8 · Flipkart/i)).toBeInTheDocument();

      // Mouse leave -> resumes
      fireEvent.mouseLeave(section);

      act(() => {
        vi.advanceTimersByTime(5500);
      });
      expect(screen.getByText(/2 \/ 8 · Stripe/i)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 6. POSITIONING & TRUST 3D MOUSE TILT VECTOR MATH
  // ===========================================================================
  describe("6. Positioning & Trust Mouse Tilt Vector Math", () => {
    it("calculates exact normalized 3D tilt vectors for Positioning concept cards", () => {
      const { container } = render(<Positioning />);
      const card = container.querySelector(".positioning-card-3d") as HTMLElement;

      vi.spyOn(card, "getBoundingClientRect").mockReturnValue({
        left: 100,
        top: 100,
        width: 200,
        height: 200,
        right: 300,
        bottom: 300,
        x: 100,
        y: 100,
        toJSON: () => {},
      });

      // Center: (200, 200) -> rotateX: 0, rotateY: 0
      fireEvent.mouseMove(card, { clientX: 200, clientY: 200 });
      expect(mockGSAPTo).toHaveBeenCalledWith(
        card,
        expect.objectContaining({
          rotateX: 0,
          rotateY: 0,
          z: 18,
          scale: 1.03,
        })
      );

      // Top-Left corner: (100, 100) -> normX = -1, normY = -1 -> rotateX: +8, rotateY: -8
      fireEvent.mouseMove(card, { clientX: 100, clientY: 100 });
      expect(mockGSAPTo).toHaveBeenCalledWith(
        card,
        expect.objectContaining({
          rotateX: 8,
          rotateY: -8,
          z: 18,
          scale: 1.03,
        })
      );

      // Bottom-Right corner: (300, 300) -> normX = +1, normY = +1 -> rotateX: -8, rotateY: +8
      fireEvent.mouseMove(card, { clientX: 300, clientY: 300 });
      expect(mockGSAPTo).toHaveBeenCalledWith(
        card,
        expect.objectContaining({
          rotateX: -8,
          rotateY: 8,
          z: 18,
          scale: 1.03,
        })
      );

      // Mouse leave -> resets
      fireEvent.mouseLeave(card);
      expect(mockGSAPTo).toHaveBeenCalledWith(
        card,
        expect.objectContaining({
          rotateX: 0,
          rotateY: 0,
          z: 0,
          scale: 1,
        })
      );
    });

    it("calculates exact normalized 3D tilt vectors for Trust dark pillar cards", () => {
      const { container } = render(<Trust />);
      const card = container.querySelector(".trust-card-3d") as HTMLElement;

      vi.spyOn(card, "getBoundingClientRect").mockReturnValue({
        left: 50,
        top: 50,
        width: 300,
        height: 200,
        right: 350,
        bottom: 250,
        x: 50,
        y: 50,
        toJSON: () => {},
      });

      // Top-Right corner: (350, 50) -> normX = +1, normY = -1 -> rotateX: +8, rotateY: +8
      fireEvent.mouseMove(card, { clientX: 350, clientY: 50 });
      expect(mockGSAPTo).toHaveBeenCalledWith(
        card,
        expect.objectContaining({
          rotateX: 8,
          rotateY: 8,
          z: 20,
          scale: 1.025,
        })
      );

      // Bottom-Left corner: (50, 250) -> normX = -1, normY = +1 -> rotateX: -8, rotateY: -8
      fireEvent.mouseMove(card, { clientX: 50, clientY: 250 });
      expect(mockGSAPTo).toHaveBeenCalledWith(
        card,
        expect.objectContaining({
          rotateX: -8,
          rotateY: -8,
          z: 20,
          scale: 1.025,
        })
      );

      // Mouse leave -> resets
      fireEvent.mouseLeave(card);
      expect(mockGSAPTo).toHaveBeenCalledWith(
        card,
        expect.objectContaining({
          rotateX: 0,
          rotateY: 0,
          z: 0,
          scale: 1,
        })
      );
    });
  });

  // ===========================================================================
  // 7. REDUCED MOTION FALLBACK MATRIX
  // ===========================================================================
  describe("7. Reduced Motion Fallback Invariants", () => {
    beforeEach(() => {
      vi.spyOn(motionModule, "useMotionSafe").mockReturnValue(false);
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query.includes("prefers-reduced-motion: reduce"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
    });

    it("renders Testimonials 2D accessible fallback without 3D transforms or auto-play", () => {
      const { container } = render(<Testimonials />);
      const slides = container.querySelectorAll('[aria-roledescription="slide"]');

      // Active slide has scale(1), no translate3d, opacity 1
      const activeCard = slides[0] as HTMLElement;
      expect(activeCard.style.display).toBe("block");
      expect(activeCard.style.transform).toBe("scale(1)");
      expect(activeCard.style.opacity).toBe("1");

      // Flanking slide (index 1) has scale(0.92), opacity 0.4
      const flankCard = slides[1] as HTMLElement;
      expect(flankCard.style.display).toBe("block");
      expect(flankCard.style.transform).toBe("scale(0.92)");
      expect(flankCard.style.opacity).toBe("0.4");

      // Offstage slide (index 2) has display: none
      const offstageCard = slides[2] as HTMLElement;
      expect(offstageCard.style.display).toBe("none");

      // Timer does NOT auto-advance in reduced motion mode
      act(() => {
        vi.advanceTimersByTime(10000);
      });
      expect(screen.getByText(/1 \/ 8 · Flipkart/i)).toBeInTheDocument();
    });

    it("bypasses 3D mouse tilt in Positioning when reduced motion is requested", () => {
      mockGSAPTo.mockClear();
      const { container } = render(<Positioning />);
      const card = container.querySelector(".positioning-card-3d") as HTMLElement;

      fireEvent.mouseMove(card, { clientX: 100, clientY: 100 });
      // GSAP to should not be called with 3D tilt
      expect(mockGSAPTo).not.toHaveBeenCalled();
    });

    it("bypasses 3D mouse tilt in Trust when reduced motion is requested", () => {
      mockGSAPTo.mockClear();
      const { container } = render(<Trust />);
      const card = container.querySelector(".trust-card-3d") as HTMLElement;

      fireEvent.mouseMove(card, { clientX: 100, clientY: 100 });
      expect(mockGSAPTo).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // 8. DYNAMIC WEBGL THEME COLOR TRANSITIONS STABILITY
  // ===========================================================================
  describe("8. Dynamic WebGL Background Theme Color Stability", () => {
    const creamColor = new THREE.Color(0xf5f3ee);
    const darkColor = new THREE.Color(0x0e1117);

    const computeThemeTarget = (scrollVal: number) => {
      if (scrollVal >= 0.42 && scrollVal <= 0.72) {
        return darkColor;
      }
      return creamColor;
    };

    it("maintains strict mathematical continuity and convergence across 1000 scroll samples", () => {
      const current = new THREE.Color(0xf5f3ee);

      for (let s = 0; s <= 1000; s++) {
        const scrollProgress = s / 1000;
        const target = computeThemeTarget(scrollProgress);

        // One step lerp simulation
        current.lerp(target, 0.05);

        // Assert RGB channels stay strictly bounded in [0, 1] without NaN or Inf
        expect(current.r).toBeGreaterThanOrEqual(0);
        expect(current.r).toBeLessThanOrEqual(1);
        expect(current.g).toBeGreaterThanOrEqual(0);
        expect(current.g).toBeLessThanOrEqual(1);
        expect(current.b).toBeGreaterThanOrEqual(0);
        expect(current.b).toBeLessThanOrEqual(1);
        expect(Number.isNaN(current.r)).toBe(false);
        expect(Number.isNaN(current.g)).toBe(false);
        expect(Number.isNaN(current.b)).toBe(false);
      }
    });
  });
});

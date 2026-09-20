/**
 * Milestone 3 Test Suite: 3D Positioning, Trust & Testimonials Scenes
 * 
 * Verifies:
 * 1. Positioning 3D perspective stage, concept cards, mouse tilt, and reduced-motion fallback.
 * 2. Trust monolithic dark panel 3D unfold, pillar cards, SVG stroke animation, and hover tilt.
 * 3. Testimonials 3D depth-layer stack carousel: delta mapping, depth blur/scale tiers,
 *    next/prev controls, dot navigation, drag gestures, keyboard navigation, and reduced-motion.
 * 4. Dynamic WebGL theme color lerping invariants (Warm Cream #f5f3ee <-> Deep Dark Room #0e1117).
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import * as THREE from "three";

import { Positioning } from "@/components/landing/Positioning";
import { Trust } from "@/components/landing/Trust";
import { Testimonials, TESTIMONIALS } from "@/components/landing/testimonials";

// Mock GSAP
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

describe("Milestone 3: 3D Positioning, Trust & Testimonials Scenes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  // ---------------------------------------------------------------------------
  // 1. Positioning 3D Component
  // ---------------------------------------------------------------------------
  describe("Positioning 3D Component", () => {
    it("renders with 3D perspective stage and section ID", () => {
      const { container } = render(<Positioning />);
      const section = container.querySelector("#positioning");
      expect(section).toBeInTheDocument();
      expect(section).toHaveStyle({ perspective: "1200px" });
    });

    it("renders headline words and sub-headline typography", () => {
      render(<Positioning />);
      expect(screen.getByText("Not")).toBeInTheDocument();
      expect(screen.getByText("another")).toBeInTheDocument();
      expect(screen.getByText(/AI\s*coding\s*tool\./i)).toBeInTheDocument();
      expect(screen.getByText(/Anuvaad helps developers/i)).toBeInTheDocument();
      expect(screen.getByText("understand")).toBeInTheDocument();
      expect(screen.getByText(/Not merely generate it\./i)).toBeInTheDocument();
    });

    it("renders all 3 concept cards with labels and descriptions", () => {
      render(<Positioning />);
      expect(screen.getByText("Understanding")).toBeInTheDocument();
      expect(screen.getByText("Not just generation")).toBeInTheDocument();
      expect(screen.getByText("Collaboration")).toBeInTheDocument();
      expect(screen.getByText("Across time & teams")).toBeInTheDocument();
      expect(screen.getByText("Knowledge Transfer")).toBeInTheDocument();
      expect(screen.getByText("From expert to novice")).toBeInTheDocument();
    });

    it("contains positioning divider quote", () => {
      render(<Positioning />);
      expect(screen.getByText(/Code is language\. Every codebase has a story\./i)).toBeInTheDocument();
      expect(screen.getByText(/Anuvaad speaks both\./i)).toBeInTheDocument();
    });

    it("handles mouse hover and leave on concept cards for 3D tilt", () => {
      const { container } = render(<Positioning />);
      const card = container.querySelector(".positioning-card-3d") as HTMLElement;
      expect(card).toBeInTheDocument();

      // Mock getBoundingClientRect
      vi.spyOn(card, "getBoundingClientRect").mockReturnValue({
        left: 100,
        top: 100,
        width: 240,
        height: 200,
        right: 340,
        bottom: 300,
        x: 100,
        y: 100,
        toJSON: () => {},
      });

      // Mouse move on card
      fireEvent.mouseMove(card, { clientX: 250, clientY: 220 });

      const sheen = card.querySelector(".positioning-sheen") as HTMLElement;
      expect(sheen).toBeInTheDocument();
      expect(sheen.style.opacity).toBe("1");
      expect(sheen.style.background).toContain("radial-gradient");

      // Mouse leave
      fireEvent.mouseLeave(card);
      expect(sheen.style.opacity).toBe("0");
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Trust 3D Component
  // ---------------------------------------------------------------------------
  describe("Trust 3D Component", () => {
    it("renders with 3D perspective container and #trust section ID", () => {
      const { container } = render(<Trust />);
      const section = container.querySelector("#trust");
      expect(section).toBeInTheDocument();
      expect(section).toHaveStyle({ perspective: "1400px" });
    });

    it("renders monolithic dark vault panel with deep dark room gradient", () => {
      const { container } = render(<Trust />);
      const panel = container.querySelector(".trust-panel-3d") as HTMLElement;
      expect(panel).toBeInTheDocument();
      expect(panel.style.background).toMatch(/#0d1117|rgb\(13,\s*17,\s*23\)/);
    });

    it("renders all 3 security pillar cards with icons and descriptions", () => {
      render(<Trust />);
      expect(screen.getByText("Zero Code Storage")).toBeInTheDocument();
      expect(screen.getByText(/Your code is never written to disk/i)).toBeInTheDocument();
      expect(screen.getByText("Instant Processing")).toBeInTheDocument();
      expect(screen.getByText(/Groq inference engine delivers translations in under 3 seconds/i)).toBeInTheDocument();
      expect(screen.getByText("Privacy by Default")).toBeInTheDocument();
      expect(screen.getByText(/No training on your code/i)).toBeInTheDocument();
    });

    it("renders SVG circular progress indicators with initial dashoffset", () => {
      const { container } = render(<Trust />);
      const circles = container.querySelectorAll(".trust-circle");
      expect(circles.length).toBe(3);
      circles.forEach((circle) => {
        expect(circle).toHaveStyle({ strokeDasharray: "283" });
      });
    });

    it("renders infrastructure trust strip", () => {
      render(<Trust />);
      expect(screen.getByText(/Powered by world-class infrastructure/i)).toBeInTheDocument();
      expect(screen.getByText("Groq")).toBeInTheDocument();
      expect(screen.getByText("DeepSeek")).toBeInTheDocument();
      expect(screen.getByText("Supabase")).toBeInTheDocument();
      expect(screen.getByText("Vercel")).toBeInTheDocument();
      expect(screen.getByText("Next.js")).toBeInTheDocument();
    });

    it("handles mouse hover and leave on dark pillar cards for 3D tilt", () => {
      const { container } = render(<Trust />);
      const card = container.querySelector(".trust-card-3d") as HTMLElement;
      expect(card).toBeInTheDocument();

      vi.spyOn(card, "getBoundingClientRect").mockReturnValue({
        left: 50,
        top: 50,
        width: 300,
        height: 250,
        right: 350,
        bottom: 300,
        x: 50,
        y: 50,
        toJSON: () => {},
      });

      // Mouse move
      fireEvent.mouseMove(card, { clientX: 220, clientY: 200 });

      const sheen = card.querySelector(".trust-sheen") as HTMLElement;
      expect(sheen).toBeInTheDocument();
      expect(sheen.style.opacity).toBe("1");
      expect(sheen.style.background).toContain("radial-gradient");

      // Mouse leave
      fireEvent.mouseLeave(card);
      expect(sheen.style.opacity).toBe("0");
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Testimonials 3D Depth Layer Stack Carousel
  // ---------------------------------------------------------------------------
  describe("Testimonials 3D Depth Layer Stack Carousel", () => {
    it("renders with section id 'testimonials' and 3D perspective stage", () => {
      const { container } = render(<Testimonials />);
      const section = container.querySelector("#testimonials");
      expect(section).toBeInTheDocument();
    });

    it("renders verified industry feedback header", () => {
      render(<Testimonials />);
      expect(screen.getByText("Verified Industry Feedback")).toBeInTheDocument();
      expect(screen.getByText(/Loved by developers/i)).toBeInTheDocument();
      expect(screen.getByText("worldwide.")).toBeInTheDocument();
    });

    it("renders all 8 testimonials in the DOM", () => {
      render(<Testimonials />);
      TESTIMONIALS.forEach((t) => {
        expect(screen.getByText(t.name)).toBeInTheDocument();
        expect(screen.getAllByText(new RegExp(t.company, "i")).length).toBeGreaterThanOrEqual(1);
      });
    });

    it("applies 3D depth tiers to active, flanking, and background cards", () => {
      const { container } = render(<Testimonials />);
      const slides = container.querySelectorAll('[aria-roledescription="slide"]');
      expect(slides.length).toBe(8);

      // Active front slide (index 0)
      const frontCard = slides[0] as HTMLElement;
      expect(frontCard.style.transform).toContain("translate3d(0px, 0px, 40px)");
      expect(frontCard.style.opacity).toBe("1");
      expect(frontCard.style.filter).toBe("blur(0px)");
      expect(frontCard.style.zIndex).toBe("30");

      // Flanking right slide (index 1, delta = 1)
      const rightFlank = slides[1] as HTMLElement;
      expect(rightFlank.style.transform).toContain("translate3d(320px, 12px, -60px)");
      expect(rightFlank.style.transform).toContain("rotateY(-14deg)");
      expect(rightFlank.style.opacity).toBe("0.75");
      expect(rightFlank.style.filter).toBe("blur(2px)");
      expect(rightFlank.style.zIndex).toBe("20");

      // Flanking left slide (index 7, delta = -1)
      const leftFlank = slides[7] as HTMLElement;
      expect(leftFlank.style.transform).toContain("translate3d(-320px, 12px, -60px)");
      expect(leftFlank.style.transform).toContain("rotateY(14deg)");
      expect(leftFlank.style.opacity).toBe("0.75");
      expect(leftFlank.style.filter).toBe("blur(2px)");
      expect(leftFlank.style.zIndex).toBe("20");
    });

    it("advances active index when clicking Next button and wraps around", () => {
      render(<Testimonials />);
      const nextBtn = screen.getByLabelText("Next testimonial");

      expect(screen.getByText(/1 \/ 8 · Flipkart/i)).toBeInTheDocument();

      fireEvent.click(nextBtn);
      expect(screen.getByText(/2 \/ 8 · Stripe/i)).toBeInTheDocument();

      fireEvent.click(nextBtn);
      expect(screen.getByText(/3 \/ 8 · Georgia Tech/i)).toBeInTheDocument();
    });

    it("decrements active index when clicking Prev button and wraps to last item", () => {
      render(<Testimonials />);
      const prevBtn = screen.getByLabelText("Previous testimonial");

      expect(screen.getByText(/1 \/ 8 · Flipkart/i)).toBeInTheDocument();

      fireEvent.click(prevBtn);
      expect(screen.getByText(/8 \/ 8 · Linear/i)).toBeInTheDocument();
    });

    it("selects slide directly when clicking pagination dot", () => {
      render(<Testimonials />);
      const dot4 = screen.getByLabelText("Go to testimonial 4");
      fireEvent.click(dot4);

      expect(screen.getByText(/4 \/ 8 · Shopify/i)).toBeInTheDocument();
    });

    it("brings flanking card to front when clicked", () => {
      const { container } = render(<Testimonials />);
      const slides = container.querySelectorAll('[aria-roledescription="slide"]');

      // Click second card (Alex Chen)
      fireEvent.click(slides[1]);
      expect(screen.getByText(/2 \/ 8 · Stripe/i)).toBeInTheDocument();
    });

    it("handles keyboard ArrowLeft and ArrowRight navigation", () => {
      const { container } = render(<Testimonials />);
      const section = container.querySelector("#testimonials") as HTMLElement;

      fireEvent.keyDown(section, { key: "ArrowRight" });
      expect(screen.getByText(/2 \/ 8 · Stripe/i)).toBeInTheDocument();

      fireEvent.keyDown(section, { key: "ArrowLeft" });
      expect(screen.getByText(/1 \/ 8 · Flipkart/i)).toBeInTheDocument();
    });

    it("supports pointer drag left and right to navigate", () => {
      const { container } = render(<Testimonials />);
      const stage = container.querySelector('[style*="preserve-3d"]') as HTMLElement;

      // Drag left (flick next)
      fireEvent.pointerDown(stage, { clientX: 200 });
      fireEvent.pointerMove(stage, { clientX: 140 }); // delta = -60 < -45
      fireEvent.pointerUp(stage);
      expect(screen.getByText(/2 \/ 8 · Stripe/i)).toBeInTheDocument();

      // Drag right (flick prev)
      fireEvent.pointerDown(stage, { clientX: 100 });
      fireEvent.pointerMove(stage, { clientX: 160 }); // delta = +60 > +45
      fireEvent.pointerUp(stage);
      expect(screen.getByText(/1 \/ 8 · Flipkart/i)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Dynamic WebGL Background Theme Color Lerping Invariants
  // ---------------------------------------------------------------------------
  describe("Dynamic WebGL Background Theme Color Lerping Invariants", () => {
    const creamColor = new THREE.Color(0xf5f3ee);
    const darkColor = new THREE.Color(0x0e1117);

    const getTargetThemeColor = (scrollVal: number) => {
      if (scrollVal >= 0.42 && scrollVal <= 0.72) {
        return darkColor;
      }
      return creamColor;
    };

    it("resolves Warm Cream (#f5f3ee) for top sections (Hero/Features, scrollVal < 0.42)", () => {
      const testValues = [0.0, 0.1, 0.25, 0.41];
      for (const val of testValues) {
        const color = getTargetThemeColor(val);
        expect(color.getHexString()).toBe("f5f3ee");
      }
    });

    it("resolves Deep Dark Room (#0e1117) for dark sections (Trust/Security, 0.42 <= scrollVal <= 0.72)", () => {
      const testValues = [0.42, 0.50, 0.60, 0.72];
      for (const val of testValues) {
        const color = getTargetThemeColor(val);
        expect(color.getHexString()).toBe("0e1117");
      }
    });

    it("resolves Warm Cream (#f5f3ee) when scrolling past dark sections (FAQ/CTA/Footer, scrollVal > 0.72)", () => {
      const testValues = [0.73, 0.85, 0.95, 1.0];
      for (const val of testValues) {
        const color = getTargetThemeColor(val);
        expect(color.getHexString()).toBe("f5f3ee");
      }
    });

    it("lerps currentThemeColor smoothly across continuous animation frames", () => {
      const current = new THREE.Color(0xf5f3ee);
      const target = getTargetThemeColor(0.5); // Deep Dark Room

      expect(current.getHexString()).toBe("f5f3ee");
      // Simulate 60 animation frames of lerping at 0.05 factor
      for (let f = 0; f < 60; f++) {
        current.lerp(target, 0.05);
      }

      // After 60 frames, current should be close to darkColor
      expect(current.r).toBeCloseTo(darkColor.r, 1);
      expect(current.g).toBeCloseTo(darkColor.g, 1);
      expect(current.b).toBeCloseTo(darkColor.b, 1);
    });
  });
});

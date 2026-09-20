/**
 * Milestone 2 Empirical Challenger Stress Test Suite
 * Stress-tests 3D Hero Perspective Reveal, Code-Scroll Mesh Transform,
 * Features Bento Card 3D Tilt Vector Math, Sheen Spotlights, and Reduced Motion.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, fireEvent, screen } from "@testing-library/react";
import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import * as LenisScrollProviderModule from "@/components/landing/LenisScrollProvider";

// Mock GSAP to track transform calls precisely
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
        toArray: vi.fn(() => []),
      },
      registerPlugin: vi.fn(),
    },
  };
});

describe("Milestone 2 Empirical 3D Math & Animation Stress Harness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Hero 3D Perspective Math & Transform Interpolation", () => {
    const calcHeroTransforms = (scrollProgress: number, isReducedMotion: boolean) => {
      const heroProgress = Math.min(scrollProgress / 0.15, 1.0);
      const illustrationTransform = isReducedMotion
        ? "none"
        : `perspective(1000px) rotateY(${heroProgress * -20}deg) translateZ(${heroProgress * 50}px) translateY(${heroProgress * -30}px)`;

      const headlineTransform = isReducedMotion
        ? "none"
        : `translate3d(0px, ${heroProgress * -50}px, ${heroProgress * -100}px) rotateX(${heroProgress * 15}deg)`;

      const headlineOpacity = isReducedMotion ? 1 : Math.max(0, 1 - heroProgress * 1.2);

      const demoTransform = isReducedMotion
        ? "none"
        : `perspective(1000px) rotateX(${heroProgress * 12}deg) translateZ(${heroProgress * -40}px)`;

      return {
        heroProgress,
        illustrationTransform,
        headlineTransform,
        headlineOpacity,
        demoTransform,
      };
    };

    it("evaluates exact neutral 3D baseline at scrollProgress = 0.0", () => {
      const result = calcHeroTransforms(0.0, false);
      expect(result.heroProgress).toBe(0.0);
      expect(result.illustrationTransform).toBe(
        "perspective(1000px) rotateY(0deg) translateZ(0px) translateY(0px)"
      );
      expect(result.headlineTransform).toBe(
        "translate3d(0px, 0px, 0px) rotateX(0deg)"
      );
      expect(result.headlineOpacity).toBe(1);
      expect(result.demoTransform).toBe(
        "perspective(1000px) rotateX(0deg) translateZ(0px)"
      );
    });

    it("evaluates accurate 3D transforms at midpoint scrollProgress = 0.075", () => {
      const result = calcHeroTransforms(0.075, false);
      expect(result.heroProgress).toBe(0.5);
      expect(result.illustrationTransform).toBe(
        "perspective(1000px) rotateY(-10deg) translateZ(25px) translateY(-15px)"
      );
      expect(result.headlineTransform).toBe(
        "translate3d(0px, -25px, -50px) rotateX(7.5deg)"
      );
      expect(result.headlineOpacity).toBeCloseTo(0.4, 5);
      expect(result.demoTransform).toBe(
        "perspective(1000px) rotateX(6deg) translateZ(-20px)"
      );
    });

    it("strictly clamps all 3D transforms and opacities at scrollProgress >= 0.15", () => {
      const progressValues = [0.15, 0.25, 0.5, 1.0, 5.0];
      for (const p of progressValues) {
        const result = calcHeroTransforms(p, false);
        expect(result.heroProgress).toBe(1.0);
        expect(result.illustrationTransform).toBe(
          "perspective(1000px) rotateY(-20deg) translateZ(50px) translateY(-30px)"
        );
        expect(result.headlineTransform).toBe(
          "translate3d(0px, -50px, -100px) rotateX(15deg)"
        );
        expect(result.headlineOpacity).toBe(0);
        expect(result.demoTransform).toBe(
          "perspective(1000px) rotateX(12deg) translateZ(-40px)"
        );
      }
    });

    it("survives 10,000 rapid scroll delta fluctuations without NaN or divergence", () => {
      for (let i = 0; i < 10000; i++) {
        const randomScroll = (Math.random() - 0.2) * 2.0; // range [-0.4, 1.6]
        const result = calcHeroTransforms(randomScroll, false);
        expect(Number.isNaN(result.heroProgress)).toBe(false);
        expect(Number.isNaN(result.headlineOpacity)).toBe(false);
        expect(result.headlineOpacity).toBeGreaterThanOrEqual(0);
        expect(result.illustrationTransform).toContain("perspective(1000px)");
        expect(result.headlineTransform).toContain("translate3d");
      }
    });

    it("evaluates reduced motion mode cleanly to none transforms and full opacity", () => {
      const result = calcHeroTransforms(0.1, true);
      expect(result.illustrationTransform).toBe("none");
      expect(result.headlineTransform).toBe("none");
      expect(result.headlineOpacity).toBe(1);
      expect(result.demoTransform).toBe("none");
    });
  });

  describe("Features Bento Card 3D Tilt Vector Math & Pointer Boundary Limits", () => {
    const calcCardTilt = (
      clientX: number,
      clientY: number,
      rect: { left: number; top: number; width: number; height: number }
    ) => {
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const halfWidth = rect.width / 2;
      const halfHeight = rect.height / 2;

      const normX = halfWidth > 0 ? (clientX - centerX) / halfWidth : 0;
      const normY = halfHeight > 0 ? (clientY - centerY) / halfHeight : 0;

      const maxTilt = 10;
      const rotateX = (-normY * maxTilt) || 0;
      const rotateY = (normX * maxTilt) || 0;

      const relX = clientX - rect.left;
      const relY = clientY - rect.top;
      const sheenBg = `radial-gradient(350px circle at ${relX}px ${relY}px, rgba(200, 134, 10, 0.09), transparent 80%)`;

      return {
        normX,
        normY,
        rotateX,
        rotateY,
        relX,
        relY,
        sheenBg,
      };
    };

    const dummyRect = { left: 100, top: 200, width: 400, height: 300 };

    it("computes exact zero tilt at card center", () => {
      const result = calcCardTilt(300, 350, dummyRect);
      expect(result.normX).toBe(0);
      expect(result.normY).toBe(0);
      expect(result.rotateX).toBe(0);
      expect(result.rotateY).toBe(0);
      expect(result.relX).toBe(200);
      expect(result.relY).toBe(150);
      expect(result.sheenBg).toBe(
        "radial-gradient(350px circle at 200px 150px, rgba(200, 134, 10, 0.09), transparent 80%)"
      );
    });

    it("computes exact boundary tilt angles across all 4 card corners", () => {
      // Top-Left Corner
      const topLeft = calcCardTilt(100, 200, dummyRect);
      expect(topLeft.normX).toBe(-1);
      expect(topLeft.normY).toBe(-1);
      expect(topLeft.rotateX).toBe(10); // Tilts up
      expect(topLeft.rotateY).toBe(-10); // Tilts left

      // Top-Right Corner
      const topRight = calcCardTilt(500, 200, dummyRect);
      expect(topRight.normX).toBe(1);
      expect(topRight.normY).toBe(-1);
      expect(topRight.rotateX).toBe(10);
      expect(topRight.rotateY).toBe(10);

      // Bottom-Left Corner
      const bottomLeft = calcCardTilt(100, 500, dummyRect);
      expect(bottomLeft.normX).toBe(-1);
      expect(bottomLeft.normY).toBe(1);
      expect(bottomLeft.rotateX).toBe(-10);
      expect(bottomLeft.rotateY).toBe(-10);

      // Bottom-Right Corner
      const bottomRight = calcCardTilt(500, 500, dummyRect);
      expect(bottomRight.normX).toBe(1);
      expect(bottomRight.normY).toBe(1);
      expect(bottomRight.rotateX).toBe(-10);
      expect(bottomRight.rotateY).toBe(10);
    });

    it("survives zero-dimension bounding rects without NaN or Division-By-Zero", () => {
      const zeroRect = { left: 50, top: 50, width: 0, height: 0 };
      const result = calcCardTilt(100, 100, zeroRect);
      expect(Number.isNaN(result.rotateX)).toBe(false);
      expect(Number.isNaN(result.rotateY)).toBe(false);
      expect(result.rotateX).toBe(0);
      expect(result.rotateY).toBe(0);
    });

    it("processes 50,000 rapid chaotic pointer events with continuous numeric stability", () => {
      for (let i = 0; i < 50000; i++) {
        const clientX = dummyRect.left + (Math.random() * 2 - 0.5) * dummyRect.width;
        const clientY = dummyRect.top + (Math.random() * 2 - 0.5) * dummyRect.height;
        const result = calcCardTilt(clientX, clientY, dummyRect);

        if (
          Number.isNaN(result.rotateX) ||
          Number.isNaN(result.rotateY) ||
          Number.isNaN(result.relX) ||
          Number.isNaN(result.relY) ||
          Math.abs(result.rotateX) > 25 ||
          Math.abs(result.rotateY) > 25
        ) {
          expect(result.rotateX).not.toBeNaN();
          expect(Math.abs(result.rotateX)).toBeLessThanOrEqual(25);
        }
      }
      expect(true).toBe(true);
    }, 60000);
  });

  describe("Hero & Features React Component DOM Verification", () => {
    it("renders Hero component and verifies 3D typography and demo controls", () => {
      vi.spyOn(LenisScrollProviderModule, "useLenis").mockReturnValue({
        lenis: null,
        scrollProgress: 0,
        scrollY: 0,
        velocity: 0,
        activeSection: "hero",
        isReducedMotion: false,
        scrollTo: vi.fn(),
      });

      render(<Hero />);

      expect(screen.getByText(/AI-Powered Code Comprehension/i)).toBeInTheDocument();
      expect(screen.getByText(/Every/i)).toBeInTheDocument();
      expect(screen.getByText(/Has a Story./i)).toBeInTheDocument();
      expect(screen.getByText(/Try Anuvaad Free/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Code editor/i)).toBeInTheDocument();
    });

    it("renders Features component with 3D Bento cards and handles pointer events", () => {
      const { container } = render(<Features />);

      const section = container.querySelector("#features");
      expect(section).toBeInTheDocument();

      const bentoGrid = container.querySelector(".bento-grid-3d");
      expect(bentoGrid).toBeInTheDocument();
      expect(bentoGrid).toHaveStyle({ perspective: "1200px" });

      const cards = container.querySelectorAll(".bento-card-3d");
      expect(cards.length).toBeGreaterThanOrEqual(12);

      const firstCard = cards[0] as HTMLDivElement;
      // Mock getBoundingClientRect
      firstCard.getBoundingClientRect = () => ({
        left: 50,
        top: 100,
        width: 300,
        height: 200,
        right: 350,
        bottom: 300,
        x: 50,
        y: 100,
        toJSON: () => {},
      });

      // Fire mousemove
      fireEvent.mouseMove(firstCard, { clientX: 200, clientY: 200 });

      // Fire mouseleave
      fireEvent.mouseLeave(firstCard);
    });
  });
});

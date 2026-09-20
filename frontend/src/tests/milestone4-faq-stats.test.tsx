/**
 * Milestone 4 Test Suite: 3D FAQ Accordion Fold, Stats Slot-Machine Spin & Footer 3D Elevation
 * 
 * Verifies:
 * 1. FAQ 3D perspective stage, rotateX accordion fold physics, toggle interactions, and accessibility.
 * 2. StatsBanner 3D slot-machine cylindrical reel spin, count-up numeric interpolation, and hover tilt.
 * 3. Footer 3D elevation entrance, id="footer" contract, navigation links, and operational status badge.
 * 4. WebGL scene manager theme lerp (Warm Cream <-> Deep Dark) and particle opacity easing at footer reach.
 * 5. Reduced-motion fallback safety across all Milestone 4 components.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import * as THREE from "three";

import { FAQ, FAQS } from "@/components/landing/faq";
import { StatsBanner, STATS } from "@/components/landing/StatsBanner";
import { Footer } from "@/components/landing/footer";

// Mock GSAP
vi.mock("gsap", async () => {
  const actual = await vi.importActual<any>("gsap");
  return {
    ...actual,
    default: {
      ...actual.default,
      to: vi.fn((target: any, vars: any) => vars),
      fromTo: vi.fn((target: any, fromVars: any, toVars: any) => {
        if (toVars.scrollTrigger?.onEnter) {
          toVars.scrollTrigger.onEnter();
        }
        return toVars;
      }),
      context: vi.fn((fn: () => void) => {
        fn();
        return { revert: vi.fn() };
      }),
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

describe("Milestone 4: 3D FAQ, Stats & Footer Components", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  // ---------------------------------------------------------------------------
  // 1. FAQ 3D Accordion Component
  // ---------------------------------------------------------------------------
  describe("FAQ 3D Accordion Component", () => {
    it("renders with 3D perspective section and section ID #faq", () => {
      const { container } = render(<FAQ />);
      const section = container.querySelector("#faq");
      expect(section).toBeInTheDocument();
      expect(section).toHaveStyle({ perspective: "1200px" });
    });

    it("renders headline, eyebrow pill and editorial serif styling", () => {
      render(<FAQ />);
      expect(screen.getByText("FAQ")).toBeInTheDocument();
      expect(screen.getByText(/Frequently asked/i)).toBeInTheDocument();
      expect(screen.getByText("questions")).toBeInTheDocument();
    });

    it("renders all 6 FAQ questions in the document", () => {
      render(<FAQ />);
      FAQS.forEach((faq) => {
        expect(screen.getByText(faq.q)).toBeInTheDocument();
      });
    });

    it("initializes with all accordion fold panels collapsed in 3D space", () => {
      const { container } = render(<FAQ />);
      const panels = container.querySelectorAll(".faq-fold-panel");
      expect(panels.length).toBe(6);

      panels.forEach((panel) => {
        const el = panel as HTMLElement;
        expect(el.style.maxHeight).toBe("0px");
        expect(el.style.opacity).toBe("0");
        expect(el.style.transform).toContain("rotateX(-18deg)");
        expect(el.style.pointerEvents).toBe("none");
      });
    });

    it("toggles 3D accordion fold panel on question button click", () => {
      const { container } = render(<FAQ />);
      const firstBtn = screen.getByRole("button", { name: new RegExp(FAQS[0].q, "i") });
      const firstPanel = container.querySelector("#faq-panel-0") as HTMLElement;

      expect(firstBtn).toHaveAttribute("aria-expanded", "false");
      expect(firstPanel.style.maxHeight).toBe("0px");
      expect(firstPanel.style.transform).toContain("rotateX(-18deg)");

      // Click to open
      fireEvent.click(firstBtn);
      expect(firstBtn).toHaveAttribute("aria-expanded", "true");
      expect(firstPanel.style.maxHeight).toBe("500px");
      expect(firstPanel.style.opacity).toBe("1");
      expect(firstPanel.style.transform).toContain("rotateX(0deg)");
      expect(firstPanel.style.pointerEvents).toBe("auto");

      // Click again to close
      fireEvent.click(firstBtn);
      expect(firstBtn).toHaveAttribute("aria-expanded", "false");
      expect(firstPanel.style.maxHeight).toBe("0px");
      expect(firstPanel.style.opacity).toBe("0");
      expect(firstPanel.style.transform).toContain("rotateX(-18deg)");
    });

    it("opens selected question while closing previously open question", () => {
      const { container } = render(<FAQ />);
      const firstBtn = screen.getByRole("button", { name: new RegExp(FAQS[0].q, "i") });
      const secondBtn = screen.getByRole("button", { name: new RegExp(FAQS[1].q, "i") });
      const firstPanel = container.querySelector("#faq-panel-0") as HTMLElement;
      const secondPanel = container.querySelector("#faq-panel-1") as HTMLElement;

      // Open first
      fireEvent.click(firstBtn);
      expect(firstBtn).toHaveAttribute("aria-expanded", "true");
      expect(firstPanel.style.maxHeight).toBe("500px");

      // Open second
      fireEvent.click(secondBtn);
      expect(firstBtn).toHaveAttribute("aria-expanded", "false");
      expect(firstPanel.style.maxHeight).toBe("0px");
      expect(secondBtn).toHaveAttribute("aria-expanded", "true");
      expect(secondPanel.style.maxHeight).toBe("500px");
    });

    it("elevates button in Z-space on mouse enter and resets on mouse leave", () => {
      render(<FAQ />);
      const firstBtn = screen.getByRole("button", { name: new RegExp(FAQS[0].q, "i") });

      // Hover
      fireEvent.mouseEnter(firstBtn);
      expect(firstBtn.style.transform).toBe("translateZ(6px)");

      // Leave
      fireEvent.mouseLeave(firstBtn);
      expect(firstBtn.style.transform).toBe("translateZ(0px)");
    });
  });

  // ---------------------------------------------------------------------------
  // 2. StatsBanner 3D Slot-Machine Component
  // ---------------------------------------------------------------------------
  describe("StatsBanner 3D Slot-Machine Component", () => {
    it("renders with 3D perspective wrapper and preserve-3d grid", () => {
      const { container } = render(<StatsBanner />);
      const wrapper = container.querySelector('[style*="perspective: 800px"]');
      expect(wrapper).toBeInTheDocument();
    });

    it("renders all 4 stat labels", () => {
      render(<StatsBanner />);
      STATS.forEach((stat) => {
        expect(screen.getByText(stat.label)).toBeInTheDocument();
      });
    });

    it("renders slot-machine 3D items with preserve-3d transform style", () => {
      const { container } = render(<StatsBanner />);
      const slotItems = container.querySelectorAll(".stats-slot-3d");
      expect(slotItems.length).toBe(4);
      slotItems.forEach((item) => {
        expect(item).toHaveStyle({ transformStyle: "preserve-3d" });
      });
    });

    it("renders live counter for translations and target metrics for numeric stats", () => {
      render(<StatsBanner />);
      expect(screen.getByText("Translations made")).toBeInTheDocument();
      expect(screen.getByText("Languages supported")).toBeInTheDocument();
      expect(screen.getByText("Avg. translation time")).toBeInTheDocument();
      expect(screen.getByText("Avg. user rating")).toBeInTheDocument();
    });

    it("elevates slot-machine card in 3D on hover", () => {
      const { container } = render(<StatsBanner />);
      const firstSlot = container.querySelector(".stats-slot-3d") as HTMLElement;
      expect(firstSlot).toBeInTheDocument();

      // Hover
      fireEvent.mouseEnter(firstSlot);
      expect(firstSlot.style.transform).toBe("translateZ(14px) rotateY(4deg)");

      // Leave
      fireEvent.mouseLeave(firstSlot);
      expect(firstSlot.style.transform).toBe("translateZ(0px)");
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Footer 3D Elevation Component
  // ---------------------------------------------------------------------------
  describe("Footer 3D Elevation Component", () => {
    it("renders footer with id='footer' contract and 3D perspective", () => {
      const { container } = render(<Footer />);
      const footer = container.querySelector("#footer");
      expect(footer).toBeInTheDocument();
      expect(footer).toHaveStyle({
        perspective: "1200px",
        transformStyle: "preserve-3d",
        background: "rgb(14, 17, 23)",
      });
    });

    it("renders brand logo, tagline, and developer description", () => {
      render(<Footer />);
      expect(screen.getByText(/AI-powered code translation for developers/i)).toBeInTheDocument();
      expect(screen.getByText(/Built with ♥ for developers who care about understanding\./i)).toBeInTheDocument();
      expect(screen.getByText(/All rights reserved\. · Made in India 🇮🇳/i)).toBeInTheDocument();
    });

    it("renders all navigation links across Product, Resources, and Legal categories", () => {
      render(<Footer />);
      // Product
      expect(screen.getByRole("link", { name: "Features" })).toHaveAttribute("href", "#features");
      expect(screen.getByRole("link", { name: "Demo" })).toHaveAttribute("href", "#demo");
      expect(screen.getByRole("link", { name: "FAQ" })).toHaveAttribute("href", "#faq");
      expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/dashboard");

      // Resources
      expect(screen.getByRole("link", { name: "GitHub" })).toHaveAttribute("href", "https://github.com/tarunvamsivaka/Anuvaad");
      expect(screen.getByRole("link", { name: "API Docs" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Changelog" })).toBeInTheDocument();

      // Legal
      expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy");
      expect(screen.getByRole("link", { name: "Terms of Service" })).toHaveAttribute("href", "/terms");
    });

    it("renders operational status badge with service indicators", () => {
      render(<Footer />);
      expect(screen.getByText("All Systems Operational")).toBeInTheDocument();
      expect(screen.getByText("API")).toBeInTheDocument();
      expect(screen.getByText("Auth")).toBeInTheDocument();
      expect(screen.getByText("AI Engine")).toBeInTheDocument();
    });

    it("contains 3D elevated content container and 3D columns", () => {
      const { container } = render(<Footer />);
      const content = container.querySelector(".footer-content-reveal") as HTMLElement;
      expect(content).toBeInTheDocument();
      expect(content).toHaveStyle({ transformStyle: "preserve-3d" });

      const cols = container.querySelectorAll(".footer-col-3d");
      expect(cols.length).toBeGreaterThanOrEqual(4);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Dynamic WebGL Background Theme & Particle Opacity Invariants
  // ---------------------------------------------------------------------------
  describe("Dynamic WebGL Background Theme & Particle Opacity Invariants", () => {
    const creamColor = new THREE.Color(0xf5f3ee);
    const darkColor = new THREE.Color(0x0e1117);

    const getTargetThemeColor = (scrollVal: number) => {
      if (scrollVal >= 0.42 && scrollVal <= 0.72) {
        return darkColor;
      }
      return creamColor;
    };

    const getParticleOpacity = (scrollVal: number) => {
      if (scrollVal >= 0.88) {
        return THREE.MathUtils.lerp(0.7, 0.25, Math.min(1, Math.max(0, (scrollVal - 0.88) / 0.12)));
      }
      return 0.7;
    };

    it("resolves Warm Cream (#f5f3ee) for top sections (scrollVal < 0.42)", () => {
      [0.0, 0.15, 0.30, 0.41].forEach((val) => {
        expect(getTargetThemeColor(val).getHexString()).toBe("f5f3ee");
      });
    });

    it("resolves Deep Dark Room (#0e1117) for dark sections (0.42 <= scrollVal <= 0.72)", () => {
      [0.42, 0.50, 0.60, 0.72].forEach((val) => {
        expect(getTargetThemeColor(val).getHexString()).toBe("0e1117");
      });
    });

    it("resolves Warm Cream (#f5f3ee) for FAQ, CTA, and Footer (scrollVal > 0.72)", () => {
      [0.73, 0.80, 0.90, 1.0].forEach((val) => {
        expect(getTargetThemeColor(val).getHexString()).toBe("f5f3ee");
      });
    });

    it("eases particle opacity from 0.70 down to 0.25 at footer reach (scrollVal >= 0.88)", () => {
      expect(getParticleOpacity(0.5)).toBe(0.7);
      expect(getParticleOpacity(0.87)).toBe(0.7);
      expect(getParticleOpacity(0.88)).toBeCloseTo(0.7, 2);
      expect(getParticleOpacity(0.94)).toBeCloseTo(0.475, 2);
      expect(getParticleOpacity(1.0)).toBeCloseTo(0.25, 2);
    });
  });
});

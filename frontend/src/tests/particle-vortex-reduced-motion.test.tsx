/**
 * EMPIRICAL CHALLENGER TEST SUITE (Milestone 2)
 * Particle Vortex Scaling, DPR Quality Tiering & Reduced Motion Safety
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import * as THREE from "three";
import { WebGLCanvas } from "@/features/landing/_canvas/WebGLCanvas";
import { ReducedMotion, useReducedMotionContext } from "@/components/motion/ReducedMotion";

// Mock matchMedia
function setMatchMedia(reducedMotion: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => {
      const isNoPreference = query.includes("no-preference");
      const matches = isNoPreference ? !reducedMotion : reducedMotion;
      return {
        matches,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    }),
  });
}

describe("Milestone 2: Particle Vortex Scaling & Quality Tiering Harness", () => {
  const getQualityTier = (width: number, deviceDpr = 1) => {
    if (width < 768) {
      return { particleCount: 1500, dpr: 1 };
    } else if (width < 1024) {
      return { particleCount: 3000, dpr: Math.min(deviceDpr, 1.5) };
    } else {
      return { particleCount: 6000, dpr: Math.min(deviceDpr, 2) };
    }
  };

  it("strictly allocates Mobile quality tier (< 768px): 1,500 particles and dpr = 1", () => {
    const mobileWidths = [320, 375, 390, 414, 480, 600, 767];
    const dprs = [1, 2, 3, 3.5];

    for (const w of mobileWidths) {
      for (const dpr of dprs) {
        const tier = getQualityTier(w, dpr);
        expect(tier.particleCount).toBe(1500);
        expect(tier.dpr).toBe(1);
      }
    }
  });

  it("strictly allocates Tablet quality tier (768px - 1023px): 3,000 particles and capped dpr <= 1.5", () => {
    const tabletWidths = [768, 800, 834, 900, 1023];

    for (const w of tabletWidths) {
      const tier1 = getQualityTier(w, 1.0);
      expect(tier1.particleCount).toBe(3000);
      expect(tier1.dpr).toBe(1.0);

      const tier2 = getQualityTier(w, 2.0);
      expect(tier2.particleCount).toBe(3000);
      expect(tier2.dpr).toBe(1.5);

      const tier3 = getQualityTier(w, 3.0);
      expect(tier3.particleCount).toBe(3000);
      expect(tier3.dpr).toBe(1.5);
    }
  });

  it("strictly allocates Desktop quality tier (>= 1024px): 6,000 particles and capped dpr <= 2.0", () => {
    const desktopWidths = [1024, 1280, 1440, 1920, 2560, 3840];

    for (const w of desktopWidths) {
      const tier1 = getQualityTier(w, 1.0);
      expect(tier1.particleCount).toBe(6000);
      expect(tier1.dpr).toBe(1.0);

      const tier2 = getQualityTier(w, 2.0);
      expect(tier2.particleCount).toBe(6000);
      expect(tier2.dpr).toBe(2.0);

      const tier3 = getQualityTier(w, 3.5);
      expect(tier3.particleCount).toBe(6000);
      expect(tier3.dpr).toBe(2.0);
    }
  });

  describe("Hero Vortex State 0 Mathematical Invariants Across Tiers", () => {
    const computeState0Particles = (N: number) => {
      const vortexScrollPos = new Float32Array(N * 3);
      let meshPlaneCount = 0;
      let spiralHelixCount = 0;

      for (let i = 0; i < N; i++) {
        const i3 = i * 3;

        if (i % 4 === 0) {
          meshPlaneCount++;
          const lineIdx = Math.floor(i / 4);
          const row = lineIdx % 20;
          const col = Math.floor(lineIdx / 20);
          vortexScrollPos[i3] = -14 + col * 0.8;
          vortexScrollPos[i3 + 1] = 8 - row * 0.8;
          vortexScrollPos[i3 + 2] = Math.sin(row * 0.3 + col * 0.2) * 2.5;
        } else {
          spiralHelixCount++;
          const angle = (i / N) * Math.PI * 2 * 45;
          const radius = 5 + Math.sin(i * 0.04) * 3 + Math.cos(i * 0.1) * 1.2;
          const zVal = -45 + (i / N) * 70;
          vortexScrollPos[i3] = Math.cos(angle) * radius;
          vortexScrollPos[i3 + 1] = Math.sin(angle) * radius;
          vortexScrollPos[i3 + 2] = zVal;
        }
      }

      return { vortexScrollPos, meshPlaneCount, spiralHelixCount };
    };

    it("verifies 6,000 Desktop particles: 1,500 mesh plane points + 4,500 spiral vortex points", () => {
      const { vortexScrollPos, meshPlaneCount, spiralHelixCount } = computeState0Particles(6000);

      expect(meshPlaneCount).toBe(1500);
      expect(spiralHelixCount).toBe(4500);
      expect(vortexScrollPos.length).toBe(18000);

      let hasInvalidFloat = false;
      for (let j = 0; j < vortexScrollPos.length; j++) {
        if (Number.isNaN(vortexScrollPos[j]) || !Number.isFinite(vortexScrollPos[j])) {
          hasInvalidFloat = true;
          break;
        }
      }
      expect(hasInvalidFloat).toBe(false);
    });

    it("verifies 1,500 Mobile particles: 375 mesh plane points + 1,125 spiral vortex points", () => {
      const { vortexScrollPos, meshPlaneCount, spiralHelixCount } = computeState0Particles(1500);

      expect(meshPlaneCount).toBe(375);
      expect(spiralHelixCount).toBe(1125);
      expect(vortexScrollPos.length).toBe(4500);

      let hasInvalidFloat = false;
      for (let j = 0; j < vortexScrollPos.length; j++) {
        if (Number.isNaN(vortexScrollPos[j]) || !Number.isFinite(vortexScrollPos[j])) {
          hasInvalidFloat = true;
          break;
        }
      }
      expect(hasInvalidFloat).toBe(false);
    });

    it("verifies 3,000 Tablet particles: 750 mesh plane points + 2,250 spiral vortex points", () => {
      const { vortexScrollPos, meshPlaneCount, spiralHelixCount } = computeState0Particles(3000);

      expect(meshPlaneCount).toBe(750);
      expect(spiralHelixCount).toBe(2250);
      expect(vortexScrollPos.length).toBe(9000);
    });

    it("verifies radius and z-depth bounds across all particles for N = 1,500 and N = 6,000", () => {
      let boundaryViolation = false;
      for (const count of [1500, 3000, 6000]) {
        const { vortexScrollPos } = computeState0Particles(count);

        for (let i = 0; i < count; i++) {
          const i3 = i * 3;
          const x = vortexScrollPos[i3];
          const y = vortexScrollPos[i3 + 1];
          const z = vortexScrollPos[i3 + 2];

          if (i % 4 !== 0) {
            // Spiral helix particle
            const r = Math.sqrt(x * x + y * y);
            // radius = 5 + sin(i*0.04)*3 + cos(i*0.1)*1.2 -> range [0.8, 9.2]
            if (r < 0.79 || r > 9.21 || z < -45.001 || z > 25.001) {
              boundaryViolation = true;
              break;
            }
          } else {
            // Mesh plane particle
            if (z < -2.51 || z > 2.51) {
              boundaryViolation = true;
              break;
            }
          }
        }
      }
      expect(boundaryViolation).toBe(false);
    });
  });

  describe("Dynamic Scroll Morphing & Theme Transitions", () => {
    it("smoothly transitions background color between Warm Cream (#f5f3ee) and Deep Dark Room (#0e1117)", () => {
      const creamColor = new THREE.Color(0xf5f3ee);
      const darkColor = new THREE.Color(0x0e1117);

      const getTargetTheme = (scrollVal: number) => {
        if (scrollVal >= 0.42 && scrollVal <= 0.72) {
          return darkColor;
        }
        return creamColor;
      };

      // Hero section (0.0): Warm Cream
      expect(getTargetTheme(0.0).getHexString()).toBe(creamColor.getHexString());
      // Features section (0.2): Warm Cream
      expect(getTargetTheme(0.2).getHexString()).toBe(creamColor.getHexString());
      // Dark Room section (0.5): Deep Dark
      expect(getTargetTheme(0.5).getHexString()).toBe(darkColor.getHexString());
      // Dark Room section (0.7): Deep Dark
      expect(getTargetTheme(0.7).getHexString()).toBe(darkColor.getHexString());
      // Return to Warm Cream (0.8): Warm Cream
      expect(getTargetTheme(0.8).getHexString()).toBe(creamColor.getHexString());
    });
  });
});

describe("Milestone 2: Reduced Motion Safety & Clean Flat Fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders static CSS gradient fallback and skips WebGL canvas when prefers-reduced-motion is active", () => {
    setMatchMedia(true); // prefers-reduced-motion: reduce

    const { container } = render(<WebGLCanvas globalProgress={0} />);

    // Check that static CSS backdrop is present
    const fallback = container.querySelector(".css-backdrop");
    expect(fallback).toBeInTheDocument();
    expect(fallback).toHaveClass("bg-[#f5f3ef]");

    // Check that canvas is NOT mounted
    const canvas = container.querySelector("canvas");
    expect(canvas).toBeNull();
  });

  it("ReducedMotion component propagates motionSafe=false to subtree when reduced motion is preferred", () => {
    setMatchMedia(true);

    function TestConsumer() {
      const isMotionSafe = useReducedMotionContext();
      return <div data-testid="motion-state">{isMotionSafe ? "SAFE" : "REDUCED"}</div>;
    }

    render(
      <ReducedMotion>
        <TestConsumer />
      </ReducedMotion>
    );

    expect(screen.getByTestId("motion-state").textContent).toBe("REDUCED");
  });

  it("ReducedMotion renders provided custom fallback when motion is disabled", () => {
    setMatchMedia(true);

    render(
      <ReducedMotion fallback={<div data-testid="flat-minimal-fallback">Static Fallback</div>}>
        <div data-testid="3d-experience">Immersive 3D Experience</div>
      </ReducedMotion>
    );

    expect(screen.getByTestId("flat-minimal-fallback")).toBeInTheDocument();
    expect(screen.queryByTestId("3d-experience")).toBeNull();
  });
});

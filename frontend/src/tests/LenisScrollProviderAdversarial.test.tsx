/**
 * Adversarial and Stress Tests for LenisScrollProvider & GSAP Ticker Integration.
 * Validates edge cases: fallback behavior, ticker callbacks, scroll targets, unmount cleanup.
 *
 * NOTE (2026-09-30): LenisScrollProvider was refactored to use native scroll listeners
 * instead of the Lenis library. Tests updated to reflect the current native-scroll contract.
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { LenisScrollProvider, useLenis } from "@/components/landing/LenisScrollProvider";

// Mock matchMedia for reduced-motion tests
function setMatchMedia(reducedMotion: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => {
      const matches =
        query.includes("prefers-reduced-motion") ? reducedMotion : !reducedMotion;
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

// Mock motion safety hook
const mockUseMotionSafe = vi.fn().mockReturnValue(true);
vi.mock("@/lib/motion", () => ({
  useMotionSafe: () => mockUseMotionSafe(),
}));

function ComprehensiveConsumer({ onContext }: { onContext?: (ctx: ReturnType<typeof useLenis>) => void }) {
  const ctx = useLenis();
  if (onContext) onContext(ctx);

  return (
    <div>
      <span data-testid="active-section">{ctx.activeSection}</span>
      <span data-testid="scroll-progress">{ctx.scrollProgress}</span>
      <span data-testid="scroll-y">{ctx.scrollY}</span>
      <span data-testid="velocity">{ctx.velocity}</span>
      <span data-testid="reduced-motion">{ctx.isReducedMotion ? "true" : "false"}</span>
      <button data-testid="btn-string" onClick={() => ctx.scrollTo("features")}>
        Scroll String
      </button>
      <button data-testid="btn-number" onClick={() => ctx.scrollTo(500)}>
        Scroll Number
      </button>
    </div>
  );
}

describe("Adversarial LenisScrollProvider Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMotionSafe.mockReturnValue(true);
  });

  it("mounts with default scroll context values (native-scroll mode)", () => {
    // LenisScrollProvider uses native scroll listeners — no Lenis or GSAP ticker
    render(
      <LenisScrollProvider>
        <ComprehensiveConsumer />
      </LenisScrollProvider>
    );

    expect(screen.getByTestId("scroll-progress").textContent).toBe("0");
    expect(screen.getByTestId("scroll-y").textContent).toBe("0");
    expect(screen.getByTestId("velocity").textContent).toBe("0");
    expect(screen.getByTestId("active-section").textContent).toBe("hero");
  });

  it("updates scroll state when native scroll event fires", () => {
    const updateCallback = vi.fn();

    render(
      <LenisScrollProvider onScrollUpdate={updateCallback}>
        <ComprehensiveConsumer />
      </LenisScrollProvider>
    );

    // Simulate a native window scroll event
    act(() => {
      Object.defineProperty(window, "scrollY", { writable: true, value: 200 });
      Object.defineProperty(document.body, "scrollHeight", { writable: true, value: 2000 });
      window.dispatchEvent(new Event("scroll"));
    });

    // After native scroll event fires, scrollY should be updated
    expect(screen.getByTestId("scroll-y").textContent).toBe("200");
  });

  it("falls back cleanly under reduced motion mode", () => {
    setMatchMedia(true); // prefers-reduced-motion: reduce

    const scrollIntoViewMock = vi.fn();
    const testEl = document.createElement("div");
    testEl.id = "features";
    testEl.scrollIntoView = scrollIntoViewMock;
    document.body.appendChild(testEl);

    render(
      <LenisScrollProvider>
        <ComprehensiveConsumer />
      </LenisScrollProvider>
    );

    // Clicking scroll button should use fallback scrollIntoView
    const stringBtn = screen.getByTestId("btn-string");
    fireEvent.click(stringBtn);

    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: "auto" });

    document.body.removeChild(testEl);
  });

  it("cleans up native scroll listener on component unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const { unmount } = render(
      <LenisScrollProvider>
        <ComprehensiveConsumer />
      </LenisScrollProvider>
    );

    unmount();

    // Verify native scroll listener cleanup was called
    expect(removeSpy).toHaveBeenCalledWith("scroll", expect.any(Function));
  });
});

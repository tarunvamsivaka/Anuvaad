/**
 * Adversarial and Stress Tests for LenisScrollProvider & GSAP Ticker Integration.
 * Validates edge cases: fallback behavior, ticker callbacks, scroll targets, unmount cleanup.
 */
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { LenisScrollProvider, useLenis } from "@/components/landing/LenisScrollProvider";
import gsap from "gsap";

// Mock Lenis class with inspection spies
const mockOn = vi.fn();
const mockRaf = vi.fn();
const mockDestroy = vi.fn();
const mockScrollTo = vi.fn();

vi.mock("lenis", () => {
  return {
    default: class MockLenis {
      on = mockOn;
      raf = mockRaf;
      destroy = mockDestroy;
      scrollTo = mockScrollTo;
    },
  };
});

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

  it("synchronizes Lenis RAF callback with GSAP Ticker in milliseconds scale", () => {
    let tickerCb: ((time: number) => void) | null = null;
    const addSpy = vi.spyOn(gsap.ticker, "add").mockImplementation((cb: any) => {
      tickerCb = cb;
      return cb;
    });

    render(
      <LenisScrollProvider>
        <ComprehensiveConsumer />
      </LenisScrollProvider>
    );

    expect(addSpy).toHaveBeenCalled();
    expect(tickerCb).not.toBeNull();

    // Execute ticker callback with 1.5 seconds elapsed time
    if (tickerCb) {
      (tickerCb as (t: number) => void)(1.5);
      // Expected: time in seconds (1.5) converted to milliseconds (1500)
      expect(mockRaf).toHaveBeenCalledWith(1500);
    }
  });

  it("updates scroll state when Lenis fires scroll event", () => {
    let scrollCallback: ((...args: any[]) => void) | null = null;
    mockOn.mockImplementation((event: string, cb: (...args: any[]) => void) => {
      if (event === "scroll") {
        scrollCallback = cb;
      }
    });

    const updateCallback = vi.fn();

    render(
      <LenisScrollProvider onScrollUpdate={updateCallback}>
        <ComprehensiveConsumer />
      </LenisScrollProvider>
    );

    expect(scrollCallback).not.toBeNull();

    // Trigger synthetic Lenis scroll event
    act(() => {
      if (scrollCallback) {
        scrollCallback({ progress: 0.45, scroll: 900, velocity: 1.2 });
      }
    });

    expect(screen.getByTestId("scroll-progress").textContent).toBe("0.45");
    expect(screen.getByTestId("scroll-y").textContent).toBe("900");
    expect(screen.getByTestId("velocity").textContent).toBe("1.2");
    expect(updateCallback).toHaveBeenCalledWith({
      progress: 0.45,
      scrollY: 900,
      velocity: 1.2,
      activeSection: "hero",
    });
  });

  it("falls back cleanly under reduced motion mode", () => {
    mockUseMotionSafe.mockReturnValue(false); // reduced motion enabled

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

    expect(screen.getByTestId("reduced-motion").textContent).toBe("true");

    // Clicking scroll button should use fallback scrollIntoView
    const stringBtn = screen.getByTestId("btn-string");
    fireEvent.click(stringBtn);

    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: "smooth" });

    document.body.removeChild(testEl);
  });

  it("cleans up GSAP ticker and Lenis on component unmount", () => {
    const removeSpy = vi.spyOn(gsap.ticker, "remove");

    const { unmount } = render(
      <LenisScrollProvider>
        <ComprehensiveConsumer />
      </LenisScrollProvider>
    );

    unmount();

    expect(removeSpy).toHaveBeenCalled();
    expect(mockDestroy).toHaveBeenCalled();
  });
});

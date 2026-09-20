/**
 * Unit tests for LenisScrollProvider component.
 * Verifies rendering, children propagation, and context value accessibility.
 */
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LenisScrollProvider, useLenis } from "@/components/landing/LenisScrollProvider";

// Mock Lenis class to avoid WebGL / window scroll errors in jsdom
vi.mock("lenis", () => {
  return {
    default: class MockLenis {
      on = vi.fn();
      raf = vi.fn();
      destroy = vi.fn();
      scrollTo = vi.fn();
    },
  };
});

function TestConsumer() {
  const { activeSection, isReducedMotion, scrollTo } = useLenis();
  return (
    <div>
      <span data-testid="active-section">{activeSection}</span>
      <span data-testid="reduced-motion">{isReducedMotion ? "true" : "false"}</span>
      <button data-testid="scroll-btn" onClick={() => scrollTo("features")}>
        Scroll
      </button>
    </div>
  );
}

describe("LenisScrollProvider", () => {
  it("renders children cleanly without error", () => {
    render(
      <LenisScrollProvider>
        <div data-testid="child-element">Test Content</div>
      </LenisScrollProvider>
    );

    expect(screen.getByTestId("child-element")).toBeTruthy();
    expect(screen.getByTestId("child-element").textContent).toBe("Test Content");
  });

  it("provides default context values to consumer components", () => {
    render(
      <LenisScrollProvider>
        <TestConsumer />
      </LenisScrollProvider>
    );

    expect(screen.getByTestId("active-section").textContent).toBe("hero");
  });

  it("handles scrollTo triggering without throwing exceptions", () => {
    render(
      <LenisScrollProvider>
        <TestConsumer />
      </LenisScrollProvider>
    );

    const btn = screen.getByTestId("scroll-btn");
    expect(() => btn.click()).not.toThrow();
  });
});

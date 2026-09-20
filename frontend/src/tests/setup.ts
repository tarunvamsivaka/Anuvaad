/**
 * TEST-02/04: Vitest global test setup.
 * Configures @testing-library/jest-dom matchers and clears mocks between tests.
 */
import "@testing-library/jest-dom";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Cleanup React component renders between tests
afterEach(() => {
  cleanup();
});

// Mock Next.js router globally
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock window.matchMedia for jsdom environment
if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("prefers-reduced-motion: no-preference"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Mock ResizeObserver for jsdom environment
if (typeof window !== "undefined" && !window.ResizeObserver) {
  class MockResizeObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }
  window.ResizeObserver = MockResizeObserver as any;
}

// Mock IntersectionObserver for jsdom environment
if (typeof window !== "undefined" && !window.IntersectionObserver) {
  class MockIntersectionObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }
  window.IntersectionObserver = MockIntersectionObserver as any;
}

// Mock WebGLRenderingContext stubs for jsdom environment
if (typeof window !== "undefined") {
  if (!window.WebGLRenderingContext) {
    (window as any).WebGLRenderingContext = function () {};
  }
  if (!window.WebGLRenderingContext.prototype.getShaderPrecisionFormat) {
    window.WebGLRenderingContext.prototype.getShaderPrecisionFormat = vi.fn().mockReturnValue({
      rangeMin: 127,
      rangeMax: 127,
      precision: 23,
    });
  }
}


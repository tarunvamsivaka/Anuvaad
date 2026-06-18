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

// Mock Next.js Image component
vi.mock("next/image", () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string }) => {
     
    return Object.assign(document.createElement("img"), { src, alt, ...props });
  },
}));

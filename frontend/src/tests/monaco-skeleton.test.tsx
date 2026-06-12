/**
 * TEST-02/04 (4.3): Unit tests for the MonacoSkeleton component.
 * Verifies it renders without errors and has correct accessibility attributes.
 */
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MonacoSkeleton } from "@/components/ui/monaco-skeleton";

describe("MonacoSkeleton", () => {
  it("renders without crashing", () => {
    const { container } = render(<MonacoSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it("has aria-hidden to hide from screen readers (decorative skeleton)", () => {
    const { container } = render(<MonacoSkeleton />);
    const skeleton = container.querySelector("[aria-hidden]");
    expect(skeleton).toBeTruthy();
    expect(skeleton?.getAttribute("aria-hidden")).toBe("true");
  });

  it("has role=presentation (decorative, not interactive)", () => {
    const { container } = render(<MonacoSkeleton />);
    const skeleton = container.querySelector("[role='presentation']");
    expect(skeleton).toBeTruthy();
  });

  it("renders correct number of code lines", () => {
    const { container } = render(<MonacoSkeleton lines={10} />);
    // Each line renders two elements (gutter + code), check a structural element
    // The gutter div and code div both have `lines` items
    const gutterItems = container.querySelectorAll(
      ".shrink-0.w-10 > div"
    );
    expect(gutterItems.length).toBe(10);
  });

  it("renders default 14 lines when lines prop is omitted", () => {
    const { container } = render(<MonacoSkeleton />);
    const gutterItems = container.querySelectorAll(".shrink-0.w-10 > div");
    expect(gutterItems.length).toBe(14);
  });

  it("accepts custom line count", () => {
    const { container } = render(<MonacoSkeleton lines={20} />);
    const gutterItems = container.querySelectorAll(".shrink-0.w-10 > div");
    expect(gutterItems.length).toBe(20);
  });
});

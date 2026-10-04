import { describe, expect, it } from "vitest";

// braces is CommonJS, so require keeps its public API shape explicit here.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const braces = require("braces") as {
  (pattern: string): string[];
  compile(pattern: string): string;
  expand(pattern: string): string[];
};

describe("braces parser nesting limit", () => {
  it("keeps ordinary brace patterns working", () => {
    expect(braces.compile("{a,b}")).toBe("(a|b)");
  });

  it("rejects deeply nested patterns before recursive walkers run", () => {
    const pattern = "{".repeat(150) + "value" + "}".repeat(150);

    expect(() => braces.compile(pattern)).toThrow(/Nesting depth exceeds maximum/);
    expect(() => braces.expand(pattern)).toThrow(/Nesting depth exceeds maximum/);
  });

  it("bounds nested parentheses as well as braces", () => {
    const pattern = "(".repeat(150) + "value" + ")".repeat(150);

    expect(() => braces.compile(pattern)).toThrow(/Nesting depth exceeds maximum/);
  });
});

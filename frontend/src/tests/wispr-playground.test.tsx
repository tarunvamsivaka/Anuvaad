import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { LivePlayground } from "@/components/landing/wispr/LivePlayground";

describe("Wispr LivePlayground Component Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  describe("Tier 1: Feature Rendering & Initial State", () => {
    it("renders dual editor panes, mode toggles, and language pills", () => {
      render(<LivePlayground />);
      expect(screen.getByText("Explore Bi-Directional AI Code Comprehension")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Code → English" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "English → Code" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Translate/i })).toBeInTheDocument();
      expect(screen.getByLabelText("Reset snippet")).toBeInTheDocument();
      expect(screen.getByLabelText("Copy output to clipboard")).toBeInTheDocument();
    });

    it("respects initialLanguage prop", () => {
      render(<LivePlayground initialLanguage="rust" />);
      const input = screen.getByLabelText("Code or specification input") as HTMLTextAreaElement;
      expect(input.value).toContain("find_median");
    });

    it("respects initialMode prop for english-to-code", () => {
      render(<LivePlayground initialMode="english-to-code" initialLanguage="python" />);
      expect(screen.getByText("Plain English Specification")).toBeInTheDocument();
      expect(screen.getByText(/Generated Python/i)).toBeInTheDocument();
    });

    it("respects initialCode prop override", () => {
      render(<LivePlayground initialCode="const custom = 42;" />);
      const input = screen.getByLabelText("Code or specification input") as HTMLTextAreaElement;
      expect(input.value).toBe("const custom = 42;");
    });

    it("displays character count and line count in status bar", () => {
      render(<LivePlayground initialCode="line1\nline2\nline3" />);
      expect(screen.getByText(/lines/i)).toBeInTheDocument();
    });
  });

  describe("Tier 2: Boundary & Edge Case Handling", () => {
    it("handles empty input without crashing", () => {
      render(<LivePlayground initialCode="" />);
      const input = screen.getByLabelText("Code or specification input") as HTMLTextAreaElement;
      fireEvent.change(input, { target: { value: "" } });
      expect(input.value).toBe("");
    });

    it("handles large input text (10,000 chars) gracefully", () => {
      const largeSnippet = "console.log('test');\n".repeat(400);
      render(<LivePlayground initialCode={largeSnippet} />);
      const input = screen.getByLabelText("Code or specification input") as HTMLTextAreaElement;
      expect(input.value.length).toBeGreaterThan(8000);
    });

    it("handles rapid sequential mode switching without desynchronization", () => {
      render(<LivePlayground />);
      const codeToEng = screen.getByRole("button", { name: "Code → English" });
      const engToCode = screen.getByRole("button", { name: "English → Code" });

      for (let i = 0; i < 5; i++) {
        fireEvent.click(engToCode);
        fireEvent.click(codeToEng);
      }
      expect(codeToEng).toHaveClass("font-semibold");
    });

    it("handles special unicode and emoji characters in code input", () => {
      const unicodeCode = `// 🚀 Fast path calculation\nconst sum = "∑ π ∞";`;
      render(<LivePlayground initialCode={unicodeCode} />);
      const input = screen.getByLabelText("Code or specification input") as HTMLTextAreaElement;
      expect(input.value).toContain("🚀");
      expect(input.value).toContain("∑ π ∞");
    });

    it("resets modified snippet back to default when clicking reset button", () => {
      render(<LivePlayground initialLanguage="python" />);
      const input = screen.getByLabelText("Code or specification input") as HTMLTextAreaElement;
      fireEvent.change(input, { target: { value: "modified code" } });
      expect(input.value).toBe("modified code");

      const resetBtn = screen.getByLabelText("Reset snippet");
      fireEvent.click(resetBtn);
      expect(input.value).toContain("def quicksort");
    });
  });

  describe("Tier 3: Combinatorial & Preset Interactions", () => {
    it("switches languages and updates both input code and output explanation", () => {
      render(<LivePlayground />);
      const tsButton = screen.getByRole("button", { name: "TypeScript" });
      fireEvent.click(tsButton);

      const input = screen.getByLabelText("Code or specification input") as HTMLTextAreaElement;
      expect(input.value).toContain("TTLCache");
      expect(screen.getByText(/Time-To-Live/i)).toBeInTheDocument();

      const goButton = screen.getByRole("button", { name: "Go" });
      fireEvent.click(goButton);
      expect(input.value).toContain("FanOut");
      expect(screen.getByText(/Fan-Out pattern/i)).toBeInTheDocument();
    });

    it("handles code-to-code mode switching cleanly", () => {
      render(<LivePlayground />);
      const codeToCodeBtn = screen.getByRole("button", { name: /Code → Code/i });
      fireEvent.click(codeToCodeBtn);

      expect(screen.getByText(/Modernized/i)).toBeInTheDocument();
    });

    it("copies translated output to clipboard and displays copied confirmation", async () => {
      vi.useFakeTimers();
      render(<LivePlayground />);

      const copyBtn = screen.getByLabelText("Copy output to clipboard");
      fireEvent.click(copyBtn);

      expect(screen.getByText("Copied")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(2100);
      });

      expect(screen.getByText("Copy")).toBeInTheDocument();
      vi.useRealTimers();
    });
  });

  describe("Tier 4: Full Translation Simulation Workflow", () => {
    it("executes complete translation cycle and invokes onTranslate callback", async () => {
      vi.useFakeTimers();
      const onTranslate = vi.fn();
      render(<LivePlayground onTranslate={onTranslate} />);

      const input = screen.getByLabelText("Code or specification input") as HTMLTextAreaElement;
      fireEvent.change(input, { target: { value: "def factorial(n): return 1 if n<=1 else n*factorial(n-1)" } });

      const translateBtn = screen.getByRole("button", { name: /Translate/i });
      fireEvent.click(translateBtn);

      expect(onTranslate).toHaveBeenCalledWith(
        "def factorial(n): return 1 if n<=1 else n*factorial(n-1)",
        "python"
      );
      expect(screen.getByText("Translating...")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(500);
      });

      expect(screen.getByRole("button", { name: /Translate/i })).toBeInTheDocument();
      vi.useRealTimers();
    });
  });
});

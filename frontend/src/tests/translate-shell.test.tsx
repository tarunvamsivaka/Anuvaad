import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TranslateShell } from "@/features/translate/_components/TranslateShell";

vi.mock("@/features/translate/_components/ChatInterface", () => ({ ChatInterface: () => null }));
vi.mock("@/features/translate/_components/Sidebar", () => ({ Sidebar: () => null }));

describe("TranslateShell responsive pane navigation", () => {
  it("switches between labeled input and output panels on narrow layouts", () => {
    render(
      <TranslateShell
        currentModeLabel="Code to English"
        showSettings={false}
        setShowSettings={vi.fn()}
        isPro={false}
        creditsLoading={false}
        credits={10}
        customInstructions=""
        setCustomInstructions={vi.fn()}
        repositoryName=""
        setRepositoryName={vi.fn()}
        filePath=""
        setFilePath={vi.fn()}
        toolbar={<div />}
        inputPanel={<div>Input editor content</div>}
        outputPanel={<div>Generated output content</div>}
      />
    );

    const inputTab = screen.getByRole("tab", { name: "Input" });
    const outputTab = screen.getByRole("tab", { name: "Output" });
    expect(inputTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "Input" })).not.toHaveClass("hidden");
    expect(screen.getByRole("tabpanel", { name: "Output" })).toHaveClass("hidden");

    fireEvent.click(outputTab);
    expect(outputTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "Output" })).not.toHaveClass("hidden");
    expect(screen.getByRole("tabpanel", { name: "Input" })).toHaveClass("hidden");
  });
});

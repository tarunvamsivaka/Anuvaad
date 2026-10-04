import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BenchmarkExplorer } from "@/components/landing/wispr/BenchmarkExplorer";
import { BENCHMARK_DATA } from "@/components/landing/wispr/data/benchmark-data";

describe("LanguageExplorer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders example languages without presenting unverified benchmark metrics", () => {
    render(<BenchmarkExplorer />);
    expect(screen.getByRole("heading", { name: "Find your language." })).toBeInTheDocument();
    expect(screen.getByLabelText("Filter programming languages")).toBeInTheDocument();
    expect(BENCHMARK_DATA.length).toBeGreaterThanOrEqual(35);
    expect(screen.getByText("Rust")).toBeInTheDocument();
    expect(screen.queryByText(/latency|accuracy|tok\/s/i)).not.toBeInTheDocument();
  });

  it("respects the initial category and exposes selected filter state", () => {
    render(<BenchmarkExplorer initialCategory="Systems" />);
    expect(screen.getByText("Rust")).toBeInTheDocument();
    expect(screen.queryByText("Elixir")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Systems" })).toHaveAttribute("aria-pressed", "true");
  });

  it("filters the list by language and category", () => {
    const onFilter = vi.fn();
    render(<BenchmarkExplorer onFilterLanguage={onFilter} />);
    fireEvent.click(screen.getByRole("button", { name: "DevOps" }));
    expect(screen.getByText("Terraform HCL")).toBeInTheDocument();
    expect(screen.queryByText("Python")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Filter programming languages"), { target: { value: "Kubernetes" } });
    expect(onFilter).toHaveBeenCalledWith("Kubernetes");
    expect(screen.getByText("Kubernetes YAML")).toBeInTheDocument();
    expect(screen.queryByText("Terraform HCL")).not.toBeInTheDocument();
  });

  it("provides a helpful empty-search state", () => {
    render(<BenchmarkExplorer />);
    fireEvent.change(screen.getByLabelText("Filter programming languages"), { target: { value: "not-a-language" } });
    expect(screen.getByRole("status")).toHaveTextContent("No languages match that search");
  });
});

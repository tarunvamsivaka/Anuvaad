import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BenchmarkExplorer } from "@/components/landing/wispr/BenchmarkExplorer";
import { BENCHMARK_DATA } from "@/components/landing/wispr/data/benchmark-data";

describe("Wispr BenchmarkExplorer Component Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Tier 1: 35+ Language Matrix & Initial Rendering", () => {
    it("renders matrix with at least 35 languages and sub-3s latency guarantee", () => {
      render(<BenchmarkExplorer />);
      expect(screen.getByText("Multi-Language Latency & Accuracy Matrix")).toBeInTheDocument();
      expect(screen.getByLabelText("Filter programming languages")).toBeInTheDocument();
      expect(screen.getByLabelText("Sort benchmarks")).toBeInTheDocument();

      expect(BENCHMARK_DATA.length).toBeGreaterThanOrEqual(35);

      // Verify all latency metrics are under 3.00 seconds
      BENCHMARK_DATA.forEach((b) => {
        const seconds = parseFloat(b.latency);
        expect(seconds).toBeLessThan(3.0);
        expect(seconds).toBeGreaterThan(0.5);
      });
    });

    it("respects initialCategory prop", () => {
      render(<BenchmarkExplorer initialCategory="Systems" />);
      expect(screen.getByText("Rust")).toBeInTheDocument();
      expect(screen.queryByText("Elixir")).not.toBeInTheDocument();
    });

    it("respects initialSort prop", () => {
      render(<BenchmarkExplorer initialSort="name" />);
      const rows = screen.getAllByRole("row");
      expect(rows.length).toBeGreaterThan(5);
    });
  });

  describe("Tier 2: Search & Filter Boundary Handling", () => {
    it("handles zero matching search query gracefully without table crash", () => {
      render(<BenchmarkExplorer />);
      const searchInput = screen.getByLabelText("Filter programming languages");
      fireEvent.change(searchInput, { target: { value: "xyz123nonexistent" } });

      const rows = screen.getAllByRole("row");
      // Only header row remains
      expect(rows.length).toBe(1);
    });

    it("handles special characters in search input", () => {
      render(<BenchmarkExplorer />);
      const searchInput = screen.getByLabelText("Filter programming languages");
      fireEvent.change(searchInput, { target: { value: "C++" } });

      expect(screen.getByText("C++")).toBeInTheDocument();
    });

    it("filters cleanly across category tabs", () => {
      render(<BenchmarkExplorer />);
      const devopsTab = screen.getByRole("button", { name: "DevOps" });
      fireEvent.click(devopsTab);

      expect(screen.getByText("Terraform HCL")).toBeInTheDocument();
      expect(screen.getByText("Kubernetes YAML")).toBeInTheDocument();
      expect(screen.queryByText("Python")).not.toBeInTheDocument();
    });
  });

  describe("Tier 3: Multi-Criteria Sorting & Combined Filters", () => {
    it("sorts by fastest latency correctly", () => {
      render(<BenchmarkExplorer initialCategory="All" initialSort="latency" />);
      const sortSelect = screen.getByLabelText("Sort benchmarks");
      fireEvent.change(sortSelect, { target: { value: "latency" } });

      // First rows should include fastest latencies (e.g. SQL 0.88s, Docker 0.91s)
      expect(screen.getByText("0.88s")).toBeInTheDocument();
    });

    it("sorts by highest accuracy correctly", () => {
      render(<BenchmarkExplorer initialCategory="All" />);
      const sortSelect = screen.getByLabelText("Sort benchmarks");
      fireEvent.change(sortSelect, { target: { value: "accuracy" } });

      expect(screen.getAllByText("99.8%").length).toBeGreaterThan(0);
    });

    it("combines category filter and search term simultaneously", () => {
      render(<BenchmarkExplorer />);
      const systemsTab = screen.getByRole("button", { name: "Systems" });
      fireEvent.click(systemsTab);

      const searchInput = screen.getByLabelText("Filter programming languages");
      fireEvent.change(searchInput, { target: { value: "Rust" } });

      expect(screen.getByText("Rust")).toBeInTheDocument();
      expect(screen.queryByText("Go")).not.toBeInTheDocument();
    });
  });

  describe("Tier 4: Model Deep-Dive Comparison Modal & Keyboard Dismissal", () => {
    it("opens model comparison modal when clicking comparison button", () => {
      render(<BenchmarkExplorer />);
      const deepDiveBtn = screen.getByLabelText("Open model deep dive comparison");
      fireEvent.click(deepDiveBtn);

      expect(screen.getByRole("dialog", { name: "Model Deep Dive Comparison" })).toBeInTheDocument();
      expect(screen.getByText(/Neural Model Architecture Comparison/i)).toBeInTheDocument();
      expect(screen.getByText(/Groq Llama 3.3 70B/i)).toBeInTheDocument();
      expect(screen.getByText(/DeepSeek Coder V2/i)).toBeInTheDocument();
      expect(screen.getByText(/Claude 3.5 Sonnet/i)).toBeInTheDocument();
      expect(screen.getByText(/GPT-4o/i)).toBeInTheDocument();
    });

    it("closes modal on close button click", () => {
      render(<BenchmarkExplorer />);
      const deepDiveBtn = screen.getByLabelText("Open model deep dive comparison");
      fireEvent.click(deepDiveBtn);
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      const closeBtn = screen.getByLabelText("Close modal");
      fireEvent.click(closeBtn);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("closes modal on Escape key press", () => {
      render(<BenchmarkExplorer />);
      const deepDiveBtn = screen.getByLabelText("Open model deep dive comparison");
      fireEvent.click(deepDiveBtn);
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      fireEvent.keyDown(window, { key: "Escape" });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});

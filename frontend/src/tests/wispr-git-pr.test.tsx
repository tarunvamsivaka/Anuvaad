import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { GitPrWorkflowDemo } from "@/components/landing/wispr/GitPrWorkflowDemo";

describe("Wispr GitPrWorkflowDemo Component Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Tier 1: PR Header Metadata & Structure", () => {
    it("renders PR title, branch info, and open status badge", () => {
      render(<GitPrWorkflowDemo />);
      expect(screen.getByText(/PR #142: Core Architecture/i)).toBeInTheDocument();
      expect(screen.getByText("feat/redis-session-jwks")).toBeInTheDocument();
      expect(screen.getByText("Open")).toBeInTheDocument();
      expect(screen.getByText(/Changed Files \(3\)/i)).toBeInTheDocument();
    });

    it("renders all 3 file entries in file list", () => {
      render(<GitPrWorkflowDemo />);
      expect(screen.getByText("src/auth/session_manager.ts")).toBeInTheDocument();
      expect(screen.getByText("src/database/pool_manager.go")).toBeInTheDocument();
      expect(screen.getByText("api/routes/translator.py")).toBeInTheDocument();
    });

    it("respects initialFile prop", () => {
      render(<GitPrWorkflowDemo initialFile="db-pool" />);
      expect(screen.getByText(/Introduces connection pooling/i)).toBeInTheDocument();
      expect(screen.getByText(/Risk Rating: Medium/i)).toBeInTheDocument();
    });

    it("renders AI review summary box with risk rating", () => {
      render(<GitPrWorkflowDemo />);
      expect(screen.getByText("Anuvaad AI Review Summary")).toBeInTheDocument();
      expect(screen.getByText(/Migrates session validation/i)).toBeInTheDocument();
      expect(screen.getByText("Risk Rating: Low")).toBeInTheDocument();
    });
  });

  describe("Tier 2: File Navigation & State Isolation", () => {
    it("switches active file when clicked and fires onSelectDiff callback", () => {
      const onSelect = vi.fn();
      render(<GitPrWorkflowDemo onSelectDiff={onSelect} />);

      const pyFileBtn = screen.getByText("api/routes/translator.py");
      fireEvent.click(pyFileBtn);

      expect(onSelect).toHaveBeenCalledWith("api-router");
      expect(screen.getByText(/Adds rate-limiting middleware/i)).toBeInTheDocument();
    });

    it("maintains isolated diff and summary states across file switches", () => {
      render(<GitPrWorkflowDemo />);
      expect(screen.getByText(/jwtVerify\(token, JWKS_KEYSET\)/i)).toBeInTheDocument();

      const goFileBtn = screen.getByText("src/database/pool_manager.go");
      fireEvent.click(goFileBtn);
      expect(screen.getByText(/Acquire\(ctx context\.Context\)/i)).toBeInTheDocument();
      expect(screen.queryByText(/jwtVerify/i)).not.toBeInTheDocument();
    });
  });

  describe("Tier 3: Interactive Action Triggers", () => {
    it("toggles AI refactor suggestion into the diff viewer", () => {
      render(<GitPrWorkflowDemo />);
      const suggestionBtn = screen.getByRole("button", { name: /Accept Suggestion/i });
      fireEvent.click(suggestionBtn);

      expect(screen.getByRole("button", { name: /Suggestion Applied/i })).toBeInTheDocument();
      expect(screen.getByText(/Anuvaad AI Refactor: Added constant-time/i)).toBeInTheDocument();

      // Click again to revert
      fireEvent.click(screen.getByRole("button", { name: /Suggestion Applied/i }));
      expect(screen.getByRole("button", { name: /Accept Suggestion/i })).toBeInTheDocument();
    });

    it("toggles generated automated test suite", () => {
      render(<GitPrWorkflowDemo />);
      const testBtn = screen.getByRole("button", { name: /Generate Tests/i });
      fireEvent.click(testBtn);

      expect(screen.getByText(/Generated Automated Test Suite/i)).toBeInTheDocument();
      expect(screen.getByText(/rejects expired token before contacting redis/i)).toBeInTheDocument();

      // Click again to hide
      fireEvent.click(screen.getByRole("button", { name: /Hide Tests/i }));
      expect(screen.queryByText(/Generated Automated Test Suite/i)).not.toBeInTheDocument();
    });

    it("toggles plain-English executive explanation for non-technical stakeholders", () => {
      render(<GitPrWorkflowDemo />);
      const explainBtn = screen.getByRole("button", { name: /Explain Diff/i });
      fireEvent.click(explainBtn);

      expect(screen.getByText(/Executive Plain-English Summary/i)).toBeInTheDocument();
      expect(screen.getByText(/This change upgrades how user logins are validated/i)).toBeInTheDocument();

      // Click again to hide
      fireEvent.click(screen.getByRole("button", { name: /Hide Explanation/i }));
      expect(screen.queryByText(/Executive Plain-English Summary/i)).not.toBeInTheDocument();
    });
  });

  describe("Tier 4: Complete PR Review & Approval Lifecycle", () => {
    it("runs CI/CD simulation and transitions to verified status", () => {
      vi.useFakeTimers();
      render(<GitPrWorkflowDemo />);

      const ciBtn = screen.getByLabelText("Run CI simulation");
      fireEvent.click(ciBtn);

      expect(screen.getByText("Running SAST...")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(700);
      });

      expect(screen.getByText("CI 100% Passed")).toBeInTheDocument();
      vi.useRealTimers();
    });

    it("approves PR and changes status badge to Approved", () => {
      render(<GitPrWorkflowDemo />);
      const approveBtn = screen.getByLabelText("Approve PR");
      fireEvent.click(approveBtn);

      const approvedElements = screen.getAllByText("Approved");
      expect(approvedElements.length).toBeGreaterThanOrEqual(1);
    });

    it("resets PR workflow state cleanly on reset button click", () => {
      render(<GitPrWorkflowDemo />);
      const approveBtn = screen.getByLabelText("Approve PR");
      fireEvent.click(approveBtn);
      expect(screen.getAllByText("Approved").length).toBeGreaterThanOrEqual(1);

      const resetBtn = screen.getByLabelText("Reset PR demo");
      fireEvent.click(resetBtn);
      expect(screen.getByText("Open")).toBeInTheDocument();
    });
  });
});

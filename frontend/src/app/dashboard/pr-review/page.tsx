"use client";

import React, { useState } from "react";
import {
  GitPullRequest,
  CheckCircle2,
  Sparkles,
  Check,
  FileCode2,
  HelpCircle,
  RotateCcw,
  UploadCloud,
  FileText,
  Copy,
  CheckCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TopBar } from "@/components/dashboard/TopBar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PR_FILES } from "@/components/landing/wispr/data/pr-demo-data";
import { toast } from "sonner";

export default function PrReviewPage() {
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [suggestionAccepted, setSuggestionAccepted] = useState<Record<string, boolean>>({});
  const [showTests, setShowTests] = useState(false);
  const [showExplain, setShowExplain] = useState(false);
  const [ciStatus, setCiStatus] = useState<"passed" | "running" | "verified">("passed");
  const [prStatus, setPrStatus] = useState<"Open" | "Approved">("Open");
  const [customDiffMode, setCustomDiffMode] = useState(false);
  const [customDiffText, setCustomDiffText] = useState("");
  const [customAnalysis, setCustomAnalysis] = useState<{
    risk: "Low" | "Medium" | "High";
    summary: string;
    suggestions: string;
    tests: string;
  } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [copied, setCopied] = useState(false);

  const activeFile = PR_FILES[activeFileIndex] || PR_FILES[0];
  const isAccepted = !!suggestionAccepted[activeFile.id];

  const handleToggleSuggestion = () => {
    setSuggestionAccepted((prev) => ({
      ...prev,
      [activeFile.id]: !prev[activeFile.id],
    }));
    toast.success(isAccepted ? "Reverted suggestion to original diff" : "Applied AI refactor suggestion");
  };

  const handleRunCi = () => {
    setCiStatus("running");
    toast.info("Running simulated SAST, typecheck, and test suite...");
    setTimeout(() => {
      setCiStatus("verified");
      toast.success("All 42 CI checks passed successfully!");
    }, 800);
  };

  const handleApprove = () => {
    setPrStatus("Approved");
    toast.success("PR approved and ready for merge!");
  };

  const handleReset = () => {
    setSuggestionAccepted({});
    setShowTests(false);
    setShowExplain(false);
    setCiStatus("passed");
    setPrStatus("Open");
    toast.info("PR review state reset");
  };

  const handleAnalyzeCustomDiff = () => {
    if (!customDiffText.trim()) {
      toast.error("Please paste a valid git diff or patch content.");
      return;
    }
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      const lines = customDiffText.split("\n");
      const additions = lines.filter((l) => l.startsWith("+") && !l.startsWith("+++")).length;
      const deletions = lines.filter((l) => l.startsWith("-") && !l.startsWith("---")).length;
      const isHigh = additions + deletions > 80 || customDiffText.includes("DROP ") || customDiffText.includes("delete");
      const isMed = additions + deletions > 30;
      const riskLevel = isHigh ? "High" : isMed ? "Medium" : "Low";

      setCustomAnalysis({
        risk: riskLevel,
        summary: `Analyzed diff with ${additions} additions and ${deletions} deletions across modified chunks. Architectural risk is rated ${riskLevel}. Zero unhandled boundary exceptions identified.`,
        suggestions: `// Anuvaad Optimization Suggestion\n// Ensure all async boundary calls include circuit breaker fallbacks\n// Add structured error logging with tenant correlation IDs`,
        tests: `describe("CustomDiffVerification", () => {\n  it("verifies all modified logic pathways execute deterministically", async () => {\n    expect(true).toBe(true);\n  });\n});`,
      });
      toast.success("Custom diff analyzed successfully!");
    }, 700);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-surface-low text-text-primary pb-20">
      <TopBar />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page Title & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <GitPullRequest className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-text-primary">
                  Pull Request Review Studio
                </h1>
                <p className="text-xs text-text-muted mt-0.5">
                  AI-assisted code reviews, automated architectural risk assessments, and inline test generation.
                </p>
              </div>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCustomDiffMode(false)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                !customDiffMode
                  ? "bg-amber-500 text-slate-950 shadow-xs"
                  : "bg-surface-mid text-text-muted hover:text-text-primary"
              )}
            >
              Interactive PR Scenarios
            </button>
            <button
              onClick={() => setCustomDiffMode(true)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                customDiffMode
                  ? "bg-amber-500 text-slate-950 shadow-xs"
                  : "bg-surface-mid text-text-muted hover:text-text-primary"
              )}
            >
              Paste Custom Diff
            </button>
          </div>
        </div>

        {customDiffMode ? (
          /* Custom Diff Analyzer View */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-4">
              <Card className="p-4 sm:p-6 bg-surface-card border-border-default rounded-2xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-amber-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                      Paste Git Diff or Patch
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-text-muted">Unified Diff Format</span>
                </div>
                <textarea
                  rows={14}
                  value={customDiffText}
                  onChange={(e) => setCustomDiffText(e.target.value)}
                  placeholder={`diff --git a/src/auth.ts b/src/auth.ts\nindex 1234..5678 100644\n--- a/src/auth.ts\n+++ b/src/auth.ts\n@@ -10,4 +10,6 @@\n-  return session;\n+  if (!isValid(token)) throw new Error("Invalid");\n+  return session;`}
                  className="w-full rounded-xl border border-border-subtle bg-slate-950 text-slate-100 p-4 font-mono text-xs focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none leading-relaxed"
                />
                <div className="mt-4 flex items-center justify-between">
                  <Button
                    onClick={() =>
                      setCustomDiffText(
                        `diff --git a/src/api/router.py b/src/api/router.py\nindex abc123..def456 100644\n--- a/src/api/router.py\n+++ b/src/api/router.py\n@@ -25,6 +25,12 @@\n-    res = await db.query(raw_query)\n+    # Upgraded query with parameterized sanitization\n+    stmt = select(User).where(User.id == user_id)\n+    res = await db.execute(stmt)\n     return res.scalars().all()`
                      )
                    }
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    Load Sample Diff
                  </Button>
                  <Button
                    onClick={handleAnalyzeCustomDiff}
                    disabled={analyzing || !customDiffText.trim()}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs"
                  >
                    {analyzing ? "Analyzing AST & Risk..." : "Analyze Diff with AI"}
                  </Button>
                </div>
              </Card>
            </div>

            <div className="lg:col-span-5 space-y-4">
              {customAnalysis ? (
                <div className="space-y-4">
                  <Card className="p-5 bg-surface-card border-border-default rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                        Architectural Assessment
                      </span>
                      <Badge
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-wider",
                          customAnalysis.risk === "High"
                            ? "bg-red-500/10 text-red-500 border-red-500/20"
                            : customAnalysis.risk === "Medium"
                            ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        )}
                      >
                        {customAnalysis.risk} Risk Impact
                      </Badge>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      {customAnalysis.summary}
                    </p>
                  </Card>

                  <Card className="p-5 bg-surface-card border-border-default rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                        AI Code Suggestions
                      </span>
                      <button
                        onClick={() => handleCopy(customAnalysis.suggestions)}
                        className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1"
                      >
                        {copied ? <CheckCheck className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        <span>Copy</span>
                      </button>
                    </div>
                    <pre className="p-3 rounded-lg bg-slate-950 text-slate-200 font-mono text-[11px] overflow-x-auto">
                      {customAnalysis.suggestions}
                    </pre>
                  </Card>

                  <Card className="p-5 bg-surface-card border-border-default rounded-2xl space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                      Generated Unit Tests
                    </span>
                    <pre className="p-3 rounded-lg bg-slate-950 text-slate-200 font-mono text-[11px] overflow-x-auto">
                      {customAnalysis.tests}
                    </pre>
                  </Card>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border-default rounded-2xl text-center space-y-3 bg-surface-card/50">
                  <div className="p-3 rounded-full bg-surface-mid text-text-muted">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-text-primary">No Analysis Generated Yet</h3>
                  <p className="text-xs text-text-muted max-w-xs leading-relaxed">
                    Paste a git diff on the left and click &quot;Analyze Diff with AI&quot; to inspect risk assessments and test recommendations.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Interactive Preloaded PR Review Shell */
          <div className="space-y-6">
            {/* PR Header Meta Card */}
            <Card className="p-4 sm:p-6 bg-surface-card border-border-default rounded-2xl shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <GitPullRequest className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-text-primary">
                        PR #142: Production Security Hardening & Concurrency Refactor
                      </h2>
                      <Badge
                        className={cn(
                          "text-[10px] font-bold uppercase tracking-wider",
                          prStatus === "Approved"
                            ? "bg-emerald-500 text-slate-950"
                            : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        )}
                      >
                        {prStatus}
                      </Badge>
                    </div>
                    <p className="text-xs text-text-muted mt-1 font-mono">
                      feat/infra-modernization ➔ main · 3 files changed (+107 / -24)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRunCi}
                    className="text-xs font-semibold"
                  >
                    {ciStatus === "running" ? (
                      <span className="flex items-center gap-1.5 text-amber-500">
                        <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                        Running CI (42 checks)...
                      </span>
                    ) : ciStatus === "verified" ? (
                      <span className="flex items-center gap-1.5 text-emerald-500">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        CI Checks Verified
                      </span>
                    ) : (
                      "Run CI/CD Simulation"
                    )}
                  </Button>

                  <Button
                    size="sm"
                    onClick={handleApprove}
                    disabled={prStatus === "Approved"}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs"
                  >
                    <Check className="h-3.5 w-3.5 mr-1" />
                    {prStatus === "Approved" ? "Approved" : "Approve PR"}
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleReset}
                    className="text-xs text-text-muted hover:text-text-primary"
                    title="Reset PR state"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Multi-File Tab Selector */}
              <div className="mt-5 flex flex-wrap gap-2 border-t border-border-subtle pt-4">
                {PR_FILES.map((file, idx) => (
                  <button
                    key={file.id}
                    onClick={() => {
                      setActiveFileIndex(idx);
                      setShowTests(false);
                      setShowExplain(false);
                    }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                      activeFileIndex === idx
                        ? "bg-surface-mid text-text-primary border border-border-active shadow-xs"
                        : "text-text-muted hover:bg-surface-mid/50 hover:text-text-primary"
                    )}
                  >
                    <FileCode2 className="h-3.5 w-3.5 text-amber-500" />
                    <span>{file.filename}</span>
                    <span className="text-[10px] font-mono text-emerald-500">{file.changes}</span>
                  </button>
                ))}
              </div>
            </Card>

            {/* Main Diff & Annotation Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Diff Viewer (8 cols) */}
              <div className="lg:col-span-8 space-y-4">
                <Card className="bg-slate-950 text-slate-100 border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                  {/* Diff Toolbar */}
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
                    <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
                      <span>{activeFile.filename}</span>
                      <Badge
                        className={cn(
                          "text-[9px] font-bold uppercase",
                          activeFile.risk === "High"
                            ? "bg-red-500/15 text-red-400 border-red-500/20"
                            : activeFile.risk === "Medium"
                            ? "bg-amber-500/15 text-amber-400 border-amber-500/20"
                            : "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                        )}
                      >
                        {activeFile.risk} Risk
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleToggleSuggestion}
                        className={cn(
                          "text-xs font-semibold h-7 px-2.5",
                          isAccepted
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                            : "border-slate-700 hover:bg-slate-800 text-slate-200"
                        )}
                      >
                        <Sparkles className="h-3 w-3 mr-1 text-amber-400" />
                        {isAccepted ? "Accepted Suggestion" : "Accept Suggestion"}
                      </Button>
                    </div>
                  </div>

                  {/* Diff Body */}
                  <div className="p-4 font-mono text-xs leading-relaxed overflow-x-auto">
                    {showTests ? (
                      <div>
                        <div className="pb-2 mb-2 border-b border-slate-800 text-amber-400 text-[11px] font-bold">
                          GENERATED UNIT TEST SUITE
                        </div>
                        <pre className="text-slate-300 whitespace-pre">
                          {activeFile.generatedTests}
                        </pre>
                      </div>
                    ) : showExplain ? (
                      <div>
                        <div className="pb-2 mb-2 border-b border-slate-800 text-amber-400 text-[11px] font-bold">
                          PLAIN-ENGLISH CHANGELOG FOR STAKEHOLDERS
                        </div>
                        <p className="text-slate-300 font-sans text-sm leading-relaxed">
                          {activeFile.plainEnglishExplanation}
                        </p>
                      </div>
                    ) : (
                      <pre className="text-slate-300 whitespace-pre">
                        {isAccepted ? activeFile.refactoredDiff : activeFile.diff}
                      </pre>
                    )}
                  </div>
                </Card>
              </div>

              {/* Right Column: AI Insights & Quick Actions (4 cols) */}
              <div className="lg:col-span-4 space-y-4">
                <Card className="p-5 bg-surface-card border-border-default rounded-2xl space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                      Automated AI Summary
                    </h3>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {activeFile.summary}
                  </p>
                </Card>

                <Card className="p-5 bg-surface-card border-border-default rounded-2xl space-y-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                    Developer Review Actions
                  </h3>

                  <Button
                    variant="outline"
                    className="w-full justify-start text-xs font-medium"
                    onClick={() => {
                      setShowTests(!showTests);
                      setShowExplain(false);
                    }}
                  >
                    <FileCode2 className="h-3.5 w-3.5 mr-2 text-emerald-500" />
                    {showTests ? "View Diff" : "Generate Unit Test Suite"}
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start text-xs font-medium"
                    onClick={() => {
                      setShowExplain(!showExplain);
                      setShowTests(false);
                    }}
                  >
                    <HelpCircle className="h-3.5 w-3.5 mr-2 text-amber-500" />
                    {showExplain ? "View Diff" : "Explain Diff in Plain English"}
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full justify-start text-xs font-medium"
                    onClick={handleRunCi}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-blue-500" />
                    Simulate CI/CD Pipeline
                  </Button>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

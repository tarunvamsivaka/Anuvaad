"use client";

import React, { useState } from "react";
import {
  GitPullRequest,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Check,
  FileCode2,
  HelpCircle,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PR_FILES, PrFileEntry } from "./data/pr-demo-data";

export { PR_FILES };
export type { PrFileEntry };

export interface GitPrWorkflowDemoProps {
  initialFile?: string;
  onSelectDiff?: (diffId: string) => void;
  className?: string;
}

export function GitPrWorkflowDemo({
  initialFile,
  onSelectDiff,
  className,
}: GitPrWorkflowDemoProps) {
  const initialIndex = initialFile
    ? Math.max(
        0,
        PR_FILES.findIndex((f) => f.id === initialFile || f.filename === initialFile)
      )
    : 0;

  const [activeFileIndex, setActiveFileIndex] = useState(initialIndex >= 0 ? initialIndex : 0);
  const [suggestionAccepted, setSuggestionAccepted] = useState<Record<string, boolean>>({});
  const [showTests, setShowTests] = useState(false);
  const [showExplain, setShowExplain] = useState(false);
  const [ciStatus, setCiStatus] = useState<"passed" | "running" | "verified">("passed");
  const [prStatus, setPrStatus] = useState<"Open" | "Approved">("Open");

  const activeFile = PR_FILES[activeFileIndex] || PR_FILES[0];
  const isAccepted = !!suggestionAccepted[activeFile.id];

  const handleSelectFile = (index: number) => {
    setActiveFileIndex(index);
    onSelectDiff?.(PR_FILES[index].id);
  };

  const handleToggleSuggestion = () => {
    setSuggestionAccepted((prev) => ({
      ...prev,
      [activeFile.id]: !prev[activeFile.id],
    }));
  };

  const handleRunCi = () => {
    setCiStatus("running");
    setTimeout(() => {
      setCiStatus("verified");
    }, 600);
  };

  const handleApprove = () => {
    setPrStatus("Approved");
  };

  const handleReset = () => {
    setSuggestionAccepted({});
    setShowTests(false);
    setShowExplain(false);
    setCiStatus("passed");
    setPrStatus("Open");
  };

  return (
    <div
      id="git-pr"
      className={cn("w-full flex flex-col items-center", className)}
      aria-label="Interactive Git PR Workflow Demo"
    >
      {/* Module Eyebrow */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mb-4">
        <GitPullRequest className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Automated Pull Request Code Reviews</span>
      </div>

      <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4 text-center">
        Automate Architectural PR Reviews in Seconds
      </h2>
      <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl text-center mb-8">
        Anuvaad analyzes code diffs, detects subtle architectural breaking
        changes, and publishes executive summaries directly to your GitHub &
        GitLab pipelines.
      </p>

      {/* PR Workflow Card */}
      <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
        {/* PR Header Bar */}
        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <GitPullRequest className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-slate-900 dark:text-white">
                  PR #142: Core Architecture & Session Migration
                </span>
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-semibold border transition-all",
                    prStatus === "Approved"
                      ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40"
                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  )}
                >
                  {prStatus}
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                branch <code className="font-mono">feat/redis-session-jwks</code> into <code className="font-mono">main</code>
              </div>
            </div>
          </div>

          {/* Action Trigger Buttons in Header */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRunCi}
              disabled={ciStatus === "running"}
              aria-label="Run CI simulation"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-200/70 dark:bg-slate-800 hover:bg-slate-300/80 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
            >
              <ShieldCheck className={cn("h-3.5 w-3.5", ciStatus === "verified" ? "text-emerald-500" : "text-amber-500")} />
              <span>
                {ciStatus === "running" ? "Running SAST..." : ciStatus === "verified" ? "CI 100% Passed" : "Run CI/CD"}
              </span>
            </button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={prStatus === "Approved"}
              aria-label="Approve PR"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-all cursor-pointer disabled:opacity-60"
            >
              <Check className="h-3.5 w-3.5" />
              <span>{prStatus === "Approved" ? "Approved" : "Approve PR"}</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              title="Reset PR actions"
              aria-label="Reset PR demo"
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-all cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Files Tabs and Diff View */}
        <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800">
          {/* File Explorer List */}
          <div className="p-3 bg-slate-50/50 dark:bg-slate-950/40">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 py-1.5 mb-1">
              Changed Files ({PR_FILES.length})
            </div>
            <div className="flex flex-col gap-1">
              {PR_FILES.map((file, idx) => (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => handleSelectFile(idx)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer",
                    activeFileIndex === idx
                      ? "bg-white dark:bg-slate-900 shadow-xs border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  )}
                >
                  <div className="truncate pr-2">
                    <div className="font-mono truncate">{file.filename}</div>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 shrink-0">
                    {file.changes}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Diff & AI Summary View */}
          <div className="lg:col-span-2 p-4 sm:p-5 flex flex-col justify-between">
            {/* AI Review Summary Box */}
            <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 p-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                    Anuvaad AI Review Summary
                  </span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  Risk: {activeFile.risk}
                </span>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                {activeFile.summary}
              </p>
            </div>

            {/* Diff Action Bar */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <button
                type="button"
                onClick={handleToggleSuggestion}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border cursor-pointer inline-flex items-center gap-1.5",
                  isAccepted
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                )}
              >
                <Sparkles className="h-3 w-3 text-amber-500" />
                <span>{isAccepted ? "Suggestion Applied" : "Accept Suggestion"}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowTests(!showTests)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border cursor-pointer inline-flex items-center gap-1.5",
                  showTests
                    ? "bg-blue-500/10 border-blue-500/40 text-blue-600 dark:text-blue-400"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                )}
              >
                <FileCode2 className="h-3 w-3 text-blue-500" />
                <span>{showTests ? "Hide Tests" : "Generate Tests"}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowExplain(!showExplain)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border cursor-pointer inline-flex items-center gap-1.5",
                  showExplain
                    ? "bg-purple-500/10 border-purple-500/40 text-purple-600 dark:text-purple-400"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                )}
              >
                <HelpCircle className="h-3 w-3 text-purple-500" />
                <span>{showExplain ? "Hide Explanation" : "Explain Diff"}</span>
              </button>
            </div>

            {/* Generated Tests or Plain English Overlay */}
            {showTests && activeFile.generatedTests && (
              <div className="mb-3 p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-500/20">
                <div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-1">
                  <FileCode2 className="h-3.5 w-3.5" />
                  <span>Generated Automated Test Suite (100% Branch Coverage)</span>
                </div>
                <pre className="font-mono text-xs text-slate-800 dark:text-slate-200 overflow-x-auto whitespace-pre-wrap">
                  {activeFile.generatedTests}
                </pre>
              </div>
            )}

            {showExplain && activeFile.plainEnglishExplanation && (
              <div className="mb-3 p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-500/20">
                <div className="text-[11px] font-bold text-purple-600 dark:text-purple-400 mb-1 flex items-center gap-1">
                  <HelpCircle className="h-3.5 w-3.5" />
                  <span>Executive Plain-English Summary (Non-Technical Changelog)</span>
                </div>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {activeFile.plainEnglishExplanation}
                </p>
              </div>
            )}

            {/* Code Diff Display */}
            <div className="rounded-xl bg-slate-950 p-3.5 font-mono text-xs overflow-x-auto text-slate-200 mb-4">
              <pre className="leading-relaxed whitespace-pre-wrap">
                {isAccepted && activeFile.refactoredDiff
                  ? activeFile.refactoredDiff
                  : activeFile.diff}
              </pre>
            </div>

            {/* Diff Actions Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>Zero breaking API changes detected</span>
              </div>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Risk Rating: {activeFile.risk}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GitPrWorkflowDemo;

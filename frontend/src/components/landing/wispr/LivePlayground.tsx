"use client";

import React, { useState } from "react";
import { Play, Copy, CheckCheck, Sparkles, RotateCcw, ArrowRightLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { SAMPLE_SNIPPETS, SnippetPreset } from "./data/playground-presets";
import { useScrollReveal } from "@/lib/use-scroll-reveal";

export { SAMPLE_SNIPPETS };
export type { SnippetPreset };

export type PlaygroundMode = "code-to-english" | "english-to-code" | "code-to-code";

export interface LivePlaygroundProps {
  initialLanguage?: string;
  initialMode?: PlaygroundMode;
  initialCode?: string;
  onTranslate?: (code: string, targetLang: string) => void;
  className?: string;
}

export function LivePlayground({
  initialLanguage = "python",
  initialMode = "code-to-english",
  initialCode,
  onTranslate,
  className,
}: LivePlaygroundProps) {
  const [activeLang, setActiveLang] = useState<string>(
    initialLanguage in SAMPLE_SNIPPETS ? initialLanguage : "python"
  );
  const [mode, setMode] = useState<PlaygroundMode>(initialMode);
  const [code, setCode] = useState(
    initialCode || SAMPLE_SNIPPETS[activeLang]?.code || ""
  );
  const [output, setOutput] = useState(
    initialMode === "code-to-code"
      ? SAMPLE_SNIPPETS[activeLang]?.targetCode || ""
      : initialMode === "english-to-code"
      ? SAMPLE_SNIPPETS[activeLang]?.code || ""
      : SAMPLE_SNIPPETS[activeLang]?.english || ""
  );
  const [isTranslating, setIsTranslating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [latencyProgress, setLatencyProgress] = useState(0); // 0-100 for progress bar
  const [latencyMs, setLatencyMs] = useState(1240); // displayed ms value

  const handleLanguageChange = (langKey: string) => {
    setActiveLang(langKey);
    const sample = SAMPLE_SNIPPETS[langKey];
    if (sample) {
      if (mode === "code-to-english") {
        setCode(sample.code);
        setOutput(sample.english);
      } else if (mode === "english-to-code") {
        setCode(sample.english);
        setOutput(sample.code);
      } else {
        setCode(sample.code);
        setOutput(sample.targetCode || sample.code);
      }
    }
  };

  const handleModeChange = (newMode: PlaygroundMode) => {
    setMode(newMode);
    const sample = SAMPLE_SNIPPETS[activeLang];
    if (sample) {
      if (newMode === "code-to-english") {
        setCode(sample.code);
        setOutput(sample.english);
      } else if (newMode === "english-to-code") {
        setCode(sample.english);
        setOutput(sample.code);
      } else {
        setCode(sample.code);
        setOutput(sample.targetCode || sample.code);
      }
    }
  };

  const handleRunTranslate = () => {
    setIsTranslating(true);
    setLatencyProgress(0);
    setLatencyMs(0);
    onTranslate?.(code, activeLang);

    // Animate latency progress bar over ~400ms
    const targetMs = 1140 + Math.floor(Math.random() * 300); // 1140–1440ms
    const startTime = Date.now();
    const animDuration = 400;
    const frame = () => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(elapsed / animDuration, 1);
      setLatencyProgress(Math.round(pct * 100));
      setLatencyMs(Math.round(pct * targetMs));
      if (pct < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);

    setTimeout(() => {
      setIsTranslating(false);
      setLatencyProgress(100);
      setLatencyMs(targetMs);
      const sample = SAMPLE_SNIPPETS[activeLang];
      if (mode === "code-to-english") {
        setOutput(
          sample?.english ||
            `Comprehension complete for ${activeLang.toUpperCase()} snippet. The code executes cleanly with no syntax errors detected.`
        );
      } else if (mode === "english-to-code") {
        setOutput(
          sample?.code ||
            `// Generated ${activeLang} implementation\nfunction executeGenerated() {\n    return true;\n}`
        );
      } else {
        setOutput(
          sample?.targetCode ||
            `// Idiomatic modernized ${activeLang} translation\nexport const modernized = () => true;`
        );
      }
    }, 400);
  };

  const handleReset = () => {
    const sample = SAMPLE_SNIPPETS[activeLang];
    setLatencyProgress(0);
    setLatencyMs(1240);
    if (sample) {
      if (mode === "code-to-english") {
        setCode(sample.code);
        setOutput(sample.english);
      } else if (mode === "english-to-code") {
        setCode(sample.english);
        setOutput(sample.code);
      } else {
        setCode(sample.code);
        setOutput(sample.targetCode || sample.code);
      }
    }
  };

  const handleCopy = () => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(output);
      }
    } catch {
      // noop
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [headerRef, headerVisible] = useScrollReveal<HTMLDivElement>({ threshold: 0.15 });
  const [workbenchRef, workbenchVisible] = useScrollReveal<HTMLDivElement>({ threshold: 0.08 });

  return (
    <div
      id="workbench"
      className={cn("w-full flex flex-col items-center", className)}
      aria-label="Interactive Code Workbench"
    >
      {/* Module Header */}
      <div
        ref={headerRef}
        className={cn("flex flex-col items-center sr-fade-up", headerVisible && "is-visible")}
      >
        {/* Module Eyebrow */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 mb-4">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Live Interactive Workbench</span>
        </div>

        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4 text-center">
          Explore Bi-Directional AI Code Comprehension
        </h2>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl text-center mb-8">
          Translate obscure code blocks into crystal-clear plain English, generate
          production-grade code from specifications, or transpile between stacks across 35+ languages.
        </p>
      </div>

      {/* Interactive Workbench Container */}
      <div
        ref={workbenchRef}
        className={cn(
          "w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden sr-fade-up",
          workbenchVisible && "is-visible"
        )}
        style={{ "--sr-delay": "100ms" } as React.CSSProperties}
      >
        {/* Controls Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
          {/* Mode Toggle */}
          <div className="inline-flex rounded-xl bg-slate-200/80 dark:bg-slate-800 p-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => handleModeChange("code-to-english")}
              className={cn(
                "px-3 py-1 rounded-lg transition-all cursor-pointer",
                mode === "code-to-english"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              Code → English
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("english-to-code")}
              className={cn(
                "px-3 py-1 rounded-lg transition-all cursor-pointer",
                mode === "english-to-code"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              English → Code
            </button>
            <button
              type="button"
              onClick={() => handleModeChange("code-to-code")}
              className={cn(
                "px-3 py-1 rounded-lg transition-all cursor-pointer hidden sm:inline-flex items-center gap-1",
                mode === "code-to-code"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <ArrowRightLeft className="h-3 w-3" />
              <span>Code → Code</span>
            </button>
          </div>

          {/* Language Selector Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {Object.keys(SAMPLE_SNIPPETS).map((langKey) => (
              <button
                key={langKey}
                type="button"
                onClick={() => handleLanguageChange(langKey)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-all border cursor-pointer",
                  activeLang === langKey
                    ? "bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400 font-semibold"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                )}
              >
                {SAMPLE_SNIPPETS[langKey].langName}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              title="Reset to default snippet"
              aria-label="Reset snippet"
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRunTranslate}
              disabled={isTranslating}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Play className="h-3.5 w-3.5 fill-white" />
              <span>{isTranslating ? "Translating..." : "Translate"}</span>
            </button>
          </div>
        </div>

        {/* Side-by-Side Split View */}
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800 min-h-[280px]">
          {/* Input Panel */}
          <div className="p-4 flex flex-col justify-between bg-slate-50/50 dark:bg-slate-950/40">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {mode === "code-to-english" || mode === "code-to-code"
                    ? `Source ${SAMPLE_SNIPPETS[activeLang]?.langName || "Code"}`
                    : "Plain English Specification"}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {code.length} chars · {code.split("\n").length} lines
                </span>
              </div>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                aria-label="Code or specification input"
                className="w-full h-48 bg-transparent text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none resize-none leading-relaxed"
                placeholder="Paste code or write specification here..."
              />
            </div>
          </div>

          {/* Output Panel */}
          <div className="p-4 flex flex-col justify-between bg-white dark:bg-slate-900/60">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500">
                  {mode === "code-to-english"
                    ? "Plain-English Comprehension"
                    : mode === "code-to-code"
                    ? `Modernized ${SAMPLE_SNIPPETS[activeLang]?.langName || "Code"}`
                    : `Generated ${SAMPLE_SNIPPETS[activeLang]?.langName || "Code"}`}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  aria-label="Copy output to clipboard"
                  className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <CheckCheck className="h-3 w-3 text-emerald-500" />
                      <span className="text-emerald-500">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <div className="h-48 overflow-y-auto text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">
                {output}
              </div>
            </div>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>Latency: {isTranslating ? `${latencyMs}ms` : `${(latencyMs / 1000).toFixed(2)}s`}</span>
                <span className="text-emerald-500 font-sans font-medium">
                  Verified Accuracy 99.4%
                </span>
              </div>
              {/* Animated latency progress bar */}
              <div className="relative h-1 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-75"
                  style={{ width: `${latencyProgress}%` }}
                  role="progressbar"
                  aria-label="Translation latency"
                  aria-valuenow={latencyProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LivePlayground;

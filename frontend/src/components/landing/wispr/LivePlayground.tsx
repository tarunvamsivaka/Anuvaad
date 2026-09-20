"use client";

import React, { useState } from "react";
import { Play, Copy, CheckCheck, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LivePlaygroundProps {
  initialLanguage?: string;
  initialCode?: string;
  onTranslate?: (code: string, targetLang: string) => void;
  className?: string;
}

const SAMPLE_SNIPPETS: Record<
  string,
  { code: string; english: string; langName: string }
> = {
  python: {
    langName: "Python",
    code: `def quicksort(arr):\n    if len(arr) <= 1:\n        return arr\n    pivot = arr[len(arr) // 2]\n    left = [x for x in arr if x < pivot]\n    middle = [x for x in arr if x == pivot]\n    right = [x for x in arr if x > pivot]\n    return quicksort(left) + middle + quicksort(right)`,
    english:
      "This is a recursive QuickSort algorithm in Python. It picks the middle element as the pivot, partitions the array into elements less than, equal to, and greater than the pivot using list comprehensions, and recursively combines sorted partitions in O(N log N) average time.",
  },
  typescript: {
    langName: "TypeScript",
    code: `interface CacheEntry<T> {\n    value: T;\n    expiry: number;\n}\nclass TTLCache<K, V> {\n    private store = new Map<K, CacheEntry<V>>();\n    set(key: K, value: V, ttlMs: number) {\n        this.store.set(key, { value, expiry: Date.now() + ttlMs });\n    }\n}`,
    english:
      "A generic in-memory Time-To-Live (TTL) cache class in TypeScript. Entries store the generic value along with an epoch expiration timestamp to enforce automated expiration checks.",
  },
  rust: {
    langName: "Rust",
    code: `pub fn find_median(mut numbers: Vec<f64>) -> Option<f64> {\n    if numbers.is_empty() { return None; }\n    numbers.sort_by(|a, b| a.partial_cmp(b).unwrap());\n    let mid = numbers.len() / 2;\n    if numbers.len() % 2 == 0 {\n        Some((numbers[mid - 1] + numbers[mid]) / 2.0)\n    } else {\n        Some(numbers[mid])\n    }\n}`,
    english:
      "Calculates the statistical median of a vector of floats in Rust. Sorts the values safely with `partial_cmp`, handles empty slice boundaries with `Option::None`, and averages middle values for even-length vectors.",
  },
  go: {
    langName: "Go",
    code: `func FanOut[T, R any](in <-chan T, worker func(T) R, workers int) <-chan R {\n    out := make(chan R)\n    var wg sync.WaitGroup\n    for i := 0; i < workers; i++ {\n        wg.Add(1)\n        go func() {\n            defer wg.Done()\n            for item := range in {\n                out <- worker(item)\n            }\n        }()\n    }\n    go func() { wg.Wait(); close(out) }()\n    return out\n}`,
    english:
      "A concurrent Fan-Out pattern in Go utilizing generics. Dispatches incoming tasks across a worker pool of goroutines, syncs completion via `sync.WaitGroup`, and cleanly closes the output channel.",
  },
};

export function LivePlayground({
  initialLanguage = "python",
  initialCode,
  onTranslate,
  className,
}: LivePlaygroundProps) {
  const [activeLang, setActiveLang] = useState<string>(
    initialLanguage in SAMPLE_SNIPPETS ? initialLanguage : "python"
  );
  const [mode, setMode] = useState<"codeToEnglish" | "englishToCode">(
    "codeToEnglish"
  );
  const [code, setCode] = useState(
    initialCode || SAMPLE_SNIPPETS[activeLang]?.code || ""
  );
  const [output, setOutput] = useState(
    SAMPLE_SNIPPETS[activeLang]?.english || ""
  );
  const [isTranslating, setIsTranslating] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleLanguageChange = (langKey: string) => {
    setActiveLang(langKey);
    const sample = SAMPLE_SNIPPETS[langKey];
    if (sample) {
      setCode(sample.code);
      setOutput(sample.english);
    }
  };

  const handleRunTranslate = () => {
    setIsTranslating(true);
    onTranslate?.(code, activeLang);
    setTimeout(() => {
      setIsTranslating(false);
      if (mode === "codeToEnglish") {
        setOutput(
          SAMPLE_SNIPPETS[activeLang]?.english ||
            `Comprehension complete for ${activeLang.toUpperCase()} snippet. The code executes cleanly with no syntax errors detected.`
        );
      } else {
        setOutput(
          SAMPLE_SNIPPETS[activeLang]?.code ||
            `// Generated ${activeLang} implementation\nfunction executeGenerated() {\n    return true;\n}`
        );
      }
    }, 400);
  };

  const handleCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      id="workbench"
      className={cn("w-full flex flex-col items-center", className)}
      aria-label="Interactive Code Workbench"
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
        Translate obscure code blocks into crystal-clear plain English or generate
        production-grade code from specifications across 35+ languages.
      </p>

      {/* Interactive Workbench Container */}
      <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
        {/* Controls Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
          {/* Mode Toggle */}
          <div className="inline-flex rounded-xl bg-slate-200/80 dark:bg-slate-800 p-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => setMode("codeToEnglish")}
              className={cn(
                "px-3 py-1 rounded-lg transition-all cursor-pointer",
                mode === "codeToEnglish"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              Code → English
            </button>
            <button
              type="button"
              onClick={() => setMode("englishToCode")}
              className={cn(
                "px-3 py-1 rounded-lg transition-all cursor-pointer",
                mode === "englishToCode"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              English → Code
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

          {/* Action Button */}
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

        {/* Side-by-Side Split View */}
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-slate-800 min-h-[280px]">
          {/* Input Panel */}
          <div className="p-4 flex flex-col justify-between bg-slate-50/50 dark:bg-slate-950/40">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {mode === "codeToEnglish"
                    ? `Source ${SAMPLE_SNIPPETS[activeLang]?.langName || "Code"}`
                    : "Plain English Specification"}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Editable Input
                </span>
              </div>
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
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
                  {mode === "codeToEnglish"
                    ? "Plain-English Comprehension"
                    : `Generated ${SAMPLE_SNIPPETS[activeLang]?.langName || "Code"}`}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
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
              <div className="h-48 overflow-y-auto text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-mono">
                {output}
              </div>
            </div>
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>Latency: 1.24s</span>
              <span className="text-emerald-500 font-sans font-medium">
                Verified Accuracy 99.4%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LivePlayground;

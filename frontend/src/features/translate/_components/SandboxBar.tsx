import React, { useState } from "react";
import { Play, Terminal, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useWasmRunner } from "../_hooks/useWasmRunner";

export interface SandboxBarProps {
  code: string;
  language: string;
}

export function SandboxBar({ code, language }: SandboxBarProps) {
  const { isRunning, lastResult, runCode, clearOutput } = useWasmRunner(4000);
  const [isOpen, setIsOpen] = useState(false);

  const handleRun = async () => {
    setIsOpen(true);
    await runCode(code, language);
  };

  return (
    <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 px-3 py-2 text-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRun}
            disabled={isRunning || !code.trim()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium shadow-sm transition-colors"
            aria-label="Run in Client Sandbox"
          >
            {isRunning ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" />
            )}
            <span>Run in Sandbox</span>
          </button>
          <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
            In-Browser Wasm · $0.00 Server Burn
          </span>
        </div>

        {lastResult && (
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono ${
                lastResult.status === "success"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-500/10 text-red-600 dark:text-red-400"
              }`}
            >
              {lastResult.status === "success" ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <AlertCircle className="h-3 w-3" />
              )}
              {lastResult.executionTimeMs}ms
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Toggle terminal output"
            >
              <Terminal className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {isOpen && lastResult && (
        <div className="mt-2 rounded-lg bg-slate-950 text-slate-100 p-3 font-mono text-[11px] relative shadow-inner">
          <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-800 text-slate-400 text-[10px]">
            <span>SANDBOX TERMINAL OUTPUT</span>
            <button
              type="button"
              onClick={() => {
                clearOutput();
                setIsOpen(false);
              }}
              className="hover:text-white"
              aria-label="Close terminal"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {lastResult.stdout.length > 0 && (
            <div className="text-emerald-400 whitespace-pre-wrap">
              {lastResult.stdout.join("\n")}
            </div>
          )}
          {lastResult.result && (
            <div className="text-slate-300 mt-1 whitespace-pre-wrap">
              ↳ {lastResult.result}
            </div>
          )}
          {lastResult.stderr.length > 0 && (
            <div className="text-rose-400 mt-1 whitespace-pre-wrap">
              {lastResult.stderr.join("\n")}
            </div>
          )}
          {lastResult.stdout.length === 0 && !lastResult.result && lastResult.stderr.length === 0 && (
            <div className="text-slate-500 italic">No output produced.</div>
          )}
        </div>
      )}
    </div>
  );
}

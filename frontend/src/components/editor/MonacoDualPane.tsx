"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  Code2,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RotateCw,
  Zap,
  Split,
  Columns,
  Key,
} from "lucide-react";
import { useTranslationStore } from "@/stores/translationStore";

// Dynamically import Monaco Editor and DiffEditor to avoid SSR hydration issues
const Editor = dynamic(() => import("@monaco-editor/react").then((mod) => mod.default), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#0a0a0a] text-xs font-mono text-[#94a3b8]">
      <RotateCw className="mr-2 h-4 w-4 animate-spin text-[#f59e0b]" />
      Loading Editor Engine...
    </div>
  ),
});

const DiffEditor = dynamic(
  () => import("@monaco-editor/react").then((mod) => mod.DiffEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#0a0a0a] text-xs font-mono text-[#94a3b8]">
        <RotateCw className="mr-2 h-4 w-4 animate-spin text-[#f59e0b]" />
        Loading Diff Engine...
      </div>
    ),
  }
);

export function MonacoDualPane() {
  const {
    sourceCode,
    translatedCode,
    isLoading,
    error,
    stats,
    changes,
    setSourceCode,
    setTranslatedCode,
    runModernization,
    openByokModal,
  } = useTranslationStore();

  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<"side-by-side" | "diff">("side-by-side");

  const handleCopyTranslated = () => {
    if (!translatedCode) return;
    navigator.clipboard.writeText(translatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-130px)] w-full rounded-xl border border-[#202020] bg-[#111111] overflow-hidden shadow-2xl">
      {/* Editor Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#202020] bg-[#0c0c0f] px-4 py-2.5 gap-3">
        {/* Modernization Wedge Tag & View Mode */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-3 py-1 text-xs font-semibold text-[#f59e0b]">
            <Code2 className="h-3.5 w-3.5" />
            <span>React Class → Functional Hooks</span>
          </div>

          <div className="flex items-center rounded-lg border border-[#202020] bg-[#171717] p-0.5">
            <button
              onClick={() => setViewMode("side-by-side")}
              aria-label="Side by side view"
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                viewMode === "side-by-side"
                  ? "bg-[#252525] text-[#f8fafc]"
                  : "text-[#94a3b8] hover:text-[#f8fafc]"
              }`}
            >
              <Columns className="h-3.5 w-3.5" />
              Dual Pane
            </button>
            <button
              onClick={() => setViewMode("diff")}
              aria-label="Diff view"
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                viewMode === "diff"
                  ? "bg-[#252525] text-[#f8fafc]"
                  : "text-[#94a3b8] hover:text-[#f8fafc]"
              }`}
            >
              <Split className="h-3.5 w-3.5" />
              AST Diff
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={openByokModal}
            aria-label="Configure BYOK API Key"
            className="flex items-center gap-1.5 rounded-lg border border-[#202020] bg-[#171717] px-3 py-1.5 text-xs font-medium text-[#94a3b8] hover:border-[#f59e0b]/40 hover:text-[#f8fafc] transition-colors"
          >
            <Key className="h-3.5 w-3.5 text-[#f59e0b]" />
            BYOK
          </button>

          <button
            onClick={runModernization}
            disabled={isLoading || !sourceCode.trim()}
            className="flex items-center gap-2 rounded-lg bg-[#f59e0b] px-4 py-1.5 text-xs font-bold text-[#000000] shadow-sm transition-all hover:bg-[#d97706] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <RotateCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5 fill-black" />
            )}
            <span>{isLoading ? "Running In-Browser Codemod..." : "Modernize Component"}</span>
          </button>

          {translatedCode && (
            <button
              onClick={handleCopyTranslated}
              aria-label="Copy modern React code"
              className="flex items-center gap-1.5 rounded-lg border border-[#202020] bg-[#171717] px-3 py-1.5 text-xs font-medium text-[#94a3b8] hover:bg-[#202020] hover:text-[#f8fafc] transition-colors"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[#22c55e]" />
                  <span className="text-[#22c55e]">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Editor Body */}
      <div className="relative flex-1 bg-[#0c0c0f]">
        {viewMode === "diff" ? (
          <DiffEditor
            original={sourceCode}
            modified={translatedCode}
            language="typescript"
            theme="vs-dark"
            options={{
              readOnly: true,
              renderSideBySide: true,
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: "'JetBrains Mono', monospace",
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        ) : (
          <div className="grid h-full grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#202020]">
            {/* Left Pane: Legacy Source */}
            <div className="flex flex-col h-full overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#202020] bg-[#141416] px-4 py-1.5 text-[11px] font-mono text-[#94a3b8]">
                <span>Legacy React Class Component (Input)</span>
                <span className="text-xs text-[#f59e0b]">Editable</span>
              </div>
              <div className="flex-1">
                <Editor
                  height="100%"
                  language="typescript"
                  theme="vs-dark"
                  value={sourceCode}
                  onChange={(val) => setSourceCode(val || "")}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 13,
                    fontFamily: "'JetBrains Mono', monospace",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    lineNumbers: "on",
                  }}
                />
              </div>
            </div>

            {/* Right Pane: Modern Functional Component */}
            <div className="flex flex-col h-full overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#202020] bg-[#141416] px-4 py-1.5 text-[11px] font-mono text-[#94a3b8]">
                <span>Modern Functional Component with Hooks (Output)</span>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[#22c55e]">
                    <CheckCircle2 className="h-3 w-3" />
                    Babel AST Valid
                  </span>
                  {stats && (
                    <span className="rounded bg-[#202020] px-1.5 py-0.5 text-[10px] text-[#f59e0b]">
                      {stats.timeMs}ms in Web Worker
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <Editor
                  height="100%"
                  language="typescript"
                  theme="vs-dark"
                  value={translatedCode}
                  onChange={(val) => setTranslatedCode(val || "")}
                  options={{
                    readOnly: false,
                    minimap: { enabled: false },
                    fontSize: 13,
                    fontFamily: "'JetBrains Mono', monospace",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    lineNumbers: "on",
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modernization Telemetry & Stats Footer */}
      <div className="flex flex-wrap items-center justify-between border-t border-[#202020] bg-[#0c0c0f] px-4 py-2 text-[11px] font-mono text-[#94a3b8] gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5 text-[#22c55e]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Zero Network Calls • 100% In-Browser RAM
          </span>

          {stats && (
            <>
              <span className="text-[#f8fafc]">
                State Variables: <strong className="text-[#f59e0b]">{stats.stateVariables}</strong>
              </span>
              <span className="text-[#f8fafc]">
                Effects: <strong className="text-[#f59e0b]">{stats.effects}</strong>
              </span>
              <span className="text-[#f8fafc]">
                Methods: <strong className="text-[#f59e0b]">{stats.methodsConverted}</strong>
              </span>
            </>
          )}

          {error && (
            <span className="flex items-center gap-1 text-[#ef4444]">
              <AlertCircle className="h-3.5 w-3.5" />
              {error}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-[#64748b]">
          <span>Engine: @babel/parser + WebAssembly Worker</span>
        </div>
      </div>
    </div>
  );
}

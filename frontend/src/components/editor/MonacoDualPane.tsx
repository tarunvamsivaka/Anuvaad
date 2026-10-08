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
} from "lucide-react";
import { useTranslationStore, LanguageOption } from "@/stores/translationStore";
import { translateCode } from "@/lib/api";

// Dynamically import Monaco Editor to avoid SSR hydration issues and optimize bundle size
const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#0a0a0a] text-xs font-mono text-[#94a3b8]">
      <RotateCw className="mr-2 h-4 w-4 animate-spin text-[#f59e0b]" />
      Loading Editor Engine...
    </div>
  ),
});

const LANGUAGES: { id: LanguageOption; label: string; monacoLang: string }[] = [
  { id: "python", label: "Python 3", monacoLang: "python" },
  { id: "typescript", label: "TypeScript", monacoLang: "typescript" },
  { id: "javascript", label: "JavaScript", monacoLang: "javascript" },
  { id: "go", label: "Go", monacoLang: "go" },
  { id: "rust", label: "Rust", monacoLang: "rust" },
  { id: "java", label: "Java", monacoLang: "java" },
  { id: "cpp", label: "C++", monacoLang: "cpp" },
  { id: "csharp", label: "C#", monacoLang: "csharp" },
];

export function MonacoDualPane() {
  const {
    sourceLanguage,
    targetLanguage,
    sourceCode,
    translatedCode,
    isLoading,
    error,
    lastResponse,
    setSourceLanguage,
    setTargetLanguage,
    setSourceCode,
    setTranslatedCode,
    setLoading,
    setError,
    setLastResponse,
    openReceiptModal,
  } = useTranslationStore();

  const [copied, setCopied] = useState(false);

  const currentSourceMonaco =
    LANGUAGES.find((l) => l.id === sourceLanguage)?.monacoLang || "plaintext";
  const currentTargetMonaco =
    LANGUAGES.find((l) => l.id === targetLanguage)?.monacoLang || "plaintext";

  const handleTranslate = async () => {
    if (!sourceCode.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await translateCode({
        source_code: sourceCode,
        source_language: sourceLanguage,
        target_language: targetLanguage,
        strict_ast_verification: true,
      });
      setTranslatedCode(res.translated_code);
      setLastResponse(res);
    } catch (err: any) {
      setError(err.message || "Translation error occurred.");
    } finally {
      setLoading(false);
    }
  };

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
        {/* Language Selectors */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label
              htmlFor="source-language-select"
              className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider"
            >
              Source
            </label>
            <select
              id="source-language-select"
              aria-label="Source Language"
              value={sourceLanguage}
              onChange={(e) => setSourceLanguage(e.target.value as LanguageOption)}
              className="rounded-lg border border-[#202020] bg-[#171717] px-2.5 py-1.5 text-xs font-medium text-[#f8fafc] focus:border-[#f59e0b] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f59e0b]"
            >
              {LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <ArrowRight className="h-4 w-4 text-[#94a3b8]" aria-hidden="true" />

          <div className="flex items-center gap-2">
            <label
              htmlFor="target-language-select"
              className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider"
            >
              Target
            </label>
            <select
              id="target-language-select"
              aria-label="Target Language"
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value as LanguageOption)}
              className="rounded-lg border border-[#202020] bg-[#171717] px-2.5 py-1.5 text-xs font-medium text-[#f8fafc] focus:border-[#f59e0b] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f59e0b]"
            >
              {LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Controls & Verification Badges */}
        <div className="flex items-center gap-3">
          {lastResponse && (
            <div className="flex items-center gap-2">
              <span className="hidden sm:flex items-center gap-1 rounded bg-[#22c55e]/10 px-2 py-1 text-[11px] font-mono font-medium text-[#22c55e] border border-[#22c55e]/20">
                <CheckCircle2 className="h-3 w-3" />
                AST Validated
              </span>
              <button
                onClick={() => openReceiptModal(lastResponse.zdr_receipt)}
                className="flex items-center gap-1.5 rounded bg-[#f59e0b]/10 px-2.5 py-1 text-[11px] font-medium text-[#f59e0b] border border-[#f59e0b]/20 hover:bg-[#f59e0b]/20 transition"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                ZDR Receipt
              </button>
            </div>
          )}

          <button
            onClick={handleTranslate}
            disabled={isLoading || !sourceCode.trim()}
            className="flex items-center gap-2 rounded-lg bg-[#f59e0b] px-4 py-1.5 text-xs font-semibold text-[#0a0a0a] shadow-lg shadow-[#f59e0b]/20 transition hover:bg-[#d97706] disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <RotateCw className="h-3.5 w-3.5 animate-spin" />
                Translating...
              </>
            ) : (
              <>
                <Code2 className="h-3.5 w-3.5" />
                Translate Code
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error banner if translation failed */}
      {error && (
        <div className="flex items-center gap-2 border-b border-[#ef4444]/20 bg-[#ef4444]/10 px-4 py-2 text-xs text-[#ef4444]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Monaco Dual Editors */}
      <div className="grid grid-cols-1 md:grid-cols-2 flex-1 divide-y md:divide-y-0 md:divide-x divide-[#202020] overflow-hidden">
        {/* Source Code Editor */}
        <div className="flex flex-col h-full bg-[#0a0a0a]">
          <div className="flex items-center justify-between border-b border-[#202020] bg-[#111111] px-4 py-1.5 text-[11px] font-mono text-[#94a3b8]">
            <span>INPUT: {sourceLanguage.toUpperCase()}</span>
            <span>Volatile RAM Buffer</span>
          </div>
          <div className="flex-1 min-h-[300px]">
            <Editor
              height="100%"
              language={currentSourceMonaco}
              theme="vs-dark"
              value={sourceCode}
              onChange={(val) => setSourceCode(val || "")}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: "JetBrains Mono, monospace",
                scrollBeyondLastLine: false,
                padding: { top: 12, bottom: 12 },
                lineNumbers: "on",
                automaticLayout: true,
              }}
            />
          </div>
        </div>

        {/* Translated Code Editor */}
        <div className="flex flex-col h-full bg-[#0a0a0a]">
          <div className="flex items-center justify-between border-b border-[#202020] bg-[#111111] px-4 py-1.5 text-[11px] font-mono text-[#94a3b8]">
            <span>OUTPUT: {targetLanguage.toUpperCase()}</span>
            <div className="flex items-center gap-3">
              {lastResponse && (
                <span className="text-[#f59e0b] flex items-center gap-1">
                  <Cpu className="h-3 w-3" />
                  {lastResponse.latency_ms} ms
                </span>
              )}
              {translatedCode && (
                <button
                  onClick={handleCopyTranslated}
                  className="flex items-center gap-1 hover:text-[#f8fafc]"
                  aria-label="Copy translated code"
                >
                  {copied ? <Check className="h-3 w-3 text-[#22c55e]" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 min-h-[300px]">
            <Editor
              height="100%"
              language={currentTargetMonaco}
              theme="vs-dark"
              value={translatedCode}
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: "JetBrains Mono, monospace",
                scrollBeyondLastLine: false,
                padding: { top: 12, bottom: 12 },
                lineNumbers: "on",
                automaticLayout: true,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

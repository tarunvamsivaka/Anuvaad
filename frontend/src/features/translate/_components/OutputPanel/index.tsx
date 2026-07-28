import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Check, Copy, Download, Sparkles, ArrowLeftRight, Loader2, Diff, Code2, FileCode, Clock, Zap, FileOutput } from "lucide-react";
import { cn } from "@/lib/utils";
import { MonacoSkeleton } from "@/components/ui/monaco-skeleton";
import { languages } from "../../_constants/languages";
import { BlockCard } from "../BlockCard";
import { TranslationBlock } from "../../_types";
import { motion, AnimatePresence } from "framer-motion";

const MonacoEditor = dynamic(() => import("@monaco-editor/react").then((mod) => mod.Editor), {
  ssr: false,
  loading: () => <MonacoSkeleton lines={14} />,
});

const DiffEditor = dynamic(() => import("@monaco-editor/react").then((mod) => mod.DiffEditor), {
  ssr: false,
  loading: () => <MonacoSkeleton lines={14} />,
});

interface OutputPanelProps {
  mode: string;
  outputBlocks: TranslationBlock[] | null;
  viewType: "editor" | "blocks" | "diff";
  setViewType: (type: "editor" | "blocks" | "diff") => void;
  handleCopyMarkdown: () => void;
  handleCopyCode: () => void;
  handleExportCode: () => void;
  copied: boolean;
  handleDownloadJson: () => void;
  hasEdits: boolean;
  originalBlocks: TranslationBlock[] | null;
  setOutputBlocks: (blocks: TranslationBlock[] | null) => void;
  isSyncing: boolean;
  handleSyncEnglishToCode: () => void;
  isStreaming: boolean;
  streamText: string;
  rawError: string;
  input: string;
  targetLanguage: string;
  isDark: boolean;
  monacoOptions: any;
  modelUsed: string | null;
  elapsedTime?: number;
  tokenCount?: number;
  throughput?: string;
}

export function OutputPanel({
  mode,
  outputBlocks,
  viewType,
  setViewType,
  handleCopyMarkdown,
  handleCopyCode,
  handleExportCode,
  copied,
  handleDownloadJson,
  hasEdits,
  originalBlocks,
  setOutputBlocks,
  isSyncing,
  handleSyncEnglishToCode,
  isStreaming,
  streamText,
  rawError,
  input,
  targetLanguage,
  isDark,
  monacoOptions,
  modelUsed,
  elapsedTime = 0,
  tokenCount = 0,
  throughput = "0.0",
}: OutputPanelProps) {
  const fullCodeText = outputBlocks
    ? outputBlocks.map((b) => b.code_snippet).filter(Boolean).join("\n\n")
    : "";

  const monacoLang = languages.find((l) => l.value === targetLanguage)?.monacoId || targetLanguage;

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      {/* Header bar with controls */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200/50 dark:border-white/10 bg-transparent px-4 py-2.5 gap-2">
        <div className="flex items-center gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-text-muted">
            {mode === "code-to-english" ? "AI Analysis" : "Generated Code"}
          </p>

          {/* View switcher tabs: Monaco Editor, Structured Blocks, Diff */}
          <div className="flex items-center bg-slate-100 dark:bg-surface-high rounded-lg p-0.5 ml-2 border border-slate-200/60 dark:border-white/5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewType("editor")}
              className={cn(
                "h-6 gap-1 px-2 text-[10px] rounded-md font-bold transition-all",
                viewType === "editor"
                  ? "bg-white dark:bg-surface-overlay shadow-sm text-amber-500 dark:text-amber-400"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              )}
            >
              <Code2 className="h-3 w-3" /> Monaco
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewType("blocks")}
              className={cn(
                "h-6 gap-1 px-2 text-[10px] rounded-md font-bold transition-all",
                viewType === "blocks"
                  ? "bg-white dark:bg-surface-overlay shadow-sm text-amber-500 dark:text-amber-400"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              )}
            >
              <FileCode className="h-3 w-3" /> Blocks
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewType("diff")}
              className={cn(
                "h-6 gap-1 px-2 text-[10px] rounded-md font-bold transition-all",
                viewType === "diff"
                  ? "bg-white dark:bg-surface-overlay shadow-sm text-amber-500 dark:text-amber-400"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              )}
            >
              <Diff className="h-3 w-3" /> Diff
            </Button>
          </div>
        </div>

        {/* Quick action buttons & export utilities */}
        {outputBlocks && outputBlocks.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyCode}
              className="h-7 gap-1.5 px-2.5 text-[10px] bg-background border-slate-200 dark:border-amber-500/20 hover:bg-slate-50 dark:hover:bg-amber-900/10 font-bold"
              title="Copy raw code snippet"
            >
              <Copy className="h-3 w-3 text-amber-500" />
              Copy Code
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyMarkdown}
              className="h-7 gap-1.5 px-2.5 text-[10px] bg-background border-slate-200 dark:border-amber-500/20 hover:bg-slate-50 dark:hover:bg-amber-900/10 font-bold"
              title="Copy as formatted Markdown"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy as Markdown"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCode}
              className="h-7 gap-1.5 px-2.5 text-[10px] bg-background border-slate-200 dark:border-amber-500/20 hover:bg-slate-50 dark:hover:bg-amber-900/10 font-bold"
              title="Export as target code file (.py, .ts, .rs, etc.)"
            >
              <FileOutput className="h-3 w-3 text-amber-500" />
              Export Code
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadJson}
              className="h-7 gap-1.5 px-2.5 text-[10px] bg-background border-slate-200 dark:border-amber-500/20 hover:bg-slate-50 dark:hover:bg-amber-900/10 font-bold"
              title="Download JSON blocks"
            >
              <Download className="h-3 w-3" />
              Download JSON
            </Button>
          </div>
        )}
      </div>

      {/* Sync Banner for Modified Explanations */}
      {hasEdits && mode === "code-to-english" && (
        <div className="bg-amber-500/5 border-b border-amber-500/10 px-4 py-2 flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-200">
          <span className="text-xs font-bold text-amber-500 dark:text-amber-500/90 flex items-center gap-1.5 pr-4">
            <Sparkles className="h-3.5 w-3.5 animate-pulse text-amber-500 shrink-0" />
            Modified explanations detected. Sync back to update code?
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
              onClick={() => setOutputBlocks(originalBlocks ? JSON.parse(JSON.stringify(originalBlocks)) : null)}
              disabled={isSyncing}
            >
              Reset Edits
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs bg-amber-500 hover:bg-amber-600 text-white gap-1.5 shadow-sm font-bold"
              onClick={handleSyncEnglishToCode}
              disabled={isSyncing}
            >
              {isSyncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowLeftRight className="h-3 w-3" />}
              Sync to Code
            </Button>
          </div>
        </div>
      )}

      {/* Output Body View */}
      <div className="flex-1 overflow-auto bg-transparent relative min-h-0">
        <AnimatePresence mode="wait">
          {/* Live SSE Streaming View with Real-time Metrics */}
          {isStreaming || (streamText.length > 0 && !outputBlocks) ? (
            <motion.div
              key="streaming"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                "p-5 m-4 rounded-xl bg-white/80 dark:bg-surface-charcoal/90 border backdrop-blur-md shadow-lg flex flex-col h-[calc(100%-2rem)] overflow-hidden",
                rawError ? "border-red-500" : "border-slate-200 dark:border-amber-500/20"
              )}
            >
              {/* Real-time SSE metrics header bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-200/60 dark:border-white/10 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="relative flex h-2.5 w-2.5">
                    {isStreaming && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    )}
                    <span className={cn("relative inline-flex rounded-full h-2.5 w-2.5", isStreaming ? "bg-amber-500" : "bg-emerald-500")} />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 font-mono">
                    {isStreaming ? "Live SSE Token Streaming" : "Streaming Completed"}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono">
                  <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-md">
                    <Clock className="h-3 w-3 text-amber-500" />
                    {elapsedTime}s
                  </span>
                  <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-md">
                    <Code2 className="h-3 w-3 text-blue-400" />
                    {tokenCount} tokens
                  </span>
                  <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-md">
                    <Zap className="h-3 w-3 text-emerald-400" />
                    {throughput} t/s
                  </span>
                </div>
              </div>

              {/* Progress shimmer bar when streaming */}
              {isStreaming && (
                <div className="w-full h-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden mb-3 shrink-0">
                  <div className="h-full bg-gradient-to-r from-amber-500 via-orange-400 to-amber-500 animate-pulse w-full" />
                </div>
              )}

              {rawError && (
                <div className="text-sm text-red-500 whitespace-pre-wrap font-mono mb-3 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                  {rawError}
                </div>
              )}

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <pre
                  aria-label="Translation output"
                  aria-live="polite"
                  aria-atomic="false"
                  className={cn(
                    "font-mono text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words leading-relaxed p-1",
                    isStreaming ? "blinking-cursor" : ""
                  )}
                >
                  {streamText}
                </pre>
              </div>
            </motion.div>
          ) : rawError && !streamText ? (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6 text-sm text-red-500 whitespace-pre-wrap font-mono bg-red-500/5 m-4 rounded-xl border border-red-500/30 shadow-md"
            >
              {rawError}
            </motion.div>
          ) : outputBlocks ? (
            <motion.div
              key="output"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full flex flex-col"
            >
              {/* Monaco Editor View */}
              {viewType === "editor" ? (
                <div className="h-full w-full relative">
                  <MonacoEditor
                    height="100%"
                    language={monacoLang}
                    theme={isDark ? "vs-dark" : "light"}
                    value={fullCodeText || outputBlocks.map((b) => b.english_translation).join("\n\n")}
                    options={{
                      ...monacoOptions,
                      readOnly: true,
                      domReadOnly: true,
                    }}
                  />
                  {modelUsed && (
                    <div className="absolute bottom-3 right-4 z-20">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 bg-white/90 dark:bg-surface-charcoal/90 backdrop-blur-md px-3 py-1 rounded-full shadow-md border border-slate-200 dark:border-amber-500/20 flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3 text-amber-500" />
                        Model: {modelUsed}
                      </span>
                    </div>
                  )}
                </div>
              ) : viewType === "diff" ? (
                /* Monaco Diff Editor View */
                <div className="h-full w-full p-2">
                  <DiffEditor
                    height="100%"
                    original={input}
                    modified={fullCodeText || (outputBlocks ? outputBlocks.map((b) => b.english_translation).join("\n\n") : "")}
                    language={monacoLang}
                    theme={isDark ? "vs-dark" : "light"}
                    options={{
                      ...monacoOptions,
                      readOnly: true,
                      renderSideBySide: true,
                      originalEditable: false,
                    }}
                  />
                </div>
              ) : (
                /* Structured Blocks View */
                <div className="p-4 flex flex-col gap-3 overflow-y-auto custom-scrollbar">
                  {outputBlocks.map((block, idx) => (
                    <BlockCard
                      key={block.id || idx}
                      block={block}
                      index={idx}
                      onEditBlock={(newEnglish) => {
                        const updated = [...outputBlocks];
                        updated[idx] = { ...updated[idx], english_translation: newEnglish };
                        setOutputBlocks(updated);
                      }}
                    />
                  ))}

                  {modelUsed && (
                    <div className="mt-4 flex items-center justify-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-3.5 py-1.5 rounded-full shadow-sm border border-slate-200 dark:border-amber-500/10 flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3 text-amber-500" />
                        Generated by {modelUsed}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            /* Empty State */
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-full min-h-[350px] items-center justify-center"
            >
              <div className="text-center max-w-sm px-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-lg">
                  <Code2 className="h-8 w-8 text-amber-500" />
                </div>
                <p className="mt-5 text-base font-bold text-slate-800 dark:text-slate-100">Workspace Ready</p>
                <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-text-muted">
                  Paste your code or requirements into the Monaco editor on the left panel, select your target language and LLM model, then click Translate.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

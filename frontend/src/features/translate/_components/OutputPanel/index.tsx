import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Check, Copy, Download, Sparkles, ArrowLeftRight, Loader2, Diff, Code2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { languages } from "../../_constants/languages";
import { BlockCard } from "../BlockCard";
import { TranslationBlock } from "../../_types";
import { motion, AnimatePresence } from "framer-motion";

const DiffEditor = dynamic(() => import("@monaco-editor/react").then((mod) => mod.DiffEditor), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full min-h-[500px] rounded-lg skeleton-pulse" />,
});

interface OutputPanelProps {
  mode: string;
  outputBlocks: TranslationBlock[] | null;
  viewType: "blocks" | "diff";
  setViewType: (type: "blocks" | "diff") => void;
  handleCopyMarkdown: () => void;
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
}

export function OutputPanel({
  mode,
  outputBlocks,
  viewType,
  setViewType,
  handleCopyMarkdown,
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
}: OutputPanelProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-white/10 bg-transparent px-4 py-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#8494b0]">
          {mode === "code-to-english" ? "AI Analysis" : "Generated Code"}
        </p>
        {outputBlocks && (
          <div className="flex items-center gap-1.5">
            {mode === "code-to-code" && (
              <div className="flex items-center bg-slate-100 dark:bg-surface-high rounded-md p-0.5 mr-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewType("blocks")}
                  className={cn("h-6 px-2.5 text-[10px] rounded-sm font-bold", viewType === "blocks" ? "bg-white dark:bg-surface-overlay shadow-sm text-amber-500 dark:text-amber-400" : "text-slate-500 hover:text-slate-700")}
                >
                  Blocks
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewType("diff")}
                  className={cn("h-6 gap-1 px-2.5 text-[10px] rounded-sm font-bold", viewType === "diff" ? "bg-white dark:bg-surface-overlay shadow-sm text-amber-500 dark:text-amber-400" : "text-slate-500 hover:text-slate-700")}
                >
                  <Diff className="h-3 w-3" /> Diff
                </Button>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={handleCopyMarkdown} className="h-7 gap-1.5 px-3 text-[10px] bg-background border-slate-200 dark:border-amber-500/20 hover:bg-slate-50 dark:hover:bg-amber-900/10 font-bold">
              {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied MD" : "Copy as Markdown"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadJson} className="h-7 gap-1.5 px-3 text-[10px] bg-background border-slate-200 dark:border-amber-500/20 hover:bg-slate-50 dark:hover:bg-amber-900/10 font-bold">
              <Download className="h-3 w-3" />
              Download JSON
            </Button>
          </div>
        )}
      </div>
      
      {hasEdits && mode === "code-to-english" && (
        <div className="bg-amber-500/5 border-b border-amber-500/10 px-4 py-2.5 flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-200">
          <span className="text-xs font-bold text-amber-500 dark:text-amber-500/90 flex items-center gap-1.5 pr-4 leading-normal">
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
              className="h-7 text-xs bg-amber-500 hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-500 text-white gap-1.5 shadow-sm font-bold"
              onClick={handleSyncEnglishToCode}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <ArrowLeftRight className="h-3 w-3" />
              )}
              Sync to Code
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto bg-transparent relative min-h-0">
        <AnimatePresence mode="wait">
          {(isStreaming || (streamText.length > 0 && !outputBlocks)) ? (
            <motion.div
              key="streaming"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                "p-6 m-4 rounded-lg bg-white dark:bg-surface-charcoal border shadow-sm", 
                rawError ? "border-red-500" : "border-slate-200 dark:border-amber-500/10"
              )}
            >
              <div className="flex items-center gap-2 mb-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider" role="status" aria-live="polite">
                 {isStreaming ? (
                   <><div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" /> Generating...</>
                 ) : (
                   <><div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Done</>
                 )}
              </div>
              {rawError && (
                 <div className="text-sm text-red-500 whitespace-pre-wrap font-mono mb-4">{rawError}</div>
              )}
              <pre aria-label="Translation output" aria-live="polite" aria-atomic="false" className={cn("font-mono text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words leading-relaxed", isStreaming ? "blinking-cursor" : "")}>
                {streamText}
              </pre>
            </motion.div>
          ) : rawError && !streamText ? (
            <motion.div 
              key="error"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="p-6 text-sm text-red-500 whitespace-pre-wrap font-mono bg-red-500/5 m-4 rounded-lg border border-red-500/30"
            >
              {rawError}
            </motion.div>
          ) : outputBlocks ? (
            <motion.div 
              key="output"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="h-full"
            >
              {viewType === "diff" && mode === "code-to-code" ? (
                <div className="h-full w-full p-2">
                  <DiffEditor
                    height="100%"
                    original={input}
                    modified={outputBlocks.map(b => b.code_snippet).join("\n\n")}
                    language={languages.find(l => l.value === targetLanguage)?.monacoId || targetLanguage}
                    theme={isDark ? "vs-dark" : "light"}
                    options={{
                      ...monacoOptions,
                      readOnly: true,
                      renderSideBySide: true,
                    }}
                  />
                </div>
              ) : (
                <div className="p-4 flex flex-col gap-2">
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
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-white/5 px-3 py-1.5 rounded-full shadow-sm border border-slate-200 dark:border-amber-500/10 flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3 text-amber-500" />
                        Generated by {modelUsed}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex h-full min-h-[300px] items-center justify-center"
            >
              <div className="text-center max-w-sm px-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-amber-500/10 shadow-sm">
                  <Code2 className="h-7 w-7 text-amber-500" />
                </div>
                <p className="mt-5 text-sm font-bold text-slate-800 dark:text-slate-200">Workspace Empty</p>
                <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-[#8494b0]">
                  Paste your code or requirements in the input panel on the left to generate translations.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

import dynamic from "next/dynamic";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, RotateCcw, Sparkles, X, FileCode, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { FileDropZone } from "./FileDropZone";
import { languages } from "../../_constants/languages";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const Editor = dynamic(() => import("@monaco-editor/react").then((mod) => mod.Editor), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full min-h-[500px] rounded-lg" />,
});

const GithubIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

interface InputPanelProps {
  mode: string;
  uploadedFile: { name: string; size: number } | null;
  handleClearFile: () => void;
  gistSource: { username: string; filename: string } | null;
  setGistSource: (source: { username: string; filename: string } | null) => void;
  input: string;
  setInput: (val: string) => void;
  isStreaming: boolean;
  handleTranslate: () => void;
  handleClear: () => void;
  sourceLanguage: string;
  setSourceLanguage: (lang: string) => void;
  isDark: boolean;
  monacoOptions: any;
  detectedLang: string | null;
  setDetectedLang: (lang: string | null) => void;
  isTypingManually: boolean;
  setIsTypingManually: (val: boolean) => void;
  getRootProps: any;
  getInputProps: any;
  isDragActive: boolean;
  showGistInput: boolean;
  setShowGistInput: (val: boolean) => void;
  gistUrl: string;
  setGistUrl: (val: string) => void;
  gistLoading: boolean;
  handleGistImport: () => void;
  hasOutputBlocks: boolean;
}

export function InputPanel({
  mode,
  uploadedFile,
  handleClearFile,
  gistSource,
  setGistSource,
  input,
  setInput,
  isStreaming,
  handleTranslate,
  handleClear,
  sourceLanguage,
  setSourceLanguage,
  isDark,
  monacoOptions,
  detectedLang,
  setDetectedLang,
  isTypingManually,
  setIsTypingManually,
  getRootProps,
  getInputProps,
  isDragActive,
  showGistInput,
  setShowGistInput,
  gistUrl,
  setGistUrl,
  gistLoading,
  handleGistImport,
  hasOutputBlocks,
}: InputPanelProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-white/10 bg-transparent px-4 py-3">
        <div className="flex items-center gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#8494b0]">
            {mode === "english-to-code" ? "Requirements (English)" : "Source Code"}
          </p>
          {uploadedFile && (
            <Badge variant="secondary" className="gap-1.5 text-[10px] font-bold border border-slate-200 dark:border-amber-500/10">
              <FileCode className="h-3 w-3 text-amber-500" />
              {uploadedFile.name}
              <button aria-label="Remove file" onClick={handleClearFile} className="ml-1 rounded-full hover:bg-muted p-0.5">
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          )}
          {gistSource && (
            <Badge variant="secondary" className="gap-1.5 text-[10px] font-bold border border-[#24292e]/20 dark:border-white/10 bg-surface-high/5 text-text-on-brand dark:bg-white/5 dark:text-white">
              <GithubIcon className="h-3 w-3 text-amber-500" />
              github.com/{gistSource.username} — {gistSource.filename}
              <button aria-label="Remove GitHub source" onClick={() => { setGistSource(null); handleClearFile(); }} className="ml-1 rounded-full hover:bg-muted p-0.5">
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{input.length.toLocaleString()} chars</span>
          <Button variant="ghost" size="sm" aria-label="Clear" onClick={handleClear} className="h-7 w-7 p-0 rounded-full hover:bg-slate-100 dark:hover:bg-white/5"><RotateCcw className="h-3.5 w-3.5 text-amber-500" /></Button>
          <Button onClick={handleTranslate} disabled={!input.trim() && !isStreaming} 
            aria-label={isStreaming ? "Stop translation" : "Translate code"}
            size="sm"
            className={cn(
              "gap-1.5 shadow-sm transition-all text-white h-8 px-3 text-xs font-bold",
              isStreaming ? "bg-destructive hover:bg-destructive/90" : "bg-amber-500 hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-500"
            )}>
            {isStreaming ? (
              <><X className="h-3.5 w-3.5" /> Stop</>
            ) : (
              <><Sparkles className="h-3.5 w-3.5" /> Translate</>
            )}
          </Button>
        </div>
      </div>
      
      {mode === "english-to-code" ? (
        <textarea 
          aria-label="Input editor"
          title="Input editor"
          value={input} onChange={(e) => setInput(e.target.value)}
          placeholder="Describe the functionality you need. Be as detailed as possible..."
          className="flex-1 resize-none border-0 bg-transparent p-6 font-sans text-sm leading-relaxed focus:outline-none min-h-0"
          onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleTranslate(); }}
        />
      ) : (
        <div className="flex-1 relative min-h-0">
          <Editor
            height="100%"
            language={languages.find(l => l.value === sourceLanguage)?.monacoId || sourceLanguage}
            theme={isDark ? "vs-dark" : "light"}
            value={input}
            onChange={(val) => setInput(val || "")}
            onMount={(editor) => {
              if (typeof window !== "undefined") {
                (window as unknown as Record<string, unknown>).__monacoEditor = editor;
              }
            }}
            options={monacoOptions}
          />
          
          {detectedLang && (
            <div className="absolute bottom-3 right-3 z-30 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Button 
                size="sm" 
                onClick={() => {
                  setSourceLanguage(detectedLang);
                  setDetectedLang(null);
                  toast.success(`Language switched to ${languages.find(l => l.value === detectedLang)?.label}!`);
                }}
                className="bg-amber-500 hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-500 text-white font-bold text-xs gap-1.5 shadow-lg border border-amber-500/20 px-4 h-8 rounded-full"
              >
                <Sparkles className="h-3.5 w-3.5 animate-pulse text-amber-300" />
                Switch to {languages.find(l => l.value === detectedLang)?.label}?
              </Button>
            </div>
          )}
          {!input && !isTypingManually && (
            <FileDropZone
              getRootProps={getRootProps}
              getInputProps={getInputProps}
              isDragActive={isDragActive}
              setIsTypingManually={setIsTypingManually}
              setInput={setInput}
              setSourceLanguage={setSourceLanguage}
            />
          )}

          {!input && mode !== "english-to-code" && (
            <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center">
              {showGistInput ? (
                <div className="flex items-center gap-2 bg-white dark:bg-surface-charcoal border border-slate-200 dark:border-amber-500/20 rounded-lg px-3 py-2 shadow-lg w-[90%] max-w-md animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <GithubIcon className="h-4 w-4 text-slate-400 dark:text-slate-600 shrink-0" />
                  <input
                    type="url"
                    value={gistUrl}
                    onChange={(e) => setGistUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleGistImport(); }}
                    placeholder="https://gist.github.com/username/abc123"
                    className="flex-1 bg-transparent border-none text-sm focus:outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    autoFocus
                    disabled={gistLoading}
                  />
                  {gistLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-amber-500" />
                  ) : (
                    <>
                      <Button variant="ghost" size="sm" aria-label="Import Gist" className="h-7 w-7 p-0" onClick={handleGistImport} disabled={!gistUrl.trim()}>
                        <ArrowRight className="h-3.5 w-3.5 text-amber-500" />
                      </Button>
                      <Button variant="ghost" size="sm" aria-label="Cancel Gist import" className="h-7 w-7 p-0" onClick={() => { setShowGistInput(false); setGistUrl(""); }}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowGistInput(true)}
                  className="gap-2 bg-white dark:bg-surface-charcoal border border-slate-200 dark:border-amber-500/10 hover:bg-slate-50 dark:hover:bg-amber-900/10 shadow-sm text-xs font-bold"
                >
                  <GithubIcon className="h-3.5 w-3.5 text-amber-500" />
                  Import Gist
                </Button>
              )}
            </div>
          )}
        </div>
      )}
      
      <div className="border-t border-slate-200/50 dark:border-white/10 bg-transparent px-4 py-2.5 flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 font-medium">
        <div className="flex gap-4">
          <span><kbd className="px-1 py-0.5 bg-slate-100 dark:bg-surface-high rounded border border-slate-200 dark:border-amber-500/20 text-[9px] font-mono">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-surface-high rounded border border-slate-200 dark:border-amber-500/20 text-[9px] font-mono">Alt</kbd> + <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-surface-high rounded border border-slate-200 dark:border-amber-500/20 text-[9px] font-mono">C</kbd> Clear</span>
          {hasOutputBlocks && (
            <span><kbd className="px-1 py-0.5 bg-slate-100 dark:bg-surface-high rounded border border-slate-200 dark:border-amber-500/20 text-[9px] font-mono">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-surface-high rounded border border-slate-200 dark:border-amber-500/20 text-[9px] font-mono">Shift</kbd> + <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-surface-high rounded border border-slate-200 dark:border-amber-500/20 text-[9px] font-mono">C</kbd> Copy Markdown</span>
          )}
        </div>
        <span>Press <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-surface-high rounded border border-slate-200 dark:border-amber-500/20 text-[9px] font-mono">Ctrl/⌘</kbd> + <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-surface-high rounded border border-slate-200 dark:border-amber-500/20 text-[9px] font-mono">Enter</kbd></span>
      </div>
    </div>
  );
}

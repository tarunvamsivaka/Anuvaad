"use client";

import { useState, useEffect, useRef, useMemo, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import { useDropzone } from "react-dropzone";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

const Editor = dynamic(() => import("@monaco-editor/react").then((mod) => mod.Editor), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full min-h-[500px] rounded-lg" />,
});
const MotionDiv = dynamic(() => import("framer-motion").then((mod) => mod.motion.div), {
  ssr: false,
});
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowRight, Copy, Download, Loader2, RotateCcw,
  Sparkles, Code2, FileText, ArrowLeftRight, Check, Settings, Zap,
  ChevronDown, ChevronUp, X, Upload, FileCode, Pencil,
  Activity, Cpu, ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useCredits } from "@/lib/hooks";
import { track } from "@/lib/analytics";
import { toast } from "sonner";

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

const languages: { value: string; label: string; monacoId: string }[] = [
  // Web
  { value: "html", label: "HTML", monacoId: "html" },
  { value: "css", label: "CSS", monacoId: "css" },
  { value: "javascript", label: "JavaScript", monacoId: "javascript" },
  { value: "typescript", label: "TypeScript", monacoId: "typescript" },
  // Systems
  { value: "python", label: "Python", monacoId: "python" },
  { value: "java", label: "Java", monacoId: "java" },
  { value: "cpp", label: "C++", monacoId: "cpp" },
  { value: "c", label: "C", monacoId: "c" },
  { value: "csharp", label: "C#", monacoId: "csharp" },
  { value: "go", label: "Go", monacoId: "go" },
  { value: "rust", label: "Rust", monacoId: "rust" },
  // Mobile & App
  { value: "swift", label: "Swift", monacoId: "swift" },
  { value: "kotlin", label: "Kotlin", monacoId: "kotlin" },
  { value: "dart", label: "Dart", monacoId: "dart" },
  { value: "objective-c", label: "Objective-C", monacoId: "objective-c" },
  // Scripting
  { value: "php", label: "PHP", monacoId: "php" },
  { value: "ruby", label: "Ruby", monacoId: "ruby" },
  { value: "perl", label: "Perl", monacoId: "perl" },
  { value: "lua", label: "Lua", monacoId: "lua" },
  { value: "r", label: "R", monacoId: "r" },
  { value: "matlab", label: "MATLAB", monacoId: "matlab" },
  // Data & Query
  { value: "sql", label: "SQL", monacoId: "sql" },
  { value: "graphql", label: "GraphQL", monacoId: "graphql" },
  // Shell & DevOps
  { value: "bash", label: "Bash / Shell", monacoId: "shell" },
  { value: "powershell", label: "PowerShell", monacoId: "powershell" },
  { value: "dockerfile", label: "Dockerfile", monacoId: "dockerfile" },
  { value: "yaml", label: "YAML", monacoId: "yaml" },
  // Functional & Other
  { value: "scala", label: "Scala", monacoId: "scala" },
  { value: "haskell", label: "Haskell", monacoId: "haskell" },
  { value: "elixir", label: "Elixir", monacoId: "elixir" },
  { value: "clojure", label: "Clojure", monacoId: "clojure" },
  // Markup & Config
  { value: "json", label: "JSON", monacoId: "json" },
  { value: "xml", label: "XML", monacoId: "xml" },
  { value: "markdown", label: "Markdown", monacoId: "markdown" },
  // Assembly
  { value: "assembly", label: "Assembly", monacoId: "mips" },
];

const modes = [
  { id: "code-to-english", label: "Code → English", icon: FileText },
  { id: "english-to-code", label: "English → Code", icon: Code2 },
  { id: "code-to-code", label: "Code → Code", icon: ArrowLeftRight },
];

// Module-level constants — created once, never cause re-renders
const EXT_TO_LANGUAGE: Record<string, string> = {
  ".py": "python", ".js": "javascript", ".ts": "typescript",
  ".java": "java", ".cpp": "cpp", ".rs": "rust",
  ".go": "go", ".c": "c", ".cs": "csharp",
};
const ACCEPTED_EXTENSIONS = Object.keys(EXT_TO_LANGUAGE);

function detectLanguage(code: string): string | null {
  if (!code || code.trim().length < 15) return null;
  
  // 1. Python: def statement, import, print statement without semicolons, snake_case
  if (/def\s+[a-zA-Z_]\w*\s*\(|import\s+[a-zA-Z_]\w*(?:\s*,\s*[a-zA-Z_]\w*)*\n|#\s+.*|elif\s+|if\s+__name__\s*==\s*['"]__main__['"]/.test(code)) {
    return "python";
  }
  
  // 2. TypeScript / JavaScript React: import React, interface / type (TS), const [x, setX] = useState
  if (/import\s+.*\s+from\s+['"]react['"]|const\s+\[\w+,\s*set\w+\]\s*=\s*useState|export\s+default\s+function|interface\s+[A-Z]\w*\s*\{|type\s+[A-Z]\w*\s*=/.test(code)) {
    return "typescript";
  }
  
  // 3. JavaScript: console.log, function, let/const, arrow functions
  if (/console\.log\(|const\s+\w+\s*=\s*\(.*\)\s*=>|let\s+\w+\s*=|var\s+\w+\s*=/.test(code)) {
    return "javascript";
  }

  // 4. Rust: fn main, pub struct, impl, let mut, use std
  if (/fn\s+main\(\)|pub\s+struct\s+[A-Z]|impl\s+[A-Z]|let\s+mut\s+\w+|use\s+std::/.test(code)) {
    return "rust";
  }

  // 5. C++: #include, std::cout, int main, class, namespace
  if (/#include\s*<[a-z]+>|std::cout|int\s+main\(\s*\)|using\s+namespace\s+std;/.test(code)) {
    return "cpp";
  }

  // 6. Go: package main, func main, import (, fmt.Println
  if (/package\s+main|func\s+main\(\)|import\s*\(\n|fmt\.Println/.test(code)) {
    return "go";
  }

  // 7. Java: public class, public static void main, System.out.println
  if (/public\s+class\s+[A-Z]|public\s+static\s+void\s+main|System\.out\.println/.test(code)) {
    return "java";
  }

  return null;
}

function SearchableLanguageSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = languages.find((l) => l.value === value);
  const filtered = languages.filter((l) =>
    l.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <div 
        onClick={() => { setOpen(!open); setSearch(""); }}
        className="flex items-center gap-2 bg-background border border-border hover:border-amber-600/40 rounded-lg px-3 py-1.5 shadow-sm cursor-pointer select-none transition-colors"
      >
        <span className="text-xs font-medium text-muted-foreground">{label}:</span>
        <span className="text-sm font-medium text-foreground">{selected?.label || value}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
      </div>

      {open && (
        <Card className="absolute right-0 top-full mt-1.5 z-45 w-56 p-1.5 shadow-xl border border-border/80 bg-popover text-popover-foreground animate-in fade-in slide-in-from-top-1 duration-150">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search language..."
            className="h-8 text-xs mb-1.5 bg-muted/40 border-none focus-visible:ring-1 focus-visible:ring-amber-500"
            autoFocus
          />
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {filtered.length > 0 ? (
              filtered.map((l) => (
                <div
                  key={l.value}
                  onClick={() => {
                    onChange(l.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-between px-2 py-1.5 rounded text-xs cursor-pointer select-none transition-all",
                    l.value === value 
                      ? "bg-amber-600/10 text-amber-700 dark:text-amber-500 font-medium" 
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span>{l.label}</span>
                  {l.value === value && <Check className="h-3 w-3 text-amber-600 shrink-0" />}
                </div>
              ))
            ) : (
              <p className="p-2 text-center text-[10px] text-muted-foreground">No matches found</p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

interface TranslationBlock {
  id: string;
  code_snippet: string;
  english_translation: string;
}

function TranslationBlockCard({ block, index, onEditBlock }: { block: TranslationBlock; index: number; onEditBlock?: (newEnglish: string) => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(block.english_translation);

  useEffect(() => {
    setEditedText(block.english_translation);
  }, [block.english_translation]);

  const copyCode = () => {
    navigator.clipboard.writeText(block.code_snippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyText = () => {
    navigator.clipboard.writeText(block.english_translation);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut", delay: Math.min(index * 0.05, 0.4) }}
    >
      <Card className="mb-4 overflow-hidden border-border/60 shadow-sm transition-all duration-200 hover:border-amber-600/35 hover:shadow-md dark:hover:shadow-amber-950/5">
        <div className="flex items-center justify-between border-b border-border/40 bg-muted/20 px-4 py-2.5">
          <Badge variant="outline" className="bg-amber-600/10 text-amber-600 border-amber-600/20 font-medium">
            Block {index + 1}
          </Badge>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => setCollapsed(!collapsed)}>
              {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        
        {!collapsed && (
          <div className="flex flex-col animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="relative border-b border-border/40 bg-[#0d0d0d] p-4 group">
              <pre className="font-mono text-xs md:text-sm text-gray-300 overflow-x-auto whitespace-pre-wrap break-words leading-relaxed">
                <code>{block.code_snippet}</code>
              </pre>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={copyCode} 
                className="absolute right-3 top-3 h-7 gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 text-white hover:bg-white/20 border-0 shadow-sm"
              >
                {copiedCode ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                {copiedCode ? "Copied" : "Copy code"}
              </Button>
            </div>
            <div className="relative p-4 md:p-5 bg-background group">
              {isEditing ? (
                <div className="flex flex-col gap-2 w-full animate-in fade-in duration-200">
                  <textarea
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    className="w-full text-sm leading-relaxed p-2.5 border border-border/80 rounded-md bg-background focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none resize-y min-h-[80px] font-sans"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground hover:bg-muted"
                      onClick={() => {
                        setEditedText(block.english_translation);
                        setIsEditing(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      className="h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white gap-1"
                      onClick={() => {
                        onEditBlock?.(editedText);
                        setIsEditing(false);
                      }}
                    >
                      <Check className="h-3 w-3" />
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm leading-relaxed text-foreground/90 pr-24 whitespace-pre-wrap">
                    {block.english_translation}
                  </p>
                  <div className="absolute right-3 top-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsEditing(true)} 
                      className="h-7 gap-1 bg-background shadow-sm hover:bg-muted"
                    >
                      <Pencil className="h-3 w-3" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={copyText} 
                      className="h-7 gap-1.5 bg-background shadow-sm"
                    >
                      {copiedText ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      {copiedText ? "Copied" : "Copy text"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </Card>
    </MotionDiv>
  );
}

function TranslatePageContent() {
  const { isPro, session } = useAuth();
  const { credits, isLoading: creditsLoading } = useCredits(session?.access_token);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const searchParams = useSearchParams();

  const [mode, setMode] = useState("code-to-english");
  const [sourceLanguage, setSourceLanguage] = useState("python");
  const [targetLanguage, setTargetLanguage] = useState("javascript");
  const [input, setInput] = useState("");
  const [isTypingManually, setIsTypingManually] = useState(false);
  const [customInstructions, setCustomInstructions] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number } | null>(null);
  const [gistSource, setGistSource] = useState<{ username: string; filename: string } | null>(null);
  const [showGistInput, setShowGistInput] = useState(false);
  const [gistUrl, setGistUrl] = useState("");
  const [gistLoading, setGistLoading] = useState(false);
  const [detectedLang, setDetectedLang] = useState<string | null>(null);

  const [outputBlocks, setOutputBlocks] = useState<TranslationBlock[] | null>(null);
  const [originalBlocks, setOriginalBlocks] = useState<TranslationBlock[] | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null);
  // Buffer SSE chunks; flush at rAF cadence (~60 Hz) instead of per-chunk setState
  const streamBufferRef = useRef("");
  const rafIdRef = useRef<number | null>(null);
  const [rawError, setRawError] = useState("");
  const [copied, setCopied] = useState(false);
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const onFileDrop = useCallback((acceptedFiles: globalThis.File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!EXT_TO_LANGUAGE[ext]) {
      toast.error(`Unsupported file type. Allowed: ${ACCEPTED_EXTENSIONS.join(", ")}`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      setInput(text);
      setUploadedFile({ name: file.name, size: file.size });
      // Auto-detect language
      const detectedLang = EXT_TO_LANGUAGE[ext];
      if (detectedLang) setSourceLanguage(detectedLang);
      track("file_uploaded", { extension: ext, size_bytes: file.size, detected_language: detectedLang || "unknown" });
    };
    reader.readAsText(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onFileDrop,
    accept: { "text/plain": ACCEPTED_EXTENSIONS },
    maxFiles: 1,
    noClick: false,
    disabled: mode === "english-to-code",
  });

  const handleClearFile = useCallback(() => {
    setUploadedFile(null);
    setGistSource(null);
    setInput("");
    setIsTypingManually(false);
    setOutputBlocks(null);
    setOriginalBlocks(null);
    setStreamText("");
    setRawError("");
    setLatencyMs(null);
  }, []);

  const handleGistImport = async () => {
    if (!gistUrl.trim()) return;
    setGistLoading(true);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API}/api/import-gist?url=${encodeURIComponent(gistUrl.trim())}`);
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setInput(data.content);
      setSourceLanguage(data.language);
      setGistSource({ username: data.username, filename: data.filename });
      setUploadedFile(null);
      setShowGistInput(false);
      setGistUrl("");
      toast.success(`Imported ${data.filename} (${data.char_count.toLocaleString()} chars)`);
      track("gist_imported", { language: data.language, char_count: data.char_count, username: data.username });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to import Gist";
      toast.error(message);
    } finally {
      setGistLoading(false);
    }
  };

  // Read ?mode= query param on mount to pre-select translation mode
  useEffect(() => {
    const modeParam = searchParams.get("mode");
    if (modeParam && modes.some(m => m.id === modeParam)) {
      requestAnimationFrame(() => {
        setMode(modeParam);
      });
    }
  }, [searchParams]);
  
  const { activeWorkspace } = useWorkspace();

  const currentMode = useMemo(() => modes.find((m) => m.id === mode)!, [mode]);

  // Stable Monaco options object — prevents Monaco re-applying settings on every render
  const monacoOptions = useMemo(() => ({
    minimap: { enabled: false },
    fontSize: 14,
    lineHeight: 24,
    padding: { top: 20 },
    scrollBeyondLastLine: false,
    fontFamily: "'JetBrains Mono', 'Geist Mono', monospace",
  }), []);

  const handleTranslate = useCallback(async () => {
    if (!input.trim()) return;

    if (isStreaming && readerRef.current) {
      readerRef.current.cancel();
      setIsStreaming(false);
      return;
    }

    setIsStreaming(true);
    setOutputBlocks(null);
    setStreamText("");
    setRawError("");
    setModelUsed(null);
    setLatencyMs(null);

    const translateStartTime = Date.now();
    track("translation_started", {
      mode,
      source_language: sourceLanguage,
      target_language: targetLanguage,
      char_count: input.length,
      is_pro: isPro,
    });

    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      let endpoint = "";
      let body: Record<string, string> = {};
      
      const promptSuffix = customInstructions.trim() ? `\n\n[CORPORATE STANDARDS / CUSTOM INSTRUCTIONS: ${customInstructions}]` : "";

      if (mode === "code-to-english") {
        endpoint = "/api/code-to-english";
        body = { raw_code: input, language: sourceLanguage };
      } else if (mode === "english-to-code") {
        endpoint = "/api/generate-from-english";
        body = { prompt: input + promptSuffix, language: targetLanguage };
      } else {
        endpoint = "/api/code-to-code";
        body = { raw_code: input, source_language: sourceLanguage, target_language: targetLanguage };
      }
      
      if (activeWorkspace) {
        body.workspace_id = activeWorkspace.id;
      }
      
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }
      
      const res = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || `HTTP ${res.status}`);
      }

      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder("utf-8");

      let completeBlocks = null;
      let streamError = null;

      // Flush the rAF buffer to React state at display refresh cadence
      const scheduleFlush = () => {
        if (rafIdRef.current !== null) return;
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          if (streamBufferRef.current) {
            const pending = streamBufferRef.current;
            streamBufferRef.current = "";
            setStreamText(prev => prev + pending);
          }
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunkText = decoder.decode(value, { stream: true });
        const lines = chunkText.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.error) {
                streamError = data.error;
                setRawError(`Error: ${data.error}`);
              } else if (data.chunk) {
                // Buffer; flush asynchronously at rAF cadence
                streamBufferRef.current += data.chunk;
                scheduleFlush();
              } else if (data.done && data.blocks) {
                completeBlocks = data.blocks;
                if (data.model_used) {
                  setModelUsed(data.model_used);
                }
              }
            } catch {
              // Ignore invalid JSON chunks (might be split across packets)
            }
          }
        }
      }

      // Final flush
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (streamBufferRef.current) {
        setStreamText(prev => prev + streamBufferRef.current);
        streamBufferRef.current = "";
      }

      if (completeBlocks && !streamError) {
        setOutputBlocks(completeBlocks);
        setOriginalBlocks(JSON.parse(JSON.stringify(completeBlocks)));
        const latency = Date.now() - translateStartTime;
        setLatencyMs(latency);
        track("translation_completed", {
          mode,
          block_count: completeBlocks.length,
          model_used: completeBlocks[0]?.model_used || "unknown",
          latency_ms: latency,
          from_cache: false,
        });
      }
      
    } catch (err: unknown) {
      const errorObj = err as Error & { name?: string; status?: number };
      if (errorObj?.name === "AbortError" || errorObj?.message?.includes("abort")) {
        toast.info("Translation stopped");
      } else {
        const message = err instanceof Error ? err.message : "Translation failed";
        setRawError(`Error: ${message}`);
        toast.error(message);
        track("translation_failed", {
          mode,
          error_type: errorObj?.name || "unknown",
          status_code: errorObj?.status || null,
        });
      }
    } finally {
      setIsStreaming(false);
      readerRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, sourceLanguage, targetLanguage, input, customInstructions, activeWorkspace, isPro, session]);

  const handleClear = useCallback(() => { 
    setInput(""); 
    setIsTypingManually(false);
    setOutputBlocks(null); 
    setOriginalBlocks(null);
    setStreamText("");
    setRawError("");
    setUploadedFile(null);
    setGistSource(null);
    setLatencyMs(null);
  }, []);

  const handleCopyMarkdown = useCallback(() => {
    if (!outputBlocks) return;
    let content = "";
    
    if (mode === "code-to-english") {
      content = outputBlocks.map((b, i) => `## Block ${i + 1}\n\n### Code\n\`\`\`${sourceLanguage}\n${b.code_snippet}\n\`\`\`\n\n### Explanation\n${b.english_translation}\n`).join("\n---\n\n");
    } else {
      content = outputBlocks.map((b, i) => `## Block ${i + 1}\n\n\`\`\`${targetLanguage}\n${b.code_snippet}\n\`\`\`\n\n**Note**: ${b.english_translation}\n`).join("\n---\n\n");
    }
    
    navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("Copied Markdown to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }, [outputBlocks, mode, sourceLanguage, targetLanguage]);

  const handleDownloadJson = useCallback(() => {
    if (!outputBlocks) return;
    const blob = new Blob([JSON.stringify(outputBlocks, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `anuvaad-blocks.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [outputBlocks]);

  const handleSyncEnglishToCode = async () => {
    if (!outputBlocks || !outputBlocks.length || isSyncing) return;
    setIsSyncing(true);
    setRawError("");
    
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      
      const payload: Record<string, any> = {
        blocks: outputBlocks.map(b => ({
          id: b.id,
          code_snippet: b.code_snippet,
          english_translation: b.english_translation
        })),
        language: sourceLanguage,
        custom_instructions: customInstructions.trim() || null
      };

      if (session?.access_token) {
        payload.access_token = session.access_token;
      }
      if (activeWorkspace) {
        payload.workspace_id = activeWorkspace.id;
      }

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`${API}/api/sync-english-to-code`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || `HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.status === "success" && data.updated_code) {
        setInput(data.updated_code);
        setOutputBlocks(data.blocks);
        setOriginalBlocks(JSON.parse(JSON.stringify(data.blocks)));
        if (data.model_used) {
          setModelUsed(data.model_used);
        }
        toast.success("Synchronized successfully! Code has been updated.");
      } else {
        throw new Error("No updated code returned from engine.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sync failed";
      setRawError(`Error: ${message}`);
      toast.error(message);
    } finally {
      setIsSyncing(false);
    }
  };

  const hasEdits = !!(originalBlocks && outputBlocks && JSON.stringify(originalBlocks) !== JSON.stringify(outputBlocks));

  // Refs so keyboard shortcut handler never captures stale closures
  const handleTranslateRef = useRef(handleTranslate);
  const handleClearRef = useRef(handleClear);
  const handleCopyMarkdownRef = useRef(handleCopyMarkdown);
  useEffect(() => { handleTranslateRef.current = handleTranslate; }, [handleTranslate]);
  useEffect(() => { handleClearRef.current = handleClear; }, [handleClear]);
  useEffect(() => { handleCopyMarkdownRef.current = handleCopyMarkdown; }, [handleCopyMarkdown]);

  // Global keyboard shortcuts — deps=[] so listener is registered once
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Ctrl+Enter or Cmd+Enter to translate
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleTranslateRef.current();
      }
      // 2. Ctrl+Alt+C to clear
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        handleClearRef.current();
        toast.info("Workspace cleared");
      }
      // 3. Ctrl+Shift+C to copy
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        handleCopyMarkdownRef.current();
      }
    };
    window.addEventListener("keydown", handleKeyDown, { passive: true });
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Client-side language auto-detection — debounced 400 ms to avoid regex on every keystroke
  useEffect(() => {
    if (!input || input.trim().length < 15 || mode === "english-to-code") {
      setDetectedLang(null);
      return;
    }
    const timer = setTimeout(() => {
      const detected = detectLanguage(input);
      if (detected && detected !== sourceLanguage) {
        setDetectedLang(detected);
      } else {
        setDetectedLang(null);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [input, sourceLanguage, mode]);

  // Estimate token usage (standard rule of thumb: ~4 characters per token)
  const tokenEstimate = useMemo(() => {
    if (!input) return 0;
    return Math.min(Math.round(input.length / 4), 8192);
  }, [input]);

  const tokenPercent = useMemo(() => {
    return Math.min(Math.round((tokenEstimate / 8192) * 100), 100);
  }, [tokenEstimate]);

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-20 border-b border-slate-200 dark:border-amber-600/10 bg-white/80 dark:bg-[#080c14]/80 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold tracking-tight">Workspace</h1>
            <Badge variant="outline" className="text-[10px] font-medium bg-amber-500/5 text-amber-600 dark:text-amber-500/90 border-amber-500/20">{currentMode.label}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)} className="h-8 gap-2 hover:bg-slate-50 dark:hover:bg-amber-950/10 font-bold text-xs">
              <Settings className="h-4 w-4 text-amber-500" />
              <span>Instructions</span>
            </Button>
            {!isPro && (
               <Badge variant="outline" className="text-[10px] bg-amber-500/5 border-amber-600/20 text-amber-600 font-bold gap-1 px-2.5 py-0.5">
                 <Zap className="h-3 w-3 text-amber-500 animate-pulse" /> {creditsLoading ? "..." : credits} Credits
               </Badge>
            )}
            <Badge className={cn(
              "text-[10px] font-bold py-0.5 px-2.5",
              isPro
                ? "bg-amber-600/10 text-amber-600 dark:text-amber-500 border border-amber-600/20 hover:bg-amber-600/10"
                : "bg-muted text-muted-foreground hover:bg-muted"
            )}>
              {isPro ? "✦ Pro" : "Free Plan"}
            </Badge>
          </div>
        </div>
      </header>

      {/* Corporate Settings Panel */}
      {showSettings && (
        <div className="border-b border-slate-200 dark:border-amber-600/10 bg-slate-50/50 dark:bg-[#0c0c0f]/50 px-6 py-4 animate-in slide-in-from-top duration-250">
          <div className="max-w-3xl">
            <label htmlFor="custom-instructions" className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#8494b0]">
              Corporate Standards / Custom Instructions
            </label>
            <Input 
              id="custom-instructions"
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="e.g. Strictly enforce JSDoc comments. Use functional components only."
              className="text-sm bg-background border-slate-200 dark:border-amber-600/20 focus-visible:ring-amber-500"
            />
            <p className="mt-2 text-[10px] font-medium text-slate-400 dark:text-slate-500 leading-relaxed">
              These instructions are appended to the AI prompt to enforce specific corporate coding standards, structural styles, or target frameworks.
            </p>
          </div>
        </div>
      )}

      <div className="p-6 max-w-[1600px] mx-auto">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Mode tabs */}
          <div role="tablist" aria-label="Translation modes" className="flex gap-1 rounded-xl bg-slate-100 dark:bg-[#0c0c0f] p-1 w-fit border border-slate-200 dark:border-amber-600/10 shadow-inner">
            {modes.map((m) => {
              const Icon = m.icon;
              return (
                <button key={m.id} role="tab" aria-selected={mode === m.id} onClick={() => {
                    const prevMode = mode;
                    setMode(m.id);
                    if (prevMode !== m.id) {
                      track("mode_switched", { from_mode: prevMode, to_mode: m.id });
                    }
                  }}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all duration-200",
                    mode === m.id 
                      ? "bg-white dark:bg-[#1a2235] text-amber-600 dark:text-amber-500 shadow-sm border border-slate-200 dark:border-amber-600/20" 
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/5"
                  )}>
                  <Icon className="h-3.5 w-3.5" />{m.label}
                </button>
              );
            })}
          </div>

          {/* Language selectors */}
          <div className="flex flex-wrap items-center gap-3">
            {mode !== "english-to-code" && (
              <SearchableLanguageSelect
                label="Source"
                value={sourceLanguage}
                onChange={setSourceLanguage}
              />
            )}
            {mode !== "code-to-english" && (
              <SearchableLanguageSelect
                label="Target"
                value={targetLanguage}
                onChange={setTargetLanguage}
              />
            )}
          </div>
        </div>

        {/* Workspace Panels Grid + Model Insights Aside Panel */}
        <div className="flex flex-col xl:flex-row gap-6 w-full items-start">
          
          {/* Main Code Workspace (Split editor / output) */}
          <div className="flex-1 grid gap-6 lg:grid-cols-2 min-h-[600px] w-full">
            {/* INPUT PANEL */}
            <Card className="flex flex-col overflow-hidden border-slate-200 dark:border-amber-600/10 bg-white dark:bg-[#0c0c0f] shadow-sm hover:border-amber-600/20 transition-all duration-300">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-amber-600/10 bg-slate-50/50 dark:bg-white/5 px-4 py-3">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#8494b0]">
                    {mode === "english-to-code" ? "Requirements (English)" : "Source Code"}
                  </p>
                  {uploadedFile && (
                    <Badge variant="secondary" className="gap-1.5 text-[10px] font-bold border border-slate-200 dark:border-amber-600/10">
                      <FileCode className="h-3 w-3 text-amber-500" />
                      {uploadedFile.name}
                      <button onClick={handleClearFile} className="ml-1 rounded-full hover:bg-muted p-0.5">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  )}
                  {gistSource && (
                    <Badge variant="secondary" className="gap-1.5 text-[10px] font-bold border border-[#24292e]/20 dark:border-white/10 bg-[#24292e]/5 text-[#24292e] dark:bg-white/5 dark:text-white">
                      <GithubIcon className="h-3 w-3 text-amber-500" />
                      github.com/{gistSource.username} — {gistSource.filename}
                      <button onClick={() => { setGistSource(null); handleClearFile(); }} className="ml-1 rounded-full hover:bg-muted p-0.5">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{input.length.toLocaleString()} chars</span>
                  <Button variant="ghost" size="sm" onClick={handleClear} className="h-7 w-7 p-0 rounded-full hover:bg-slate-100 dark:hover:bg-white/5"><RotateCcw className="h-3.5 w-3.5 text-amber-500" /></Button>
                  <Button onClick={handleTranslate} disabled={!input.trim() && !isStreaming} aria-disabled={!input.trim() && !isStreaming}
                    size="sm"
                    className={cn(
                      "gap-1.5 shadow-sm transition-all text-white h-8 px-3 text-xs font-bold",
                      isStreaming ? "bg-destructive hover:bg-destructive/90" : "bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600"
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
                <textarea value={input} onChange={(e) => setInput(e.target.value)}
                  placeholder="Describe the functionality you need. Be as detailed as possible..."
                  className="flex-1 resize-none border-0 bg-transparent p-6 font-sans text-sm leading-relaxed focus:outline-none"
                  onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") handleTranslate(); }}
                />
              ) : (
                <div className="flex-1 min-h-[500px] relative">
                  <Editor
                    height="100%"
                    language={languages.find(l => l.value === sourceLanguage)?.monacoId || sourceLanguage}
                    theme={isDark ? "vs-dark" : "light"}
                    value={input}
                    onChange={(val) => setInput(val || "")}
                    onMount={(editor) => {
                      // Expose editor instance for E2E tests
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
                        className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white font-bold text-xs gap-1.5 shadow-lg border border-amber-500/20 px-4 h-8 rounded-full"
                      >
                        <Sparkles className="h-3.5 w-3.5 animate-pulse text-amber-300" />
                        Switch to {languages.find(l => l.value === detectedLang)?.label}?
                      </Button>
                    </div>
                  )}
                  {/* Drag & drop overlay */}
                  {!input && !isTypingManually && (
                    <div
                      {...getRootProps()}
                      className={cn(
                        "absolute inset-0 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200 z-10",
                        "bg-white/95 dark:bg-[#0c0c0f]/95 backdrop-blur-sm",
                        isDragActive && "bg-amber-500/5 ring-2 ring-inset ring-amber-500/40"
                      )}
                    >
                      <input {...getInputProps()} />
                      <div className={cn(
                        "flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed transition-colors",
                        isDragActive ? "border-amber-500 bg-amber-500/10" : "border-slate-200 dark:border-amber-600/10 bg-slate-50 dark:bg-white/5"
                      )}>
                        <Upload className={cn("h-6 w-6", isDragActive ? "text-amber-500" : "text-slate-400 dark:text-slate-600")} />
                      </div>
                      <div className="text-center px-4">
                        <p className="text-sm font-bold">{isDragActive ? "Drop your file here" : "Drag & drop a code file"}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">or click to browse · .py .js .ts .java .cpp .go .rs .c .cs</p>
                      </div>
                      <div className="mt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsTypingManually(true);
                          }}
                          className="text-xs bg-background border-slate-200 dark:border-amber-600/20 hover:bg-slate-50 dark:hover:bg-amber-950/10 shadow-sm"
                        >
                          Type Code Manually
                        </Button>
                      </div>
                      
                      <div className="mt-4 flex flex-col items-center gap-2 max-w-sm px-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Or load a sample snippet</p>
                        <div className="flex flex-wrap gap-1.5 justify-center">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInput(`def fibonacci(n):\n    if n <= 0:\n        return []\n    elif n == 1:\n        return [0]\n    \n    fib = [0, 1]\n    while len(fib) < n:\n        fib.append(fib[-1] + fib[-2])\n    return fib\n\n# Example usage:\nprint(fibonacci(10))`);
                              setSourceLanguage("python");
                              setIsTypingManually(true);
                              toast.success("Loaded Python Fibonacci example!");
                              track("sample_loaded", { sample: "python_fibonacci" });
                            }}
                            className="h-7 text-[10px] px-2.5 rounded-md font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10"
                          >
                            Python Fibonacci
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInput(`// JS Promise retry helper\nfunction retryWithDelay(fn, retries = 3, delay = 1000) {\n  return new Promise((resolve, reject) => {\n    fn()\n      .then(resolve)\n      .catch((error) => {\n        if (retries === 0) {\n          return reject(error);\n        }\n        setTimeout(() => {\n          retryWithDelay(fn, retries - 1, delay).then(resolve, reject);\n        }, delay);\n      });\n  });\n}`);
                              setSourceLanguage("javascript");
                              setIsTypingManually(true);
                              toast.success("Loaded JS Retry Promise example!");
                              track("sample_loaded", { sample: "js_retry" });
                            }}
                            className="h-7 text-[10px] px-2.5 rounded-md font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10"
                          >
                            JS Retry Promise
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setInput(`-- SQL: Calculate active user monthly retention\nWITH UserMonths AS (\n  SELECT DISTINCT user_id, DATE_TRUNC('month', created_at) AS active_month\n  FROM translation_history\n)\nSELECT \n  m1.active_month AS month,\n  COUNT(DISTINCT m1.user_id) AS active_users,\n  COUNT(DISTINCT m2.user_id) AS retained_users,\n  ROUND(COUNT(DISTINCT m2.user_id)::DECIMAL / COUNT(DISTINCT m1.user_id) * 100, 2) AS retention_rate\nFROM UserMonths m1\nLEFT JOIN UserMonths m2 \n  ON m1.user_id = m2.user_id \n  AND m2.active_month = m1.active_month + INTERVAL '1' month\nGROUP BY 1\nORDER BY 1 DESC;`);
                              setSourceLanguage("sql");
                              setIsTypingManually(true);
                              toast.success("Loaded SQL Retention example!");
                              track("sample_loaded", { sample: "sql_retention" });
                            }}
                            className="h-7 text-[10px] px-2.5 rounded-md font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10"
                          >
                            SQL Retention
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Gist Import UI */}
                  {!input && mode !== "english-to-code" && (
                    <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center">
                      {showGistInput ? (
                        <div className="flex items-center gap-2 bg-white dark:bg-[#0c0c0f] border border-slate-200 dark:border-amber-600/20 rounded-lg px-3 py-2 shadow-lg w-[90%] max-w-md animate-in fade-in slide-in-from-bottom-2 duration-200">
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
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleGistImport} disabled={!gistUrl.trim()}>
                                <ArrowRight className="h-3.5 w-3.5 text-amber-500" />
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => { setShowGistInput(false); setGistUrl(""); }}>
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
                          className="gap-2 bg-white dark:bg-[#0c0c0f] border border-slate-200 dark:border-amber-600/10 hover:bg-slate-50 dark:hover:bg-amber-950/10 shadow-sm text-xs font-bold"
                        >
                          <GithubIcon className="h-3.5 w-3.5 text-amber-500" />
                          Import Gist
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              <div className="border-t border-slate-200 dark:border-amber-600/10 bg-slate-50/50 dark:bg-white/5 px-4 py-2.5 flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                <div className="flex gap-4">
                  <span><kbd className="px-1 py-0.5 bg-slate-100 dark:bg-[#1a2233] rounded border border-slate-200 dark:border-amber-600/20 text-[9px] font-mono">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-[#1a2233] rounded border border-slate-200 dark:border-amber-600/20 text-[9px] font-mono">Alt</kbd> + <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-[#1a2233] rounded border border-slate-200 dark:border-amber-600/20 text-[9px] font-mono">C</kbd> Clear</span>
                  {outputBlocks && (
                    <span><kbd className="px-1 py-0.5 bg-slate-100 dark:bg-[#1a2233] rounded border border-slate-200 dark:border-amber-600/20 text-[9px] font-mono">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-[#1a2233] rounded border border-slate-200 dark:border-amber-600/20 text-[9px] font-mono">Shift</kbd> + <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-[#1a2233] rounded border border-slate-200 dark:border-amber-600/20 text-[9px] font-mono">C</kbd> Copy Markdown</span>
                  )}
                </div>
                <span>Press <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-[#1a2233] rounded border border-slate-200 dark:border-amber-600/20 text-[9px] font-mono">Ctrl/⌘</kbd> + <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-[#1a2233] rounded border border-slate-200 dark:border-amber-600/20 text-[9px] font-mono">Enter</kbd></span>
              </div>
            </Card>

            {/* OUTPUT PANEL */}
            <Card className="flex flex-col overflow-hidden border-slate-200 dark:border-amber-600/10 bg-white dark:bg-[#0c0c0f] shadow-sm hover:border-amber-600/20 transition-all duration-300">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-amber-600/10 bg-slate-50/50 dark:bg-white/5 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#8494b0]">
                  {mode === "code-to-english" ? "AI Analysis" : "Generated Code"}
                </p>
                {outputBlocks && (
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" onClick={handleCopyMarkdown} className="h-7 gap-1.5 px-3 text-[10px] bg-background border-slate-200 dark:border-amber-600/20 hover:bg-slate-50 dark:hover:bg-amber-950/10 font-bold">
                      {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      {copied ? "Copied MD" : "Copy as Markdown"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownloadJson} className="h-7 gap-1.5 px-3 text-[10px] bg-background border-slate-200 dark:border-amber-600/20 hover:bg-slate-50 dark:hover:bg-amber-950/10 font-bold">
                      <Download className="h-3 w-3" />
                      Download JSON
                    </Button>
                  </div>
                )}
              </div>
              
              {hasEdits && mode === "code-to-english" && (
                <div className="bg-amber-500/5 border-b border-amber-600/10 px-4 py-2.5 flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-200">
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-500/90 flex items-center gap-1.5 pr-4 leading-normal">
                    <Sparkles className="h-3.5 w-3.5 animate-pulse text-amber-500 shrink-0" />
                    Modified explanations detected. Sync back to update code?
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                      onClick={() => setOutputBlocks(JSON.parse(JSON.stringify(originalBlocks)))}
                      disabled={isSyncing}
                    >
                      Reset Edits
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white gap-1.5 shadow-sm font-bold"
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

              <div className="flex-1 overflow-auto bg-slate-50/20 dark:bg-black/10 relative">
                {(isStreaming || (streamText.length > 0 && !outputBlocks)) ? (
                  <div className={cn(
                    "p-6 m-4 rounded-lg bg-white dark:bg-[#0c0c0f] border shadow-sm min-h-[400px]", 
                    rawError ? "border-red-500" : "border-slate-200 dark:border-amber-600/10"
                  )}>
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
                    <pre aria-label="Translation output" className={cn("font-mono text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words leading-relaxed", isStreaming ? "blinking-cursor" : "")}>
                      {streamText}
                    </pre>
                  </div>
                ) : rawError && !streamText ? (
                  <div className="p-6 text-sm text-red-500 whitespace-pre-wrap font-mono bg-red-500/5 m-4 rounded-lg border border-red-500/30">{rawError}</div>
                ) : outputBlocks ? (
                  <div className="p-4 flex flex-col gap-2">
                    {outputBlocks.map((block, idx) => (
                      <TranslationBlockCard 
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
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-white/5 px-3 py-1.5 rounded-full shadow-sm border border-slate-200 dark:border-amber-600/10 flex items-center gap-1.5">
                          <Sparkles className="h-3 w-3 text-amber-500" />
                          Generated by {modelUsed}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex h-full min-h-[500px] items-center justify-center">
                    <div className="text-center max-w-sm px-6">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-amber-600/10 shadow-sm">
                        <Code2 className="h-7 w-7 text-amber-500" />
                      </div>
                      <p className="mt-5 text-sm font-bold text-slate-800 dark:text-slate-200">Workspace Empty</p>
                      <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-[#8494b0]">
                        Paste your code or requirements in the input editor on the left to generate translations.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* MODEL INSIGHTS SIDE PANEL (aside, inspired by Stitch Chat mockup) */}
          <aside className="w-full xl:w-80 bg-white dark:bg-[#0c0c0f] border border-slate-200 dark:border-amber-600/10 rounded-xl p-5 flex flex-col gap-6 shrink-0 shadow-sm">
            
            {/* Session Stats */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 dark:text-[#8494b0] uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-amber-500" /> Model Performance
              </h3>
              <div className="space-y-4">
                {/* Latency Meter */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-slate-500 dark:text-slate-400">LATENCY</span>
                    <span className={cn("font-extrabold", latencyMs ? "text-amber-500" : "text-slate-400")}>
                      {latencyMs ? `${latencyMs}ms` : isStreaming ? "Calculating..." : "Idle"}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: latencyMs ? `${Math.min((latencyMs / 4000) * 100, 100)}%` : "0%" }} />
                  </div>
                </div>

                {/* Token usage progress */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-slate-500 dark:text-slate-400">CONTEXT LOAD</span>
                    <span className="text-amber-500 font-extrabold">{tokenEstimate.toLocaleString()} tokens ({tokenPercent}%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full transition-all duration-300" style={{ width: `${tokenPercent}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Context Resources */}
            <div className="border-t border-slate-100 dark:border-amber-600/10 pt-5">
              <h3 className="text-xs font-bold text-slate-400 dark:text-[#8494b0] uppercase tracking-wider mb-3.5">
                Context Resources
              </h3>
              <div className="space-y-2">
                <div className="p-3 rounded-lg border border-slate-100 dark:border-[#1a2233]/40 bg-slate-50/50 dark:bg-amber-950/5 flex items-start gap-3">
                  <Cpu className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {modelUsed || "Gemini 2.5 Flash"}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">Active Translation Model</span>
                  </div>
                </div>

                {uploadedFile ? (
                  <div className="p-3 rounded-lg border border-slate-100 dark:border-[#1a2233]/40 bg-slate-50/50 dark:bg-amber-950/5 flex items-start gap-3">
                    <FileCode className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{uploadedFile.name}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">{(uploadedFile.size / 1024).toFixed(1)} KB · File Mapped</span>
                    </div>
                  </div>
                ) : gistSource ? (
                  <div className="p-3 rounded-lg border border-slate-100 dark:border-[#1a2233]/40 bg-slate-50/50 dark:bg-amber-950/5 flex items-start gap-3">
                    <GithubIcon className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{gistSource.filename}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">Gist Mapped ({gistSource.username})</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg border border-slate-100 dark:border-amber-600/5 bg-slate-50/50 dark:bg-amber-950/5 text-center text-xs font-medium text-slate-400 dark:text-slate-500">
                    No active source files loaded.
                  </div>
                )}
              </div>
            </div>

            {/* Security Protocol */}
            <div className="border-t border-slate-100 dark:border-amber-600/10 pt-5 mt-auto">
              <div className="bg-amber-500/5 border border-amber-600/10 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1.5 text-amber-600 dark:text-amber-500">
                  <ShieldCheck className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-tight">Security Guard</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  End-to-end data transmission is encrypted. Content redacted for PII parameters prior to engine execution. Zero retention active.
                </p>
              </div>
            </div>
            
          </aside>
        </div>
      </div>
    </div>
  );
}

export default function TranslatePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen w-full items-center justify-center bg-[#080c14]">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    }>
      <TranslatePageContent />
    </Suspense>
  );
}

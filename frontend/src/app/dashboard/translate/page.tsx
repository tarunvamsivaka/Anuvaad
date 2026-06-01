"use client";

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
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
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowRight, Copy, Download, Loader2, RotateCcw,
  Sparkles, Code2, FileText, ArrowLeftRight, Check, Settings, Zap,
  ChevronDown, ChevronUp, X, Upload, FileCode
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

interface TranslationBlock {
  id: string;
  code_snippet: string;
  english_translation: string;
}

function TranslationBlockCard({ block, index, sourceLanguage }: { block: TranslationBlock, index: number, sourceLanguage: string }) {
  const [collapsed, setCollapsed] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

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
    <Card className="mb-4 overflow-hidden border-border/60 shadow-sm transition-all duration-200">
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
            <p className="text-sm leading-relaxed text-foreground/90">
              {block.english_translation}
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={copyText} 
              className="absolute right-3 top-3 h-7 gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-background shadow-sm"
            >
              {copiedText ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
              {copiedText ? "Copied" : "Copy text"}
            </Button>
          </div>
        </div>
      )}
    </Card>
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
  const [customInstructions, setCustomInstructions] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number } | null>(null);
  const [gistSource, setGistSource] = useState<{ username: string; filename: string } | null>(null);
  const [showGistInput, setShowGistInput] = useState(false);
  const [gistUrl, setGistUrl] = useState("");
  const [gistLoading, setGistLoading] = useState(false);

  // Extension → language auto-detection map
  const extToLanguage: Record<string, string> = {
    ".py": "python", ".js": "javascript", ".ts": "typescript",
    ".java": "java", ".cpp": "cpp", ".rs": "rust",
    ".go": "go", ".c": "c", ".cs": "csharp",
  };
  const acceptedExtensions = Object.keys(extToLanguage);

  const onFileDrop = useCallback((acceptedFiles: globalThis.File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!acceptedExtensions.includes(ext)) {
      toast.error(`Unsupported file type. Allowed: ${acceptedExtensions.join(", ")}`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      setInput(text);
      setUploadedFile({ name: file.name, size: file.size });
      // Auto-detect language
      const detectedLang = extToLanguage[ext];
      if (detectedLang) setSourceLanguage(detectedLang);
      track("file_uploaded", { extension: ext, size_bytes: file.size, detected_language: detectedLang || "unknown" });
    };
    reader.readAsText(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onFileDrop,
    accept: { "text/plain": acceptedExtensions },
    maxFiles: 1,
    noClick: false,
    disabled: mode === "english-to-code",
  });

  const handleClearFile = useCallback(() => {
    setUploadedFile(null);
    setGistSource(null);
    setInput("");
    setOutputBlocks(null);
    setStreamText("");
    setRawError("");
  }, []);

  const handleGistImport = useCallback(async () => {
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
    } catch (err: any) {
      const message = err instanceof Error ? err.message : "Failed to import Gist";
      toast.error(message);
    } finally {
      setGistLoading(false);
    }
  }, [gistUrl]);

  // Read ?mode= query param on mount to pre-select translation mode
  useEffect(() => {
    const modeParam = searchParams.get("mode");
    if (modeParam && modes.some(m => m.id === modeParam)) {
      setMode(modeParam);
    }
  }, [searchParams]);
  
  const [outputBlocks, setOutputBlocks] = useState<TranslationBlock[] | null>(null);
  const [streamText, setStreamText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null);
  const [rawError, setRawError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [modelUsed, setModelUsed] = useState<string | null>(null);

  const { activeWorkspace } = useWorkspace();

  const currentMode = modes.find((m) => m.id === mode)!;

  const handleTranslate = useCallback(async () => {
    if (!input.trim()) return;

    if (isStreaming && readerRef.current) {
      readerRef.current.cancel();
      setIsStreaming(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setIsStreaming(true);
    setOutputBlocks(null);
    setStreamText("");
    setRawError("");
    setModelUsed(null);

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
                setStreamText(prev => prev + data.chunk);
              } else if (data.done && data.blocks) {
                completeBlocks = data.blocks;
                if (data.model_used) {
                  setModelUsed(data.model_used);
                }
              }
            } catch (e) {
              // Ignore invalid JSON chunks (might be split across packets)
            }
          }
        }
      }

      if (completeBlocks && !streamError) {
        setOutputBlocks(completeBlocks);
        track("translation_completed", {
          mode,
          block_count: completeBlocks.length,
          model_used: completeBlocks[0]?.model_used || "unknown",
          latency_ms: Date.now() - translateStartTime,
          from_cache: false,
        });
      }
      
    } catch (err: any) {
      if (err.name === "AbortError" || err.message?.includes("abort")) {
        toast.info("Translation stopped");
      } else {
        const message = err instanceof Error ? err.message : "Translation failed";
        setRawError(`Error: ${message}`);
        toast.error(message);
        track("translation_failed", {
          mode,
          error_type: err.name || "unknown",
          status_code: err.status || null,
        });
      }
    } finally {
      setIsStreaming(false);
      setLoading(false);
      readerRef.current = null;
    }
  }, [input, mode, sourceLanguage, targetLanguage, customInstructions, session, activeWorkspace, isStreaming]);


  const handleClear = useCallback(() => { 
    setInput(""); 
    setOutputBlocks(null); 
    setStreamText("");
    setRawError("");
    setUploadedFile(null);
    setGistSource(null);
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

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">Workspace</h1>
            <Badge variant="secondary" className="text-[10px]">{currentMode.label}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)} className="h-8 gap-2">
              <Settings className="h-4 w-4" />
              <span className="text-xs">Context & Settings</span>
            </Button>
            {!isPro && (
               <Badge variant="outline" className="text-[10px] bg-background border-amber-500 text-amber-600 gap-1 px-2 py-0">
                 <Zap className="h-3 w-3" /> {creditsLoading ? "..." : credits} Credits
               </Badge>
            )}
            <Badge className={cn(
              "text-[10px]",
              isPro
                ? "bg-amber-600/10 text-amber-700 hover:bg-amber-600/10"
                : "bg-muted text-muted-foreground hover:bg-muted"
            )}>
              {isPro ? "✦ Pro" : "Free Plan"}
            </Badge>
          </div>
        </div>
      </header>

      {/* Corporate Settings Panel */}
      {showSettings && (
        <div className="border-b border-border bg-muted/30 px-6 py-4">
          <div className="max-w-3xl">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Corporate Standards / Custom Instructions
            </label>
            <Input 
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="e.g. Strictly enforce JSDoc comments. Use functional components only."
              className="text-sm bg-background"
            />
            <p className="mt-2 text-[10px] text-muted-foreground">
              These instructions are appended to the AI prompt to enforce specific corporate coding standards or terminology.
            </p>
          </div>
        </div>
      )}

      <div className="p-6 max-w-[1600px] mx-auto">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Mode tabs */}
          <div role="tablist" aria-label="Translation modes" className="flex gap-1 rounded-xl bg-muted/50 p-1 w-fit border border-border/50 shadow-sm">
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
                    "flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-all duration-200",
                    mode === m.id ? "bg-background text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  )}>
                  <Icon className="h-3.5 w-3.5" />{m.label}
                </button>
              );
            })}
          </div>

          {/* Language selectors */}
          <div className="flex flex-wrap items-center gap-3">
            {mode !== "english-to-code" && (
              <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-1.5 shadow-sm">
                <label htmlFor="source-lang" className="text-xs font-medium text-muted-foreground">Source</label>
                <select id="source-lang" value={sourceLanguage} onChange={(e) => setSourceLanguage(e.target.value)}
                  className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer outline-none">
                  {languages.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
            )}
            {mode !== "code-to-english" && (
              <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-1.5 shadow-sm">
                <label htmlFor="target-lang" className="text-xs font-medium text-muted-foreground">Target</label>
                <select id="target-lang" value={targetLanguage} onChange={(e) => setTargetLanguage(e.target.value)}
                  className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer outline-none">
                  {languages.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Editor + Output split */}
        <div className="grid gap-6 lg:grid-cols-2 min-h-[600px]">
          {/* INPUT PANEL */}
          <Card className="flex flex-col overflow-hidden border-border/60 shadow-md">
            <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-4 py-3">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {mode === "english-to-code" ? "Requirements (English)" : "Source Code"}
                </p>
                {uploadedFile && (
                  <Badge variant="secondary" className="gap-1.5 text-[10px] font-medium">
                    <FileCode className="h-3 w-3" />
                    {uploadedFile.name}
                    <button onClick={handleClearFile} className="ml-1 rounded-full hover:bg-muted p-0.5">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                )}
                {gistSource && (
                  <Badge variant="secondary" className="gap-1.5 text-[10px] font-medium bg-[#24292e]/10 text-[#24292e] dark:bg-white/10 dark:text-white">
                    <GithubIcon className="h-3 w-3" />
                    github.com/{gistSource.username} — {gistSource.filename}
                    <button onClick={() => { setGistSource(null); handleClearFile(); }} className="ml-1 rounded-full hover:bg-muted p-0.5">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-muted-foreground">{input.length.toLocaleString()} chars</span>
                <Button variant="ghost" size="sm" onClick={handleClear} className="h-7 w-7 p-0 rounded-full hover:bg-muted"><RotateCcw className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
            
            {mode === "english-to-code" ? (
              <textarea value={input} onChange={(e) => setInput(e.target.value)}
                placeholder="Describe the functionality you need. Be as detailed as possible..."
                className="flex-1 resize-none border-0 bg-background p-6 font-sans text-sm leading-relaxed focus:outline-none"
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
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineHeight: 24,
                    padding: { top: 20 },
                    scrollBeyondLastLine: false,
                    fontFamily: "'JetBrains Mono', 'Geist Mono', monospace",
                  }}
                />
                {/* Drag & drop overlay */}
                {!input && (
                  <div
                    {...getRootProps()}
                    className={cn(
                      "absolute inset-0 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200 z-10",
                      "bg-background/80 backdrop-blur-sm",
                      isDragActive && "bg-amber-600/5 ring-2 ring-inset ring-amber-500/40"
                    )}
                  >
                    <input {...getInputProps()} />
                    <div className={cn(
                      "flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed transition-colors",
                      isDragActive ? "border-amber-500 bg-amber-500/10" : "border-border bg-muted/30"
                    )}>
                      <Upload className={cn("h-6 w-6", isDragActive ? "text-amber-600" : "text-muted-foreground")} />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium">{isDragActive ? "Drop your file here" : "Drag & drop a code file"}</p>
                      <p className="mt-1 text-xs text-muted-foreground">or click to browse · .py .js .ts .java .cpp .go .rs .c .cs</p>
                    </div>
                  </div>
                )}

                {/* Gist Import UI */}
                {!input && mode !== "english-to-code" && (
                  <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center">
                    {showGistInput ? (
                      <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2 shadow-lg w-[90%] max-w-md animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <GithubIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <input
                          type="url"
                          value={gistUrl}
                          onChange={(e) => setGistUrl(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleGistImport(); }}
                          placeholder="https://gist.github.com/username/abc123"
                          className="flex-1 bg-transparent border-none text-sm focus:outline-none placeholder:text-muted-foreground/60"
                          autoFocus
                          disabled={gistLoading}
                        />
                        {gistLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                        ) : (
                          <>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleGistImport} disabled={!gistUrl.trim()}>
                              <ArrowRight className="h-3.5 w-3.5" />
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
                        className="gap-2 bg-background/80 backdrop-blur-sm shadow-sm hover:bg-background text-xs"
                      >
                        <GithubIcon className="h-3.5 w-3.5" />
                        Import Gist
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
            
            <div className="border-t border-border/60 bg-muted/10 px-4 py-3 flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Press <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border">Ctrl/⌘</kbd> + <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border">Enter</kbd> to translate</span>
              <Button onClick={handleTranslate} disabled={!input.trim() && !isStreaming} aria-disabled={!input.trim() && !isStreaming}
                className={cn(
                  "gap-2 shadow-sm transition-all text-white",
                  isStreaming ? "bg-destructive hover:bg-destructive/90" : "bg-amber-600 hover:bg-amber-700"
                )}>
                {isStreaming ? (
                  <>
                    <X className="h-4 w-4" /> Stop
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Generate Translation
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* OUTPUT PANEL */}
          <Card className="flex flex-col overflow-hidden border-border/60 shadow-md">
            <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {mode === "code-to-english" ? "AI Analysis" : "Generated Code"}
              </p>
              {outputBlocks && (
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={handleCopyMarkdown} className="h-7 gap-1.5 px-3 text-[10px] bg-background">
                    {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    {copied ? "Copied MD" : "Copy as Markdown"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownloadJson} className="h-7 gap-1.5 px-3 text-[10px] bg-background">
                    <Download className="h-3 w-3" />
                    Download JSON
                  </Button>
                </div>
              )}
            </div>
            
            <div className="flex-1 overflow-auto bg-background/50 relative">
              {(isStreaming || (streamText.length > 0 && !outputBlocks)) ? (
                <div className={cn(
                  "p-6 m-4 rounded-lg bg-background border shadow-sm min-h-[400px]", 
                  rawError ? "border-red-500" : "border-border/50"
                )}>
                  <div className="flex items-center gap-2 mb-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider" role="status" aria-live="polite" aria-label={isStreaming ? "Translating your code" : ""}>
                     {isStreaming ? (
                       <><div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" /> Generating...</>
                     ) : (
                       <><div className="h-2 w-2 rounded-full bg-emerald-500" /> Done</>
                     )}
                  </div>
                  {rawError && (
                     <div className="text-sm text-red-500 whitespace-pre-wrap font-mono mb-4">{rawError}</div>
                  )}
                  <pre aria-label="Translation output" className={cn("font-mono text-sm text-foreground/90 whitespace-pre-wrap break-words", isStreaming ? "blinking-cursor" : "")}>
                    {streamText}
                  </pre>
                </div>
              ) : rawError && !streamText ? (
                <div className="p-6 text-sm text-destructive whitespace-pre-wrap font-mono bg-destructive/5 m-4 rounded-lg border border-red-500">{rawError}</div>
              ) : outputBlocks ? (
                <div className="p-4 flex flex-col gap-2">
                  {outputBlocks.map((block, idx) => (
                    <TranslationBlockCard 
                      key={block.id || idx} 
                      block={block} 
                      index={idx} 
                      sourceLanguage={sourceLanguage}
                    />
                  ))}
                  
                  {modelUsed && (
                    <div className="mt-4 flex items-center justify-center">
                      <span className="text-[10px] font-medium tracking-wide text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full shadow-sm border border-border/50 flex items-center gap-1.5">
                        <Sparkles className="h-3 w-3 text-amber-500" />
                        Generated by {modelUsed}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-full min-h-[500px] items-center justify-center">
                  <div className="text-center max-w-sm px-6">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 border border-border shadow-sm">
                      <Code2 className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <p className="mt-5 text-sm font-semibold">Workspace Empty</p>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      Paste your code or requirements on the left to generate an enterprise-grade translation.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function TranslatePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    }>
      <TranslatePageContent />
    </Suspense>
  );
}

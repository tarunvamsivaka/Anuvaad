"use client";

import { useState, useCallback } from "react";
import { useTheme } from "next-themes";
import { Editor } from "@monaco-editor/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ArrowRight, Copy, Download, Loader2, RotateCcw,
  Sparkles, Code2, FileText, ArrowLeftRight, Check, Settings
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useWorkspace } from "@/context/WorkspaceContext";

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

export default function TranslatePage() {
  const { isPro, session } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const [mode, setMode] = useState("code-to-english");
  const [sourceLanguage, setSourceLanguage] = useState("python");
  const [targetLanguage, setTargetLanguage] = useState("javascript");
  const [input, setInput] = useState("");
  const [customInstructions, setCustomInstructions] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  
  const [outputBlocks, setOutputBlocks] = useState<TranslationBlock[] | null>(null);
  const [rawError, setRawError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const { activeWorkspace } = useWorkspace();

  const currentMode = modes.find((m) => m.id === mode)!;

  const handleTranslate = useCallback(async () => {
    if (!input.trim()) return;
    setLoading(true);
    setOutputBlocks(null);
    setRawError("");
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
      const data = await res.json();
      
      if (Array.isArray(data)) {
        setOutputBlocks(data);
      } else {
        // Fallback for unexpected format
        setRawError(JSON.stringify(data, null, 2));
      }
    } catch (err: unknown) {
      setRawError(`Error: ${err instanceof Error ? err.message : "Translation failed"}`);
    } finally {
      setLoading(false);
    }
  }, [input, mode, sourceLanguage, targetLanguage, customInstructions, session, activeWorkspace]);

  const handleCopy = useCallback(() => {
    if (!outputBlocks) return;
    const textToCopy = outputBlocks.map(b => 
      mode === "code-to-english" 
        ? `${b.code_snippet}\n/* ${b.english_translation} */\n` 
        : b.code_snippet
    ).join("\n");
    
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [outputBlocks, mode]);

  const handleClear = useCallback(() => { 
    setInput(""); 
    setOutputBlocks(null); 
    setRawError(""); 
  }, []);

  const handleDownload = useCallback(() => {
    if (!outputBlocks) return;
    let content = "";
    
    if (mode === "code-to-english") {
      content = outputBlocks.map(b => `### Code\n\`\`\`${sourceLanguage}\n${b.code_snippet}\n\`\`\`\n\n### Explanation\n${b.english_translation}\n`).join("\n---\n\n");
    } else {
      content = outputBlocks.map(b => b.code_snippet).join("\n\n");
    }

    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `anuvaad-export.${mode === "code-to-english" ? "md" : "txt"}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [outputBlocks, mode, sourceLanguage]);

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
          <div className="flex gap-1 rounded-xl bg-muted/50 p-1 w-fit border border-border/50 shadow-sm">
            {modes.map((m) => {
              const Icon = m.icon;
              return (
                <button key={m.id} onClick={() => setMode(m.id)}
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
                <label className="text-xs font-medium text-muted-foreground">Source</label>
                <select value={sourceLanguage} onChange={(e) => setSourceLanguage(e.target.value)}
                  className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer outline-none">
                  {languages.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                </select>
              </div>
            )}
            {mode !== "code-to-english" && (
              <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-1.5 shadow-sm">
                <label className="text-xs font-medium text-muted-foreground">Target</label>
                <select value={targetLanguage} onChange={(e) => setTargetLanguage(e.target.value)}
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
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {mode === "english-to-code" ? "Requirements (English)" : "Source Code"}
              </p>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-muted-foreground">{input.length.toLocaleString()} chars</span>
                <Button variant="ghost" size="sm" onClick={handleClear} className="h-7 w-7 p-0 rounded-full hover:bg-muted"><RotateCcw className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
            
            {mode === "english-to-code" ? (
              <textarea value={input} onChange={(e) => setInput(e.target.value)}
                placeholder="Describe the functionality you need. Be as detailed as possible..."
                className="flex-1 resize-none border-0 bg-background p-6 font-sans text-sm leading-relaxed focus:outline-none"
                onKeyDown={(e) => { if (e.ctrlKey && e.key === "Enter") handleTranslate(); }}
              />
            ) : (
              <div className="flex-1 min-h-[500px]">
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
              </div>
            )}
            
            <div className="border-t border-border/60 bg-muted/10 px-4 py-3 flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Press <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-muted rounded border border-border">Enter</kbd> to translate</span>
              <Button onClick={handleTranslate} disabled={loading || !input.trim()}
                className="gap-2 shadow-sm bg-amber-600 hover:bg-amber-700 text-white transition-all">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {loading ? "Processing..." : "Generate Translation"}
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
                  <Button variant="outline" size="sm" onClick={handleCopy} className="h-7 gap-1.5 px-3 text-[10px] bg-background">
                    {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    {copied ? "Copied All" : "Copy All"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownload} className="h-7 gap-1.5 px-3 text-[10px] bg-background">
                    <Download className="h-3 w-3" />
                    Export MD
                  </Button>
                </div>
              )}
            </div>
            
            <div className="flex-1 overflow-auto bg-background/50">
              {loading ? (
                <div className="flex h-full min-h-[500px] flex-col items-center justify-center">
                  <div className="relative flex h-16 w-16 items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-4 border-muted"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-amber-600 border-t-transparent animate-spin"></div>
                    <Sparkles className="h-6 w-6 text-amber-600 animate-pulse" />
                  </div>
                  <p className="mt-4 text-sm font-medium text-foreground">Analyzing code structure...</p>
                  <p className="mt-1 text-xs text-muted-foreground">Applying corporate standards</p>
                </div>
              ) : rawError ? (
                <div className="p-6 text-sm text-destructive whitespace-pre-wrap font-mono bg-destructive/5 m-4 rounded-lg border border-destructive/20">{rawError}</div>
              ) : outputBlocks ? (
                <div className="p-0">
                  {outputBlocks.map((block, idx) => (
                    <div key={block.id || idx} className="border-b border-border/40 last:border-0 hover:bg-muted/10 transition-colors">
                      {mode === "code-to-english" ? (
                        <div className="grid md:grid-cols-2 gap-0">
                          <div className="p-4 border-r border-border/40 bg-muted/5 overflow-x-auto">
                            <pre className="font-mono text-xs text-foreground/80 leading-relaxed">
                              {block.code_snippet}
                            </pre>
                          </div>
                          <div className="p-4 flex items-center">
                            <p className="text-sm leading-relaxed text-foreground">
                              {block.english_translation}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="p-0">
                           {/* Use Monaco editor for output code snippet */}
                           <div className="h-[200px] border-b border-border/40">
                             <Editor
                                height="100%"
                                language={languages.find(l => l.value === targetLanguage)?.monacoId || targetLanguage}
                                theme={isDark ? "vs-dark" : "light"}
                                value={block.code_snippet}
                                options={{
                                  readOnly: true,
                                  minimap: { enabled: false },
                                  fontSize: 13,
                                  lineHeight: 22,
                                  padding: { top: 12 },
                                  scrollBeyondLastLine: false,
                                }}
                              />
                           </div>
                           <div className="p-3 bg-muted/20 text-xs text-muted-foreground border-t border-border/50">
                             <strong className="text-foreground">AI Note:</strong> {block.english_translation}
                           </div>
                        </div>
                      )}
                    </div>
                  ))}
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

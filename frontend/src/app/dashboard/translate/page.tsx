"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, Copy, Download, Loader2, RotateCcw,
  Sparkles, Code2, FileText, ArrowLeftRight, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

const languages = ["python","javascript","java","cpp","typescript","go","rust"];

const modes = [
  { id: "code-to-english", label: "Code → English", icon: FileText },
  { id: "english-to-code", label: "English → Code", icon: Code2 },
  { id: "code-to-code", label: "Code → Code", icon: ArrowLeftRight },
];

export default function TranslatePage() {
  const { isPro } = useAuth();
  const [mode, setMode] = useState("code-to-english");
  const [sourceLanguage, setSourceLanguage] = useState("python");
  const [targetLanguage, setTargetLanguage] = useState("javascript");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentMode = modes.find((m) => m.id === mode)!;

  const handleTranslate = useCallback(async () => {
    if (!input.trim()) return;
    setLoading(true);
    setOutput("");
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      let endpoint = "";
      let body: Record<string, string> = {};
      if (mode === "code-to-english") {
        endpoint = "/api/code-to-english";
        body = { raw_code: input, language: sourceLanguage };
      } else if (mode === "english-to-code") {
        endpoint = "/api/generate-from-english";
        body = { english_description: input, target_language: targetLanguage };
      } else {
        endpoint = "/api/code-to-code";
        body = { raw_code: input, source_language: sourceLanguage, target_language: targetLanguage };
      }
      const res = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setOutput(data.explanation || data.generated_code || data.translated_code || JSON.stringify(data, null, 2));
    } catch (err: unknown) {
      setOutput(`Error: ${err instanceof Error ? err.message : "Translation failed"}`);
    } finally {
      setLoading(false);
    }
  }, [input, mode, sourceLanguage, targetLanguage]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  const handleClear = useCallback(() => { setInput(""); setOutput(""); }, []);

  const handleDownload = useCallback(() => {
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `anuvaad-translation.${mode === "code-to-english" ? "md" : "txt"}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [output, mode]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">Translate</h1>
            <Badge variant="secondary" className="text-[10px]">{currentMode.label}</Badge>
          </div>
          <div className="flex items-center gap-2">
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

      <div className="p-6">
        {/* Mode tabs */}
        <div className="mb-6 flex gap-1 rounded-xl bg-muted/50 p-1 w-fit">
          {modes.map((m) => {
            const Icon = m.icon;
            return (
              <button key={m.id} onClick={() => setMode(m.id)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-colors",
                  mode === m.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}>
                <Icon className="h-3.5 w-3.5" />{m.label}
              </button>
            );
          })}
        </div>

        {/* Language selectors */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {mode !== "english-to-code" && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-muted-foreground">Source:</label>
              <select value={sourceLanguage} onChange={(e) => setSourceLanguage(e.target.value)}
                className="h-8 rounded-md border border-border bg-background px-2 text-xs">
                {languages.map((l) => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
              </select>
            </div>
          )}
          {mode !== "code-to-english" && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-muted-foreground">Target:</label>
              <select value={targetLanguage} onChange={(e) => setTargetLanguage(e.target.value)}
                className="h-8 rounded-md border border-border bg-background px-2 text-xs">
                {languages.map((l) => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Editor + Output split */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {mode === "english-to-code" ? "Description" : "Source Code"}
              </p>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground">{input.length.toLocaleString()} chars</span>
                <Button variant="ghost" size="sm" onClick={handleClear} className="h-6 w-6 p-0"><RotateCcw className="h-3 w-3" /></Button>
              </div>
            </div>
            <textarea value={input} onChange={(e) => setInput(e.target.value)}
              placeholder={mode === "english-to-code" ? "Describe the code you want..." : "Paste your code here..."}
              className="min-h-[400px] flex-1 resize-none border-0 bg-background p-4 font-mono text-sm focus:outline-none"
              onKeyDown={(e) => { if (e.ctrlKey && e.key === "Enter") handleTranslate(); }}
            />
          </Card>

          <Card className="flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {mode === "code-to-english" ? "English Translation" : "Generated Code"}
              </p>
              {output && (
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" onClick={handleCopy} className="h-6 gap-1 px-2 text-[10px]">
                    {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleDownload} className="h-6 w-6 p-0">
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-auto p-4">
              {loading ? (
                <div className="flex h-full min-h-[400px] items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-amber-600" />
                    <p className="mt-3 text-sm text-muted-foreground">Translating...</p>
                  </div>
                </div>
              ) : output ? (
                <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">{output}</pre>
              ) : (
                <div className="flex h-full min-h-[400px] items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                      <Sparkles className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="mt-4 text-sm font-medium">Ready to translate</p>
                    <p className="mt-1 text-xs text-muted-foreground">Paste code and press Ctrl+Enter</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Translate button */}
        <div className="mt-4 flex justify-center">
          <Button onClick={handleTranslate} disabled={loading || !input.trim()}
            className="gap-2 px-8 bg-amber-600 hover:bg-amber-700">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            {loading ? "Translating..." : "Translate"}
          </Button>
        </div>
      </div>
    </div>
  );
}

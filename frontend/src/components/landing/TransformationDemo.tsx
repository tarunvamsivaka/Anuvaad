"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { 
  GlassPanel, 
  CodeSurface, 
  AmberBadge, 
  StatusDot, 
  TypographyProse
} from "@/design/primitives";
import { Button } from "@/design/components";
import { useReducedMotionContext } from "@/components/motion/ReducedMotion";
import { 
  Code2, 
  Sparkles, 
  Check, 
  Copy, 
  Terminal,
  HelpCircle,
  FileText
} from "lucide-react";

type Mode = "explain" | "generate" | "translate";

interface ExplainSection {
  id: string;
  lines: [number, number];
  title: string;
  description: string;
}

interface DiffLine {
  type: "added" | "removed" | "normal";
  content: string;
}

interface MappingSection {
  sourceLines: [number, number];
  targetLines: [number, number];
  title: string;
  description: string;
}

// Predefined datasets
const EXPLAIN_DATA = {
  language: "TypeScript",
  code: `import { NextRequest } from "next/server";
import { getLLMSingleton } from "@/lib/llm";

export async function POST(req: NextRequest) {
  const { code, targetLanguage } = await req.json();
  if (!code || !targetLanguage) {
    return new Response("Missing parameters", { status: 400 });
  }
  
  const stream = new ReadableStream({
    async start(controller) {
      const llm = getLLMSingleton();
      const response = await llm.streamTranslation(code, targetLanguage);
      for await (const chunk of response) {
        controller.enqueue(\`data: \${JSON.stringify(chunk)}\\n\\n\`);
      }
      controller.close();
    }
  });
  
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream" }
  });
}`,
  sections: [
    {
      id: "imports",
      lines: [1, 2],
      title: "Dependencies & Singleton Manager",
      description: "Imports Next.js server routing modules and the Anuvaad LLM singleton connector. Using a singleton pattern ensures optimized connection reuse, reducing latency and avoiding model re-initialization overhead."
    },
    {
      id: "handler-init",
      lines: [4, 8],
      title: "POST Route & Input Validation",
      description: "Defines the asynchronous POST handler. It extracts the raw code snippet and the target language from the request body, instantly performing safety checks. Omitted parameters result in an early exit returning HTTP 400."
    },
    {
      id: "streaming-core",
      lines: [10, 21],
      title: "SSE Readable Stream Lifecycle",
      description: "Spawns a native JS ReadableStream. Inside the start method, it invokes the singleton translation engine, fetches an async iterator over the response, and formats chunks into a Server-Sent Events (SSE) stream using standard carriage-returns."
    },
    {
      id: "response-headers",
      lines: [23, 26],
      title: "Header Negotiation",
      description: "Returns the stream within a standard Web Response object. Configures standard event-stream headers which instruct the browser to process chunks incrementally rather than buffering the response."
    }
  ] as ExplainSection[]
};

const GENERATE_DATA = {
  beforeCode: `import { useState } from "react";

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue] as const;
}`,
  prompts: [
    {
      id: "clear",
      label: "Add clear / removal method",
      instruction: "Add a method to remove the item from local storage and reset the state back to its initial value.",
      diff: [
        { type: "normal", content: "  const setValue = (value: T) => {" },
        { type: "normal", content: "    try {" },
        { type: "normal", content: "      setStoredValue(value);" },
        { type: "normal", content: "      window.localStorage.setItem(key, JSON.stringify(value));" },
        { type: "normal", content: "    } catch (error) {" },
        { type: "normal", content: "      console.error(error);" },
        { type: "normal", content: "    }" },
        { type: "normal", content: "  };" },
        { type: "normal", content: "" },
        { type: "added", content: "  const removeValue = () => {" },
        { type: "added", content: "    try {" },
        { type: "added", content: "      window.localStorage.removeItem(key);" },
        { type: "added", content: "      setStoredValue(initialValue);" },
        { type: "added", content: "    } catch (error) {" },
        { type: "added", content: "      console.error(error);" },
        { type: "added", content: "    }" },
        { type: "added", content: "  };" },
        { type: "normal", content: "" },
        { type: "removed", content: "  return [storedValue, setValue] as const;" },
        { type: "added", content: "  return [storedValue, setValue, removeValue] as const;" },
        { type: "normal", content: "}" }
      ] as DiffLine[]
    },
    {
      id: "sync",
      label: "Sync state across browser tabs",
      instruction: "Integrate a window storage listener hook to synchronize state across multiple open tabs dynamically.",
      diff: [
        { type: "removed", content: "import { useState } from \"react\";" },
        { type: "added", content: "import { useState, useEffect } from \"react\";" },
        { type: "normal", content: "" },
        { type: "normal", content: "export function useLocalStorage<T>(key: string, initialValue: T) {" },
        { type: "normal", content: "  // ... state initialization & setValue remain unchanged ..." },
        { type: "normal", content: "" },
        { type: "added", content: "  useEffect(() => {" },
        { type: "added", content: "    const handleStorageChange = (e: StorageEvent) => {" },
        { type: "added", content: "      if (e.key === key && e.newValue !== null) {" },
        { type: "added", content: "        setStoredValue(JSON.parse(e.newValue));" },
        { type: "added", content: "      }" },
        { type: "added", content: "    };" },
        { type: "added", content: "    window.addEventListener(\"storage\", handleStorageChange);" },
        { type: "added", content: "    return () => window.removeEventListener(\"storage\", handleStorageChange);" },
        { type: "added", content: "  }, [key]);" },
        { type: "normal", content: "" },
        { type: "normal", content: "  return [storedValue, setValue] as const;" },
        { type: "normal", content: "}" }
      ] as DiffLine[]
    }
  ]
};

const TRANSLATE_DATA = {
  sourceLanguage: "Python",
  targetLanguage: "TypeScript",
  sourceCode: `from dataclasses import dataclass, field
from typing import List, Optional

@dataclass
class User:
    id: int
    username: str
    email: str
    is_active: bool = True
    roles: List[str] = field(default_factory=list)
    
    def has_role(self, role: str) -> bool:
        return role in self.roles`,
  targetCode: `export interface UserData {
  id: number;
  username: string;
  email: string;
  isActive: boolean;
  roles: string[];
}

export class User {
  constructor(public data: UserData) {}
  
  hasRole(role: string): boolean {
    return this.data.roles.includes(role);
  }
}`,
  mappings: [
    {
      sourceLines: [4, 5],
      targetLines: [1, 1],
      title: "@dataclass decorator mappings",
      description: "Python's @dataclass decorator acts as a structural generator. Anuvaad maps this to a clean TypeScript interface contract (UserData) for configuration data and generates a corresponding executable class to preserve object properties."
    },
    {
      sourceLines: [9, 9],
      targetLines: [5, 5],
      title: "Field Defaults & Standard Libraries",
      description: "Python's `field(default_factory=list)` instantiates an empty list. This is translated directly to a standard TypeScript array annotation `string[]` inside the interface, mapping type bounds correctly."
    },
    {
      sourceLines: [8, 8],
      targetLines: [4, 4],
      title: "Casing & Primitive Translations",
      description: "Anuvaad standardizes snake_case parameters (`is_active: bool`) to camelCase attributes (`isActive: boolean`), enforcing consistent naming styles across ecosystem languages."
    },
    {
      sourceLines: [11, 12],
      targetLines: [10, 13],
      title: "Syntactic Idioms & Built-ins",
      description: "Translates Python's sequence membership (`role in self.roles`) to TypeScript's array method (`this.data.roles.includes(role)`), replacing Python specific syntax with TypeScript equivalents."
    }
  ] as MappingSection[]
};

export function TransformationDemo() {
  const [activeMode, setActiveMode] = useState<Mode>("explain");
  const [isScanning, setIsScanning] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activePromptIndex, setActivePromptIndex] = useState(0);

  // For Interactive Line Highlights in Code to English
  const [hoveredExplainSection, setHoveredExplainSection] = useState<string | null>(null);
  const [hoveredLineNum, setHoveredLineNum] = useState<number | null>(null);

  // For Code to Code Mappings
  const [hoveredMappingIndex, setHoveredMappingIndex] = useState<number | null>(null);

  const motionSafe = useReducedMotionContext();

  const handleTabChange = (mode: Mode) => {
    setActiveMode(mode);
    setHoveredExplainSection(null);
    setHoveredLineNum(null);
    setHoveredMappingIndex(null);

    if (!motionSafe) {
      setIsScanning(false);
      setShowResults(true);
      return;
    }

    setIsScanning(true);
    setShowResults(false);

    const scanTimer = setTimeout(() => {
      setIsScanning(false);
      setShowResults(true);
    }, 600);

    return () => clearTimeout(scanTimer);
  };

  useEffect(() => {
    // Initial run
    handleTabChange("explain");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getExplainSectionIdForLine = (lineNum: number) => {
    const section = EXPLAIN_DATA.sections.find(
      s => lineNum >= s.lines[0] && lineNum <= s.lines[1]
    );
    return section ? section.id : null;
  };

  return (
    <section 
      id="demo" 
      className="relative z-10 w-full bg-[#020204] py-24 px-6 md:px-12 border-t border-[var(--border-faint)] overflow-hidden"
    >
      {/* Background orbs */}
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[40vw] h-[40vw] rounded-full bg-gradient-to-tr from-amber-500/5 to-indigo-500/5 blur-3xl pointer-events-none" />
      
      <div className="max-w-7xl mx-auto flex flex-col items-center">
        
        {/* Header */}
        <div className="text-center mb-16 max-w-2xl">
          <AmberBadge variant="subtle" size="sm" className="mb-4" dot>
            INTERACTIVE PREVIEW
          </AmberBadge>
          <h2 className="text-3xl md:text-5xl font-extrabold text-[var(--text-primary)] tracking-tight mb-4 headline-gradient">
            Experience Repository Translation
          </h2>
          <p className="text-slate-400 text-base md:text-lg">
            Interact with real codebase assets. See how Anuvaad decodes, refactors, and converts logic in milliseconds.
          </p>
        </div>

        {/* Custom Tab Selector */}
        <div className="mb-10 w-full max-w-lg">
          <div className="macos-segmented-track relative flex bg-[#0a0a0f] border border-[var(--border-faint)] p-1 rounded-xl">
            <button
              onClick={() => handleTabChange("explain")}
              className={cn(
                "flex-1 text-center py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 z-10",
                activeMode === "explain" ? "bg-[rgba(245,158,11,0.15)] text-[var(--text-primary)] border border-amber-500/30" : "text-slate-400 hover:text-slate-200"
              )}
            >
              <FileText className="w-3.5 h-3.5 text-amber-500" />
              Code → English
            </button>
            <button
              onClick={() => handleTabChange("generate")}
              className={cn(
                "flex-1 text-center py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 z-10",
                activeMode === "generate" ? "bg-[rgba(245,158,11,0.15)] text-[var(--text-primary)] border border-amber-500/30" : "text-slate-400 hover:text-slate-200"
              )}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              English → Code
            </button>
            <button
              onClick={() => handleTabChange("translate")}
              className={cn(
                "flex-1 text-center py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 z-10",
                activeMode === "translate" ? "bg-[rgba(245,158,11,0.15)] text-[var(--text-primary)] border border-amber-500/30" : "text-slate-400 hover:text-slate-200"
              )}
            >
              <Code2 className="w-3.5 h-3.5 text-amber-500" />
              Code → Code
            </button>
          </div>
        </div>

        {/* Demo Box */}
        <GlassPanel 
          level="dark" 
          rounded="2xl" 
          glow="sm" 
          className="w-full border border-[var(--border-default)] shadow-2xl overflow-hidden"
        >
          {/* Mock Window Header */}
          <div className="flex items-center justify-between bg-surface-card border-b border-[var(--border-faint)] px-5 py-3.5">
            {/* Window Dots */}
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
            </div>
            
            {/* Title / Badge */}
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <Terminal className="w-3.5 h-3.5 text-amber-500" />
              <span>demo_session_stdout</span>
            </div>

            {/* Offline execution status */}
            <div className="flex items-center gap-2">
              <StatusDot status="active" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 hidden sm:inline">
                Zero-Latency Engine
              </span>
            </div>
          </div>

          {/* Interactive Workspace Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[var(--border-faint)]">
            
            {/* LEFT COLUMN: Input Workspace */}
            <div className="p-5 md:p-8 flex flex-col bg-surface-base/40">
              
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {activeMode === "explain" && "Source File"}
                  {activeMode === "generate" && "Requirements Command"}
                  {activeMode === "translate" && "Source File"}
                </span>
                
                {activeMode !== "generate" && (
                  <AmberBadge variant="subtle" size="sm" dot>
                    {activeMode === "explain" ? EXPLAIN_DATA.language : TRANSLATE_DATA.sourceLanguage}
                  </AmberBadge>
                )}
              </div>

              {/* Input Surface */}
              <CodeSurface 
                scanning={isScanning}
                className="flex-1 text-[var(--text-sm)] font-mono min-h-[380px] leading-relaxed border border-[var(--border-faint)] text-slate-300"
              >
                {/* CODE TO ENGLISH INPUT */}
                {activeMode === "explain" && (
                  <div className="select-none py-2 overflow-x-auto" tabIndex={0} aria-label="TypeScript source code preview">
                    {EXPLAIN_DATA.code.split("\n").map((line, idx) => {
                      const lineNum = idx + 1;
                      const activeSecId = getExplainSectionIdForLine(lineNum);
                      const isHighlighted = hoveredExplainSection === activeSecId || hoveredLineNum === lineNum;
                      return (
                        <div 
                          key={idx}
                          onMouseEnter={() => {
                            setHoveredLineNum(lineNum);
                            if (activeSecId) setHoveredExplainSection(activeSecId);
                          }}
                          onMouseLeave={() => {
                            setHoveredLineNum(null);
                            setHoveredExplainSection(null);
                          }}
                          className={cn(
                            "px-4 py-0.5 flex items-start gap-4 transition-colors cursor-pointer group rounded-sm",
                            isHighlighted ? "bg-[rgba(245,158,11,0.08)] text-[var(--amber-300)]" : "hover:bg-slate-800/20"
                          )}
                        >
                          <span className={cn(
                            "w-6 text-right shrink-0 select-none text-xs",
                            isHighlighted ? "text-amber-500 font-bold" : "text-slate-600"
                          )}>
                            {lineNum}
                          </span>
                          <pre className="flex-1 whitespace-pre font-mono text-[13px]">{line}</pre>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* ENGLISH TO CODE INPUT */}
                {activeMode === "generate" && (
                  <div className="flex flex-col gap-5 p-4 justify-between h-full min-h-[340px]">
                    <div className="space-y-4">
                      <p className="text-slate-400 text-sm font-sans leading-relaxed">
                        Select a repository modification instruction. Anuvaad parses the instruction, maps it to file structures, and writes the code changes cleanly.
                      </p>
                      
                      {/* Prompts list */}
                      <div className="space-y-2 font-sans">
                        {GENERATE_DATA.prompts.map((p, idx) => (
                          <div 
                            key={p.id}
                            onClick={() => {
                              setActivePromptIndex(idx);
                              if (motionSafe) {
                                setIsScanning(true);
                                setShowResults(false);
                                setTimeout(() => {
                                  setIsScanning(false);
                                  setShowResults(true);
                                }, 500);
                              }
                            }}
                            className={cn(
                              "border p-3.5 rounded-xl cursor-pointer transition-all duration-300",
                              activePromptIndex === idx
                                ? "bg-[rgba(245,158,11,0.08)] border-amber-500/40 shadow-[var(--glow-xs)]"
                                : "bg-[#09090d] border-[var(--border-faint)] hover:border-[var(--border-default)]"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <span className={cn(
                                "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 text-[10px]",
                                activePromptIndex === idx ? "border-amber-500 bg-amber-500 text-black font-bold" : "border-slate-600 text-slate-500"
                              )}>
                                {activePromptIndex === idx && "✓"}
                              </span>
                              <span className={cn(
                                "text-xs font-semibold uppercase tracking-wider",
                                activePromptIndex === idx ? "text-amber-400" : "text-slate-400"
                              )}>
                                Instruction Option {idx + 1}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-slate-300 leading-relaxed pl-7">
                              {p.instruction}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-[var(--border-faint)] pt-4 flex items-center justify-between font-sans">
                      <div className="flex items-center gap-2">
                        <Terminal className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-xs text-slate-400 font-mono">useLocalStorage.tsx</span>
                      </div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
                        ready to compile
                      </span>
                    </div>
                  </div>
                )}

                {/* CODE TO CODE INPUT */}
                {activeMode === "translate" && (
                  <div className="select-none py-2 overflow-x-auto" tabIndex={0} aria-label="Python source code preview">
                    {TRANSLATE_DATA.sourceCode.split("\n").map((line, idx) => {
                      const lineNum = idx + 1;
                      const activeMappingIdx = TRANSLATE_DATA.mappings.findIndex(
                        m => lineNum >= m.sourceLines[0] && lineNum <= m.sourceLines[1]
                      );
                      const isHighlighted = hoveredMappingIndex === activeMappingIdx;
                      
                      return (
                        <div 
                          key={idx}
                          onMouseEnter={() => {
                            if (activeMappingIdx !== -1) setHoveredMappingIndex(activeMappingIdx);
                          }}
                          onMouseLeave={() => setHoveredMappingIndex(null)}
                          className={cn(
                            "px-4 py-0.5 flex items-start gap-4 transition-colors cursor-pointer rounded-sm",
                            isHighlighted ? "bg-[rgba(245,158,11,0.08)] text-[var(--amber-300)]" : "hover:bg-slate-800/20"
                          )}
                        >
                          <span className={cn(
                            "w-6 text-right shrink-0 select-none text-xs",
                            isHighlighted ? "text-amber-500 font-bold" : "text-slate-600"
                          )}>
                            {lineNum}
                          </span>
                          <pre className="flex-1 whitespace-pre font-mono text-[13px]">{line}</pre>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CodeSurface>
            </div>

            {/* RIGHT COLUMN: Output Preview */}
            <div className="p-5 md:p-8 flex flex-col bg-surface-card/20">
              
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {activeMode === "explain" && "English Breakdown"}
                  {activeMode === "generate" && "Calculated Code Diff"}
                  {activeMode === "translate" && "Translated Logic"}
                </span>

                {activeMode === "translate" && (
                  <AmberBadge variant="solid" size="sm" glow>
                    {TRANSLATE_DATA.targetLanguage}
                  </AmberBadge>
                )}
              </div>

              {/* Output Loading Skeleton */}
              {isScanning && (
                <div className="space-y-4 py-2 min-h-[380px] flex flex-col justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 rounded-full border border-amber-500/30 border-t-amber-500 animate-spin" />
                    <span className="text-xs font-mono text-amber-500 uppercase tracking-widest animate-pulse">
                      Analyzing semantics...
                    </span>
                  </div>
                  <div className="space-y-2 opacity-30 px-6">
                    <div className="h-4 w-full bg-slate-700/30 rounded-md animate-pulse" />
                    <div className="h-4 w-5/6 bg-slate-700/30 rounded-md animate-pulse" />
                    <div className="h-4 w-4/5 bg-slate-700/30 rounded-md animate-pulse" />
                  </div>
                </div>
              )}

              {/* Output Render */}
              {!isScanning && showResults && (
                <div className="flex-1 flex flex-col justify-between min-h-[380px]">
                  
                  {/* CODE TO ENGLISH RENDER */}
                  {activeMode === "explain" && (
                    <div className="space-y-4 overflow-y-auto max-h-[440px] pr-2" tabIndex={0} aria-label="English explanation details">
                      <div className="p-4 bg-[rgba(245,158,11,0.04)] border border-amber-500/10 rounded-xl mb-2">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-1">
                          System Summary
                        </h3>
                        <TypographyProse size="sm" textColor="secondary">
                          This is a Next.js API route that handles Server-Sent Events (SSE) streaming for real-time code translation. Hover over any explanation card below to highlight the corresponding lines in the source code file.
                        </TypographyProse>
                      </div>

                      {EXPLAIN_DATA.sections.map((section) => {
                        const isHighlighted = hoveredExplainSection === section.id;
                        return (
                          <div
                            key={section.id}
                            onMouseEnter={() => setHoveredExplainSection(section.id)}
                            onMouseLeave={() => setHoveredExplainSection(null)}
                            className={cn(
                              "p-4 rounded-xl border transition-all duration-300 cursor-pointer",
                              isHighlighted 
                                ? "bg-[rgba(245,158,11,0.06)] border-amber-500/30 shadow-[var(--glow-xs)]" 
                                : "bg-[#09090d]/60 border-[var(--border-faint)] hover:border-[var(--border-default)]"
                            )}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                                  {section.title}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-slate-500 bg-[#121218] border border-[var(--border-faint)] px-1.5 py-0.5 rounded">
                                Lines {section.lines[0]}-{section.lines[1]}
                              </span>
                            </div>
                            <TypographyProse size="sm" textColor="secondary" className="pl-3.5 italic text-slate-300">
                              {section.description}
                            </TypographyProse>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* ENGLISH TO CODE RENDER */}
                  {activeMode === "generate" && (
                    <div className="flex flex-col flex-1 justify-between h-full">
                      <CodeSurface 
                        tabIndex={0}
                        aria-label="Calculated code diff output"
                        className="text-xs font-mono min-h-[320px] bg-surface-card border border-[var(--border-faint)] overflow-x-auto whitespace-pre rounded-xl py-3"
                      >
                        {GENERATE_DATA.prompts[activePromptIndex].diff.map((line, idx) => (
                          <div 
                            key={idx}
                            className={cn(
                              "px-4 py-0.5 flex items-start gap-3 w-full",
                              line.type === "added" && "bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500",
                              line.type === "removed" && "bg-rose-500/10 text-rose-400 border-l-2 border-rose-500 line-through"
                            )}
                          >
                            <span className={cn(
                              "w-4 text-[10px] shrink-0 font-bold select-none text-right opacity-60",
                              line.type === "added" && "text-emerald-400",
                              line.type === "removed" && "text-rose-400",
                              line.type === "normal" && "text-slate-600"
                            )}>
                              {line.type === "added" && "+"}
                              {line.type === "removed" && "-"}
                              {line.type === "normal" && " "}
                            </span>
                            <pre className="font-mono text-[12px]">{line.content}</pre>
                          </div>
                        ))}
                      </CodeSurface>

                      <div className="flex items-center justify-between mt-4">
                        <span className="text-slate-400 text-xs font-sans">
                          Git diff generated in <span className="text-amber-400 font-bold font-mono">42ms</span>
                        </span>
                        
                        <Button 
                          variant="amber-outline" 
                          size="sm"
                          onClick={() => {
                            const codeStr = GENERATE_DATA.prompts[activePromptIndex].diff
                              .filter(l => l.type !== "removed")
                              .map(l => l.content)
                              .join("\n");
                            handleCopy(codeStr);
                          }}
                        >
                          {copied ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              Copy Code
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* CODE TO CODE RENDER */}
                  {activeMode === "translate" && (
                    <div className="space-y-4 flex flex-col flex-1 justify-between">
                      <CodeSurface 
                        tabIndex={0}
                        aria-label="Translated TypeScript logic output"
                        className="text-[13px] font-mono min-h-[220px] bg-surface-card border border-[var(--border-faint)] overflow-x-auto whitespace-pre rounded-xl py-3 text-slate-300"
                      >
                        {TRANSLATE_DATA.targetCode.split("\n").map((line, idx) => {
                          const lineNum = idx + 1;
                          const activeMappingIdx = TRANSLATE_DATA.mappings.findIndex(
                            m => lineNum >= m.targetLines[0] && lineNum <= m.targetLines[1]
                          );
                          const isHighlighted = hoveredMappingIndex === activeMappingIdx;

                          return (
                            <div 
                              key={idx}
                              onMouseEnter={() => {
                                if (activeMappingIdx !== -1) setHoveredMappingIndex(activeMappingIdx);
                              }}
                              onMouseLeave={() => setHoveredMappingIndex(null)}
                              className={cn(
                                "px-4 py-0.5 flex items-start gap-4 transition-colors cursor-pointer rounded-sm",
                                isHighlighted ? "bg-[rgba(245,158,11,0.08)] text-[var(--amber-300)]" : "hover:bg-slate-800/20"
                              )}
                            >
                              <span className={cn(
                                "w-6 text-right shrink-0 select-none text-xs",
                                isHighlighted ? "text-amber-500 font-bold" : "text-slate-600"
                              )}>
                                {lineNum}
                              </span>
                              <pre className="flex-1 whitespace-pre font-mono text-[13px]">{line}</pre>
                            </div>
                          );
                        })}
                      </CodeSurface>

                      {/* Mapping details card */}
                      <div className="min-h-[120px] p-4 bg-[#09090d]/60 border border-[var(--border-faint)] rounded-xl flex flex-col justify-center transition-all duration-300">
                        {hoveredMappingIndex !== null ? (
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <HelpCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                                {TRANSLATE_DATA.mappings[hoveredMappingIndex].title}
                              </span>
                            </div>
                            <TypographyProse size="sm" textColor="secondary" className="pl-5 italic text-slate-300">
                              {TRANSLATE_DATA.mappings[hoveredMappingIndex].description}
                            </TypographyProse>
                          </div>
                        ) : (
                          <div className="text-center py-2">
                            <InfoLabel />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between border-t border-[var(--border-faint)] pt-3">
                        <span className="text-[11px] text-slate-400 font-sans">
                          Hover lines in either editor to see compiler mapping rules.
                        </span>
                        
                        <Button 
                          variant="amber-outline" 
                          size="sm"
                          onClick={() => handleCopy(TRANSLATE_DATA.targetCode)}
                        >
                          {copied ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              Copy Code
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
            
          </div>
          
          {/* Bottom control panel */}
          <div className="flex flex-col sm:flex-row items-center justify-between bg-surface-card border-t border-[var(--border-faint)] px-6 py-4 gap-4">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-sans text-slate-400">
                Pre-compiled local cache active. Speed optimized: <span className="text-amber-400 font-bold font-mono">1.8s limit</span>.
              </span>
            </div>

            <a
              href="/signup"
              className="w-full sm:w-auto px-6 py-2.5 rounded-lg text-xs font-bold tracking-wider btn-amber-shimmer uppercase text-center cursor-pointer select-none transition-all duration-300 hover:scale-[1.02] shadow-[0_0_20px_rgba(245,158,11,0.2)]"
            >
              Try with your own code →
            </a>
          </div>

        </GlassPanel>

      </div>
    </section>
  );
}

// Sub-components to keep code clean and structured
function InfoLabel() {
  return (
    <div className="flex flex-col items-center justify-center text-slate-400 font-sans">
      <div className="flex items-center gap-2 mb-1">
        <Terminal className="w-4 h-4 text-amber-500/60" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Compiler Mapping Analysis
        </span>
      </div>
      <p className="text-xs text-slate-500 italic max-w-sm">
        Hover over Python decorator tags, casing boundaries, list schemas, or methods to observe real-time transpilation logic.
      </p>
    </div>
  );
}

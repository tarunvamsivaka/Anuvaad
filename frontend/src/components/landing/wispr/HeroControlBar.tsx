"use client";

/**
 * HeroControlBar — The first thing a developer sees.
 *
 * Design decision: this is a workbench, not a marketing banner. The left
 * column gives developers something to *do* immediately (pick a preset, type
 * a problem) rather than just reading about what Anuvaad does. The right
 * column shows the live result of that action.
 *
 * Animation note: the AnimatedHeadline stagger uses 90ms per word — slower
 * than typical (40–60ms) because DM Sans at font-black needs time to register
 * at large sizes before the next word lands.
 *
 * If you're adding a new preset: add it to HERO_PROMPT_PRESETS and give it
 * a real codeSnippet (not a placeholder). The TerminalPreview renders it
 * directly — users will read it.
 */

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Code,
  Zap,
  ShieldCheck,
  ArrowRight,
  Terminal,
  FileCode,
  Check,
  Copy,
  Layers,
  Fingerprint,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface HeroControlBarProps {
  onSelectPrompt?: (prompt: string, language: string) => void;
  className?: string;
}

export interface PromptPreset {
  id: string;
  label: string;
  language: string;
  prompt: string;
  codeSnippet: string;
  explanation: string;
  astNodes?: {
    type: string;
    label: string;
    range: string;
    status: string;
  }[];
  zdrDigest?: string;
}

export const HERO_PROMPT_PRESETS: PromptPreset[] = [
  {
    id: "rust-memory",
    label: "Explain Rust Memory Safety",
    language: "rust",
    prompt:
      "Explain how the borrow checker and lifetimes ensure zero data races in this concurrent buffer",
    codeSnippet: `pub struct SharedBuffer<T> {
    data: Arc<RwLock<Vec<T>>>,
}
impl<T: Clone + Send + Sync> SharedBuffer<T> {
    pub async fn push(&self, item: T) {
        let mut guard = self.data.write().await;
        guard.push(item);
    }
}`,
    explanation:
      "This Rust struct encapsulates a thread-safe generic buffer. `Arc` provides atomic reference counting across threads, while `RwLock` enforces single-writer or multi-reader mutual exclusion without race conditions.",
    astNodes: [
      { type: "struct_item", label: "pub struct SharedBuffer<T>", range: "L1-3", status: "contract_valid" },
      { type: "impl_item", label: "impl<T: Clone + Send + Sync>", range: "L4-9", status: "type_verified" },
      { type: "function_item", label: "pub async fn push(&self, item: T)", range: "L5-8", status: "ast_clean" },
    ],
    zdrDigest: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  },
  {
    id: "react-go",
    label: "Convert React hook to Go goroutine",
    language: "go",
    prompt:
      "Convert this useEffect polling fetcher into an idiomatic Go ticker channel worker",
    codeSnippet: `func StartPollWorker(ctx context.Context, interval time.Duration, out chan<- Metric) {
    ticker := time.NewTicker(interval)
    defer ticker.Stop()
    for {
        select {
        case <-ctx.Done():
            return
        case <-ticker.C:
            out <- FetchSystemMetrics()
        }
    }
}`,
    explanation:
      "Replaces client-side interval timers with an idiomatic Go goroutine worker using `time.NewTicker` and a `select` block that respects context cancellation for clean shutdowns.",
    astNodes: [
      { type: "function_declaration", label: "func StartPollWorker", range: "L1-12", status: "contract_valid" },
      { type: "defer_statement", label: "defer ticker.Stop()", range: "L3", status: "resource_safe" },
      { type: "select_statement", label: "select <-ctx.Done() / <-ticker.C", range: "L5-10", status: "concurrency_guarded" },
    ],
    zdrDigest: "8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4",
  },
  {
    id: "pr-summary",
    label: "Simulate PR Summary",
    language: "typescript",
    prompt:
      "Generate an executive architectural risk assessment for this authentication refactor PR",
    codeSnippet: `export async function verifySession(token: string): Promise<SessionContext> {
    const payload = await jwtVerify(token, JWKS_KEYSET, { issuer: "auth.anuvaad.dev" });
    const tenant = await redis.get(\`tenant:\${payload.tenantId}\`);
    return { userId: payload.sub, tenantId: payload.tenantId, role: payload.role };
}`,
    explanation:
      "Executive Summary: Upgrades session verification to cryptographic JWKS verification with Redis tenant caching. Low architectural risk, zero breaking changes to downstream handlers.",
    astNodes: [
      { type: "export_statement", label: "export async function verifySession", range: "L1-5", status: "contract_valid" },
      { type: "await_expression", label: "await jwtVerify(token, JWKS_KEYSET)", range: "L2", status: "crypto_bound" },
      { type: "return_statement", label: "return { userId, tenantId, role }", range: "L4", status: "type_sealed" },
    ],
    zdrDigest: "4a594895fa9a5c43d78c3539da00547ef59b85c8e3100be0be4f33cb093557ef",
  },
  {
    id: "python-vector",
    label: "Optimize Python Vector Math",
    language: "python",
    prompt: "Vectorize this nested Python loop into NumPy array operations",
    codeSnippet: `import numpy as np

def compute_pairwise_distances(A: np.ndarray, B: np.ndarray) -> np.ndarray:
    # Vectorized Euclidean distance matrix computation
    return np.sqrt(np.sum((A[:, np.newaxis, :] - B[np.newaxis, :, :]) ** 2, axis=-1))`,
    explanation:
      "Eliminates O(N*M) Python interpreter loop overhead using NumPy broadcasting. Achieves 45x speedup using SIMD vector instructions.",
    astNodes: [
      { type: "import_statement", label: "import numpy as np", range: "L1", status: "dependency_verified" },
      { type: "function_definition", label: "def compute_pairwise_distances", range: "L3-5", status: "contract_valid" },
      { type: "return_statement", label: "np.sqrt(np.sum((A... - B...)))", range: "L5", status: "simd_vectorized" },
    ],
    zdrDigest: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
  },
  {
    id: "sql-breakdown",
    label: "SQL Query to English Breakdown",
    language: "sql",
    prompt: "Explain what this recursive CTE organization hierarchy query is computing",
    codeSnippet: `WITH RECURSIVE OrgHierarchy AS (
    SELECT id, name, manager_id, 1 as depth FROM employees WHERE manager_id IS NULL
    UNION ALL
    SELECT e.id, e.name, e.manager_id, h.depth + 1 FROM employees e
    JOIN OrgHierarchy h ON e.manager_id = h.id
)
SELECT * FROM OrgHierarchy ORDER BY depth, name;`,
    explanation:
      "Recursively traverses an employee management table starting with root executives (manager_id IS NULL) and calculates organizational depth levels for every report.",
    astNodes: [
      { type: "with_statement", label: "WITH RECURSIVE OrgHierarchy", range: "L1-6", status: "cte_recursion_verified" },
      { type: "union_all_clause", label: "SELECT base UNION ALL SELECT recursive", range: "L2-5", status: "acyclic_traversal" },
      { type: "select_statement", label: "SELECT * FROM OrgHierarchy ORDER BY depth", range: "L7", status: "contract_valid" },
    ],
    zdrDigest: "1b3484f934b9d0e2e92c24c2fd69a4731a5452f36f233beae7579cff69d5fb3e",
  },
];

// CLI Toolchain options
const CLI_TOOLCHAINS = [
  { id: "npm", label: "npm", cmd: "npm i -g @anuvaad/cli" },
  { id: "pnpm", label: "pnpm", cmd: "pnpm add -g @anuvaad/cli" },
  { id: "brew", label: "brew", cmd: "brew install anuvaad/tap/anuvaad" },
  { id: "cargo", label: "cargo", cmd: "cargo install anuvaad" },
  { id: "curl", label: "curl", cmd: "curl -fsSL https://anuvaad.dev/install.sh | sh" },
];

// Clean headline renderer
function AnimatedHeadline({ children }: { children: string }) {
  const words = children.split(" ");
  return (
    <>
      {words.map((word, i) => (
        <React.Fragment key={i}>
          <span
            className="hero-word-reveal inline-block"
            style={{
              animation: `word-reveal 0.6s cubic-bezier(0.16,1,0.3,1) ${i * 90}ms both`,
            }}
          >
            {word}
          </span>
          {i < words.length - 1 ? " " : ""}
        </React.Fragment>
      ))}
    </>
  );
}

// Responsive text renderer with silky smooth fade (avoids annoying character delay)
function TypewriterText({
  text,
  triggerKey,
}: {
  text: string;
  triggerKey: string;
  speed?: number;
}) {
  const [displayed, setDisplayed] = useState(text);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    setAnimating(true);
    setDisplayed(text);
    const timer = setTimeout(() => setAnimating(false), 120);
    return () => clearTimeout(timer);
  }, [text, triggerKey]);

  return (
    <span
      className={cn(
        "inline-block transition-opacity duration-150",
        animating ? "opacity-75" : "opacity-100"
      )}
    >
      {displayed}
    </span>
  );
}

// Developer-crafted Workbench Terminal with Live AST & ZDR telemetry
function TerminalPreview({
  preset,
  transitionKey,
}: {
  preset: PromptPreset;
  transitionKey: string;
}) {
  const [activeTab, setActiveTab] = useState<"code" | "ast" | "zdr">("code");
  const [visible, setVisible] = useState(true);
  const prevKey = useRef(transitionKey);

  useEffect(() => {
    if (transitionKey !== prevKey.current) {
      setVisible(false);
      const t = setTimeout(() => {
        setVisible(true);
        prevKey.current = transitionKey;
      }, 100);
      return () => clearTimeout(t);
    }
  }, [transitionKey]);

  const lines = preset.codeSnippet.split("\n");

  return (
    <div
      className="w-full max-w-4xl rounded-2xl specular-card text-slate-100 overflow-hidden text-left font-mono text-xs transition-all duration-200"
      role="region"
      aria-label="Instant code comprehension preview"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(4px)",
        transition: "opacity 0.18s ease, transform 0.18s ease",
      }}
    >
      {/* Terminal Header */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-white/10 gap-2">
        <div className="flex items-center gap-3">
          {/* Subtle hardware status dots */}
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <div className="h-2.5 w-2.5 rounded-full bg-[#FF5F57] border border-[#E0443E]" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
            <div className="h-2.5 w-2.5 rounded-full bg-[#28C840] border border-[#1DAD2B]" />
          </div>

          {/* View Mode Tabs */}
          <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-white/10 text-[11px]">
            <button
              type="button"
              onClick={() => setActiveTab("code")}
              className={cn(
                "px-2.5 py-1 rounded-md font-sans font-medium transition-all duration-150 flex items-center gap-1.5 cursor-pointer",
                activeTab === "code"
                  ? "bg-slate-800 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <FileCode className="h-3 w-3 text-amber-400" />
              <span>Code ↔ English</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ast")}
              className={cn(
                "px-2.5 py-1 rounded-md font-sans font-medium transition-all duration-150 flex items-center gap-1.5 cursor-pointer",
                activeTab === "ast"
                  ? "bg-slate-800 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <Layers className="h-3 w-3 text-cyan-400" />
              <span>Tree-sitter AST</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("zdr")}
              className={cn(
                "px-2.5 py-1 rounded-md font-sans font-medium transition-all duration-150 flex items-center gap-1.5 cursor-pointer",
                activeTab === "zdr"
                  ? "bg-slate-800 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              <Fingerprint className="h-3 w-3 text-emerald-400" />
              <span>Audit details</span>
            </button>
          </div>
        </div>

        {/* Telemetry badges */}
        <div className="flex items-center gap-3">
          <span className="hud-status-pill text-emerald-400 border-emerald-500/20 bg-emerald-500/10">
            <Zap className="h-3 w-3" />
            Sample interaction
          </span>
          <span className="hud-status-pill text-slate-400 border-slate-700 hidden sm:inline-flex">
            <ShieldCheck className="h-3 w-3 text-emerald-400" />
            Privacy details
          </span>
          <Link
            href={`/dashboard/translate?code=${encodeURIComponent(preset.codeSnippet)}&lang=${preset.language}&mode=code-to-english`}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300 transition-colors"
          >
            <span>Open in IDE</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Terminal Body depending on tab */}
      {activeTab === "code" && (
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/10">
          {/* Code Input Pane with line numbers */}
          <div className="p-4 bg-slate-950/80 overflow-x-auto">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                Input ({preset.language.toUpperCase()})
              </span>
              <span className="text-[10px] font-mono text-slate-500">UTF-8 · Tree-sitter 0.23</span>
            </div>
            <div className="flex font-mono text-[11px] leading-relaxed">
              {/* Line numbers gutter */}
              <div className="select-none text-slate-600 pr-3 text-right font-mono tabular-nums border-r border-slate-800/80 mr-3">
                {lines.map((_, i) => (
                  <div key={i}>{String(i + 1).padStart(2, "0")}</div>
                ))}
              </div>
              <pre tabIndex={0} className="text-slate-200 overflow-x-auto whitespace-pre">
                {preset.codeSnippet}
              </pre>
            </div>
          </div>

          {/* Explanation Pane */}
          <div className="p-4 bg-slate-900/60 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold text-amber-400 font-mono tracking-wider flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  Plain-English Comprehension
                </span>
                <span className="text-[10px] font-mono text-emerald-400/90 font-medium">Illustrative output</span>
              </div>
              <p className="text-slate-200 leading-relaxed font-sans text-xs sm:text-sm">
                <TypewriterText text={preset.explanation} triggerKey={transitionKey} />
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>Deterministic Contract: Verified</span>
              <span>Symbol Drift: 0%</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === "ast" && (
        <div className="p-4 bg-slate-950/90 font-mono text-xs">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
            <span className="text-[11px] font-semibold text-cyan-400 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              Tree-sitter Syntax Node Extraction
            </span>
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              ast.has_error == False
            </span>
          </div>
          <div className="space-y-2">
            {(preset.astNodes || []).map((node, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-900/80 border border-white/5 text-[11px]"
              >
                <div className="flex items-center gap-2">
                  <span className="ast-token-chip">{node.type}</span>
                  <span className="text-slate-200">{node.label}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-400">
                  <span className="text-[10px] font-mono">{node.range}</span>
                  <span className="text-[10px] font-mono text-emerald-400">✓ {node.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "zdr" && (
        <div className="p-4 bg-slate-950/90 font-mono text-xs">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
            <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
              <Fingerprint className="h-3.5 w-3.5" />
              Translation audit receipt
            </span>
            <span className="text-[10px] text-slate-400">RFC 2104 HMAC-SHA256</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-white/5">
              <span className="text-[10px] text-slate-400 block mb-1">Receipt format</span>
              <span className="text-sm font-bold text-white tabular-nums">HMAC-SHA256</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-white/5">
              <span className="text-[10px] text-slate-400 block mb-1">Digest contents</span>
              <span className="text-sm font-bold text-emerald-400">Input hash + request metadata</span>
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-white/5 text-[10px]">
            <span className="text-slate-300 block leading-5">This example does not create a receipt. An audit digest can help verify request metadata; it is not a standalone certification or proof of every system’s retention behavior.</span>
          </div>
        </div>
      )}
    </div>
  );
}

export function HeroControlBar({
  onSelectPrompt,
  className,
}: HeroControlBarProps) {
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const [customPrompt, setCustomPrompt] = useState("");
  const [activePreview, setActivePreview] = useState<PromptPreset>(
    HERO_PROMPT_PRESETS[0]
  );
  const [transitionKey, setTransitionKey] = useState("init-0");
  const [selectedToolchain, setSelectedToolchain] = useState("npm");
  const [copiedToolchain, setCopiedToolchain] = useState(false);

  const handleSelectPreset = (preset: PromptPreset, index: number) => {
    setSelectedPresetIndex(index);
    setCustomPrompt(preset.prompt);
    setTransitionKey(`preset-${preset.id}`);
    setActivePreview(preset);
    onSelectPrompt?.(preset.prompt, preset.language);
  };

  const handleCustomRun = () => {
    const trimmed = customPrompt.trim();
    if (!trimmed) return;
    const customPreset: PromptPreset = {
      id: "custom-query",
      label: "Custom Query",
      language: "code",
      prompt: trimmed,
      codeSnippet: `// Processing: ${trimmed}\n// Language: auto-detected\nfunction executeAnalysis() {\n    return { status: "analyzed", prompt: "${trimmed}" };\n}`,
      explanation: `Analyzed query: "${trimmed}". Anuvaad translates complex computational intent into deterministic execution logic and plain English architecture notes.`,
      astNodes: [
        { type: "function_definition", label: "function executeAnalysis()", range: "L3-5", status: "contract_valid" }
      ],
      zdrDigest: "c893b827e8a937a6b8ef99e2f5b61b2a7593c6f4ef89679237691d17462bf456",
    };
    setTransitionKey(`custom-${Date.now()}`);
    setActivePreview(customPreset);
    onSelectPrompt?.(trimmed, "auto");
  };

  const activeCmd = CLI_TOOLCHAINS.find((t) => t.id === selectedToolchain)?.cmd || CLI_TOOLCHAINS[0].cmd;

  const handleCopyCmd = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(activeCmd);
      setCopiedToolchain(true);
      setTimeout(() => setCopiedToolchain(false), 2000);
    }
  };

  return (
    <section
      className={cn(
        "relative pt-24 sm:pt-28 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full",
        className
      )}
      aria-label="Hero Showcase"
    >
      {/* Dot grid background — developer aesthetic */}
      <div className="absolute inset-0 bg-dot-grid dot-grid-vignette pointer-events-none" aria-hidden="true" />

      {/* ── Architectural System Telemetry Header (Desktop) ──── */}
      <div className="hidden lg:flex items-center justify-between text-[11px] font-mono text-slate-500 border-b border-white/10 pb-3 mb-8">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="font-semibold">Anuvaad / code workspace</span>
          </span>
          <span className="text-slate-600">│</span>
          <span className="text-slate-400">Sample input · example output</span>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <span>Tree-sitter syntax tools</span>
          <span className="text-slate-600">│</span>
          <span className="text-amber-400/90 font-medium">Latency varies by request</span>
        </div>
      </div>

      {/* ── 2-Column Asymmetric Workbench Grid ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* Left Column: Manifesto, Hardware Telemetry & Command Bar */}
        <div className="lg:col-span-5 flex flex-col text-left">
          {/* Eyebrow pills */}
          <div
            className="flex flex-wrap items-center gap-2 mb-4"
            style={{ animation: "fade-down 0.4s cubic-bezier(0.16,1,0.3,1) 0.05s both" }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-slate-900 text-slate-200 border border-slate-800 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>Code Intelligence in Motion</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20 shadow-sm">
              <Zap className="h-3 w-3" aria-hidden="true" />
              <span>Free · ₹499/mo Pro</span>
            </div>
          </div>

          {/* Main Headline */}
          <h1 className="font-display text-4xl sm:text-5xl lg:text-5xl xl:text-6xl font-black tracking-tighter text-slate-900 dark:text-white leading-[1.08] mb-5 [text-wrap:balance]">
            <AnimatedHeadline>Your codebase speaks every language.</AnimatedHeadline>{" "}
            <span className="text-amber-500 block sm:inline">
              Does&nbsp;yours?
            </span>
          </h1>

          {/* Subtitle */}
          <p
            className="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed mb-6"
            style={{ animation: "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 450ms both" }}
          >
            Explore code explanations and translations with sample snippets, then open the workspace to try your own request.
          </p>

          {/* Hardware Telemetry Strip (Preserving tested badges) */}
          <div
            className="telemetry-strip mb-6"
            aria-label="Key Product Features"
          >
            <div className="telemetry-item">
              <Code className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
              <span className="text-slate-200 font-medium">35+ Languages</span>
            </div>
            <div className="telemetry-item">
              <span className="led-indicator led-amber" aria-hidden="true" />
            <span className="text-slate-200 font-medium">Latency varies by request</span>
            </div>
            <div className="telemetry-item">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
              <span className="text-slate-200 font-medium">Audit receipt on supported routes</span>
            </div>
          </div>

          {/* Tactile Keycap Prompt Deck */}
          <div
            className="w-full rounded-2xl obsidian-deck p-3.5 sm:p-4 mb-4 text-left border border-white/10"
            style={{ animation: "scale-in 0.4s cubic-bezier(0.16,1,0.3,1) 500ms both" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Terminal className="h-4 w-4 text-amber-500 shrink-0" aria-hidden="true" />
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCustomRun();
                  }
                }}
                placeholder="Paste code or describe a problem — Anuvaad figures out the rest"
                aria-label="Code problem prompt input"
                className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 outline-none font-mono"
              />
              <button
                onClick={handleCustomRun}
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-sm shrink-0 active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <span>Translate →</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Preset Buttons */}
            <div
              className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-2 border-t border-white/5 scrollbar-none"
              role="group"
              aria-label="Preset code prompts"
            >
              <span className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-wider shrink-0 mr-1">
                Presets:
              </span>
              {HERO_PROMPT_PRESETS.map((p, idx) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPreset(p, idx)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-xs font-mono whitespace-nowrap transition-all duration-200 border shrink-0 cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-amber-500",
                    selectedPresetIndex === idx
                      ? "bg-amber-500/10 border-amber-500/40 text-amber-400 font-semibold"
                      : "bg-slate-900 border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/10 hover:-translate-y-px hover:shadow-sm"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tabbed Developer Toolchain Bar */}
          <div className="w-full flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-xs font-mono">
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-400 font-sans mr-2">CLI:</span>
              {CLI_TOOLCHAINS.map((tool) => (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => setSelectedToolchain(tool.id)}
                  className={cn(
                    "px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer",
                    selectedToolchain === tool.id
                      ? "bg-slate-800 text-amber-400 font-bold border border-white/10"
                      : "text-slate-500 hover:text-slate-300"
                  )}
                >
                  {tool.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <code className="text-[11px] text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-white/5">
                {activeCmd}
              </code>
              <button
                type="button"
                onClick={handleCopyCmd}
                title="Copy install command"
                aria-label="Copy CLI install command"
                className="p-1 rounded text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-white/10 transition-colors cursor-pointer"
              >
                {copiedToolchain ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
              <kbd className="kbd-keycap hidden sm:inline-flex">⌘C</kbd>
            </div>
          </div>
        </div>

        {/* Right Column: Live Rosetta Studio & Tree-sitter AST Visualizer */}
        <div
          className="lg:col-span-7 w-full flex justify-center sticky top-24"
          style={{ animation: "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 550ms both" }}
        >
          <TerminalPreview preset={activePreview} transitionKey={transitionKey} />
        </div>
      </div>
    </section>
  );
}

export default HeroControlBar;

"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Code,
  Zap,
  ShieldCheck,
  Lock,
  Sparkles,
  ArrowRight,
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
  },
];

// Floating ambient particle
function AmbientParticle({
  dx,
  dy,
  size,
  delay,
  duration,
  x,
  y,
}: {
  dx: number;
  dy: number;
  size: number;
  delay: number;
  duration: number;
  x: string;
  y: string;
}) {
  return (
    <div
      aria-hidden="true"
      className="particle-amber pointer-events-none absolute rounded-full bg-amber-400/50"
      style={{
        width: size,
        height: size,
        left: x,
        top: y,
        "--dx": `${dx}px`,
        "--dy": `${dy}px`,
        "--duration": `${duration}s`,
        "--delay": `${delay}s`,
        animation: `hero-particle-drift ${duration}s ease-in-out ${delay}s infinite`,
      } as React.CSSProperties}
    />
  );
}

// Word-by-word animated headline
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

// Typewriter that reveals text character-by-character
function TypewriterText({
  text,
  triggerKey,
  speed = 18,
}: {
  text: string;
  triggerKey: string;
  speed?: number;
}) {
  const [displayed, setDisplayed] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const rafRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const tick = () => {
      if (i <= text.length) {
        setDisplayed(text.slice(0, i));
        i++;
        rafRef.current = setTimeout(tick, speed);
      }
    };
    const t = setTimeout(tick, 120); // Small lead-in delay
    return () => {
      clearTimeout(t);
      if (rafRef.current) clearTimeout(rafRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerKey]);

  // Cursor blink
  useEffect(() => {
    const id = setInterval(() => setShowCursor((v) => !v), 530);
    return () => clearInterval(id);
  }, []);

  return (
    <span>
      {displayed}
      <span
        className="inline-block w-[2px] h-[1em] bg-amber-400 ml-0.5 align-middle"
        style={{ opacity: showCursor ? 1 : 0, transition: "opacity 0.1s" }}
        aria-hidden="true"
      />
    </span>
  );
}

// Animated terminal preview with crossfade
function TerminalPreview({
  preset,
  transitionKey,
}: {
  preset: PromptPreset;
  transitionKey: string;
}) {
  const [visible, setVisible] = useState(true);
  const prevKey = useRef(transitionKey);

  useEffect(() => {
    if (transitionKey !== prevKey.current) {
      setVisible(false);
      const t = setTimeout(() => {
        setVisible(true);
        prevKey.current = transitionKey;
      }, 200);
      return () => clearTimeout(t);
    }
  }, [transitionKey]);

  return (
    <div
      className="w-full max-w-4xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-100 shadow-2xl overflow-hidden text-left font-mono text-xs"
      role="region"
      aria-label="Instant code comprehension preview"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(6px)",
        transition: "opacity 0.22s ease, transform 0.22s ease",
      }}
    >
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2">
          {/* macOS traffic lights */}
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors" />
            <div className="h-3 w-3 rounded-full bg-yellow-500/80 hover:bg-yellow-500 transition-colors" />
            <div className="h-3 w-3 rounded-full bg-green-500/80 hover:bg-green-500 transition-colors" />
          </div>
          <span className="ml-2 text-slate-400 font-sans text-xs">
            {preset.id}.{preset.language}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Zap className="h-3 w-3" />
            1.38s Inference
          </span>
          <span className="text-[10px] text-slate-500 hidden sm:inline">
            Zero Storage Verified
          </span>
        </div>
      </div>

      {/* Split Terminal Body */}
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800">
        {/* Code Input Pane */}
        <div className="p-4 bg-slate-950/60 overflow-x-auto">
          <p className="text-[10px] uppercase font-bold text-slate-500 mb-2 font-sans tracking-wider">
            Source Code ({preset.language.toUpperCase()})
          </p>
          <pre className="text-slate-300 leading-relaxed font-mono whitespace-pre-wrap text-[11px]">
            {preset.codeSnippet}
          </pre>
        </div>

        {/* Explanation Pane — typewriter */}
        <div className="p-4 bg-slate-900/40">
          <p className="text-[10px] uppercase font-bold text-amber-400 mb-2 font-sans tracking-wider">
            Plain-English Comprehension
          </p>
          <p className="text-slate-300 leading-relaxed font-sans text-xs sm:text-sm">
            <TypewriterText
              text={preset.explanation}
              triggerKey={transitionKey}
              speed={15}
            />
          </p>
        </div>
      </div>
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

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
    };
    setTransitionKey(`custom-${Date.now()}`);
    setActivePreview(customPreset);
    onSelectPrompt?.(trimmed, "auto");
  };

  return (
    <section
      className={cn(
        "relative pt-28 sm:pt-36 pb-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col items-center text-center overflow-hidden",
        className
      )}
      aria-label="Hero Showcase"
    >
      {/* ── Ambient floating particles ──────────────────────── */}
      {mounted && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <AmbientParticle x="15%" y="20%" dx={40} dy={-60} size={6} delay={0} duration={7} />
          <AmbientParticle x="80%" y="15%" dx={-30} dy={-50} size={4} delay={1.5} duration={9} />
          <AmbientParticle x="60%" y="70%" dx={25} dy={-40} size={5} delay={3} duration={8} />
          <AmbientParticle x="30%" y="60%" dx={-20} dy={-70} size={3} delay={0.8} duration={6} />
          <AmbientParticle x="90%" y="50%" dx={-40} dy={-30} size={7} delay={2.2} duration={10} />
        </div>
      )}

      {/* Soft amber aurora glow behind hero */}
      <div
        aria-hidden="true"
        className="radial-breathe pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,rgba(245,158,11,0.14),transparent_70%)]"
        style={{ animation: "radial-glow-breathe 5s ease-in-out infinite" }}
      />

      {/* ── Eyebrow pill ─────────────────────────────────────── */}
      <div
        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 mb-6 shadow-sm"
        style={{ animation: "fade-down 0.5s cubic-bezier(0.16,1,0.3,1) 0.1s both" }}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span>Code Intelligence in Motion</span>
      </div>

      {/* ── Main Headline — word-by-word reveal ──────────────── */}
      <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl leading-[1.1] mb-6">
        <AnimatedHeadline>Translate Code to English.</AnimatedHeadline>
        {" "}
        <span className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 bg-clip-text text-transparent">
          <span
            className="hero-word-reveal inline-block"
            style={{ animation: "word-reveal 0.65s cubic-bezier(0.16,1,0.3,1) 540ms both" }}
          >
            In&nbsp;Milliseconds.
          </span>
        </span>
      </h1>

      {/* ── Subtitle ─────────────────────────────────────────── */}
      <p
        className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed mb-8"
        style={{ animation: "fade-up 0.55s cubic-bezier(0.16,1,0.3,1) 600ms both" }}
      >
        Understand cryptic codebases instantly with bi-directional AI translation,
        simulated PR diffs, and verified zero-code-storage security.
      </p>

      {/* ── Feature badges — staggered entrance ──────────────── */}
      <div
        className="flex flex-wrap items-center justify-center gap-2.5 mb-10"
        aria-label="Key Product Features"
      >
        {[
          { icon: Code, text: "35+ Languages" },
          { icon: Zap, text: "<3s Latency" },
          { icon: ShieldCheck, text: "SOC2 Type II" },
          { icon: Lock, text: "Zero Code Storage" },
        ].map((b, i) => (
          <div
            key={b.text}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:border-amber-500/40 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-all duration-200"
            style={{ animation: `fade-up 0.5s cubic-bezier(0.16,1,0.3,1) ${680 + i * 70}ms both` }}
          >
            <b.icon className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
            <span>{b.text}</span>
          </div>
        ))}
      </div>

      {/* ── Interactive Command Bar ───────────────────────────── */}
      <div
        className="w-full max-w-3xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.4)] p-3 sm:p-4 mb-8 text-left"
        style={{ animation: "scale-in 0.55s cubic-bezier(0.16,1,0.3,1) 800ms both" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-amber-500 shrink-0" aria-hidden="true" />
          <input
            type="text"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); handleCustomRun(); }
            }}
            placeholder="Describe a code problem, paste a snippet, or choose a preset..."
            aria-label="Code problem prompt input"
            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
          />
          <button
            onClick={handleCustomRun}
            type="button"
            className="cta-btn-glow inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-all shadow-sm shrink-0 active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 hover:scale-105"
            style={{ animation: "cta-glow-breathe 3s ease-in-out 2s infinite" }}
          >
            <span>Run Prompt</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Preset Pills */}
        <div
          className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none border-t border-slate-100 dark:border-slate-800"
          role="group"
          aria-label="Preset code prompts"
        >
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0 mr-1">
            Presets:
          </span>
          {HERO_PROMPT_PRESETS.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelectPreset(p, idx)}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 border shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500",
                selectedPresetIndex === idx
                  ? "bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400 font-semibold scale-[1.03] shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:scale-[1.02]"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Animated terminal preview ─────────────────────────── */}
      <div style={{ animation: "fade-up 0.6s cubic-bezier(0.16,1,0.3,1) 950ms both" }}>
        <TerminalPreview preset={activePreview} transitionKey={transitionKey} />
      </div>
    </section>
  );
}

export default HeroControlBar;

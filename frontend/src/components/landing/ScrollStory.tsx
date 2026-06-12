"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";
import { RefreshCw, Zap, Sparkles } from "lucide-react";

const steps = [
  {
    scene: "The Abyss",
    title: "The code was never\nthe problem.",
    subtitle: "The language was.",
    narration:
      "Day one at Helix Corp. Riya opened the legacy repository. 40,000 lines. No comments. No docs. Just code — ancient, dense, and completely foreign.",
  },
  {
    scene: "The Weight",
    title: "She scrolled.\nAnd scrolled.",
    subtitle: "Each function a riddle.",
    narration:
      "She scrolled. And scrolled. Each function a riddle. Each class a locked room. Four hours in, she had touched nothing, changed nothing, understood nothing.",
  },
  {
    scene: "The First Translation",
    title: "And then Anuvaad spoke.",
    subtitle: "Not in code. In language.",
    narration:
      "And then Anuvaad spoke. Not in code. In language. Riya read it — once, twice. The fog lifted. She finally saw not just what the code did, but why it existed.",
  },
  {
    scene: "The Ripple",
    title: "Understanding one function\nchanged everything.",
    subtitle: "Code became a conversation across time.",
    narration:
      "Understanding one function changed everything. She began to see the patterns. The intentions. The decisions made by engineers she'd never meet. Code became a conversation across time.",
  },
  {
    scene: "The Build",
    title: "Three modules refactored.\nTwo services written.",
    subtitle: "Not by memorizing — by understanding.",
    narration:
      "By week's end, Riya had refactored three modules, written two new services, and taught the entire team how to read the legacy codebase. Not by memorizing it — by understanding it.",
  },
  {
    scene: "The Translator",
    title: "Code is language.",
    subtitle: "Anuvaad speaks both.",
    narration:
      "Stop struggling with legacy code. Translate any codebase to plain English or any language, instantly. This is not a tool. This is a new way to read code.",
  },
];

export function ScrollStory() {
  const containerRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    if (!containerRef.current || !pinnedRef.current) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: "+=500%",
        scrub: 0.5,
        pin: pinnedRef.current,
        anticipatePin: 1,
        onUpdate: (self) => {
          setProgress(self.progress);
          const stepIndex = Math.min(
            Math.floor(self.progress * steps.length),
            steps.length - 1
          );
          setActiveStep(stepIndex);
        },
      },
    });

    // ── STEP 1 ──
    tl.fromTo(".seeker-entity", { x: -60, opacity: 0 }, { x: 0, opacity: 1, duration: 1 }, 0);
    tl.fromTo(".code-chaos", { scale: 0.85, opacity: 0, filter: "blur(10px)" }, { scale: 1, opacity: 1, filter: "blur(0px)", duration: 1 }, 0);
    tl.fromTo(".guide-line", { strokeDashoffset: 600, opacity: 0 }, { strokeDashoffset: 350, opacity: 0.3, duration: 1 }, 0);

    // ── STEP 2 ──
    tl.to(".guide-line", { strokeDashoffset: 0, opacity: 1, duration: 1 }, 1);
    tl.to(".code-chaos", { opacity: 0, scale: 0.9, y: -30, filter: "blur(10px)", duration: 0.8 }, 1.2);
    tl.fromTo(".code-blocks-container", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1 }, 1.3);
    tl.fromTo(".code-block-1", { y: 20 }, { y: 0, duration: 0.8 }, 1.4);
    tl.fromTo(".code-block-2", { y: 40 }, { y: 0, duration: 0.8 }, 1.5);
    tl.fromTo(".code-block-3", { y: 60 }, { y: 0, duration: 0.8 }, 1.6);

    // ── STEP 3 ──
    tl.to(".code-blocks-container", { x: -60, duration: 1 }, 2);
    tl.fromTo(".explanations-container", { opacity: 0, x: 60 }, { opacity: 1, x: 0, duration: 1 }, 2);
    tl.fromTo(".english-exp-1", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6 }, 2.2);
    tl.fromTo(".english-exp-2", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6 }, 2.4);
    tl.fromTo(".english-exp-3", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6 }, 2.6);

    // ── STEP 4 ──
    tl.to([".code-blocks-container", ".explanations-container", ".guide-line"], { opacity: 0, scale: 0.92, duration: 0.8 }, 3);
    tl.fromTo(".sync-editor-pane", { opacity: 0, y: 40, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 1 }, 3.2);
    tl.fromTo(".sync-editor-text", { clipPath: "polygon(0 0, 0 0, 0 100%, 0% 100%)" }, { clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)", duration: 1.2 }, 3.5);
    tl.fromTo(".code-update-highlight", { borderColor: "rgba(245,158,11,0.1)", backgroundColor: "rgba(245,158,11,0)" }, { borderColor: "rgba(245,158,11,0.5)", backgroundColor: "rgba(245,158,11,0.08)", duration: 0.6 }, 4.3);
    tl.to(".code-val-old", { opacity: 0, duration: 0.4 }, 4.5);
    tl.to(".code-val-new", { opacity: 1, duration: 0.4 }, 4.5);
    tl.to(".code-update-highlight", { borderColor: "rgba(245,158,11,0.1)", backgroundColor: "rgba(245,158,11,0)", duration: 0.6 }, 4.9);

    // ── STEP 5 ──
    tl.to(".sync-editor-pane", { opacity: 0, scale: 0.92, y: -25, duration: 0.8 }, 5);
    tl.fromTo(".cross-lang-pane", { opacity: 0, y: 40, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 1 }, 5.2);
    tl.fromTo(".lang-bridge-arrow", { rotation: 0, scale: 1 }, { rotation: 180, scale: 1.25, duration: 1, ease: "back.out(1.5)" }, 5.5);
    tl.fromTo(".js-output-block", { x: 50, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8 }, 5.8);

    // ── STEP 6 ──
    tl.to(".cross-lang-pane", { opacity: 0, scale: 0.92, y: -25, duration: 0.8 }, 6.2);
    tl.to(".seeker-entity", { opacity: 0, scale: 0.9, duration: 0.8 }, 6.2);
    tl.fromTo(".workspace-settle-pane", { opacity: 0, y: 40, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 1 }, 6.5);
    tl.fromTo(".workspace-settle-pulse", { scale: 0.9, opacity: 0.5 }, { scale: 1.05, opacity: 0, duration: 1.5, repeat: -1 }, 6.8);

    return () => {
      tl.scrollTrigger?.kill();
    };
  }, []);

  const stepLocalProgress = Math.min(1, Math.max(0, progress * steps.length - activeStep));
  const narrationWords = steps[activeStep].narration.split(" ");
  const revealProgress = Math.min(1, Math.max(0, (stepLocalProgress - 0.1) / 0.75));
  const visibleWordCount = Math.ceil(revealProgress * narrationWords.length);

  return (
    <div ref={containerRef} className="relative w-full h-[600vh] bg-transparent">
      <div
        ref={pinnedRef}
        className="w-full h-screen overflow-hidden flex flex-col justify-center items-center relative z-20"
      >
        {/* Subtle radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(245,158,11,0.04),rgba(255,255,255,0))]" />

        {/* Amber progress bar */}
        <div className="absolute top-24 left-0 w-full h-[2px] bg-white/5 z-30">
          <div
            className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-300 shadow-[0_0_10px_rgba(245,158,11,0.6)] transition-all duration-75"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        <div className="container mx-auto px-6 h-full flex flex-col justify-between py-24 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center my-auto w-full">

            {/* ── LEFT: Scene Header + Narration ── */}
            <div className="lg:col-span-5 flex flex-col justify-center space-y-6 text-left">
              {/* Scene indicator */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] tracking-widest font-extrabold text-amber-400 uppercase bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full shadow-[0_0_12px_rgba(245,158,11,0.15)]">
                  {steps[activeStep].scene}
                </span>
                <span className="text-xs text-white/40 font-mono">
                  0{activeStep + 1} / 0{steps.length}
                </span>
              </div>

              {/* Scene Title */}
              <div className="space-y-2">
                <h2
                  className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight min-h-[100px] lg:min-h-[130px] transition-all duration-500"
                  style={{ fontFamily: "var(--font-lora, Georgia, serif)" }}
                >
                  {steps[activeStep].title.split("\n").map((line, i) => (
                    <span
                      key={i}
                      className={cn(
                        "block",
                        i === 0
                          ? "bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent"
                          : "bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent mt-1"
                      )}
                    >
                      {line}
                    </span>
                  ))}
                </h2>
                <p className="text-sm font-medium text-amber-400/60 tracking-wide">
                  {steps[activeStep].subtitle}
                </p>
              </div>

              {/* Riya Narration — Lora italic, word-by-word reveal */}
              <div className="relative min-h-[100px]">
                <span
                  className="absolute -top-3 -left-1 text-4xl text-amber-500/20 select-none leading-none"
                  aria-hidden="true"
                  style={{ fontFamily: "var(--font-lora, Georgia, serif)" }}
                >
                  &ldquo;
                </span>
                <p
                  className="text-base leading-[1.85] pl-3"
                  style={{ fontFamily: "var(--font-lora, Georgia, serif)", fontStyle: "italic" }}
                >
                  {narrationWords.map((word, i) => (
                    <span
                      key={`${activeStep}-${i}`}
                      className="transition-all duration-200"
                      style={{
                        color: i < visibleWordCount ? "rgba(226,232,240,0.9)" : "rgba(100,116,139,0.3)",
                        opacity: i < visibleWordCount ? 1 : 0.3,
                        filter:
                          i === visibleWordCount - 1 && visibleWordCount < narrationWords.length
                            ? "drop-shadow(0 0 6px rgba(245,158,11,0.5))"
                            : "none",
                      }}
                    >
                      {word}
                      {i < narrationWords.length - 1 ? " " : ""}
                    </span>
                  ))}
                </p>
              </div>
            </div>

            {/* ── RIGHT: Visual Metaphor Canvas ── */}
            <div className="lg:col-span-7 flex justify-center items-center relative w-full h-[400px] lg:h-[500px]">
              <div className="absolute inset-0 bg-radial-gradient from-amber-500/5 via-transparent to-transparent blur-3xl -z-10" />

              {/* Glassmorphism IDE card */}
              <div className="glass-amber relative w-full h-full max-w-[550px] rounded-2xl p-6 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col justify-between">
                {/* Mock IDE Header */}
                <div className="flex items-center justify-between border-b border-amber-500/10 pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500/30 border border-red-500/50" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500/30 border border-yellow-500/50" />
                    <div className="h-3 w-3 rounded-full bg-green-500/30 border border-green-500/50" />
                  </div>
                  <div className="rounded-md bg-amber-500/5 px-3 py-1 text-[10px] font-semibold text-amber-400/50 flex items-center gap-1.5 border border-amber-500/10 font-mono opacity-0" />
                </div>

                {/* VISUAL METAPHOR CANVAS */}
                <div className="relative flex-1 w-full flex items-center justify-center">
                  {/* SVG gradient defs */}
                  <svg className="absolute w-0 h-0">
                    <defs>
                      <linearGradient id="seeker-grad-amber" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#d97706" />
                      </linearGradient>
                      <linearGradient id="guide-grad-amber" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="50%" stopColor="#fcd34d" />
                        <stop offset="100%" stopColor="#d97706" />
                      </linearGradient>
                    </defs>
                  </svg>

                  {/* Seeker entity — amber rings */}
                  <div
                    className="seeker-entity absolute left-2 top-1/2 -translate-y-1/2 w-24 h-24 flex items-center justify-center opacity-0"
                    style={{ zIndex: 15 }}
                  >
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="38" fill="none" stroke="url(#seeker-grad-amber)" strokeWidth="1.5" strokeDasharray="4 4" className="origin-center" style={{ animation: "spin 15s linear infinite" }} />
                      <circle cx="50" cy="50" r="28" fill="none" stroke="rgba(245,158,11,0.2)" strokeWidth="1" />
                      <circle cx="50" cy="50" r="16" fill="rgba(245,158,11,0.08)" />
                      <circle cx="50" cy="50" r="6" fill="#f59e0b" className="animate-pulse" />
                      <circle cx="50" cy="50" r="20" fill="none" stroke="#fcd34d" strokeWidth="1" className="origin-center" style={{ animation: "ping 2s cubic-bezier(0, 0, 0.2, 1) infinite" }} />
                    </svg>
                    <span className="absolute -bottom-2 text-[8px] font-bold text-amber-400 tracking-wider uppercase font-mono bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                      Seeker
                    </span>
                  </div>

                  {/* Guide pathway — amber gradient */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 500 300" style={{ zIndex: 12 }}>
                    <path
                      d="M 90 150 C 185 150, 155 50, 260 50 C 365 50, 315 230, 420 230"
                      fill="none"
                      stroke="url(#guide-grad-amber)"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      className="guide-line opacity-0"
                      style={{ strokeDasharray: 600, strokeDashoffset: 600 }}
                    />
                  </svg>

                  {/* Code chaos */}
                  <div className="code-chaos absolute w-full max-w-[340px] right-2 font-mono text-[10px] leading-relaxed text-amber-300/30 bg-amber-950/10 border border-amber-500/10 p-4 rounded-lg select-none opacity-0" style={{ zIndex: 10 }}>
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-amber-500/5 to-transparent animate-pulse" />
                    <p className="text-red-400/50 font-bold">{"// TANGLED ABSTRACT NOISE"}</p>
                    <p>def _process(d, *args, **kwargs):</p>
                    <p className="pl-4">if not d or not isinstance(d, dict): return None</p>
                    <p className="pl-4">{"r = {k.upper(): v for k, v in d.items()}"}</p>
                    <p className="pl-4">x = [x for x in r.values() if isinstance(x, int)]</p>
                    <p className="pl-4">return lambda z: [y * z for y in x]</p>
                  </div>

                  {/* Code blocks */}
                  <div className="code-blocks-container absolute left-20 w-[180px] space-y-3 opacity-0" style={{ zIndex: 10 }}>
                    <div className="code-block-1 border border-amber-500/20 bg-amber-500/5 p-2.5 rounded-lg shadow-md backdrop-blur-sm">
                      <div className="text-[9px] font-mono text-amber-300">
                        if not d or not isinstance(d, dict):<br />
                        &nbsp;&nbsp;return None
                      </div>
                    </div>
                    <div className="code-block-2 border border-yellow-500/20 bg-yellow-500/5 p-2.5 rounded-lg shadow-md backdrop-blur-sm">
                      <div className="text-[9px] font-mono text-yellow-300">
                        r = {"{k: v for k, v in d}"}
                        <br />x = [v for v in r.values()]
                      </div>
                    </div>
                    <div className="code-block-3 border border-orange-500/20 bg-orange-500/5 p-2.5 rounded-lg shadow-md backdrop-blur-sm">
                      <div className="text-[9px] font-mono text-orange-300">
                        return lambda z: [y * z]
                      </div>
                    </div>
                  </div>

                  {/* Explanations */}
                  <div className="explanations-container absolute right-2 w-[200px] space-y-3 opacity-0" style={{ zIndex: 10 }}>
                    {["Validates input structure and returns fallback if invalid.", "Extracts values from the dictionary elements.", "Returns a functional multiplier list lambda."].map((text, i) => (
                      <div key={i} className={`english-exp-${i + 1} border border-amber-500/15 bg-amber-500/5 p-2.5 rounded-lg shadow-md text-[9px] text-amber-200 backdrop-blur-sm`}>
                        <div className="font-bold text-[8px] text-amber-400 uppercase tracking-wider mb-0.5">Translation</div>
                        {text}
                      </div>
                    ))}
                  </div>

                  {/* Sync editor pane */}
                  <div className="sync-editor-pane absolute w-full max-w-[420px] bg-slate-900/80 border border-amber-500/20 p-4 rounded-xl shadow-lg opacity-0 flex flex-col space-y-3" style={{ zIndex: 10 }}>
                    <div className="flex items-center justify-between text-[9px] font-semibold text-amber-400">
                      <span className="flex items-center gap-1 font-mono">EDITING TRANSLATION</span>
                      <span className="flex items-center gap-1 font-mono">
                        <RefreshCw className="h-3 w-3 animate-spin text-amber-400" />
                        SYNC ACTIVE
                      </span>
                    </div>
                    <div className="bg-slate-950 border border-white/5 p-2.5 rounded text-[10px] text-slate-300 font-mono min-h-[44px]">
                      <span className="sync-editor-text block">
                        Checks if input is a dict. Return{" "}
                        <span className="underline decoration-amber-500 text-amber-300 font-bold bg-amber-500/10 px-1 rounded animate-pulse">an empty dict</span>
                        {" "}if invalid.
                        <span className="inline-block w-1.5 h-3.5 bg-amber-500 ml-0.5 animate-pulse" />
                      </span>
                    </div>
                    <div className="text-[8px] text-slate-500 font-mono">{"// AUTO-GENERATED CODE UPDATE:"}</div>
                    <div className="bg-slate-950/80 border border-amber-500/15 p-2.5 rounded font-mono text-[10px] text-amber-300 code-update-highlight transition-all duration-500">
                      if not d or not isinstance(d, dict):<br />
                      &nbsp;&nbsp;return{" "}
                      <span className="relative inline-block w-10 h-4">
                        <span className="code-val-old absolute inset-0 text-red-400 font-bold">None</span>
                        <span className="code-val-new absolute inset-0 text-amber-400 font-bold opacity-0">{"{}"}</span>
                      </span>
                    </div>
                  </div>

                  {/* Cross-language pane */}
                  <div className="cross-lang-pane absolute w-full max-w-[420px] opacity-0 flex flex-col space-y-4" style={{ zIndex: 10 }}>
                    <div className="flex items-center justify-center gap-6">
                      <div className="bg-amber-600/90 text-[#020204] font-mono text-xs font-bold px-3 py-1.5 rounded-md border border-amber-400 shadow-md">Python</div>
                      <div className="h-[2px] flex-1 bg-gradient-to-r from-amber-500 to-yellow-400 relative">
                        <Zap className="h-4 w-4 text-amber-400 absolute -top-2 left-1/2 -translate-x-1/2 lang-bridge-arrow" />
                      </div>
                      <div className="bg-yellow-600/90 text-[#020204] font-mono text-xs font-bold px-3 py-1.5 rounded-md border border-yellow-400 shadow-md">JavaScript</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-900/80 border border-amber-500/10 p-3 rounded-lg font-mono text-[9px] text-amber-300/80">
                        <p className="text-slate-500 font-semibold mb-1"># PYTHON</p>
                        def add(a, b):<br />&nbsp;&nbsp;return a + b
                      </div>
                      <div className="js-output-block bg-slate-900/80 border border-yellow-500/10 p-3 rounded-lg font-mono text-[9px] text-yellow-300 opacity-0">
                        <p className="text-slate-500 font-semibold mb-1">{"// JAVASCRIPT"}</p>
                        function add(a, b) {"{"}<br />&nbsp;&nbsp;return a + b;<br />{"}"} 
                      </div>
                    </div>
                  </div>

                  {/* Workspace success pane */}
                  <div className="workspace-settle-pane absolute w-full max-w-[440px] border border-amber-500/25 bg-amber-500/5 p-5 rounded-2xl flex flex-col space-y-3 shadow-[0_0_30px_rgba(245,158,11,0.15)] opacity-0 relative overflow-hidden" style={{ zIndex: 10 }}>
                    <div className="workspace-settle-pulse absolute inset-0 border border-amber-500/40 rounded-2xl pointer-events-none" />
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-amber-400" />
                      <h3 className="font-semibold text-white font-sans">Anuvaad Workspace Ready</h3>
                    </div>
                    <p className="text-xs text-slate-400 font-sans leading-relaxed">
                      Interactive code translating, two-way sync documentation, and cross-language compatibility inside a minimal, high-performance interface.
                    </p>
                    <div className="flex gap-4 pt-2">
                      <div className="text-[10px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded font-sans">Stable Build</div>
                      <div className="text-[10px] font-bold text-slate-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded font-sans">Free Tier Enabled</div>
                    </div>
                  </div>
                </div>

                {/* IDE Footer */}
                <div className="border-t border-amber-500/10 pt-3 flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <div className="flex items-center gap-2" />
                  <span>UTF-8</span>
                </div>
              </div>
            </div>
          </div>

          {/* Chapter navigator dots */}
          <div className="flex justify-center gap-2 lg:gap-3 z-30">
            {steps.map((step, i) => (
              <div
                key={i}
                title={step.scene}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-500",
                  activeStep === i
                    ? "w-8 bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.7)]"
                    : "w-2 bg-white/15"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";
import { Code, RefreshCw, Sparkles, User, Zap } from "lucide-react";

export function ScrollStory() {
  const containerRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [progress, setProgress] = useState(0);

  const steps = [
    {
      title: "The code was never the problem.",
      subtitle: "The language was.",
      description: "Codebases arrive as walls of syntax. Dense. Unforgiving. Obscure.",
      copy: "The code was never the problem. The language was.",
    },
    {
      title: "One block at a time,",
      subtitle: "the meaning appears.",
      description: "Anuvaad splits the wall into logical blocks, mapping structure to intent.",
      copy: "One block at a time, the meaning appears.",
    },
    {
      title: "Clarity on demand.",
      subtitle: "From syntax to structure.",
      description: "Each code block is paired with a clear, concise plain-English explanation.",
      copy: "What looked like syntax becomes structure. What looked like structure becomes meaning.",
    },
    {
      title: "Change the explanation.",
      subtitle: "Change the code.",
      description: "Two-way synchronization allows you to edit the explanation to automatically refactor the code.",
      copy: "Change the explanation. Change the code.",
    },
    {
      title: "Not just one language.",
      subtitle: "Not just one direction.",
      description: "Translate from Python to JavaScript, Go, or Rust seamlessly with a click.",
      copy: "Not just one language. Not just one direction.",
    },
    {
      title: "This is not a one-time answer.",
      subtitle: "It is a workspace.",
      description: "A stable, persistent environment designed for launch survival and long-term exploration.",
      copy: "This is not a one-time answer. It is a workspace.",
    },
  ];

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    if (!containerRef.current || !pinnedRef.current) return;

    // Create a smooth, scrubbed GSAP timeline that coordinates all character movements and frame animations
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: "+=500%", // 500vh scroll depth
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

    // Configure timeline duration to match steps (6 units total)
    // ── STEP 1: Seeker and Code Chaos Wall appear (0 to 1) ──
    tl.fromTo(".seeker-entity", { x: -60, opacity: 0 }, { x: 0, opacity: 1, duration: 1 }, 0);
    tl.fromTo(".code-chaos", { scale: 0.85, opacity: 0, filter: "blur(10px)" }, { scale: 1, opacity: 1, filter: "blur(0px)", duration: 1 }, 0);
    tl.fromTo(".guide-line", { strokeDashoffset: 600, opacity: 0 }, { strokeDashoffset: 350, opacity: 0.3, duration: 1 }, 0);

    // ── STEP 2: The Guide draws itself, splits the Chaos Wall (1 to 2) ──
    tl.to(".guide-line", { strokeDashoffset: 0, opacity: 1, duration: 1 }, 1);
    tl.to(".code-chaos", { opacity: 0, scale: 0.9, y: -30, filter: "blur(10px)", duration: 0.8 }, 1.2);
    tl.fromTo(".code-blocks-container", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1 }, 1.3);
    
    // Spread out blocks
    tl.fromTo(".code-block-1", { y: 20 }, { y: 0, duration: 0.8 }, 1.4);
    tl.fromTo(".code-block-2", { y: 40 }, { y: 0, duration: 0.8 }, 1.5);
    tl.fromTo(".code-block-3", { y: 60 }, { y: 0, duration: 0.8 }, 1.6);

    // ── STEP 3: Explanations slide in (2 to 3) ──
    tl.to(".code-blocks-container", { x: -60, duration: 1 }, 2);
    tl.fromTo(".explanations-container", { opacity: 0, x: 60 }, { opacity: 1, x: 0, duration: 1 }, 2);
    tl.fromTo(".english-exp-1", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6 }, 2.2);
    tl.fromTo(".english-exp-2", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6 }, 2.4);
    tl.fromTo(".english-exp-3", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6 }, 2.6);

    // ── STEP 4: Two-Way Sync Editor Mock and typing (3 to 4) ──
    tl.to([".code-blocks-container", ".explanations-container", ".guide-line"], { opacity: 0, scale: 0.92, duration: 0.8 }, 3);
    tl.fromTo(".sync-editor-pane", { opacity: 0, y: 40, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 1 }, 3.2);
    
    // Typewriter clip reveal
    tl.fromTo(".sync-editor-text", { clipPath: "polygon(0 0, 0 0, 0 100%, 0% 100%)" }, { clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)", duration: 1.2 }, 3.5);
    // Code update refactor transition
    tl.fromTo(".code-update-highlight", { borderColor: "rgba(99,102,241,0.15)", backgroundColor: "rgba(99,102,241,0)" }, { borderColor: "rgba(245,158,11,0.5)", backgroundColor: "rgba(245,158,11,0.08)", duration: 0.6 }, 4.3);
    tl.to(".code-val-old", { opacity: 0, duration: 0.4 }, 4.5);
    tl.to(".code-val-new", { opacity: 1, duration: 0.4 }, 4.5);
    tl.to(".code-update-highlight", { borderColor: "rgba(99,102,241,0.15)", backgroundColor: "rgba(99,102,241,0)", duration: 0.6 }, 4.9);

    // ── STEP 5: Cross-Language Translation (4 to 5) ──
    tl.to(".sync-editor-pane", { opacity: 0, scale: 0.92, y: -25, duration: 0.8 }, 5);
    tl.fromTo(".cross-lang-pane", { opacity: 0, y: 40, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 1 }, 5.2);
    tl.fromTo(".lang-bridge-arrow", { rotation: 0, scale: 1 }, { rotation: 180, scale: 1.25, duration: 1, ease: "back.out(1.5)" }, 5.5);
    tl.fromTo(".js-output-block", { x: 50, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8 }, 5.8);

    // ── STEP 6: Workspace Settle (5 to 6) ──
    tl.to(".cross-lang-pane", { opacity: 0, scale: 0.92, y: -25, duration: 0.8 }, 6.2);
    tl.to(".seeker-entity", { opacity: 0, scale: 0.9, duration: 0.8 }, 6.2);
    tl.fromTo(".workspace-settle-pane", { opacity: 0, y: 40, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 1 }, 6.5);
    tl.fromTo(".workspace-settle-pulse", { scale: 0.9, opacity: 0.5 }, { scale: 1.05, opacity: 0, duration: 1.5, repeat: -1 }, 6.8);

    return () => {
      tl.scrollTrigger?.kill();
    };
  }, [steps.length]);

  return (
    <div ref={containerRef} className="relative w-full h-[600vh] bg-transparent">
      {/* Pinned full-screen viewport */}
      <div
        ref={pinnedRef}
        className="w-full h-screen overflow-hidden flex flex-col justify-center items-center relative z-20"
      >
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.05),rgba(255,255,255,0))]" />
        
        {/* Progress indicator at the top */}
        <div className="absolute top-24 left-0 w-full h-[2px] bg-white/5 z-30">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_10px_rgba(168,85,247,0.5)] transition-all duration-75"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        <div className="container mx-auto px-6 h-full flex flex-col justify-between py-24 relative z-10">
          {/* Main Story Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center my-auto w-full">
            
            {/* Left Column: Narrative Copy */}
            <div className="lg:col-span-5 flex flex-col justify-center space-y-6 text-left">
              {/* Step indicator */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] tracking-widest font-extrabold text-indigo-400 uppercase bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full shadow-[0_0_12px_rgba(99,102,241,0.15)]">
                  Chapter 02 : Translation Story
                </span>
                <span className="text-xs text-white/40 font-mono">
                  0{activeStep + 1} / 0{steps.length}
                </span>
              </div>

              {/* Animated Text Content */}
              <div className="space-y-4">
                <h3 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight min-h-[120px] lg:min-h-[150px] transition-all duration-500">
                  <span className="bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent block">
                    {steps[activeStep].title}
                  </span>
                  <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent block mt-1">
                    {steps[activeStep].subtitle}
                  </span>
                </h3>
                
                <p className="text-base text-slate-400 max-w-md leading-relaxed min-h-[80px]">
                  {steps[activeStep].description}
                </p>
              </div>

              {/* On-screen cinematic subtitle strip */}
              <div className="pt-4 border-t border-white/5 flex items-center gap-3">
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                <span className="text-xs font-medium tracking-wide text-indigo-300/80 italic">
                  &ldquo;{steps[activeStep].copy}&rdquo;
                </span>
              </div>
            </div>

            {/* Right Column: Visual Metaphor Canvas */}
            <div className="lg:col-span-7 flex justify-center items-center relative w-full h-[400px] lg:h-[500px]">
              
              {/* Backdrop glow filter */}
              <div className="absolute inset-0 bg-radial-gradient from-indigo-500/10 via-transparent to-transparent blur-3xl -z-10" />

              {/* Pinned container wrapper */}
              <div className="relative w-full h-full max-w-[550px] border border-white/5 bg-slate-950/40 backdrop-blur-xl rounded-2xl p-6 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col justify-between">
                
                {/* Mock IDE Header */}
                <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500/30 border border-red-500/50" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500/30 border border-yellow-500/50" />
                    <div className="h-3 w-3 rounded-full bg-green-500/30 border border-green-500/50" />
                  </div>
                  <div className="rounded-md bg-white/5 px-3 py-1 text-[10px] font-semibold text-slate-400 flex items-center gap-1.5 border border-white/5 font-mono">
                    <Code className="h-3 w-3 text-indigo-400" />
                    anuvaad_workspace.py
                  </div>
                  <div className="w-12" />
                </div>

                {/* VISUAL METAPHOR CONTENT CANVAS */}
                <div className="relative flex-1 w-full flex items-center justify-center">

                  {/* SVG Definitions for Gradients */}
                  <svg className="absolute w-0 h-0">
                    <defs>
                      <linearGradient id="seeker-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#818cf8" />
                        <stop offset="100%" stopColor="#6366f1" />
                      </linearGradient>
                      <linearGradient id="guide-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="50%" stopColor="#a855f7" />
                        <stop offset="100%" stopColor="#ec4899" />
                      </linearGradient>
                    </defs>
                  </svg>

                  {/* ── THE SEEKER FORCE (Left Side) ── */}
                  <div 
                    className="seeker-entity absolute left-2 top-1/2 -translate-y-1/2 w-24 h-24 flex items-center justify-center opacity-0"
                    style={{ zIndex: 15 }}
                  >
                    <svg className="w-full h-full" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="38" fill="none" stroke="url(#seeker-grad)" strokeWidth="1.5" strokeDasharray="4 4" className="origin-center" style={{ animation: "spin 15s linear infinite" }} />
                      <circle cx="50" cy="50" r="28" fill="none" stroke="rgba(99,102,241,0.2)" strokeWidth="1" />
                      <circle cx="50" cy="50" r="16" fill="rgba(99,102,241,0.1)" />
                      <circle cx="50" cy="50" r="6" fill="#6366f1" className="animate-pulse" />
                      <circle cx="50" cy="50" r="20" fill="none" stroke="#818cf8" strokeWidth="1" className="origin-center" style={{ animation: "ping 2s cubic-bezier(0, 0, 0.2, 1) infinite" }} />
                    </svg>
                    <span className="absolute -bottom-2 text-[8px] font-bold text-indigo-400 tracking-wider uppercase font-mono bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded">
                      Seeker
                    </span>
                  </div>

                  {/* ── THE GUIDE PATHWAY ── */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 500 300" style={{ zIndex: 12 }}>
                    <path
                      d="M 90 150 C 185 150, 155 50, 260 50 C 365 50, 315 230, 420 230"
                      fill="none"
                      stroke="url(#guide-grad)"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      className="guide-line opacity-0"
                      style={{ strokeDasharray: 600, strokeDashoffset: 600 }}
                    />
                  </svg>

                  {/* ── LAYER 1: Code Chaos (Abstract syntax noise) ── */}
                  <div className="code-chaos absolute w-full max-w-[340px] right-2 font-mono text-[10px] leading-relaxed text-indigo-300/40 bg-indigo-950/10 border border-indigo-500/10 p-4 rounded-lg select-none opacity-0" style={{ zIndex: 10 }}>
                    <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-indigo-500/5 to-transparent animate-pulse" />
                    <p className="text-red-400/60 font-bold">{"// TANGLED ABSTRACT NOISE"}</p>
                    <p>def _process(d, *args, **kwargs):</p>
                    <p className="pl-4">if not d or not isinstance(d, dict): return None</p>
                    <p className="pl-4">{"r = {k.upper(): v for k, v in d.items()}"}</p>
                    <p className="pl-4">x = [x for x in r.values() if isinstance(x, int)]</p>
                    <p className="pl-4">return lambda z: [y * z for y in x]</p>
                  </div>

                  {/* ── LAYER 2: Code Blocks (Left column of split) ── */}
                  <div className="code-blocks-container absolute left-20 w-[180px] space-y-3 opacity-0" style={{ zIndex: 10 }}>
                    <div className="code-block-1 border border-indigo-500/20 bg-indigo-500/5 p-2.5 rounded-lg shadow-md backdrop-blur-sm">
                      <div className="text-[9px] font-mono text-indigo-300">
                        if not d or not isinstance(d, dict):
                        <br />
                        &nbsp;&nbsp;return None
                      </div>
                    </div>
                    <div className="code-block-2 border border-purple-500/20 bg-purple-500/5 p-2.5 rounded-lg shadow-md backdrop-blur-sm">
                      <div className="text-[9px] font-mono text-purple-300">
                        r = {"{k: v for k, v in d}"}
                        <br />
                        x = [v for v in r.values()]
                      </div>
                    </div>
                    <div className="code-block-3 border border-pink-500/20 bg-pink-500/5 p-2.5 rounded-lg shadow-md backdrop-blur-sm">
                      <div className="text-[9px] font-mono text-pink-300">
                        return lambda z: [y * z]
                      </div>
                    </div>
                  </div>

                  {/* ── LAYER 3: Explanations (Right column of split) ── */}
                  <div className="explanations-container absolute right-2 w-[200px] space-y-3 opacity-0" style={{ zIndex: 10 }}>
                    <div className="english-exp-1 border border-emerald-500/20 bg-emerald-500/5 p-2.5 rounded-lg shadow-md text-[9px] text-emerald-300 backdrop-blur-sm">
                      <div className="font-bold text-[8px] text-emerald-400 uppercase tracking-wider mb-0.5">Guide Analysis</div>
                      Validates input structure and returns fallback if invalid.
                    </div>
                    <div className="english-exp-2 border border-emerald-500/20 bg-emerald-500/5 p-2.5 rounded-lg shadow-md text-[9px] text-emerald-300 backdrop-blur-sm">
                      <div className="font-bold text-[8px] text-emerald-400 uppercase tracking-wider mb-0.5">Guide Analysis</div>
                      Extracts values from the dictionary elements.
                    </div>
                    <div className="english-exp-3 border border-emerald-500/20 bg-emerald-500/5 p-2.5 rounded-lg shadow-md text-[9px] text-emerald-300 backdrop-blur-sm">
                      <div className="font-bold text-[8px] text-emerald-400 uppercase tracking-wider mb-0.5">Guide Analysis</div>
                      Returns a functional multiplier list lambda.
                    </div>
                  </div>

                  {/* ── LAYER 4: Two-Way Sync Editor Mock ── */}
                  <div className="sync-editor-pane absolute w-full max-w-[420px] bg-slate-900/80 border border-amber-500/20 p-4 rounded-xl shadow-lg opacity-0 flex flex-col space-y-3" style={{ zIndex: 10 }}>
                    <div className="flex items-center justify-between text-[9px] font-semibold text-amber-500">
                      <span className="flex items-center gap-1 font-mono">
                        <User className="h-3 w-3" />
                        EDITING TRANSLATION
                      </span>
                      <span className="flex items-center gap-1 font-mono">
                        <RefreshCw className="h-3 w-3 animate-spin text-amber-400" />
                        SYNC ACTIVE
                      </span>
                    </div>
                    <div className="bg-slate-950 border border-white/5 p-2.5 rounded text-[10px] text-slate-300 font-mono min-h-[44px] relative">
                      <span className="sync-editor-text block">
                        Checks if input is a dict. Return <span className="underline decoration-amber-500 text-amber-300 font-bold bg-amber-500/10 px-1 rounded animate-pulse">an empty dict</span> if invalid.
                        <span className="inline-block w-1.5 h-3.5 bg-amber-500 ml-0.5 animate-pulse" />
                      </span>
                    </div>
                    <div className="text-[8px] text-slate-500 font-mono">{"// AUTO-GENERATED CODE UPDATE:"}</div>
                    <div className="bg-slate-950/80 border border-indigo-500/15 p-2.5 rounded font-mono text-[10px] text-indigo-300 code-update-highlight transition-all duration-500">
                      if not d or not isinstance(d, dict):
                      <br />
                      &nbsp;&nbsp;return{" "}
                      <span className="relative inline-block w-10 h-4">
                        <span className="code-val-old absolute inset-0 text-red-400 font-bold">None</span>
                        <span className="code-val-new absolute inset-0 text-amber-400 font-bold opacity-0">{"{}"}</span>
                      </span>
                    </div>
                  </div>

                  {/* ── LAYER 5: Cross-Language Translation ── */}
                  <div className="cross-lang-pane absolute w-full max-w-[420px] opacity-0 flex flex-col space-y-4" style={{ zIndex: 10 }}>
                    <div className="flex items-center justify-center gap-6">
                      <div className="bg-indigo-600/90 text-white font-mono text-xs px-3 py-1.5 rounded-md border border-indigo-400 shadow-md">
                        Python
                      </div>
                      <div className="h-[2px] flex-1 bg-gradient-to-r from-indigo-500 to-pink-500 relative">
                        <Zap className="h-4 w-4 text-amber-400 absolute -top-2 left-1/2 -translate-x-1/2 lang-bridge-arrow" />
                      </div>
                      <div className="bg-pink-600/90 text-white font-mono text-xs px-3 py-1.5 rounded-md border border-pink-400 shadow-md">
                        JavaScript
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-900/80 border border-indigo-500/10 p-3 rounded-lg font-mono text-[9px] text-indigo-300/80">
                        <p className="text-slate-500 font-semibold mb-1"># PYTHON</p>
                        def add(a, b):
                        <br />
                        &nbsp;&nbsp;return a + b
                      </div>
                      <div className="js-output-block bg-slate-900/80 border border-pink-500/10 p-3 rounded-lg font-mono text-[9px] text-pink-300 opacity-0">
                        <p className="text-slate-500 font-semibold mb-1">{"// JAVASCRIPT"}</p>
                        function add(a, b) {"{"}
                        <br />
                        &nbsp;&nbsp;return a + b;
                        <br />
                        {"}"}
                      </div>
                    </div>
                  </div>

                  {/* ── LAYER 6: Stable Workspace Success State ── */}
                  <div className="workspace-settle-pane absolute w-full max-w-[440px] border border-emerald-500/20 bg-emerald-500/5 p-5 rounded-2xl flex flex-col space-y-3 shadow-[0_0_30px_rgba(16,185,129,0.15)] opacity-0 relative overflow-hidden" style={{ zIndex: 10 }}>
                    <div className="workspace-settle-pulse absolute inset-0 border border-emerald-500/50 rounded-2xl pointer-events-none" />
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-emerald-400" />
                      <h4 className="font-semibold text-white font-sans">Anuvaad Workspace Ready</h4>
                    </div>
                    <p className="text-xs text-slate-400 font-sans leading-relaxed">
                      Interactive code translating, two-way sync documentation, and cross-language compatibility aligned inside a minimal high-performance interface.
                    </p>
                    <div className="flex gap-4 pt-2">
                      <div className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded font-sans">
                        Stable Build
                      </div>
                      <div className="text-[10px] font-bold text-slate-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded font-sans">
                        Free Tier Enabled
                      </div>
                    </div>
                  </div>

                </div>

                {/* Mock IDE Footer status */}
                <div className="border-t border-white/5 pt-3 flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Gemini-2.5-Flash Active</span>
                  </div>
                  <span>UTF-8</span>
                </div>

              </div>

            </div>

          </div>

          {/* Bottom chapter navigator/progress dots */}
          <div className="flex justify-center gap-2 lg:gap-3 z-30">
            {steps.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-500",
                  activeStep === i
                    ? "w-8 bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"
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

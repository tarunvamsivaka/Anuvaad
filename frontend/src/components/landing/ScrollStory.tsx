"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";
import { Code, Eye, RefreshCw, Sparkles, User, Zap } from "lucide-react";

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

    // Create a ScrollTrigger that pins the container for the duration of the story
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: "+=500%", // Scroll depth for 6 steps (500vh)
        scrub: 0.5,
        pin: pinnedRef.current,
        anticipatePin: 1,
        onUpdate: (self) => {
          setProgress(self.progress);
          // Calculate the active step based on scroll progress (0 to 5)
          const stepIndex = Math.min(
            Math.floor(self.progress * steps.length),
            steps.length - 1
          );
          setActiveStep(stepIndex);
        },
      },
    });

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
                    anuvaad_story_sequence.py
                  </div>
                  <div className="w-12" />
                </div>

                {/* VISUAL METAPHOR CONTENT SWITCHES BASED ON ACTIVE STEP */}
                <div className="relative flex-1 w-full flex items-center justify-center">

                  {/* ────────────────────────────────────────────────────────
                      SCENE 1: Dense Code Wall (Sealed Syntax)
                      ──────────────────────────────────────────────────────── */}
                  <div
                    className={cn(
                      "absolute inset-0 flex flex-col justify-center items-center space-y-2 transition-all duration-700 ease-out",
                      activeStep === 0 ? "opacity-100 scale-100 blur-0" : "opacity-0 scale-95 blur-md pointer-events-none"
                    )}
                  >
                    {/* The Code Entity: Abstract mass of tangled code */}
                    <div className="w-full max-w-[420px] font-mono text-[11px] leading-relaxed text-indigo-300/40 bg-indigo-950/10 border border-indigo-500/10 p-5 rounded-lg relative overflow-hidden select-none">
                      {/* Chaos glimmers */}
                      <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-indigo-500/5 to-transparent animate-pulse" />
                      <p className="text-red-400/60 font-bold">{"// TANGLED ABSTRACT NOISE"}</p>
                      <p>def _process(d, *args, **kwargs):</p>
                      <p className="pl-4">if not d or not isinstance(d, dict): return None</p>
                      <p className="pl-4">{"r = {k.upper(): v for k, v in d.items() if len(k) > 2}"}</p>
                      <p className="pl-4">x = list(filter(lambda y: y % 2 == 0, [x for x in r.values() if isinstance(x, int)]))</p>
                      <p className="pl-4">return lambda z: [y * z for y in x]</p>
                      <p className="text-indigo-400/50">{"// Unreadable logic. High memory footprint. Unstructured."}</p>
                    </div>
                    {/* Symbolic Guide and Seeker forces */}
                    <div className="flex gap-12 mt-4 items-center">
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4 text-slate-400" />
                        <span className="text-[10px] text-slate-500">The Seeker (User)</span>
                      </div>
                      <div className="w-12 h-[1px] bg-dashed bg-white/20" />
                      <div className="flex items-center gap-1">
                        <Sparkles className="h-4 w-4 text-red-500/60 animate-pulse" />
                        <span className="text-[10px] text-slate-500">The Code Entity</span>
                      </div>
                    </div>
                  </div>

                  {/* ────────────────────────────────────────────────────────
                      SCENE 2: The Wall Splits (Translation Blocks)
                      ──────────────────────────────────────────────────────── */}
                  <div
                    className={cn(
                      "absolute inset-0 flex flex-col justify-center items-center space-y-3 transition-all duration-700 ease-out",
                      activeStep === 1 ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
                    )}
                  >
                    <div className="w-full space-y-3 max-w-[420px]">
                      {/* Split blocks */}
                      <div className="border border-indigo-500/20 bg-indigo-500/5 p-3 rounded-lg flex items-center justify-between shadow-[0_0_15px_rgba(99,102,241,0.1)]">
                        <div className="font-mono text-xs text-indigo-300">Block 1: Check Input Validity</div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">Block</span>
                      </div>
                      <div className="border border-purple-500/20 bg-purple-500/5 p-3 rounded-lg flex items-center justify-between shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                        <div className="font-mono text-xs text-purple-300">Block 2: Filter Numeric Values</div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">Block</span>
                      </div>
                      <div className="border border-pink-500/20 bg-pink-500/5 p-3 rounded-lg flex items-center justify-between shadow-[0_0_15px_rgba(236,72,153,0.1)]">
                        <div className="font-mono text-xs text-pink-300">Block 3: Generate Multipliers</div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded">Block</span>
                      </div>
                    </div>
                  </div>

                  {/* ────────────────────────────────────────────────────────
                      SCENE 3: Explain Block by Block (Clarity)
                      ──────────────────────────────────────────────────────── */}
                  <div
                    className={cn(
                      "absolute inset-0 flex flex-col justify-center items-center space-y-4 transition-all duration-700 ease-out",
                      activeStep === 2 ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
                    )}
                  >
                    <div className="w-full max-w-[440px] space-y-3">
                      {/* Code + English Split View */}
                      <div className="border border-white/5 bg-slate-900/60 rounded-xl p-4 flex flex-col space-y-2 relative overflow-hidden">
                        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                          <span>PYTHON CODE</span>
                          <span className="text-emerald-400">TRANSLATION</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="font-mono text-xs text-indigo-300 p-2 bg-indigo-500/5 rounded border border-indigo-500/10 flex flex-col justify-center">
                            if not d or not isinstance(d, dict):
                            <br />
                            &nbsp;&nbsp;return None
                          </div>
                          <div className="text-xs text-emerald-300 p-2 bg-emerald-500/5 rounded border border-emerald-500/10 flex flex-col justify-center">
                            <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold mb-1">
                              <Eye className="h-3 w-3" />
                              GUIDE ANALYSIS
                            </div>
                            Checks if the input variable is valid and is a dictionary. Returns None if invalid.
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ────────────────────────────────────────────────────────
                      SCENE 4: Two-Way Sync (Edit English -> Change Code)
                      ──────────────────────────────────────────────────────── */}
                  <div
                    className={cn(
                      "absolute inset-0 flex flex-col justify-center items-center space-y-4 transition-all duration-700 ease-out",
                      activeStep === 3 ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
                    )}
                  >
                    <div className="w-full max-w-[440px] space-y-3">
                      <div className="border border-amber-500/30 bg-amber-500/5 rounded-xl p-4 flex flex-col space-y-3 shadow-[0_0_20px_rgba(245,158,11,0.1)] relative overflow-hidden">
                        <div className="flex items-center justify-between text-[10px] font-semibold text-amber-500">
                          <span className="flex items-center gap-1 font-mono">
                            <User className="h-3 w-3" />
                            EDITING TRANSLATION
                          </span>
                          <span className="flex items-center gap-1 font-mono">
                            <RefreshCw className="h-3 w-3 animate-spin text-amber-400" />
                            SYNC ACTIVE
                          </span>
                        </div>
                        
                        {/* Editor Mock */}
                        <div className="space-y-2">
                          <div className="bg-slate-900 border border-white/10 p-2.5 rounded text-xs text-slate-100 relative">
                            Checks if input is a dict. Return <span className="underline decoration-amber-500 text-amber-300 font-bold bg-amber-500/10 px-1 rounded animate-pulse">an empty dict</span> if invalid.
                            <span className="inline-block w-1.5 h-3.5 bg-amber-500 ml-0.5 animate-pulse" />
                          </div>
                          
                          <div className="text-[10px] text-slate-500 font-mono">{"// AUTO-GENERATED CODE UPDATE:"}</div>
                          <div className="bg-slate-950/80 border border-indigo-500/20 p-2.5 rounded font-mono text-[11px] text-indigo-300">
                            if not d or not isinstance(d, dict):
                            <br />
                            &nbsp;&nbsp;return <span className="text-amber-400 font-bold bg-amber-500/10 px-1 rounded transition-colors duration-500">{"{}"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ────────────────────────────────────────────────────────
                      SCENE 5: Cross-Language Translation
                      ──────────────────────────────────────────────────────── */}
                  <div
                    className={cn(
                      "absolute inset-0 flex flex-col justify-center items-center space-y-4 transition-all duration-700 ease-out",
                      activeStep === 4 ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
                    )}
                  >
                    <div className="w-full max-w-[440px] space-y-4">
                      {/* Language badges mapping */}
                      <div className="flex items-center justify-center gap-6">
                        <div className="bg-indigo-600 text-white font-mono text-xs px-3 py-1.5 rounded-md border border-indigo-400 shadow-md">
                          Python
                        </div>
                        <div className="h-[2px] flex-1 bg-gradient-to-r from-indigo-500 to-pink-500 relative">
                          <Zap className="h-4 w-4 text-amber-400 absolute -top-2 left-1/2 -translate-x-1/2 animate-bounce" />
                        </div>
                        <div className="bg-pink-600 text-white font-mono text-xs px-3 py-1.5 rounded-md border border-pink-400 shadow-md">
                          JavaScript
                        </div>
                      </div>

                      {/* Code blocks morph */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-900/80 border border-indigo-500/10 p-3 rounded-lg font-mono text-[10px] text-indigo-300/80">
                          <p className="text-slate-500 font-semibold mb-1"># PYTHON</p>
                          def add(a, b):
                          <br />
                          &nbsp;&nbsp;return a + b
                        </div>
                        <div className="bg-slate-900/80 border border-pink-500/10 p-3 rounded-lg font-mono text-[10px] text-pink-300">
                          <p className="text-slate-500 font-semibold mb-1">{"// JAVASCRIPT"}</p>
                          function add(a, b) {"{"}
                          <br />
                          &nbsp;&nbsp;return a + b;
                          <br />
                          {"}"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ────────────────────────────────────────────────────────
                      SCENE 6: Stable Workspace (Transition to Features)
                      ──────────────────────────────────────────────────────── */}
                  <div
                    className={cn(
                      "absolute inset-0 flex flex-col justify-center items-center space-y-4 transition-all duration-700 ease-out",
                      activeStep === 5 ? "opacity-100 scale-100 blur-0" : "opacity-0 scale-95 blur-md pointer-events-none"
                    )}
                  >
                    <div className="w-full max-w-[460px] border border-emerald-500/20 bg-emerald-500/5 p-5 rounded-2xl flex flex-col space-y-3 shadow-[0_0_30px_rgba(16,185,129,0.15)] relative overflow-hidden">
                      {/* Top shine */}
                      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />
                      
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-emerald-400" />
                        <h4 className="font-semibold text-white">Anuvaad Workspace Ready</h4>
                      </div>
                      
                      <p className="text-xs text-slate-400">
                        Interactive code translating, two-way sync documentation, and cross-language compatibility aligned inside a minimal high-performance interface.
                      </p>

                      <div className="flex gap-4 pt-2">
                        <div className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded">
                          Stable Build
                        </div>
                        <div className="text-[10px] font-bold text-slate-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                          Free Tier Enabled
                        </div>
                      </div>
                    </div>

                    {/* Gentle scroll indicator */}
                    <div className="flex flex-col items-center gap-1 pt-6 animate-bounce">
                      <span className="text-[10px] tracking-widest text-slate-500 uppercase font-semibold">
                        Scroll to explore features
                      </span>
                      <div className="w-1 h-3 rounded-full bg-slate-500" />
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

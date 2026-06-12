"use client";

import React from "react";
import { SceneProps } from "../_types";
import { SceneBase } from "./SceneBase";
import { CodeSurface } from "@/design/primitives";
import { FadeIn, SlideUp } from "@/components/motion";
import { AlertCircle, FileCode } from "lucide-react";

import { useGsapContext, isMotionSafe } from "@/lib/motion";
import gsap from "gsap";

export function Scene02_CodeConfusion({ id, active, progress, globalProgress: _globalProgress }: SceneProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const tlRef = React.useRef<gsap.core.Timeline | null>(null);
  const { getContext } = useGsapContext(containerRef);

  React.useEffect(() => {
    if (!isMotionSafe()) return;
    let ctx: gsap.Context;
    getContext().then((context) => {
      ctx = context;
      ctx.add(() => {
        const tl = gsap.timeline({ paused: true });

        // Blur effect (0.2 to 0.75)
        tl.fromTo(".code-blocks", 
          { filter: "blur(0px)" }, 
          { filter: "blur(5.5px)", duration: 0.55, ease: "none" }, 
          0.2
        );

        // Warning 1 (0.35)
        tl.set(".warning-1", { display: "flex" }, 0.35);
        tl.fromTo(".warning-1", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.1 }, 0.35);

        // Warning 2 (0.55)
        tl.set(".warning-2", { display: "flex" }, 0.55);
        tl.fromTo(".warning-2", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.1 }, 0.55);

        // Overload Exceeded (0.75 to 1.0)
        tl.set(".overload-hud", { display: "flex" }, 0.75);
        tl.fromTo(".overload-hud", { opacity: 0 }, { opacity: 1, duration: 0.1 }, 0.75);
        
        tl.to(".surface-border", { borderColor: "rgba(239, 68, 68, 0.4)", duration: 0.1 }, 0.75);
        tl.set(".overload-dot", { backgroundColor: "#ef4444" }, 0.75); // red-500
        tl.to(".overload-text", { color: "#f87171", duration: 0.1 }, 0.75); // red-400

        tlRef.current = tl;
        tl.progress(progress);
      });
    });

    return () => {
      ctx?.revert();
    };
  }, [getContext]);

  React.useEffect(() => {
    if (tlRef.current) {
      tlRef.current.progress(progress);
    }
  }, [progress]);

  return (
    <SceneBase
      id={id}
      active={active}
      sceneName="02 / Cognitive Overload"
      sceneNumber="SCENE_CONFUSION"
    >
      <div ref={containerRef} className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full">
        {/* Left Column: Headline and Narration */}
        <div className="lg:col-span-5 flex flex-col justify-center space-y-6 text-left">
          <SlideUp delay={100}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>COGNITIVE OVERLOAD</span>
            </div>
          </SlideUp>

          <SlideUp delay={200}>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Drowning in the{" "}
              <span className="bg-gradient-to-r from-red-400 to-orange-300 bg-clip-text text-transparent">
                Obscurity.
              </span>
            </h2>
          </SlideUp>

          <SlideUp delay={300}>
            <p className="text-base text-slate-400 leading-relaxed">
              She scrolled and scrolled. 40,000 lines of legacy codebase. No comments. No documentation. Pointers inside pointer casts, double-nested free routines, and undocumented bitwise flags.
            </p>
          </SlideUp>

          <SlideUp delay={400}>
            <p className="text-sm italic font-serif text-slate-500 pl-4 border-l-2 border-red-500/30 leading-relaxed">
              &ldquo;Each file is a locked room. Each line is a riddle. After four hours of scrolling, I have changed nothing, because I understand nothing.&rdquo;
            </p>
          </SlideUp>
        </div>

        {/* Right Column: Tangled Code Terminal */}
        <div className="lg:col-span-7 flex justify-center items-center relative w-full h-[400px] lg:h-[480px]">
          <div className="absolute inset-0 bg-radial-gradient from-red-500/5 via-transparent to-transparent blur-3xl -z-10" />

          <FadeIn className="w-full max-w-[540px]">
            <CodeSurface 
              className="surface-border rounded-2xl p-6 shadow-2xl relative overflow-hidden transition-none border-white/5"
            >
              {/* Header bar */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4 select-none">
                <div className="flex items-center gap-2">
                  <div className="overload-dot h-3 w-3 rounded-full bg-red-500/40 border border-red-500/60" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500/40 border border-yellow-500/60" />
                  <div className="h-3 w-3 rounded-full bg-green-500/40 border border-green-500/60" />
                </div>
                <div className="overload-text flex items-center gap-1.5 font-mono text-[10px] text-slate-400/70">
                  <FileCode className="h-3 w-3" />
                  <span>legacy_core_renderer.cpp</span>
                </div>
              </div>

              {/* Code Blocks with dynamic blur */}
              <div 
                className="code-blocks font-mono text-xs leading-relaxed text-slate-500 space-y-2 select-none relative"
                style={{ filter: "blur(0px)" }}
              >
                <p className="text-red-400/40 font-semibold">#ifndef LCR_CORE_RENDERER_H</p>
                <p className="text-red-400/40 font-semibold">#define LCR_CORE_RENDERER_H</p>
                <p className="noise-glitch">void _render_node_matrix(struct Node* n, float* m, int flags) &#123;</p>
                <p className="pl-4">if (n == NULL || m == NULL) return;</p>
                <p className="noise-glitch pl-4">if ((flags &amp; 0x01) &amp;&amp; !(n-&gt;status &amp; NODE_ACTIVE)) &#123;</p>
                <p className="pl-8">float* sub_m = (float*)malloc(16 * sizeof(float));</p>
                <p className="pl-8 text-red-500/70 select-text font-semibold">{"// FIXME: Memory leak occurs here occasionally under high frame iterations"}</p>
                <p className="pl-8">_matrix_multiply(n-&gt;transform, m, sub_m);</p>
                <p className="noise-glitch pl-8">for(int i = 0; i &lt; n-&gt;child_count; i++) &#123;</p>
                <p className="pl-12">_render_node_matrix(n-&gt;children[i], sub_m, flags | 0x02);</p>
                <p className="pl-8">&#125;</p>
                <p className="pl-8 text-slate-600 font-semibold">{"_free_matrix_context_buffer(sub_m); // Wait, does this actually free?"}</p>
                <p className="pl-4">&#125;</p>
                <p>&#125;</p>
              </div>

              {/* Dynamic Warning Badges */}
              <div className="absolute top-16 right-6 flex flex-col gap-2 z-10 pointer-events-none select-none font-mono text-[9px]">
                <div className="warning-1 hidden bg-red-950/90 border border-red-500/30 text-red-400 px-2 py-1 rounded shadow-lg items-center gap-1.5 animate-bounce">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  <span>WARN: DEPTH NESTING &gt; 8</span>
                </div>
                <div className="warning-2 hidden bg-red-950/90 border border-red-500/40 text-red-400 px-2 py-1 rounded shadow-lg items-center gap-1.5 animate-pulse">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  <span>FATAL: MEMORY LEAK POTENTIAL</span>
                </div>
              </div>

              {/* Critical Overload HUD Overlay */}
              <div className="overload-hud hidden absolute inset-0 bg-red-950/90 flex-col items-center justify-center p-6 text-center z-20 border border-red-500/50 rounded-2xl">
                <div className="h-12 w-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-4 animate-bounce">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-white font-mono tracking-widest uppercase mb-1">
                  Cognitive Overload
                </h3>
                <p className="text-[10px] text-red-400 font-mono mb-4 uppercase tracking-wider">
                  Context deciphering threshold exceeded
                </p>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden max-w-[200px] border border-white/5">
                  <div className="bg-red-500 h-full animate-pulse w-full" />
                </div>
                <span className="text-[8px] font-mono text-slate-500 mt-2">
                  SCROLL TO RUN SEMANTIC RECOGNITION
                </span>
              </div>

              {/* Scanning scanline */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-500/5 to-transparent pointer-events-none animate-pulse" />
            </CodeSurface>
          </FadeIn>
        </div>
      </div>
    </SceneBase>
  );
}

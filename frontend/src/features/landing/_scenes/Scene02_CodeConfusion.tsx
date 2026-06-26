"use client";

import React from "react";
import { SceneProps } from "../_types";
import { AlertCircle, FileCode } from "lucide-react";
import { useGsapContext, isMotionSafe } from "@/lib/motion";
import gsap from "gsap";

export function Scene02_CodeConfusion({ id, active, progress }: SceneProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const tlRef = React.useRef<gsap.core.Timeline | null>(null);
  const { getContext } = useGsapContext(containerRef);

  React.useEffect(() => {
    if (!isMotionSafe()) return;
    let isMounted = true;
    let ctx: gsap.Context;
    getContext().then((context) => {
      if (!isMounted) return;
      ctx = context;
      ctx.add(() => {
        const tl = gsap.timeline({ paused: true });

        tl.fromTo(".code-blocks",
          { filter: "blur(0px)" },
          { filter: "blur(5.5px)", duration: 0.55, ease: "none" },
          0.2
        );
        tl.set(".warning-1", { display: "flex" }, 0.35);
        tl.fromTo(".warning-1", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.1 }, 0.35);
        tl.set(".warning-2", { display: "flex" }, 0.55);
        tl.fromTo(".warning-2", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.1 }, 0.55);
        tl.set(".overload-hud", { display: "flex" }, 0.75);
        tl.fromTo(".overload-hud", { opacity: 0 }, { opacity: 1, duration: 0.1 }, 0.75);
        tl.to(".surface-border", { borderColor: "rgba(220,38,38,0.4)", duration: 0.1 }, 0.75);
        tl.set(".overload-dot", { backgroundColor: "#dc2626" }, 0.75);
        tl.to(".overload-text", { color: "#dc2626", duration: 0.1 }, 0.75);

        tlRef.current = tl;
        tl.progress(progress);
      });
    });
    return () => { isMounted = false; ctx?.revert(); };
  }, [getContext]);

  React.useEffect(() => { tlRef.current?.progress(progress); }, [progress]);

  return (
    <div
      ref={containerRef}
      id={id}
      className="w-full h-full flex flex-col items-center justify-center relative px-6"
      style={{ opacity: active ? 1 : 0.3, transition: "opacity 0.5s" }}
    >
      {/* Section header */}
      <div className="absolute top-8 left-8 right-8 flex items-center justify-between select-none">
        <span className="text-[10px] tracking-widest font-extrabold uppercase px-2 py-0.5 rounded-full text-red-700 bg-red-50 border border-red-200">
          02 / Cognitive Overload
        </span>
        <span className="text-[10px] font-mono text-neutral-400">SCENE_CONFUSION</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full max-w-6xl mx-auto">
        {/* Left: Copy */}
        <div className="lg:col-span-5 flex flex-col justify-center space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-600 text-xs font-mono w-fit">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>COGNITIVE OVERLOAD</span>
          </div>

          <h2 className="wispr-headline text-neutral-900" style={{ fontSize: "clamp(32px, 5vw, 56px)" }}>
            Drowning in the{" "}
            <span className="italic" style={{ color: "#dc2626" }}>Obscurity.</span>
          </h2>

          <p className="text-[15px] text-neutral-500 leading-relaxed">
            She scrolled and scrolled. 40,000 lines of legacy codebase. No comments. No documentation. Pointers inside pointer casts, double-nested free routines, and undocumented bitwise flags.
          </p>

          <blockquote
            className="pl-4 border-l-2 border-red-200 text-[14px] leading-relaxed text-neutral-500"
            style={{ fontFamily: "var(--font-garamond, Georgia, serif)", fontStyle: "italic" }}
          >
            &ldquo;Each file is a locked room. Each line is a riddle. After four hours of scrolling, I have changed nothing, because I understand nothing.&rdquo;
          </blockquote>
        </div>

        {/* Right: Code terminal */}
        <div className="lg:col-span-7 flex justify-center items-center relative w-full h-[400px] lg:h-[460px]">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent rounded-3xl blur-2xl -z-10" />

          <div className="w-full max-w-[540px] bg-white border-neutral-200 rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)] relative overflow-hidden surface-border border">
            {/* Header bar */}
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4 mb-4 select-none">
              <div className="flex items-center gap-2">
                <div className="overload-dot h-2.5 w-2.5 rounded-full bg-red-100 border border-red-200" />
                <div className="h-2.5 w-2.5 rounded-full bg-amber-100 border border-amber-200" />
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-100 border border-emerald-200" />
              </div>
              <div className="overload-text flex items-center gap-1.5 font-mono text-[10px] text-neutral-400">
                <FileCode className="h-3 w-3" />
                <span>legacy_core_renderer.cpp</span>
              </div>
            </div>

            {/* Code with blur animation */}
            <div className="code-blocks font-mono text-xs leading-relaxed text-slate-500 space-y-2 select-none relative" style={{ filter: "blur(0px)" }}>
              <p className="text-red-600/70 font-semibold">#ifndef LCR_CORE_RENDERER_H</p>
              <p className="text-red-600/70 font-semibold">#define LCR_CORE_RENDERER_H</p>
              <p className="noise-glitch text-slate-700">void _render_node_matrix(struct Node* n, float* m, int flags) &#123;</p>
              <p className="pl-4">if (n == NULL || m == NULL) return;</p>
              <p className="noise-glitch pl-4 text-slate-700">if ((flags &amp; 0x01) &amp;&amp; !(n-&gt;status &amp; NODE_ACTIVE)) &#123;</p>
              <p className="pl-8">float* sub_m = (float*)malloc(16 * sizeof(float));</p>
              <p className="pl-8 text-red-600/80 font-semibold">{"// FIXME: Memory leak occurs here occasionally"}</p>
              <p className="pl-8">_matrix_multiply(n-&gt;transform, m, sub_m);</p>
              <p className="noise-glitch pl-8 text-slate-700">for(int i = 0; i &lt; n-&gt;child_count; i++) &#123;</p>
              <p className="pl-12 text-slate-700">_render_node_matrix(n-&gt;children[i], sub_m, flags | 0x02);</p>
              <p className="pl-8 text-slate-700">&#125;</p>
              <p className="pl-8 text-slate-400 font-semibold">{"_free_matrix_context_buffer(sub_m); // Wait, does this free?"}</p>
              <p className="pl-4 text-slate-700">&#125;</p>
              <p className="text-slate-700">&#125;</p>
            </div>

            {/* Warning badges */}
            <div className="absolute top-16 right-5 flex flex-col gap-2 z-10 pointer-events-none select-none font-mono text-[9px]">
              <div className="warning-1 hidden bg-white/95 border border-red-200 text-red-600 px-2 py-1 rounded-lg items-center gap-1.5 animate-bounce shadow-sm">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span>WARN: DEPTH NESTING &gt; 8</span>
              </div>
              <div className="warning-2 hidden bg-white/95 border border-red-300 text-red-700 px-2 py-1 rounded-lg items-center gap-1.5 animate-pulse shadow-sm font-bold">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span>FATAL: MEMORY LEAK POTENTIAL</span>
              </div>
            </div>

            {/* Critical overload overlay */}
            <div className="overload-hud hidden absolute inset-0 bg-white/90 backdrop-blur-sm flex-col items-center justify-center p-6 text-center z-20 rounded-3xl">
              <div className="h-12 w-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-500 mb-4 animate-bounce">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-neutral-900 font-mono tracking-widest uppercase mb-1">Cognitive Overload</h3>
              <p className="text-[10px] text-red-600 font-mono mb-4 uppercase tracking-wider">Context deciphering threshold exceeded</p>
              <div className="w-full bg-neutral-100 h-1.5 rounded-full overflow-hidden max-w-[200px] border border-neutral-200">
                <div className="bg-red-500 h-full animate-pulse w-full" />
              </div>
              <span className="text-[8px] font-mono text-neutral-400 mt-2">SCROLL TO RUN SEMANTIC RECOGNITION</span>
            </div>

            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-500/5 to-transparent pointer-events-none animate-pulse rounded-3xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { SceneProps } from "../_types";
import { Sparkles, Languages, Check, Loader2 } from "lucide-react";
import { useGsapContext, isMotionSafe } from "@/lib/motion";
import gsap from "gsap";

export function Scene03_Recognition({ id, active, progress }: SceneProps) {
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

        tl.fromTo(".scan-line", { top: "0%" }, { top: "100%", duration: 1, ease: "none" }, 0);
        tl.set(".scan-line", { opacity: 0 }, 0);
        tl.to(".scan-line", { opacity: 1, duration: 0.05 }, 0.05);
        tl.to(".scan-line", { opacity: 0, duration: 0.05 }, 0.95);

        const totalLines = 10;
        const codeLines = gsap.utils.toArray<HTMLElement>(".code-line");
        codeLines.forEach((line, index) => {
          const threshold = 0.1 + (index / totalLines) * 0.7;
          const targetColor = line.dataset.color || "#d97706";
          const targetWeight = line.dataset.weight || "400";
          tl.to(line, { color: targetColor, fontWeight: targetWeight, duration: 0.01 }, threshold);
        });

        tl.set(".badge-cpp", { display: "inline-flex" }, 0.6);
        tl.fromTo(".badge-cpp", { opacity: 0 }, { opacity: 1, duration: 0.1 }, 0.6);
        tl.set(".badge-ast", { display: "inline-flex" }, 0.85);
        tl.fromTo(".badge-ast", { opacity: 0 }, { opacity: 1, duration: 0.1 }, 0.85);

        tl.set(".check1-loading", { display: "none" }, 0.3);
        tl.set(".check1-done", { display: "block" }, 0.3);
        tl.to(".check1-text", { color: "#d97706", duration: 0.01 }, 0.3);
        tl.set(".check2-loading", { display: "none" }, 0.6);
        tl.set(".check2-done", { display: "block" }, 0.6);
        tl.to(".check2-text", { color: "#d97706", duration: 0.01 }, 0.6);
        tl.set(".check3-loading", { display: "none" }, 0.85);
        tl.set(".check3-done", { display: "block" }, 0.85);
        tl.to(".check3-text", { color: "#d97706", fontWeight: 600, duration: 0.01 }, 0.85);

        tlRef.current = tl;
        tl.progress(progress);
      });
    });
    return () => { isMounted = false; ctx?.revert(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <span className="text-[10px] tracking-widest font-extrabold uppercase px-2 py-0.5 rounded-full text-amber-600 bg-amber-50 border border-amber-200">
          03 / Pattern Detection
        </span>
        <span className="text-[10px] font-mono text-neutral-400">SCENE_RECOGNITION</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full max-w-6xl mx-auto">
        {/* Left: Copy */}
        <div className="lg:col-span-5 flex flex-col justify-center space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-600 text-xs font-mono w-fit">
            <Sparkles className="h-3.5 w-3.5" />
            <span>THE RECOGNITION STEP</span>
          </div>

          <h2 className="wispr-headline text-neutral-900" style={{ fontSize: "clamp(32px, 5vw, 56px)" }}>
            The System{" "}
            <span className="italic" style={{ color: "#d97706" }}>Parses Structure.</span>
          </h2>

          <p className="text-[15px] text-neutral-500 leading-relaxed">
            When you feed a file into Anuvaad, it doesn&apos;t just read text. The engine runs a local syntax analyzer, mapping variables, isolating helper declarations, and separating syntactic noise from logic.
          </p>

          <div className="flex flex-wrap gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-amber-50 border border-amber-200 text-amber-600">
              Language Analysis
            </span>
            <span className="badge-cpp hidden items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-neutral-50 border border-neutral-200 text-neutral-600">
              C++ Detected
            </span>
            <span className="badge-ast hidden items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-neutral-50 border border-neutral-200 text-neutral-600">
              AST Map Active
            </span>
          </div>
        </div>

        {/* Right: Code recognition panel */}
        <div className="lg:col-span-7 flex justify-center items-center relative w-full h-[400px] lg:h-[460px]">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent rounded-3xl blur-2xl -z-10" />

          <div className="w-full max-w-[540px] bg-white border border-neutral-200 rounded-3xl p-6 shadow-xl relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4 mb-4 select-none">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-amber-100 border border-amber-200" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-100 border border-yellow-200" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-100 border border-green-200" />
              </div>
              <div className="flex items-center gap-1.5 text-amber-600 font-mono text-[10px]">
                <Languages className="h-3.5 w-3.5" />
                <span>PARSING CORE ABSTRACT TREE</span>
              </div>
            </div>

            {/* Code being parsed */}
            <div className="font-mono text-xs leading-relaxed space-y-2 select-none relative z-10 transition-all duration-300 text-slate-400">
              <p className="code-line" data-color="#b45309" data-weight="600">void _render_node_matrix(struct Node* n, float* m, int flags) &#123;</p>
              <p className="code-line pl-4" data-color="#d97706" data-weight="400">if (n == NULL || m == NULL) return;</p>
              <p className="code-line pl-4" data-color="#b45309" data-weight="400">if ((flags &amp; 0x01) &amp;&amp; !(n-&gt;status &amp; NODE_ACTIVE)) &#123;</p>
              <p className="code-line pl-8" data-color="#d97706" data-weight="400">float* sub_m = (float*)malloc(16 * sizeof(float));</p>
              <p className="code-line pl-8" data-color="#b45309" data-weight="400">_matrix_multiply(n-&gt;transform, m, sub_m);</p>
              <p className="code-line pl-8" data-color="#b45309" data-weight="400">for(int i = 0; i &lt; n-&gt;child_count; i++) &#123;</p>
              <p className="code-line pl-12" data-color="#d97706" data-weight="600">_render_node_matrix(n-&gt;children[i], sub_m, flags | 0x02);</p>
              <p className="code-line pl-8" data-color="#b45309" data-weight="400">&#125;</p>
              <p className="code-line pl-4" data-color="#64748b" data-weight="600">_free_matrix_context_buffer(sub_m);</p>
              <p className="code-line pl-4" data-color="#b45309" data-weight="400">&#125;</p>
            </div>

            {/* Scanline */}
            <div className="scan-line absolute left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_15px_rgba(217,119,6,0.6)] pointer-events-none z-20" />

            {/* Analysis status overlay */}
            <div className="absolute bottom-4 right-4 bg-white/95 border border-neutral-200 px-3 py-2 rounded-xl text-[9px] font-mono space-y-1.5 shadow-xl min-w-[170px] z-20 select-none backdrop-blur-sm">
              <div className="flex items-center justify-between text-neutral-400">
                <span>ANALYSIS STEP</span>
                <span>STATUS</span>
              </div>
              <div className="h-px bg-neutral-100 my-1" />
              <div className="check1-text flex items-center gap-1.5 text-neutral-500">
                <Loader2 className="check1-loading h-3 w-3 shrink-0 animate-spin text-amber-500" />
                <Check className="check1-done hidden h-3 w-3 shrink-0 text-amber-600" />
                <span>TOKENIZING COMPLETE</span>
              </div>
              <div className="check2-text flex items-center gap-1.5 text-neutral-500">
                <div className="check2-loading h-3 w-3 flex items-center justify-center font-bold text-[8px] text-neutral-400 border border-neutral-200 rounded-full shrink-0">?</div>
                <Check className="check2-done hidden h-3 w-3 shrink-0 text-amber-600" />
                <span>C++ PARSER COMPILATION</span>
              </div>
              <div className="check3-text flex items-center gap-1.5 text-neutral-500">
                <div className="check3-loading h-3 w-3 flex items-center justify-center font-bold text-[8px] text-neutral-400 border border-neutral-200 rounded-full shrink-0">3</div>
                <Check className="check3-done hidden h-3 w-3 shrink-0 text-amber-600" />
                <span>AST COORDINATE MAP</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

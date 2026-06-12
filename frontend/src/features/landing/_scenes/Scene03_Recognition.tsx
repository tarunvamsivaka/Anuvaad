"use client";

import React from "react";
import { SceneProps } from "../_types";
import { SceneBase } from "./SceneBase";
import { CodeSurface, AmberBadge } from "@/design/primitives";
import { FadeIn, SlideUp } from "@/components/motion";
import { Sparkles, Languages, Check, Loader2 } from "lucide-react";

import { useGsapContext, isMotionSafe } from "@/lib/motion";
import gsap from "gsap";

export function Scene03_Recognition({ id, active, progress, globalProgress: _globalProgress }: SceneProps) {
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

        // Scanline (0 to 1)
        tl.fromTo(".scan-line", { top: "0%" }, { top: "100%", duration: 1, ease: "none" }, 0);
        tl.set(".scan-line", { opacity: 0 }, 0);
        tl.to(".scan-line", { opacity: 1, duration: 0.05 }, 0.05);
        tl.to(".scan-line", { opacity: 0, duration: 0.05 }, 0.95);

        // Code Lines
        const totalLines = 10;
        const codeLines = gsap.utils.toArray<HTMLElement>(".code-line");
        codeLines.forEach((line, index) => {
          const threshold = 0.1 + (index / totalLines) * 0.7;
          const targetColor = line.dataset.color || "#fcd34d";
          const targetWeight = line.dataset.weight || "400";
          
          tl.to(line, { color: targetColor, fontWeight: targetWeight, duration: 0.01 }, threshold);
        });

        // Badges
        tl.set(".badge-cpp", { display: "inline-flex" }, 0.6);
        tl.fromTo(".badge-cpp", { opacity: 0 }, { opacity: 1, duration: 0.1 }, 0.6);
        
        tl.set(".badge-ast", { display: "inline-flex" }, 0.85);
        tl.fromTo(".badge-ast", { opacity: 0 }, { opacity: 1, duration: 0.1 }, 0.85);

        // Checklist
        // Check 1 (0.3)
        tl.set(".check1-loading", { display: "none" }, 0.3);
        tl.set(".check1-done", { display: "block" }, 0.3);
        tl.to(".check1-text", { color: "#fbbf24", duration: 0.01 }, 0.3);

        // Check 2 (0.6)
        tl.set(".check2-loading", { display: "none" }, 0.6);
        tl.set(".check2-done", { display: "block" }, 0.6);
        tl.to(".check2-text", { color: "#fbbf24", duration: 0.01 }, 0.6);

        // Check 3 (0.85)
        tl.set(".check3-loading", { display: "none" }, 0.85);
        tl.set(".check3-done", { display: "block" }, 0.85);
        tl.to(".check3-text", { color: "#818cf8", fontWeight: 600, duration: 0.01 }, 0.85);

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
      sceneName="03 / Logical Pattern Detection"
      sceneNumber="SCENE_RECOGNITION"
    >
      <div ref={containerRef} className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full">
        {/* Left Column: Headline and Narration */}
        <div className="lg:col-span-5 flex flex-col justify-center space-y-6 text-left">
          <SlideUp delay={100}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono">
              <Sparkles className="h-3.5 w-3.5" />
              <span>THE RECOGNITION STEP</span>
            </div>
          </SlideUp>

          <SlideUp delay={200}>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              The System{" "}
              <span className="bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
                Parses Structure.
              </span>
            </h2>
          </SlideUp>

          <SlideUp delay={300}>
            <p className="text-base text-slate-400 leading-relaxed">
              When you feed a file into Anuvaad, it doesn&apos;t just read text. The engine runs a local syntax analyzer, mapping variables, isolating helper declarations, and separating syntactic noise from logic.
            </p>
          </SlideUp>

          <SlideUp delay={400}>
            <div className="flex flex-wrap gap-2.5">
              <AmberBadge variant="solid" className="bg-amber-500/10 text-amber-400 border-amber-500/20">
                Language Analysis
              </AmberBadge>
              <AmberBadge variant="outline" className="badge-cpp hidden border-amber-500/30 text-amber-300">
                C++ Detected
              </AmberBadge>
              <AmberBadge variant="outline" className="badge-ast hidden border-indigo-500/30 text-indigo-300">
                AST Map Active
              </AmberBadge>
            </div>
          </SlideUp>
        </div>

        {/* Right Column: Code Recognition Interface */}
        <div className="lg:col-span-7 flex justify-center items-center relative w-full h-[400px] lg:h-[480px]">
          <div className="absolute inset-0 bg-radial-gradient from-amber-500/5 via-transparent to-transparent blur-3xl -z-10" />

          <FadeIn className="w-full max-w-[540px]">
            <CodeSurface className="rounded-2xl p-6 shadow-2xl relative overflow-hidden border border-white/5 bg-surface-card">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4 select-none">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-amber-500/40 border border-amber-500/60" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500/40 border border-yellow-500/60" />
                  <div className="h-3 w-3 rounded-full bg-green-500/40 border border-green-500/60" />
                </div>
                <div className="flex items-center gap-1.5 text-amber-400/80 font-mono text-[10px]">
                  <Languages className="h-3.5 w-3.5" />
                  <span>PARSING CORE ABSTRACT TREE</span>
                </div>
              </div>

              {/* Parsing / Highlighting Code */}
              <div className="font-mono text-xs leading-relaxed space-y-2 select-none relative z-10 transition-all duration-300" style={{ color: "#334155" }}>
                <p className="code-line" data-color="rgba(245, 158, 11, 0.5)" data-weight="600">
                  void _render_node_matrix(struct Node* n, float* m, int flags) &#123;
                </p>
                <p className="code-line pl-4" data-color="#fcd34d" data-weight="400">
                  if (n == NULL || m == NULL) return;
                </p>
                <p className="code-line pl-4" data-color="rgba(252, 211, 77, 0.8)" data-weight="400">
                  if ((flags &amp; 0x01) &amp;&amp; !(n-&gt;status &amp; NODE_ACTIVE)) &#123;
                </p>
                <p className="code-line pl-8" data-color="#fcd34d" data-weight="400">
                  float* sub_m = (float*)malloc(16 * sizeof(float));
                </p>
                <p className="code-line pl-8" data-color="rgba(245, 158, 11, 0.7)" data-weight="400">
                  _matrix_multiply(n-&gt;transform, m, sub_m);
                </p>
                <p className="code-line pl-8" data-color="rgba(252, 211, 77, 0.8)" data-weight="400">
                  for(int i = 0; i &lt; n-&gt;child_count; i++) &#123;
                </p>
                <p className="code-line pl-12" data-color="#fcd34d" data-weight="600">
                  _render_node_matrix(n-&gt;children[i], sub_m, flags | 0x02);
                </p>
                <p className="code-line pl-8" data-color="rgba(252, 211, 77, 0.8)" data-weight="400">
                  &#125;
                </p>
                <p className="code-line pl-4" data-color="#64748b" data-weight="600">
                  _free_matrix_context_buffer(sub_m);
                </p>
                <p className="code-line pl-4" data-color="rgba(252, 211, 77, 0.8)" data-weight="400">
                  &#125;
                </p>
                <p className="code-line" data-color="rgba(245, 158, 11, 0.5)" data-weight="600">
                  &#125;
                </p>
              </div>

              {/* Recognition scan-line driven by progress */}
              <div 
                className="scan-line absolute left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_15px_rgba(245,158,11,0.8)] pointer-events-none z-20"
              />

              {/* Status checklist overlay */}
              <div className="absolute bottom-4 right-4 bg-slate-950/90 border border-white/10 px-3 py-2 rounded-xl text-[9px] font-mono space-y-1.5 shadow-xl min-w-[170px] z-20 select-none">
                <div className="flex items-center justify-between text-slate-500">
                  <span>ANALYSIS STEP</span>
                  <span>STATUS</span>
                </div>
                
                <div className="h-px bg-white/5 my-1" />

                <div className="check1-text flex items-center gap-1.5 text-slate-600">
                  <Loader2 className="check1-loading h-3 w-3 shrink-0 animate-spin" />
                  <Check className="check1-done hidden h-3 w-3 shrink-0" />
                  <span>TOKENIZING COMPLETE</span>
                </div>
                
                <div className="check2-text flex items-center gap-1.5 text-slate-600">
                  <div className="check2-loading h-3 w-3 flex items-center justify-center font-bold text-[8px] font-mono text-slate-700 border border-slate-700 rounded-full shrink-0">?</div>
                  <Check className="check2-done hidden h-3 w-3 shrink-0" />
                  <span>C++ PARSER COMPILATION</span>
                </div>
                
                <div className="check3-text flex items-center gap-1.5 text-slate-600">
                  <div className="check3-loading h-3 w-3 flex items-center justify-center font-bold text-[8px] font-mono text-slate-700 border border-slate-700 rounded-full shrink-0">3</div>
                  <Check className="check3-done hidden h-3 w-3 shrink-0" />
                  <span>AST COORDINATE MAP</span>
                </div>
              </div>
            </CodeSurface>
          </FadeIn>
        </div>
      </div>
    </SceneBase>
  );
}

"use client";

import React from "react";
import { SceneProps } from "../_types";
import { SceneBase } from "./SceneBase";
import { CodeSurface } from "@/design/primitives";
import { FadeIn, SlideUp } from "@/components/motion";
import { CheckCircle2, GitPullRequest, Loader2 } from "lucide-react";

import { useGsapContext, isMotionSafe } from "@/lib/motion";
import gsap from "gsap";

export function Scene07_CodeUpdates({ id, active, progress, globalProgress: _globalProgress }: SceneProps) {
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

        // Phase 1: Compile spinner (0.0 to 0.35)
        tl.set(".compile-spinner", { display: "flex" }, 0);
        tl.set(".compile-spinner", { display: "none" }, 0.35);

        // Phase 2: Show Diff Block
        tl.set(".diff-block", { display: "none" }, 0);
        tl.set(".diff-block", { display: "block", opacity: 0 }, 0.35);
        tl.to(".diff-block", { opacity: 1, duration: 0.1 }, 0.35);

        // Deletion line collapses
        tl.fromTo(".del-line", 
          { opacity: 1, height: "24px" }, 
          { opacity: 0.3, height: "0px", duration: 0.45 }, 
          0.35
        );

        // Insertion line emerges
        tl.fromTo(".ins-line", 
          { opacity: 0, y: 8 }, 
          { opacity: 1, y: 0, duration: 0.45 }, 
          0.35
        );

        // Completion states (0.8)
        tl.to(".card-border", { borderColor: "rgba(16, 185, 129, 0.3)", duration: 0.2 }, 0.8);
        tl.set(".status-generating", { display: "none" }, 0.8);
        tl.set(".status-synced", { display: "flex", opacity: 0 }, 0.8);
        tl.to(".status-synced", { opacity: 1, duration: 0.1 }, 0.8);

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
      sceneName="07 / Code Generation & Sync"
      sceneNumber="SCENE_SYNC"
    >
      <div ref={containerRef} className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full">
        {/* Left Column: Headline and Narration */}
        <div className="lg:col-span-5 flex flex-col justify-center space-y-6 text-left">
          <SlideUp delay={100}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>CODE MODIFICATION MERGED</span>
            </div>
          </SlideUp>

          <SlideUp delay={200}>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Code Updates{" "}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                Committed.
              </span>
            </h2>
          </SlideUp>

          <SlideUp delay={300}>
            <p className="text-base text-slate-400 leading-relaxed">
              Your English intentions compile back into matching syntactic elements. Anuvaad updates legacy source files directly, preparing precise, clean changes ready to commit.
            </p>
          </SlideUp>

          <SlideUp delay={400}>
            <div className="inline-flex items-center gap-2 text-xs font-mono text-emerald-400">
              <GitPullRequest className="h-4 w-4" />
              <span>1 file changed, 1 insertion(+), 1 deletion(-)</span>
            </div>
          </SlideUp>
        </div>

        {/* Right Column: Code Diff Window */}
        <div className="lg:col-span-7 flex justify-center items-center relative w-full h-[400px] lg:h-[480px]">
          <div className="absolute inset-0 bg-radial-gradient from-emerald-500/5 via-transparent to-transparent blur-3xl -z-10 animate-pulse" />

          <FadeIn className="w-full max-w-[540px]">
            <CodeSurface 
              className="card-border rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col space-y-4 border border-white/5"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4 select-none">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500/40 border border-red-500/60" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500/40 border border-yellow-500/60" />
                  <div className="h-3 w-3 rounded-full bg-green-500/40 border border-green-500/60" />
                </div>
                <span className="text-[10px] font-mono text-slate-400 select-none">
                  diff --git a/legacy_core_renderer.cpp
                </span>
              </div>

              {/* Diff Content Area */}
              <div className="font-mono text-xs leading-relaxed space-y-1.5 min-h-[140px] flex flex-col justify-start relative select-none">
                <div className="compile-spinner h-28 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="h-5 w-5 animate-spin text-emerald-400/80" />
                  <div className="space-y-1 text-center font-mono">
                    <p className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold">Compiling logical edits</p>
                    <p className="text-[8px] text-slate-600">Reconstructing syntax blocks...</p>
                  </div>
                </div>

                <div className="diff-block hidden space-y-1">
                  <p className="text-slate-600">@@ -98,12 +98,12 @@ void _render_node_matrix(struct Node* n) &#123;</p>
                  <p className="text-slate-500">&nbsp; if (n == NULL || m == NULL) &#123;</p>
                  
                  {/* Deletion Line (Red) */}
                  <div className="del-line bg-red-500/10 text-red-400 border-l-2 border-red-500 pl-4 overflow-hidden flex items-center">
                    <span className="font-mono text-red-500/70 mr-1.5 font-bold">-</span>
                    <span>return NULL;</span>
                  </div>
                  
                  {/* Insertion Line (Green) */}
                  <div className="ins-line bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500 pl-4 flex items-center opacity-0">
                    <span className="font-mono text-emerald-500/70 mr-1.5 font-bold">+</span>
                    <span>return _create_empty_node();</span>
                  </div>

                  <p className="text-slate-500">&nbsp; &#125;</p>
                  <p className="text-slate-500">&nbsp; if ((flags &amp; 0x01) &amp;&amp; !(n-&gt;status &amp; NODE_ACTIVE)) &#123;</p>
                </div>
              </div>

              {/* Status bar */}
              <div className="flex items-center justify-between text-[9px] font-mono text-slate-600 border-t border-white/5 pt-3 select-none">
                <span>COMPLEXITY_FACTOR: REDUCED BY 12%</span>
                <span className="status-synced hidden text-emerald-400 font-bold items-center gap-1">
                  <span>DIFF SYNCED SUCCESSFULLY</span>
                </span>
                <span className="status-generating">Generating patch...</span>
              </div>
            </CodeSurface>
          </FadeIn>
        </div>
      </div>
    </SceneBase>
  );
}

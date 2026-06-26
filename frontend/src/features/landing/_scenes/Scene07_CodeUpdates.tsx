"use client";

import React from "react";
import { SceneProps } from "../_types";
import { CheckCircle2, GitPullRequest, Loader2 } from "lucide-react";
import { useGsapContext, isMotionSafe } from "@/lib/motion";
import gsap from "gsap";

export function Scene07_CodeUpdates({ id, active, progress }: SceneProps) {
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
        tl.set(".compile-spinner", { display: "flex" }, 0);
        tl.set(".compile-spinner", { display: "none" }, 0.35);
        tl.set(".diff-block", { display: "none" }, 0);
        tl.set(".diff-block", { display: "block", opacity: 0 }, 0.35);
        tl.to(".diff-block", { opacity: 1, duration: 0.1 }, 0.35);
        tl.fromTo(".del-line", { opacity: 1, height: "24px" }, { opacity: 0.3, height: "0px", duration: 0.45 }, 0.35);
        tl.fromTo(".ins-line", { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.45 }, 0.35);
        tl.to(".card-border", { borderColor: "rgba(16,185,129,0.5)", duration: 0.2 }, 0.8);
        tl.set(".status-generating", { display: "none" }, 0.8);
        tl.set(".status-synced", { display: "flex", opacity: 0 }, 0.8);
        tl.to(".status-synced", { opacity: 1, duration: 0.1 }, 0.8);
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
      <div className="absolute top-8 left-8 right-8 flex items-center justify-between select-none">
        <span className="text-[10px] tracking-widest font-extrabold uppercase px-2 py-0.5 rounded-full text-emerald-700 bg-emerald-50 border border-emerald-200">
          07 / Code Generation & Sync
        </span>
        <span className="text-[10px] font-mono text-neutral-400">SCENE_SYNC</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full max-w-6xl mx-auto">
        {/* Left */}
        <div className="lg:col-span-5 flex flex-col justify-center space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-mono w-fit">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>CODE MODIFICATION MERGED</span>
          </div>

          <h2 className="wispr-headline text-neutral-900" style={{ fontSize: "clamp(32px, 5vw, 56px)" }}>
            Code Updates{" "}
            <span className="italic" style={{ color: "#059669" }}>Committed.</span>
          </h2>

          <p className="text-[15px] text-neutral-500 leading-relaxed">
            Your English intentions compile back into matching syntactic elements. Anuvaad updates legacy source files directly, preparing precise, clean changes ready to commit.
          </p>

          <div className="inline-flex items-center gap-2 text-xs font-mono text-emerald-600">
            <GitPullRequest className="h-4 w-4" />
            <span>1 file changed, 1 insertion(+), 1 deletion(-)</span>
          </div>
        </div>

        {/* Right: Diff window */}
        <div className="lg:col-span-7 flex justify-center items-center relative w-full h-[400px] lg:h-[460px]">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-3xl blur-2xl -z-10" />

          <div className="w-full max-w-[540px] bg-white border border-neutral-200 rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)] card-border relative overflow-hidden flex flex-col space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4 select-none">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-red-100 border border-red-200" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-100 border border-yellow-200" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-100 border border-green-200" />
              </div>
              <span className="text-[10px] font-mono text-neutral-400 select-none">
                diff --git a/legacy_core_renderer.cpp
              </span>
            </div>

            {/* Diff content */}
            <div className="font-mono text-xs leading-relaxed space-y-1.5 min-h-[140px] flex flex-col justify-start relative select-none">
              <div className="compile-spinner h-28 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                <div className="space-y-1 text-center font-mono">
                  <p className="text-[10px] text-emerald-600 uppercase tracking-widest font-bold">Compiling logical edits</p>
                  <p className="text-[8px] text-neutral-400">Reconstructing syntax blocks...</p>
                </div>
              </div>

              <div className="diff-block hidden space-y-1 text-slate-500">
                <p>@@ -98,12 +98,12 @@ void _render_node_matrix(struct Node* n) &#123;</p>
                <p>&nbsp; if (n == NULL || m == NULL) &#123;</p>
                <div className="del-line bg-red-50 text-red-700 border-l-2 border-red-400 pl-4 overflow-hidden flex items-center shadow-sm">
                  <span className="font-mono text-red-500 mr-1.5 font-bold">-</span>
                  <span>return NULL;</span>
                </div>
                <div className="ins-line bg-emerald-50 text-emerald-700 border-l-2 border-emerald-400 pl-4 flex items-center opacity-0 shadow-sm">
                  <span className="font-mono text-emerald-500 mr-1.5 font-bold">+</span>
                  <span>return _create_empty_node();</span>
                </div>
                <p>&nbsp; &#125;</p>
                <p>&nbsp; if ((flags &amp; 0x01) &amp;&amp; !(n-&gt;status &amp; NODE_ACTIVE)) &#123;</p>
              </div>
            </div>

            {/* Status bar */}
            <div className="flex items-center justify-between text-[9px] font-mono text-neutral-400 border-t border-neutral-100 pt-3 select-none">
              <span>COMPLEXITY_FACTOR: REDUCED BY 12%</span>
              <span className="status-synced hidden text-emerald-600 font-bold items-center gap-1">
                <span>DIFF SYNCED SUCCESSFULLY</span>
              </span>
              <span className="status-generating">Generating patch...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

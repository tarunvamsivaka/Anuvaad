"use client";

import React from "react";
import { SceneProps } from "../_types";
import { SceneBase } from "./SceneBase";
import { Surface, GlassPanel, AmberBadge } from "@/design/primitives";
import { FadeIn, SlideUp } from "@/components/motion";
import { GitBranch, ArrowRight, Network, FileCode } from "lucide-react";

import { useGsapContext, isMotionSafe } from "@/lib/motion";
import gsap from "gsap";

export function Scene05_RepositoryIntelligence({ id, active, progress, globalProgress: _globalProgress }: SceneProps) {
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

        // Node 1
        tl.fromTo(".node-1", { scale: 0.9, opacity: 0.4 }, { scale: 1, opacity: 1, duration: 0.1 }, 0.2);

        // Path Drawing
        tl.fromTo(".svg-path", { strokeDashoffset: 120 }, { strokeDashoffset: 0, duration: 0.5, ease: "none" }, 0.2);

        // Connected Nodes
        tl.fromTo(".node-2", { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.1 }, 0.45);
        tl.fromTo(".node-3", { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.1 }, 0.6);
        tl.fromTo(".node-4", { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.1 }, 0.75);

        // Status
        tl.set(".status-mapping", { display: "none" }, 0.75);
        tl.set(".status-indexed", { display: "inline-block" }, 0.75);

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

  const pathLength = 120;

  return (
    <SceneBase
      id={id}
      active={active}
      sceneName="05 / Repository Intelligence"
      sceneNumber="SCENE_CONTEXT"
    >
      <div ref={containerRef} className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full">
        {/* Left Column: Headline and Narration */}
        <div className="lg:col-span-5 flex flex-col justify-center space-y-6 text-left">
          <SlideUp delay={100}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono">
              <Network className="h-3.5 w-3.5" />
              <span>GLOBAL REPOSITORY CONTEXT</span>
            </div>
          </SlideUp>

          <SlideUp delay={200}>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Repository-Wide{" "}
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-amber-300 bg-clip-text text-transparent">
                Intelligence.
              </span>
            </h2>
          </SlideUp>

          <SlideUp delay={300}>
            <p className="text-base text-slate-400 leading-relaxed">
              Files do not run in isolation. Anuvaad maps the entire workspace — analyzing header imports, database schemas, local configurations, and build recipes to compile a unified index.
            </p>
          </SlideUp>

          <SlideUp delay={400}>
            <div className="flex items-center gap-3">
              <div className="flex -space-x-1.5 select-none font-mono">
                <div className="h-7 w-7 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-[9px] font-bold text-red-400">C++</div>
                <div className="h-7 w-7 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-[9px] font-bold text-blue-400">TS</div>
                <div className="h-7 w-7 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-[9px] font-bold text-yellow-400">JS</div>
                <div className="h-7 w-7 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-[9px] font-bold text-emerald-400">SQL</div>
              </div>
              <span className="text-xs text-slate-500 font-mono">Cross-language module relations</span>
            </div>
          </SlideUp>
        </div>

        {/* Right Column: Visual Mapping Diagram */}
        <div className="lg:col-span-7 flex justify-center items-center relative w-full h-[400px] lg:h-[480px]">
          <div className="absolute inset-0 bg-radial-gradient from-indigo-500/5 via-transparent to-transparent blur-3xl -z-10 animate-pulse" />

          <FadeIn className="w-full max-w-[540px]">
            <GlassPanel level="dark" className="rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col space-y-6 border border-white/5 bg-surface-card">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4 select-none">
                <div className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-indigo-400" />
                  <span className="text-xs font-semibold text-white font-mono">Dependency Relationship Map</span>
                </div>
                <AmberBadge variant="subtle" className="border-indigo-500/20 text-indigo-300 bg-indigo-500/5 font-mono">
                  Context Resolution: 100%
                </AmberBadge>
              </div>

              {/* Dependency Graph Visualizer */}
              <div className="relative h-64 flex flex-col justify-between items-center py-2">
                {/* SVG Connections Overlay */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" xmlns="http://www.w3.org/2000/svg">
                  {/* Left Path: Center to Node 1 */}
                  <path
                    className="svg-path"
                    d="M 230 45 L 90 175"
                    fill="none"
                    stroke="rgba(99, 102, 241, 0.4)"
                    strokeWidth="1.5"
                    strokeDasharray={pathLength}
                    strokeDashoffset={pathLength}
                  />
                  {/* Middle Path: Center to Node 2 */}
                  <path
                    className="svg-path"
                    d="M 230 45 L 230 175"
                    fill="none"
                    stroke="rgba(245, 158, 11, 0.4)"
                    strokeWidth="1.5"
                    strokeDasharray={pathLength}
                    strokeDashoffset={pathLength}
                  />
                  {/* Right Path: Center to Node 3 */}
                  <path
                    className="svg-path"
                    d="M 230 45 L 370 175"
                    fill="none"
                    stroke="rgba(168, 85, 247, 0.4)"
                    strokeWidth="1.5"
                    strokeDasharray={pathLength}
                    strokeDashoffset={pathLength}
                  />
                </svg>

                {/* Central Entry File Card (Top) */}
                <div className="node-1 w-56 z-10 scale-90 opacity-40">
                  <Surface level="low" className="p-3 border border-indigo-500/30 rounded-xl flex items-center justify-between shadow-lg bg-surface-mid">
                    <div className="overflow-hidden">
                      <h4 className="text-xs font-bold text-slate-200 font-mono truncate">legacy_core_renderer.cpp</h4>
                      <p className="text-[9px] text-indigo-400 font-mono">Source Entry Node &bull; 1,840 LOC</p>
                    </div>
                    <FileCode className="h-4 w-4 text-indigo-400 shrink-0" />
                  </Surface>
                </div>

                {/* Connected Leaves (Bottom Row) */}
                <div className="grid grid-cols-3 gap-3 w-full z-10 select-none">
                  {/* Leaf 1: transform_matrix.h */}
                  <div className="node-2 flex flex-col justify-between h-24 translate-y-4 opacity-0">
                    <Surface level="mid" className="p-2.5 border border-indigo-500/20 rounded-xl flex flex-col justify-between h-full bg-surface-mid">
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-300 font-mono truncate">transform_matrix.h</h4>
                        <p className="text-[8px] text-slate-500 font-mono">Header buffer</p>
                      </div>
                      <div className="flex items-center gap-1 text-[8px] text-indigo-400 font-mono">
                        <span>Imported</span>
                        <ArrowRight className="h-2 w-2" />
                      </div>
                    </Surface>
                  </div>

                  {/* Leaf 2: math_utils.f */}
                  <div className="node-3 flex flex-col justify-between h-24 translate-y-4 opacity-0">
                    <Surface level="mid" className="p-2.5 border border-amber-500/20 rounded-xl flex flex-col justify-between h-full bg-surface-mid">
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-300 font-mono truncate">math_utils.f</h4>
                        <p className="text-[8px] text-slate-500 font-mono">Fortran calculations</p>
                      </div>
                      <div className="flex items-center gap-1 text-[8px] text-amber-400 font-mono">
                        <span>Linked code</span>
                        <ArrowRight className="h-2 w-2" />
                      </div>
                    </Surface>
                  </div>

                  {/* Leaf 3: user_schema.sql */}
                  <div className="node-4 flex flex-col justify-between h-24 translate-y-4 opacity-0">
                    <Surface level="mid" className="p-2.5 border border-purple-500/20 rounded-xl flex flex-col justify-between h-full bg-surface-mid">
                      <div>
                        <h4 className="text-[10px] font-bold text-slate-300 font-mono truncate">user_schema.sql</h4>
                        <p className="text-[8px] text-slate-500 font-mono">DB schema references</p>
                      </div>
                      <div className="flex items-center gap-1 text-[8px] text-purple-400 font-mono">
                        <span>Queries table</span>
                        <ArrowRight className="h-2 w-2" />
                      </div>
                    </Surface>
                  </div>
                </div>
              </div>

              {/* Status bar details showing metrics details */}
              <div className="text-[9px] font-mono text-slate-500 border-t border-white/5 pt-3 flex justify-between select-none">
                <span>RECURSIVE GRAPH RESOLUTION</span>
                <span className="status-indexed hidden text-indigo-400 animate-pulse">4 Nodes Indexed Successfully</span>
                <span className="status-mapping">Mapping connections...</span>
              </div>
            </GlassPanel>
          </FadeIn>
        </div>
      </div>
    </SceneBase>
  );
}

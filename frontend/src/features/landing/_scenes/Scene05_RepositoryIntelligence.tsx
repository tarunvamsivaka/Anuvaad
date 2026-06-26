"use client";

import React from "react";
import { SceneProps } from "../_types";
import { GitBranch, ArrowRight, Network, FileCode } from "lucide-react";
import { useGsapContext, isMotionSafe } from "@/lib/motion";
import gsap from "gsap";

export function Scene05_RepositoryIntelligence({ id, active, progress }: SceneProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const tlRef = React.useRef<gsap.core.Timeline | null>(null);
  const { getContext } = useGsapContext(containerRef);

  const pathLength = 120;

  React.useEffect(() => {
    if (!isMotionSafe()) return;
    let isMounted = true;
    let ctx: gsap.Context;
    getContext().then((context) => {
      if (!isMounted) return;
      ctx = context;
      ctx.add(() => {
        const tl = gsap.timeline({ paused: true });
        tl.fromTo(".node-1", { scale: 0.9, opacity: 0.4 }, { scale: 1, opacity: 1, duration: 0.1 }, 0.2);
        tl.fromTo(".svg-path", { strokeDashoffset: 120 }, { strokeDashoffset: 0, duration: 0.5, ease: "none" }, 0.2);
        tl.fromTo(".node-2", { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.1 }, 0.45);
        tl.fromTo(".node-3", { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.1 }, 0.6);
        tl.fromTo(".node-4", { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.1 }, 0.75);
        tl.set(".status-mapping", { display: "none" }, 0.75);
        tl.set(".status-indexed", { display: "inline-block" }, 0.75);
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
        <span className="text-[10px] tracking-widest font-extrabold uppercase px-2 py-0.5 rounded-full text-neutral-500 bg-neutral-100 border border-neutral-200">
          05 / Repository Intelligence
        </span>
        <span className="text-[10px] font-mono text-neutral-400">SCENE_CONTEXT</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full max-w-6xl mx-auto">
        {/* Left */}
        <div className="lg:col-span-5 flex flex-col justify-center space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-500 text-xs font-mono w-fit">
            <Network className="h-3.5 w-3.5" />
            <span>GLOBAL REPOSITORY CONTEXT</span>
          </div>

          <h2 className="wispr-headline text-neutral-900" style={{ fontSize: "clamp(32px, 5vw, 56px)" }}>
            Repository-Wide{" "}
            <span className="italic" style={{ color: "#d97706" }}>Intelligence.</span>
          </h2>

          <p className="text-[15px] text-neutral-500 leading-relaxed">
            Files do not run in isolation. Anuvaad maps the entire workspace — analyzing header imports, database schemas, local configurations, and build recipes to compile a unified index.
          </p>

          <div className="flex items-center gap-3">
            <div className="flex -space-x-1.5 select-none font-mono">
              <div className="h-7 w-7 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-[9px] font-bold text-red-600">C++</div>
              <div className="h-7 w-7 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-[9px] font-bold text-blue-600">TS</div>
              <div className="h-7 w-7 rounded-full bg-yellow-50 border border-yellow-200 flex items-center justify-center text-[9px] font-bold text-yellow-600">JS</div>
              <div className="h-7 w-7 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-[9px] font-bold text-emerald-600">SQL</div>
            </div>
            <span className="text-xs text-neutral-400 font-mono">Cross-language module relations</span>
          </div>
        </div>

        {/* Right: Dependency graph */}
        <div className="lg:col-span-7 flex justify-center items-center relative w-full h-[400px] lg:h-[460px]">
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-200/50 to-transparent rounded-3xl blur-2xl -z-10" />

          <div className="w-full max-w-[540px] bg-white border border-neutral-200 rounded-3xl p-6 shadow-xl relative overflow-hidden flex flex-col space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4 select-none">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-neutral-400" />
                <span className="text-xs font-semibold text-neutral-900 font-mono">Dependency Relationship Map</span>
              </div>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full border border-amber-200 text-amber-600 bg-amber-50">
                Context: 100%
              </span>
            </div>

            {/* Graph */}
            <div className="relative h-64 flex flex-col justify-between items-center py-2">
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" xmlns="http://www.w3.org/2000/svg">
                <path className="svg-path" d="M 230 45 L 90 175" fill="none" stroke="rgba(203,213,225,1)" strokeWidth="1.5" strokeDasharray={pathLength} strokeDashoffset={pathLength} />
                <path className="svg-path" d="M 230 45 L 230 175" fill="none" stroke="rgba(203,213,225,1)" strokeWidth="1.5" strokeDasharray={pathLength} strokeDashoffset={pathLength} />
                <path className="svg-path" d="M 230 45 L 370 175" fill="none" stroke="rgba(203,213,225,1)" strokeWidth="1.5" strokeDasharray={pathLength} strokeDashoffset={pathLength} />
              </svg>

              {/* Root node */}
              <div className="node-1 w-56 z-10 scale-90 opacity-40">
                <div className="p-3 border border-amber-200 rounded-2xl flex items-center justify-between shadow-sm bg-amber-50/50">
                  <div className="overflow-hidden">
                    <h4 className="text-xs font-bold text-neutral-900 font-mono truncate">legacy_core_renderer.cpp</h4>
                    <p className="text-[9px] text-amber-600 font-mono">Source Entry · 1,840 LOC</p>
                  </div>
                  <FileCode className="h-4 w-4 text-amber-500 shrink-0" />
                </div>
              </div>

              {/* Leaf nodes */}
              <div className="grid grid-cols-3 gap-3 w-full z-10 select-none">
                {[
                  { cls: "node-2", name: "transform_matrix.h", sub: "Header buffer", rel: "Imported", color: "text-amber-600" },
                  { cls: "node-3", name: "math_utils.f", sub: "Fortran calc.", rel: "Linked", color: "text-amber-600" },
                  { cls: "node-4", name: "user_schema.sql", sub: "DB references", rel: "Queries", color: "text-amber-600" },
                ].map(({ cls, name, sub, rel, color }) => (
                  <div key={cls} className={`${cls} flex flex-col justify-between h-24 translate-y-4 opacity-0`}>
                    <div className="p-2.5 border border-neutral-200 rounded-2xl flex flex-col justify-between h-full bg-neutral-50 shadow-sm">
                      <div>
                        <h4 className="text-[10px] font-bold text-neutral-900 font-mono truncate">{name}</h4>
                        <p className="text-[8px] text-neutral-500 font-mono">{sub}</p>
                      </div>
                      <div className={`flex items-center gap-1 text-[8px] font-mono ${color}`}>
                        <span>{rel}</span>
                        <ArrowRight className="h-2 w-2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-[9px] font-mono text-neutral-400 border-t border-neutral-100 pt-3 flex justify-between select-none">
              <span>RECURSIVE GRAPH RESOLUTION</span>
              <span className="status-indexed hidden text-amber-600 font-bold animate-pulse">4 Nodes Indexed Successfully</span>
              <span className="status-mapping">Mapping connections...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

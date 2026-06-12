"use client";

import React from "react";
import { SceneProps } from "../_types";
import { SceneBase } from "./SceneBase";
import { Button } from "@/design/components";
import { GlassPanel } from "@/design/primitives";
import { FadeIn, SlideUp } from "@/components/motion";
import { FolderGit2, Search, Loader2, Folder, File, ChevronRight, ChevronDown } from "lucide-react";

import { useGsapContext, isMotionSafe } from "@/lib/motion";
import gsap from "gsap";

export function Scene01_RepositoryDiscovery({ id, active, progress, globalProgress: _globalProgress }: SceneProps) {
  const repoUrl = "https://github.com/helix-corp/legacy-core";
  const containerRef = React.useRef<HTMLDivElement>(null);
  const tlRef = React.useRef<gsap.core.Timeline | null>(null);
  const { getContext } = useGsapContext(containerRef);

  const fileTree = [
    { name: "src", isDir: true, depth: 0, expanded: true },
    { name: "core", isDir: true, depth: 1, expanded: true },
    { name: "legacy_core_renderer.cpp", isDir: false, depth: 2, status: "legacy" },
    { name: "transform_matrix.h", isDir: false, depth: 2, status: "stable" },
    { name: "include", isDir: true, depth: 1, expanded: false },
    { name: "math_utils.f", isDir: false, depth: 2, status: "untracked" },
    { name: "db", isDir: true, depth: 0, expanded: false },
    { name: "schema.sql", isDir: false, depth: 1, status: "stable" }
  ];

  React.useEffect(() => {
    if (!isMotionSafe()) return;
    let ctx: gsap.Context;
    getContext().then((context) => {
      ctx = context;
      ctx.add(() => {
        const tl = gsap.timeline({ paused: true });

        // Phase 1: Typing (0 to 0.35)
        tl.fromTo(".type-target", 
          { clipPath: "inset(0 100% 0 0)" }, 
          { clipPath: "inset(0 0% 0 0)", duration: 0.35, ease: "none" },
          0
        );
        tl.to(".cursor-pulse", { opacity: 0, duration: 0.01 }, 0.35);

        // Phase 2: Indexing State (0.35 to 0.65)
        tl.set(".btn-connect", { display: "none" }, 0.35);
        tl.set(".btn-indexing", { display: "flex" }, 0.35);
        
        tl.set(".status-awaiting", { display: "none" }, 0.35);
        tl.set(".status-indexing", { display: "inline" }, 0.35);

        tl.set(".tree-empty", { display: "none" }, 0.35);
        tl.set(".tree-loading", { display: "flex" }, 0.35);

        // Phase 3: Connected State (0.65 to 1.0)
        tl.set(".btn-indexing", { display: "none" }, 0.65);
        tl.set(".btn-connected", { display: "flex" }, 0.65);
        
        tl.set(".status-indexing", { display: "none" }, 0.65);
        tl.set(".status-connected", { display: "inline" }, 0.65);
        tl.to(".status-dot", { backgroundColor: "#34d399", duration: 0.01 }, 0.65); // Emerald
        tl.set(".header-decoded", { display: "block" }, 0.65);
        tl.set(".header-awaiting", { display: "none" }, 0.65);

        tl.set(".tree-loading", { display: "none" }, 0.65);
        tl.set(".tree-loaded", { display: "block" }, 0.65);
        
        tl.fromTo(".tree-item", 
          { opacity: 0, y: 10 }, 
          { opacity: 1, y: 0, stagger: 0.04, duration: 0.25, ease: "power2.out" },
          0.65
        );

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
      sceneName="01 / The Onboarding Abyss"
      sceneNumber="SCENE_DISCOVERY"
    >
      <div ref={containerRef} className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full">
        {/* Left Column: Headline and CTAs */}
        <div className="lg:col-span-5 flex flex-col justify-center space-y-6 text-left">
          <SlideUp delay={100}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono">
              <FolderGit2 className="h-3.5 w-3.5" />
              <span>THE FIRST DAY IN A NEW CODEBASE</span>
            </div>
          </SlideUp>

          <SlideUp delay={200}>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-none">
              Lost in the{" "}
              <span className="bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
                Massive Archive.
              </span>
            </h1>
          </SlideUp>

          <SlideUp delay={300}>
            <p className="text-base sm:text-lg text-slate-400 leading-relaxed">
              Every onboarding starts the same: a checkout URL, a directory with thousands of nested folders, and zero map. You spend weeks building a mental model of the structure before writing a single line.
            </p>
          </SlideUp>

          <SlideUp delay={400}>
            <div className="flex flex-wrap gap-4 items-center">
              <span className="text-xs font-mono text-slate-500 animate-pulse">
                Scroll down to connect and index the code...
              </span>
            </div>
          </SlideUp>
        </div>

        {/* Right Column: Interactive Search Panel Mock */}
        <div className="lg:col-span-7 flex justify-center items-center relative w-full h-[400px] lg:h-[480px]">
          <div className="absolute inset-0 bg-radial-gradient from-amber-500/5 via-transparent to-transparent blur-3xl -z-10" />

          <FadeIn className="w-full max-w-[540px]">
            <GlassPanel level="amber" className="rounded-2xl p-6 shadow-2xl flex flex-col space-y-5 border border-white/10">
              {/* Repository Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <FolderGit2 className="h-5 w-5 text-amber-400 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white font-mono">Connect Repository</h3>
                    <p className="text-xs text-slate-500 font-mono">Select a codebase to map</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="status-dot h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                  <span className="text-[10px] font-mono text-slate-500">
                    <span className="status-awaiting">AWAITING_SOURCE</span>
                    <span className="status-indexing hidden">INDEXING_ACTIVE</span>
                    <span className="status-connected hidden">INDEXING_COMPLETED</span>
                  </span>
                </div>
              </div>

              {/* Search Bar with animated inputs */}
              <div className="relative w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <div className="w-full bg-surface-charcoal border border-white/5 rounded-xl pl-10 pr-24 py-3 text-sm text-slate-300 font-mono h-11 flex items-center select-none overflow-hidden whitespace-nowrap">
                  <span className="type-target inline-block">{repoUrl}</span>
                  <span className="cursor-pulse w-1.5 h-4 bg-amber-400 ml-0.5 animate-pulse inline-block" />
                </div>
                
                <div className="absolute right-1.5 top-1.5 h-8">
                  <Button className="btn-connect h-8 px-3 rounded-lg text-xs" size="sm">
                    Connect
                  </Button>
                  <Button variant="ghost" disabled className="btn-indexing hidden h-8 px-3 rounded-lg text-xs items-center gap-1.5 bg-amber-500/10 text-amber-400" size="sm">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Indexing...</span>
                  </Button>
                  <Button variant="ghost" disabled className="btn-connected hidden h-8 px-3 rounded-lg text-xs items-center gap-1 bg-emerald-500/10 text-emerald-400" size="sm">
                    <span>Connected</span>
                  </Button>
                </div>
              </div>

              {/* Interactive File System View */}
              <div className="space-y-3 flex-1 flex flex-col justify-start">
                <p className="text-[10px] font-mono font-bold text-slate-600 uppercase tracking-wider">
                  <span className="header-awaiting">Awaiting Connection...</span>
                  <span className="header-decoded hidden text-emerald-500/70">File Structure Decoded</span>
                </p>
                
                <div className="bg-surface-base border border-white/5 rounded-xl p-3 h-52 overflow-y-auto font-mono text-xs text-slate-400 space-y-1 select-none">
                  
                  <div className="tree-empty h-full flex flex-col items-center justify-center text-slate-600 space-y-2">
                    <FolderGit2 className="h-8 w-8 opacity-30" />
                    <p className="text-[10px] uppercase tracking-wider">Connect legacy repo to reveal tree</p>
                  </div>

                  <div className="tree-loading hidden h-full flex-col items-center justify-center space-y-3">
                    <Loader2 className="h-6 w-6 animate-spin text-amber-400/70" />
                    <div className="space-y-1 text-center">
                      <p className="text-[10px] text-amber-400/80 uppercase tracking-widest font-bold">Mapping dependencies</p>
                      <p className="text-[9px] text-slate-600">Resolving 1,482 code symbols...</p>
                    </div>
                  </div>

                  <div className="tree-loaded hidden space-y-1">
                    {fileTree.map((item, idx) => (
                      <div
                        key={idx}
                        className="tree-item flex items-center justify-between hover:bg-white/2 py-0.5 rounded px-1 group transition-colors"
                        style={{ paddingLeft: `${item.depth * 12 + 4}px` }}
                      >
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          {item.isDir ? (
                            <>
                              {item.expanded ? (
                                <ChevronDown className="h-3 w-3 text-slate-500 shrink-0" />
                              ) : (
                                <ChevronRight className="h-3 w-3 text-slate-500 shrink-0" />
                              )}
                              <Folder className="h-3.5 w-3.5 text-amber-500/70 shrink-0" />
                            </>
                          ) : (
                            <>
                              <span className="w-3 shrink-0" />
                              <File className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            </>
                          )}
                          <span className={`truncate ${item.status === 'legacy' ? 'text-amber-300 font-semibold' : 'text-slate-300'}`}>
                            {item.name}
                          </span>
                        </div>
                        {!item.isDir && item.status && (
                          <span className={`text-[8px] px-1 py-0.2 rounded font-semibold shrink-0 uppercase ${
                            item.status === 'legacy' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            item.status === 'stable' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          }`}>
                            {item.status}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                </div>
              </div>
            </GlassPanel>
          </FadeIn>
        </div>
      </div>
    </SceneBase>
  );
}

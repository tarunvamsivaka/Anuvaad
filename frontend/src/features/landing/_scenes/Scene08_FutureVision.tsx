"use client";

import React from "react";
import { SceneProps } from "../_types";
import { SceneBase } from "./SceneBase";
import { Surface, TypographyProse } from "@/design/primitives";
import { FadeIn, SlideUp } from "@/components/motion";
import { Landmark, Compass, Award } from "lucide-react";

import { useGsapContext, isMotionSafe } from "@/lib/motion";
import gsap from "gsap";

export function Scene08_FutureVision({ id, active, progress, globalProgress: _globalProgress }: SceneProps) {
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

        tl.fromTo(".card-1", 
          { opacity: 0, y: 24 }, 
          { opacity: 1, y: 0, duration: 0.45 }, 
          0
        );

        tl.fromTo(".card-2", 
          { opacity: 0, y: 24 }, 
          { opacity: 1, y: 0, duration: 0.5 }, 
          0.25
        );

        tlRef.current = tl;
        tl.progress(progress);
      });
    });

    return () => {
      isMounted = false;
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
      sceneName="08 / Future Vision"
      sceneNumber="SCENE_FUTURE"
    >
      <div ref={containerRef} className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full">
        {/* Left Column: Headline and Narration */}
        <div className="lg:col-span-5 flex flex-col justify-center space-y-6 text-left">
          <SlideUp delay={100}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono">
              <Compass className="h-3.5 w-3.5" />
              <span>THE ARCHIVE OF LIVING CODE</span>
            </div>
          </SlideUp>

          <SlideUp delay={200}>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              A New Way to{" "}
              <span className="bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
                Read Code.
              </span>
            </h2>
          </SlideUp>

          <SlideUp delay={300}>
            <p className="text-base text-slate-400 leading-relaxed">
              We believe a codebase is an artifact of human thought, not just instructions for a compiler. Anuvaad maps the intentions, turning obscure structures into a shared, human asset.
            </p>
          </SlideUp>
        </div>

        {/* Right Column: Key Philosophy Cards */}
        <div className="lg:col-span-7 flex justify-center items-center relative w-full h-[400px] lg:h-[480px]">
          <div className="absolute inset-0 bg-radial-gradient from-amber-500/5 via-transparent to-transparent blur-3xl -z-10 animate-pulse" />

          <FadeIn className="w-full max-w-[540px]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: Code is Archaeology */}
              <div className="card-1 opacity-0 translate-y-6">
                <Surface level="low" className="p-6 border border-white/5 rounded-2xl flex flex-col space-y-4 bg-surface-card shadow-xl">
                  <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Landmark className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-white font-mono">Code is Archaeology</h3>
                  <TypographyProse size="sm" textColor="secondary">
                    Legacy code bases store thousands of implicit design choices. Anuvaad acts as an archaeologist, surfacing those ideas in seconds.
                  </TypographyProse>
                </Surface>
              </div>

              {/* Card 2: Shared Language */}
              <div className="card-2 opacity-0 translate-y-6">
                <Surface level="low" className="p-6 border border-white/5 rounded-2xl flex flex-col space-y-4 bg-surface-card shadow-xl">
                  <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Award className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-white font-mono">A Unified Standard</h3>
                  <TypographyProse size="sm" textColor="secondary">
                    Product managers, architects, and junior engineers can finally read, inspect, and discuss execution flows using a single source of truth.
                  </TypographyProse>
                </Surface>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </SceneBase>
  );
}

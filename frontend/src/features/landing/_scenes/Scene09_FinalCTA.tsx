"use client";

import React from "react";
import { SceneProps } from "../_types";
import { SceneBase } from "./SceneBase";
import { Button } from "@/design/components";
import { FadeIn, SlideUp } from "@/components/motion";
import { Check, ArrowRight } from "lucide-react";

import { useGsapContext, isMotionSafe } from "@/lib/motion";
import gsap from "gsap";

export function Scene09_FinalCTA({ id, active, progress, globalProgress: _globalProgress }: SceneProps) {
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

        // Orb Scale and Glow
        tl.fromTo(".orb-glow", 
          { scale: 0.85, boxShadow: "0 0 0px rgba(245, 158, 11, 0.1)" }, 
          { scale: 1.1, boxShadow: "0 0 70px rgba(245, 158, 11, 0.3)", duration: 1, ease: "none" }, 
          0
        );

        tl.fromTo(".orb-core", 
          { scale: 0.85 }, 
          { scale: 1.1, duration: 1, ease: "none" }, 
          0
        );

        tl.fromTo(".orb-ring", 
          { scale: 0.85 }, 
          { scale: 1.1, duration: 1, ease: "none" }, 
          0
        );

        // Center Text
        tl.fromTo(".center-text", 
          { opacity: 0 }, 
          { opacity: 1, duration: 0.75, ease: "none" }, 
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
      sceneName="09 / Final CTA"
      sceneNumber="SCENE_FINAL"
    >
      <div ref={containerRef} className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full">
        {/* Left Column: Headline and Bullet points */}
        <div className="lg:col-span-6 flex flex-col justify-center space-y-6 text-left">
          <SlideUp delay={100}>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight font-sans">
              Start Reading Your{" "}
              <span className="bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
                Codebase today.
              </span>
            </h2>
          </SlideUp>

          <SlideUp delay={200}>
            <p className="text-base text-slate-400 leading-relaxed">
              Join thousands of developers turning cryptic repositories into readable documentation. Connect your codebase in under a minute.
            </p>
          </SlideUp>

          <SlideUp delay={300}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 font-mono text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-amber-400" />
                <span>10 FREE TRANSLATIONS/DAY</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-amber-400" />
                <span>NO CREDIT CARD REQUIRED</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-amber-400" />
                <span>35+ LANGUAGES SUPPORTED</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-amber-400" />
                <span>NATIVE GIT INTEGRATION</span>
              </div>
            </div>
          </SlideUp>

          <SlideUp delay={400}>
            <div className="flex flex-wrap gap-4 items-center pt-2">
              <Button variant="amber" size="lg" className="h-12 rounded-xl text-sm font-semibold flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_25px_rgba(245,158,11,0.4)] transition-all">
                <span>Start Free Now</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="lg" className="h-12 rounded-xl text-sm text-slate-400 hover:text-white border border-white/5 bg-white/2 hover:bg-white/5">
                Sign In to Account
              </Button>
            </div>
          </SlideUp>
        </div>

        {/* Right Column: WebGL Particle Sphere placeholder -> Replaced with beautiful glowing CSS gradient Orb */}
        <div className="lg:col-span-6 flex justify-center items-center relative w-full h-[360px] lg:h-[440px]">
          <div className="absolute inset-0 bg-radial-gradient from-amber-500/5 via-indigo-500/5 to-transparent blur-3xl -z-10 animate-pulse" />

          <FadeIn className="relative flex items-center justify-center">
            {/* Pulsing Outer Glow Aura */}
            <div 
              className="orb-glow absolute rounded-full bg-gradient-to-tr from-amber-500/10 via-indigo-500/15 to-purple-500/10 animate-[float-slow_7s_infinite_ease-in-out]"
              style={{
                width: "240px",
                height: "240px",
                filter: "blur(2px)",
              }}
            />

            {/* Core Mesh CSS Orb */}
            <div 
              className="orb-core rounded-full bg-gradient-to-tr from-amber-500/25 via-indigo-600/35 to-purple-500/25 border border-white/10 shadow-[0_0_50px_rgba(245,158,11,0.1)] flex flex-col items-center justify-center relative overflow-hidden animate-[float-slow_6s_infinite_ease-in-out] z-10"
              style={{
                width: "200px",
                height: "200px",
              }}
            >
              {/* Inner ambient shadows and highlights */}
              <div className="absolute inset-0 bg-radial-gradient from-transparent via-black/40 to-black/85 mix-blend-multiply" />
              <div className="absolute top-2 left-6 w-12 h-6 bg-white/10 blur-md rounded-full rotate-[-15deg] pointer-events-none" />

              {/* Centered code typography floating inside the orb */}
              <div className="center-text z-20 font-mono text-center opacity-0">
                <span className="text-[10px] text-amber-300/80 font-bold uppercase tracking-widest block mb-1">Anuvaad</span>
                <span className="text-[8px] text-slate-400 block font-semibold">&lt;Living Code&gt;</span>
              </div>
            </div>

            {/* Decorative orbit ring */}
            <div 
              className="orb-ring absolute border border-white/5 rounded-full z-0 pointer-events-none rotate-[30deg]"
              style={{
                width: "300px",
                height: "120px",
              }}
            />
          </FadeIn>
        </div>
      </div>
    </SceneBase>
  );
}

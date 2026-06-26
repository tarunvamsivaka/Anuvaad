"use client";

import React from "react";
import { SceneProps } from "../_types";
import { Landmark, Compass, Award } from "lucide-react";
import { useGsapContext, isMotionSafe } from "@/lib/motion";
import gsap from "gsap";

export function Scene08_FutureVision({ id, active, progress }: SceneProps) {
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
        tl.fromTo(".card-1", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.45 }, 0);
        tl.fromTo(".card-2", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5 }, 0.25);
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
        <span className="text-[10px] tracking-widest font-extrabold uppercase px-2 py-0.5 rounded-full text-amber-600 bg-amber-50 border border-amber-200">
          08 / Future Vision
        </span>
        <span className="text-[10px] font-mono text-neutral-400">SCENE_FUTURE</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full max-w-6xl mx-auto">
        {/* Left */}
        <div className="lg:col-span-5 flex flex-col justify-center space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-600 text-xs font-mono w-fit">
            <Compass className="h-3.5 w-3.5" />
            <span>THE ARCHIVE OF LIVING CODE</span>
          </div>

          <h2 className="wispr-headline text-neutral-900" style={{ fontSize: "clamp(32px, 5vw, 56px)" }}>
            A New Way to{" "}
            <span className="italic" style={{ color: "#d97706" }}>Read Code.</span>
          </h2>

          <p className="text-[15px] text-neutral-500 leading-relaxed">
            We believe a codebase is an artifact of human thought, not just instructions for a compiler. Anuvaad maps the intentions, turning obscure structures into a shared, human asset.
          </p>
        </div>

        {/* Right: Philosophy cards */}
        <div className="lg:col-span-7 flex justify-center items-center relative w-full h-[400px] lg:h-[460px]">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent rounded-3xl blur-2xl -z-10" />

          <div className="w-full max-w-[540px] grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Card 1 */}
            <div className="card-1 opacity-0 translate-y-6 md:mt-8">
              <div className="bg-white border border-neutral-200 rounded-3xl p-6 flex flex-col space-y-4 shadow-xl">
                <div className="h-8 w-8 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  <Landmark className="h-4 w-4" />
                </div>
                <h3
                  className="text-[17px] text-neutral-900 leading-snug"
                  style={{ fontFamily: "var(--font-garamond, Georgia, serif)", fontWeight: 500 }}
                >
                  Code is Archaeology
                </h3>
                <p className="text-[13px] text-neutral-500 leading-relaxed">
                  Legacy code bases store thousands of implicit design choices. Anuvaad acts as an archaeologist, surfacing those ideas in seconds.
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="card-2 opacity-0 translate-y-6">
              <div className="bg-white border border-neutral-200 rounded-3xl p-6 flex flex-col space-y-4 shadow-xl">
                <div className="h-8 w-8 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-center justify-center text-neutral-500">
                  <Award className="h-4 w-4" />
                </div>
                <h3
                  className="text-[17px] text-neutral-900 leading-snug"
                  style={{ fontFamily: "var(--font-garamond, Georgia, serif)", fontWeight: 500 }}
                >
                  A Unified Standard
                </h3>
                <p className="text-[13px] text-neutral-500 leading-relaxed">
                  Product managers, architects, and junior engineers can finally read, inspect, and discuss execution flows using a single source of truth.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

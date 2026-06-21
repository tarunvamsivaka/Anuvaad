"use client";

import React from "react";
import { SceneProps } from "../_types";
import { SceneBase } from "./SceneBase";
import { CodeSurface, GlassPanel, TypographyProse } from "@/design/primitives";
import { SlideUp } from "@/components/motion";
import { MessageSquareCode, FileCode, ArrowRight } from "lucide-react";

import { useGsapContext, isMotionSafe } from "@/lib/motion";
import gsap from "gsap";

export function Scene04_Understanding({ id, active, progress, globalProgress: _globalProgress }: SceneProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const tlRef = React.useRef<gsap.core.Timeline | null>(null);
  const { getContext } = useGsapContext(containerRef);

  const fullTranslationText = "First, this function executes a safety check to ensure both the node context and matrix parameters are allocated. If the flags authorize active rendering, it performs a matrix multiplication of the current node transform matrix, producing a temporary submatrix mapping.";
  const words = fullTranslationText.split(" ");

  React.useEffect(() => {
    if (!isMotionSafe()) return;
    let isMounted = true;
    let ctx: gsap.Context;
    getContext().then((context) => {
      if (!isMounted) return;
      ctx = context;
      ctx.add(() => {
        const tl = gsap.timeline({ paused: true });

        // Left panel fade and shift
        tl.fromTo(".left-panel", { opacity: 1 }, { opacity: 0.2, duration: 0.5 }, 0);
        tl.fromTo(".left-panel", { x: 0 }, { x: -15, duration: 1, ease: "none" }, 0);

        // Right panel slide in
        tl.fromTo(".right-panel", 
          { opacity: 0, x: 20 }, 
          { opacity: 1, x: 0, duration: 0.5, ease: "power2.out" }, 
          0.15
        );

        // Typewriter effect (words fade in)
        tl.to(".type-word", { opacity: 1, duration: 0.01, stagger: 0.6 / words.length }, 0.2);

        // Crystallized glow (0.8)
        tl.to(".translation-card", { 
          borderColor: "rgba(245, 158, 11, 0.3)", // amber-500/30
          boxShadow: "0 0 20px rgba(245, 158, 11, 0.1)", 
          duration: 0.2 
        }, 0.8);

        tl.set(".badge-decoded", { display: "inline-block" }, 0.8);
        tl.fromTo(".badge-decoded", { opacity: 0 }, { opacity: 1, duration: 0.1 }, 0.8);
        
        tl.to(".cursor-pulse", { opacity: 0, duration: 0.01 }, 0.8);

        tlRef.current = tl;
        tl.progress(progress);
      });
    });

    return () => {
      isMounted = false;
      ctx?.revert();
    };
  }, [getContext, words.length]);

  React.useEffect(() => {
    if (tlRef.current) {
      tlRef.current.progress(progress);
    }
  }, [progress]);

  return (
    <SceneBase
      id={id}
      active={active}
      sceneName="04 / Code-to-Understanding"
      sceneNumber="SCENE_UNDERSTANDING"
    >
      <div ref={containerRef} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full">
        {/* Left Column: Headline and Narration */}
        <div className="lg:col-span-4 flex flex-col justify-center space-y-6 text-left">
          <SlideUp delay={100}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono">
              <MessageSquareCode className="h-3.5 w-3.5" />
              <span>COGNITIVE ACCELERATION</span>
            </div>
          </SlideUp>

          <SlideUp delay={200}>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Not Syntax.{"  "}
              <span className="bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
                Intent.
              </span>
            </h2>
          </SlideUp>

          <SlideUp delay={300}>
            <p className="text-sm text-slate-400 leading-relaxed">
              Anuvaad compiles structural tokens directly into human explanations. It lifts the semantic fog so you understand what the previous developer actually intended to build.
            </p>
          </SlideUp>

          <SlideUp delay={400}>
            <p className="text-xs italic font-serif text-amber-400/80 pl-4 border-l-2 border-amber-500/30 leading-relaxed">
              &ldquo;Instead of deciphering bitwise flags, I read it as plain English. In five seconds, the entire refactoring risk was clear.&rdquo;
            </p>
          </SlideUp>
        </div>

        {/* Right Column: Code and Translation Split View */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch relative w-full min-h-[360px]">
          <div className="absolute inset-0 bg-radial-gradient from-amber-500/5 via-transparent to-transparent blur-3xl -z-10 animate-pulse" />

          {/* Left panel: Fading Code block */}
          <div className="left-panel flex flex-col justify-between">
            <CodeSurface className="rounded-2xl p-5 shadow-xl h-full border border-white/5 bg-surface-card flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-slate-500 border-b border-white/5 pb-3 mb-3 font-mono text-[9px] select-none">
                  <FileCode className="h-3.5 w-3.5" />
                  <span>legacy_core_renderer.cpp &bull; block_1</span>
                </div>
                <div className="font-mono text-[11px] leading-relaxed text-slate-400 space-y-1 select-none">
                  <p className="text-red-500/40">{"// Safety matrix validation block"}</p>
                  <p>if (n == NULL || m == NULL) return;</p>
                  <p>if ((flags &amp; 0x01) &amp;&amp; !(n-&gt;status &amp; NODE_ACTIVE)) &#123;</p>
                  <p className="pl-4">float* sub_m = (float*)malloc(16 * sizeof(float));</p>
                  <p className="pl-4">_matrix_multiply(n-&gt;transform, m, sub_m);</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-[8px] font-mono text-slate-600 mt-4 select-none">
                <span>C++ POINTER ARRAY</span>
                <span className="flex items-center gap-1 text-amber-400/70">
                  <span>Translating</span>
                  <ArrowRight className="h-2.5 w-2.5 animate-pulse" />
                </span>
              </div>
            </CodeSurface>
          </div>

          {/* Right panel: Emerging English Translation block */}
          <div className="right-panel flex flex-col justify-between opacity-0 translate-x-5">
            <GlassPanel 
              level="amber" 
              className="translation-card rounded-2xl p-5 shadow-xl h-full flex flex-col justify-between border border-white/5"
            >
              <div>
                <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-3 select-none">
                  <span className="text-[9px] font-mono text-amber-400 font-bold tracking-wider">
                    ENGLISH TRANSLATION
                  </span>
                  <span className="badge-decoded hidden text-[8px] font-mono bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-bold">
                    DECODED
                  </span>
                </div>
                
                <div className="min-h-[120px]">
                  <TypographyProse size="sm" textColor="primary" className="leading-relaxed">
                    {words.map((word, i) => (
                      <span key={i} className="type-word opacity-0 inline-block mr-1">
                        {word}
                      </span>
                    ))}
                    <span className="cursor-pulse w-1.5 h-3.5 bg-amber-400 ml-0.5 animate-pulse inline-block align-middle" />
                  </TypographyProse>
                </div>
              </div>

              <div className="flex items-center justify-between text-[8px] font-mono text-slate-500 mt-4 border-t border-white/5 pt-3 select-none">
                <span>BLOCK 1 OF 14</span>
                <span>LORA SERIF ITALIC</span>
              </div>
            </GlassPanel>
          </div>
        </div>
      </div>
    </SceneBase>
  );
}

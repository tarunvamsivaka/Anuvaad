"use client";

import React from "react";
import { SceneProps } from "../_types";
import { MessageSquareCode, FileCode, ArrowRight } from "lucide-react";
import { useGsapContext, isMotionSafe } from "@/lib/motion";
import gsap from "gsap";

export function Scene04_Understanding({ id, active, progress }: SceneProps) {
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
        tl.fromTo(".left-panel", { opacity: 1 }, { opacity: 0.25, duration: 0.5 }, 0);
        tl.fromTo(".left-panel", { x: 0 }, { x: -15, duration: 1, ease: "none" }, 0);
        tl.fromTo(".right-panel", { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 0.5, ease: "power2.out" }, 0.15);
        tl.to(".type-word", { opacity: 1, duration: 0.01, stagger: 0.6 / words.length }, 0.2);
        tl.to(".translation-card", {
          borderColor: "rgba(217,119,6,0.4)",
          boxShadow: "0 8px 30px rgba(217,119,6,0.15)",
          duration: 0.2
        }, 0.8);
        tl.set(".badge-decoded", { display: "inline-block" }, 0.8);
        tl.fromTo(".badge-decoded", { opacity: 0 }, { opacity: 1, duration: 0.1 }, 0.8);
        tl.to(".cursor-pulse", { opacity: 0, duration: 0.01 }, 0.8);
        tlRef.current = tl;
        tl.progress(progress);
      });
    });
    return () => { isMounted = false; ctx?.revert(); };
  }, [getContext, words.length]);

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
          04 / Code-to-Understanding
        </span>
        <span className="text-[10px] font-mono text-neutral-400">SCENE_UNDERSTANDING</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full max-w-6xl mx-auto">
        {/* Left: Copy */}
        <div className="lg:col-span-4 flex flex-col justify-center space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-600 text-xs font-mono w-fit">
            <MessageSquareCode className="h-3.5 w-3.5" />
            <span>COGNITIVE ACCELERATION</span>
          </div>

          <h2 className="wispr-headline text-neutral-900" style={{ fontSize: "clamp(32px, 4.5vw, 52px)" }}>
            Not Syntax.{" "}
            <span className="italic" style={{ color: "#d97706" }}>Intent.</span>
          </h2>

          <p className="text-[15px] text-neutral-500 leading-relaxed">
            Anuvaad compiles structural tokens directly into human explanations. It lifts the semantic fog so you understand what the previous developer actually intended to build.
          </p>

          <blockquote
            className="pl-4 border-l-2 border-amber-300 text-[14px] leading-relaxed"
            style={{ fontFamily: "var(--font-garamond, Georgia, serif)", fontStyle: "italic", color: "rgba(180,83,9,0.85)" }}
          >
            &ldquo;Instead of deciphering bitwise flags, I read it as plain English. In five seconds, the entire refactoring risk was clear.&rdquo;
          </blockquote>
        </div>

        {/* Right: Split view code → english */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch relative w-full min-h-[360px]">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent rounded-3xl blur-2xl -z-10" />

          {/* Code panel */}
          <div className="left-panel flex flex-col justify-between">
            <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)] h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-neutral-500 border-b border-neutral-100 pb-3 mb-3 font-mono text-[9px] select-none">
                  <FileCode className="h-3.5 w-3.5" />
                  <span>legacy_core_renderer.cpp · block_1</span>
                </div>
                <div className="font-mono text-[11px] leading-relaxed text-slate-500 space-y-1 select-none">
                  <p className="text-red-600/70 font-semibold">{"// Safety matrix validation block"}</p>
                  <p>if (n == NULL || m == NULL) return;</p>
                  <p>if ((flags &amp; 0x01) &amp;&amp; !(n-&gt;status &amp; NODE_ACTIVE)) &#123;</p>
                  <p className="pl-4">float* sub_m = (float*)malloc(16 * sizeof(float));</p>
                  <p className="pl-4">_matrix_multiply(n-&gt;transform, m, sub_m);</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-[8px] font-mono text-neutral-400 mt-4 select-none">
                <span>C++ POINTER ARRAY</span>
                <span className="flex items-center gap-1 text-amber-500/80">
                  <span>Translating</span>
                  <ArrowRight className="h-2.5 w-2.5 animate-pulse" />
                </span>
              </div>
            </div>
          </div>

          {/* English translation panel */}
          <div className="right-panel flex flex-col justify-between opacity-0 translate-x-5">
            <div className="translation-card bg-white border border-neutral-200 rounded-3xl p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)] h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-neutral-100 pb-3 mb-3 select-none">
                  <span className="text-[9px] font-mono text-amber-600 font-bold tracking-wider">ENGLISH TRANSLATION</span>
                  <span className="badge-decoded hidden text-[8px] font-mono bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full font-bold">
                    DECODED
                  </span>
                </div>
                <div className="min-h-[120px]">
                  <p
                    className="text-[14px] leading-relaxed text-neutral-700"
                    style={{ fontFamily: "var(--font-garamond, Georgia, serif)", fontStyle: "italic" }}
                  >
                    {words.map((word, i) => (
                      <span key={i} className="type-word opacity-0 inline-block mr-1">{word}</span>
                    ))}
                    <span className="cursor-pulse w-1.5 h-3.5 bg-amber-500 ml-0.5 animate-pulse inline-block align-middle" />
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between text-[8px] font-mono text-neutral-400 mt-4 border-t border-neutral-100 pt-3 select-none">
                <span>BLOCK 1 OF 14</span>
                <span>PLAIN ENGLISH</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

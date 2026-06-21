"use client";

import React from "react";
import { SceneProps } from "../_types";
import { SceneBase } from "./SceneBase";
import { CodeSurface } from "@/design/primitives";
import { FadeIn, SlideUp } from "@/components/motion";
import { RefreshCw, Edit3, CornerDownLeft } from "lucide-react";

import { useGsapContext, isMotionSafe } from "@/lib/motion";
import gsap from "gsap";

export function Scene06_EnglishModification({ id, active, progress, globalProgress: _globalProgress }: SceneProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const tlRef = React.useRef<gsap.core.Timeline | null>(null);
  const { getContext } = useGsapContext(containerRef);

  const prefix = "First, this function executes a safety check to ensure both the node context and matrix parameters are allocated. If the checks fail, ";
  const originalEnd = "return NULL.";
  const newEnd = "return an empty node structure instead of NULL.";
  const originalEndChars = originalEnd.split("");
  const newEndChars = newEnd.split("");

  React.useEffect(() => {
    if (!isMotionSafe()) return;
    let isMounted = true;
    let ctx: gsap.Context;
    getContext().then((context) => {
      if (!isMounted) return;
      ctx = context;
      ctx.add(() => {
        const tl = gsap.timeline({ paused: true });

        // Phase 2: Backspacing original text (0.3 to 0.45)
        tl.to(".orig-char", {
          opacity: 0,
          duration: 0.01,
          stagger: {
            amount: 0.15,
            from: "end"
          }
        }, 0.3);

        // Phase 3: Typing new text (0.45 to 0.8)
        tl.to(".new-char", {
          opacity: 1,
          duration: 0.01,
          stagger: {
            amount: 0.35,
            from: "start"
          }
        }, 0.45);

        // UI State Toggles
        // Cursor
        tl.set(".text-cursor", { display: "inline-block" }, 0.3);
        tl.set(".text-cursor", { display: "none" }, 0.8);

        // Status Header
        tl.set(".status-awaiting", { display: "none" }, 0.3);
        tl.set(".status-translating", { display: "inline" }, 0.3);
        tl.set(".status-translating", { display: "none" }, 0.8);
        tl.set(".status-ready", { display: "inline" }, 0.8);
        
        // Spin icon rotation
        tl.to(".spin-icon", {
          rotation: 360,
          transformOrigin: "50% 50%",
          ease: "none",
          duration: 0.5
        }, 0.3);

        // Bottom Footer
        tl.set(".footer-ctrl", { display: "none" }, 0.8);
        tl.set(".footer-compile", { display: "flex" }, 0.8);

        // Styling for the new text container (bg and padding)
        tl.to(".new-text-container", {
          backgroundColor: "rgba(245, 158, 11, 0.1)",
          paddingLeft: "4px",
          paddingRight: "4px",
          duration: 0.1
        }, 0.45);

        tlRef.current = tl;
        tl.progress(progress);
      });
    });

    return () => {
      isMounted = false;
      ctx?.revert();
    };
  }, [getContext, originalEndChars.length, newEndChars.length]);

  React.useEffect(() => {
    if (tlRef.current) {
      tlRef.current.progress(progress);
    }
  }, [progress]);

  // No more react state rendering variables.

  return (
    <SceneBase
      id={id}
      active={active}
      sceneName="06 / English Modification"
      sceneNumber="SCENE_EDIT"
    >
      <div ref={containerRef} className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full">
        {/* Left Column: Headline and Narration */}
        <div className="lg:col-span-5 flex flex-col justify-center space-y-6 text-left">
          <SlideUp delay={100}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono">
              <Edit3 className="h-3.5 w-3.5" />
              <span>BIDIRECTIONAL COMPILATION</span>
            </div>
          </SlideUp>

          <SlideUp delay={200}>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Modify in{" "}
              <span className="bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
                Natural English.
              </span>
            </h2>
          </SlideUp>

          <SlideUp delay={300}>
            <p className="text-base text-slate-400 leading-relaxed">
              Updating legacy code shouldn&apos;t require writing memory allocators. Anuvaad maps the explanation block to the syntax AST. You modify the English instruction directly, and let the system compile it back.
            </p>
          </SlideUp>

          <SlideUp delay={400}>
            <p className="text-xs text-slate-500 font-mono italic">
              Scroll to edit the safety return logic...
            </p>
          </SlideUp>
        </div>

        {/* Right Column: Editable translation mock */}
        <div className="lg:col-span-7 flex justify-center items-center relative w-full h-[400px] lg:h-[480px]">
          <div className="absolute inset-0 bg-radial-gradient from-amber-500/5 via-transparent to-transparent blur-3xl -z-10 animate-pulse" />

          <FadeIn className="w-full max-w-[540px]">
            <CodeSurface className="rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-col space-y-4 border border-white/5 bg-surface-card">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4 select-none">
                <span className="text-[10px] font-mono text-amber-400 font-semibold tracking-wider flex items-center gap-1.5">
                  <Edit3 className="h-3.5 w-3.5" />
                  EDITING INTERFACE
                </span>
                <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1.5">
                  <RefreshCw className="spin-icon h-3.5 w-3.5 text-amber-400" />
                  <span className="status-awaiting">AWAITING_INPUT</span>
                  <span className="status-translating hidden">TRANSLATING_BACK...</span>
                  <span className="status-ready hidden">SYNCHRONIZATION_READY</span>
                </span>
              </div>

              {/* Editable Content Mock with simulated editing */}
              <div className="bg-surface-card border border-white/5 p-5 rounded-xl font-mono text-xs leading-relaxed text-slate-300 relative min-h-[140px] flex items-start select-none">
                <p className="font-serif italic text-slate-300 text-sm leading-relaxed">
                  {prefix}
                  <span className="text-slate-400 absolute">
                    {originalEndChars.map((char, i) => (
                      <span key={i} className="orig-char">{char}</span>
                    ))}
                  </span>
                  <span className="new-text-container underline decoration-amber-500 text-amber-300 font-bold rounded transition-colors duration-300">
                    {newEndChars.map((char, i) => (
                      <span key={i} className="new-char opacity-0">{char}</span>
                    ))}
                  </span>
                  <span className="text-cursor hidden w-1.5 h-4 bg-amber-400 ml-0.5 animate-pulse align-middle" />
                </p>
              </div>

              {/* Bottom Instructions / Compile prompt */}
              <div className="text-[9px] font-mono text-slate-600 flex justify-between select-none pt-2 border-t border-white/5">
                <span>PRESS ESC TO ABORT</span>
                <span className="footer-ctrl">CTRL+ENTER TO CONVERT TO C++</span>
                <span className="footer-compile hidden text-amber-400 items-center gap-1 animate-pulse font-bold">
                  <span>COMPILE MANUAL SYNC</span>
                  <CornerDownLeft className="h-2.5 w-2.5" />
                </span>
              </div>
            </CodeSurface>
          </FadeIn>
        </div>
      </div>
    </SceneBase>
  );
}

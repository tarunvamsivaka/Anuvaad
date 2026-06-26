"use client";

import React from "react";
import { SceneProps } from "../_types";
import { RefreshCw, Edit3, CornerDownLeft } from "lucide-react";
import { useGsapContext, isMotionSafe } from "@/lib/motion";
import gsap from "gsap";

export function Scene06_EnglishModification({ id, active, progress }: SceneProps) {
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
        tl.to(".orig-char", { opacity: 0, duration: 0.01, stagger: { amount: 0.15, from: "end" } }, 0.3);
        tl.to(".new-char", { opacity: 1, duration: 0.01, stagger: { amount: 0.35, from: "start" } }, 0.45);
        tl.set(".text-cursor", { display: "inline-block" }, 0.3);
        tl.set(".text-cursor", { display: "none" }, 0.8);
        tl.set(".status-awaiting", { display: "none" }, 0.3);
        tl.set(".status-translating", { display: "inline" }, 0.3);
        tl.set(".status-translating", { display: "none" }, 0.8);
        tl.set(".status-ready", { display: "inline" }, 0.8);
        tl.to(".spin-icon", { rotation: 360, transformOrigin: "50% 50%", ease: "none", duration: 0.5 }, 0.3);
        tl.set(".footer-ctrl", { display: "none" }, 0.8);
        tl.set(".footer-compile", { display: "flex" }, 0.8);
        tl.to(".new-text-container", { backgroundColor: "rgba(217,119,6,0.1)", paddingLeft: "4px", paddingRight: "4px", duration: 0.1 }, 0.45);
        tlRef.current = tl;
        tl.progress(progress);
      });
    });
    return () => { isMounted = false; ctx?.revert(); };
  }, [getContext, originalEndChars.length, newEndChars.length]);

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
          06 / English Modification
        </span>
        <span className="text-[10px] font-mono text-neutral-400">SCENE_EDIT</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full max-w-6xl mx-auto">
        {/* Left */}
        <div className="lg:col-span-5 flex flex-col justify-center space-y-6 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-600 text-xs font-mono w-fit">
            <Edit3 className="h-3.5 w-3.5" />
            <span>BIDIRECTIONAL COMPILATION</span>
          </div>

          <h2 className="wispr-headline text-neutral-900" style={{ fontSize: "clamp(32px, 5vw, 56px)" }}>
            Modify in{" "}
            <span className="italic" style={{ color: "#d97706" }}>Natural English.</span>
          </h2>

          <p className="text-[15px] text-neutral-500 leading-relaxed">
            Updating legacy code shouldn&apos;t require writing memory allocators. Anuvaad maps the explanation block to the syntax AST. You modify the English instruction directly, and let the system compile it back.
          </p>

          <p className="text-xs text-neutral-400 font-mono italic">
            Scroll to edit the safety return logic...
          </p>
        </div>

        {/* Right: Editable translation mock */}
        <div className="lg:col-span-7 flex justify-center items-center relative w-full h-[400px] lg:h-[460px]">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent rounded-3xl blur-2xl -z-10" />

          <div className="w-full max-w-[540px] bg-white border border-neutral-200 rounded-3xl p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)] relative overflow-hidden flex flex-col space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-100 pb-4 select-none">
              <span className="text-[10px] font-mono text-amber-600 font-semibold tracking-wider flex items-center gap-1.5">
                <Edit3 className="h-3.5 w-3.5" />
                EDITING INTERFACE
              </span>
              <span className="text-[10px] font-mono text-neutral-400 flex items-center gap-1.5">
                <RefreshCw className="spin-icon h-3.5 w-3.5 text-amber-500" />
                <span className="status-awaiting">AWAITING_INPUT</span>
                <span className="status-translating hidden">TRANSLATING_BACK...</span>
                <span className="status-ready hidden font-bold text-amber-600">SYNCHRONIZATION_READY</span>
              </span>
            </div>

            {/* Editable mock */}
            <div className="bg-neutral-50 border border-neutral-200 p-5 rounded-2xl font-mono text-xs leading-relaxed text-neutral-500 relative min-h-[140px] flex items-start select-none shadow-sm">
              <p
                className="text-[14px] leading-relaxed"
                style={{ fontFamily: "var(--font-garamond, Georgia, serif)", fontStyle: "italic", color: "rgba(64,64,64,1)" }}
              >
                {prefix}
                <span className="text-neutral-400 absolute">
                  {originalEndChars.map((char, i) => (
                    <span key={i} className="orig-char">{char}</span>
                  ))}
                </span>
                <span className="new-text-container underline decoration-amber-500 text-amber-700 font-bold rounded transition-colors duration-300">
                  {newEndChars.map((char, i) => (
                    <span key={i} className="new-char opacity-0">{char}</span>
                  ))}
                </span>
                <span className="text-cursor hidden w-1.5 h-4 bg-amber-500 ml-0.5 animate-pulse align-middle" />
              </p>
            </div>

            <div className="text-[9px] font-mono text-neutral-400 flex justify-between select-none pt-2 border-t border-neutral-100">
              <span>PRESS ESC TO ABORT</span>
              <span className="footer-ctrl">CTRL+ENTER TO CONVERT TO C++</span>
              <span className="footer-compile hidden text-amber-600 items-center gap-1 animate-pulse font-bold">
                <span>COMPILE MANUAL SYNC</span>
                <CornerDownLeft className="h-2.5 w-2.5" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

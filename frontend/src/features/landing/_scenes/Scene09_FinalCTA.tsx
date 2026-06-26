"use client";

import React from "react";
import { SceneProps } from "../_types";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { useGsapContext, isMotionSafe } from "@/lib/motion";
import gsap from "gsap";

export function Scene09_FinalCTA({ id, progress }: SceneProps) {
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

        // Watermark rises from bottom
        tl.fromTo(
          ".wispr-watermark",
          { y: 60, opacity: 0 },
          { y: 0, opacity: 1, duration: 1, ease: "power4.out" },
          0
        );

        // Headline reveals
        tl.fromTo(
          ".cta-headline",
          { y: 40, opacity: 0, filter: "blur(8px)" },
          { y: 0, opacity: 1, filter: "blur(0px)", duration: 0.9, ease: "power4.out", stagger: 0.12 },
          0.1
        );

        // Sub text
        tl.fromTo(
          ".cta-sub",
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.7, ease: "power3.out" },
          0.4
        );

        // Check items stagger
        tl.fromTo(
          ".cta-check",
          { x: -16, opacity: 0 },
          { x: 0, opacity: 1, duration: 0.5, ease: "power3.out", stagger: 0.08 },
          0.55
        );

        // CTA buttons
        tl.fromTo(
          ".cta-buttons",
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" },
          0.7
        );

        tlRef.current = tl;
        tl.progress(progress);
      });
    });

    return () => {
      isMounted = false;
      ctx?.revert();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getContext]);

  React.useEffect(() => {
    if (tlRef.current) {
      tlRef.current.progress(progress);
    }
  }, [progress]);

  return (
    <div
      ref={containerRef}
      id={id}
      className="relative w-full h-full overflow-hidden flex flex-col items-center justify-center"
      style={{ background: "#f5f3ef" }}
    >
      {/* ── SUBTLE RADIAL GLOW ────────────────────────────────── */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(200,134,10,0.08) 0%, transparent 70%)",
        }}
      />

      {/* ── DECORATIVE DOT GRID ───────────────────────────────── */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* ── GIANT WATERMARK ───────────────────────────────────── */}
      <div className="wispr-watermark absolute bottom-0 left-0 right-0 text-center leading-none select-none overflow-hidden">
        Anuvaad
      </div>

      {/* ── MAIN CONTENT ──────────────────────────────────────── */}
      <div className="relative z-10 mx-auto max-w-3xl px-8 text-center">

        {/* Eyebrow */}
        <div className="wispr-eyebrow text-amber-500/60 mb-8">
          Ready to Understand Your Code?
        </div>

        {/* Headline — large serif like WisprFlow */}
        <h2
          className="wispr-headline text-neutral-900 mb-6"
          style={{ fontSize: "clamp(44px, 7vw, 88px)" }}
        >
          <span className="cta-headline block opacity-0">Start Reading</span>
          <span
            className="cta-headline block opacity-0"
            style={{ color: "#c8860a", fontStyle: "italic" }}
          >
            Any Codebase.
          </span>
        </h2>

        <p className="cta-sub opacity-0 text-[17px] text-neutral-500 leading-relaxed max-w-lg mx-auto mb-10">
          Join thousands of developers turning cryptic repositories into readable documentation. Connect in under a minute.
        </p>

        {/* Feature checklist */}
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 mb-10">
          {[
            "10 FREE translations / day",
            "35+ languages supported",
            "No credit card required",
            "Native Git integration",
          ].map((item) => (
            <div key={item} className="cta-check opacity-0 flex items-center gap-2 text-[13px] text-neutral-500">
              <Check className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="cta-buttons opacity-0 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/signup"
            id="final-cta-start-btn"
            className="wispr-btn-primary"
          >
            Start Free Now <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/signin"
            id="final-cta-signin-btn"
            className="wispr-btn-secondary"
          >
            Sign in to account
          </Link>
        </div>
      </div>

      {/* ── SCROLL PROGRESS DOT ── */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-1.5 rounded-full transition-all duration-500"
            style={{
              width: i === 2 ? 20 : 6,
              background: i === 2 ? "rgba(200,134,10,0.5)" : "rgba(0,0,0,0.12)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

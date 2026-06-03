"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function FinalCTA() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".final-cta-reveal",
        { opacity: 0, y: 50, filter: "blur(6px)" },
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 1.0,
          ease: "power4.out",
          stagger: 0.15,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 70%",
          },
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="landing-section relative border-t border-amber-500/8 py-40 overflow-hidden"
    >
      {/* Background — let the WebGL canvas show through, add amber vignette */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 70% 70% at 50% 50%, rgba(245,158,11,0.06) 0%, transparent 70%)",
          }}
        />
        {/* Corner fades */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#020204]/40" />
      </div>

      <div className="mx-auto max-w-4xl px-6 text-center">
        {/* Eyebrow */}
        <div className="final-cta-reveal opacity-0 mb-8 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-400/80">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
          Ready when you are
        </div>

        {/* Headline */}
        <h2
          className="final-cta-reveal opacity-0 mb-6 text-5xl font-extrabold leading-[1.08] tracking-tight text-white sm:text-6xl md:text-7xl"
          style={{ fontFamily: "var(--font-lora, Georgia, serif)" }}
        >
          Understand software{" "}
          <br className="hidden sm:block" />
          <span className="headline-gradient">like never before.</span>
        </h2>

        {/* Sub */}
        <p className="final-cta-reveal opacity-0 mx-auto mb-12 max-w-xl text-xl leading-relaxed text-slate-400">
          Start translating in seconds. Free to start.{" "}
          <span className="text-slate-300">No credit card required.</span>
        </p>

        {/* CTA Buttons */}
        <div className="final-cta-reveal opacity-0 flex flex-col items-center justify-center gap-5 sm:flex-row mb-16">
          <Link
            href="/signup"
            id="final-signup-btn"
            className="inline-flex items-center gap-2 rounded-2xl px-10 py-5 text-lg font-bold tracking-wide btn-amber-shimmer shadow-[0_0_40px_rgba(245,158,11,0.35)] hover:shadow-[0_0_60px_rgba(245,158,11,0.55)] transition-all duration-300 hover:scale-105"
          >
            Start for Free
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/signin"
            id="final-signin-btn"
            className="inline-flex items-center rounded-2xl border border-white/10 bg-white/5 px-10 py-5 text-lg font-semibold text-slate-300 backdrop-blur-md transition-all duration-300 hover:border-amber-500/30 hover:text-white hover:scale-105"
          >
            Sign In
          </Link>
        </div>

        {/* Trust micro-copy */}
        <p className="final-cta-reveal opacity-0 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
          10 free translations per day · No code stored · Cancel anytime
        </p>

        {/* Decorative separator */}
        <div className="final-cta-reveal opacity-0 mt-24 flex items-center gap-6">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-amber-500/20" />
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-500/30">Anuvaad</span>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-amber-500/20" />
        </div>
      </div>
    </section>
  );
}

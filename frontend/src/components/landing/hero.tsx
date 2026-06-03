"use client";

import { useEffect, useRef } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import gsap from "gsap";

export function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // ── GSAP HERO ENTRANCE TIMELINE ──
    const ctx = gsap.context(() => {
      const tl = gsap.timeline();

      // Fade-in badge
      tl.fromTo(
        ".hero-badge",
        { opacity: 0, scale: 0.8, y: -20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.8, ease: "back.out(1.7)" }
      );

      // Staggered letters/words reveal for title
      tl.fromTo(
        ".hero-title-reveal",
        { opacity: 0, y: 50, rotateX: -20 },
        { opacity: 1, y: 0, rotateX: 0, duration: 1.0, ease: "power4.out", stagger: 0.15 },
        "-=0.5"
      );

      // Fade in subheadline
      tl.fromTo(
        ".hero-sub",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" },
        "-=0.6"
      );

      // Slide and scale CTAs
      tl.fromTo(
        ".hero-ctas",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" },
        "-=0.6"
      );

      // Rise and perspective tilt for mockup
      tl.fromTo(
        ".hero-mockup",
        { opacity: 0, y: 100, rotateX: 15, scale: 0.95 },
        { opacity: 1, y: 0, rotateX: 0, scale: 1, duration: 1.2, ease: "power4.out" },
        "-=0.8"
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className="relative overflow-hidden pt-24 md:pt-36">
      {/* Background radial gradient glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center">
        <div className="absolute h-[600px] w-[800px] rounded-full bg-gradient-to-tr from-indigo-500/10 via-purple-500/10 to-cyan-500/5 blur-3xl opacity-60" />
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-24 md:pb-36">
        <div className="mx-auto max-w-3xl text-center">
          {/* Announcement badge */}
          <div className="hero-badge inline-block opacity-0">
            <Badge
              variant="secondary"
              className="mb-6 gap-1.5 border-indigo-500/20 bg-indigo-500/5 px-3.5 py-1.5 text-[11px] font-semibold tracking-wider text-indigo-300 uppercase shadow-[0_0_15px_rgba(99,102,241,0.1)] backdrop-blur-md"
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
              Powered by Groq and DeepSeek V3 / R1
            </Badge>
          </div>

          {/* Cinematic Reveal Headline */}
          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl md:text-7xl perspective-1000">
            <div className="hero-title-reveal inline-block opacity-0">Understand Any</div>{" "}
            <div className="hero-title-reveal inline-block bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent font-black opacity-0">
              Codebase
            </div>{" "}
            <div className="hero-title-reveal inline-block opacity-0">Instantly</div>
          </h1>

          {/* Subheadline */}
          <p className="hero-sub mx-auto mt-8 max-w-xl text-lg leading-relaxed text-slate-300 opacity-0">
            AI-powered code explanations, reverse engineering, and instant code
            translation. Stop struggling with legacy files.
          </p>

          {/* CTA buttons */}
          <div className="hero-ctas mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row opacity-0">
            <Link
              href="/signup"
              className={cn(
                buttonVariants({ size: "lg" }),
                "gap-2 text-base font-semibold px-8 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-[0_0_25px_rgba(99,102,241,0.4)] hover:shadow-[0_0_35px_rgba(99,102,241,0.6)] border-none transition-all duration-300 hover:scale-105"
              )}
            >
              Start Free <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#features"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "text-base font-semibold px-8 border-white/10 hover:bg-white/5 backdrop-blur-md transition-all duration-300 hover:scale-105"
              )}
            >
              See How It Works
            </a>
          </div>

          {/* Secondary stats */}
          <p className="hero-sub mt-8 text-xs tracking-wider text-slate-400 uppercase opacity-0">
            Free to start · No credit card required · 10 translations/day
          </p>
        </div>

        {/* Product screenshot mockup */}
        <div className="hero-mockup relative mx-auto mt-20 max-w-4xl opacity-0 transform-style-3d">
          <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 opacity-20 blur-xl" />
          
          <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#060613]/80 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-lg">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 border-b border-white/5 bg-white/5 px-4 py-3">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500/40" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/40" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-500/40" />
              </div>
              <div className="ml-3 flex-1 rounded-md bg-[#030014]/40 px-3 py-1 text-center text-xs tracking-widest text-indigo-400/60 font-semibold uppercase">
                anuvaad.dev
              </div>
            </div>

            {/* Code + Translation split view mockup */}
            <div className="grid min-h-[320px] grid-cols-1 md:grid-cols-2">
              {/* Left: Code panel */}
              <div className="border-b border-white/5 bg-[#030014]/60 p-5 md:border-b-0 md:border-r">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-400/60">
                  Source Code
                </p>
                <pre className="font-mono text-xs leading-relaxed text-slate-300">
                  <code>
                    <span className="text-pink-400">def</span>{" "}
                    <span className="text-cyan-300 font-semibold">fibonacci</span>
                    <span className="text-slate-400">(</span>
                    <span className="text-orange-300">n</span>
                    <span className="text-slate-400">):</span>
                    {"\n"}
                    <span className="text-slate-500">{"    "}# Base cases</span>
                    {"\n"}
                    {"    "}
                    <span className="text-purple-400">if</span>{" "}
                    <span className="text-slate-300">n &lt;= </span>
                    <span className="text-cyan-400">1</span>
                    <span className="text-slate-400">:</span>
                    {"\n"}
                    {"        "}
                    <span className="text-purple-400">return</span>{" "}
                    <span className="text-slate-300">n</span>
                    {"\n"}
                    {"    "}
                    <span className="text-purple-400">return</span>{" "}
                    <span className="text-cyan-300">fibonacci</span>
                    <span className="text-slate-400">(</span>
                    <span className="text-slate-300">n-1</span>
                    <span className="text-slate-400">)</span>{" "}
                    <span className="text-slate-300">+</span>{" "}
                    <span className="text-cyan-300">fibonacci</span>
                    <span className="text-slate-400">(</span>
                    <span className="text-slate-300">n-2</span>
                    <span className="text-slate-400">)</span>
                  </code>
                </pre>
              </div>

              {/* Right: Translation panel */}
              <div className="bg-transparent p-5">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-400/60">
                  English Translation
                </p>
                <div className="space-y-3">
                  <div className="rounded-lg border border-white/5 bg-[#030014]/40 p-3 shadow-inner">
                    <p className="mb-1 font-mono text-[9px] font-bold uppercase tracking-wider text-indigo-400">
                      Block 1
                    </p>
                    <p className="text-xs leading-relaxed text-slate-300">
                      Defines a function called{" "}
                      <code className="rounded bg-indigo-500/10 px-1 py-0.5 text-xs font-semibold text-indigo-300">
                        fibonacci
                      </code>{" "}
                      that takes one parameter{" "}
                      <code className="rounded bg-indigo-500/10 px-1 py-0.5 text-xs font-semibold text-indigo-300">
                        n
                      </code>
                      . If n is 0 or 1, it returns n directly.
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/5 bg-[#030014]/40 p-3 shadow-inner">
                    <p className="mb-1 font-mono text-[9px] font-bold uppercase tracking-wider text-indigo-400">
                      Block 2
                    </p>
                    <p className="text-xs leading-relaxed text-slate-300">
                      Otherwise, it recursively calls itself with{" "}
                      <code className="rounded bg-indigo-500/10 px-1 py-0.5 text-xs font-semibold text-indigo-300">
                        n-1
                      </code>{" "}
                      and{" "}
                      <code className="rounded bg-indigo-500/10 px-1 py-0.5 text-xs font-semibold text-indigo-300">
                        n-2
                      </code>
                      , adding the results together.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

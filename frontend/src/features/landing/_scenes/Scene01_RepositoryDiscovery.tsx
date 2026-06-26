"use client";

import React from "react";
import { SceneProps } from "../_types";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useGsapContext, isMotionSafe } from "@/lib/motion";
import gsap from "gsap";
import { LiveCounter } from "../_components/LiveCounter";

// Waveform bar heights
const WAVE_HEIGHTS = [16, 28, 42, 56, 68, 56, 44, 32, 20, 32, 48, 64, 52, 36, 24, 38, 54, 66, 50, 34];

// The circular arc text (mimics WisprFlow's rotating ring text)
const ARC_TEXT = "Understand Any Codebase · Read Legacy Code · Translate Instantly · ";

export function Scene01_RepositoryDiscovery({ id }: SceneProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const { getContext } = useGsapContext(containerRef);

  const [codeText, setCodeText] = React.useState(`def fibonacci(n):
  if n <= 1:
    return n
  return fibonacci(n-1) + fibonacci(n-2)`);
  const [englishText, setEnglishText] = React.useState("Recursively computes the nth Fibonacci number. Returns n directly for base cases (0 or 1), otherwise sums the two preceding values.");
  const [isTranslating, setIsTranslating] = React.useState(false);

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCodeText(e.target.value);
    setIsTranslating(true);
    setEnglishText("Analyzing custom logic...");
  };

  React.useEffect(() => {
    if (isTranslating) {
      const timer = setTimeout(() => {
        setIsTranslating(false);
        setEnglishText("Translating custom function logic into plain English structural descriptions...");
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isTranslating, codeText]);

  React.useEffect(() => {
    if (!isMotionSafe()) return;
    let isMounted = true;
    let ctx: gsap.Context;

    getContext().then((context) => {
      if (!isMounted) return;
      ctx = context;
      ctx.add(() => {
        const tl = gsap.timeline({ delay: 0.1 });

        // Eyebrow fades up
        tl.fromTo(
          ".wispr-hero-eyebrow",
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }
        );
        // Headline words stagger up
        tl.fromTo(
          ".wispr-hero-word",
          { opacity: 0, y: 40, filter: "blur(6px)" },
          {
            opacity: 1, y: 0, filter: "blur(0px)",
            duration: 1.1, ease: "power4.out", stagger: 0.1,
          },
          "-=0.4"
        );
        // Subheadline
        tl.fromTo(
          ".wispr-hero-sub",
          { opacity: 0, y: 18 },
          { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" },
          "-=0.7"
        );
        // CTAs
        tl.fromTo(
          ".wispr-hero-ctas",
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" },
          "-=0.55"
        );
        // Waveform bars stagger in
        tl.fromTo(
          ".wispr-wave-bar",
          { opacity: 0, scaleY: 0 },
          {
            opacity: 1, scaleY: 1, duration: 0.6, ease: "back.out(1.4)", stagger: 0.02,
          },
          "-=0.5"
        );
        // Demo panel
        tl.fromTo(
          ".wispr-hero-panel",
          { opacity: 0, y: 30, scale: 0.98 },
          { opacity: 1, y: 0, scale: 1, duration: 1.0, ease: "power4.out" },
          "-=0.6"
        );
        // Arc text ring
        tl.fromTo(
          ".wispr-arc-ring",
          { opacity: 0, scale: 0.85 },
          { opacity: 1, scale: 1, duration: 0.8, ease: "power3.out" },
          "-=0.8"
        );
        // Stat badges
        tl.fromTo(
          ".wispr-stat",
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", stagger: 0.09 },
          "-=0.4"
        );
      });
    });

    return () => {
      isMounted = false;
      ctx?.revert();
    };
  }, [getContext]);

  return (
    <div
      ref={containerRef}
      id={id}
      className="relative w-full min-h-screen overflow-hidden wispr-hero-bg flex flex-col"
    >
      {/* ── SUBTLE NOISE TEXTURE ───────────────────────────────── */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
        }}
      />

      {/* ── HERO CONTENT ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center pt-24 pb-8 px-6">
        <div className="mx-auto max-w-4xl text-center">

          {/* Eyebrow */}
          <div className="wispr-hero-eyebrow wispr-eyebrow text-neutral-500 mb-6 opacity-0 flex items-center justify-center gap-2">
            <span className="wispr-speaking-dot" />
            AI-Powered Code Comprehension
          </div>

          {/* Giant Serif Headline — WisprFlow style */}
          <h1 className="wispr-headline text-neutral-900 mb-5"
            style={{ fontSize: "clamp(44px, 7vw, 88px)" }}
          >
            <span className="wispr-hero-word inline-block opacity-0">Every</span>{" "}
            <span className="wispr-hero-word inline-block opacity-0">Codebase</span>{" "}
            <br className="hidden sm:block" />
            <span className="wispr-hero-word inline-block opacity-0 italic" style={{ color: "#c8860a" }}>Has a Story.</span>
          </h1>

          {/* Sub-headline */}
          <p className="wispr-hero-sub opacity-0 mx-auto mb-7 max-w-xl text-[16px] leading-relaxed text-neutral-500">
            The AI code translator that turns{" "}
            <span className="text-neutral-800 font-medium">obscure logic</span> into plain English — and plain English back into production-ready code.
          </p>

          {/* CTAs — WisprFlow style pill buttons */}
          <div className="wispr-hero-ctas opacity-0 flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
            <Link
              href="/signup"
              id="hero-get-started-btn"
              className="wispr-btn-primary shadow-[0_0_15px_rgba(200,134,10,0.4)] hover:shadow-[0_0_25px_rgba(200,134,10,0.6)] transition-all duration-500"
            >
              Start Free <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#story"
              id="hero-story-btn"
              className="wispr-btn-secondary"
            >
              See how it works ↓
            </a>
          </div>

          {/* ── ANIMATED WAVEFORM + CIRCLE ARC ─────────────────── */}
          <div className="relative flex items-center justify-center mb-14">
            {/* Rotating Arc Text Ring */}
            <div className="wispr-arc-ring opacity-0 absolute" style={{ width: 280, height: 280 }}>
              <svg
                width="280"
                height="280"
                viewBox="0 0 280 280"
                className="wispr-arc-text"
              >
                <defs>
                  <path
                    id="arcPath"
                    d="M 140,140 m -112,0 a 112,112 0 1,1 224,0 a 112,112 0 1,1 -224,0"
                  />
                </defs>
                <text
                  className="fill-neutral-400"
                  style={{ fontSize: "10.5px", fontFamily: "var(--font-sans, Inter, sans-serif)", fontWeight: 500, letterSpacing: "0.1em" }}
                >
                  <textPath href="#arcPath" startOffset="0%">
                    {ARC_TEXT}{ARC_TEXT}
                  </textPath>
                </text>
              </svg>
            </div>

            {/* Center — waveform visualizer */}
            <div className="relative z-10 flex flex-col items-center">
              <div
                className="flex items-end justify-center gap-[3px] mb-3"
                style={{ height: 80 }}
              >
                {WAVE_HEIGHTS.map((h, i) => (
                  <div
                    key={i}
                    className="wispr-wave-bar opacity-0 rounded-full"
                    style={{
                      width: 4,
                      height: h,
                      backgroundColor: i % 3 === 0 ? "#c8860a" : i % 3 === 1 ? "#a36708" : "#e8a830",
                      "--wave-dur": `${0.6 + (i % 5) * 0.18}s`,
                      "--wave-delay": `${i * 0.06}s`,
                    } as React.CSSProperties}
                  />
                ))}
              </div>

              {/* Speaking label */}
              <div className="flex items-center gap-2 text-[11px] font-medium text-neutral-400 tracking-wider uppercase">
                <span className="wispr-speaking-dot" style={{ width: 6, height: 6 }} />
                Reading your codebase...
              </div>
            </div>
          </div>

          {/* ── STAT BADGES ──────────────────────────────────────── */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="wispr-stat wispr-stat-badge opacity-0">
              <span
                className="h-2 w-2 rounded-full bg-amber-500 shrink-0"
                style={{ boxShadow: "0 0 6px rgba(200,134,10,0.6)" }}
              />
              <LiveCounter 
                initialValue={4124502} 
                prefix="Lines Translated Today: " 
                className="text-[12px] font-medium text-neutral-600 font-mono" 
              />
            </div>
            {[
              { label: "35+ Languages Supported" },
              { label: "10 Free Translations / Day" },
            ].map((s) => (
              <div key={s.label} className="wispr-stat wispr-stat-badge opacity-0">
                <span
                  className="h-2 w-2 rounded-full bg-amber-500 shrink-0"
                  style={{ boxShadow: "0 0 6px rgba(200,134,10,0.6)" }}
                />
                <span className="text-[12px] font-medium text-neutral-600">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── TRANSITION TO DARK SECTION — rounded top corners ───── */}
      <div
        className="wispr-hero-panel opacity-0 w-full mx-auto relative"
        style={{ maxWidth: "calc(100% - 48px)", marginLeft: 24, marginRight: 24 }}
      >
        <div className="wispr-dark-section-lg px-8 pt-12 pb-0 shadow-[0_-8px_60px_rgba(0,0,0,0.18)]">
          {/* Demo strip header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-red-400/60" />
              <div className="h-2 w-2 rounded-full bg-yellow-400/60" />
              <div className="h-2 w-2 rounded-full bg-green-400/60" />
            </div>
            <span className="text-[11px] font-mono text-white/25 uppercase tracking-widest">
              anuvaad · live demo
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full bg-amber-400 ${isTranslating ? 'animate-bounce' : 'animate-pulse'}`} />
              <span className="text-[10px] font-mono text-amber-400/60 uppercase tracking-widest">
                {isTranslating ? "Translating..." : "Live"}
              </span>
            </div>
          </div>

          {/* 2-col demo content */}
          <div className="grid md:grid-cols-2 gap-0 min-h-[200px]">
            {/* Left: Code (Interactive) */}
            <div className="border-r border-white/5 pr-8 pb-12 relative group">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/25 mb-3 flex items-center justify-between">
                <span>Source Code</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-amber-500/50">Edit me</span>
              </p>
              <textarea 
                value={codeText}
                onChange={handleCodeChange}
                spellCheck={false}
                className="w-full h-[150px] bg-transparent resize-none outline-none font-mono text-[13px] leading-relaxed text-slate-300 whitespace-pre-wrap select-auto focus:ring-0 focus:outline-none placeholder:text-white/10"
              />
              <span className="absolute left-[8px] top-[140px] pointer-events-none opacity-0" />
            </div>
            {/* Right: Plain English */}
            <div className="pl-8 pb-12">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-500/50 mb-3">Plain English</p>
              <p
                className={`text-[15px] leading-relaxed italic transition-all duration-500 ${isTranslating ? 'text-amber-500/80 animate-pulse' : 'text-slate-300'}`}
                style={{ fontFamily: "var(--font-garamond, Georgia, serif)" }}
              >
                {englishText}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

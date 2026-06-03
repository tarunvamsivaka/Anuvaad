"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, Play } from "lucide-react";
import gsap from "gsap";

// Code → English example pairs that cycle via typewriter
const DEMO_PAIRS = [
  {
    lang: "Python",
    code: `def fibonacci(n):\n  if n <= 1:\n    return n\n  return fibonacci(n-1) + fibonacci(n-2)`,
    english: "Recursively computes the nth Fibonacci number. Returns n directly for base cases (0 or 1), otherwise sums the two preceding values.",
  },
  {
    lang: "JavaScript",
    code: `const debounce = (fn, delay) =>\n  (...args) => {\n    clearTimeout(timer)\n    timer = setTimeout(() =>\n      fn(...args), delay)\n  }`,
    english: "Creates a delayed wrapper around a function. Cancels any pending call and restarts the timer each time it's invoked — preventing rapid-fire execution.",
  },
  {
    lang: "SQL",
    code: `SELECT u.name, COUNT(o.id)\nFROM users u\nLEFT JOIN orders o\n  ON u.id = o.user_id\nGROUP BY u.name\nHAVING COUNT(o.id) > 5`,
    english: "Lists users with more than 5 orders. Joins the users and orders tables, groups by user name, and filters to only show active customers.",
  },
];

export function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pairIndex, setPairIndex] = useState(0);
  const [codeText, setCodeText] = useState("");
  const [englishText, setEnglishText] = useState("");
  const [phase, setPhase] = useState<"typing-code" | "revealing-english" | "pause">("typing-code");
  const pairRef = useRef(0);

  // ── TYPEWRITER DEMO LOGIC ──────────────────────────────────────────────────
  useEffect(() => {
    let frameId: ReturnType<typeof setTimeout>;
    let codeIdx = 0;
    let engIdx = 0;

    function typeCode() {
      const pair = DEMO_PAIRS[pairRef.current];
      if (codeIdx < pair.code.length) {
        codeIdx++;
        setCodeText(pair.code.slice(0, codeIdx));
        frameId = setTimeout(typeCode, 18);
      } else {
        setPhase("revealing-english");
        frameId = setTimeout(revealEnglish, 400);
      }
    }

    function revealEnglish() {
      const pair = DEMO_PAIRS[pairRef.current];
      if (engIdx < pair.english.length) {
        engIdx++;
        setEnglishText(pair.english.slice(0, engIdx));
        frameId = setTimeout(revealEnglish, 14);
      } else {
        setPhase("pause");
        frameId = setTimeout(nextPair, 3200);
      }
    }

    function nextPair() {
      pairRef.current = (pairRef.current + 1) % DEMO_PAIRS.length;
      setPairIndex(pairRef.current);
      codeIdx = 0;
      engIdx = 0;
      setCodeText("");
      setEnglishText("");
      setPhase("typing-code");
      frameId = setTimeout(typeCode, 200);
    }

    frameId = setTimeout(typeCode, 800);
    return () => clearTimeout(frameId);
  }, []);

  // ── GSAP HERO ENTRANCE ─────────────────────────────────────────────────────
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.2 });

      tl.fromTo(
        ".hero-eyebrow",
        { opacity: 0, y: -16 },
        { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }
      );
      tl.fromTo(
        ".hero-word",
        { opacity: 0, y: 60, rotateX: -20, filter: "blur(8px)" },
        {
          opacity: 1, y: 0, rotateX: 0, filter: "blur(0px)",
          duration: 1.0, ease: "power4.out", stagger: 0.12,
        },
        "-=0.3"
      );
      tl.fromTo(
        ".hero-sub",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" },
        "-=0.5"
      );
      tl.fromTo(
        ".hero-ctas",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" },
        "-=0.5"
      );
      tl.fromTo(
        ".hero-demo",
        { opacity: 0, y: 50, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, duration: 1.1, ease: "power4.out" },
        "-=0.6"
      );
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const pair = DEMO_PAIRS[pairIndex];

  return (
    <section
      ref={containerRef}
      className="landing-section relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-24 pb-16"
    >
      {/* Aurora Background Orbs */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className="absolute -top-1/4 -left-1/4 h-[700px] w-[700px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(245,158,11,0.07) 0%, transparent 70%)",
            animation: "aurora-drift 12s ease-in-out infinite",
          }}
        />
        <div
          className="absolute -bottom-1/4 -right-1/4 h-[600px] w-[600px] rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(217,119,6,0.06) 0%, transparent 70%)",
            animation: "aurora-drift-2 15s ease-in-out infinite",
          }}
        />
        {/* Floating amber particles */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="particle-amber absolute h-1 w-1 rounded-full bg-amber-400/40"
            style={{
              left: `${15 + i * 14}%`,
              top: `${20 + (i % 3) * 20}%`,
              "--duration": `${3.5 + i * 0.8}s`,
              "--delay": `${i * 0.6}s`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      <div className="mx-auto max-w-6xl px-6 text-center w-full">
        {/* Eyebrow badge */}
        <div className="hero-eyebrow opacity-0 mb-8 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-400/80">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
          AI-Powered Code Comprehension
        </div>

        {/* Headline */}
        <h1 className="perspective-1000 mb-8 text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl md:text-8xl">
          <span className="hero-word inline-block opacity-0 text-white">Every</span>{" "}
          <span className="hero-word inline-block opacity-0 text-white">Codebase</span>{" "}
          <br className="hidden sm:block" />
          <span className="hero-word inline-block opacity-0 headline-gradient">Has</span>{" "}
          <span className="hero-word inline-block opacity-0 headline-gradient">a Story.</span>
        </h1>

        {/* Sub-headline */}
        <p className="hero-sub opacity-0 mx-auto mb-12 max-w-2xl text-xl leading-relaxed text-slate-400 sm:text-2xl">
          Understand any codebase in{" "}
          <span className="text-amber-400/90 font-semibold">minutes</span>, not weeks.
          <br />
          <span className="text-base text-slate-500">
            Anuvaad helps developers understand software — not just generate it.
          </span>
        </p>

        {/* CTAs */}
        <div className="hero-ctas opacity-0 flex flex-col items-center justify-center gap-4 sm:flex-row mb-20">
          <Link
            href="/signup"
            id="hero-try-btn"
            className="btn-amber-shimmer inline-flex items-center gap-2 rounded-xl px-8 py-4 text-base font-bold tracking-wide shadow-[0_0_30px_rgba(245,158,11,0.3)] hover:shadow-[0_0_50px_rgba(245,158,11,0.5)] transition-all duration-300 hover:scale-105"
          >
            Try Anuvaad Free
            <ArrowDown className="h-4 w-4" />
          </Link>
          <a
            href="#story"
            id="hero-story-btn"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-8 py-4 text-base font-semibold text-slate-300 backdrop-blur-md transition-all duration-300 hover:border-amber-500/30 hover:bg-white/8 hover:text-white hover:scale-105"
          >
            <Play className="h-4 w-4 text-amber-400" />
            Watch the Story
          </a>
        </div>

        {/* Live Demo Strip */}
        <div className="hero-demo opacity-0 mx-auto max-w-4xl">
          <div className="glass-amber rounded-2xl overflow-hidden shadow-[0_32px_64px_rgba(0,0,0,0.7)]">
            {/* Demo header */}
            <div className="flex items-center justify-between border-b border-amber-500/10 bg-[#0a0a0e]/60 px-5 py-3">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500/40" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/40" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-500/40" />
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded border border-amber-500/20 bg-amber-500/5 px-2.5 py-0.5 font-mono text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                  {pair.lang}
                </span>
                <span className="font-mono text-[10px] text-slate-500">Code → English</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div
                  className="h-1.5 w-1.5 rounded-full bg-amber-400"
                  style={{ animation: phase === "typing-code" ? "pulse 1s ease-in-out infinite" : "none" }}
                />
                <span className="font-mono text-[10px] text-amber-400/60 uppercase tracking-widest">
                  {phase === "typing-code" ? "Reading..." : phase === "revealing-english" ? "Translating..." : "Complete"}
                </span>
              </div>
            </div>

            {/* Demo Content */}
            <div className="grid md:grid-cols-2 min-h-[200px]">
              {/* Left: Code */}
              <div className="border-b border-amber-500/5 bg-[#030014]/50 p-5 md:border-b-0 md:border-r md:border-amber-500/5">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Source Code
                </p>
                <pre className="font-mono text-xs leading-relaxed text-slate-300 whitespace-pre-wrap min-h-[120px]">
                  {codeText}
                  {phase === "typing-code" && (
                    <span className="inline-block h-3.5 w-0.5 bg-amber-400 ml-0.5 align-middle" style={{ animation: "caret-blink 0.8s step-end infinite" }} />
                  )}
                </pre>
              </div>

              {/* Right: English */}
              <div className="bg-transparent p-5 relative">
                {/* Amber scan line */}
                {phase === "revealing-english" && englishText.length < 10 && (
                  <div className="scan-line-anim" />
                )}
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-500/60">
                  Plain English
                </p>
                <div className="rounded-xl border border-amber-500/10 bg-amber-500/4 p-4 min-h-[120px]">
                  <p className="text-sm leading-relaxed text-slate-300" style={{ fontFamily: "var(--font-lora, Georgia, serif)", fontStyle: "italic" }}>
                    {englishText}
                    {phase === "revealing-english" && (
                      <span className="inline-block h-3.5 w-0.5 bg-amber-400 ml-0.5 align-middle" style={{ animation: "caret-blink 0.8s step-end infinite" }} />
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Demo footer */}
            <div className="border-t border-amber-500/5 bg-[#0a0a0e]/40 px-5 py-2.5 flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-500">Free to start · No credit card required</span>
              <div className="flex gap-1.5">
                {DEMO_PAIRS.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 rounded-full transition-all duration-500 ${
                      i === pairIndex ? "w-5 bg-amber-500" : "w-1.5 bg-white/10"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-60">
        <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">Scroll</span>
        <div className="h-10 w-px bg-gradient-to-b from-amber-500/60 to-transparent" />
      </div>
    </section>
  );
}

"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const PILLARS = [
  {
    title: "Zero Code Storage",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    description: "Your code is never written to disk. Every translation is processed in-memory and returned to your browser immediately.",
  },
  {
    title: "Instant Processing",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" stroke="currentColor" strokeWidth="1.5">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    description: "Groq inference engine delivers translations in under 3 seconds — faster than reading the code yourself.",
  },
  {
    title: "Privacy by Default",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    description: "No training on your code. No telemetry on code content. No third-party sharing. Your intellectual property stays yours.",
  },
];

const INFRA = ["Groq", "DeepSeek", "Supabase", "Vercel", "Next.js"];

export function Trust() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      // Animate the circle SVG stroke on scroll
      gsap.fromTo(
        ".trust-circle",
        { strokeDashoffset: 283 },
        {
          strokeDashoffset: 0,
          duration: 1.2,
          ease: "power3.out",
          stagger: 0.25,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 70%",
          },
        }
      );
      // Fade in pillar cards
      gsap.fromTo(
        ".trust-card",
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.15,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 65%",
          },
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="landing-section relative border-t border-amber-500/8 py-32 overflow-hidden"
    >
      {/* Subtle ambient glow */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[800px] -z-10 rounded-full"
        style={{ background: "radial-gradient(ellipse, rgba(245,158,11,0.03) 0%, transparent 70%)" }}
      />

      <div className="mx-auto max-w-6xl px-6">
        {/* Header */}
        <div className="mb-20 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-400/80">
            Security & Trust
          </div>
          <h2
            className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl"
            style={{ fontFamily: "var(--font-lora, Georgia, serif)" }}
          >
            Built with privacy{" "}
            <span className="headline-gradient">as the foundation.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-400">
            We designed Anuvaad so your code never becomes our data.
          </p>
        </div>

        {/* Three pillar cards */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 mb-20">
          {PILLARS.map((pillar) => (
            <div
              key={pillar.title}
              className="trust-card opacity-0 group relative rounded-2xl border border-amber-500/10 bg-surface-charcoal/70 p-8 backdrop-blur-sm shadow-xl shadow-black/30 transition-all duration-500 hover:border-amber-500/25 hover:shadow-[0_0_30px_rgba(245,158,11,0.06)] hover:scale-[1.02] cursor-default"
            >
              {/* Animated circle checkmark */}
              <div className="mb-6 flex items-center gap-4">
                <div className="relative flex h-16 w-16 items-center justify-center">
                  <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90">
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="rgba(245,158,11,0.12)"
                      strokeWidth="2"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="2"
                      strokeLinecap="round"
                      className="trust-circle"
                      style={{ strokeDasharray: 283, strokeDashoffset: 283 }}
                    />
                  </svg>
                  <div className="text-amber-400">{pillar.icon}</div>
                </div>
              </div>
              <h3 className="mb-3 text-lg font-bold tracking-tight text-white">{pillar.title}</h3>
              <p className="text-sm leading-relaxed text-slate-400">{pillar.description}</p>
            </div>
          ))}
        </div>

        {/* Infrastructure strip */}
        <div className="trust-card opacity-0 rounded-2xl border border-white/5 bg-[#0a0a0e]/50 px-8 py-6 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Powered by world-class infrastructure
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6">
              {INFRA.map((name) => (
                <span
                  key={name}
                  className="text-sm font-bold text-slate-500 tracking-wide transition-colors duration-300 hover:text-amber-400/80 cursor-default"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

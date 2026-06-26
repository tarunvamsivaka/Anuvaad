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
      gsap.fromTo(
        ".trust-circle",
        { strokeDashoffset: 283 },
        {
          strokeDashoffset: 0,
          duration: 1.2,
          ease: "power3.out",
          stagger: 0.25,
          scrollTrigger: { trigger: sectionRef.current, start: "top 70%" },
        }
      );
      gsap.fromTo(
        ".trust-card",
        { opacity: 0, y: 40 },
        {
          opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.15,
          scrollTrigger: { trigger: sectionRef.current, start: "top 65%" },
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="wispr-section-light relative py-8 overflow-hidden"
    >
      {/* Dark rounded panel — WisprFlow style */}
      <div className="mx-auto max-w-6xl px-6">
        <div
          className="wispr-dark-section-lg px-12 py-20"
          style={{ background: "linear-gradient(160deg, #0d1117 0%, #111827 60%, #0d1117 100%)" }}
        >
          {/* Ambient glow inside panel */}
          <div
            className="pointer-events-none absolute inset-0 opacity-50"
            style={{ background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(200,134,10,0.04) 0%, transparent 70%)" }}
          />

          {/* Header */}
          <div className="mb-16 text-center relative z-10">
            <div className="wispr-eyebrow-pill mb-5">
              Security &amp; Trust
            </div>
            <h2
              className="wispr-headline text-white mb-4"
              style={{ fontSize: "clamp(36px, 5vw, 56px)" }}
            >
              Built with privacy{" "}
              <span style={{ color: "#c8860a", fontStyle: "italic" }}>as the foundation.</span>
            </h2>
            <p className="mx-auto max-w-xl text-[17px] text-neutral-400 leading-relaxed">
              We designed Anuvaad so your code never becomes our data.
            </p>
          </div>

          {/* Three pillar cards */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-12 relative z-10">
            {PILLARS.map((pillar) => (
              <div
                key={pillar.title}
                className="trust-card opacity-0 group relative rounded-2xl border border-white/08 bg-white/04 p-8 backdrop-blur-sm transition-all duration-500 hover:border-amber-500/25 hover:bg-white/06 hover:shadow-[0_0_30px_rgba(200,134,10,0.06)] cursor-default"
              >
                <div className="mb-6 flex items-center gap-4">
                  <div className="relative flex h-16 w-16 items-center justify-center">
                    <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(200,134,10,0.12)" strokeWidth="2" />
                      <circle
                        cx="50" cy="50" r="45" fill="none" stroke="#c8860a" strokeWidth="2" strokeLinecap="round"
                        className="trust-circle"
                        style={{ strokeDasharray: 283, strokeDashoffset: 283 }}
                      />
                    </svg>
                    <div className="text-amber-500">{pillar.icon}</div>
                  </div>
                </div>
                <h3 className="mb-3 text-lg font-semibold tracking-tight text-white"
                  style={{ fontFamily: "var(--font-garamond, Georgia, serif)" }}
                >
                  {pillar.title}
                </h3>
                <p className="text-sm leading-relaxed text-neutral-400 group-hover:text-neutral-300 transition-colors">{pillar.description}</p>
              </div>
            ))}
          </div>

          {/* Infrastructure strip */}
          <div className="trust-card opacity-0 rounded-2xl border border-white/06 bg-white/02 px-8 py-6 backdrop-blur-sm relative z-10">
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-neutral-500">
                Powered by world-class infrastructure
              </p>
              <div className="flex flex-wrap items-center justify-center gap-8">
                {INFRA.map((name) => (
                  <span
                    key={name}
                    className="text-sm font-semibold text-neutral-500 tracking-wide transition-colors duration-300 hover:text-amber-400 cursor-default"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

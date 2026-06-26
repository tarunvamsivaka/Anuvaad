"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const CONCEPTS = [
  {
    label: "Understanding",
    description: "Not just generation",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 21h6M10 17v-1h4v1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Collaboration",
    description: "Across time & teams",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.5">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="9" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Knowledge Transfer",
    description: "From expert to novice",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 9h6M9 13h4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export function Positioning() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".positioning-word",
        { opacity: 0, y: 30, filter: "blur(8px)" },
        {
          opacity: 1, y: 0, filter: "blur(0px)",
          duration: 0.8, ease: "power4.out", stagger: 0.08,
          scrollTrigger: { trigger: sectionRef.current, start: "top 70%" },
        }
      );
      gsap.fromTo(
        ".positioning-fade",
        { opacity: 0, y: 25 },
        {
          opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.15,
          scrollTrigger: { trigger: sectionRef.current, start: "top 65%" },
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="wispr-section-light relative py-36 overflow-hidden"
    >
      {/* Subtle noise */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.018]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
        }}
      />

      {/* Very subtle amber vignette at centre */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 60% 50% at 50% 60%, rgba(200,134,10,0.03) 0%, transparent 70%)" }}
      />

      <div className="mx-auto max-w-5xl px-6 text-center">
        {/* Headline */}
        <h2
          className="mb-8 leading-[1.08] tracking-tight"
          style={{ fontFamily: "var(--font-garamond, Georgia, serif)" }}
        >
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mb-2">
            {["Not", "another"].map((word, i) => (
              <span
                key={i}
                className="positioning-word inline-block text-4xl font-normal text-neutral-800 sm:text-5xl md:text-7xl opacity-0"
              >
                {word}
              </span>
            ))}
            <span className="positioning-word inline-block text-4xl font-normal sm:text-5xl md:text-7xl opacity-0"
              style={{ color: "#c8860a", fontStyle: "italic" }}>
              AI&nbsp;coding&nbsp;tool.
            </span>
          </div>
        </h2>

        {/* Sub-headline */}
        <p
          className="positioning-fade opacity-0 mx-auto mb-3 max-w-3xl text-2xl font-light leading-relaxed text-neutral-500 sm:text-3xl"
          style={{ fontFamily: "var(--font-garamond, Georgia, serif)", fontStyle: "italic" }}
        >
          Anuvaad helps developers{" "}
          <span className="font-semibold not-italic text-neutral-800">understand</span>{" "}
          software.
        </p>
        <p className="positioning-fade opacity-0 mx-auto mb-20 max-w-xl text-lg text-neutral-400">
          Not merely generate it.
        </p>

        {/* Concept pills — light card style */}
        <div className="positioning-fade opacity-0 flex flex-wrap justify-center gap-4 mb-20">
          {CONCEPTS.map((c) => (
              <div
                key={c.label}
                className="group flex flex-col items-center rounded-2xl border border-black/07 bg-white px-8 py-7 shadow-[0_2px_16px_rgba(0,0,0,0.06)] cursor-default transition-all duration-300 hover:shadow-[0_6px_32px_rgba(0,0,0,0.09)] hover:border-amber-200/60"
                style={{ transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-400 group-hover:bg-amber-50 group-hover:border-amber-200 group-hover:text-amber-600 transition-all duration-300">
                  {c.icon}
                </div>
                <span className="text-lg font-semibold text-neutral-900 group-hover:text-amber-700 transition-colors duration-300"
                  style={{ fontFamily: "var(--font-garamond, Georgia, serif)" }}
                >{c.label}</span>
                <span className="mt-1 text-xs font-medium text-neutral-400 uppercase tracking-widest">{c.description}</span>
              </div>
            ))}
        </div>

        {/* Divider quote */}
        <div className="positioning-fade opacity-0 mx-auto max-w-3xl border-t border-neutral-200 pt-16">
          <blockquote
            className="text-2xl font-light leading-relaxed text-neutral-500 sm:text-3xl"
            style={{ fontFamily: "var(--font-garamond, Georgia, serif)", fontStyle: "italic" }}
          >
            &ldquo;Code is language. Every codebase has a story.{" "}
            <span style={{ color: "#c8860a", fontStyle: "normal" }}>Anuvaad speaks both.</span>&rdquo;
          </blockquote>
        </div>
      </div>
    </section>
  );
}

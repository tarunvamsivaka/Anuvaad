"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const CONCEPTS = [
  { label: "Understanding", description: "Not just generation" },
  { label: "Collaboration", description: "Across time & teams" },
  { label: "Knowledge Transfer", description: "From expert to novice" },
];

// Floating ambient particles
const PARTICLES = [
  { x: "8%", y: "20%", size: 2, duration: "4s", delay: "0s" },
  { x: "88%", y: "15%", size: 1.5, duration: "5.5s", delay: "1.2s" },
  { x: "15%", y: "75%", size: 1, duration: "3.8s", delay: "0.4s" },
  { x: "78%", y: "65%", size: 2.5, duration: "6s", delay: "2s" },
  { x: "50%", y: "88%", size: 1, duration: "4.5s", delay: "0.8s" },
  { x: "35%", y: "30%", size: 1.5, duration: "5s", delay: "1.6s" },
  { x: "65%", y: "40%", size: 1, duration: "3.5s", delay: "2.4s" },
];

export function Positioning() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      // Word-by-word reveal for headline
      gsap.fromTo(
        ".positioning-word",
        { opacity: 0, y: 30, filter: "blur(8px)" },
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.8,
          ease: "power4.out",
          stagger: 0.08,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 70%",
          },
        }
      );
      // Fade in sub-elements
      gsap.fromTo(
        ".positioning-fade",
        { opacity: 0, y: 25 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
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
      className="landing-section relative border-t border-amber-500/8 py-40 overflow-hidden"
    >
      {/* Dark textured background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        {/* Sweeping gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(245,158,11,0.03) 0%, transparent 70%)",
          }}
        />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: "linear-gradient(rgba(245,158,11,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.5) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />
        {/* Floating particles */}
        {PARTICLES.map((p, i) => (
          <div
            key={i}
            className="particle-amber absolute rounded-full bg-amber-400"
            style={{
              left: p.x,
              top: p.y,
              width: `${p.size}px`,
              height: `${p.size}px`,
              opacity: 0.35,
              "--duration": p.duration,
              "--delay": p.delay,
            } as React.CSSProperties}
          />
        ))}
      </div>

      <div className="mx-auto max-w-5xl px-6 text-center">
        {/* Large serif headline */}
        <h2
          className="mb-8 leading-[1.1] tracking-tight"
          style={{ fontFamily: "var(--font-lora, Georgia, serif)" }}
        >
          {/* Line 1 */}
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mb-4">
            {["Not", "another"].map((word, i) => (
              <span
                key={i}
                className="positioning-word inline-block text-4xl font-bold text-white/80 sm:text-5xl md:text-7xl opacity-0"
              >
                {word}
              </span>
            ))}
            <span className="positioning-word inline-block text-4xl font-bold sm:text-5xl md:text-7xl opacity-0 headline-gradient">
              AI&nbsp;coding&nbsp;tool.
            </span>
          </div>
        </h2>

        {/* Sub-headline */}
        <p
          className="positioning-fade opacity-0 mx-auto mb-4 max-w-3xl text-2xl font-light leading-relaxed text-slate-300 sm:text-3xl"
          style={{ fontFamily: "var(--font-lora, Georgia, serif)", fontStyle: "italic" }}
        >
          Anuvaad helps developers{" "}
          <span className="font-semibold not-italic text-amber-300">understand</span>{" "}
          software.
        </p>
        <p className="positioning-fade opacity-0 mx-auto mb-20 max-w-xl text-lg text-slate-500">
          Not merely generate it.
        </p>

        {/* Concept pills */}
        <div className="positioning-fade opacity-0 flex flex-wrap justify-center gap-4 mb-20">
          {CONCEPTS.map((c) => (
            <div
              key={c.label}
              className="group flex flex-col items-center rounded-2xl border border-amber-500/15 bg-amber-500/5 px-8 py-6 backdrop-blur-sm transition-all duration-300 hover:border-amber-500/30 hover:bg-amber-500/8 hover:shadow-[0_0_20px_rgba(245,158,11,0.08)]"
            >
              <span className="text-lg font-bold text-white group-hover:text-amber-300 transition-colors duration-300">{c.label}</span>
              <span className="mt-1 text-xs font-medium text-slate-500 uppercase tracking-widest">{c.description}</span>
            </div>
          ))}
        </div>

        {/* Divider quote */}
        <div className="positioning-fade opacity-0 mx-auto max-w-3xl border-t border-amber-500/10 pt-16">
          <blockquote
            className="text-2xl font-bold leading-relaxed text-white/70 sm:text-3xl"
            style={{ fontFamily: "var(--font-lora, Georgia, serif)", fontStyle: "italic" }}
          >
            &ldquo;Code is language. Every codebase has a story.{" "}
            <span className="text-amber-400 not-italic">Anuvaad speaks both.</span>&rdquo;
          </blockquote>
        </div>
      </div>
    </section>
  );
}

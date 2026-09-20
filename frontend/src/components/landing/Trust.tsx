"use client";

import React, { useEffect, useRef } from "react";
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
  const panelRef = useRef<HTMLDivElement>(null);
  const cardsGridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      if (prefersReducedMotion) {
        gsap.fromTo(
          ".trust-panel-3d",
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: "power3.out",
            scrollTrigger: { trigger: sectionRef.current, start: "top 80%" },
          }
        );
        gsap.fromTo(
          ".trust-card-3d",
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: "power3.out",
            stagger: 0.1,
            scrollTrigger: { trigger: sectionRef.current, start: "top 75%" },
          }
        );
        gsap.fromTo(
          ".trust-circle",
          { strokeDashoffset: 283 },
          {
            strokeDashoffset: 0,
            duration: 1.0,
            ease: "power3.out",
            stagger: 0.15,
            scrollTrigger: { trigger: sectionRef.current, start: "top 75%" },
          }
        );
        return;
      }

      // 1. Monolithic 3D Dark Vault Panel Unfold
      gsap.fromTo(
        panelRef.current,
        {
          opacity: 0,
          rotateX: 20,
          z: -120,
          scale: 0.92,
          transformOrigin: "center top",
        },
        {
          opacity: 1,
          rotateX: 0,
          z: 0,
          scale: 1,
          duration: 1.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 78%",
          },
        }
      );

      // 2. Pillar Cards 3D Fan-out / Unfold
      const cards = gsap.utils.toArray<HTMLElement>(".trust-card-3d");
      gsap.fromTo(
        cards,
        {
          opacity: 0,
          y: 50,
          z: -80,
          rotateX: 18,
          rotateY: (i: number) => (i === 0 ? -10 : i === 2 ? 10 : 0),
          scale: 0.92,
        },
        {
          opacity: 1,
          y: 0,
          z: 0,
          rotateX: 0,
          rotateY: 0,
          scale: 1,
          duration: 0.85,
          ease: "power3.out",
          stagger: 0.12,
          scrollTrigger: {
            trigger: cardsGridRef.current || sectionRef.current,
            start: "top 75%",
          },
        }
      );

      // 3. SVG Circle Progress Ring Animation
      gsap.fromTo(
        ".trust-circle",
        { strokeDashoffset: 283 },
        {
          strokeDashoffset: 0,
          duration: 1.2,
          ease: "power3.out",
          stagger: 0.2,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 72%",
          },
        }
      );

      // 4. Infrastructure Strip 3D Elevation
      gsap.fromTo(
        ".trust-infra-strip",
        { opacity: 0, y: 30, z: -40, rotateX: 10 },
        {
          opacity: 1,
          y: 0,
          z: 0,
          rotateX: 0,
          duration: 0.85,
          ease: "power3.out",
          scrollTrigger: { trigger: ".trust-infra-strip", start: "top 85%" },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  // Interactive 3D hover tilt on dark pillar cards
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const halfWidth = rect.width / 2;
    const halfHeight = rect.height / 2;
    const centerX = rect.left + halfWidth;
    const centerY = rect.top + halfHeight;
    const normX = halfWidth > 0 ? (e.clientX - centerX) / halfWidth : 0;
    const normY = halfHeight > 0 ? (e.clientY - centerY) / halfHeight : 0;

    const maxTilt = 8;
    const rotateX = -normY * maxTilt || 0;
    const rotateY = normX * maxTilt || 0;

    gsap.to(card, {
      rotateX,
      rotateY,
      z: 20,
      scale: 1.025,
      duration: 0.25,
      ease: "power2.out",
      overwrite: "auto",
    });

    const sheen = card.querySelector(".trust-sheen") as HTMLDivElement;
    if (sheen) {
      const relX = e.clientX - rect.left;
      const relY = e.clientY - rect.top;
      sheen.style.background = `radial-gradient(320px circle at ${relX}px ${relY}px, rgba(200, 134, 10, 0.12), transparent 75%)`;
      sheen.style.opacity = "1";
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    gsap.to(card, {
      rotateX: 0,
      rotateY: 0,
      z: 0,
      scale: 1,
      duration: 0.45,
      ease: "power2.out",
      overwrite: "auto",
    });

    const sheen = card.querySelector(".trust-sheen") as HTMLDivElement;
    if (sheen) {
      sheen.style.opacity = "0";
    }
  };

  return (
    <section
      id="trust"
      ref={sectionRef}
      className="wispr-section-light relative py-8 overflow-hidden"
      style={{ perspective: "1400px", transformStyle: "preserve-3d" }}
    >
      {/* Dark rounded panel — Monolithic 3D Vault Door */}
      <div className="mx-auto max-w-6xl px-6" style={{ transformStyle: "preserve-3d" }}>
        <div
          ref={panelRef}
          className="trust-panel-3d wispr-dark-section-lg px-12 py-20 relative overflow-hidden"
          style={{
            background: "linear-gradient(160deg, #0d1117 0%, #111827 60%, #0d1117 100%)",
            transformStyle: "preserve-3d",
          }}
        >
          {/* Ambient glow inside panel */}
          <div
            className="pointer-events-none absolute inset-0 opacity-50"
            style={{ background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(200,134,10,0.04) 0%, transparent 70%)" }}
          />

          {/* Header */}
          <div className="mb-16 text-center relative z-10" style={{ transformStyle: "preserve-3d" }}>
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

          {/* Three pillar cards — 3D Fan-out Container */}
          <div
            ref={cardsGridRef}
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-12 relative z-10"
            style={{ perspective: "1000px", transformStyle: "preserve-3d" }}
          >
            {PILLARS.map((pillar) => (
              <div
                key={pillar.title}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className="trust-card-3d opacity-0 group relative rounded-2xl border border-white/08 bg-white/04 p-8 backdrop-blur-sm transition-all duration-300 hover:border-amber-500/25 hover:bg-white/06 hover:shadow-[0_0_30px_rgba(200,134,10,0.06)] cursor-default overflow-hidden"
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* Dynamic cursor sheen spotlight layer */}
                <div className="trust-sheen absolute inset-0 opacity-0 pointer-events-none rounded-2xl transition-opacity duration-300 z-20" />

                <div className="relative z-10 mb-6 flex items-center gap-4">
                  <div className="relative flex h-16 w-16 items-center justify-center">
                    <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(200,134,10,0.12)" strokeWidth="2" />
                      <circle
                        cx="50"
                        cy="50"
                        r="45"
                        fill="none"
                        stroke="#c8860a"
                        strokeWidth="2"
                        strokeLinecap="round"
                        className="trust-circle"
                        style={{ strokeDasharray: 283, strokeDashoffset: 283 }}
                      />
                    </svg>
                    <div className="text-amber-500">{pillar.icon}</div>
                  </div>
                </div>
                <h3
                  className="relative z-10 mb-3 text-lg font-semibold tracking-tight text-white"
                  style={{ fontFamily: "var(--font-playfair, var(--font-serif, Georgia, serif))" }}
                >
                  {pillar.title}
                </h3>
                <p
                  className="relative z-10 text-sm leading-relaxed text-[#c4b89e] group-hover:text-white transition-colors"
                  style={{ fontFamily: "var(--font-sans, Inter, sans-serif)" }}
                >
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>

          {/* Infrastructure strip — 3D Elevation */}
          <div
            className="trust-infra-strip opacity-0 rounded-2xl border border-white/06 bg-white/02 px-8 py-6 backdrop-blur-sm relative z-10"
            style={{ transformStyle: "preserve-3d" }}
          >
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


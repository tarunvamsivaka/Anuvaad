"use client";

import React, { useEffect, useRef } from "react";
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
  const cardsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      if (prefersReducedMotion) {
        gsap.fromTo(
          ".positioning-word",
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: "power3.out",
            stagger: 0.06,
            scrollTrigger: { trigger: sectionRef.current, start: "top 75%" },
          }
        );
        gsap.fromTo(
          ".positioning-fade",
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: "power3.out",
            stagger: 0.1,
            scrollTrigger: { trigger: sectionRef.current, start: "top 70%" },
          }
        );
        return;
      }

      // 3D Headline Reveal
      gsap.fromTo(
        ".positioning-word",
        { opacity: 0, y: 40, z: -60, rotateX: 20, filter: "blur(6px)" },
        {
          opacity: 1,
          y: 0,
          z: 0,
          rotateX: 0,
          filter: "blur(0px)",
          duration: 0.9,
          ease: "power4.out",
          stagger: 0.08,
          scrollTrigger: { trigger: sectionRef.current, start: "top 75%" },
        }
      );

      // Sub-headlines fade
      gsap.fromTo(
        ".positioning-fade",
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.85,
          ease: "power3.out",
          stagger: 0.12,
          scrollTrigger: { trigger: sectionRef.current, start: "top 70%" },
        }
      );

      // 3D Concept Cards Staggered Unfold
      const conceptCards = gsap.utils.toArray<HTMLElement>(".positioning-card-3d");
      gsap.fromTo(
        conceptCards,
        {
          opacity: 0,
          y: 60,
          z: -100,
          rotateX: 24,
          rotateY: (i: number) => (i === 0 ? -12 : i === 2 ? 12 : 0),
          scale: 0.9,
        },
        {
          opacity: 1,
          y: 0,
          z: 0,
          rotateX: 0,
          rotateY: 0,
          scale: 1,
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.12,
          scrollTrigger: { trigger: cardsContainerRef.current || sectionRef.current, start: "top 75%" },
        }
      );

      // 3D Divider Quote Entrance
      gsap.fromTo(
        ".positioning-quote-3d",
        { opacity: 0, y: 40, z: -50, rotateX: 15, scale: 0.96 },
        {
          opacity: 1,
          y: 0,
          z: 0,
          rotateX: 0,
          scale: 1,
          duration: 1.0,
          ease: "power3.out",
          scrollTrigger: { trigger: ".positioning-quote-3d", start: "top 80%" },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  // Interactive 3D hover tilt on concept cards
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
      z: 18,
      scale: 1.03,
      duration: 0.25,
      ease: "power2.out",
      overwrite: "auto",
    });

    const sheen = card.querySelector(".positioning-sheen") as HTMLDivElement;
    if (sheen) {
      const relX = e.clientX - rect.left;
      const relY = e.clientY - rect.top;
      sheen.style.background = `radial-gradient(280px circle at ${relX}px ${relY}px, rgba(200, 134, 10, 0.08), transparent 80%)`;
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

    const sheen = card.querySelector(".positioning-sheen") as HTMLDivElement;
    if (sheen) {
      sheen.style.opacity = "0";
    }
  };

  return (
    <section
      id="positioning"
      ref={sectionRef}
      className="wispr-section-light relative py-36 overflow-hidden"
      style={{ perspective: "1200px", transformStyle: "preserve-3d" }}
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

      <div className="mx-auto max-w-5xl px-6 text-center relative z-10" style={{ transformStyle: "preserve-3d" }}>
        {/* Headline — 3D Typography */}
        <h2
          className="mb-8 leading-[1.08] tracking-tight"
          style={{ fontFamily: "var(--font-playfair, var(--font-serif, Georgia, serif))", transformStyle: "preserve-3d" }}
        >
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mb-2">
            {["Not", "another"].map((word, i) => (
              <span
                key={i}
                className="positioning-word inline-block text-4xl font-normal text-[#1a1208] sm:text-5xl md:text-7xl opacity-0"
                style={{ transformStyle: "preserve-3d" }}
              >
                {word}
              </span>
            ))}
            <span
              className="positioning-word inline-block text-4xl font-normal sm:text-5xl md:text-7xl opacity-0"
              style={{ color: "#c8860a", fontStyle: "italic", transformStyle: "preserve-3d" }}
            >
              AI&nbsp;coding&nbsp;tool.
            </span>
          </div>
        </h2>

        {/* Sub-headline */}
        <p
          className="positioning-fade opacity-0 mx-auto mb-3 max-w-3xl text-2xl font-light leading-relaxed text-[#6b5e4a] sm:text-3xl"
          style={{ fontFamily: "var(--font-playfair, var(--font-serif, Georgia, serif))", fontStyle: "italic" }}
        >
          Anuvaad helps developers{" "}
          <span className="font-semibold not-italic text-[#1a1208]">understand</span>{" "}
          software.
        </p>
        <p
          className="positioning-fade opacity-0 mx-auto mb-20 max-w-xl text-lg text-[#9e8d72]"
          style={{ fontFamily: "var(--font-sans, Inter, sans-serif)" }}
        >
          Not merely generate it.
        </p>

        {/* Concept cards — 3D Perspective Container */}
        <div
          ref={cardsContainerRef}
          className="flex flex-wrap justify-center gap-6 mb-20"
          style={{ perspective: "1200px", transformStyle: "preserve-3d" }}
        >
          {CONCEPTS.map((c) => (
            <div
              key={c.label}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              className="positioning-card-3d opacity-0 group relative flex flex-col items-center rounded-2xl border border-[rgba(26,18,8,0.09)] bg-white px-8 py-7 cursor-default transition-all duration-300 hover:border-[rgba(200,134,10,0.30)] overflow-hidden min-w-[240px]"
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* Dynamic cursor sheen spotlight layer */}
              <div className="positioning-sheen absolute inset-0 opacity-0 pointer-events-none rounded-2xl transition-opacity duration-300 z-20" />

              {/* Ambient warm hover tint */}
              <div className="absolute inset-0 bg-[rgba(200,134,10,0.02)] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

              <div className="relative z-10 mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(26,18,8,0.10)] bg-[#faf8f4] text-[#9e8d72] group-hover:bg-[rgba(200,134,10,0.06)] group-hover:border-[rgba(200,134,10,0.30)] group-hover:text-[#c8860a] transition-all duration-300">
                {c.icon}
              </div>
              <span
                className="relative z-10 text-lg font-semibold text-[#1a1208] group-hover:text-[#c8860a] transition-colors duration-300"
                style={{ fontFamily: "var(--font-playfair, var(--font-serif, Georgia, serif))" }}
              >
                {c.label}
              </span>
              <span
                className="relative z-10 mt-1 text-xs font-medium text-[#9e8d72] uppercase tracking-widest"
                style={{ fontFamily: "var(--font-sans, Inter, sans-serif)" }}
              >
                {c.description}
              </span>
            </div>
          ))}
        </div>

        {/* Divider quote — 3D Elevation */}
        <div
          className="positioning-quote-3d opacity-0 mx-auto max-w-3xl border-t border-[rgba(26,18,8,0.10)] pt-16"
          style={{ transformStyle: "preserve-3d" }}
        >
          <blockquote
            className="text-2xl font-light leading-relaxed text-[#6b5e4a] sm:text-3xl"
            style={{ fontFamily: "var(--font-playfair, var(--font-serif, Georgia, serif))", fontStyle: "italic" }}
          >
            &ldquo;Code is language. Every codebase has a story.{" "}
            <span style={{ color: "#c8860a", fontStyle: "normal" }}>Anuvaad speaks both.</span>&rdquo;
          </blockquote>
        </div>
      </div>
    </section>
  );
}


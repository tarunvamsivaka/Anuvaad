"use client";

import { useRef, useEffect } from "react";
import {
  Code2, Languages, BookOpen, Zap, Shield, Download,
  Clock, Search, BarChart3, KeyboardIcon, Smartphone, Sparkles,
} from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const LARGE_FEATURES = [
  {
    icon: Code2,
    title: "Code → English",
    description: "Paste any code and get a clear, block-by-block explanation in plain English. Perfect for onboarding, code review, and legacy system archaeology.",
    badge: "Core",
    highlight: true,
    preview: (
      <div className="mt-5 rounded-2xl border border-[rgba(26,18,8,0.08)] bg-[#faf8f4] p-4">
        <p className="mb-2 font-mono text-[9px] uppercase tracking-widest text-[#9e8d72]">Translation preview</p>
        <p className="font-mono text-[11px] text-[#6b5e4a] leading-relaxed">
          {"// calculateTotal(items, taxRate)"}<br />
          {/* Editorial Serif for translation output */}
          <span
            className="text-[#1a1208] block mt-2"
            style={{ fontFamily: "var(--font-playfair, var(--font-serif, Georgia, serif))", fontStyle: "italic", fontSize: "13px", lineHeight: "1.65" }}
          >
            Sums all item prices, applies the tax rate as a multiplier, and returns the final amount rounded to 2 decimal places.
          </span>
        </p>
      </div>
    ),
  },
  {
    icon: BookOpen,
    title: "English → Code",
    description: "Describe what you want in natural language. Get production-ready code generated instantly in any of 35+ languages.",
    badge: "Generate",
    highlight: false,
  },
  {
    icon: Languages,
    title: "Code → Code",
    description: "Translate between Python, JavaScript, Go, Rust, Java, C++, TypeScript, and 30+ more. Handles idioms, not just syntax.",
    badge: "35+ Languages",
    highlight: false,
  },
];

const SMALL_FEATURES = [
  { icon: Clock, title: "Translation History", description: "Cloud-synced history of every translation. Search, re-run, and pick up where you left off." },
  { icon: Download, title: "Export Anywhere", description: "Export as Markdown, JSON, or PDF. Perfect for documentation and team sharing." },
  { icon: Search, title: "Search & Filter", description: "Full-text search across all your past translations with instant results." },
  { icon: BarChart3, title: "Usage Analytics", description: "Track your most-used languages, translation counts, and usage patterns." },
  { icon: KeyboardIcon, title: "Keyboard Shortcuts", description: "Power-user shortcuts for every action — stay in flow without touching your mouse." },
  { icon: Zap, title: "Instant Results", description: "AI-powered inference with intelligent caching. Most translations in under 3 seconds." },
  { icon: Shield, title: "Secure by Design", description: "Code is never stored beyond your session. Processed in real-time and returned immediately." },
  { icon: Smartphone, title: "PWA Support", description: "Install as a native app on any device. Full offline access to your history." },
  { icon: Sparkles, title: "AI Generation", description: "From natural language to working code. Powered by Gemini and cutting-edge models." },
];

/** Small inline SVG illustration for features header — Motion element */
function FeaturesIllustration() {
  return (
    <div className="wispr-illustration mb-8 ml-0" aria-hidden="true">
      <svg
        width="120"
        height="40"
        viewBox="0 0 120 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="wispr-line-draw"
      >
        {/* Three language nodes connected — flat minimalism illustration */}
        <circle cx="20"  cy="20" r="8" stroke="#c8860a" strokeWidth="1.5" fill="none" />
        <circle cx="60"  cy="20" r="8" stroke="#034f46" strokeWidth="1.5" fill="none" />
        <circle cx="100" cy="20" r="8" stroke="#1a1208" strokeWidth="1.5" fill="none" opacity="0.6" />
        {/* Connection lines — ink borders */}
        <line x1="28"  y1="20" x2="52"  y2="20" stroke="#c8860a" strokeWidth="1" strokeLinecap="round" />
        <line x1="68"  y1="20" x2="92"  y2="20" stroke="#034f46" strokeWidth="1" strokeLinecap="round" />
        {/* Direction arrows */}
        <path d="M46 16 L52 20 L46 24" stroke="#c8860a" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M86 16 L92 20 L86 24" stroke="#034f46" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {/* Labels */}
        <text x="20" y="23.5" textAnchor="middle" fontSize="6" fill="#c8860a" fontFamily="monospace">PY</text>
        <text x="60" y="23.5" textAnchor="middle" fontSize="6" fill="#034f46" fontFamily="monospace">EN</text>
        <text x="100" y="23.5" textAnchor="middle" fontSize="6" fill="#1a1208" fontFamily="monospace" opacity="0.6">TS</text>
      </svg>
    </div>
  );
}

export function Features() {
  const sectionRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      if (prefersReducedMotion) {
        gsap.fromTo(
          ".feature-card-reveal",
          { opacity: 0, y: 36 },
          {
            opacity: 1,
            y: 0,
            duration: 0.65,
            ease: "power3.out",
            stagger: 0.06,
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top 78%",
            },
          }
        );
        return;
      }

      const cards = gsap.utils.toArray<HTMLElement>(".bento-card-3d");

      gsap.fromTo(
        cards,
        {
          opacity: 0,
          y: 70,
          z: -140,
          rotateX: 20,
          rotateY: (i: number) => (i % 2 === 0 ? -7 : 7),
          scale: 0.90,
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
          stagger: 0.06,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 75%",
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const normX = (e.clientX - centerX) / (rect.width / 2);
    const normY = (e.clientY - centerY) / (rect.height / 2);

    const maxTilt = 10;
    const rotateX = (-normY * maxTilt) || 0;
    const rotateY = (normX * maxTilt) || 0;

    gsap.to(card, {
      rotateX,
      rotateY,
      z: 24,
      scale: 1.02,
      duration: 0.25,
      ease: "power2.out",
      overwrite: "auto",
    });

    const sheen = card.querySelector(".bento-sheen") as HTMLDivElement;
    if (sheen) {
      const relX = e.clientX - rect.left;
      const relY = e.clientY - rect.top;
      sheen.style.background = `radial-gradient(350px circle at ${relX}px ${relY}px, rgba(200, 134, 10, 0.09), transparent 80%)`;
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
      duration: 0.5,
      ease: "power2.out",
      overwrite: "auto",
    });

    const sheen = card.querySelector(".bento-sheen") as HTMLDivElement;
    if (sheen) {
      sheen.style.opacity = "0";
    }
  };

  return (
    <section
      id="features"
      ref={sectionRef}
      className="wispr-section-light relative py-36 overflow-hidden"
    >
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <div className="feature-card-reveal mb-16 max-w-2xl">
          {/* Small inline illustration — Illustration element */}
          <FeaturesIllustration />
          {/* Ink border eyebrow pill */}
          <div className="wispr-eyebrow-pill-light mb-5">
            <Sparkles className="h-3 w-3 opacity-60" />
            Everything You Need
          </div>
          {/* Editorial Serif h2 */}
          <h2
            className="wispr-headline text-[#1a1208] mb-5"
            style={{ fontSize: "clamp(36px, 5vw, 56px)" }}
          >
            Built for developers who{" "}
            <span style={{ color: "#c8860a", fontStyle: "italic" }}>understand code.</span>
          </h2>
          {/* Modern Sans body */}
          <p className="text-[17px] text-[#6b5e4a] leading-relaxed"
            style={{ fontFamily: "var(--font-sans, Inter, sans-serif)" }}>
            Three powerful translation modes, 35+ languages, and a suite of professional tools — all built around one mission: making code comprehensible.
          </p>
        </div>

        {/* Bento Grid — 3D depth container */}
        <div
          ref={gridRef}
          className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 bento-grid-3d"
          style={{ perspective: "1200px", transformStyle: "preserve-3d" }}
        >
          {/* Large featured cards */}
          {LARGE_FEATURES.map((f) => (
            <div
              key={f.title}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{ transformStyle: "preserve-3d" }}
              className={`feature-card-reveal bento-card-3d group rounded-3xl border p-7 transition-all duration-300 cursor-default overflow-hidden relative wispr-feature-card ${
                f.highlight
                  ? "border-[rgba(200,134,10,0.22)] bg-white col-span-1 md:col-span-2 lg:col-span-1 hover:border-[rgba(200,134,10,0.40)]"
                  : "border-[rgba(26,18,8,0.09)] bg-white hover:border-[rgba(200,134,10,0.28)]"
              }`}
            >
              {/* Dynamic cursor sheen spotlight layer */}
              <div className="bento-sheen absolute inset-0 opacity-0 pointer-events-none rounded-3xl transition-opacity duration-300 z-20" />

              {/* Flat minimal warm hover tint — no glassmorphism */}
              <div className="absolute inset-0 bg-[rgba(200,134,10,0.02)] opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none rounded-3xl" />

              <div className="flex items-start justify-between relative z-10">
                {/* Circular icon container — Organic Curve */}
                <div className={`flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-300 ${
                  f.highlight
                    ? "border-[rgba(200,134,10,0.25)] bg-[rgba(200,134,10,0.06)] group-hover:border-[rgba(200,134,10,0.40)]"
                    : "border-[rgba(26,18,8,0.10)] bg-[#faf8f4] group-hover:border-[rgba(200,134,10,0.28)] group-hover:bg-[rgba(200,134,10,0.05)]"
                }`}>
                  <f.icon className="h-5 w-5 text-[#c8860a]" />
                </div>
                {/* Badge — ink border pill */}
                <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
                  f.highlight
                    ? "border border-[rgba(200,134,10,0.22)] bg-[rgba(200,134,10,0.06)] text-[#c8860a]"
                    : "border border-[rgba(26,18,8,0.09)] bg-[#faf8f4] text-[#6b5e4a]"
                }`}
                  style={{ fontFamily: "var(--font-sans, Inter, sans-serif)" }}>
                  {f.badge}
                </span>
              </div>
              {/* Editorial Serif card title */}
              <h3
                className="relative z-10 mt-5 text-xl font-semibold tracking-tight text-[#1a1208]"
                style={{ fontFamily: "var(--font-playfair, var(--font-serif, Georgia, serif))" }}
              >
                {f.title}
              </h3>
              {/* Modern Sans body */}
              <p className="relative z-10 mt-2.5 text-sm leading-relaxed text-[#6b5e4a] group-hover:text-[#4a3e2e] transition-colors"
                style={{ fontFamily: "var(--font-sans, Inter, sans-serif)" }}>
                {f.description}
              </p>
              {f.preview}
            </div>
          ))}

          {/* Small utility cards — flat, ink borders */}
          {SMALL_FEATURES.map((f) => (
            <div
              key={f.title}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{ transformStyle: "preserve-3d" }}
              className="feature-card-reveal bento-card-3d group rounded-3xl border border-[rgba(26,18,8,0.09)] bg-white p-5 cursor-default relative overflow-hidden hover:border-[rgba(200,134,10,0.25)] wispr-feature-card transition-all duration-300"
            >
              {/* Dynamic cursor sheen spotlight layer */}
              <div className="bento-sheen absolute inset-0 opacity-0 pointer-events-none rounded-3xl transition-opacity duration-300 z-20" />

              <div className="absolute inset-0 bg-[rgba(200,134,10,0.02)] opacity-0 group-hover:opacity-100 transition-opacity duration-400 pointer-events-none" />

              {/* Circular icon container — Organic Curve */}
              <div className="relative z-10 mb-3.5 flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(26,18,8,0.09)] bg-[#faf8f4] group-hover:border-[rgba(200,134,10,0.28)] group-hover:bg-[rgba(200,134,10,0.05)] transition-all duration-300">
                <f.icon className="h-4 w-4 text-[#9e8d72] group-hover:text-[#c8860a] transition-colors" />
              </div>
              {/* Editorial Serif h3 */}
              <h3 className="relative z-10 text-sm font-semibold text-[#1a1208] tracking-tight"
                style={{ fontFamily: "var(--font-playfair, var(--font-serif, Georgia, serif))" }}>
                {f.title}
              </h3>
              {/* Modern Sans body */}
              <p className="relative z-10 mt-1.5 text-xs leading-relaxed text-[#9e8d72] group-hover:text-[#6b5e4a] transition-colors"
                style={{ fontFamily: "var(--font-sans, Inter, sans-serif)" }}>
                {f.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

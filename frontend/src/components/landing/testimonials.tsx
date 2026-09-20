"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, Star, Sparkles } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMotionSafe } from "@/lib/motion";

export const TESTIMONIALS = [
  {
    id: "priya",
    quote: "Anuvaad saved me hours reverse-engineering a legacy Java codebase. The line-by-line explanations are incredibly precise.",
    name: "Priya Sharma",
    role: "Senior Backend Engineer",
    company: "Flipkart",
    avatar: "PS",
    bg: "#fdf3e8",
    border: "rgba(200,134,10,0.16)",
    textColor: "#a36708",
    rating: 5,
    highlight: "Saved hours reverse-engineering",
  },
  {
    id: "alex",
    quote: "I use Code → Code to port Python prototypes to Go for production. It handles edge cases better than any tool I've tried.",
    name: "Alex Chen",
    role: "Platform Lead",
    company: "Stripe",
    avatar: "AC",
    bg: "#eef6fd",
    border: "rgba(3,79,70,0.16)",
    textColor: "#034f46",
    rating: 5,
    highlight: "Python to Go production ports",
  },
  {
    id: "jordan",
    quote: "As a CS student, Anuvaad is like having a patient tutor. I paste lecture code and actually understand what each line does.",
    name: "Jordan Miller",
    role: "Computer Science Student",
    company: "Georgia Tech",
    avatar: "JM",
    bg: "#f3f0fd",
    border: "rgba(89,58,160,0.16)",
    textColor: "#5c3ea8",
    rating: 5,
    highlight: "Patient CS tutor",
  },
  {
    id: "maria",
    quote: "Our team uses the workspace feature to standardize how we document microservices. The API key integration with CI/CD is brilliant.",
    name: "Maria Garcia",
    role: "Engineering Manager",
    company: "Shopify",
    avatar: "MG",
    bg: "#eefaf4",
    border: "rgba(16,120,70,0.16)",
    textColor: "#106040",
    rating: 5,
    highlight: "Microservices documentation standard",
  },
  {
    id: "david",
    quote: "Translating SQL queries to plain English helped our product team finally understand our analytics pipeline. Game changer.",
    name: "David Kim",
    role: "Data Engineering Lead",
    company: "Notion",
    avatar: "DK",
    bg: "#fdf0f3",
    border: "rgba(180,30,70,0.14)",
    textColor: "#be2d52",
    rating: 5,
    highlight: "SQL to plain English analytics",
  },
  {
    id: "rahul",
    quote: "The Pro plan pays for itself in the first week. I translate 20+ snippets a day during code reviews.",
    name: "Rahul Patel",
    role: "Staff Engineer",
    company: "Razorpay",
    avatar: "RP",
    bg: "#fdf6e8",
    border: "rgba(200,134,10,0.14)",
    textColor: "#a36708",
    rating: 5,
    highlight: "20+ code reviews daily",
  },
  {
    id: "sophie",
    quote: "Finally a tool that explains WHY code was written, not just what it does. This is how AI tools should work.",
    name: "Sophie Laurent",
    role: "Principal Engineer",
    company: "Datadog",
    avatar: "SL",
    bg: "#eeeffe",
    border: "rgba(63,80,200,0.14)",
    textColor: "#3f50c8",
    rating: 5,
    highlight: "Explains WHY, not just WHAT",
  },
  {
    id: "james",
    quote: "Onboarded 3 junior devs to our TypeScript monorepo in a single afternoon using Anuvaad. Normally takes weeks.",
    name: "James O.",
    role: "Tech Lead",
    company: "Linear",
    avatar: "JO",
    bg: "#eefbf9",
    border: "rgba(3,100,90,0.14)",
    textColor: "#03645a",
    rating: 5,
    highlight: "Rapid developer onboarding",
  },
];

export function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [tilt, setTilt] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState<number>(0);

  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const motionSafe = useMotionSafe();
  const isReducedMotion = !motionSafe;

  const total = TESTIMONIALS.length;

  const nextTestimonial = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevTestimonial = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Auto-rotation timer (5.5s)
  useEffect(() => {
    if (isPaused || isReducedMotion) return;
    const interval = setInterval(() => {
      nextTestimonial();
    }, 5500);
    return () => clearInterval(interval);
  }, [isPaused, isReducedMotion, nextTestimonial]);

  // GSAP Scroll entrance
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".testimonials-reveal",
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.1,
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 75%",
          },
        }
      );

      if (!isReducedMotion && stageRef.current) {
        gsap.fromTo(
          stageRef.current,
          { opacity: 0, z: -160, rotateX: 15 },
          {
            opacity: 1,
            z: 0,
            rotateX: 0,
            duration: 1.0,
            ease: "power3.out",
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top 70%",
            },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, [isReducedMotion]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      prevTestimonial();
    } else if (e.key === "ArrowRight") {
      nextTestimonial();
    }
  };

  // Pointer drag gestures
  const handlePointerDown = (e: React.PointerEvent) => {
    setDragStart(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragStart !== null) {
      setDragOffset(e.clientX - dragStart);
    }
  };

  const handlePointerUp = () => {
    if (dragStart !== null) {
      if (dragOffset > 45) {
        prevTestimonial();
      } else if (dragOffset < -45) {
        nextTestimonial();
      }
      setDragStart(null);
      setDragOffset(0);
    }
  };

  const handlePointerCancel = () => {
    setDragStart(null);
    setDragOffset(0);
  };

  // Active card 3D tilt
  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isReducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    setTilt({ x: x * 8, y: -y * 8 });
  };

  const handleCardMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  // 3D Card Positioning
  const getCardStyle = (index: number) => {
    let delta = (index - activeIndex + total) % total;
    if (delta > total / 2) delta -= total;

    if (isReducedMotion) {
      return {
        display: Math.abs(delta) <= 1 ? "block" : "none",
        transform: delta === 0 ? "scale(1)" : "scale(0.92)",
        opacity: delta === 0 ? 1 : 0.4,
        zIndex: delta === 0 ? 30 : 10,
        pointerEvents: delta === 0 ? ("auto" as const) : ("none" as const),
      };
    }

    if (delta === 0) {
      return {
        transform: `translate3d(${dragOffset * 0.4}px, 0px, 40px) rotateY(${tilt.x}deg) rotateX(${tilt.y}deg) scale(1.0)`,
        opacity: 1,
        filter: "blur(0px)",
        zIndex: 30,
        boxShadow: "0 24px 48px -12px rgba(26, 18, 8, 0.12), 0 0 32px rgba(200, 134, 10, 0.08)",
        pointerEvents: "auto" as const,
        cursor: "default",
      };
    }

    if (delta === 1) {
      return {
        transform: "translate3d(320px, 12px, -60px) rotateY(-14deg) scale(0.86)",
        opacity: 0.75,
        filter: "blur(2px)",
        zIndex: 20,
        boxShadow: "0 12px 24px -8px rgba(26, 18, 8, 0.08)",
        pointerEvents: "auto" as const,
        cursor: "pointer",
      };
    }

    if (delta === -1) {
      return {
        transform: "translate3d(-320px, 12px, -60px) rotateY(14deg) scale(0.86)",
        opacity: 0.75,
        filter: "blur(2px)",
        zIndex: 20,
        boxShadow: "0 12px 24px -8px rgba(26, 18, 8, 0.08)",
        pointerEvents: "auto" as const,
        cursor: "pointer",
      };
    }

    if (delta === 2) {
      return {
        transform: "translate3d(540px, 24px, -150px) rotateY(-24deg) scale(0.72)",
        opacity: 0.35,
        filter: "blur(5px)",
        zIndex: 10,
        boxShadow: "0 6px 16px -6px rgba(26, 18, 8, 0.05)",
        pointerEvents: "auto" as const,
        cursor: "pointer",
      };
    }

    if (delta === -2) {
      return {
        transform: "translate3d(-540px, 24px, -150px) rotateY(24deg) scale(0.72)",
        opacity: 0.35,
        filter: "blur(5px)",
        zIndex: 10,
        boxShadow: "0 6px 16px -6px rgba(26, 18, 8, 0.05)",
        pointerEvents: "auto" as const,
        cursor: "pointer",
      };
    }

    return {
      transform: `translate3d(${Math.sign(delta) * 720}px, 36px, -260px) rotateY(${Math.sign(delta) * -35}deg) scale(0.55)`,
      opacity: 0,
      filter: "blur(8px)",
      zIndex: 0,
      pointerEvents: "none" as const,
    };
  };

  return (
    <section
      id="testimonials"
      ref={sectionRef}
      className="wispr-section-light relative py-36 overflow-hidden select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-roledescription="carousel"
      aria-label="Customer Testimonials"
    >
      {/* Subtle warm radial ambient glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(ellipse 65% 45% at 50% 55%, rgba(200,134,10,0.045) 0%, transparent 70%)",
        }}
      />

      {/* Section header */}
      <div className="mx-auto mb-16 max-w-3xl px-6 text-center">
        <div className="testimonials-reveal wispr-eyebrow-pill-light mb-5">
          <Sparkles className="h-3 w-3 text-[#c8860a]" />
          Verified Industry Feedback
        </div>
        <h2
          className="testimonials-reveal wispr-headline text-[#1a1208] mb-4"
          style={{ fontSize: "clamp(36px, 5vw, 56px)" }}
        >
          Loved by developers{" "}
          <span style={{ color: "#c8860a", fontStyle: "italic" }}>worldwide.</span>
        </h2>
        <p
          className="testimonials-reveal text-[17px] text-[#6b5e4a] leading-relaxed max-w-xl mx-auto"
          style={{ fontFamily: "var(--font-sans, Inter, sans-serif)" }}
        >
          From students to staff engineers — teams rely on Anuvaad every day to decode, translate, and master complex codebases.
        </p>
      </div>

      {/* 3D Depth Card Stage */}
      <div
        ref={stageRef}
        className="relative mx-auto w-full max-w-5xl h-[440px] flex items-center justify-center"
        style={{
          perspective: isReducedMotion ? "none" : "1200px",
          transformStyle: "preserve-3d",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {TESTIMONIALS.map((t, i) => {
          const delta =
            (i - activeIndex + total) % total > total / 2
              ? ((i - activeIndex + total) % total) - total
              : (i - activeIndex + total) % total;
          const isFront = delta === 0;

          return (
            <div
              key={t.id}
              onClick={() => {
                if (!isFront) setActiveIndex(i);
              }}
              onMouseMove={isFront ? handleCardMouseMove : undefined}
              onMouseLeave={isFront ? handleCardMouseLeave : undefined}
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[380px] rounded-3xl bg-white p-7 transition-all duration-500 ease-out cursor-pointer ${
                isFront ? "border border-[rgba(200,134,10,0.30)] shadow-2xl" : "border border-[rgba(26,18,8,0.10)]"
              }`}
              style={{
                ...getCardStyle(i),
                transition:
                  "transform 0.65s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.65s ease, filter 0.65s ease, box-shadow 0.65s ease",
              }}
              role="group"
              aria-roledescription="slide"
              aria-label={`Testimonial ${i + 1} of ${total}: ${t.name}`}
              aria-hidden={!isFront}
            >
              {/* Top Row: Stars + Quote Mark */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1">
                  {[...Array(t.rating)].map((_, starIdx) => (
                    <Star
                      key={starIdx}
                      className="h-4 w-4 fill-[#c8860a] text-[#c8860a]"
                    />
                  ))}
                </div>
                <div
                  className="text-4xl leading-none select-none text-[rgba(200,134,10,0.25)] italic"
                  style={{ fontFamily: "var(--font-playfair, Georgia, serif)" }}
                >
                  &ldquo;
                </div>
              </div>

              {/* Quote text */}
              <p
                className="mb-6 text-[15px] leading-relaxed text-[#1a1208] min-h-[72px]"
                style={{
                  fontFamily: "var(--font-playfair, var(--font-serif, Georgia, serif))",
                  fontStyle: "italic",
                }}
              >
                {t.quote}
              </p>

              {/* Author Strip */}
              <div className="flex items-center gap-3.5 border-t border-[rgba(26,18,8,0.08)] pt-4">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center text-xs font-bold"
                  style={{
                    background: t.bg,
                    border: `1px solid ${t.border}`,
                    borderRadius: "60% 40% 55% 45% / 50% 60% 40% 50%",
                    color: t.textColor,
                  }}
                >
                  {t.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-semibold text-[#1a1208] truncate"
                    style={{ fontFamily: "var(--font-sans, Inter, sans-serif)" }}
                  >
                    {t.name}
                  </p>
                  <p
                    className="text-xs text-[#9e8d72] truncate"
                    style={{ fontFamily: "var(--font-sans, Inter, sans-serif)" }}
                  >
                    {t.role} · <span className="font-medium text-[#6b5e4a]">{t.company}</span>
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Controls Bar */}
      <div className="mt-8 flex flex-col items-center justify-center gap-4">
        {/* Buttons & Indicator Dots */}
        <div className="flex items-center gap-6">
          <button
            onClick={prevTestimonial}
            aria-label="Previous testimonial"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(26,18,8,0.12)] bg-white text-[#1a1208] shadow-sm transition-all duration-200 hover:border-[rgba(200,134,10,0.35)] hover:text-[#c8860a] hover:scale-105 active:scale-95"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Dots */}
          <div className="flex items-center gap-2">
            {TESTIMONIALS.map((_, dotIdx) => (
              <button
                key={dotIdx}
                onClick={() => setActiveIndex(dotIdx)}
                aria-label={`Go to testimonial ${dotIdx + 1}`}
                aria-current={dotIdx === activeIndex}
                className={`transition-all duration-300 rounded-full ${
                  dotIdx === activeIndex
                    ? "h-2 w-7 bg-[#c8860a] shadow-[0_0_8px_rgba(200,134,10,0.5)]"
                    : "h-2 w-2 bg-[rgba(26,18,8,0.15)] hover:bg-[rgba(200,134,10,0.4)]"
                }`}
              />
            ))}
          </div>

          <button
            onClick={nextTestimonial}
            aria-label="Next testimonial"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(26,18,8,0.12)] bg-white text-[#1a1208] shadow-sm transition-all duration-200 hover:border-[rgba(200,134,10,0.35)] hover:text-[#c8860a] hover:scale-105 active:scale-95"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Status caption */}
        <p className="text-xs font-mono text-[#9e8d72] tracking-wider uppercase">
          {activeIndex + 1} / {total} · {TESTIMONIALS[activeIndex].company}
        </p>
      </div>
    </section>
  );
}


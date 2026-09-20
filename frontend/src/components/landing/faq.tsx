"use client";

import React, { useState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useMotionSafe } from "@/lib/motion";

export const FAQS = [
  {
    q: "What programming languages are supported?",
    a: "Anuvaad supports 35+ languages including Python, JavaScript, TypeScript, Java, C++, C#, Go, Rust, Swift, Kotlin, PHP, Ruby, SQL, HTML, CSS, Dart, Lua, R, Haskell, and more. We're adding new languages regularly.",
  },
  {
    q: "Is my code stored on your servers?",
    a: "No. Your code is processed in real-time by the AI and returned to your browser immediately. We never store code on our servers. Translation history is saved securely in your account database.",
  },
  {
    q: "How accurate are the translations?",
    a: "Anuvaad uses Groq and DeepSeek, which provide highly accurate translations. However, AI translations should always be reviewed before use in production environments.",
  },
  {
    q: "Can I use Anuvaad for free?",
    a: "Yes! The free plan includes 25 translations per day, all 3 modes, and full export capabilities. Guests (without an account) get 5 trial translations. No credit card required.",
  },
  {
    q: "What's the difference between Free and Pro?",
    a: "Pro gives you unlimited translations, priority processing speed, larger input limits (50K characters), cloud-synced history, and email support.",
  },
  {
    q: "Can I cancel my subscription anytime?",
    a: "Absolutely. You can cancel your Pro subscription at any time. Your access continues until the end of your current billing period. We also offer a 7-day refund policy.",
  },
];

export const faqs = FAQS;

interface FAQItemProps {
  faq: { q: string; a: string };
  index: number;
  isOpen: boolean;
  onToggle: () => void;
  isLast: boolean;
  isReducedMotion: boolean;
}

function FAQItem({ faq, index, isOpen, onToggle, isLast, isReducedMotion }: FAQItemProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={`faq-item-container relative transition-colors duration-300 ${
        isLast ? "" : "border-b border-[rgba(26,18,8,0.07)]"
      }`}
      style={{
        perspective: isReducedMotion ? "none" : "1000px",
        transformStyle: isReducedMotion ? "flat" : "preserve-3d",
      }}
    >
      {/* Header Button with 3D elevation */}
      <button
        id={`faq-btn-${index}`}
        aria-controls={`faq-panel-${index}`}
        aria-expanded={isOpen}
        onClick={onToggle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="w-full flex items-center justify-between py-5 text-left group cursor-pointer transition-transform duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[#c8860a]"
        style={{
          transform: !isReducedMotion && hovered ? "translateZ(6px)" : "translateZ(0px)",
        }}
      >
        {/* Editorial Serif question text */}
        <span
          className={`text-[15px] font-medium transition-colors duration-300 pr-4 ${
            isOpen || hovered ? "text-[#c8860a]" : "text-[#1a1208]"
          }`}
          style={{ fontFamily: "var(--font-playfair, var(--font-serif, Georgia, serif))" }}
        >
          {faq.q}
        </span>

        {/* Circular expand icon with 3D rotation */}
        <span
          className={`flex-shrink-0 flex items-center justify-center h-7 w-7 rounded-full border transition-all duration-300 ${
            isOpen
              ? "border-[rgba(200,134,10,0.40)] bg-[rgba(200,134,10,0.08)] shadow-[0_0_12px_rgba(200,134,10,0.15)]"
              : "border-[rgba(26,18,8,0.10)] bg-[#faf8f4] group-hover:border-[rgba(200,134,10,0.35)] group-hover:bg-[rgba(200,134,10,0.06)]"
          }`}
        >
          <Plus
            className="h-3.5 w-3.5 text-[#6b5e4a] group-hover:text-[#c8860a] transition-all duration-300"
            style={{
              transform: isOpen ? "rotate(45deg) scale(1.08)" : "rotate(0deg) scale(1)",
              color: isOpen ? "#c8860a" : undefined,
            }}
          />
        </span>
      </button>

      {/* 3D Folding Accordion Panel */}
      <div
        id={`faq-panel-${index}`}
        role="region"
        aria-labelledby={`faq-btn-${index}`}
        className="faq-fold-panel overflow-hidden"
        style={{
          maxHeight: isOpen ? "500px" : "0px",
          opacity: isOpen ? 1 : 0,
          transform: isReducedMotion
            ? "none"
            : isOpen
            ? "perspective(1000px) rotateX(0deg) scale(1) translateZ(0px)"
            : "perspective(1000px) rotateX(-18deg) scale(0.96) translateZ(-8px)",
          transformOrigin: "top center",
          pointerEvents: isOpen ? "auto" : "none",
          transition: isReducedMotion
            ? "max-height 0.3s ease, opacity 0.2s ease"
            : "max-height 0.45s cubic-bezier(0.16, 1, 0.3, 1), transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease",
        }}
      >
        {/* Modern Sans answer text */}
        <p
          className="pb-5 text-sm text-[#6b5e4a] leading-relaxed max-w-2xl"
          style={{ fontFamily: "var(--font-sans, Inter, sans-serif)" }}
        >
          {faq.a}
        </p>
      </div>
    </div>
  );
}

export function FAQ() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const motionSafe = useMotionSafe();
  const isReducedMotion = !motionSafe;

  const handleToggle = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      if (isReducedMotion) {
        gsap.fromTo(
          ".faq-reveal",
          { opacity: 0, y: 24 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: "power3.out",
            stagger: 0.08,
            scrollTrigger: { trigger: sectionRef.current, start: "top 75%" },
          }
        );
        return;
      }

      // 3D Header Reveal
      gsap.fromTo(
        ".faq-header-3d",
        { opacity: 0, y: 36, rotateX: 14, z: -50 },
        {
          opacity: 1,
          y: 0,
          rotateX: 0,
          z: 0,
          duration: 0.85,
          ease: "power3.out",
          scrollTrigger: { trigger: sectionRef.current, start: "top 78%" },
        }
      );

      // 3D Accordion Main Card Entrance
      if (cardRef.current) {
        gsap.fromTo(
          cardRef.current,
          { opacity: 0, y: 50, z: -80, rotateX: 16, scale: 0.95 },
          {
            opacity: 1,
            y: 0,
            z: 0,
            rotateX: 0,
            scale: 1,
            duration: 0.95,
            ease: "power3.out",
            scrollTrigger: { trigger: cardRef.current, start: "top 80%" },
          }
        );
      }
    }, sectionRef);

    return () => ctx.revert();
  }, [isReducedMotion]);

  return (
    <section
      id="faq"
      ref={sectionRef}
      className="wispr-section-light relative py-36 overflow-hidden"
      style={{ perspective: isReducedMotion ? "none" : "1200px" }}
    >
      <div className="mx-auto max-w-3xl px-6 relative z-10" style={{ transformStyle: "preserve-3d" }}>
        {/* Header */}
        <div className="faq-reveal faq-header-3d opacity-0 text-center mb-14" style={{ transformStyle: "preserve-3d" }}>
          {/* Ink border eyebrow pill */}
          <div className="wispr-eyebrow-pill-light mb-5">FAQ</div>
          {/* Editorial Serif h2 */}
          <h2
            className="wispr-headline text-[#1a1208]"
            style={{ fontSize: "clamp(36px, 5vw, 56px)" }}
          >
            Frequently asked{" "}
            <span style={{ color: "#c8860a", fontStyle: "italic" }}>questions</span>
          </h2>
        </div>

        {/* Accordion Container — 3D Flat White Box with Ink Border */}
        <div
          ref={cardRef}
          className="faq-reveal opacity-0 bg-white rounded-3xl px-8 py-3 shadow-[0_20px_40px_-15px_rgba(26,18,8,0.06)]"
          style={{
            border: "1px solid rgba(26, 18, 8, 0.09)",
            transformStyle: "preserve-3d",
          }}
        >
          {FAQS.map((faq, i) => (
            <FAQItem
              key={i}
              index={i}
              faq={faq}
              isOpen={openIndex === i}
              onToggle={() => handleToggle(i)}
              isLast={i === FAQS.length - 1}
              isReducedMotion={isReducedMotion}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default FAQ;

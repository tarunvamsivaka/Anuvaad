"use client";

import { useState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const faqs = [
  { q: "What programming languages are supported?", a: "Anuvaad supports 35+ languages including Python, JavaScript, TypeScript, Java, C++, C#, Go, Rust, Swift, Kotlin, PHP, Ruby, SQL, HTML, CSS, Dart, Lua, R, Haskell, and more. We're adding new languages regularly." },
  { q: "Is my code stored on your servers?", a: "No. Your code is processed in real-time by the AI and returned to your browser immediately. We never store code on our servers. Translation history is saved securely in your account database." },
  { q: "How accurate are the translations?", a: "Anuvaad uses Groq and DeepSeek, which provide highly accurate translations. However, AI translations should always be reviewed before use in production environments." },
  { q: "Can I use Anuvaad for free?", a: "Yes! The free plan includes 10 translations per day, all 3 modes, and full export capabilities. No credit card required." },
  { q: "What's the difference between Free and Pro?", a: "Pro gives you unlimited translations, priority processing speed, larger input limits (50K characters), cloud-synced history, and email support." },
  { q: "Can I cancel my subscription anytime?", a: "Absolutely. You can cancel your Pro subscription at any time. Your access continues until the end of your current billing period. We also offer a 7-day refund policy." },
];

function FAQItem({ q, a, isLast }: { q: string; a: string; isLast: boolean }) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div className={`${isLast ? "" : "border-b border-neutral-100"}`}>
      <button
        className="w-full flex items-center justify-between py-5 text-left group"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span
          className="text-[15px] font-medium text-neutral-800 group-hover:text-amber-700 transition-colors pr-4"
          style={{ fontFamily: "var(--font-garamond, Georgia, serif)" }}
        >
          {q}
        </span>
        <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full border border-neutral-200 bg-neutral-50 group-hover:border-amber-300 group-hover:bg-amber-50 transition-all duration-300">
          <Plus
            className="h-3 w-3 text-neutral-400 group-hover:text-amber-600 transition-all duration-300"
            style={{ transform: open ? "rotate(45deg)" : "rotate(0deg)" }}
          />
        </span>
      </button>
      <div
        ref={contentRef}
        className="overflow-hidden"
        style={{
          maxHeight: open ? "500px" : "0px",
          opacity: open ? 1 : 0,
          transition: "max-height 0.35s ease, opacity 0.25s ease",
        }}
      >
        <p className="pb-5 text-sm text-neutral-500 leading-relaxed max-w-2xl">
          {a}
        </p>
      </div>
    </div>
  );
}

export function FAQ() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".faq-reveal",
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.1,
          scrollTrigger: { trigger: sectionRef.current, start: "top 75%" },
        }
      );
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section id="faq" ref={sectionRef} className="wispr-section-light relative py-32">
      {/* Subtle noise */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
        }}
      />

      <div className="mx-auto max-w-3xl px-6">
        {/* Header */}
        <div className="faq-reveal opacity-0 text-center mb-14">
          <div className="wispr-eyebrow-pill-light mb-5">FAQ</div>
          <h2
            className="wispr-headline text-neutral-900"
            style={{ fontSize: "clamp(36px, 5vw, 56px)" }}
          >
            Frequently asked{" "}
            <span style={{ color: "#c8860a", fontStyle: "italic" }}>questions</span>
          </h2>
        </div>

        {/* Accordion */}
        <div className="faq-reveal opacity-0 bg-white rounded-3xl border border-black/07 shadow-[0_4px_24px_rgba(0,0,0,0.06)] px-8 py-2">
          {faqs.map((faq, i) => (
            <FAQItem key={i} q={faq.q} a={faq.a} isLast={i === faqs.length - 1} />
          ))}
        </div>
      </div>
    </section>
  );
}
